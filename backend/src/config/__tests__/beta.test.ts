describe('beta config', () => {
  const origEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...origEnv };
  });

  afterAll(() => {
    process.env = origEnv;
  });

  describe('isAllowedProvince', () => {
    it('returns true when province is NS and allowed province is NS', () => {
      process.env.BETA_REGION_PROVINCE = 'NS';
      const { isAllowedProvince } = require('../beta');
      expect(isAllowedProvince('NS')).toBe(true);
      expect(isAllowedProvince('ns')).toBe(true);
      expect(isAllowedProvince('  NS  ')).toBe(true);
    });

    it('returns false when province is not NS', () => {
      process.env.BETA_REGION_PROVINCE = 'NS';
      const { isAllowedProvince } = require('../beta');
      expect(isAllowedProvince('ON')).toBe(false);
      expect(isAllowedProvince('BC')).toBe(false);
      expect(isAllowedProvince('')).toBe(false);
      expect(isAllowedProvince(null as any)).toBe(false);
      expect(isAllowedProvince(undefined as any)).toBe(false);
    });

    it('uses BETA_REGION_PROVINCE env', () => {
      process.env.BETA_REGION_PROVINCE = 'ON';
      const { isAllowedProvince } = require('../beta');
      expect(isAllowedProvince('ON')).toBe(true);
      expect(isAllowedProvince('NS')).toBe(false);
    });
  });

  describe('isBetaRegionEnabled', () => {
    it('returns true when BETA_REGION_ENABLED is "true"', () => {
      process.env.BETA_REGION_ENABLED = 'true';
      const { isBetaRegionEnabled } = require('../beta');
      expect(isBetaRegionEnabled()).toBe(true);
    });

    it('returns false when BETA_REGION_ENABLED is not "true"', () => {
      process.env.BETA_REGION_ENABLED = 'false';
      const { isBetaRegionEnabled } = require('../beta');
      expect(isBetaRegionEnabled()).toBe(false);
    });
  });

  describe('getAllowedProvince', () => {
    it('returns default NS when unset', () => {
      delete process.env.BETA_REGION_PROVINCE;
      const { getAllowedProvince } = require('../beta');
      expect(getAllowedProvince()).toBe('NS');
    });
  });
});
