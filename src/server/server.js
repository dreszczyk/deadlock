const express = require('express');
const fallback = require('express-history-api-fallback')
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const cors = require('cors');
const { get, set, findKey } = require('lodash');

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`connected to port ${port}!`));
app
    .use(express.static('build'))
    .use(cors())
    .use(fallback('index.html', { root: 'build' }))

const rooms = {};
const roomTimers = {};

const getRandomShootoutTime = () => {
    const minTime = 2 * 1000;
    const maxTime = 5 * 1000;
    return Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
}

io.on('connection', socket => {
    socket.on('disconnect', () => {
       const playerOneDisconnected = findKey(rooms, room => get(room, 'players.player1.socketId', '') === socket.id);
       const playerTwoDisconnected = findKey(rooms, room => get(room, 'players.player2.socketId', '') === socket.id);
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
        if (get(rooms, roomName, false)) {
            callback({ status: 'ERROR', errorMessage: 'Już jest taki pokój!' })
        } else {
            rooms[roomName] = { gameState: 'IDLE' };
            callback({ status: 'OK' })
        }
    });
    socket.on('JOIN_ROOM', ({ roomName }, callback) => {
        if (get(rooms, roomName, false)) {
            socket.join(roomName);
            callback({ status: 'OK', roomName });
            const roomData = { ...rooms[roomName], roomName };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        } else {
            callback({ status: 'ERROR', errorMessage: `Nie ma takiego pokoju: ${roomName}` });
        }
    });
    socket.on('PLAYER_JOIN_ROOM', ({ roomName, playerId }, callback) => {
        if (get(rooms, roomName, false)) {
            socket.join(roomName);
            set(rooms, `${roomName}.players.player${playerId}`, { connected: true, socketId: socket.id });
            const roomData = { ...rooms[roomName], roomName };
            callback({ status: 'OK', ...roomData });
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        } else {
            callback({ status: 'ERROR', errorMessage: `Nie ma takiego pokoju: ${roomName}` });
        }
    });
    socket.on('PLAYER_LEAVE_ROOM', ({ roomName, playerId }) => {
        if (get(rooms, roomName, false)) {
            set(rooms, `${roomName}.players.player${playerId}.connected`, false);
            const roomData = { ...rooms[roomName], roomName };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        }
    });
    socket.on('PING_PLAYERS', ({ roomName }) => {
        if (get(rooms, roomName, false)) {
            io.to(roomName).emit('PING_REQUEST');
            set(rooms, `${roomName}.pingTime`, Date.now());
        }
    });
    socket.on('PONG', ({ roomName, playerId }) => {
        if (get(rooms, roomName, false)) {
            const time = Date.now();
            const playerPing = time - get(rooms, `${roomName}.pingTime`, time);
            set(rooms, `${roomName}.players.player${playerId}.ping`, playerPing);
            set(rooms, `${roomName}.players.player${playerId}.connected`, true);
            const roomData = { ...rooms[roomName], roomName };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
        }
    });
    socket.on('START_GAME', ({ roomName }) => {
        if (get(rooms, roomName, false)) {
            const roomData = { ...rooms[roomName], roomName, gameState: 'WARMUP' };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
            set(rooms, `${roomName}.gameState`, 'WARMUP');
            const shootoutTime = getRandomShootoutTime();
            roomTimers[roomName] = setTimeout(() => {
                const roomData = { ...rooms[roomName], roomName, gameState: 'SHOOTOUT' };
                io.to(roomName).emit('ROOM_UPDATE', roomData);
                set(rooms, `${roomName}.shootoutTime`, Date.now());
                set(rooms, `${roomName}.gameState`, 'SHOOTOUT');
            }, shootoutTime);
        }
    });
    socket.on('PLAYER_SHOT', ({ roomName, playerId }) => {
        if (get(rooms, roomName, false)) {
            const message = {};
            if (['IDLE', 'ENDGAME'].includes(get(rooms, `${roomName}.gameState`))) {
                io.to(roomName).emit('PEWPEW', playerId);
                return;
            }
            if (get(rooms, `${roomName}.gameState`) === 'WARMUP') {
                set(rooms, `${roomName}.gameState`, 'ENDGAME');
                message.type = 'warning';
                message.winner = Number(playerId) === 1 ? 2 : 1;
                message.description = `Gracz ${playerId} zbyt wcześnie pociągnął za spust.`
            }
            if (get(rooms, `${roomName}.gameState`) === 'SHOOTOUT') {
                const time = Date.now();
                const shootoutTime = get(rooms, `${roomName}.shootoutTime`);
                const playerPing = get(rooms, `${roomName}.players.player${playerId}.ping`, 0);
                const playerReflexTime = time - shootoutTime - playerPing;
                set(rooms, `${roomName}.gameState`, 'ENDGAME');
                message.type = 'success';
                message.winner = playerId;
                message.description = `Gracz ${playerId} był szybszy i wygrał z czasem ${playerReflexTime / 1000}s.`
            }
            clearTimeout(roomTimers[roomName]);
            const roomData = { ...rooms[roomName], roomName, message };
            io.to(roomName).emit('ROOM_UPDATE', roomData);
            io.to(roomName).emit('PEWPEW', playerId);
        }
    });
});