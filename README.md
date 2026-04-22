# Mashaer Readiness Dashboard

## Local development
```
npm install
npm run dev
```

## Production build
```
npm run build
```
Output is in `dist/`.

## Deploy on Netlify
1. Push this folder to a Git repo (or drag the folder into Netlify).
2. Netlify will auto-detect `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Click Deploy. The SPA redirect rule is already configured.
