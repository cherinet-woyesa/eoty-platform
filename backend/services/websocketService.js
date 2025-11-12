// backend/services/websocketService.js
const { Server } = require('socket.io');
const { URLSearchParams } = require('url');

const clients = new Map();
const dashboardClients = new Map(); // For teacher dashboard connections
let ioInstance = null;

function init(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    const params = new URLSearchParams(socket.request.url.split('?')[1]);
    const lessonId = params.get('lessonId');
    const userId = params.get('userId');
    const type = params.get('type'); // 'lesson' or 'dashboard'

    // Handle dashboard connections
    if (type === 'dashboard' && userId) {
      console.log(`Dashboard WebSocket client connected for userId: ${userId}`);
      dashboardClients.set(socket.id, { userId, socket });
      
      socket.on('disconnect', () => {
        console.log(`Dashboard WebSocket client disconnected: ${socket.id}`);
        dashboardClients.delete(socket.id);
      });
      
      // Send initial dashboard data
      socket.emit('dashboard_connected', { message: 'Connected to dashboard updates' });
      return;
    }

    // Handle lesson progress connections
    if (lessonId) {
      console.log(`WebSocket client connected for lessonId: ${lessonId}`);
      clients.set(socket.id, { lessonId, socket });

      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
        clients.delete(socket.id);
      });
      return;
    }

    // Reject connections without valid parameters
    console.log('WebSocket connection rejected: No valid parameters provided');
    socket.disconnect();
  });

  console.log('WebSocket service initialized');
}

function sendProgress(lessonId, progress) {
  let sentCount = 0;
  console.log(`Attempting to send progress for lesson ${lessonId}:`, progress);
  console.log(`Active WebSocket clients: ${clients.size}`);
  
  for (const [id, client] of clients.entries()) {
    if (client.lessonId === lessonId) {
      console.log(`Sending to client ${id} for lesson ${lessonId}`);
      client.socket.emit('progress', progress);
      sentCount++;
    }
  }
  
  console.log(`Sent ${sentCount} notifications for lesson ${lessonId}`);
  
  if (sentCount === 0) {
    console.warn(`No active WebSocket clients found for lesson ${lessonId}`);
  }
}

// Send dashboard metric updates to all connected teachers
function sendDashboardUpdate(userId, updateType, data) {
  if (!ioInstance) {
    console.warn('WebSocket server not initialized');
    return;
  }

  let sentCount = 0;
  
  // Send to specific user if userId provided, otherwise broadcast to all dashboard clients
  if (userId) {
    for (const [id, client] of dashboardClients.entries()) {
      if (client.userId === userId.toString()) {
        client.socket.emit('dashboard_update', {
          type: updateType,
          data: data,
          timestamp: Date.now()
        });
        sentCount++;
      }
    }
  } else {
    // Broadcast to all dashboard clients
    for (const [id, client] of dashboardClients.entries()) {
      client.socket.emit('dashboard_update', {
        type: updateType,
        data: data,
        timestamp: Date.now()
      });
      sentCount++;
    }
  }
  
  console.log(`Sent dashboard update (${updateType}) to ${sentCount} client(s)`);
}

// Send metric updates (optimized - sends only changed metrics)
function sendMetricUpdate(userId, metrics) {
  sendDashboardUpdate(userId, 'metrics_update', metrics);
}

// Send notification updates
function sendNotification(userId, notification) {
  sendDashboardUpdate(userId, 'notification', notification);
}

module.exports = {
  init,
  sendProgress,
  sendDashboardUpdate,
  sendMetricUpdate,
  sendNotification,
};
