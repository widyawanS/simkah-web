import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        pubDate: z.coerce.date().optional(),
        image: z.string().optional(), // Gunakan string agar tidak crash
        author: z.string().optional(),
        category: z.string().optional(),
        draft: z.boolean().optional(),
    }),
});

const team = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
        title: z.string().optional(),
        avatar: z.string().optional(),
        publishDate: z.any().optional(),
        draft: z.boolean().optional(),
    }),
});

const tools = defineCollection({
    type: 'data',
    schema: z.object({
        title: z.string(),
        shortDescription: z.string().optional(),
        category: z.string().optional(),
        icon: z.string().optional(),
        colorFrom: z.string().optional(),
        colorTo: z.string().optional(),
        link: z.string().optional(),
        isActive: z.boolean().optional(),
        showInMenu: z.boolean().optional(),
        order: z.number().optional(),
    }),
});

const legal = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        lastUpdated: z.coerce.date().optional(),
    }),
});

export const collections = {
    "blog": posts,
    "team": team,
    "tools": tools,
    "legal": legal,
};