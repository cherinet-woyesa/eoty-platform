const WebSocket = require('ws');
const queueService = require('./queueService');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // lessonId -> WebSocket connections
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws/video-progress' });

    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const lessonId = url.searchParams.get('lessonId');

      if (!lessonId) {
        ws.close(1008, 'Lesson ID required');
        return;
      }

      console.log(`WebSocket connected for lesson: ${lessonId}`);
      
      // Store connection
      if (!this.clients.has(lessonId)) {
        this.clients.set(lessonId, new Set());
      }
      this.clients.get(lessonId).add(ws);

      // Send initial status
      this.sendProgressUpdate(lessonId, {
        type: 'connected',
        lessonId,
        timestamp: new Date().toISOString()
      });

      // Handle connection close
      ws.on('close', () => {
        this.clients.get(lessonId)?.delete(ws);
        if (this.clients.get(lessonId)?.size === 0) {
          this.clients.delete(lessonId);
        }
        console.log(`WebSocket disconnected for lesson: ${lessonId}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for lesson ${lessonId}:`, error);
      });
    });

    console.log('WebSocket server initialized for video progress updates');
  }

  // Send progress update to all clients for a lesson
  sendProgressUpdate(lessonId, data) {
    const clients = this.clients.get(lessonId);
    if (!clients) return;

    const message = JSON.stringify(data);
    
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Update transcoding progress
  async updateTranscodingProgress(lessonId, progress, currentStep) {
    this.sendProgressUpdate(lessonId, {
      type: 'progress',
      lessonId,
      progress,
      currentStep,
      timestamp: new Date().toISOString()
    });
  }

  // Notify when transcoding is complete
  notifyTranscodingComplete(lessonId, result) {
    this.sendProgressUpdate(lessonId, {
      type: 'complete',
      lessonId,
      result,
      timestamp: new Date().toISOString()
    });
  }

  // Notify when transcoding fails
  notifyTranscodingFailed(lessonId, error) {
    this.sendProgressUpdate(lessonId, {
      type: 'failed',
      lessonId,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebSocketService();