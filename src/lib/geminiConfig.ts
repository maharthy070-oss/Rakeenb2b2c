// src/lib/geminiConfig.ts
// This file is now safe. No secret keys are stored here!

// The model version you are using
export const GEMINI_MODEL: string = "gemini-2.5-flash";

// This tells your app to talk to your Netlify "bridge" instead of Google directly.
export const API_URL: string = "/.netlify/functions/gemini-proxy";
