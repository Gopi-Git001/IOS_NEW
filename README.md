# Sugar Depth website

This branch holds only the Sugar Depth marketing website (Astro, static), split out of `ios-dev`.

- `sites/sugardepth/`: the website itself. Run `cd sites/sugardepth && npm ci && npm run dev`.
- `supabase/functions/_shared/{ingredients,normalize,policy}.ts`: the shared ingredient rules the site's ingredient pages and "try it" box import. They are copies; the source of truth stays on `ios-dev`.

The app (Expo) and the rest of the backend are not on this branch.
