// Root deployment by default; a framework base path can be configured in Vite.
export function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
