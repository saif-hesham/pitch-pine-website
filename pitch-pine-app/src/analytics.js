import { track } from '@vercel/analytics';

export const trackEvent = (name, props = {}) => {
  if (import.meta.env.DEV) {
    console.log('[analytics]', name, props);
    return;
  }
  track(name, props);
};
