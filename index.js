const dotenv = require('dotenv');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomHandler = require('./roomHandler'); // Import the roomHandler module

dotenv.config();

const app = express();
app.use(cors()); // Use cors middleware to allow cross-origin requests

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "https://localhost:3000"],
        methods: ['GET', 'POST']
    },
});

const rooms = {}; // Initialize rooms

io.on("connection", (socket) => {
    console.log("connected", socket.id);

    // Call roomHandler with io, socket, and rooms
    roomHandler(io, socket, rooms);

    socket.on('disconnect', () => {
        Object.keys(rooms).forEach(roomId => {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId];
                socket.to(roomId).emit('player-left');
            }
        });
    });
});

const port = process.env.PORT || 8080;
httpServer.listen(port, () => console.log(`Listening on port ${port}`));
