const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const MonopolyDealGame = require('./game');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Frontend'in derlenmiş (build) dosyalarını sun
app.use(express.static(path.join(__dirname, '../client/dist')));

const rooms = {}; // roomCode -> { game, players: { socketId -> { id, name } }, host, isPublic }

// Tur zamanlayıcılarını kontrol eden interval
setInterval(() => {
  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    const game = room.game;

    if (game.phase === 'playing' && game.turnTimer > 0 && game.turnStartTime && !game.hasBlockingState) {
      if (Date.now() - game.turnStartTime > game.turnTimer * 1000) { // Saniyeyi milisaniyeye çevir
        console.log(`[Room ${roomCode}] Tur süresi doldu, ${game.currentPlayer.name} turu otomatik bitiriliyor.`);
        game.endTurn(game.currentPlayer.id); // Otomatik tur bitir
        broadcastState(roomCode);
      }
    }
  }
}, 1000); // Her saniye kontrol et

function getRoomCode() {
  let code;
  do { code = Math.random().toString(36).substring(2, 6).toUpperCase(); }
  while (rooms[code]);
  return code;
}

function broadcastState(roomCode, delay = 0) {
  const room = rooms[roomCode];
  if (!room) return;
  Object.entries(room.players).forEach(([socketId, player]) => {
    const state = room.game.getState(player.id);
    setTimeout(() => io.to(socketId).emit('gameState', state), delay);
  });
}

function getPublicRooms() {
  return Object.entries(rooms)
    .filter(([code, r]) => r.isPublic && r.game.phase === 'waiting' && Object.keys(r.players).length < 5)
    .map(([code, r]) => {
      const hostPlayer = r.players[Object.keys(r.players).find(sid => r.players[sid].id === r.host)];
      return {
        code,
        hostName: hostPlayer ? hostPlayer.name : 'Oyuncu',
        playerCount: Object.keys(r.players).length,
        winSets: r.game.winSets
      };
    });
}

function broadcastPublicRooms() {
  io.emit('publicRooms', getPublicRooms());
}

io.on('connection', (socket) => {
  console.log('Bağlantı:', socket.id);
  socket.emit('publicRooms', getPublicRooms()); // İlk girişte odaları gönder

  socket.on('requestPublicRooms', () => {
    socket.emit('publicRooms', getPublicRooms());
  });

  socket.on('createRoom', ({ name, settings }, cb) => {
    const roomCode = getRoomCode();
    const playerId = uuidv4();
    const safeSettings = settings || {}; // Eğer ayarlar boş gelirse çökmemesi için boş obje kullan
    const game = new MonopolyDealGame(roomCode, safeSettings); // Oda ayarlarını game objesine geçir
    rooms[roomCode] = { game, players: {}, host: playerId, isPublic: safeSettings.isPublic || false };

    game.addPlayer(playerId, name);
    rooms[roomCode].players[socket.id] = { id: playerId, name };

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;

    cb({ ok: true, roomCode, playerId });
    broadcastState(roomCode);
    broadcastPublicRooms();
  });

  socket.on('joinRoom', ({ roomCode, name, reconnectPlayerId }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb({ ok: false, error: 'Oda bulunamadı' });

    let playerId = reconnectPlayerId;
    const isReconnecting = !!playerId && room.game.players.some(p => p.id === playerId);

    if (!isReconnecting) {
      if (room.game.phase !== 'waiting') return cb({ ok: false, error: 'Oyun başladı' });
      if (room.game.players.length >= 5) return cb({ ok: false, error: 'Oda dolu' });
      playerId = uuidv4();
    }

    const ok = room.game.addPlayer(playerId, name);
    if (!ok) return cb({ ok: false, error: 'Katılamadı' });

    room.players[socket.id] = { id: playerId, name };
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;

    cb({ ok: true, playerId });

    if (!isReconnecting) {
      io.to(roomCode).emit('playerJoined', { name, playerCount: room.game.players.length });
    }
    broadcastState(roomCode);
    broadcastPublicRooms();
  });

  socket.on('updatePlayerName', ({ roomCode, newName }) => {
    const room = rooms[roomCode];
    if (room) {
      const player = room.game.players.find(p => p.id === socket.data.playerId);
      if (player) {
        const oldName = player.name;
        player.name = newName;
        room.game.addLog(`${oldName} ismini ${newName} olarak değiştirdi`, 'system');
        broadcastState(roomCode);
      }
    }
  });

  socket.on('sendEmote', ({ targetId, emoji }) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (room) {
      io.to(roomCode).emit('playerEmote', { senderId: playerId, targetId, emoji });
    }
  });

  socket.on('startGame', ({ theme, settings }, cb) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda yok' });
    if (room.host !== playerId) return cb?.({ ok: false, error: 'Sadece host başlatabilir' });
    const ok = room.game.start(theme, settings); // Oda ayarlarını game.start'a geçir
    if (!ok) return cb?.({ ok: false, error: 'En az 2 oyuncu lazım' });
    io.to(roomCode).emit('gameStarted');
    broadcastState(roomCode);
    cb?.({ ok: true });
    broadcastPublicRooms();
  });

  socket.on('playCard', ({ cardId, options }, cb) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda yok' });
    const result = room.game.playCard(playerId, cardId, options || {});
    cb?.(result);
    broadcastState(roomCode);
  });

  socket.on('endTurn', (_, cb) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda yok' });
    const result = room.game.endTurn(playerId);
    cb?.(result);
    broadcastState(roomCode);
  });

  socket.on('discardCards', ({ cardIds }, cb) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda yok' });
    const result = room.game.discardDown(playerId, cardIds);
    cb?.(result);
    broadcastState(roomCode);
  });


  socket.on('flipProperty', ({ cardId, newColor }, cb) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda yok' });
    const result = room.game.flipProperty(playerId, cardId, newColor);
    cb?.(result);
    broadcastState(roomCode);
  });

  socket.on('respondToChallenge', ({ challengeId, useJustSayNo }, cb) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda yok' });
    const result = room.game.respondToChallenge(playerId, challengeId, !!useJustSayNo);
    cb?.(result);
    broadcastState(roomCode);
  });

  socket.on('submitPayment', ({ bankCardIds, propertyCardIds }, cb) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda yok' });
    const result = room.game.submitPayment(playerId, bankCardIds || [], propertyCardIds || []);
    cb?.(result);
    broadcastState(roomCode);
  });

  socket.on('closeRoom', ({ roomCode }, cb) => {
    const { playerId } = socket.data;
    const room = rooms[roomCode];

    if (!room) return cb?.({ ok: false, error: 'Oda bulunamadı' });
    if (room.host !== playerId) return cb?.({ ok: false, error: 'Sadece host odayı kapatabilir' });

    io.to(roomCode).emit('roomClosed'); // Odadaki tüm istemcilere bildir
    delete rooms[roomCode]; // Sunucudan odayı sil

    cb?.({ ok: true });
    broadcastPublicRooms();
  });

  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (room) {
      const player = room.game.players.find(p => p.id === playerId);
      if (player) player.connected = false;
      delete room.players[socket.id];
      if (Object.keys(room.players).length === 0) {
        setTimeout(() => { if (Object.keys(room.players).length === 0) delete rooms[roomCode]; }, 60000);
      }
      broadcastState(roomCode);
      broadcastPublicRooms();
    }
  });
});

app.get('/health', (_, res) => res.json({ ok: true, rooms: Object.keys(rooms).length }));

// Ana dizine istek gelirse React index.html dosyasını döndür
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Monopoly Deal sunucusu çalışıyor: 0.0.0.0:${PORT}`);
  console.log(`Yerel erişim:  http://localhost:${PORT}`);
  console.log(`Dış erişim için modemde ${PORT} portunu bu bilgisayara yönlendirdiğinden emin ol.`);
});
