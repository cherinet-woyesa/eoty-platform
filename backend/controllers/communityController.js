const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const cloudStorage = require('../services/cloudStorageService');

// Save uploaded file to /uploads/community and return public URL
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    // Check if GCS upload was successful (or local fallback via middleware)
    if (req.file.gcs && req.file.gcs.publicUrl) {
        let publicUrl = req.file.gcs.publicUrl;
        // If it's a local path (starts with /uploads), prepend backend URL
        if (publicUrl.startsWith('/uploads')) {
            publicUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}${publicUrl}`;
        }
        return res.json({ success: true, data: { url: publicUrl } });
    }

    const uploadsDir = path.join(__dirname, '../uploads/community');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    // If multer already saved file to req.file.path (diskStorage), move it to community folder
    let destPath;
    if (req.file.path) {
      // Move file from uploads/ to uploads/community/
      const fileName = path.basename(req.file.path);
      destPath = path.join(uploadsDir, fileName);
      fs.renameSync(req.file.path, destPath);
    } else if (req.file.buffer) {
      const uniqueName = `${Date.now()}-${req.file.originalname}`;
      destPath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(destPath, req.file.buffer);
    } else {
      return res.status(500).json({ success: false, message: 'Uploaded file not available' });
    }

    // Ensure public URL path - return full backend URL
    const publicUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/community/${path.basename(destPath)}`;

    return res.json({ success: true, data: { url: publicUrl } });
  } catch (error) {
    console.error('uploadMedia error:', error);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

// Generate a presigned PUT URL for direct browser -> S3 uploads
exports.getPresign = async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename) return res.status(400).json({ success: false, message: 'filename is required' });

    // Build a safe key under a community prefix
    const sanitized = cloudStorage.sanitizeKey(filename);
    const key = `community/${Date.now()}-${sanitized}`;

    const command = new PutObjectCommand({
      Bucket: cloudStorage.bucket,
      Key: key,
      ContentType: contentType || 'application/octet-stream'
    });

    const presignedUrl = await getSignedUrl(cloudStorage.s3Client, command, { expiresIn: 60 * 60 }); // 1 hour

    // Provide both presigned URL and the eventual public/cdn URL
    const publicUrl = cloudStorage.getCloudFrontUrl(key);

    return res.json({ success: true, data: { presignedUrl, key, url: publicUrl } });
  } catch (error) {
    console.error('getPresign error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate presigned url' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { content, mediaType, mediaUrl } = req.body;
    const user = req.user || null;

    // Allow post if it has content OR media
    if ((!content || content.trim().length === 0) && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Content or media is required' });
    }

    const authorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : req.body.author_name || 'Anonymous';
    const authorAvatar = user ? user.profilePicture || null : null;

    const [inserted] = await db('community_posts').insert({
      user_id: user ? user.userId : null,
      author_name: authorName,
      author_avatar: authorAvatar,
      content,
      media_type: mediaType || null,
      media_url: mediaUrl || null,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Add author_id alias for frontend compatibility
    const post = { 
      ...inserted, 
      id: inserted.id.toString(),
      author_id: inserted.user_id,
      liked_by_user: false
    };

    return res.json({ success: true, data: { post } });
  } catch (error) {
    console.error('createPost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create post' });
  }
};

exports.fetchPosts = async (req, res) => {
  try {
    console.log('🔄 fetchPosts called');
    console.log('👤 User:', req.user ? req.user.userId : 'No user');

    // Fetch posts with latest author profile info
    const posts = await db('community_posts as p')
      .leftJoin('users as u', 'p.user_id', 'u.id')
      .select(
        'p.*',
        'p.user_id as author_id',
        'u.first_name as author_first_name',
        'u.last_name as author_last_name',
        'u.profile_picture as author_profile_picture'
      )
      .orderBy('p.created_at', 'desc')
      .limit(200);

    // If user is logged in, check which posts they liked and bookmarked
    if (req.user && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      const userLikes = await db('community_post_likes')
        .where('user_id', req.user.userId)
        .whereIn('post_id', postIds)
        .select('post_id');
      
      const likedPostIds = new Set(userLikes.map(l => l.post_id));

      // Check bookmarks
      const userBookmarks = await db('bookmarks')
        .where('user_id', req.user.userId)
        .where('entity_type', 'community_post')
        .whereIn('entity_id', postIds)
        .select('entity_id');
      
      const bookmarkedPostIds = new Set(userBookmarks.map(b => b.entity_id));
      
      posts.forEach(post => {
        // prefer live profile/name if available
        const liveName = `${post.author_first_name || ''} ${post.author_last_name || ''}`.trim();
        if (liveName) {
          post.author_name = liveName;
        }
        if (post.author_profile_picture) {
          post.author_avatar = post.author_profile_picture;
        }

        post.liked_by_user = likedPostIds.has(post.id);
        post.is_bookmarked = bookmarkedPostIds.has(post.id);
      });
    } else {
      posts.forEach(post => {
        const liveName = `${post.author_first_name || ''} ${post.author_last_name || ''}`.trim();
        if (liveName) {
          post.author_name = liveName;
        }
        if (post.author_profile_picture) {
          post.author_avatar = post.author_profile_picture;
        }
        post.liked_by_user = false;
        post.is_bookmarked = false;
      });
    }

    console.log('📊 Posts found:', posts.length);
    // console.log('📋 Sample post:', posts[0] || 'No posts');

    const response = { success: true, data: { posts } };
    // console.log('📤 Sending response:', response);

    return res.json(response);
  } catch (error) {
    console.error('❌ fetchPosts error:', error);
    console.error('❌ Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Find the post
    const post = await db('community_posts').where({ id }).first();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user_id !== user.userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own posts' });
    }

    // Delete the post
    await db('community_posts').where({ id }).del();

    // If there's media, we could delete the file here, but for now we'll leave it

    return res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('deletePost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user = req.user;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    // Find the post
    const post = await db('community_posts').where({ id }).first();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user_id !== user.userId) {
      return res.status(403).json({ success: false, message: 'You can only edit your own posts' });
    }

    // Update the post
    const [updated] = await db('community_posts')
      .where({ id })
      .update({
        content,
        updated_at: new Date()
      })
      .returning('*');

    // Add author_id alias for frontend compatibility
    const updatedPost = { ...updated, author_id: updated.user_id };

    return res.json({ success: true, data: { post: updatedPost }, message: 'Post updated successfully' });
  } catch (error) {
    console.error('updatePost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update post' });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = req.user;

    // Check if post exists
    const post = await db('community_posts').where({ id: postId }).first();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if already liked
    const existingLike = await db('community_post_likes')
      .where({ post_id: postId, user_id: user.userId })
      .first();

    if (existingLike) {
      // Unlike
      await db('community_post_likes')
        .where({ post_id: postId, user_id: user.userId })
        .del();
      
      await db('community_posts')
        .where({ id: postId })
        .decrement('likes', 1);
        
      return res.json({ success: true, message: 'Post unliked', liked: false });
    } else {
      // Like
      await db('community_post_likes').insert({
        post_id: postId,
        user_id: user.userId,
        created_at: new Date()
      });
      
      await db('community_posts')
        .where({ id: postId })
        .increment('likes', 1);
        
      return res.json({ success: true, message: 'Post liked', liked: true });
    }
  } catch (error) {
    console.error('toggleLike error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle like' });
  }
};

// Comments functionality
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId, parent_comment_id } = req.body;
    const user = req.user;

    const parsedParentId = parentCommentId
      ? parseInt(parentCommentId)
      : parent_comment_id
      ? parseInt(parent_comment_id)
      : null;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    // Check if post exists
    const post = await db('community_posts').where({ id: postId }).first();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const authorName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Anonymous';
    const authorAvatar = user ? user.profilePicture || null : null;

    // Insert comment
    const [comment] = await db('community_post_comments').insert({
      post_id: postId,
      author_id: user ? user.userId : null,
      author_name: authorName,
      author_avatar: authorAvatar,
      content,
      parent_comment_id: parsedParentId,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Update comment count on post
    // Social-media behavior: post-level comment count tracks top-level comments only
    if (!parsedParentId) {
      await db('community_posts')
        .where({ id: postId })
        .increment('comments', 1);
    }

    return res.json({ success: true, data: { comment } });
  } catch (error) {
    console.error('addComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

exports.fetchComments = async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if post exists
    const post = await db('community_posts').where({ id: postId }).first();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Fetch comments (parent comments first, then replies) with live author info
    const comments = await db('community_post_comments as c')
      .leftJoin('users as u', 'c.author_id', 'u.id')
      .where({ post_id: postId })
      .orderBy('c.created_at', 'asc')
      .select(
        'c.*',
        'u.first_name as author_first_name',
        'u.last_name as author_last_name',
        'u.profile_picture as author_profile_picture'
      );

    // Organize comments into parent and replies
    const withLiveAuthors = comments.map(c => {
      const liveName = `${c.author_first_name || ''} ${c.author_last_name || ''}`.trim();
      return {
        ...c,
        author_name: liveName || c.author_name,
        author_avatar: c.author_profile_picture || c.author_avatar
      };
    });

    const byId = new Map();
    withLiveAuthors.forEach((c) => {
      byId.set(String(c.id), { ...c, replies: [] });
    });

    const roots = [];
    byId.forEach((node) => {
      if (node.parent_comment_id) {
        const parent = byId.get(String(node.parent_comment_id));
        if (parent) {
          parent.replies.push(node);
          return;
        }
      }
      roots.push(node);
    });

    const commentsWithReplies = roots;

    return res.json({ success: true, data: { comments: commentsWithReplies } });
  } catch (error) {
    console.error('fetchComments error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const user = req.user;

    // Find the comment
    const comment = await db('community_post_comments').where({ id: commentId }).first();
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check if user owns the comment
    if (comment.author_id !== user.userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments' });
    }

    // Get all replies to this comment (and their replies recursively)
    const getAllReplies = async (parentId) => {
      const replies = await db('community_post_comments').where({ parent_comment_id: parentId });
      let allReplies = [...replies];
      for (const reply of replies) {
        const nestedReplies = await getAllReplies(reply.id);
        allReplies = allReplies.concat(nestedReplies);
      }
      return allReplies;
    };

    const allReplies = await getAllReplies(commentId);
    const totalCommentsToDelete = 1 + allReplies.length; // Include the parent comment

    // Delete comment and all its replies
    await db('community_post_comments').where({ id: commentId }).del();
    if (allReplies.length > 0) {
      await db('community_post_comments').whereIn('id', allReplies.map(r => r.id)).del();
    }

    // Update comment count on post
    // Only decrement by 1 if this is a top-level comment (matching increment logic)
    if (!comment.parent_comment_id) {
      await db('community_posts')
        .where({ id: comment.post_id })
        .decrement('comments', 1);
    }

    return res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('deleteComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const user = req.user;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    const comment = await db('community_post_comments').where({ id: commentId }).first();
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author_id !== user.userId) {
      return res.status(403).json({ success: false, message: 'You can only edit your own comments' });
    }

    const [updated] = await db('community_post_comments')
      .where({ id: commentId })
      .update(
        {
          content: content.trim(),
          updated_at: new Date()
        },
        '*'
      );

    return res.json({ success: true, data: { comment: updated } });
  } catch (error) {
    console.error('updateComment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update comment' });
  }
};

// Post sharing functionality
exports.sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { sharedWith, chapterId, message, shareType } = req.body;
    const user = req.user;

    // Check if post exists
    const post = await db('community_posts').where({ id: postId }).first();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Validate share type
    const validShareTypes = ['user', 'chapter', 'public'];
    if (!validShareTypes.includes(shareType)) {
      return res.status(400).json({ success: false, message: 'Invalid share type' });
    }

    // Validate sharing targets based on type
    if (shareType === 'user' && !sharedWith) {
      return res.status(400).json({ success: false, message: 'sharedWith is required for user shares' });
    }

    if (shareType === 'chapter' && !chapterId) {
      return res.status(400).json({ success: false, message: 'chapterId is required for chapter shares' });
    }

    // Prevent duplicate shares
    const existingShare = await db('community_post_shares')
      .where({
        post_id: postId,
        shared_by: user.userId,
        shared_with: shareType === 'user' ? sharedWith : null,
        chapter_id: shareType === 'chapter' ? chapterId : null
      })
      .first();

    if (existingShare) {
      return res.status(400).json({ success: false, message: 'Post already shared with this target' });
    }

    // Insert share record
    const [share] = await db('community_post_shares').insert({
      post_id: postId,
      shared_by: user.userId,
      shared_with: shareType === 'user' ? sharedWith : null,
      chapter_id: shareType === 'chapter' ? chapterId : null,
      message: message || null,
      share_type: shareType,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    // Update share count on post
    await db('community_posts')
      .where({ id: postId })
      .increment('shares', 1);

    return res.json({ success: true, data: { share } });
  } catch (error) {
    console.error('sharePost error:', error);
    return res.status(500).json({ success: false, message: 'Failed to share post' });
  }
};

exports.getSharedPosts = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Get posts shared with this user or their chapter
    const sharedPosts = await db('community_post_shares as s')
      .join('community_posts as p', 's.post_id', 'p.id')
      .leftJoin('users as u', 'p.author_id', 'u.id')
      .where(function() {
        this.where('s.shared_with', user.userId)
            .orWhere('s.chapter_id', user.chapter_id)
            .orWhere('s.share_type', 'public');
      })
      .where('s.shared_by', '!=', user.userId) // Don't show posts user shared themselves
      .select([
        'p.*',
        'u.first_name as author_first_name',
        'u.last_name as author_last_name',
        'u.profile_picture as author_avatar',
        's.message as share_message',
        's.created_at as shared_at'
      ])
      .orderBy('s.created_at', 'desc')
      .limit(100);

    // Format the response
    const formattedPosts = sharedPosts.map(post => ({
      id: post.id,
      author_id: post.author_id,
      author_name: `${post.author_first_name || ''} ${post.author_last_name || ''}`.trim() || 'Anonymous',
      author_avatar: post.author_avatar,
      content: post.content,
      media_type: post.media_type,
      media_url: post.media_url,
      created_at: post.created_at,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      liked_by_user: false, // Will be set by frontend based on user's likes
      share_message: post.share_message,
      shared_at: post.shared_at
    }));

    return res.json({ success: true, data: { posts: formattedPosts } });
  } catch (error) {
    console.error('getSharedPosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shared posts' });
  }
};

exports.getPostShares = async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if post exists
    const post = await db('community_posts').where({ id: postId }).first();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Get share details
    const shares = await db('community_post_shares as s')
      .leftJoin('users as u', 's.shared_by', 'u.id')
      .where('s.post_id', postId)
      .select([
        's.id',
        's.share_type',
        's.message',
        's.created_at',
        'u.first_name as sharer_first_name',
        'u.last_name as sharer_last_name',
        'u.profile_picture as sharer_avatar'
      ])
      .orderBy('s.created_at', 'desc');

    const formattedShares = shares.map(share => ({
      id: share.id,
      share_type: share.share_type,
      message: share.message,
      created_at: share.created_at,
      sharer_name: `${share.sharer_first_name || ''} ${share.sharer_last_name || ''}`.trim() || 'Anonymous',
      sharer_avatar: share.sharer_avatar
    }));

    return res.json({ success: true, data: { shares: formattedShares } });
  } catch (error) {
    console.error('getPostShares error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch post shares' });
  }
};

// Search and trending functionality
exports.searchPosts = async (req, res) => {
  try {
    const { q, filter = 'all', sort = 'newest' } = req.query;
    const user = req.user;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    let query = db('community_posts')
      .leftJoin('users as u', 'community_posts.user_id', 'u.id')
      .select([
        'community_posts.*',
        'community_posts.user_id as author_id',
        'u.first_name as author_first_name',
        'u.last_name as author_last_name',
        'u.profile_picture as author_avatar'
      ]);

    // Add search filter
    const searchTerm = `%${q.trim()}%`;
    query = query.where(function() {
      this.where('community_posts.content', 'ilike', searchTerm)
          .orWhere('u.first_name', 'ilike', searchTerm)
          .orWhere('u.last_name', 'ilike', searchTerm);
    });

    // Add content type filter
    if (filter !== 'all') {
      if (filter === 'text') {
        query = query.whereNull('media_type');
      } else {
        query = query.where('media_type', filter);
      }
    }

    // Add sorting
    switch (sort) {
      case 'oldest':
        query = query.orderBy('community_posts.created_at', 'asc');
        break;
      case 'most_liked':
        query = query.orderBy('community_posts.likes', 'desc');
        break;
      case 'most_commented':
        query = query.orderBy('community_posts.comments', 'desc');
        break;
      case 'newest':
      default:
        query = query.orderBy('community_posts.created_at', 'desc');
        break;
    }

    const posts = await query.limit(100);

    // Format posts
    const formattedPosts = posts.map(post => ({
      id: post.id,
      author_id: post.author_id,
      author_name: `${post.author_first_name || ''} ${post.author_last_name || ''}`.trim() || 'Anonymous',
      author_avatar: post.author_avatar,
      content: post.content,
      media_type: post.media_type,
      media_url: post.media_url,
      created_at: post.created_at,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      liked_by_user: false // Will be set by frontend if needed
    }));

    return res.json({
      success: true,
      data: {
        posts: formattedPosts,
        searchQuery: q,
        filter,
        sort,
        total: formattedPosts.length
      }
    });
  } catch (error) {
    console.error('searchPosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search posts' });
  }
};

exports.getTrendingPosts = async (req, res) => {
  try {
    const { period = '24h', limit = 20 } = req.query;

    // Calculate time range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Calculate trending score based on recent engagement
    const posts = await db('community_posts')
      .leftJoin('users as u', 'community_posts.user_id', 'u.id')
      .select([
        'community_posts.*',
        'community_posts.user_id as author_id',
        'u.first_name as author_first_name',
        'u.last_name as author_last_name',
        'u.profile_picture as author_avatar',
        // Calculate trending score: likes + comments * 2 + shares * 3 + (age factor)
        db.raw(`
          (likes + (comments * 2) + (shares * 3)) *
          GREATEST(0.1, 1 - EXTRACT(EPOCH FROM (NOW() - created_at)) / (24 * 60 * 60)) as trending_score
        `)
      ])
      .where('community_posts.created_at', '>=', startDate)
      .orderBy('trending_score', 'desc')
      .limit(parseInt(limit));

    // Format posts
    const formattedPosts = posts.map(post => ({
      id: post.id,
      author_id: post.author_id,
      author_name: `${post.author_first_name || ''} ${post.author_last_name || ''}`.trim() || 'Anonymous',
      author_avatar: post.author_avatar,
      content: post.content,
      media_type: post.media_type,
      media_url: post.media_url,
      created_at: post.created_at,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      liked_by_user: false, // Will be set by frontend if needed
      trending_score: Math.round(post.trending_score * 100) / 100
    }));

    return res.json({
      success: true,
      data: {
        posts: formattedPosts,
        period,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('getTrendingPosts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get trending posts' });
  }
};

exports.getFeedStats = async (req, res) => {
  try {
    const user = req.user;

    // Get basic stats
    const [
      totalPosts,
      totalLikes,
      totalComments,
      totalShares,
      todayPosts
    ] = await Promise.all([
      db('community_posts').count('id as count').first(),
      db('community_posts').sum('likes as total').first(),
      db('community_posts').sum('comments as total').first(),
      db('community_posts').sum('shares as total').first(),
      db('community_posts')
        .whereRaw('DATE(created_at) = CURRENT_DATE')
        .count('id as count')
        .first()
    ]);

    // Get user's engagement stats if authenticated
    let userStats = null;
    if (user) {
      const [
        userPosts,
        userLikes,
        userComments
      ] = await Promise.all([
        db('community_posts').where({ user_id: user.userId }).count('id as count').first(),
        db('community_post_likes').where({ user_id: user.userId }).count('id as count').first(),
        db('community_post_comments').where({ author_id: user.userId }).count('id as count').first()
      ]);

      userStats = {
        posts: parseInt(userPosts.count),
        likes: parseInt(userLikes.count),
        comments: parseInt(userComments.count)
      };
    }

    return res.json({
      success: true,
      data: {
        global: {
          totalPosts: parseInt(totalPosts.count),
          totalLikes: parseInt(totalLikes.total || 0),
          totalComments: parseInt(totalComments.total || 0),
          totalShares: parseInt(totalShares.total || 0),
          todayPosts: parseInt(todayPosts.count)
        },
        user: userStats
      }
    });
  } catch (error) {
    console.error('getFeedStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get feed stats' });
  }
};
