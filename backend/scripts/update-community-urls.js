const db = require('../config/database');

async function updateCommunityPostUrls() {
  try {
    console.log('Starting community post URL update...');

    // Get all posts with media URLs that start with /uploads/
    const posts = await db('community_posts')
      .where('media_url', 'like', '/uploads/%')
      .select('id', 'media_url');

    console.log(`Found ${posts.length} posts to update`);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    for (const post of posts) {
      const fullUrl = `${backendUrl}${post.media_url}`;

      await db('community_posts')
        .where('id', post.id)
        .update({ media_url: fullUrl });

      console.log(`Updated post ${post.id}: ${post.media_url} -> ${fullUrl}`);
    }

    console.log('Community post URL update completed successfully');
  } catch (error) {
    console.error('Error updating community post URLs:', error);
  } finally {
    process.exit(0);
  }
}

updateCommunityPostUrls();
