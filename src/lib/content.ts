import { getCollection, getEntry } from 'astro:content';

export interface BlogPost {
    slug: string;
    title: string;
    description: string;
    pubDate: Date;
    author: string;
    image: any; // Astro Image metadata
    category: string;
    draft: boolean;
    content: string;
}

/** Slug direktori dari entry id content-layer ("a/b/SLUG/index.mdx" -> "SLUG") */
function dirSlug(id: string): string {
    const parts = id.split('/');
    return parts.length >= 2 ? parts[parts.length - 2] : id;
}

export async function getPosts(): Promise<BlogPost[]> {
    const posts = await getCollection('blog', ({ data }) => {
        return !data.draft;
    });

    return posts
        .sort((a, b) => (b.data.pubDate?.getTime() || 0) - (a.data.pubDate?.getTime() || 0))
        .map(post => ({
            slug: dirSlug(post.id),
            title: post.data.title,
            description: post.data.description || '',
            pubDate: post.data.pubDate || new Date(),
            author: post.data.author || 'Admin',
            image: post.data.image,
            category: post.data.category || 'General',
            draft: !!post.data.draft,
            content: post.body,
        }));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
    const posts = await getPosts();
    return posts.find((p) => p.slug === slug) || null;
}

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
    const allPosts = await getPosts();
    return allPosts.filter(p => p.category.toLowerCase() === category.toLowerCase());
}

export interface LegalPage {
    slug: string;
    title: string;
    lastUpdated: Date;
    content: string;
}

export async function getLegalPage(slug: string): Promise<LegalPage | null> {
    const pages = await getCollection('legal');
    const entry = pages.find((e) => dirSlug(e.id) === slug);
    if (!entry) return null;

    return {
        slug: dirSlug(entry.id),
        title: entry.data.title || slug,
        lastUpdated: entry.data.lastUpdated || new Date(),
        content: entry.body,
    };
}
