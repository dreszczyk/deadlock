const express = require('express');
const fallback = require('express-history-api-fallback')
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const cors = require('cors');
const _ = require('lodash');

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`connected to port ${port}!`));
app
    .use(express.static('build'))
    .use(cors())
    .use(fallback('index.html', { root: 'build' }))

const rooms = {};

io.on('connection', socket => {
    socket.on('disconnect', () => {
       const playerOneDisconnected = _.findKey(rooms, room => _.get(room, 'players.player1.socketId', '') === socket.id);
       const playerTwoDisconnected = _.findKey(rooms, room => _.get(room, 'players.player2.socketId', '') === socket.id);
       if (playerOneDisconnected) {
           rooms[playerOneDisconnected].players.player1.connected = false;
       }
       if (playerTwoDisconnected) {
           rooms[playerTwoDisconnected].players.player2.connected = false;
       }
       const roomName = playerOneDisconnected || playerTwoDisconnected;
       const roomData = { ...rooms[roomName], roomName };
       io.to(roomName).emit('ROOM_UPDATE', roomData);
    });
    socket.on('CREATE_ROOM', ({ roomName }, callback) => {
        if (_.get(rooms, roomName, false)) {
            callback({ status: 'ERROR', errorMessage: 'Już jest taki pokój!' })
        } else {
            rooms[roomName] = {};
            callback({ status: 'OK' })
        }
    });
    socket.on('JOIN_ROOM', ({ roomName }, callback) => {
        console.log('PING_SERVER', JSON.stringify({ roomName }, null, 4));
        if (_.get(rooms, roomName, false)) {
            socket.join(roomName);
            callback({ status: 'OK', roomName });
            const roomData = { ...rooms[roomName], roomName };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        } else {
            callback({ status: 'ERROR', errorMessage: `Nie ma takiego pokoju: ${roomName}` });
        }
    });
    socket.on('PLAYER_JOIN_ROOM', ({ roomName, playerId, time }, callback) => {
        console.log('PLAYER_JOIN_ROOM', JSON.stringify({ roomName, playerId, time }, null, 4));
        if (_.get(rooms, roomName, false)) {
            socket.join(roomName);
            const ping = new Date().getTime() - time > 0 ? new Date().getTime() - time : 0;
            _.set(rooms, `${roomName}.players.player${playerId}`, { connected: true, socketId: socket.id, ping });
            const roomData = { ...rooms[roomName], roomName };
            callback({ status: 'OK', ...roomData });
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        } else {
            callback({ status: 'ERROR', errorMessage: `Nie ma takiego pokoju: ${roomName}` });
        }
    });
    socket.on('PLAYER_LEAVE_ROOM', ({ roomName, playerId }) => {
        if (_.get(rooms, roomName, false)) {
            _.set(rooms, `${roomName}.players.player${playerId}.connected`, false);
            const roomData = { ...rooms[roomName], roomName };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        }
    });
    socket.on('SHOOT', ({ roomName, playerId }) => {
        if (_.get(rooms, roomName, false)) {
            io.to(roomName).emit('PLAYER_SHOT', playerId);
        }
    });
    socket.on('PING_SERVER', ({ roomName, playerId, time }) => {
        console.log('PING_SERVER', JSON.stringify({ roomName, playerId, time }, null, 4));
        if (_.get(rooms, roomName, false)) {
            const ping = new Date().getTime() - time > 0 ? new Date().getTime() - time : 0;
            _.set(rooms, `${roomName}.players.player${playerId}.ping`, ping);
            const roomData = { ...rooms[roomName], roomName };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        }
    });
});