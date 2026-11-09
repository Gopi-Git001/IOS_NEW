# SUG_SCAN
## Repository layout

This repo holds the scanner app and its marketing sites side by side:

- **Root** (`App.tsx`, `src/`, `supabase/`, ...): the Expo scanner app and Supabase backend.
- **`sites/sugardepth/`**: the Sugar Depth marketing site (Astro, static). Deployed as its own Vercel project with Root Directory `sites/sugardepth`. See [sites/sugardepth/README.md](sites/sugardepth/README.md).
- **`sites/<name>/`**: any future marketing site goes in its own folder here, with its own `package.json` and Vercel project.

The sites don't import anything from the app, and the app doesn't import anything from `sites/`.
