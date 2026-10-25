export const DEFAULT_LOGO = '/assets/space-music-logo.png';

/**
 * Automatically upgrades low-resolution YouTube & Google UserContent thumbnails
 * to crisp, studio-master Ultra HD (1080p) artwork.
 * Also provides seamless fallback to official Space Music logo if no image exists.
 */
export function upgradeHighQualityCover(url?: string | null, videoId?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    if (videoId && videoId.length === 11) {
      return `https://i.ytimg.com/vi/${videoId}/hq720.jpg`;
    }
    return DEFAULT_LOGO;
  }

  let cleaned = url.trim();

  // 1. Google User Content / YouTube Music Studio Artworks
  // (e.g. yt3.googleusercontent.com, lh3.googleusercontent.com, *.ggpht.com)
  // Low-res default tags: =w60-h60, =w120-h120, =w226-h226, =s120
  // Upgraded to =w1080-h1080-l90-rj or =s1200 (True 1080p uncompressed art)
  if (/googleusercontent\.com|ggpht\.com/i.test(cleaned)) {
    if (/=w\d+-h\d+/i.test(cleaned)) {
      return cleaned.replace(/=w\d+-h\d+[^=]*/i, '=w1080-h1080-l90-rj');
    }
    if (/=s\d+/i.test(cleaned)) {
      return cleaned.replace(/=s\d+[^=]*/i, '=s1200');
    }
    // If no size suffix exists, append high-res tag
    if (!cleaned.includes('=')) {
      return `${cleaned}=w1080-h1080-l90-rj`;
    }
  }

  // 2. YouTube Thumbnail Image CDN (i.ytimg.com)
  // Upgrade 480x360 (hqdefault) / 320x180 (mqdefault) to crisp 1280x720 (hq720)
  if (/ytimg\.com/i.test(cleaned)) {
    if (cleaned.includes('/hqdefault.jpg') || cleaned.includes('/mqdefault.jpg') || cleaned.includes('/default.jpg')) {
      return cleaned.replace(/\/(?:hqdefault|mqdefault|default)\.jpg/i, '/hq720.jpg');
    }
  }

  return cleaned;
}
