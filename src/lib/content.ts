import { getCollection, getEntry } from 'astro:content';

export interface BlogPost {
    slug: string;
    title: string;
    description: string;
    pubDate: Date;
    updatedDate: Date | null;
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

/** Normalisasi kategori ke format slug URL ("Panduan Operator" -> "panduan-operator") */
export function slugifyCategory(category: string): string {
    return (category || '')
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, '-');
}

/** Offset WIB (Asia/Jakarta, UTC+7) dalam milidetik. */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Artikel boleh tayang bila bukan draft DAN waktu publikasinya (menurut WIB)
 * sudah tiba. Komponen tanggal & jam di `pubDate` (UTC fields) diperlakukan
 * sebagai waktu WIB (Asia/Jakarta, UTC+7):
 * - Tanggal saja ("2026-11-09") -> tayang pukul 00:00 WIB pada tanggal tersebut.
 * - Tanggal + jam ("2026-11-09T12:00") -> tayang sesuai jam WIB tersebut.
 */
export function isPublished(data: { draft?: boolean; pubDate?: Date }): boolean {
    if (data.draft) return false;
    if (data.pubDate) {
        const publishAt = data.pubDate.getTime() - WIB_OFFSET_MS;
        if (Date.now() < publishAt) return false;
    }
    return true;
}

export async function getPosts(): Promise<BlogPost[]> {
    const posts = await getCollection('blog', ({ data }) => isPublished(data));

    return posts
        .sort((a, b) => (b.data.pubDate?.getTime() || 0) - (a.data.pubDate?.getTime() || 0))
        .map(post => ({
            slug: dirSlug(post.id),
            title: post.data.title,
            description: post.data.description || '',
            pubDate: post.data.pubDate || new Date(),
            updatedDate: post.data.updatedDate ?? null,
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
    const target = slugifyCategory(category);
    const allPosts = await getPosts();
    return allPosts.filter(p => slugifyCategory(p.category) === target);
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
