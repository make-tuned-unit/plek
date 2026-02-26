import { computeTaxForProvince, calculateBookingPricing, calculateTotalHours } from '../pricing';

describe('pricing', () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.NS_TAX_RATE;
    delete process.env.TAX_PROVINCES;
  });

  afterAll(() => {
    process.env = origEnv;
  });

  describe('calculateTotalHours', () => {
    it('returns hours between two dates', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T12:00:00Z');
      expect(calculateTotalHours(start, end)).toBe(2);
    });
  });

  describe('computeTaxForProvince', () => {
    it('returns 15% of base for NS', () => {
      expect(computeTaxForProvince(100, 'NS')).toBe(15);
      expect(computeTaxForProvince(100, 'ns')).toBe(15);
      expect(computeTaxForProvince(10.5, 'NS')).toBe(1.58); // 1.575 -> 1.58
    });

    it('returns 0 for non-NS provinces', () => {
      expect(computeTaxForProvince(100, 'ON')).toBe(0);
      expect(computeTaxForProvince(100, 'BC')).toBe(0);
      expect(computeTaxForProvince(100, '')).toBe(0);
      expect(computeTaxForProvince(100, null)).toBe(0);
      expect(computeTaxForProvince(100, undefined)).toBe(0);
    });

    it('returns 0 when baseAmount is 0', () => {
      expect(computeTaxForProvince(0, 'NS')).toBe(0);
    });
  });

  describe('calculateBookingPricing', () => {
    const propertyNS = {
      hourly_rate: 10,
      service_fee_percentage: 10,
      state: 'NS',
    };
    const propertyON = {
      hourly_rate: 10,
      service_fee_percentage: 10,
      state: 'ON',
    };

    it('includes tax for NS property', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T12:00:00Z'); // 2 hours
      const result = calculateBookingPricing(propertyNS, start, end);
      expect(result.baseAmount).toBe(20);
      expect(result.bookerServiceFee).toBe(1); // 5%
      expect(result.hostServiceFee).toBe(1);
      expect(result.taxAmount).toBe(3); // 15% of 20
      expect(result.totalAmount).toBe(24); // 20 + 1 + 3
    });

    it('no tax for non-NS property', () => {
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T12:00:00Z');
      const result = calculateBookingPricing(propertyON, start, end);
      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(21); // 20 + 1
    });

    it('rounds to 2 decimals', () => {
      const prop = { hourly_rate: 10.33, service_fee_percentage: 10, state: 'NS' };
      const start = new Date('2025-01-01T10:00:00Z');
      const end = new Date('2025-01-01T11:00:00Z'); // 1 hour -> 10.33
      const result = calculateBookingPricing(prop, start, end);
      expect(result.baseAmount).toBe(10.33);
      expect(result.taxAmount).toBe(1.55); // 10.33 * 0.15 = 1.5495 -> 1.55
      expect(Number(result.totalAmount.toFixed(2))).toBe(result.totalAmount);
    });
  });
});
