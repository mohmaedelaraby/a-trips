type DecimalLike = { toString(): string } | number | string | null | undefined;

/** Prisma Decimal -> number for JSON responses. Money here is well within float-safe range. */
export function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

export function toNullableNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
