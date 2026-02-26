/**
 * Shared booking pricing: base amount, service fees, and Nova Scotia tax (15%).
 * Used by bookingController and paymentController so totals stay in sync.
 */

const NS_TAX_RATE = Number(process.env.NS_TAX_RATE) || 0.15;
const TAX_PROVINCES = (process.env.TAX_PROVINCES || 'NS').toUpperCase().split(',').map((p) => p.trim());

export function calculateTotalHours(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return diffMs / (1000 * 60 * 60);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Tax (15% for NS) on the base amount. Collected as part of Plekk fees; shown as "Tax" to customer.
 * Returns 0 when property is not in a taxable province.
 */
export function computeTaxForProvince(
  baseAmount: number,
  province: string | null | undefined
): number {
  if (!province || !baseAmount) return 0;
  const p = String(province).toUpperCase().trim();
  if (!TAX_PROVINCES.includes(p)) return 0;
  return round2(baseAmount * NS_TAX_RATE);
}

export interface BookingPricing {
  baseAmount: number;
  bookerServiceFee: number;
  hostServiceFee: number;
  taxAmount: number;
  totalAmount: number;
}

export function calculateBookingPricing(
  property: { hourly_rate?: number; daily_rate?: number; weekly_rate?: number; monthly_rate?: number; service_fee_percentage?: number; state?: string },
  startTime: Date,
  endTime: Date
): BookingPricing {
  const totalHours = calculateTotalHours(startTime, endTime);
  const totalDays = Math.ceil(totalHours / 24);

  let baseAmount = 0;
  if (property.hourly_rate != null && totalHours < 24) {
    baseAmount = property.hourly_rate * totalHours;
  } else if (property.daily_rate != null && totalDays >= 1) {
    baseAmount = property.daily_rate * totalDays;
  } else if (property.weekly_rate != null && totalDays >= 7) {
    const weeks = Math.ceil(totalDays / 7);
    baseAmount = property.weekly_rate * weeks;
  } else if (property.monthly_rate != null && totalDays >= 30) {
    const months = Math.ceil(totalDays / 30);
    baseAmount = property.monthly_rate * months;
  } else if (property.hourly_rate != null) {
    baseAmount = property.hourly_rate * totalHours;
  } else {
    throw new Error('Property has no pricing configured');
  }

  baseAmount = round2(baseAmount);
  const totalFeePercentage = property.service_fee_percentage ?? 10;
  const hostFeePercentage = totalFeePercentage / 2;
  const bookerFeePercentage = totalFeePercentage / 2;
  const hostServiceFee = round2((baseAmount * hostFeePercentage) / 100);
  const bookerServiceFee = round2((baseAmount * bookerFeePercentage) / 100);
  const taxAmount = computeTaxForProvince(baseAmount, property.state);
  const totalAmount = round2(baseAmount + bookerServiceFee + taxAmount);

  return {
    baseAmount,
    bookerServiceFee,
    hostServiceFee,
    taxAmount,
    totalAmount,
  };
}
