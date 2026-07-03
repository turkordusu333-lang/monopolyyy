const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.json');

// Yerel veritabanını ilklendir
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
}

// Yerel veritabanını oku
function readLocalDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { users: [] };
  }
}

// Yerel veritabanına yaz
function writeLocalDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('JSON veritabanı yazılamadı:', e);
  }
}

// .env dosyasını manuel oku (sıfır bağımlılık)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const index = trimmed.indexOf('=');
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        process.env[key] = val;
      }
    });
  } catch (e) {
    console.error('.env okunamadı:', e);
  }
}

// Çevre değişkenleri kontrolü (Supabase)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const useSupabase = !!(supabaseUrl && supabaseKey);

if (useSupabase) {
  console.log('[DB] Supabase bağlantısı algılandı, Supabase PostgreSQL kullanılacak.');
} else {
  console.log('[DB] Supabase ayarları bulunamadı. Yerel JSON veritabanı (server/database.json) kullanılacak.');
}

const CUSTOMIZATIONS_FILE = path.join(__dirname, 'customizations.json');

function readLocalCustomizations() {
  try {
    if (fs.existsSync(CUSTOMIZATIONS_FILE)) {
      const data = fs.readFileSync(CUSTOMIZATIONS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[DB] Error reading customizations file:', e);
  }
  return {};
}

function writeLocalCustomizations(data) {
  try {
    fs.writeFileSync(CUSTOMIZATIONS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[DB] Error writing customizations file:', e);
  }
}

function getLocalUserCustomizations(username) {
  const normalized = username.trim().toLowerCase();
  const custs = readLocalCustomizations();
  if (!custs[normalized]) {
    custs[normalized] = {
      unlockedBorders: ['default'],
      unlockedCardBacks: ['default'],
      selectedBorder: 'default',
      selectedCardBack: 'default',
      winHistory: []
    };
    writeLocalCustomizations(custs);
  }
  return custs[normalized];
}

function saveLocalUserCustomizations(username, fields) {
  const normalized = username.trim().toLowerCase();
  const custs = readLocalCustomizations();
  if (!custs[normalized]) {
    custs[normalized] = {
      unlockedBorders: ['default'],
      unlockedCardBacks: ['default'],
      unlockedTitles: ['default'],
      unlockedPlayEffects: ['default'],
      selectedBorder: 'default',
      selectedCardBack: 'default',
      selectedTitle: 'default',
      selectedPlayEffect: 'default',
      winHistory: []
    };
  }
  custs[normalized] = { ...custs[normalized], ...fields };
  writeLocalCustomizations(custs);
}

function serializeCustomizationsForSupabase(user, newFields = {}) {
  let style = 'fun-emoji';
  let currentBorder = 'default';
  let currentCardBack = 'default';
  let currentTitle = 'default';
  let currentPlayEffect = 'default';
  let unlockedBorders = ['default'];
  let unlockedCardBacks = ['default'];
  let unlockedTitles = ['default'];
  let unlockedPlayEffects = ['default'];
  let winHistory = [];

  if (user.avatar && user.avatar.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(user.avatar);
      style = parsed.style || 'fun-emoji';
      currentBorder = parsed.selectedBorder || 'default';
      currentCardBack = parsed.selectedCardBack || 'default';
      currentTitle = parsed.selectedTitle || 'default';
      currentPlayEffect = parsed.selectedPlayEffect || 'default';
      unlockedBorders = parsed.unlockedBorders || ['default'];
      unlockedCardBacks = parsed.unlockedCardBacks || ['default'];
      unlockedTitles = parsed.unlockedTitles || ['default'];
      unlockedPlayEffects = parsed.unlockedPlayEffects || ['default'];
      winHistory = parsed.winHistory || [];
    } catch (e) {
      console.error('[DB] Error parsing existing serialized customizations:', e);
      style = user.avatar;
    }
  } else if (user.avatar) {
    style = user.avatar;
  }

  if (user.unlockedBorders) unlockedBorders = user.unlockedBorders;
  if (user.unlockedCardBacks) unlockedCardBacks = user.unlockedCardBacks;
  if (user.unlockedTitles) unlockedTitles = user.unlockedTitles;
  if (user.unlockedPlayEffects) unlockedPlayEffects = user.unlockedPlayEffects;
  if (user.selectedBorder) currentBorder = user.selectedBorder;
  if (user.selectedCardBack) currentCardBack = user.selectedCardBack;
  if (user.selectedTitle) currentTitle = user.selectedTitle;
  if (user.selectedPlayEffect) currentPlayEffect = user.selectedPlayEffect;
  if (user.winHistory) winHistory = user.winHistory;

  const merged = {
    style: newFields.avatar !== undefined ? newFields.avatar : style,
    selectedBorder: newFields.selectedBorder !== undefined ? newFields.selectedBorder : currentBorder,
    selectedCardBack: newFields.selectedCardBack !== undefined ? newFields.selectedCardBack : currentCardBack,
    selectedTitle: newFields.selectedTitle !== undefined ? newFields.selectedTitle : currentTitle,
    selectedPlayEffect: newFields.selectedPlayEffect !== undefined ? newFields.selectedPlayEffect : currentPlayEffect,
    unlockedBorders: newFields.unlockedBorders !== undefined ? newFields.unlockedBorders : unlockedBorders,
    unlockedCardBacks: newFields.unlockedCardBacks !== undefined ? newFields.unlockedCardBacks : unlockedCardBacks,
    unlockedTitles: newFields.unlockedTitles !== undefined ? newFields.unlockedTitles : unlockedTitles,
    unlockedPlayEffects: newFields.unlockedPlayEffects !== undefined ? newFields.unlockedPlayEffects : unlockedPlayEffects,
    winHistory: newFields.winHistory !== undefined ? newFields.winHistory : winHistory
  };

  return JSON.stringify(merged);
}

function sanitizeUserCustomizations(user) {
  if (!user) return { user, modified: false };
  let modified = false;

  if (useSupabase) {
    if (user.avatar && user.avatar.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(user.avatar);
        user.unlockedBorders = parsed.unlockedBorders || ['default'];
        user.unlockedCardBacks = parsed.unlockedCardBacks || ['default'];
        user.unlockedTitles = parsed.unlockedTitles || ['default'];
        user.unlockedPlayEffects = parsed.unlockedPlayEffects || ['default'];
        user.selectedBorder = parsed.selectedBorder || 'default';
        user.selectedCardBack = parsed.selectedCardBack || 'default';
        user.selectedTitle = parsed.selectedTitle || 'default';
        user.selectedPlayEffect = parsed.selectedPlayEffect || 'default';
        user.winHistory = parsed.winHistory || [];
        user.avatar = parsed.style || 'fun-emoji';
      } catch (e) {
        console.error('[DB] Error parsing customizations from avatar:', e);
        user.unlockedBorders = ['default'];
        user.unlockedCardBacks = ['default'];
        user.unlockedTitles = ['default'];
        user.unlockedPlayEffects = ['default'];
        user.selectedBorder = 'default';
        user.selectedCardBack = 'default';
        user.selectedTitle = 'default';
        user.selectedPlayEffect = 'default';
        user.winHistory = [];
      }
    } else {
      user.unlockedBorders = ['default'];
      user.unlockedCardBacks = ['default'];
      user.unlockedTitles = ['default'];
      user.unlockedPlayEffects = ['default'];
      user.selectedBorder = 'default';
      user.selectedCardBack = 'default';
      user.selectedTitle = 'default';
      user.selectedPlayEffect = 'default';
      user.winHistory = [];
    }
  } else {
    if (!user.unlockedBorders) { user.unlockedBorders = ['default']; modified = true; }
    if (!user.unlockedCardBacks) { user.unlockedCardBacks = ['default']; modified = true; }
    if (!user.unlockedTitles) { user.unlockedTitles = ['default']; modified = true; }
    if (!user.unlockedPlayEffects) { user.unlockedPlayEffects = ['default']; modified = true; }
    if (!user.selectedBorder) { user.selectedBorder = 'default'; modified = true; }
    if (!user.selectedCardBack) { user.selectedCardBack = 'default'; modified = true; }
    if (!user.selectedTitle) { user.selectedTitle = 'default'; modified = true; }
    if (!user.selectedPlayEffect) { user.selectedPlayEffect = 'default'; modified = true; }
    if (!user.winHistory) { user.winHistory = []; modified = true; }
  }

  return { user, modified };
}

async function registerUser(username, password) {
  const normalizedUser = username.trim().toLowerCase();
  if (!normalizedUser || !password) return { ok: false, error: 'Kullanıcı adı ve şifre gereklidir.' };
  
  if (useSupabase) {
    try {
      const checkRes = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const checkData = await checkRes.json();
      if (checkData && checkData.length > 0) {
        return { ok: false, error: 'Bu kullanıcı adı zaten alınmış.' };
      }

      const insertRes = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          username: normalizedUser,
          password: password,
          display_name: username.trim(),
          avatar: 'avataaars',
          wins: 0,
          points: 100,
          unlockedBorders: ['default'],
          unlockedCardBacks: ['default'],
          selectedBorder: 'default',
          selectedCardBack: 'default',
          winHistory: []
        })
      });
      if (!insertRes.ok) throw new Error('Supabase kayıt hatası');
      const insertData = await insertRes.json();
      return { ok: true, user: insertData[0] };
    } catch (e) {
      console.error('[DB] Supabase kayıt hatası:', e);
      return { ok: false, error: 'Veritabanı kayıt hatası.' };
    }
  } else {
    const db = readLocalDB();
    const existing = db.users.find(u => u.username === normalizedUser);
    if (existing) {
      return { ok: false, error: 'Bu kullanıcı adı zaten alınmış.' };
    }
    const newUser = {
      username: normalizedUser,
      displayName: username.trim(),
      password: password,
      avatar: 'avataaars',
      wins: 0,
      losses: 0,
      gamesPlayed: 0,
      points: 100,
      unlockedBorders: ['default'],
      unlockedCardBacks: ['default'],
      selectedBorder: 'default',
      selectedCardBack: 'default',
      winHistory: []
    };
    db.users.push(newUser);
    writeLocalDB(db);
    return { ok: true, user: newUser };
  }
}

async function loginUser(username, password) {
  const normalizedUser = username.trim().toLowerCase();
  if (useSupabase) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}&password=eq.${encodeURIComponent(password)}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const { user: sanitizedUser } = sanitizeUserCustomizations(data[0]);
        return { ok: true, user: sanitizedUser };
      }
      return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
    } catch (e) {
      console.error('[DB] Supabase giriş hatası:', e);
      return { ok: false, error: 'Giriş hatası oluştu.' };
    }
  } else {
    const db = readLocalDB();
    const user = db.users.find(u => u.username === normalizedUser && u.password === password);
    if (user) {
      const { user: sanitizedUser, modified } = sanitizeUserCustomizations(user);
      if (modified) writeLocalDB(db);
      return { ok: true, user: sanitizedUser };
    }
    return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
  }
}

async function getUser(username) {
  const normalizedUser = username.trim().toLowerCase();
  if (useSupabase) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const { user: sanitizedUser } = sanitizeUserCustomizations(data[0]);
        return { ok: true, user: sanitizedUser };
      }
      return { ok: false, error: 'Kullanıcı bulunamadı.' };
    } catch (e) {
      console.error('[DB] Supabase getUser hatası:', e);
      return { ok: false, error: 'Kullanıcı getirme hatası.' };
    }
  } else {
    const db = readLocalDB();
    const user = db.users.find(u => u.username === normalizedUser);
    if (user) {
      const { user: sanitizedUser, modified } = sanitizeUserCustomizations(user);
      if (modified) writeLocalDB(db);
      return { ok: true, user: sanitizedUser };
    }
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }
}


async function updateUserStats(username, isWinner) {
  const normalizedUser = username.trim().toLowerCase();
  if (useSupabase) {
    try {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await getRes.json();
      if (data && data.length > 0) {
        const user = data[0];
        const newWins = isWinner ? (user.wins || 0) + 1 : (user.wins || 0);
        const newPoints = isWinner ? (user.points || 100) + 25 : Math.max(0, (user.points || 100) - 10);
        
        // Save win history in serialized avatar JSON
        const tempUser = { ...user };
        sanitizeUserCustomizations(tempUser);
        const winHistory = tempUser.winHistory || [];
        if (isWinner) winHistory.push(Date.now());
        
        const serialized = serializeCustomizationsForSupabase(user, { winHistory });

        await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            wins: newWins,
            points: newPoints,
            avatar: serialized
          })
        });
      }
    } catch (e) {
      console.error('[DB] Supabase istatistik güncelleme hatası:', e);
    }
  } else {
    const db = readLocalDB();
    const user = db.users.find(u => u.username === normalizedUser);
    if (user) {
      user.wins = (user.wins || 0) + (isWinner ? 1 : 0);
      user.losses = (user.losses || 0) + (isWinner ? 0 : 1);
      user.gamesPlayed = (user.gamesPlayed || 0) + 1;
      user.points = (user.points || 100) + (isWinner ? 25 : -10);
      if (user.points < 0) user.points = 0;
      if (!user.winHistory) user.winHistory = [];
      if (isWinner) user.winHistory.push(Date.now());
      writeLocalDB(db);
    }
  }
}

async function updateProfile(username, avatar) {
  const normalizedUser = username.trim().toLowerCase();
  if (useSupabase) {
    try {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const data = await getRes.json();
      if (data && data.length > 0) {
        const user = data[0];
        const serialized = serializeCustomizationsForSupabase(user, { avatar });
        await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ avatar: serialized })
        });
        return { ok: true };
      }
      return { ok: false, error: 'Kullanıcı bulunamadı.' };
    } catch (e) {
      console.error('[DB] Supabase avatar güncelleme hatası:', e);
      return { ok: false, error: 'Avatar güncellenemedi.' };
    }
  } else {
    const db = readLocalDB();
    const user = db.users.find(u => u.username === normalizedUser);
    if (user) {
      user.avatar = avatar;
      writeLocalDB(db);
      return { ok: true, user };
    }
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }
}

async function getLeaderboard(period = 'allTime') {
  const now = Date.now();
  const getPeriodFilter = (timestamps) => {
    if (!timestamps || !Array.isArray(timestamps)) return 0;
    if (period === 'daily') return timestamps.filter(t => now - t < 24 * 3600 * 1000).length;
    if (period === 'weekly') return timestamps.filter(t => now - t < 7 * 24 * 3600 * 1000).length;
    if (period === 'monthly') return timestamps.filter(t => now - t < 30 * 24 * 3600 * 1000).length;
    return timestamps.length;
  };

  if (useSupabase) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?select=username,display_name,avatar,wins,points&limit=100`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await res.json();
      const mapped = data.map(u => {
        const tempUser = { ...u };
        sanitizeUserCustomizations(tempUser);
        const periodWins = period === 'allTime' ? (tempUser.wins || 0) : getPeriodFilter(tempUser.winHistory);
        return {
          username: tempUser.username,
          displayName: tempUser.display_name,
          avatar: tempUser.avatar,
          wins: periodWins,
          losses: 0,
          gamesPlayed: 0,
          points: tempUser.points || 100,
          selectedBorder: tempUser.selectedBorder || 'default'
        };
      });
      return mapped
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 15)
        .map((u, index) => ({ rank: index + 1, ...u }));
    } catch (e) {
      console.error('[DB] Supabase liderlik tablosu hatası:', e);
      return [];
    }
  } else {
    const db = readLocalDB();
    const mapped = db.users.map(u => {
      const periodWins = period === 'allTime' ? (u.wins || 0) : getPeriodFilter(u.winHistory);
      return {
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        wins: periodWins,
        losses: u.losses || 0,
        gamesPlayed: u.gamesPlayed || 0,
        points: u.points || 100,
        selectedBorder: u.selectedBorder || 'default'
      };
    });
    return mapped
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 15)
      .map((u, index) => ({ rank: index + 1, ...u }));
  }
}

async function buyCustomization(username, itemType, itemId, cost) {
  const normalizedUser = username.trim().toLowerCase();
  if (useSupabase) {
    try {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const data = await getRes.json();
      if (data && data.length > 0) {
        const user = data[0];
        const points = user.points || 0;
        if (points < cost) return { ok: false, error: 'Yetersiz puan.' };

        const tempUser = { ...user };
        sanitizeUserCustomizations(tempUser);
        const unlockedBorders = tempUser.unlockedBorders || ['default'];
        const unlockedCardBacks = tempUser.unlockedCardBacks || ['default'];
        const unlockedTitles = tempUser.unlockedTitles || ['default'];
        const unlockedPlayEffects = tempUser.unlockedPlayEffects || ['default'];

        if (itemType === 'border') {
          if (unlockedBorders.includes(itemId)) return { ok: false, error: 'Bu çerçeve zaten açık.' };
          unlockedBorders.push(itemId);
        } else if (itemType === 'cardBack') {
          if (unlockedCardBacks.includes(itemId)) return { ok: false, error: 'Bu kart arkalığı zaten açık.' };
          unlockedCardBacks.push(itemId);
        } else if (itemType === 'title') {
          if (unlockedTitles.includes(itemId)) return { ok: false, error: 'Bu unvan zaten açık.' };
          unlockedTitles.push(itemId);
        } else if (itemType === 'playEffect') {
          if (unlockedPlayEffects.includes(itemId)) return { ok: false, error: 'Bu efekt zaten açık.' };
          unlockedPlayEffects.push(itemId);
        }

        const serialized = serializeCustomizationsForSupabase(user, { unlockedBorders, unlockedCardBacks, unlockedTitles, unlockedPlayEffects });

        const patchRes = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            points: points - cost,
            avatar: serialized
          })
        });
        const patchData = await patchRes.json();
        const updatedUser = patchData && patchData.length > 0 ? patchData[0] : { ...user, points: points - cost, avatar: serialized };
        const { user: sanitizedUser } = sanitizeUserCustomizations(updatedUser);
        return { ok: true, user: sanitizedUser };
      }
      return { ok: false, error: 'Kullanıcı bulunamadı.' };
    } catch (e) {
      console.error('[DB] Supabase buyCustomization hatası:', e);
      return { ok: false, error: 'Mağaza işlemi gerçekleştirilemedi.' };
    }
  } else {
    const db = readLocalDB();
    const user = db.users.find(u => u.username === normalizedUser);
    if (user) {
      const points = user.points || 0;
      if (points < cost) return { ok: false, error: 'Yetersiz puan.' };

      if (!user.unlockedBorders) user.unlockedBorders = ['default'];
      if (!user.unlockedCardBacks) user.unlockedCardBacks = ['default'];
      if (!user.unlockedTitles) user.unlockedTitles = ['default'];
      if (!user.unlockedPlayEffects) user.unlockedPlayEffects = ['default'];

      if (itemType === 'border') {
        if (user.unlockedBorders.includes(itemId)) return { ok: false, error: 'Bu çerçeve zaten açık.' };
        user.unlockedBorders.push(itemId);
      } else if (itemType === 'cardBack') {
        if (user.unlockedCardBacks.includes(itemId)) return { ok: false, error: 'Bu kart arkalığı zaten açık.' };
        user.unlockedCardBacks.push(itemId);
      } else if (itemType === 'title') {
        if (user.unlockedTitles.includes(itemId)) return { ok: false, error: 'Bu unvan zaten açık.' };
        user.unlockedTitles.push(itemId);
      } else if (itemType === 'playEffect') {
        if (user.unlockedPlayEffects.includes(itemId)) return { ok: false, error: 'Bu efekt zaten açık.' };
        user.unlockedPlayEffects.push(itemId);
      }

      user.points = points - cost;
      writeLocalDB(db);
      const { user: sanitizedUser } = sanitizeUserCustomizations(user);
      return { ok: true, user: sanitizedUser };
    }
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }
}

async function selectCustomization(username, itemType, itemId) {
  const normalizedUser = username.trim().toLowerCase();
  if (useSupabase) {
    try {
      const getRes = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
      });
      const data = await getRes.json();
      if (data && data.length > 0) {
        const user = data[0];
        const tempUser = { ...user };
        sanitizeUserCustomizations(tempUser);
        const unlockedBorders = tempUser.unlockedBorders || ['default'];
        const unlockedCardBacks = tempUser.unlockedCardBacks || ['default'];
        const unlockedTitles = tempUser.unlockedTitles || ['default'];
        const unlockedPlayEffects = tempUser.unlockedPlayEffects || ['default'];

        if (itemType === 'border' && !unlockedBorders.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };
        if (itemType === 'cardBack' && !unlockedCardBacks.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };
        if (itemType === 'title' && !unlockedTitles.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };
        if (itemType === 'playEffect' && !unlockedPlayEffects.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };

        let updateObj = {};
        if (itemType === 'border') updateObj = { selectedBorder: itemId };
        else if (itemType === 'cardBack') updateObj = { selectedCardBack: itemId };
        else if (itemType === 'title') updateObj = { selectedTitle: itemId };
        else if (itemType === 'playEffect') updateObj = { selectedPlayEffect: itemId };

        const serialized = serializeCustomizationsForSupabase(user, updateObj);

        const patchRes = await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            avatar: serialized
          })
        });
        const patchData = await patchRes.json();
        const updatedUser = patchData && patchData.length > 0 ? patchData[0] : { ...user, avatar: serialized };
        const { user: sanitizedUser } = sanitizeUserCustomizations(updatedUser);
        return { ok: true, user: sanitizedUser };
      }
      return { ok: false, error: 'Kullanıcı bulunamadı.' };
    } catch (e) {
      console.error('[DB] Supabase selectCustomization hatası:', e);
      return { ok: false, error: 'Seçim gerçekleştirilemedi.' };
    }
  } else {
    const db = readLocalDB();
    const user = db.users.find(u => u.username === normalizedUser);
    if (user) {
      const unlockedBorders = user.unlockedBorders || ['default'];
      const unlockedCardBacks = user.unlockedCardBacks || ['default'];
      const unlockedTitles = user.unlockedTitles || ['default'];
      const unlockedPlayEffects = user.unlockedPlayEffects || ['default'];

      if (itemType === 'border' && !unlockedBorders.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };
      if (itemType === 'cardBack' && !unlockedCardBacks.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };
      if (itemType === 'title' && !unlockedTitles.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };
      if (itemType === 'playEffect' && !unlockedPlayEffects.includes(itemId)) return { ok: false, error: 'Bu öge kilitli.' };

      if (itemType === 'border') user.selectedBorder = itemId;
      else if (itemType === 'cardBack') user.selectedCardBack = itemId;
      else if (itemType === 'title') user.selectedTitle = itemId;
      else if (itemType === 'playEffect') user.selectedPlayEffect = itemId;

      writeLocalDB(db);
      const { user: sanitizedUser } = sanitizeUserCustomizations(user);
      return { ok: true, user: sanitizedUser };
    }
    return { ok: false, error: 'Kullanıcı bulunamadı.' };
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUser,
  updateUserStats,
  updateProfile,
  getLeaderboard,
  buyCustomization,
  selectCustomization
};
