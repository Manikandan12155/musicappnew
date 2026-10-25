// API configuration helper for Space Music
// Seamlessly routes API requests to backend whether running on Localhost, Vercel, or Render

export function getApiBase(): string {
  // 1. Check if user provided an explicit custom backend URL via environment variables (Vercel settings)
  const envBackend = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_URL;
  if (envBackend && typeof envBackend === 'string' && envBackend.trim()) {
    return envBackend.trim().replace(/\/+$/, '');
  }

  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname || '';

  // 2. On Localhost / Local dev -> use Vite proxy ('') to localhost:5050
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '';
  }

  // 3. If accessed on Vercel or production domain
  // Fallback to active Render backend instance
  return 'https://space-music.onrender.com';
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
