import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const ingredients = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/ingredients' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    summary: z.string(),
    verdict: z.enum(['UGLY', 'BAD', 'CLEAN']),
    verdictLabel: z.string().optional(),
    rule: z.string(),
    cls: z.string(),
    labeling: z.string(),
    aliases: z.array(z.string()),
    codes: z.array(z.string()).default([]),
    related: z.array(z.string()).default([]),
    sources: z.array(z.string()),
    order: z.number(),
  }),
});

export const collections = { ingredients };
