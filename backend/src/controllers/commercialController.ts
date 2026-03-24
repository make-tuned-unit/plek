import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { getSupabaseClient, updateUserHostFlags } from '../services/supabaseService';
import { commercialStorageService } from '../services/commercialService';
import {
  sendCommercialLeadAdminNotificationEmail,
  sendCommercialLeadConfirmationEmail,
} from '../services/emailService';

type JsonMap = Record<string, any>;

const INBOUND_FORWARD_TO = process.env['INBOUND_FORWARD_TO'] || 'jesse.sharratt@gmail.com';

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1' || value.toLowerCase() === 'yes';
  return false;
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function sanitizeArray(value: unknown): string[] {
  const parsed = parseJsonField<unknown[]>(value, Array.isArray(value) ? (value as unknown[]) : []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function mapLeadResponse(lead: any) {
  return {
    id: lead.id,
    createdAt: lead.created_at,
    status: lead.status,
    companyName: lead.company_name,
    contactName: lead.contact_name,
    email: lead.email,
    phone: lead.phone,
    city: lead.city,
    province: lead.province,
    approximateSpaceCount: lead.approximate_space_count,
    propertyType: lead.property_type,
    vehicleTypesAllowed: lead.vehicle_types_allowed || [],
    bookingTypesSupported: lead.booking_types_supported || [],
    hasSpreadsheet: !!lead.has_spreadsheet,
    spreadsheetLater: !!lead.spreadsheet_later,
    stripeReadiness: lead.stripe_readiness,
    notes: lead.notes,
    internalNotes: lead.internal_notes,
    followUpState: lead.follow_up_state,
    uploadedFileReference: lead.uploaded_file_reference,
    uploadedFileName: lead.uploaded_file_name,
    uploadedFileUrl: lead.uploaded_file_url,
  };
}

async function getLeadWithDrafts(leadId: string) {
  const supabase = getSupabaseClient();
  const { data: lead, error: leadError } = await supabase
    .from('commercial_leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (leadError) throw leadError;

  const { data: properties, error: propertyError } = await supabase
    .from('commercial_properties')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (propertyError) throw propertyError;

  const propertyIds = (properties || []).map((property: any) => property.id);
  const { data: zones } = propertyIds.length
    ? await supabase
        .from('commercial_zones')
        .select('*')
        .in('property_id', propertyIds)
        .order('sort_order', { ascending: true })
    : { data: [] as any[] };

  const { data: buckets } = propertyIds.length
    ? await supabase
        .from('commercial_inventory_buckets')
        .select('*')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: true })
    : { data: [] as any[] };

  return {
    lead,
    properties: (properties || []).map((property: any) => ({
      id: property.id,
      hostId: property.host_id,
      name: property.name,
      address: property.address,
      city: property.city,
      province: property.province,
      postalCode: property.postal_code,
      lat: property.lat,
      lng: property.lng,
      propertyType: property.property_type,
      accessInstructions: property.access_instructions,
      restrictions: property.restrictions,
      isCommercial: property.is_commercial,
      status: property.status,
      zones: (zones || [])
        .filter((zone: any) => zone.property_id === property.id)
        .map((zone: any) => ({
          id: zone.id,
          propertyId: zone.property_id,
          name: zone.name,
          description: zone.description,
          lat: zone.lat,
          lng: zone.lng,
          polygonGeojson: zone.polygon_geojson,
          sortOrder: zone.sort_order,
          accessInstructions: zone.access_instructions,
          photoUrl: zone.photo_url,
          isDefaultZone: zone.is_default_zone,
          isActive: zone.is_active,
        })),
      inventoryBuckets: (buckets || [])
        .filter((bucket: any) => bucket.property_id === property.id)
        .map((bucket: any) => ({
          id: bucket.id,
          propertyId: bucket.property_id,
          zoneId: bucket.zone_id,
          label: bucket.label,
          vehicleType: bucket.vehicle_type,
          quantity: bucket.quantity,
          spaceType: bucket.space_type,
          pricingMode: bucket.pricing_mode,
          dailyPrice: bucket.daily_price,
          monthlyPrice: bucket.monthly_price,
          accessType: bucket.access_type,
          availabilityRules: bucket.availability_rules,
          restrictions: bucket.restrictions,
          isActive: bucket.is_active,
        })),
    })),
  };
}

async function persistPropertyDrafts(leadId: string, submission: JsonMap) {
  const supabase = getSupabaseClient();
  const propertyDraft = parseJsonField<JsonMap | null>(submission.propertyDraft, null);
  const zonesDraft = parseJsonField<JsonMap[]>(submission.zonesDraft, []);
  const inventoryBucketsDraft = parseJsonField<JsonMap[]>(submission.inventoryBucketsDraft, []);

  if (!propertyDraft?.name || !propertyDraft?.address || !propertyDraft?.city || !propertyDraft?.province) {
    return;
  }

  const { data: property, error: propertyError } = await supabase
    .from('commercial_properties')
    .insert({
      lead_id: leadId,
      host_id: submission.hostId || null,
      name: propertyDraft.name,
      address: propertyDraft.address,
      city: propertyDraft.city,
      province: propertyDraft.province,
      postal_code: propertyDraft.postalCode || '',
      lat: parseNumber(propertyDraft.lat),
      lng: parseNumber(propertyDraft.lng),
      property_type: propertyDraft.propertyType || submission.propertyType || 'surface_lot',
      access_instructions: propertyDraft.accessInstructions || '',
      restrictions: propertyDraft.restrictions || '',
      is_commercial: true,
      status: 'draft',
    } as any)
    .select()
    .single();

  if (propertyError) throw propertyError;

  const zoneIdMap = new Map<string, string>();
  if (zonesDraft.length > 0) {
    for (let index = 0; index < zonesDraft.length; index += 1) {
      const zone = zonesDraft[index];
      const { data: savedZone, error: zoneError } = await supabase
        .from('commercial_zones')
        .insert({
          property_id: property.id,
          name: zone.name || `Zone ${index + 1}`,
          description: zone.description || '',
          lat: parseNumber(zone.lat),
          lng: parseNumber(zone.lng),
          polygon_geojson: zone.polygonGeojson || null,
          sort_order: parseInteger(zone.sortOrder) ?? index,
          access_instructions: zone.accessInstructions || '',
          photo_url: zone.photoUrl || '',
          is_default_zone: !!zone.isDefaultZone,
          is_active: zone.isActive !== false,
        } as any)
        .select()
        .single();

      if (zoneError) throw zoneError;
      if (zone.id) zoneIdMap.set(String(zone.id), savedZone.id);
      zoneIdMap.set(savedZone.name, savedZone.id);
    }
  }

  if (inventoryBucketsDraft.length > 0) {
    // Future automation hook: this draft shape mirrors the CSV/template fields so founder-led
    // review can later be replaced by importer/approval tooling without remodeling the data.
    const bucketRows = inventoryBucketsDraft.map((bucket) => {
      const zoneId = bucket.zoneId ? zoneIdMap.get(String(bucket.zoneId)) || null : null;
      return {
        property_id: property.id,
        zone_id: zoneId,
        label: bucket.label || `${bucket.vehicleType || 'inventory'} inventory`,
        vehicle_type: bucket.vehicleType || 'passenger_vehicle',
        quantity: parseInteger(bucket.quantity) ?? 0,
        space_type: bucket.spaceType || '',
        pricing_mode: bucket.pricingMode || 'flexible',
        daily_price: parseNumber(bucket.dailyPrice),
        monthly_price: parseNumber(bucket.monthlyPrice),
        access_type: bucket.accessType || '',
        availability_rules: {
          availabilityType: bucket.availabilityType || '',
          minDuration: parseInteger(bucket.minDuration),
          maxDuration: parseInteger(bucket.maxDuration),
        },
        restrictions: bucket.restrictions || '',
        is_active: bucket.isActive !== false,
      };
    });

    const { error: bucketError } = await supabase
      .from('commercial_inventory_buckets')
      .insert(bucketRows as any);

    if (bucketError) throw bucketError;
  }
}

export async function submitCommercialLead(req: Request, res: Response): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const submission = req.body as JsonMap;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const leadInsert = {
      status: 'new',
      company_name: submission.companyName,
      contact_name: submission.contactName,
      email: submission.email,
      phone: submission.phone || '',
      city: submission.city,
      province: submission.province,
      approximate_space_count: parseInteger(submission.approximateSpaceCount),
      property_type: submission.propertyType,
      vehicle_types_allowed: sanitizeArray(submission.vehicleTypesAllowed),
      booking_types_supported: sanitizeArray(submission.bookingTypesSupported),
      has_spreadsheet: parseBoolean(submission.hasSpreadsheet),
      spreadsheet_later: parseBoolean(submission.spreadsheetLater),
      stripe_readiness: submission.stripeReady || 'need_help',
      notes: submission.notes || '',
      authority_confirmation: parseBoolean(submission.authorityConfirmation),
      insurance_compliance_confirmation: parseBoolean(submission.insuranceComplianceConfirmation),
      internal_notes: null,
      follow_up_state: 'awaiting-review',
      raw_submission: {
        propertyDraft: parseJsonField(submission.propertyDraft, null),
        zonesDraft: parseJsonField(submission.zonesDraft, []),
        inventoryBucketsDraft: parseJsonField(submission.inventoryBucketsDraft, []),
        signageAssumptions: [
          'commercial locations should not require new physical signage to launch',
          'pooled inventory and zone-based instructions are the default',
          'numbered stalls are optional, not required',
          'existing landlord/operator signage can be reused',
          'if signage is ever needed, hosts should ideally print simple zone signs themselves',
          'Plekk should not depend on founder-supplied signage for v1',
        ],
      },
    };

    const { data: lead, error: insertError } = await supabase
      .from('commercial_leads')
      .insert(leadInsert as any)
      .select()
      .single();

    if (insertError) throw insertError;

    await updateUserHostFlags(userId, {
      is_host: true,
      host_type: 'commercial',
    });

    let uploadedFileReference: string | null = null;
    let uploadedFileUrl: string | null = null;
    let uploadedFileName: string | null = null;

    if (req.file) {
      const uploaded = await commercialStorageService.uploadLeadFile(req.file, lead.id);
      uploadedFileReference = uploaded.path;
      uploadedFileUrl = uploaded.publicUrl;
      uploadedFileName = uploaded.originalName;

      await supabase
        .from('commercial_leads')
        .update({
          uploaded_file_reference: uploadedFileReference,
          uploaded_file_url: uploadedFileUrl,
          uploaded_file_name: uploadedFileName,
        } as any)
        .eq('id', lead.id);
    }

    await persistPropertyDrafts(lead.id, { ...submission, hostId: userId });

    const statusUrl = `${process.env['FRONTEND_URL'] || 'http://localhost:3000'}/commercial-parking?submission=${lead.id}&token=${lead.submission_token}`;

    sendCommercialLeadConfirmationEmail(
      lead.email,
      lead.contact_name,
      lead.id,
      lead.submission_token,
      statusUrl
    ).catch((error) => {
      console.error('[Commercial] Confirmation email failed', error);
    });

    sendCommercialLeadAdminNotificationEmail(INBOUND_FORWARD_TO, {
      companyName: lead.company_name,
      contactName: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      province: lead.province,
      approximateSpaceCount: lead.approximate_space_count,
      propertyType: lead.property_type,
      vehicleTypesAllowed: lead.vehicle_types_allowed || [],
      bookingTypesSupported: lead.booking_types_supported || [],
      hasSpreadsheet: !!lead.has_spreadsheet,
      spreadsheetLater: !!lead.spreadsheet_later,
      stripeReadiness: lead.stripe_readiness,
      notes: lead.notes || '',
      uploadedFileName,
      statusUrl,
    }).catch((error) => {
      console.error('[Commercial] Admin notification email failed', error);
    });

    res.status(201).json({
      success: true,
      data: {
        id: lead.id,
        createdAt: lead.created_at,
        status: lead.status,
        submissionToken: lead.submission_token,
        statusUrl,
      },
      message: 'Commercial intake submitted successfully',
    });
  } catch (error: any) {
    console.error('[Commercial] Failed to submit lead', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit commercial intake',
      message: error.message || 'Unknown error',
    });
  }
}

export async function getCommercialLeadStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const token = String(req.query.token || '');

    if (!token) {
      res.status(400).json({ success: false, error: 'Status token is required' });
      return;
    }

    const { lead, properties } = await getLeadWithDrafts(id);

    if (!lead || lead.submission_token !== token) {
      res.status(404).json({ success: false, error: 'Commercial submission not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...mapLeadResponse(lead),
        properties,
      },
    });
  } catch (error: any) {
    console.error('[Commercial] Failed to fetch status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commercial submission status',
      message: error.message,
    });
  }
}

export async function getAdminCommercialLeads(_req: Request, res: Response): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: leads, error } = await supabase
      .from('commercial_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const hydrated = await Promise.all(
      (leads || []).map(async (lead: any) => {
        const { properties } = await getLeadWithDrafts(lead.id);
        return {
          ...mapLeadResponse(lead),
          properties,
        };
      })
    );

    res.json({
      success: true,
      data: {
        leads: hydrated,
        count: hydrated.length,
      },
    });
  } catch (error: any) {
    console.error('[Commercial] Failed to fetch admin leads', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch commercial leads',
      message: error.message,
    });
  }
}

export async function updateAdminCommercialLead(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates: Record<string, any> = {};

    if (typeof req.body.status === 'string') updates.status = req.body.status;
    if (typeof req.body.internalNotes === 'string') updates.internal_notes = req.body.internalNotes;
    if (typeof req.body.followUpState === 'string') updates.follow_up_state = req.body.followUpState;

    const supabase = getSupabaseClient();
    const { data: lead, error } = await supabase
      .from('commercial_leads')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: mapLeadResponse(lead),
      message: 'Commercial submission updated',
    });
  } catch (error: any) {
    console.error('[Commercial] Failed to update lead', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update commercial submission',
      message: error.message,
    });
  }
}

export async function getCommercialTemplate(_req: Request, res: Response): Promise<void> {
  const templateColumns = [
    'property_name',
    'address',
    'city',
    'province',
    'postal_code',
    'property_lat',
    'property_lng',
    'zone_name',
    'zone_lat',
    'zone_lng',
    'inventory_bucket_name',
    'quantity',
    'vehicle_type',
    'space_type',
    'access_type',
    'availability_type',
    'min_duration',
    'max_duration',
    'daily_price',
    'monthly_price',
    'instructions',
    'restrictions',
    'photo_urls',
    'payout_entity_email',
  ];

  res.json({
    success: true,
    data: {
      downloadUrl: '/commercial-inventory-template.csv',
      templateColumns,
      notes: [
        'Use pooled inventory by vehicle type instead of one row per numbered stall.',
        'zone_name + zone_lat + zone_lng let operators define simple lot zones without drawing polygons.',
        'Most launches can start with a single default zone and pooled inventory.',
      ],
    },
  });
}
