import {
  isTaxEnabled,
  getTaxRate,
  computeTax,
  getThresholdCad,
  getThresholdCadCents,
  type TaxConfigRow,
} from '../taxService';

describe('taxService (pure functions)', () => {
  describe('isTaxEnabled', () => {
    it('returns false when config is null', () => {
      expect(isTaxEnabled(null)).toBe(false);
    });

    it('returns false when tax_mode is "off"', () => {
      expect(isTaxEnabled({ tax_mode: 'off' } as TaxConfigRow)).toBe(false);
    });

    it('returns true when tax_mode is "on"', () => {
      expect(isTaxEnabled({ tax_mode: 'on' } as TaxConfigRow)).toBe(true);
    });
  });

  describe('getTaxRate', () => {
    it('returns 0.15 for NS', () => {
      expect(getTaxRate('NS')).toBe(0.15);
      expect(getTaxRate('ns')).toBe(0.15);
      expect(getTaxRate('  NS  ')).toBe(0.15);
    });

    it('returns 0 for other provinces', () => {
      expect(getTaxRate('ON')).toBe(0);
      expect(getTaxRate('BC')).toBe(0);
      expect(getTaxRate('')).toBe(0);
      expect(getTaxRate(null)).toBe(0);
      expect(getTaxRate(undefined)).toBe(0);
    });
  });

  describe('computeTax', () => {
    it('returns 15% of subtotal for NS', () => {
      expect(computeTax(100, 'NS')).toBe(15);
      expect(computeTax(10.5, 'NS')).toBe(1.58);
    });

    it('returns 0 for non-NS or zero subtotal', () => {
      expect(computeTax(100, 'ON')).toBe(0);
      expect(computeTax(0, 'NS')).toBe(0);
      expect(computeTax(100, null)).toBe(0);
    });
  });

  describe('threshold', () => {
    it('getThresholdCad returns 30000 by default', () => {
      expect(getThresholdCad()).toBe(30_000);
    });

    it('getThresholdCadCents returns 3000000', () => {
      expect(getThresholdCadCents()).toBe(3_000_000);
    });
  });
});
