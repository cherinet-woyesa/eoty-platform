// backend/services/websocketService.js
const { Server } = require('socket.io');
const { URLSearchParams } = require('url');

const clients = new Map();

function init(server) {
  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const params = new URLSearchParams(socket.request.url.split('?')[1]);
    const lessonId = params.get('lessonId');

    if (!lessonId) {
      console.log('WebSocket connection rejected: No lessonId provided');
      socket.disconnect();
      return;
    }

    console.log(`WebSocket client connected for lessonId: ${lessonId}`);
    clients.set(socket.id, { lessonId, socket });

    socket.on('disconnect', () => {
      console.log(`WebSocket client disconnected: ${socket.id}`);
      clients.delete(socket.id);
    });
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

module.exports = {
  init,
  sendProgress,
};
