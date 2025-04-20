const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const MAX_USERS = 6;
const PASSWORD = "Ratubagus";

let activeUsers = [];
let typingUsers = [];

io.on('connection', (socket) => {
  console.log('New user connected');

  // Handle login
  socket.on('login', ({ username, password }, callback) => {
    if (password !== PASSWORD) {
      return callback({ success: false, message: 'Password salah! Gunakan password "Ratubagus".' });
    }

    if (activeUsers.length >= MAX_USERS) {
      return callback({ success: false, message: 'Maaf, grup sudah penuh (maksimal 6 pengguna).' });
    }

    if (activeUsers.some(user => user.username === username)) {
      return callback({ success: false, message: 'Username sudah digunakan. Pilih username lain.' });
    }

    const user = { id: socket.id, username, color: getRandomColor() };
    activeUsers.push(user);
    typingUsers = typingUsers.filter(u => u.id !== socket.id);

    callback({ success: true, user });
    io.emit('user joined', user);
    io.emit('update users', activeUsers);
  });

  // Handle new message
  socket.on('new message', (message) => {
    const user = activeUsers.find(u => u.id === socket.id);
    if (user) {
      io.emit('new message', {
        username: user.username,
        color: user.color,
        text: message.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', () => {
    const user = activeUsers.find(u => u.id === socket.id);
    if (user && !typingUsers.some(u => u.id === socket.id)) {
      typingUsers.push(user);
      io.emit('typing', typingUsers.map(u => u.username));
    }
  });

  socket.on('stop typing', () => {
    typingUsers = typingUsers.filter(u => u.id !== socket.id);
    io.emit('typing', typingUsers.map(u => u.username));
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = activeUsers.find(u => u.id === socket.id);
    if (user) {
      activeUsers = activeUsers.filter(u => u.id !== socket.id);
      typingUsers = typingUsers.filter(u => u.id !== socket.id);
      io.emit('user left', user);
      io.emit('update users', activeUsers);
      io.emit('typing', typingUsers.map(u => u.username));
    }
  });

  // Helper function to generate random color for username
  function getRandomColor() {
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#F333FF', 
      '#33FFF5', '#FF33A8', '#FFC733', '#7B33FF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});