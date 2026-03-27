import { describe, it, expect } from 'vitest';
import { calculateOverageCharge, type AllowanceBillingInput } from '../allowance-billing';

describe('allowance-billing', () => {
  describe('calculateOverageCharge', () => {
    it('returns zero charge when usage is within allowance', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 180,
        actualUsageQty: 150,
        overageRate: 0.40,
        overageRateType: 'per_unit',
        overageCap: null,
      });
      expect(result.isOverage).toBe(false);
      expect(result.chargeAmount).toBe(0);
      expect(result.overageQty).toBe(0);
      expect(result.unusedAllowance).toBe(30);
    });

    it('calculates per_unit overage correctly', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 180,
        actualUsageQty: 200,
        overageRate: 0.40,
        overageRateType: 'per_unit',
        overageCap: null,
      });
      expect(result.isOverage).toBe(true);
      expect(result.overageQty).toBe(20);
      expect(result.chargeAmount).toBe(8.00);
      expect(result.unusedAllowance).toBe(0);
    });

    it('calculates flat overage correctly', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 100,
        actualUsageQty: 150,
        overageRate: 15.00,
        overageRateType: 'flat',
        overageCap: null,
      });
      expect(result.isOverage).toBe(true);
      expect(result.chargeAmount).toBe(15.00);
    });

    it('does not charge flat fee when within allowance', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 100,
        actualUsageQty: 80,
        overageRate: 15.00,
        overageRateType: 'flat',
        overageCap: null,
      });
      expect(result.chargeAmount).toBe(0);
    });

    it('applies overage cap', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 100,
        actualUsageQty: 500,
        overageRate: 0.50,
        overageRateType: 'per_unit',
        overageCap: 50,
      });
      expect(result.overageQty).toBe(400);
      expect(result.chargeAmount).toBe(50); // capped at 50
    });

    it('handles zero allowance', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 0,
        actualUsageQty: 50,
        overageRate: 1.00,
        overageRateType: 'per_unit',
        overageCap: null,
      });
      expect(result.isOverage).toBe(true);
      expect(result.overageQty).toBe(50);
      expect(result.chargeAmount).toBe(50);
    });

    it('handles zero usage', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 100,
        actualUsageQty: 0,
        overageRate: 1.00,
        overageRateType: 'per_unit',
        overageCap: null,
      });
      expect(result.isOverage).toBe(false);
      expect(result.unusedAllowance).toBe(100);
    });

    it('rounds to 2 decimal places', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 100,
        actualUsageQty: 133,
        overageRate: 0.33,
        overageRateType: 'per_unit',
        overageCap: null,
      });
      expect(result.chargeAmount).toBe(10.89);
    });

    it('tiered falls back to per_unit with warning', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 100,
        actualUsageQty: 120,
        overageRate: 0.50,
        overageRateType: 'tiered',
        overageCap: null,
      });
      expect(result.chargeAmount).toBe(10);
    });

    it('handles cap of zero', () => {
      const result = calculateOverageCharge({
        includedAllowanceQty: 100,
        actualUsageQty: 200,
        overageRate: 1.00,
        overageRateType: 'per_unit',
        overageCap: 0,
      });
      expect(result.chargeAmount).toBe(0);
    });
  });
});
