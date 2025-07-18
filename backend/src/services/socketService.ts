import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export const setupSocketIO = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their personal room
    socket.on('join', (userId: string) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Handle messaging
    socket.on('send_message', (data) => {
      // Broadcast to recipient
      socket.to(`user_${data.receiverId}`).emit('new_message', data);
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      socket.to(`user_${data.receiverId}`).emit('user_typing', data);
    });

    // Handle booking updates
    socket.on('booking_update', (data) => {
      socket.to(`user_${data.userId}`).emit('booking_updated', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
}; 