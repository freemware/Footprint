/**
 * The browser's extension API. Safari exposes `browser`, Chrome and Edge expose `chrome`;
 * both return promises in Manifest V3, so the rest of the code uses one name.
 */
declare const browser: typeof chrome | undefined;

export const ext: typeof chrome = (typeof browser !== 'undefined' && browser?.runtime ? browser : typeof chrome !== 'undefined' ? chrome : {}) as typeof chrome;

/** Safari has no system notifications for extensions; callers fall back to the badge. */
export const hasNotifications = () => typeof ext.notifications?.create === 'function';
