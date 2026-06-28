const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const MonopolyDealGame = require('./game');
const { handleBotAction } = require('./bot');
const path = require('path');
const { registerUser, loginUser, updateUserStats, updateProfile, getLeaderboard } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000, // Her 10 saniyede bir bağlantıyı kontrol et
  pingTimeout: 30000   // Yanıt gelmezse 30 saniye bekle
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

    // Hızlı Reddet (15 saniye) Kontrolü
    if (game.phase === 'playing' && game.fastChallenge && game.pendingChallenges.length > 0) {
      if (game.challengeStartTime && (Date.now() - game.challengeStartTime > 15000)) {
        const ch = game.pendingChallenges[0];
        console.log(`[Room ${roomCode}] İtiraz süresi doldu, ${ch.responderId} otomatik kabul etti.`);
        game.respondToChallenge(ch.responderId, ch.id, false); // İtirazı pas geçer (kabul eder)
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

  // Bot logic tetiklemesi
  if (room.game) handleBotAction(room.game);

  // Veritabanı İstatistik Güncelleme (Oyun Bitince)
  if (room.game && room.game.winner && !room.game.statsSaved) {
    room.game.statsSaved = true;
    const winnerId = room.game.winner.id;
    room.game.players.forEach(p => {
      if (p.dbUsername) {
        const isWinner = p.id === winnerId;
        updateUserStats(p.dbUsername, isWinner);
      }
    });
  }

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

  // Veritabanı / Üyelik Sockets
  socket.on('userRegister', async ({ username, password }, cb) => {
    const res = await registerUser(username, password);
    cb(res);
  });

  socket.on('userLogin', async ({ username, password }, cb) => {
    const res = await loginUser(username, password);
    cb(res);
  });

  socket.on('updateDbAvatar', async ({ username, avatar }, cb) => {
    const res = await updateProfile(username, avatar);
    if (cb) cb(res);
  });

  socket.on('getLeaderboard', async (cb) => {
    const lb = await getLeaderboard();
    cb(lb);
  });

  socket.on('requestPublicRooms', () => {
    socket.emit('publicRooms', getPublicRooms());
  });

  socket.on('createRoom', ({ name, settings, dbUsername }, cb) => {
    const roomCode = getRoomCode();
    const playerId = uuidv4();
    const safeSettings = settings || {}; // Eğer ayarlar boş gelirse çökmemesi için boş obje kullan
    const game = new MonopolyDealGame(roomCode, safeSettings, (eventName) => {
      if (eventName === 'stateChange') broadcastState(roomCode);
    });
    rooms[roomCode] = { game, players: {}, host: playerId, isPublic: safeSettings.isPublic || false };

    game.addPlayer(playerId, name, safeSettings.avatar || 'avataaars');
    
    // Veritabanı kullanıcısını eşleştir
    const gamePlayer = game.players.find(p => p.id === playerId);
    if (gamePlayer && dbUsername) gamePlayer.dbUsername = dbUsername;

    rooms[roomCode].players[socket.id] = { id: playerId, name };

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;

    cb({ ok: true, roomCode, playerId });
    broadcastState(roomCode);
    broadcastPublicRooms();
  });

  socket.on('joinRoom', ({ roomCode, name, reconnectPlayerId, avatar, dbUsername }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb({ ok: false, error: 'Oda bulunamadı' });

    let playerId = reconnectPlayerId;
    const isReconnecting = !!playerId && room.game.players.some(p => p.id === playerId);

    if (!isReconnecting) {
      if (room.game.phase !== 'waiting') return cb({ ok: false, error: 'Oyun başladı' });
      if (room.game.players.length >= 5) return cb({ ok: false, error: 'Oda dolu' });
      playerId = uuidv4();
    }

    const ok = room.game.addPlayer(playerId, name, avatar || 'avataaars');
    if (!ok) return cb({ ok: false, error: 'Katılamadı' });

    // Veritabanı kullanıcısını eşleştir
    const gamePlayer = room.game.players.find(p => p.id === playerId);
    if (gamePlayer && dbUsername) gamePlayer.dbUsername = dbUsername;

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

  socket.on('addBot', ({ roomCode }, cb) => {
    const room = rooms[roomCode];
    if (!room) return cb?.({ ok: false, error: 'Oda bulunamadı' });
    if (room.host !== socket.data.playerId) return cb?.({ ok: false, error: 'Sadece kurucu bot ekleyebilir' });
    if (room.game.phase !== 'waiting') return cb?.({ ok: false, error: 'Oyun başladı' });
    if (room.game.players.length >= 5) return cb?.({ ok: false, error: 'Oda dolu' });

    const botId = 'bot_' + uuidv4().substring(0, 8);
    const botNumber = room.game.players.filter(p => p.isBot).length + 1;
    const botName = `Bot ${botNumber}`;
    const botAvatar = 'bot-avatar'; // Can be used by frontend to show a robot icon

    const ok = room.game.addPlayer(botId, botName, botAvatar, true);
    if (!ok) return cb?.({ ok: false, error: 'Bot eklenemedi' });

    io.to(roomCode).emit('playerJoined', { name: botName, playerCount: room.game.players.length });
    broadcastState(roomCode);
    cb?.({ ok: true });
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

  socket.on('updateAvatar', ({ roomCode, newAvatar }) => {
    const room = rooms[roomCode];
    if (room) {
      const player = room.game.players.find(p => p.id === socket.data.playerId);
      if (player) {
        player.avatar = newAvatar;
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

  socket.on('sendChatMessage', ({ text }) => {
    const { roomCode, playerId } = socket.data;
    const room = rooms[roomCode];
    if (room) {
      const player = room.game.players.find(p => p.id === playerId);
      io.to(roomCode).emit('chatMessage', { id: uuidv4(), senderId: playerId, senderName: player ? player.name : 'Biri', text, time: Date.now() });
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
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.playCard(playerId, cardId, options || {});
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("playCard crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('endTurn', (_, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.endTurn(playerId);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("endTurn crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('undoMove', (_, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.undoMove(playerId);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("undoMove crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('discardCards', ({ cardIds }, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.discardDown(playerId, cardIds);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("discardCards crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });


  socket.on('flipProperty', ({ cardId, newColor }, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.flipProperty(playerId, cardId, newColor);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("flipProperty crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('respondToChallenge', ({ challengeId, useJustSayNo }, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.respondToChallenge(playerId, challengeId, !!useJustSayNo);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("respondToChallenge crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('submitPayment', ({ bankCardIds, propertyCardIds }, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.submitPayment(playerId, bankCardIds || [], propertyCardIds || []);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("submitPayment crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('proposeTrade', (payload, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.proposeTrade(playerId, payload.targetId, payload.offerBankIds, payload.offerPropIds, payload.requestBankIds, payload.requestPropIds);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("proposeTrade crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('respondToTrade', ({ tradeId, accepted }, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.respondToTrade(playerId, tradeId, accepted);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("respondToTrade crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('buyScavengeCard', ({ cardId }, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.buyScavengeCard(playerId, cardId);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("buyScavengeCard crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('rollGambleDice', (_, cb) => {
    try {
      const { roomCode, playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda yok' });
      const result = room.game.rollGambleDice(playerId);
      cb?.(result);
      broadcastState(roomCode);
    } catch (err) {
      console.error("rollGambleDice crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('returnToLobby', ({ roomCode }, cb) => {
    try {
      const { playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: false, error: 'Oda bulunamadı' });
      if (room.host !== playerId) return cb?.({ ok: false, error: 'Sadece host oyunu bitirebilir' });

      // Oyunu sıfırlayıp lobby'ye döndür
      const safeSettings = room.game.settings || {};
      const newGame = new MonopolyDealGame(roomCode, safeSettings, (eventName) => {
        if (eventName === 'stateChange') broadcastState(roomCode);
      });

      // Mevcut oyuncuları yeni oyuna taşı (bot olmayanlar)
      room.game.players.forEach(p => {
        newGame.addPlayer(p.id, p.name, p.avatar || 'avataaars', p.isBot || false);
      });
      room.game = newGame;

      // Tüm istemcilere lobby'ye döndüklerini bildir
      io.to(roomCode).emit('returnedToLobby');
      broadcastState(roomCode);
      cb?.({ ok: true });
      broadcastPublicRooms();
    } catch (err) {
      console.error('returnToLobby crash:', err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('leaveRoom', ({ roomCode }, cb) => {
    try {
      const { playerId } = socket.data;
      const room = rooms[roomCode];
      if (!room) return cb?.({ ok: true }); // Oda yoksa zaten çıkmış

      // Oyuncuyu oyundan çıkar
      const playerIdx = room.game.players.findIndex(p => p.id === playerId);
      if (playerIdx !== -1) {
        const leavingName = room.game.players[playerIdx].name;
        room.game.players.splice(playerIdx, 1);
        room.game.addLog(`${leavingName} odadan ayrıldı`, 'system');
      }

      // Socket'i odadan çıkar
      delete room.players[socket.id];
      socket.leave(roomCode);
      socket.data.roomCode = null;
      socket.data.playerId = null;

      // Oda boşaldıysa sil
      if (Object.keys(room.players).length === 0) {
        setTimeout(() => { if (rooms[roomCode] && Object.keys(rooms[roomCode].players).length === 0) delete rooms[roomCode]; }, 60000);
      } else {
        broadcastState(roomCode);
      }

      cb?.({ ok: true });
      broadcastPublicRooms();
    } catch (err) {
      console.error('leaveRoom crash:', err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
  });

  socket.on('closeRoom', ({ roomCode }, cb) => {
    try {
      const { playerId } = socket.data;
      const room = rooms[roomCode];

      if (!room) return cb?.({ ok: false, error: 'Oda bulunamadı' });
      if (room.host !== playerId) return cb?.({ ok: false, error: 'Sadece host odayı kapatabilir' });

      io.to(roomCode).emit('roomClosed'); // Odadaki tüm istemcilere bildir
      delete rooms[roomCode]; // Sunucudan odayı sil

      cb?.({ ok: true });
      broadcastPublicRooms();
    } catch (err) {
      console.error("closeRoom crash:", err);
      cb?.({ ok: false, error: 'Sunucu Hatası: ' + err.message });
    }
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
