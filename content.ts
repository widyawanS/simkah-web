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

export async function getPosts(): Promise<BlogPost[]> {
    const posts = await getCollection('blog', ({ data }) => {
        return !data.draft;
    });

    return posts
        .sort((a, b) => (b.data.pubDate?.getTime() || 0) - (a.data.pubDate?.getTime() || 0))
        .map(post => ({
            slug: post.slug,
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
    const entry = await getEntry('blog', slug);
    if (!entry) return null;

    return {
        slug: entry.slug,
        title: entry.data.title,
        description: entry.data.description || '',
        pubDate: entry.data.pubDate || new Date(),
        author: entry.data.author || 'Admin',
        image: entry.data.image,
        category: entry.data.category || 'General',
        draft: !!entry.data.draft,
        content: entry.body,
    };
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
    const entry = await getEntry('legal', slug);
    if (!entry) return null;

    return {
        slug: entry.slug,
        title: entry.data.title || slug,
        lastUpdated: entry.data.lastUpdated || new Date(),
        content: entry.body,
    };
}
