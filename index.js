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
        origin: ["http://localhost:3000", "https://coderknight02.github.io"],
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
            // Check if the disconnected player was in this room
            if (rooms[roomId].players[socket.id]) {

                // Remove the player from the room
                delete rooms[roomId].players[socket.id];
                
                // Notify other players that a player has left
                socket.to(roomId).emit('player-left', socket.id);

                socket.leave(roomId);
                // Check if the room is now empty
                if (Object.keys(rooms[roomId].players).length === 0) {
                    // If no players are left, delete the room
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted due to no players left`);
                } else {
                    console.log(`Player ${socket.id} disconnected from room ${roomId}`);
                }
            }
        });
    });
});


const port = process.env.PORT || 8080;
httpServer.listen(port, () => console.log(`Listening on port ${port}`));
