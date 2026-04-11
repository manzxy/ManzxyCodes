// src/lib/apiHelpers.js — Shared HTTP utilities for API handlers

/**
 * Set standard CORS headers
 * @param {object} res  - Vercel response
 * @param {string} methods - Allowed methods string, e.g. 'GET,POST,OPTIONS'
 */
export function setCORS(res, methods = 'GET,OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Handle preflight OPTIONS — returns true if it handled the request
 */
export function handleOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  res.status(204).end();
  return true;
}

/**
 * Parse request body — handles JSON string, object, or missing body
 */
export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (typeof req.body === 'object') return req.body;
  return {};
}

/**
 * Get real client IP, handling proxies (Vercel/Cloudflare)
 */
export function getIP(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}
