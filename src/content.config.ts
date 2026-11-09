import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Normalisasi input tanggal/waktu tanpa zona waktu (mis. "2026-11-09T12:00"
 * atau Date hasil parse YAML "2026-11-09") agar komponen tanggal & jamnya
 * konsisten disimpan dalam komponen UTC (merepresentasikan waktu WIB).
 */
const wibDateSchema = z.preprocess((val) => {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(val.trim())) {
        return new Date(`${val.trim()}Z`);
    }
    return val;
}, z.coerce.date().optional());

const blog = defineCollection({
    loader: glob({ pattern: '**/index.mdx', base: './src/content/blog' }),
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        pubDate: wibDateSchema,
        updatedDate: wibDateSchema,
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
