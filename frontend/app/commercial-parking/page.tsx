'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  MapPin,
  Plus,
  Upload,
} from 'lucide-react'
import { apiService } from '@/services/api'
import { MapboxAutocomplete } from '@/components/MapboxAutocomplete'
import { CommercialZonePlanner, type CommercialZoneDraft } from '@/components/CommercialZonePlanner'

const PROPERTY_TYPES = [
  { value: 'surface_lot', label: 'Surface lot' },
  { value: 'garage', label: 'Garage' },
  { value: 'industrial_yard', label: 'Industrial yard' },
  { value: 'mixed_use', label: 'Mixed use' },
  { value: 'rv_storage_lot', label: 'RV/storage lot' },
  { value: 'other', label: 'Other' },
]

const VEHICLE_TYPES = [
  'passenger_vehicle',
  'suv_pickup',
  'cargo_van',
  'oversized_vehicle',
  'rv',
  'truck',
  'trailer',
] as const

const BOOKING_TYPES = [
  'daily',
  'overnight',
  'monthly',
  'long_term_storage',
  'event_parking',
] as const

const INVENTORY_VEHICLE_OPTIONS = [
  'passenger_vehicle',
  'suv_pickup',
  'cargo_van',
  'oversized_vehicle',
  'rv',
  'truck',
  'trailer',
] as const

const SPACE_TYPES = ['standard', 'covered', 'yard', 'oversized', 'storage'] as const
const ACCESS_TYPES = ['ungated', 'gated', 'staffed', 'code', 'remote', 'other'] as const
const AVAILABILITY_TYPES = ['daily', 'overnight', 'monthly', 'long_term_storage', 'event'] as const
const STRIPE_OPTIONS = [
  { value: 'ready', label: 'Stripe account ready' },
  { value: 'need_help', label: 'Need help setting up Stripe' },
  { value: 'not_yet', label: 'Not ready yet' },
]

const formSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(7, 'Phone is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  approximateSpaceCount: z.coerce.number().min(1, 'Add an approximate space count'),
  propertyType: z.string().min(1, 'Property type is required'),
  vehicleTypesAllowed: z.array(z.string()).min(1, 'Choose at least one vehicle type'),
  bookingTypesSupported: z.array(z.string()).min(1, 'Choose at least one booking type'),
  hasSpreadsheet: z.boolean().default(false),
  spreadsheetLater: z.boolean().default(false),
  stripeReady: z.string().min(1, 'Select a Stripe readiness option'),
  notes: z.string().optional(),
  authorityConfirmation: z.boolean().refine(Boolean, 'Required'),
  insuranceComplianceConfirmation: z.boolean().refine(Boolean, 'Required'),
})

type CommercialFormValues = z.infer<typeof formSchema>

interface InventoryBucketDraft {
  id: string
  zoneId?: string
  label: string
  vehicleType: string
  quantity: number
  spaceType?: string
  pricingMode: string
  dailyPrice?: number
  monthlyPrice?: number
  accessType?: string
  availabilityType?: string
  minDuration?: number
  maxDuration?: number
  restrictions?: string
}

interface PropertyDraft {
  name: string
  address: string
  city: string
  province: string
  postalCode: string
  lat?: number
  lng?: number
  propertyType: string
  accessInstructions: string
  restrictions: string
}

const makeId = () => Math.random().toString(36).slice(2, 10)

const defaultPropertyDraft = (): PropertyDraft => ({
  name: '',
  address: '',
  city: '',
  province: 'NS',
  postalCode: '',
  propertyType: 'surface_lot',
  accessInstructions: '',
  restrictions: '',
})

const defaultZone = (): CommercialZoneDraft => ({
  id: makeId(),
  name: 'Main Lot',
  description: 'Default pooled zone for launch',
  isDefaultZone: true,
  isActive: true,
})

const defaultBucket = (zoneId?: string): InventoryBucketDraft => ({
  id: makeId(),
  zoneId,
  label: 'Passenger vehicle inventory',
  vehicleType: 'passenger_vehicle',
  quantity: 20,
  spaceType: 'standard',
  pricingMode: 'flexible',
  accessType: 'ungated',
  availabilityType: 'daily',
})

function prettyLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function CommercialParkingPage() {
  const searchParams = useSearchParams()
  const submissionId = searchParams.get('submission')
  const submissionToken = searchParams.get('token')
  const callUrl = process.env.NEXT_PUBLIC_COMMERCIAL_CALL_URL
  const [propertyDraft, setPropertyDraft] = useState<PropertyDraft>(defaultPropertyDraft)
  const [setupMode, setSetupMode] = useState<'default' | 'manual' | 'spreadsheet'>('default')
  const [plannerMode, setPlannerMode] = useState<'property' | 'zone'>('property')
  const [zones, setZones] = useState<CommercialZoneDraft[]>([defaultZone()])
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>()
  const [inventoryBuckets, setInventoryBuckets] = useState<InventoryBucketDraft[]>([])
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<null | {
    id: string
    status: string
    submissionToken: string
    statusUrl: string
  }>(null)
  const [statusData, setStatusData] = useState<any | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CommercialFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      province: 'NS',
      propertyType: 'surface_lot',
      vehicleTypesAllowed: ['passenger_vehicle'],
      bookingTypesSupported: ['daily', 'monthly'],
      hasSpreadsheet: false,
      spreadsheetLater: false,
      stripeReady: 'need_help',
      authorityConfirmation: false,
      insuranceComplianceConfirmation: false,
      notes: '',
    },
  })

  useEffect(() => {
    if (zones.length === 0 || inventoryBuckets.length > 0) return
    setSelectedZoneId(zones[0]?.id)
    setInventoryBuckets([defaultBucket(zones[0]?.id)])
  }, [zones, inventoryBuckets.length])

  useEffect(() => {
    if (!submissionId || !submissionToken) return
    setStatusLoading(true)
    apiService
      .getCommercialLeadStatus(submissionId, submissionToken)
      .then((response) => {
        if (response.success && response.data) setStatusData(response.data)
      })
      .catch(() => {
        toast.error('Unable to load commercial submission status')
      })
      .finally(() => setStatusLoading(false))
  }, [submissionId, submissionToken])

  const watchedVehicleTypes = watch('vehicleTypesAllowed')
  const watchedBookingTypes = watch('bookingTypesSupported')
  const watchedHasSpreadsheet = watch('hasSpreadsheet')

  const zoneOptions = useMemo(
    () => zones.map((zone) => ({ value: zone.id, label: zone.name || 'Untitled zone' })),
    [zones]
  )

  const updatePropertyDraft = (patch: Partial<PropertyDraft>) => {
    setPropertyDraft((current) => ({ ...current, ...patch }))
  }

  const syncDefaultZone = (coords?: { lat?: number; lng?: number }) => {
    if (setupMode !== 'default') return
    setZones((current) =>
      current.map((zone, index) =>
        index === 0
          ? {
              ...zone,
              name: zone.name || 'Main Lot',
              description: zone.description || 'Default pooled zone for launch',
              lat: coords?.lat ?? propertyDraft.lat,
              lng: coords?.lng ?? propertyDraft.lng,
              isDefaultZone: true,
            }
          : zone
      )
    )
  }

  const handleAddressSelect = (place: any) => {
    const provinceContext = place.context?.find((context: any) => context.id.startsWith('region'))
    const cityContext = place.context?.find((context: any) => context.id.startsWith('place'))
    const postalContext = place.context?.find((context: any) => context.id.startsWith('postcode'))
    updatePropertyDraft({
      address: place.place_name,
      city: cityContext?.text || propertyDraft.city,
      province: provinceContext?.short_code?.split('-')[1] || provinceContext?.text || propertyDraft.province,
      postalCode: postalContext?.text || propertyDraft.postalCode,
      lng: place.center?.[0],
      lat: place.center?.[1],
    })
    syncDefaultZone({ lat: place.center?.[1], lng: place.center?.[0] })
  }

  const handlePropertyLocationChange = (coords: { lat: number; lng: number }) => {
    updatePropertyDraft(coords)
    syncDefaultZone(coords)
  }

  const handleZoneLocationChange = (zoneId: string, coords: { lat: number; lng: number }) => {
    setZones((current) =>
      current.map((zone) => (zone.id === zoneId ? { ...zone, ...coords } : zone))
    )
  }

  const addZone = () => {
    const zone = {
      id: makeId(),
      name: `Zone ${zones.length + 1}`,
      isDefaultZone: false,
      isActive: true,
    }
    setZones((current) => [...current, zone])
    setSelectedZoneId(zone.id)
    setPlannerMode('zone')
  }

  const addInventoryBucket = () => {
    setInventoryBuckets((current) => [...current, defaultBucket(zoneOptions[0]?.value)])
  }

  const onSubmit = async (values: CommercialFormValues) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(values).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, String(value ?? ''))
        }
      })

      formData.append('propertyDraft', JSON.stringify(propertyDraft))
      formData.append('zonesDraft', JSON.stringify(setupMode === 'spreadsheet' ? [] : zones))
      formData.append(
        'inventoryBucketsDraft',
        JSON.stringify(
          inventoryBuckets.map((bucket) => ({
            ...bucket,
            zoneId: setupMode === 'spreadsheet' ? undefined : bucket.zoneId || zones[0]?.id,
          }))
        )
      )

      if (spreadsheetFile) {
        formData.append('spreadsheetUpload', spreadsheetFile)
      }

      const response = await apiService.submitCommercialLead(formData)
      if (!response.success || !response.data) {
        throw new Error(response.error || response.message || 'Submission failed')
      }

      setSubmissionResult(response.data)
      toast.success('Commercial intake submitted')
    } catch (error: any) {
      toast.error(error.message || 'Unable to submit commercial intake')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-100 via-white to-sand-100">
      <section className="border-b border-mist-200 bg-charcoal-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-accent-300" />
                Commercial parking onboarding
              </div>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
                Bring commercial parking inventory online without mapping every stall
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-mist-200">
                Plekk helps operators, landlords, and lot managers launch commercial parking with pooled inventory,
                simple zones, spreadsheet imports, and manual review behind the scenes.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#commercial-intake"
                  className="inline-flex items-center rounded-xl bg-accent-400 px-5 py-3 font-semibold text-charcoal-900 transition hover:bg-accent-300"
                >
                  Start commercial intake
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a
                  href="/commercial-inventory-template.csv"
                  className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
                >
                  Download CSV template
                </a>
                {callUrl && (
                  <Link
                    href={callUrl}
                    className="inline-flex items-center rounded-xl border border-white/20 bg-transparent px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                  >
                    Book a call
                  </Link>
                )}
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  'Pooled inventory by vehicle class',
                  'Simple point-based zone setup',
                  'Manual review first, automation later',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-mist-100">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold">How commercial onboarding works</h2>
              <div className="mt-6 space-y-4">
                {[
                  ['1', 'Submit your property details'],
                  ['2', 'Upload your inventory or set up zones'],
                  ['3', 'Plekk reviews and activates your locations'],
                ].map(([step, label]) => (
                  <div key={step} className="flex items-start gap-4 rounded-2xl bg-white/10 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-300 font-bold text-charcoal-900">
                      {step}
                    </div>
                    <div>
                      <p className="font-semibold">{label}</p>
                      <p className="mt-1 text-sm text-mist-200">
                        v1 is built for low-touch launch. Most sites can go live with pooled counts, zone instructions, and existing signage.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {(submissionResult || statusData || statusLoading) && (
        <section className="border-b border-mist-200 bg-accent-50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-accent-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Submission status</p>
                  {statusLoading ? (
                    <p className="mt-2 text-charcoal-700">Loading commercial submission details...</p>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xl font-semibold text-charcoal-900">
                        {(statusData || submissionResult)?.status === 'approved'
                          ? 'Approved'
                          : (statusData || submissionResult)?.status === 'needs-info'
                          ? 'Needs more information'
                          : (statusData || submissionResult)?.status === 'reviewing'
                          ? 'Under review'
                          : (statusData || submissionResult)?.status === 'rejected'
                          ? 'Not approved'
                          : 'Submitted'}
                      </p>
                      <p className="text-sm text-charcoal-600">
                        Reference:{' '}
                        <span className="font-medium text-charcoal-900">
                          {statusData?.id || submissionResult?.id}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
                {(submissionResult?.statusUrl || (submissionId && submissionToken)) && (
                  <Link
                    href={submissionResult?.statusUrl || `/commercial-parking?submission=${submissionId}&token=${submissionToken}`}
                    className="inline-flex items-center rounded-xl border border-accent-300 bg-accent-100 px-4 py-2 font-medium text-accent-800"
                  >
                    Open status link
                  </Link>
                )}
              </div>
              {statusData?.properties?.length > 0 && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {statusData.properties.map((property: any) => (
                    <div key={property.id} className="rounded-2xl border border-mist-200 bg-mist-50 p-4">
                      <p className="font-semibold text-charcoal-900">{property.name}</p>
                      <p className="text-sm text-charcoal-600">{property.address}</p>
                      <p className="mt-2 text-sm text-charcoal-700">
                        {property.zones?.length || 0} zones, {property.inventoryBuckets?.length || 0} pooled inventory buckets
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: <ClipboardList className="h-5 w-5 text-accent-700" />,
              title: 'Commercial-friendly setup',
              body: 'Define a property, add one or more zones, and assign pooled inventory by vehicle type instead of numbered stalls.',
            },
            {
              icon: <FileSpreadsheet className="h-5 w-5 text-accent-700" />,
              title: 'Spreadsheet-first when helpful',
              body: 'Upload a CSV if you already have inventory data. zone_name + zone_lat + zone_lng support simple lot zones without drawing tools.',
            },
            {
              icon: <CheckCircle2 className="h-5 w-5 text-accent-700" />,
              title: 'Operationally lightweight',
              body: 'Plekk reviews submissions manually in v1. Existing landlord or operator signage can usually be reused to launch.',
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-accent-50 p-3">{item.icon}</div>
              <h2 className="text-lg font-semibold text-charcoal-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="commercial-intake" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-charcoal-900">Commercial intake form</h2>
              <p className="mt-2 text-sm text-charcoal-600">
                Submit one primary property or draft setup now. Large operators can also send a spreadsheet and finish setup after review.
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Company name" error={errors.companyName?.message}>
                  <input {...register('companyName')} className={inputClass} placeholder="Harbourfront Parking Ltd." />
                </Field>
                <Field label="Contact name" error={errors.contactName?.message}>
                  <input {...register('contactName')} className={inputClass} placeholder="Jane Smith" />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <input {...register('email')} type="email" className={inputClass} placeholder="ops@example.com" />
                </Field>
                <Field label="Phone" error={errors.phone?.message}>
                  <input {...register('phone')} className={inputClass} placeholder="902-555-0147" />
                </Field>
                <Field label="City" error={errors.city?.message}>
                  <input {...register('city')} className={inputClass} placeholder="Halifax" />
                </Field>
                <Field label="Province" error={errors.province?.message}>
                  <input {...register('province')} className={inputClass} placeholder="NS" />
                </Field>
                <Field label="Approximate space count" error={errors.approximateSpaceCount?.message}>
                  <input {...register('approximateSpaceCount')} type="number" min={1} className={inputClass} placeholder="100" />
                </Field>
                <Field label="Property type" error={errors.propertyType?.message}>
                  <select {...register('propertyType')} className={inputClass}>
                    {PROPERTY_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <MultiCheckField
                  title="Vehicle types allowed"
                  options={VEHICLE_TYPES}
                  values={watchedVehicleTypes || []}
                  onToggle={(value) => {
                    const next = watchedVehicleTypes?.includes(value)
                      ? watchedVehicleTypes.filter((item) => item !== value)
                      : [...(watchedVehicleTypes || []), value]
                    setValue('vehicleTypesAllowed', next, { shouldValidate: true })
                  }}
                  error={errors.vehicleTypesAllowed?.message}
                />
                <MultiCheckField
                  title="Booking types supported"
                  options={BOOKING_TYPES}
                  values={watchedBookingTypes || []}
                  onToggle={(value) => {
                    const next = watchedBookingTypes?.includes(value)
                      ? watchedBookingTypes.filter((item) => item !== value)
                      : [...(watchedBookingTypes || []), value]
                    setValue('bookingTypesSupported', next, { shouldValidate: true })
                  }}
                  error={errors.bookingTypesSupported?.message}
                />
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Stripe / payout readiness" error={errors.stripeReady?.message}>
                  <select {...register('stripeReady')} className={inputClass}>
                    {STRIPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="rounded-2xl border border-mist-200 bg-mist-50 p-4">
                  <p className="text-sm font-semibold text-charcoal-900">Bulk inventory upload</p>
                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-mist-300 bg-white px-4 py-3 text-sm text-charcoal-700">
                    <Upload className="h-4 w-4 text-accent-700" />
                    <span>{spreadsheetFile ? spreadsheetFile.name : 'Upload CSV, XLSX, XLS, or PDF'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv,.xls,.xlsx,.pdf"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null
                        setSpreadsheetFile(file)
                        setValue('hasSpreadsheet', !!file, { shouldValidate: true })
                      }}
                    />
                  </label>
                  <div className="mt-3 space-y-2 text-sm text-charcoal-600">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" {...register('hasSpreadsheet')} />
                      We already have inventory in a spreadsheet
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" {...register('spreadsheetLater')} />
                      We will send the spreadsheet later
                    </label>
                  </div>
                  {watchedHasSpreadsheet && !spreadsheetFile && (
                    <p className="mt-2 text-xs text-charcoal-500">
                      You can submit now and send the file later. Plekk keeps the review moving either way.
                    </p>
                  )}
                </div>
              </div>

              <Field label="Notes or operating restrictions" error={errors.notes?.message} className="mt-6">
                <textarea
                  {...register('notes')}
                  rows={5}
                  className={inputClass}
                  placeholder="Gate timing, oversized access rules, seasonal restrictions, existing signage instructions, or anything else we should know."
                />
              </Field>

              <div className="mt-6 space-y-3 rounded-2xl border border-mist-200 bg-mist-50 p-5">
                <label className="flex items-start gap-3 text-sm text-charcoal-700">
                  <input type="checkbox" className="mt-1" {...register('authorityConfirmation')} />
                  <span>
                    I confirm I have authority to offer these spaces and that listing them does not violate applicable property, lease,
                    insurance, zoning, or site rules.
                  </span>
                </label>
                {errors.authorityConfirmation?.message && <p className="text-sm text-red-600">{errors.authorityConfirmation.message}</p>}
                <label className="flex items-start gap-3 text-sm text-charcoal-700">
                  <input type="checkbox" className="mt-1" {...register('insuranceComplianceConfirmation')} />
                  <span>
                    I confirm my organization has reviewed any applicable insurance, liability, and site compliance requirements for listing these spaces.
                  </span>
                </label>
                {errors.insuranceComplianceConfirmation?.message && (
                  <p className="text-sm text-red-600">{errors.insuranceComplianceConfirmation.message}</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-charcoal-900">Property and zone draft</h2>
                  <p className="mt-2 text-sm text-charcoal-600">
                    Commercial lots should use pooled inventory buckets and optional zones. Numbered stalls are optional, not required.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['default', 'Default single-zone'],
                    ['manual', 'Manual zone pins'],
                    ['spreadsheet', 'Spreadsheet zones'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSetupMode(value as 'default' | 'manual' | 'spreadsheet')}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        setupMode === value ? 'bg-accent-500 text-white' : 'bg-mist-100 text-charcoal-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Property name">
                  <input
                    value={propertyDraft.name}
                    onChange={(event) => updatePropertyDraft({ name: event.target.value })}
                    className={inputClass}
                    placeholder="Harbour Lot"
                  />
                </Field>
                <Field label="Property type">
                  <select
                    value={propertyDraft.propertyType}
                    onChange={(event) => updatePropertyDraft({ propertyType: event.target.value })}
                    className={inputClass}
                  >
                    {PROPERTY_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Property address">
                    <MapboxAutocomplete
                      value={propertyDraft.address}
                      onChange={(value) => updatePropertyDraft({ address: value })}
                      onSelect={handleAddressSelect}
                      placeholder="Search a property address"
                      preferAddress
                    />
                  </Field>
                </div>
                <Field label="City">
                  <input
                    value={propertyDraft.city}
                    onChange={(event) => updatePropertyDraft({ city: event.target.value })}
                    className={inputClass}
                    placeholder="Halifax"
                  />
                </Field>
                <Field label="Province">
                  <input
                    value={propertyDraft.province}
                    onChange={(event) => updatePropertyDraft({ province: event.target.value })}
                    className={inputClass}
                    placeholder="NS"
                  />
                </Field>
                <Field label="Postal code">
                  <input
                    value={propertyDraft.postalCode}
                    onChange={(event) => updatePropertyDraft({ postalCode: event.target.value })}
                    className={inputClass}
                    placeholder="B3J 2K9"
                  />
                </Field>
                <Field label="Access instructions">
                  <input
                    value={propertyDraft.accessInstructions}
                    onChange={(event) => updatePropertyDraft({ accessInstructions: event.target.value })}
                    className={inputClass}
                    placeholder="Enter via gate on Water Street"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Property restrictions">
                    <textarea
                      value={propertyDraft.restrictions}
                      onChange={(event) => updatePropertyDraft({ restrictions: event.target.value })}
                      rows={3}
                      className={inputClass}
                      placeholder="Examples: no detached trailers after 10pm, RVs only in rear yard, gate closes at midnight."
                    />
                  </Field>
                </div>
              </div>

              {setupMode !== 'spreadsheet' && (
                <div className="mt-6 space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPlannerMode('property')}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        plannerMode === 'property' ? 'bg-charcoal-900 text-white' : 'bg-mist-100 text-charcoal-700'
                      }`}
                    >
                      Set property pin
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlannerMode('zone')}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        plannerMode === 'zone' ? 'bg-charcoal-900 text-white' : 'bg-mist-100 text-charcoal-700'
                      }`}
                    >
                      Set selected zone pin
                    </button>
                    {setupMode === 'manual' && (
                      <button
                        type="button"
                        onClick={addZone}
                        className="inline-flex items-center rounded-full border border-mist-300 px-4 py-2 text-sm font-medium text-charcoal-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add zone
                      </button>
                    )}
                  </div>

                  <CommercialZonePlanner
                    propertyLocation={{ lat: propertyDraft.lat, lng: propertyDraft.lng }}
                    zones={zones}
                    selectedZoneId={selectedZoneId}
                    placementMode={plannerMode}
                    onPropertyLocationChange={handlePropertyLocationChange}
                    onZoneLocationChange={handleZoneLocationChange}
                  />

                  <div className="space-y-4">
                    {zones.map((zone, index) => (
                      <div key={zone.id} className="rounded-2xl border border-mist-200 bg-mist-50 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedZoneId(zone.id)
                              setPlannerMode('zone')
                            }}
                            className={`rounded-full px-3 py-1 text-sm font-medium ${
                              selectedZoneId === zone.id ? 'bg-accent-500 text-white' : 'bg-white text-charcoal-700'
                            }`}
                          >
                            Select zone pin
                          </button>
                          <div className="text-xs text-charcoal-500">
                            {zone.lat != null && zone.lng != null ? `${zone.lat.toFixed(5)}, ${zone.lng.toFixed(5)}` : 'No pin yet'}
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Zone name">
                            <input
                              value={zone.name}
                              onChange={(event) =>
                                setZones((current) =>
                                  current.map((item) => (item.id === zone.id ? { ...item, name: event.target.value } : item))
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                          <Field label="Zone photo URL (optional)">
                            <input
                              value={zone.photoUrl || ''}
                              onChange={(event) =>
                                setZones((current) =>
                                  current.map((item) => (item.id === zone.id ? { ...item, photoUrl: event.target.value } : item))
                                )
                              }
                              className={inputClass}
                              placeholder="https://..."
                            />
                          </Field>
                          <div className="md:col-span-2">
                            <Field label="Zone notes / instructions">
                              <textarea
                                value={zone.description || ''}
                                onChange={(event) =>
                                  setZones((current) =>
                                    current.map((item) => (item.id === zone.id ? { ...item, description: event.target.value } : item))
                                  )
                                }
                                rows={3}
                                className={inputClass}
                                placeholder="Drivers can park anywhere in this zone. Use existing lot signage. No numbered stalls required."
                              />
                            </Field>
                          </div>
                        </div>
                        {setupMode === 'manual' && zones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setZones((current) => current.filter((item) => item.id !== zone.id))
                              setInventoryBuckets((current) => current.filter((bucket) => bucket.zoneId !== zone.id))
                              if (selectedZoneId === zone.id) setSelectedZoneId(zones[0]?.id)
                            }}
                            className="mt-3 text-sm font-medium text-red-600"
                          >
                            Remove zone
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {setupMode === 'spreadsheet' && (
                <div className="mt-6 rounded-2xl border border-dashed border-mist-300 bg-mist-50 p-5 text-sm text-charcoal-600">
                  Use the CSV template to define zones with <code>zone_name</code>, <code>zone_lat</code>, and <code>zone_lng</code>.
                  Polygon drawing is intentionally skipped in v1 to keep onboarding light.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-charcoal-900">Pooled inventory buckets</h2>
                  <p className="mt-2 text-sm text-charcoal-600">
                    Assign quantity by vehicle type to a property or zone. Example: Main Lot: 100 passenger vehicle spaces. RV Area: 20 RV spaces.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addInventoryBucket}
                  className="inline-flex items-center rounded-full border border-mist-300 px-4 py-2 text-sm font-medium text-charcoal-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add bucket
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {inventoryBuckets.map((bucket) => (
                  <div key={bucket.id} className="rounded-2xl border border-mist-200 bg-mist-50 p-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Field label="Bucket label">
                        <input
                          value={bucket.label}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) => (item.id === bucket.id ? { ...item, label: event.target.value } : item))
                            )
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Zone">
                        <select
                          value={bucket.zoneId || zoneOptions[0]?.value || ''}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) => (item.id === bucket.id ? { ...item, zoneId: event.target.value } : item))
                            )
                          }
                          className={inputClass}
                          disabled={setupMode === 'spreadsheet'}
                        >
                          {zoneOptions.length === 0 ? (
                            <option value="">Property-level bucket</option>
                          ) : (
                            zoneOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))
                          )}
                        </select>
                      </Field>
                      <Field label="Vehicle type">
                        <select
                          value={bucket.vehicleType}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) => (item.id === bucket.id ? { ...item, vehicleType: event.target.value } : item))
                            )
                          }
                          className={inputClass}
                        >
                          {INVENTORY_VEHICLE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {prettyLabel(option)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Quantity">
                        <input
                          type="number"
                          min={0}
                          value={bucket.quantity}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) => (item.id === bucket.id ? { ...item, quantity: Number(event.target.value) } : item))
                            )
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Space type">
                        <select
                          value={bucket.spaceType || 'standard'}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) => (item.id === bucket.id ? { ...item, spaceType: event.target.value } : item))
                            )
                          }
                          className={inputClass}
                        >
                          {SPACE_TYPES.map((option) => (
                            <option key={option} value={option}>
                              {prettyLabel(option)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Access type">
                        <select
                          value={bucket.accessType || 'ungated'}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) => (item.id === bucket.id ? { ...item, accessType: event.target.value } : item))
                            )
                          }
                          className={inputClass}
                        >
                          {ACCESS_TYPES.map((option) => (
                            <option key={option} value={option}>
                              {prettyLabel(option)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Availability type">
                        <select
                          value={bucket.availabilityType || 'daily'}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) => (item.id === bucket.id ? { ...item, availabilityType: event.target.value } : item))
                            )
                          }
                          className={inputClass}
                        >
                          {AVAILABILITY_TYPES.map((option) => (
                            <option key={option} value={option}>
                              {prettyLabel(option)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Daily price">
                        <input
                          type="number"
                          min={0}
                          value={bucket.dailyPrice ?? ''}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) =>
                                item.id === bucket.id ? { ...item, dailyPrice: Number(event.target.value) || undefined } : item
                              )
                            )
                          }
                          className={inputClass}
                          placeholder="18"
                        />
                      </Field>
                      <Field label="Monthly price">
                        <input
                          type="number"
                          min={0}
                          value={bucket.monthlyPrice ?? ''}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) =>
                                item.id === bucket.id ? { ...item, monthlyPrice: Number(event.target.value) || undefined } : item
                              )
                            )
                          }
                          className={inputClass}
                          placeholder="180"
                        />
                      </Field>
                      <Field label="Min duration">
                        <input
                          type="number"
                          min={0}
                          value={bucket.minDuration ?? ''}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) =>
                                item.id === bucket.id ? { ...item, minDuration: Number(event.target.value) || undefined } : item
                              )
                            )
                          }
                          className={inputClass}
                          placeholder="1"
                        />
                      </Field>
                      <Field label="Max duration">
                        <input
                          type="number"
                          min={0}
                          value={bucket.maxDuration ?? ''}
                          onChange={(event) =>
                            setInventoryBuckets((current) =>
                              current.map((item) =>
                                item.id === bucket.id ? { ...item, maxDuration: Number(event.target.value) || undefined } : item
                              )
                            )
                          }
                          className={inputClass}
                          placeholder="30"
                        />
                      </Field>
                      <div className="md:col-span-2 xl:col-span-3">
                        <Field label="Restrictions">
                          <input
                            value={bucket.restrictions || ''}
                            onChange={(event) =>
                              setInventoryBuckets((current) =>
                                current.map((item) => (item.id === bucket.id ? { ...item, restrictions: event.target.value } : item))
                              )
                            }
                            className={inputClass}
                            placeholder="No detached trailer parking after 9pm, RV hookups not included, etc."
                          />
                        </Field>
                      </div>
                    </div>
                    {inventoryBuckets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setInventoryBuckets((current) => current.filter((item) => item.id !== bucket.id))}
                        className="mt-3 text-sm font-medium text-red-600"
                      >
                        Remove bucket
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-accent-100 bg-accent-50 p-5 text-sm text-charcoal-700">
                Plekk is a booking marketplace. It does not provide insurance. Most commercial launches do not need new physical signage.
                Existing landlord or operator signage can usually be reused, and if simple zone signs are needed later, operators should be able to print or install them directly.
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <a href="/commercial-inventory-template.csv" className="text-sm font-semibold text-accent-700">
                  Download the bulk upload template
                </a>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center rounded-xl bg-charcoal-900 px-6 py-3 font-semibold text-white transition hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit commercial intake'}
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-6">
            <div className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-charcoal-900">Bulk upload template</h2>
              <p className="mt-2 text-sm text-charcoal-600">
                One row should represent a pooled inventory bucket, not an individual stall. Zones are optional but supported.
              </p>
              <div className="mt-4 rounded-2xl border border-mist-200 bg-mist-50 p-4">
                <p className="text-sm font-semibold text-charcoal-900">Recommended columns</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
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
                  ].map((column) => (
                    <code key={column} className="rounded-full bg-white px-3 py-1 text-xs text-charcoal-700">
                      {column}
                    </code>
                  ))}
                </div>
              </div>
              <a
                href="/commercial-inventory-template.csv"
                className="mt-5 inline-flex items-center rounded-xl border border-mist-300 px-4 py-3 font-medium text-charcoal-800"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-accent-700" />
                Download CSV template
              </a>
            </div>

            <div className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-charcoal-900">What stays manual in v1</h2>
              <ul className="mt-4 space-y-3 text-sm text-charcoal-600">
                <li>Plekk reviews each commercial submission before activation.</li>
                <li>Spreadsheet cleanup, payout checks, and final listing setup still happen behind the scenes.</li>
                <li>Zone polygons are not required. Point-based zones are enough to launch most lots.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-mist-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-charcoal-900">Good fit for this flow</h2>
              <div className="mt-4 space-y-3 text-sm text-charcoal-600">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-accent-700" />
                  Surface lots, garages, industrial yards, and mixed-use sites with 20+ spaces
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-accent-700" />
                  Lots that need separate passenger, RV, truck, trailer, or oversized inventory buckets
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-accent-700" />
                  Operators who want a clean front-end flow with low operational overhead
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-mist-300 bg-white px-4 py-3 text-sm text-charcoal-900 shadow-sm outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-200'

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-charcoal-800">{label}</label>
      {children}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

function MultiCheckField({
  title,
  options,
  values,
  onToggle,
  error,
}: {
  title: string
  options: readonly string[]
  values: string[]
  onToggle: (value: string) => void
  error?: string
}) {
  return (
    <div className="rounded-2xl border border-mist-200 bg-mist-50 p-5">
      <p className="text-sm font-semibold text-charcoal-900">{title}</p>
      <div className="mt-4 grid gap-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-charcoal-700">
            <input type="checkbox" checked={values.includes(option)} onChange={() => onToggle(option)} />
            {prettyLabel(option)}
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
