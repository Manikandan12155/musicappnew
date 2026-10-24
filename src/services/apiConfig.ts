// API configuration helper for Space Music
// Seamlessly routes API requests to Render backend whether running on Render, Vercel, or Localhost

export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname || '';

  // If user accesses via Vercel (or any custom domain where backend is on Render)
  if (hostname.includes('vercel.app')) {
    return 'https://space-music.onrender.com';
  }

  // Otherwise, use relative path (e.g. on Render unified deployment or local Vite proxy)
  return '';
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
