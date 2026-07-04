import { config, fields, collection, singleton } from '@keystatic/core';

export default config({
    storage: {
        kind: 'local',
    },
    // Singletons - Halaman unik yang hanya ada 1
    singletons: {
        homepage: singleton({
            label: 'Homepage',
            path: 'src/content/pages/homepage',
            schema: {
                heroTitle: fields.text({ label: 'Hero Title', defaultValue: 'Free Template for Startups' }),
                heroSubtitle: fields.text({ label: 'Hero Subtitle', multiline: true }),
                heroButtonText: fields.text({ label: 'Hero Button Text', defaultValue: 'Get Started' }),
                heroButtonLink: fields.text({ label: 'Hero Button Link', defaultValue: '#' }),
            },
        }),
        about: singleton({
            label: 'About Page',
            path: 'src/content/pages/about',
            format: { contentField: 'content' },
            schema: {
                title: fields.text({ label: 'Page Title', defaultValue: 'About' }),
                subtitle: fields.text({ label: 'Subtitle', defaultValue: 'We are a small passionate team.' }),
                heading: fields.text({ label: 'Main Heading' }),
                content: fields.document({
                    label: 'Content',
                    formatting: true,
                    dividers: true,
                    links: true,
                    images: {
                        directory: 'public/images/about',
                        publicPath: '/images/about/',
                    },
                }),

            },
        }),
        contact: singleton({
            label: 'Contact Page',
            path: 'src/content/pages/contact',
            schema: {
                title: fields.text({ label: 'Page Title', defaultValue: 'Contact' }),
                subtitle: fields.text({ label: 'Subtitle' }),
                email: fields.text({ label: 'Email Address' }),
                phone: fields.text({ label: 'Phone Number' }),
                address: fields.text({ label: 'Address', multiline: true }),
            },
        }),
        siteSettings: singleton({
            label: 'Site Settings',
            path: 'src/content/settings',
            schema: {
                metadata: fields.object({
                    siteName: fields.text({ label: 'Site Name', defaultValue: 'SIMKAH Tools' }),
                    description: fields.text({ label: 'Default Description', multiline: true }),
                    ogImage: fields.image({
                        label: 'Default Social Image',
                        directory: 'public/images',
                        publicPath: '/images/',
                    }),
                }, { label: 'Global SEO Metadata' }),
                ads: fields.object({
                    isActive: fields.checkbox({ label: 'Enable Ads Globally', defaultValue: false }),
                    adClient: fields.text({ label: 'AdSense Client ID (e.g. ca-pub-xxx)' }),
                    homeAd: fields.text({ label: 'Home Page Ad Slot ID' }),
                    postAd: fields.text({ label: 'Blog Post Ad Slot ID' }),
                    toolsAd: fields.text({ label: 'Tools Page Ad Slot ID' }),
                    customInjectedHeader: fields.text({ label: 'Custom Header Scripts', multiline: true }),
                }, { label: 'Ad Management (Monetization)' }),
                analytics: fields.object({
                    googleAnalyticsId: fields.text({ label: 'Google Analytics ID' }),
                    umamiWebsiteId: fields.text({ label: 'Umami Website ID' }),
                }, { label: 'Analytics' }),
                footer: fields.object({
                    profile: fields.text({ label: 'Profile/Bio', multiline: true }),
                    address: fields.text({ label: 'Address', multiline: true }),
                    whatsapp: fields.text({ label: 'WhatsApp URL' }),
                    telegram: fields.text({ label: 'Telegram URL' }),
                    facebook: fields.text({ label: 'Facebook URL' }),
                    instagram: fields.text({ label: 'Instagram URL' }),
                }, { label: 'Footer Info' }),
            },
        }),
    },
    // Collections - Konten yang bisa banyak
    collections: {
        legal: collection({
            label: 'Legal Pages',
            slugField: 'title',
            path: 'src/content/legal/*/',
            format: { contentField: 'content' },
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                lastUpdated: fields.date({ label: 'Last Updated', defaultValue: { kind: 'today' } }),
                content: fields.markdoc({ label: 'Content' }),
            },
        }),
        posts: collection({
            label: 'Posts',
            slugField: 'title',
            path: 'src/content/blog/*/',
            format: { contentField: 'content' },
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                description: fields.text({ label: 'Description', multiline: true }),
                pubDate: fields.date({ label: 'Publication Date', defaultValue: { kind: 'today' } }),
                author: fields.text({ label: 'Author', defaultValue: 'Admin' }),
                image: fields.image({
                    label: 'Thumbnail',
                    directory: 'public/images/blog',
                    publicPath: '/images/blog/',
                }),
                category: fields.text({ label: 'Category' }),
                draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
                content: fields.mdx({
                    label: 'Content',
                    options: {
                        image: {
                            directory: 'public/images/blog',
                            publicPath: '/images/blog/',
                        },
                    },
                }),
            },
        }),
        team: collection({
            label: 'Team',
            slugField: 'name',
            path: 'src/content/team/*',
            format: { data: 'yaml' },
            schema: {
                name: fields.slug({ name: { label: 'Name' } }),
                title: fields.text({ label: 'Title' }),
                avatar: fields.image({
                    label: 'Avatar',
                    directory: 'public/images/team',
                    publicPath: '/images/team/',
                }),
                publishDate: fields.date({ label: 'Publish Date', defaultValue: { kind: 'today' } }),
                draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
            },
        }),
        tools: collection({
            label: 'Tools',
            slugField: 'title',
            path: 'src/content/tools/*',
            schema: {
                title: fields.slug({ name: { label: 'Tool Name' } }),
                shortDescription: fields.text({ label: 'Short Description', multiline: true }),
                category: fields.select({
                    label: 'Category',
                    options: [
                        { label: 'Calculator', value: 'calculator' },
                        { label: 'Converter', value: 'converter' },
                        { label: 'Generator', value: 'generator' },
                        { label: 'Other', value: 'other' },
                    ],
                    defaultValue: 'calculator',
                }),
                icon: fields.text({ label: 'Icon Emoji', defaultValue: '🔧' }),
                colorFrom: fields.text({ label: 'Gradient Color From (Tailwind)', defaultValue: 'indigo-500' }),
                colorTo: fields.text({ label: 'Gradient Color To (Tailwind)', defaultValue: 'purple-500' }),
                link: fields.text({ label: 'Tool URL Path (e.g. /tools/my-tool)' }),
                isActive: fields.checkbox({ label: 'Active (uncheck for Coming Soon)', defaultValue: true }),
                showInMenu: fields.checkbox({ label: 'Show in Navigation Menu', defaultValue: false }),
                order: fields.number({ label: 'Display Order', defaultValue: 10 }),
            },
        }),
    },
});