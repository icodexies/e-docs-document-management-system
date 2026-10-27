export function pageCountFromTotal(total, pageSize) {
  if (total === null || total === undefined || total === "") return null;
  const count = Number(total);
  const size = Number(pageSize);
  if (!Number.isFinite(count) || count < 0 || !Number.isFinite(size) || size <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil(count / size));
}

/**
 * A compact page-number window with ellipses:
 * 1 … 4 [5] 6 … 20
 */
export function pageWindow(page, pageCount) {
  const total = Math.max(1, Math.trunc(Number(pageCount) || 1));
  const current = Math.min(
    Math.max(1, Math.trunc(Number(page) || 1)),
    total,
  );

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);

  const result = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const value = sorted[index];
    if (index > 0 && value - sorted[index - 1] > 1) {
      result.push(`gap-${sorted[index - 1]}`);
    }
    result.push(value);
  }
  return result;
}
