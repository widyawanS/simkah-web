import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
    loader: glob({ pattern: '**/index.mdx', base: './src/content/blog' }),
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        pubDate: z.coerce.date().optional(),
        updatedDate: z.coerce.date().optional(),
        image: z.string().optional(),
        author: z.string().optional(),
        category: z.string().optional(),
        draft: z.boolean().optional(),
    }),
});

const legal = defineCollection({
    loader: glob({ pattern: '**/index.mdoc', base: './src/content/legal' }),
    schema: z.object({
        title: z.string(),
        lastUpdated: z.coerce.date().optional(),
    }),
});

export const collections = { blog, legal };
