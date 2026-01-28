import { getSupabaseClient } from './supabaseService';

interface GeocodeResult {
  coordinates: [number, number] | null; // [longitude, latitude]
  confidence: number; // 0-1
  address: string;
  isValid: boolean;
  error?: string;
}

/**
 * Verify property location using Mapbox Geocoding API
 * Compares stored coordinates with geocoded address
 */
export async function verifyPropertyLocation(
  propertyId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<{ verified: boolean; error?: string; confidence?: number }> {
  const mapboxToken = process.env['MAPBOX_TOKEN'] || process.env['NEXT_PUBLIC_MAPBOX_TOKEN'];
  
  if (!mapboxToken) {
    console.warn('[Location Verification] Mapbox token not configured');
    return { verified: false, error: 'Mapbox token not configured' };
  }

  // Get property details
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .select('address, city, state, zip_code, country, latitude, longitude')
    .eq('id', propertyId)
    .single();

  if (propertyError || !property) {
    return { verified: false, error: 'Property not found' };
  }

  // Build address string for geocoding
  const addressParts = [
    property.address,
    property.city,
    property.state,
    property.zip_code,
    property.country,
  ].filter(Boolean);

  if (addressParts.length === 0) {
    return { verified: false, error: 'Incomplete address' };
  }

  const addressQuery = addressParts.join(', ');

  try {
    // Geocode the address using Mapbox
    const geocodeResult = await geocodeAddress(addressQuery, mapboxToken);

    if (!geocodeResult.isValid || !geocodeResult.coordinates) {
      return {
        verified: false,
        error: geocodeResult.error || 'Invalid address or location',
      };
    }

    // Check if property has stored coordinates
    if (!property.latitude || !property.longitude) {
      // No coordinates stored, update them from geocoding result
      const [lng, lat] = geocodeResult.coordinates;
      await supabase
        .from('properties')
        .update({
          latitude: lat,
          longitude: lng,
        })
        .eq('id', propertyId);

      // Auto-verify if confidence is high
      if (geocodeResult.confidence >= 0.8) {
        await supabase
          .from('properties')
          .update({
            location_verified_at: new Date().toISOString(),
          })
          .eq('id', propertyId);

        return { verified: true, confidence: geocodeResult.confidence };
      }

      return {
        verified: false,
        error: 'Location needs manual review',
        confidence: geocodeResult.confidence,
      };
    }

    // Compare stored coordinates with geocoded coordinates
    const storedLat = parseFloat(property.latitude.toString());
    const storedLng = parseFloat(property.longitude.toString());
    const [geocodedLng, geocodedLat] = geocodeResult.coordinates;

    // Calculate distance between coordinates (in meters)
    const distance = calculateDistance(
      storedLat,
      storedLng,
      geocodedLat,
      geocodedLng
    );

    // If coordinates are within 100 meters, consider it verified
    // This accounts for GPS accuracy and slight variations
    const MAX_DISTANCE_METERS = 100;

    if (distance <= MAX_DISTANCE_METERS) {
      // Update verification timestamp
      await supabase
        .from('properties')
        .update({
          location_verified_at: new Date().toISOString(),
        })
        .eq('id', propertyId);

      return {
        verified: true,
        confidence: geocodeResult.confidence,
      };
    } else {
      // Coordinates don't match - flag for manual review
      return {
        verified: false,
        error: `Coordinates mismatch: ${distance.toFixed(0)}m difference`,
        confidence: geocodeResult.confidence,
      };
    }
  } catch (error: any) {
    console.error('[Location Verification] Error:', error);
    return {
      verified: false,
      error: error.message || 'Geocoding failed',
    };
  }
}

/**
 * Geocode an address using Mapbox Geocoding API
 */
async function geocodeAddress(
  address: string,
  token: string
): Promise<GeocodeResult> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json() as {
      features?: Array<{
        center: [number, number];
        place_name: string;
        relevance?: number;
        place_type?: string[];
        properties?: {
          category?: string;
        };
      }>;
    };

    if (!data.features || data.features.length === 0) {
      return {
        coordinates: null,
        confidence: 0,
        address: address,
        isValid: false,
        error: 'No results found for address',
      };
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;
    const relevance = feature.relevance || 0; // Mapbox relevance score (0-1)

    // Check if result is a valid address type
    const validTypes = ['address', 'poi', 'neighborhood', 'place'];
    const hasValidType = feature.place_type?.some((type: string) =>
      validTypes.includes(type)
    );

    // Check if result is in a valid location (not water, etc.)
    const isWater = feature.properties?.category === 'water';
    const isValidLocation = !isWater && hasValidType;

    return {
      coordinates: [longitude, latitude],
      confidence: relevance,
      address: feature.place_name,
      isValid: isValidLocation && relevance >= 0.5,
      error: !isValidLocation
        ? 'Location appears to be invalid (e.g., water body)'
        : relevance < 0.5
        ? 'Low confidence in address match'
        : undefined,
    };
  } catch (error: any) {
    return {
      coordinates: null,
      confidence: 0,
      address: address,
      isValid: false,
      error: error.message || 'Geocoding request failed',
    };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Auto-verify property location when property is created or updated
 * Called from property controller
 */
export async function autoVerifyPropertyLocation(
  propertyId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<void> {
  try {
    const result = await verifyPropertyLocation(propertyId, supabase);

    if (result.verified) {
      // Create verification record
      await supabase.from('verifications').insert({
        property_id: propertyId,
        verification_type: 'property_location',
        status: 'verified',
        verified_at: new Date().toISOString(),
        metadata: {
          confidence: result.confidence,
          autoVerified: true,
        },
      });

      // Update badge status (verification service removed - badge functionality disabled)
      // const { updatePropertyBadgeStatus } = await import('./verificationService');
      // await updatePropertyBadgeStatus(propertyId, supabase);
    } else {
      // Create pending verification record for manual review
      await supabase.from('verifications').insert({
        property_id: propertyId,
        verification_type: 'property_location',
        status: 'pending',
        metadata: {
          confidence: result.confidence,
          error: result.error,
          autoVerified: false,
        },
      });
    }
  } catch (error: any) {
    console.error('[Auto Verify Location] Error:', error);
    // Don't throw - verification failure shouldn't block property creation
  }
}

