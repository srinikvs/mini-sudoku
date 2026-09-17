export const PORTAL_HREF = "/";

export function leaveToPortal(): void {
  try {
    const top = window.top;
    if (top && top !== window) {
      try {
        if (top.location.origin === window.location.origin) {
          top.location.assign(PORTAL_HREF);
          return;
        }
      } catch {
        /* cannot read a cross-origin parent */
      }
    }
  } catch {
    /* sandboxed iframe */
  }
  window.location.assign(PORTAL_HREF);
}
