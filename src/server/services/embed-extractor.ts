/**
 * Embed extractor service — scrapes third-party embed providers to resolve
 * playable stream URLs.
 *
 * This is **server-only** code: it makes outbound HTTP calls with headers
 * that would be blocked from the browser.
 */
export * from '@/services/embedExtractor';
