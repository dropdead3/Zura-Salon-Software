import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

export type CheckoutLineType = 'service' | 'addon' | 'product';
export type CheckoutDiscountType = 'pct' | 'amt' | 'waive';

export interface CheckoutLineDiscount {
  type: CheckoutDiscountType;
  /** Percentage (0–100) for 'pct'; dollar amount for 'amt'; ignored for 'waive' */
  value: number;
  reason?: string | null;
  appliedByUserId?: string | null;
  appliedAt?: string;
}

export interface CheckoutLineItem {
  id: string;
  type: CheckoutLineType;
  name: string;
  serviceId?: string | null;
  staffId?: string | null;
  unitPrice: number;
  quantity: number;
  discount: CheckoutLineDiscount | null;
  isOriginal: boolean;
  /** Audit: original unit price before any in-cart override */
  originalUnitPrice?: number;
  priceSource?: 'pos' | 'location-override' | 'catalog' | 'manual' | 'unset';
}

export interface CheckoutCartSeed {
  serviceName: string;
  serviceId?: string | null;
  staffId?: string | null;
  unitPrice: number;
  priceSource?: CheckoutLineItem['priceSource'];
}

const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ln_${Math.random().toString(36).slice(2)}_${Date.now()}`;

/**
 * Compute the net price for a line item after its discount.
 * Service-level discounts only — order-level discounts apply elsewhere.
 */
export function computeLineNet(line: CheckoutLineItem): number {
  const gross = line.unitPrice * line.quantity;
  if (!line.discount) return gross;
  switch (line.discount.type) {
    case 'waive':
      return 0;
    case 'pct': {
      const pct = Math.max(0, Math.min(100, line.discount.value));
      return gross * (1 - pct / 100);
    }
    case 'amt':
      return Math.max(0, gross - Math.max(0, line.discount.value));
    default:
      return gross;
  }
}

export function computeLineDiscountAmount(line: CheckoutLineItem): number {
  return line.unitPrice * line.quantity - computeLineNet(line);
}

interface UseCheckoutCartOptions {
  /** Lines used to seed the cart on first open. */
  seedLines: CheckoutCartSeed[] | null;
  /** Stable key — when this changes (new appointment), the cart re-seeds. */
  seedKey: string | null;
}

/**
 * Local-state cart for the negotiated checkout phase.
 * Seeded from the appointment's resolved services on mount; mutations
 * are local until the operator confirms checkout.
 */
export function useCheckoutCart({ seedLines, seedKey }: UseCheckoutCartOptions) {
  const [lines, setLines] = useState<CheckoutLineItem[]>([]);
  const seededKeyRef = useRef<string | null>(null);

  // Seed once per appointment (seedKey change = new checkout context).
  useEffect(() => {
    if (!seedKey || !seedLines) return;
    if (seededKeyRef.current === seedKey) return;
    seededKeyRef.current = seedKey;
    setLines(
      seedLines.map((s) => ({
        id: genId(),
        type: 'service' as const,
        name: s.serviceName,
        serviceId: s.serviceId ?? null,
        staffId: s.staffId ?? null,
        unitPrice: s.unitPrice,
        originalUnitPrice: s.unitPrice,
        quantity: 1,
        discount: null,
        isOriginal: true,
        priceSource: s.priceSource ?? 'pos',
      })),
    );
  }, [seedKey, seedLines]);

  const addLine = useCallback((line: Omit<CheckoutLineItem, 'id' | 'isOriginal'> & { isOriginal?: boolean }) => {
    setLines((prev) => [
      ...prev,
      {
        ...line,
        id: genId(),
        isOriginal: line.isOriginal ?? false,
        originalUnitPrice: line.originalUnitPrice ?? line.unitPrice,
      },
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<CheckoutLineItem>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const applyDiscount = useCallback((id: string, discount: CheckoutLineDiscount) => {
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, discount: { ...discount, appliedAt: new Date().toISOString() } }
          : l,
      ),
    );
  }, []);

  const clearDiscount = useCallback((id: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, discount: null } : l)));
  }, []);

  const waiveLine = useCallback((id: string, reason: string, userId?: string) => {
    applyDiscount(id, { type: 'waive', value: 0, reason, appliedByUserId: userId ?? null });
  }, [applyDiscount]);

  const reset = useCallback(() => {
    seededKeyRef.current = null;
    setLines([]);
  }, []);

  // Computed totals
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines],
  );
  const lineDiscountTotal = useMemo(
    () => lines.reduce((sum, l) => sum + computeLineDiscountAmount(l), 0),
    [lines],
  );
  const netSubtotal = useMemo(
    () => lines.reduce((sum, l) => sum + computeLineNet(l), 0),
    [lines],
  );

  // Diff vs original (for the "X changes" banner)
  const diff = useMemo(() => {
    const added = lines.filter((l) => !l.isOriginal).length;
    const removed = (seedLines?.length ?? 0) - lines.filter((l) => l.isOriginal).length;
    const repriced = lines.filter(
      (l) => l.isOriginal && l.originalUnitPrice != null && l.unitPrice !== l.originalUnitPrice,
    ).length;
    const discounted = lines.filter((l) => l.discount != null).length;
    const total = added + Math.max(0, removed) + repriced + discounted;
    return { added, removed: Math.max(0, removed), repriced, discounted, total };
  }, [lines, seedLines]);

  const hasUnsetPrice = useMemo(() => lines.some((l) => l.priceSource === 'unset'), [lines]);

  return {
    lines,
    addLine,
    removeLine,
    updateLine,
    applyDiscount,
    clearDiscount,
    waiveLine,
    reset,
    // Computed
    subtotal,
    lineDiscountTotal,
    netSubtotal,
    diff,
    hasUnsetPrice,
  };
}
