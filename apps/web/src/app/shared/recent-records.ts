/** Sort dated records newest first. Older records without timestamps retain their reverse creation order. */
export function newestFirst<T>(rows: readonly T[], timestamp: (row: T) => string | null | undefined): T[] {
  return rows.map((row, index) => ({ row, index }))
    .sort((a, b) => (timestamp(b.row) ?? '').localeCompare(timestamp(a.row) ?? '') || b.index - a.index)
    .map(({ row }) => row);
}
