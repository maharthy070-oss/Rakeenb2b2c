// This file no longer contains the secret key!
// The key is now safely stored in Netlify Environment Variables as GAPIKEY.

// We point to your Netlify function instead of the direct Google URL
export const GEMINI_PROXY_URL = "/.netlify/functions/gemini-proxy";
export const GEMINI_MODEL = "gemini-2.5-flash";
