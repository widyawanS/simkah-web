const { getPosts } = require('./src/lib/content');
const path = require('path');

async function test() {
    try {
        console.log('Testing getPosts...');
        const posts = await getPosts();
        console.log(`Success! Found ${posts.length} posts.`);
    } catch (err) {
        console.error('Error in getPosts:', err);
    }
}

test();
