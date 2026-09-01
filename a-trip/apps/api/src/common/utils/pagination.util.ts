export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export function resolvePagination({ page, pageSize }: PaginationInput) {
  const safePage = Math.max(1, Math.floor(page ?? 1));
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize, take: safeSize };
}

export function buildMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
