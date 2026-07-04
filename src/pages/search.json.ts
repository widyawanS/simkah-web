import { getPosts } from "@lib/content";
import { getActiveTools } from "@lib/keystatic";

export async function GET() {
    const posts = await getPosts();
    const tools = await getActiveTools();

    const searchData = [
        ...posts.map(post => ({
            title: post.title,
            description: post.description,
            slug: post.slug,
            category: post.category,
            path: `/blog/${post.slug}`
        })),
        ...tools.map(tool => ({
            title: (tool as any).title?.name || tool.slug || 'Tool',
            description: (tool as any).shortDescription || '',
            slug: tool.slug,
            category: tool.category || 'Tool',
            path: (tool as any).link || `/tools/${tool.slug}`
        }))
    ];

    return new Response(JSON.stringify(searchData), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}
