import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Hand-written guide copy only. What an ingredient is called, its class, its aliases and codes, its US label
// treatment and its verdict come from the scanner's registry (src/data/ingredients.generated.json), so they are
// not allowed here: an unknown key fails the build. See src/data/guides.ts.
const ingredients = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/ingredients' }),
  schema: z.strictObject({
    /** Registry id (supabase/functions/_shared/ingredients.ts) this guide is about. */
    entry: z.string(),
    /** Only for a guide about one alias of an entry (file name differs from the entry's slug), e.g. evaporated cane juice. */
    name: z.string().optional(),
    /** Only for an alias guide: the registry aliases it covers. Each must be an alias of `entry`. */
    aliases: z.array(z.string()).optional(),
    title: z.string(),
    description: z.string(),
    summary: z.string(),
    /** How to print some registry aliases or codes, e.g. "Splenda" for "splenda". Case and nothing else may differ. */
    casing: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    sources: z.array(z.string()),
    order: z.number(),
  }),
});

export const collections = { ingredients };
