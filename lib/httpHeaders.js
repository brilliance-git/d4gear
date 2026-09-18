'use strict';

/**
 * Mobalytics fronts its site with bot detection that 403s an obviously
 * non-browser request (a short custom User-Agent with no other browser
 * headers). These mimic a real Chrome request closely enough to get past
 * that - we're still fetching a public page exactly as a visitor's browser
 * would, just with matching headers.
 */
const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

module.exports = { BROWSER_HEADERS };
