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
  for (const [id, client] of clients.entries()) {
    if (client.lessonId === lessonId) {
      client.socket.emit('progress', progress);
    }
  }
}

module.exports = {
  init,
  sendProgress,
};
