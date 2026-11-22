export type PortalType = 'faculty' | 'admin' | null;

/**
 * Detect requested portal from URL query (?portal=..., ?view=...), path (/faculty, /admin), or hash (#faculty, #admin)
 */
export function detectPortalFromUrl(): PortalType {
  if (typeof window === 'undefined') return null;

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const portalParam = (searchParams.get('portal') || searchParams.get('view') || '').toLowerCase().trim();
    if (portalParam === 'faculty') return 'faculty';
    if (portalParam === 'admin') return 'admin';

    const pathname = window.location.pathname.toLowerCase().trim();
    if (pathname === '/faculty' || pathname.startsWith('/faculty/')) return 'faculty';
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';

    const hash = window.location.hash.toLowerCase().trim();
    if (hash === '#faculty' || hash.startsWith('#faculty')) return 'faculty';
    if (hash === '#admin' || hash.startsWith('#admin')) return 'admin';
  } catch {
    // ignore
  }

  return null;
}

/**
 * Updates URL search query parameter cleanly without reloading the page
 */
export function setPortalInUrl(portal: 'faculty' | 'admin') {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('portal', portal);
    window.history.pushState({}, '', url.toString());
  } catch {
    // ignore
  }
}

export const SHARED_APP_FALLBACK = 'https://sunstonehub.ai.studio';

/**
 * Returns the permanent 24/7 production URL (sunstonehub.ai.studio) for sharing with faculty & staff.
 */
export function getSharedPortalUrl(portal: 'faculty' | 'admin'): string {
  if (typeof window === 'undefined') return `${SHARED_APP_FALLBACK}/?portal=${portal}`;

  try {
    const currentOrigin = window.location.origin;
    const targetOrigin = currentOrigin.includes('sunstonehub.ai.studio')
      ? 'https://sunstonehub.ai.studio'
      : (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1') || currentOrigin.includes('ais-dev-')
          ? SHARED_APP_FALLBACK
          : currentOrigin);

    return `${targetOrigin}/?portal=${portal}`;
  } catch {
    return `${SHARED_APP_FALLBACK}/?portal=${portal}`;
  }
}
