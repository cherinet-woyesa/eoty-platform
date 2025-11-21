import { apiClient } from './index';
import axios from 'axios';

export const communityPostsApi = {
  // Upload media using presigned S3 URL: request presign, PUT to S3, return public URL
  uploadMedia: async (file: File, onProgress?: (p: number) => void) => {
    // 1) Request presigned URL from backend
    const presignResp = await apiClient.post('/community/presign', {
      filename: file.name,
      contentType: file.type
    });

    const presignData = presignResp?.data?.data;
    const presignedUrl: string = presignData?.presignedUrl;
    const publicUrl: string = presignData?.url;

    if (!presignedUrl) throw new Error('Presigned URL not returned from server');

    // 2) Upload directly to S3 using the presigned URL
    try {
      await axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        onUploadProgress: (ev: ProgressEvent) => {
          if (onProgress && ev.total) {
            onProgress((ev.loaded / ev.total) * 100);
          }
        }
      });

      // 3) Return an object shaped like the previous API for compatibility
      return { data: { url: publicUrl } };
    } catch (err) {
      // If browser CORS or network error occurs when PUTting to S3, fallback to server upload
      // This keeps the app usable while bucket CORS is fixed.
      try {
        const fd = new FormData();
        fd.append('file', file);

        const response = await apiClient.post('/community/media', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (ev: ProgressEvent) => {
            if (onProgress && ev.total) {
              onProgress((ev.loaded / ev.total) * 100);
            }
          }
        });

        return response.data;
      } catch (fallbackErr) {
        // Re-throw original error if fallback also fails
        throw err;
      }
    }
  },

  createPost: async (payload: { content: string; mediaType?: string; mediaUrl?: string }) => {
    const response = await apiClient.post('/community/posts', payload);
    return response.data; // expected { success: true, data: { post } }
  },

  fetchPosts: async () => {
    const response = await apiClient.get('/community/posts');
    return response.data; // expected { success: true, data: { posts: [] } }
  }
};

export default communityPostsApi;
