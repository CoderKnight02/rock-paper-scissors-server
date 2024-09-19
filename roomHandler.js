const { v4: uuidv4 } = require('uuid');

const game_result = [
  //   R      Pa     S     L     Sp
  [false, false, true, true, false],  // Rock (Rock loses to Paper and Spock, wins against Scissors and Lizard)
  [true, false, false, false, true],  // Paper (Paper wins against Rock and Spock, loses to Scissors and Lizard)
  [false, true, false, true, false],  // Scissors (Scissors loses to Rock and Spock, wins against Paper and Lizard)
  [false, true, false, false, true],  // Lizard (Lizard loses to Rock and Scissors, wins against Paper and Spock)
  [true, false, true, false, false],  // Spock (Spock wins against Rock and Scissors, loses to Paper and Lizard)
];

const roomHandler = (io, socket, rooms) => {

  // Handle creating a new room
  socket.on("create-room", (callback) => {
    const roomId = uuidv4();

    rooms[roomId] = {
      roomId,
      free: true,
      players: {
        [socket.id]: {
          score: 0,
          selection: 0
        }
      }
    };

    console.log('this is the room', rooms)
    socket.join(roomId)
    callback(null, roomId); // Return roomId to client
  });

  socket.on("selection", ({ roomId, piece }, callback) => {
    const room = rooms[roomId];

    if (room && Object.keys(room.players).includes(socket.id)) {

      // Update the player's selection
      room.players[socket.id].selection = piece;

      // Get players with their keys and values
      let list = Object.entries(room.players).map(([key, value]) => {
        return { key, value };
      });

      // Check if all players have made a selection
      if (list.every(l => l.value.selection !== 0)) {
        let result = {};

        // Check for a tie
        if (list[0].value.selection === list[1].value.selection) {
          result[list[0].key] = {
            result: 'tie',
            score: room.players[list[0].key].score,
            selection: room.players[list[0].key].selection
          };
          result[list[1].key] = {
            result: 'tie',
            score: room.players[list[1].key].score,
            selection: room.players[list[1].key].selection
          };

          // Check if the first player wins
        } else if (game_result[list[0].value.selection - 1][list[1].value.selection - 1] === true) {
          room.players[list[0].key].score += 1;
          result[list[0].key] = {
            result: 'win',
            score: room.players[list[0].key].score,
            selection: room.players[list[1].key].selection
          };
          result[list[1].key] = {
            result: 'lose',
            score: room.players[list[1].key].score,
            selection: room.players[list[0].key].selection
          };

          // Otherwise, the second player wins
        } else {
          room.players[list[1].key].score += 1;
          result[list[0].key] = {
            result: 'lose',
            score: room.players[list[0].key].score,
            selection: room.players[list[1].key].selection
          };
          result[list[1].key] = {
            result: 'win',
            score: room.players[list[1].key].score,
            selection: room.players[list[0].key].selection
          };
        }

        // Clear selections for both players
        room.players[list[0].key].selection = 0;
        room.players[list[1].key].selection = 0;

        // Emit the match result to both players
        io.to(roomId).emit('match', result);
      }

      callback(null); // Room exists, and player is part of it
    } else {
      callback('room not available or does not exist'); // Room doesn't exist, or player is not part of it
    }
  });



  socket.on("join-room", ({ roomId }, callback) => {
    // Check if the room exists and is free
    if (rooms[roomId] && rooms[roomId].free) {

      // Check if the player is already in the room
      if (socket.id in rooms[roomId].players) {
        callback(null); // Player already in the room, nothing to do
        return;
      }

      // Otherwise, add the player to the room
      rooms[roomId].players[socket.id] = { score: 0, selection: 0 };
      socket.join(roomId);

      if (Object.keys(rooms[roomId].players).length === 2) {
        rooms[roomId].free = false;

        io.to(roomId).emit('match-ready', rooms[roomId]);

      }

      console.log(rooms)
      callback(null);

    } else {
      // Room doesn't exist or isn't free
      console.log('failed attepmpt of connection by:', socket.id, 'to room', roomId)
      callback('The room is not available or does not exist');
    }



  });

  socket.on('leave-room', (roomId) => {
    // Check if the room exists and the player is in the room
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {

        // Remove the player from the room
        delete rooms[roomId].players[socket.id];

        // Notify other players in the room that this player has left
        socket.to(roomId).emit('player-left', socket.id);

        // Check if there are no more players left in the room
        if (Object.keys(rooms[roomId].players).length === 0) {
            // If no players are left, delete the room
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted`);
        } else {
            // Reset the scores of all remaining players to 0
            Object.keys(rooms[roomId].players).forEach(playerId => {
                rooms[roomId].players[playerId].score = 0;
                rooms[roomId].players[playerId].selection = 0;
            });
            console.log(`Scores reset for remaining players in room ${roomId}`);
            // Optionally notify remaining players that scores have been reset
            socket.to(roomId).emit('scores-reset');
        }
    }
});


};

module.exports = roomHandler;
