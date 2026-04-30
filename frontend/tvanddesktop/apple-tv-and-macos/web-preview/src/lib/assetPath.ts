export function assetPath(path: string): string {
  // Use BASE_URL from Vite config (set by base option)
  // - Normal web build (vite.config.ts): BASE_URL = '/' (absolute)
  // - Samsung TV build (vite.config.tv.ts): BASE_URL = './' (relative)
  const base = import.meta.env.BASE_URL || '/';
  
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Return base + path
  // - Web: "/" + "images/logo.png" = "/images/logo.png"
  // - TV:  "./" + "images/logo.png" = "./images/logo.png"
  return `${base}${cleanPath}`;
}
