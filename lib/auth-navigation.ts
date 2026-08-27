export function sanitizeDashboardPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !/^\/dashboard(?:[/?#]|$)/.test(path)) return "/dashboard";
  if (path.startsWith("//") || path.includes("://") || path.includes("\\")) return "/dashboard";
  return path;
}
