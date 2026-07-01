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
          points: 100
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
      points: 100
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
        return { ok: true, user: data[0] };
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
      return { ok: true, user };
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
        return { ok: true, user: data[0] };
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
      return { ok: true, user };
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

        await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            wins: newWins,
            points: newPoints
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
      writeLocalDB(db);
    }
  }
}

async function updateProfile(username, avatar) {
  const normalizedUser = username.trim().toLowerCase();
  if (useSupabase) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/users?username=eq.${encodeURIComponent(normalizedUser)}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ avatar })
      });
      return { ok: true };
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

async function getLeaderboard() {
  if (useSupabase) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?select=username,display_name,avatar,wins,points&order=wins.desc&limit=15`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      const data = await res.json();
      return data.map((u, index) => ({
        rank: index + 1,
        username: u.username,
        displayName: u.display_name,
        avatar: u.avatar,
        wins: u.wins || 0,
        losses: 0,
        gamesPlayed: 0,
        points: u.points || 100
      }));
    } catch (e) {
      console.error('[DB] Supabase liderlik tablosu hatası:', e);
      return [];
    }
  } else {
    const db = readLocalDB();
    const sorted = [...db.users]
      .sort((a, b) => (b.wins || 0) - (a.wins || 0))
      .slice(0, 15);
    return sorted.map((u, index) => ({
      rank: index + 1,
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar,
      wins: u.wins || 0,
      losses: u.losses || 0,
      gamesPlayed: u.gamesPlayed || 0,
      points: u.points || 100
    }));
  }
}

module.exports = {
  registerUser,
  loginUser,
  getUser,
  updateUserStats,
  updateProfile,
  getLeaderboard
};
