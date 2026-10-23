import { makeRateLimiter } from '../../../src/sources/rateLimit.js';
export { makeRateLimiter } from '../../../src/sources/rateLimit.js';

/**
 * Per-IP rate limiter for the cost-bearing API proxies (OpenAI / Google).
 * DEFAULT IS BOUNDED: when the env var is unset, `0`, or invalid, enforce
 * 120 requests per minute per socket peer (OpenAI overrides this to eight). Operators may configure a positive
 * per-IP limit up to 120. The limiter is created lazily and reused; a global
 * backstop prevents aggregate cost blowups.
 *
 * @param {string|undefined} envValue - Raw env value (requests/min/IP).
 * @returns {((key:string)=>boolean)|null} An `allow(key)` fn, or null when unlimited.
 */
export function makeOptInRateLimiter(envValue) {
  const configured = Number(envValue);
  // Fail safe: missing, zero or invalid settings cannot disable protection on
  // endpoints that spend API credits. Operators may raise the rate as needed.
  const max =
    Number.isSafeInteger(configured) && configured > 0
      ? Math.min(configured, 120)
      : 120;
  return makeRateLimiter({
    windowMs: 60_000,
    max: Math.floor(max),
    globalMax: Math.floor(max) * 20,
  });
}

/**
 * Client key for rate limiting. Uses the real socket peer address only — we do
 * NOT trust X-Forwarded-For (client-controlled; a rotating value would mint fresh
 * quota and grow the limiter map). This is a localhost dev proxy, so the socket
 * address is the real client.
 */
export function clientKey(req) {
  return String(req.socket?.remoteAddress || 'local');
}
