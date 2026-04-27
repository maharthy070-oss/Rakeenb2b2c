export const GEMINI_API_KEY = import.meta.env.VITE_GAPIKEY || "";

console.log("ENV FULL:", import.meta.env);
console.log("VITE_GAPIKEY:", import.meta.env.VITE_GAPIKEY);

if (!GEMINI_API_KEY) {
  console.error("❌ VITE_GAPIKEY is missing from environment variables");
}
