export const GEMINI_API_KEY = import.meta.env.VITE_GAPIKEY || "";

// ✅ Add this line back (this is what broke your build)
export const GEMINI_MODEL = "gemini-1.5-flash";

console.log("ENV FULL:", import.meta.env);
console.log("VITE_GAPIKEY:", import.meta.env.VITE_GAPIKEY);

if (!GEMINI_API_KEY) {
  console.error("❌ VITE_GAPIKEY is missing from environment variables");
}
