import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

// Create a reader to access Keystatic content
export const reader = createReader(process.cwd(), keystaticConfig);

// Helper functions to get singleton data
export async function getHomepage() {
    return await reader.singletons.homepage.read();
}

export async function getAboutPage() {
    return await reader.singletons.about.read();
}

export async function getContactPage() {
    return await reader.singletons.contact.read();
}

// Helper functions to get collection data
export async function getAllPosts() {
    const slugs = await reader.collections.posts.list();
    const posts = await Promise.all(
        slugs.map(async (slug) => {
            const post = await reader.collections.posts.read(slug);
            return { slug, ...post };
        })
    );
    return posts;
}

export async function getAllTeamMembers() {
    const slugs = await reader.collections.team.list();
    const members = await Promise.all(
        slugs.map(async (slug) => {
            const member = await reader.collections.team.read(slug);
            return { slug, ...member };
        })
    );
    return members;
}

export async function getAllTools() {
    const slugs = await reader.collections.tools.list();
    const tools = await Promise.all(
        slugs.map(async (slug) => {
            const tool = await reader.collections.tools.read(slug);
            return { slug, ...tool };
        })
    );
    // Sort by order
    return tools.sort((a, b) => (a?.order || 10) - (b?.order || 10));
}

export async function getToolsByCategory(category: string) {
    const allTools = await getAllTools();
    return allTools.filter(tool => tool?.category === category);
}

export async function getActiveTools() {
    const allTools = await getAllTools();
    return allTools.filter(tool => tool?.isActive === true);
}

export async function getMenuTools() {
    const allTools = await getAllTools();
    return allTools.filter(tool => tool?.showInMenu === true && tool?.isActive === true);
}

export async function getCalculatorTools() {
    return await getToolsByCategory('calculator');
}

export async function getConverterTools() {
    return await getToolsByCategory('converter');
}

export async function getGeneratorTools() {
    return await getToolsByCategory('generator');
}

export async function getSiteSettings() {
    return await reader.singletons.siteSettings.read();
}

export async function getLegalPage(slug: string) {
    return await reader.collections.legal.read(slug);
}
