/**
 * Generates a matching JWT_SECRET + ANON_KEY pair for local Supabase.
 * Run: node supabase/generate-keys.js
 */
const crypto = require('crypto');

const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';

function makeJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const msg    = `${header}.${body}`;
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(msg).digest('base64url');
  return `${msg}.${sig}`;
}

const ANON_KEY = makeJWT({ iss: 'supabase-demo', role: 'anon',         exp: 1983812996 });
const SVC_KEY  = makeJWT({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 });

console.log('JWT_SECRET=' + JWT_SECRET);
console.log('ANON_KEY='   + ANON_KEY);
console.log('SERVICE_KEY=' + SVC_KEY);
