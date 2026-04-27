export const GEMINI_API_KEY = import.meta.env.VITE_GAPIKEY || "";
export const GEMINI_MODEL = "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  console.error("❌ VITE_GAPIKEY is missing from environment variables");
}
