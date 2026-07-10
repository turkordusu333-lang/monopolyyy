import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateDeck, shuffleDeck, checkWinner, MAX_IN_SET } from './src/lib/deck';
import { BotEngine } from './src/lib/BotEngine';
import { UserProfile, MatchState, GamePlayer, Card, CardColor, GameLog, Friend, FriendRequest, Tournament } from './src/types';

// Load environment variables
dotenv.config();

// Create data directory if not exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('🔌 Supabase veritabanı bağlantısı kuruldu!');
  } catch (err) {
    console.error('Supabase bağlantı hatası:', err);
  }
} else {
  console.log('📁 Supabase yapılandırılmamış, yerel JSON veritabanı (data/users.json) kullanılıyor.');
}

// Helper to load/save users locally (as fallback)
function loadUsers(): Record<string, UserProfile> {
  if (fs.existsSync(USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading users file', e);
      return {};
    }
  }
  return {};
}

function saveUsers(users: Record<string, UserProfile>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving users file', e);
  }
}

const ADMIN_SETTINGS_FILE = path.join(DATA_DIR, 'admin_settings.json');

// Default Admin Settings values
interface AdminSettings {
  turnDuration: number;
  botDelay: number;
  extraTimeEnabled: boolean;
  unlimitedDoubleRent: boolean;
  winCoins: number;
  xpLevelRate: number;
  winSetsTarget: number;
  autoEndTurn: boolean;
  gameMode: string;
}

let cachedAdminSettings: AdminSettings = {
  turnDuration: 30,
  botDelay: 1800,
  extraTimeEnabled: true,
  unlimitedDoubleRent: false,
  winCoins: 200,
  xpLevelRate: 500,
  winSetsTarget: 3,
  autoEndTurn: false,
  gameMode: 'classic',
};

async function loadAdminSettings(): Promise<AdminSettings> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        cachedAdminSettings = {
          turnDuration: data.turn_duration,
          botDelay: data.bot_delay,
          extraTimeEnabled: data.extra_time_enabled,
          unlimitedDoubleRent: data.unlimited_double_rent,
          winCoins: data.win_coins,
          xpLevelRate: data.xp_level_rate,
          winSetsTarget: data.win_sets_target !== undefined ? data.win_sets_target : 3,
          autoEndTurn: data.auto_end_turn !== undefined ? data.auto_end_turn : false,
          gameMode: data.game_mode || 'classic',
        };
        return cachedAdminSettings;
      }
      
      // If table exists but row is missing, insert defaults
      await supabase.from('admin_settings').insert({
        id: 1,
        turn_duration: cachedAdminSettings.turnDuration,
        bot_delay: cachedAdminSettings.botDelay,
        extra_time_enabled: cachedAdminSettings.extraTimeEnabled,
        unlimited_double_rent: cachedAdminSettings.unlimitedDoubleRent,
        win_coins: cachedAdminSettings.winCoins,
        xp_level_rate: cachedAdminSettings.xpLevelRate,
        win_sets_target: cachedAdminSettings.winSetsTarget,
        auto_end_turn: cachedAdminSettings.autoEndTurn,
        game_mode: cachedAdminSettings.gameMode,
      });
    } catch (e) {
      console.error('Supabase loadAdminSettings error, using local fallback:', e);
    }
  }

  // Local file fallback
  if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8'));
      cachedAdminSettings = {
        ...cachedAdminSettings,
        ...parsed
      };
    } catch (e) {
      console.error('Error reading admin settings file, using memory cache:', e);
    }
  } else {
    try {
      fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(cachedAdminSettings, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving default admin settings:', e);
    }
  }
  return cachedAdminSettings;
}

async function saveAdminSettings(settings: AdminSettings): Promise<void> {
  cachedAdminSettings = { ...settings };
  if (supabase) {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 1,
          turn_duration: settings.turnDuration,
          bot_delay: settings.botDelay,
          extra_time_enabled: settings.extraTimeEnabled,
          unlimited_double_rent: settings.unlimitedDoubleRent,
          win_coins: settings.winCoins,
          xp_level_rate: settings.xpLevelRate,
          win_sets_target: settings.winSetsTarget,
          auto_end_turn: settings.autoEndTurn,
          game_mode: settings.gameMode,
        });
      if (error) throw error;
      return;
    } catch (e) {
      console.error('Supabase saveAdminSettings error, using local fallback:', e);
    }
  }

  // Local file fallback
  try {
    fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving admin settings file:', e);
  }
}

function getWinSetsTarget(match: any): number {
  if (match?.settings?.gameMode === 'speed') return 2;
  return match?.settings?.winSetsTarget || 3;
}

// UserProfile factories and store queries (with Supabase dynamic support)
function createNewUserProfile(username: string): UserProfile {
  const newId = `user-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id: newId,
    username: username.trim(),
    coins: 500, // starting coins
    level: 1,
    xp: 0,
    avatarId: 'avatar_classic',
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      winRate: 0,
      totalRentCollected: 0,
      totalCardsStolen: 0,
      totalSetsCompleted: 0,
      totalMoneyBanked: 0,
    },
    settings: {
      soundVolume: 70,
      soundPitch: 1.0,
      synthType: 'sine',
      cardBack: 'back_classic',
      boardTheme: 'theme_slate',
      avatarId: 'avatar_classic',
      clothesId: 'clothes_none',
      profileFrame: 'frame_none',
    },
    unlockedItems: ['avatar_classic', 'back_classic', 'theme_slate', 'frame_none'],
    friends: [
      { id: 'bot-memo', username: 'Bot Memo', status: 'online', avatarId: 'avatar_skater' },
      { id: 'bot-can', username: 'Bot Can', status: 'offline', avatarId: 'avatar_classic' },
    ],
    achievements: [
      { id: 'ach-1', title: 'İlk Adım', description: 'Bir maç oyna.', targetValue: 1, currentValue: 0, completed: false, rewardCoins: 100 },
      { id: 'ach-2', title: 'Milyoner', description: 'Bankaya toplam 20M para ekle.', targetValue: 20, currentValue: 0, completed: false, rewardCoins: 150 },
      { id: 'ach-3', title: 'Sinsi Hırsız', description: 'Rakiplerinden 5 kez arsa çal.', targetValue: 5, currentValue: 0, completed: false, rewardCoins: 200 },
    ],
    dailyQuests: [
      { id: 'q-1', description: 'Pratik Modunda botu yen.', targetValue: 1, currentValue: 0, completed: false, claimed: false, rewardCoins: 50 },
      { id: 'q-2', description: 'Bankaya 5M para yerleştir.', targetValue: 5, currentValue: 0, completed: false, claimed: false, rewardCoins: 40 },
      { id: 'q-3', description: 'Toplam 3 kira kartı oyna.', targetValue: 3, currentValue: 0, completed: false, claimed: false, rewardCoins: 60 },
    ],
  };
}

async function getUserProfile(username: string): Promise<UserProfile> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          username: data.username,
          coins: data.coins,
          level: data.level,
          xp: data.xp,
          avatarId: data.avatar_id,
          stats: data.stats,
          settings: data.settings,
          unlockedItems: data.unlocked_items,
          friends: data.friends || [],
          achievements: data.achievements || [],
          dailyQuests: data.daily_quests || [],
        };
      }

      const newUser = createNewUserProfile(username);
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: newUser.id,
          username: newUser.username,
          coins: newUser.coins,
          level: newUser.level,
          xp: newUser.xp,
          avatar_id: newUser.avatarId,
          stats: newUser.stats,
          settings: newUser.settings,
          unlocked_items: newUser.unlockedItems,
          friends: newUser.friends,
          achievements: newUser.achievements,
          daily_quests: newUser.dailyQuests,
        });

      if (insertError) throw insertError;
      return newUser;
    } catch (e) {
      console.error('Supabase getUserProfile error, falling back to memory/file:', e);
    }
  }

  const users = loadUsers();
  let user = Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    user = createNewUserProfile(username);
    users[user.id] = user;
    saveUsers(users);
  }
  return user;
}

async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        return {
          id: data.id,
          username: data.username,
          coins: data.coins,
          level: data.level,
          xp: data.xp,
          avatarId: data.avatar_id,
          stats: data.stats,
          settings: data.settings,
          unlockedItems: data.unlocked_items,
          friends: data.friends || [],
          achievements: data.achievements || [],
          dailyQuests: data.daily_quests || [],
        };
      }
      return null;
    } catch (e) {
      console.error('Supabase getUserProfileById error, falling back to memory/file:', e);
    }
  }

  const users = loadUsers();
  return users[userId] || null;
}

async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: profile.id,
          username: profile.username,
          coins: profile.coins,
          level: profile.level,
          xp: profile.xp,
          avatar_id: profile.avatarId,
          stats: profile.stats,
          settings: profile.settings,
          unlocked_items: profile.unlockedItems,
          friends: profile.friends,
          achievements: profile.achievements,
          daily_quests: profile.dailyQuests,
        });

      if (error) throw error;
      return;
    } catch (e) {
      console.error('Supabase saveUserProfile error, falling back to memory/file:', e);
    }
  }

  const users = loadUsers();
  users[profile.id] = profile;
  saveUsers(users);
}

// Initial/default shop products
const DEFAULT_SHOP_ITEMS = [
  { id: 'avatar_classic', name: 'Klasik Monopoly', category: 'avatar', price: 0, description: 'Klasik şapkalı zengin lord avatarı.', isUnlocked: true },
  { id: 'avatar_skater', name: 'Kaykaycı Çocuk', category: 'avatar', price: 100, description: 'Cool şapkalı kaykaycı tasarımı.', isUnlocked: false },
  { id: 'avatar_neon', name: 'Cyberpunk Neon', category: 'avatar', price: 250, description: 'Neon parıltılı fütüristik tasarım.', isUnlocked: false },
  { id: 'avatar_golden', name: 'Altın Kral', category: 'avatar', price: 500, description: 'Zenginlik ve ihtişam simgesi.', isUnlocked: false },
  
  { id: 'back_classic', name: 'Klasik Kırmızı', category: 'card_back', price: 0, description: 'Geleneksel kırmızı desenli kart arkalığı.', isUnlocked: true },
  { id: 'back_cosmic', name: 'Kozmik Siyah', category: 'card_back', price: 150, description: 'Samanyolu yıldızlı derin uzay tasarımı.', isUnlocked: false },
  { id: 'back_gold', name: 'V.I.P Altın', category: 'card_back', price: 300, description: 'Altın işlemeli ultra lüks kart arkalığı.', isUnlocked: false },
  { id: 'back_neon', name: 'Retro Dalga', category: 'card_back', price: 200, description: '80\'ler neon ve mor ızgara çizgileri.', isUnlocked: false },

  { id: 'theme_slate', name: 'Kozmik Slate', category: 'board_theme', price: 0, description: 'Göz yormayan koyu gri minimalist masa.', isUnlocked: true },
  { id: 'theme_green', name: 'Nane Yeşili', category: 'board_theme', price: 100, description: 'Geleneksel Monopoly yeşil masası.', isUnlocked: false },
  { id: 'theme_purple', name: 'Kraliyet Moru', category: 'board_theme', price: 250, description: 'Altın detaylı zengin mor masa teması.', isUnlocked: false },
  { id: 'theme_cyberpunk', name: 'Siber Izgara', category: 'board_theme', price: 400, description: 'Yüksek kontrastlı siberpunk masa gridi.', isUnlocked: false },

  { id: 'frame_none', name: 'Klasik Sınır', category: 'profile_frame', price: 0, description: 'Sıradan, ince beyaz çerçeve.', isUnlocked: true },
  { id: 'frame_neon', name: 'Neon Aura', category: 'profile_frame', price: 150, description: 'Siberpunk parlayan pembe neon çerçeve.', isUnlocked: false },
  { id: 'frame_gold', name: 'V.I.P Altın Çerçeve', category: 'profile_frame', price: 300, description: 'Elit oyuncular için saf altın varaklı çerçeve.', isUnlocked: false },
  { id: 'frame_fire', name: 'Volkanik Ateş', category: 'profile_frame', price: 200, description: 'Kızıl lav efektli ateşli profil çerçevesi.', isUnlocked: false },
  { id: 'frame_royal', name: 'Kraliyet Elması', category: 'profile_frame', price: 450, description: 'Lüks mavi elmas süslemeli şampiyon çerçevesi.', isUnlocked: false },
];

// In-Memory active rooms and tournaments state
const activeMatches: Record<string, MatchState> = {};
let activeTournaments: Tournament[] = [
  {
    id: 't-1',
    name: 'Yaz Kupası 2026',
    participants: ['Bot Memo', 'Bot Can', 'Bot Defne'],
    rounds: [
      {
        roundNumber: 1,
        matches: [
          { id: 'tm-1', player1: 'Bot Memo', player2: 'Bot Can', score1: 3, score2: 1, status: 'completed', winner: 'Bot Memo' },
          { id: 'tm-2', player1: 'Bot Defne', player2: 'Sen', status: 'pending' },
        ],
      },
    ],
    status: 'active',
  },
];

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Load admin settings at startup
  await loadAdminSettings();

  // --- API ROUTES ---

  // Auth / Get Profile
  app.post('/api/auth', async (req, res) => {
    const { username } = req.body;
    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'Kullanıcı adı geçerli olmalıdır.' });
    }

    try {
      const user = await getUserProfile(username);
      res.json(user);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Veritabanı hatası.' });
    }
  });

  // Shop purchase
  app.post('/api/shop/buy', async (req, res) => {
    const { userId, itemId } = req.body;
    try {
      const user = await getUserProfileById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      }

      const item = DEFAULT_SHOP_ITEMS.find((i) => i.id === itemId);
      if (!item) {
        return res.status(404).json({ error: 'Ürün bulunamadı.' });
      }

      if (user.unlockedItems.includes(itemId)) {
        return res.status(400).json({ error: 'Bu ürün zaten satın alınmış.' });
      }

      if (user.coins < item.price) {
        return res.status(400).json({ error: 'Yetersiz altın.' });
      }

      user.coins -= item.price;
      user.unlockedItems.push(itemId);
      await saveUserProfile(user);

      res.json({ success: true, coins: user.coins, unlockedItems: user.unlockedItems });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Veritabanı hatası.' });
    }
  });

  // Save customization settings
  app.post('/api/settings/save', async (req, res) => {
    const { userId, settings } = req.body;
    try {
      const user = await getUserProfileById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
      }

      user.settings = { ...user.settings, ...settings };
      
      // Equip avatar if changed
      if (settings.avatarId) {
        user.avatarId = settings.avatarId;
      }

      await saveUserProfile(user);
      res.json({ success: true, settings: user.settings, avatarId: user.avatarId });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Veritabanı hatası.' });
    }
  });

  // Claim Daily Quest
  app.post('/api/quests/claim', async (req, res) => {
    const { userId, questId } = req.body;
    try {
      const user = await getUserProfileById(userId);
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

      const quest = user.dailyQuests.find((q) => q.id === questId);
      if (!quest) return res.status(404).json({ error: 'Görev bulunamadı.' });
      if (!quest.completed || quest.claimed) {
        return res.status(400).json({ error: 'Görev ödülü zaten alınmış veya tamamlanmamış.' });
      }

      quest.claimed = true;
      user.coins += quest.rewardCoins;
      await saveUserProfile(user);

      res.json({ success: true, coins: user.coins, dailyQuests: user.dailyQuests });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Veritabanı hatası.' });
    }
  });

  // Update achievements
  app.post('/api/achievements/update', async (req, res) => {
    const { userId, achievementId, amount } = req.body;
    try {
      const user = await getUserProfileById(userId);
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

      const ach = user.achievements.find((a) => a.id === achievementId);
      if (!ach) return res.status(404).json({ error: 'Başarım bulunamadı.' });
      if (ach.completed) return res.json({ success: true, achievements: user.achievements, coins: user.coins });

      ach.currentValue = Math.min(ach.targetValue, ach.currentValue + (amount || 1));
      if (ach.currentValue >= ach.targetValue) {
        ach.completed = true;
        user.coins += ach.rewardCoins;
      }
      await saveUserProfile(user);

      res.json({ success: true, coins: user.coins, achievements: user.achievements });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Veritabanı hatası.' });
    }
  });

  // Friend Request system
  app.post('/api/friends/add', async (req, res) => {
    const { userId, targetUsername } = req.body;
    try {
      const user = await getUserProfileById(userId);
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

      const usersLocal = loadUsers();
      let targetUser = Object.values(usersLocal).find(
        (u) => u.username.toLowerCase() === targetUsername.trim().toLowerCase()
      );
      if (!targetUser && supabase) {
        const { data } = await supabase.from('users').select('*').eq('username', targetUsername.trim()).maybeSingle();
        if (data) {
          targetUser = {
            id: data.id,
            username: data.username,
            coins: data.coins,
            level: data.level,
            xp: data.xp,
            avatarId: data.avatar_id,
            stats: data.stats,
            settings: data.settings,
            unlockedItems: data.unlocked_items,
            friends: data.friends || [],
            achievements: data.achievements || [],
            dailyQuests: data.daily_quests || [],
          };
        }
      }

      if (!targetUser) return res.status(444).json({ error: 'Böyle bir kullanıcı bulunamadı.' });
      if (user.id === targetUser.id) return res.status(400).json({ error: 'Kendinize arkadaşlık isteği gönderemezsiniz.' });

      // Check if already friends
      if (user.friends.some((f) => f.id === targetUser.id)) {
        return res.status(400).json({ error: 'Bu kullanıcıyla zaten arkadaşsınız.' });
      }

      // Connect immediately for beautiful gameplay demo flow
      user.friends.push({
        id: targetUser.id,
        username: targetUser.username,
        status: 'online',
        avatarId: targetUser.avatarId,
      });

      targetUser.friends.push({
        id: user.id,
        username: user.username,
        status: 'online',
        avatarId: user.avatarId,
      });

      await saveUserProfile(user);
      await saveUserProfile(targetUser);

      res.json({ success: true, friends: user.friends });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Veritabanı hatası.' });
    }
  });

  // Fetch active rooms lists
  app.get('/api/rooms', (req, res) => {
    const list = Object.values(activeMatches).map((m) => ({
      roomId: m.roomId,
      playerCount: m.players.length,
      status: m.status,
      players: m.players.map((p) => p.username),
    }));
    res.json(list);
  });

  // --- ADMIN PANEL API ENDPOINTS ---

  // Get Admin Settings
  app.get('/api/admin/settings', async (req, res) => {
    try {
      const settings = await loadAdminSettings();
      res.json(settings);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ayarlar yüklenemedi.' });
    }
  });

  // Save Admin Settings
  app.post('/api/admin/settings', async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings) return res.status(400).json({ error: 'Geçersiz ayar verisi.' });
      await saveAdminSettings(settings);
      res.json({ success: true, settings: cachedAdminSettings });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ayarlar kaydedilemedi.' });
    }
  });

  // Get All Registered Users (Admin only / convenient list)
  app.get('/api/admin/users', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const list = data.map((d: any) => ({
          id: d.id,
          username: d.username,
          coins: d.coins,
          level: d.level,
          xp: d.xp,
          avatarId: d.avatar_id,
          stats: d.stats,
          settings: d.settings,
        }));
        return res.json(list);
      }
      
      const localUsers = loadUsers();
      res.json(Object.values(localUsers));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Kullanıcılar yüklenemedi.' });
    }
  });

  // Update Specific User (Modify coins/xp/level)
  app.post('/api/admin/users/update', async (req, res) => {
    try {
      const { userId, coins, level, xp } = req.body;
      const user = await getUserProfileById(userId);
      if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

      if (coins !== undefined) user.coins = Number(coins);
      if (level !== undefined) user.level = Number(level);
      if (xp !== undefined) user.xp = Number(xp);

      await saveUserProfile(user);
      res.json({ success: true, user });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Kullanıcı güncellenemedi.' });
    }
  });

  // Reset or Delete User
  app.post('/api/admin/users/delete', async (req, res) => {
    try {
      const { userId } = req.body;
      if (supabase) {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;
        return res.json({ success: true });
      }

      const localUsers = loadUsers();
      if (localUsers[userId]) {
        delete localUsers[userId];
        saveUsers(localUsers);
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Kullanıcı silinemedi.' });
    }
  });

  // --- WEBSOCKET SERVICES ---
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  const clients: Record<string, { ws: WebSocket; userId: string; roomId?: string }> = {};

  wss.on('connection', (ws) => {
    let clientId = `client-${Math.random().toString(36).substr(2, 5)}`;

    ws.on('message', async (messageStr: string) => {
      try {
        const payload = JSON.parse(messageStr);
        const { type, userId, roomId } = payload;

        switch (type) {
          case 'register':
            clients[clientId] = { ws, userId };
            // Update friend status
            updateFriendStatus(userId, 'online');
            break;

          case 'join_room': {
            const user = await getUserProfileById(userId);
            if (!user) break;

            clients[clientId].roomId = roomId;

            let match = activeMatches[roomId];
            if (!match) {
              match = {
                roomId,
                status: 'lobby',
                players: [],
                deckCount: 106,
                discardPile: [],
                turnIndex: 0,
                actionsPlayedThisTurn: 0,
                logs: [{ id: 'l-init', message: `${user.username} odayı kurdu.`, timestamp: Date.now() }],
                isOffline: false,
                settings: {
                  gameMode: cachedAdminSettings.gameMode || 'classic',
                  turnDuration: cachedAdminSettings.turnDuration || 30,
                  winSetsTarget: cachedAdminSettings.winSetsTarget || 3,
                  autoEndTurn: cachedAdminSettings.autoEndTurn || false,
                }
              };
              activeMatches[roomId] = match;
            }

            // Join if not already in
            const existingPlayer = match.players.find((p) => p.id === userId);
            if (!existingPlayer) {
              match.players.push({
                id: userId,
                username: user.username,
                avatarId: user.avatarId,
                profileFrame: user.settings.profileFrame || 'frame_none',
                isBot: false,
                hand: [],
                bank: [],
                properties: {},
              });
              match.logs.push({
                id: `join-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                message: `${user.username} odaya katıldı.`,
                timestamp: Date.now(),
              });
            } else {
              // Reconnecting! Clear isDisconnected flag
              existingPlayer.isDisconnected = false;
              match.logs.push({
                id: `reconnect-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                message: `${user.username} oyuna geri döndü. Kontrolü devraldı!`,
                timestamp: Date.now(),
              });
            }

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }

          case 'start_game': {
            const match = activeMatches[roomId];
            if (!match) break;

            // Enforce host only
            if (match.players[0]?.id !== userId) {
              ws.send(JSON.stringify({ type: 'alert', message: 'Sadece oda kurucusu oyunu başlatabilir!' }));
              break;
            }

            // Generate full deck
            let fullDeck = shuffleDeck(generateDeck());

            // Deal 5 cards to each player
            match.players.forEach((player) => {
              player.hand = fullDeck.splice(0, 5);
            });

            match.discardPile = [];
            // Save remaining deck count
            match.deckCount = fullDeck.length;
            match.status = 'playing';
            match.turnIndex = 0;
            match.actionsPlayedThisTurn = 0;
            match.logs.push({
              id: `start-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              message: `Oyun başladı! Sıra ${match.players[0].username} adlı oyuncuda.`,
              timestamp: Date.now(),
            });

            // Put deck to a safe temporary server state
            (match as any).serverDeck = fullDeck;

            // Automatically trigger first draw
            triggerDrawForActivePlayer(match);

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }

          case 'update_lobby_settings': {
            const match = activeMatches[roomId];
            if (!match || match.status !== 'lobby') break;

            // Enforce host only
            if (match.players[0]?.id !== userId) break;

            const { settings } = payload;
            if (settings) {
              match.settings = {
                ...match.settings,
                ...settings
              };

              match.logs.push({
                id: `lobby-settings-${Date.now()}`,
                message: `🔧 Oda kurucusu oyun ayarlarını güncelledi.`,
                timestamp: Date.now(),
              });

              broadcastToRoom(roomId, {
                type: 'room_update',
                matchState: match,
              });
            }
            break;
          }

          case 'kick_player': {
            const match = activeMatches[roomId];
            if (!match || match.status !== 'lobby') break;

            // Enforce host only
            if (match.players[0]?.id !== userId) break;

            const { targetUserId } = payload;
            const kickedPlayer = match.players.find((p) => p.id === targetUserId);
            if (kickedPlayer) {
              // Remove player
              match.players = match.players.filter((p) => p.id !== targetUserId);
              match.logs.push({
                id: `kick-${Date.now()}`,
                message: `${kickedPlayer.username} lobiden atıldı.`,
                timestamp: Date.now(),
              });

              // Send kick notification to the target player if online
              if (!kickedPlayer.isBot) {
                const targetClient = Object.values(clients).find((c) => c.userId === targetUserId && c.roomId === roomId);
                if (targetClient) {
                  targetClient.ws.send(JSON.stringify({ type: 'kicked', message: 'Oda kurucusu tarafından lobiden atıldınız!' }));
                }
              }

              broadcastToRoom(roomId, {
                type: 'room_update',
                matchState: match,
              });
            }
            break;
          }

          case 'add_bot': {
            const match = activeMatches[roomId];
            if (!match || match.status !== 'lobby') break;

            // Enforce host only
            if (match.players[0]?.id !== userId) {
              ws.send(JSON.stringify({ type: 'alert', message: 'Sadece oda kurucusu bot ekleyebilir!' }));
              break;
            }

            const botNames = ['Bot Memo', 'Bot Can', 'Bot Defne', 'Milyoner Bot'];
            const usedNames = match.players.map((p) => p.username);
            const availableNames = botNames.filter((n) => !usedNames.includes(n));
            const botName = availableNames[0] || `Bot ${match.players.length + 1}`;

            const personalities: ('aggressive' | 'banker' | 'strategic')[] = ['aggressive', 'banker', 'strategic'];
            const randomPersonality = personalities[Math.floor(Math.random() * personalities.length)];
            const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
            const randomDifficulty = difficulties[Math.floor(Math.random() * difficulties.length)];

            let personalityLabel = 'Stratejik';
            if (randomPersonality === 'aggressive') personalityLabel = 'Agresif 🥷';
            if (randomPersonality === 'banker') personalityLabel = 'Tutumlu 🏦';

            match.players.push({
              id: `bot-${Math.random().toString(36).substr(2, 5)}`,
              username: `${botName} (${personalityLabel} - ${randomDifficulty === 'easy' ? 'Kolay' : randomDifficulty === 'medium' ? 'Orta' : 'Zor'})`,
              avatarId: 'avatar_skater',
              profileFrame: 'frame_none',
              isBot: true,
              botPersonality: randomPersonality,
              difficulty: randomDifficulty,
              hand: [],
              bank: [],
              properties: {},
            });

            match.logs.push({
              id: `bot-add-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              message: `${botName} odaya eklendi.`,
              timestamp: Date.now(),
            });

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }

          case 'play_card': {
            const match = activeMatches[roomId];
            if (!match || match.status !== 'playing') break;

            const { cardId, targetZone, extraColor } = payload;
            const player = match.players[match.turnIndex];

            if (player.id !== userId) break; // Not their turn
            if (match.actionsPlayedThisTurn >= 3) break; // Max 3 actions
            if (match.activeActionRequest) {
              ws.send(JSON.stringify({ type: 'alert', message: 'Şu an aktif bir ödeme veya hamle talebi var, bu talep çözülene kadar yeni kart oynayamazsınız!' }));
              break;
            }

            const cardIdx = player.hand.findIndex((c) => c.id === cardId);
            if (cardIdx === -1) break;

            const card = player.hand[cardIdx];

            // Perform playing action logic
            if (targetZone === 'bank') {
              if (card.type === 'property' || card.type === 'wildcard') {
                break; // Arazi Kartları ve Joker Arazi kartları Bankaya Konulmaz.
              }
              // Add to bank
              player.hand.splice(cardIdx, 1);
              player.bank.push(card);
              match.logs.push({
                id: `play-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                message: `${player.username}, bankaya ${card.value}M para (${card.name}) ekledi.`,
                timestamp: Date.now(),
              });
              match.actionsPlayedThisTurn++;
            } else if (targetZone === 'property') {
              // Add to collection
              player.hand.splice(cardIdx, 1);
              
              let colorToUse: CardColor = card.color || extraColor || 'brown';

              if (!player.properties[colorToUse]) {
                player.properties[colorToUse] = { cards: [], hasHouse: false, hasHotel: false };
              }

              if (card.type === 'house-hotel') {
                if (card.actionType === 'house') {
                  player.properties[colorToUse]!.hasHouse = true;
                } else {
                  player.properties[colorToUse]!.hasHotel = true;
                }
              } else {
                // Property or wildcard
                const updatedCard = { ...card };
                if (updatedCard.isWildcard && updatedCard.secondaryColor && colorToUse === updatedCard.secondaryColor) {
                  const temp = updatedCard.color;
                  updatedCard.color = colorToUse;
                  updatedCard.secondaryColor = temp;
                } else {
                  updatedCard.color = colorToUse;
                }
                player.properties[colorToUse]!.cards.push(updatedCard);
              }

              match.logs.push({
                id: `play-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                message: `${player.username}, ${COLOR_LABELS[colorToUse]} grubuna ${card.name} kartını yerleştirdi.`,
                timestamp: Date.now(),
              });
              match.actionsPlayedThisTurn++;

              // Check if they won!
              if (checkWinner(player.properties, getWinSetsTarget(match))) {
                handleMatchWinner(match, player.id);
              }
            } else if (targetZone === 'action') {
              // Play as action card
              player.hand.splice(cardIdx, 1);
              match.discardPile.push(card);

              // Process different action card mechanics
              processActionCard(match, player, card, payload);
              match.actionsPlayedThisTurn++;
            }

            // Check auto end turn setting
            const actionLimit = (match.settings?.gameMode === 'chaos') ? 99 : 3;
            if (match.settings?.autoEndTurn && match.actionsPlayedThisTurn >= actionLimit && match.status === 'playing' && !match.activeActionRequest) {
              // End turn automatically
              match.turnIndex = (match.turnIndex + 1) % match.players.length;
              match.actionsPlayedThisTurn = 0;
              const nextPlayer = match.players[match.turnIndex];
              match.logs.push({
                id: `auto-turn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                message: `🤖 Otomatik Hamle Sınırı: ${player.username} hamle limitine ulaştı. Sıra ${nextPlayer.username} oyuncusunda.`,
                timestamp: Date.now(),
              });
              triggerDrawForActivePlayer(match);
              if (nextPlayer.isBot || nextPlayer.isDisconnected) {
                setTimeout(() => handleBotTurn(match), 1000);
              }
            }

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }

          case 'change_wildcard_color': {
            const match = activeMatches[roomId];
            if (!match || match.status !== 'playing') break;

            const { cardId, newColor } = payload;
            const player = match.players.find((p) => p.id === userId);

            if (!player) break;

            // Find the wildcard in the player's property sets
            let foundCard: Card | null = null;

            for (const colKey in player.properties) {
              const col = colKey as CardColor;
              const propSet = player.properties[col];
              if (propSet) {
                const idx = propSet.cards.findIndex((c) => c.id === cardId);
                if (idx !== -1) {
                  foundCard = propSet.cards.splice(idx, 1)[0];
                  
                  // Clean up set if empty
                  if (propSet.cards.length === 0) {
                    delete player.properties[col];
                  }
                  break;
                }
              }
            }

            if (foundCard) {
              // Update card color
              if (foundCard.isWildcard && foundCard.secondaryColor && newColor === foundCard.secondaryColor) {
                const temp = foundCard.color;
                foundCard.color = newColor;
                foundCard.secondaryColor = temp;
              } else {
                foundCard.color = newColor;
              }

              // Insert into the new property set
              if (!player.properties[newColor]) {
                player.properties[newColor] = { cards: [], hasHouse: false, hasHotel: false };
              }
              player.properties[newColor]!.cards.push(foundCard);

              match.logs.push({
                id: `change-col-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                message: `${player.username}, ${foundCard.name} kartının rengini ${COLOR_LABELS[newColor]} olarak değiştirdi.`,
                timestamp: Date.now(),
              });

              // Check if player won after reorganization
              if (checkWinner(player.properties, getWinSetsTarget(match))) {
                match.status = 'finished';
                match.winnerId = player.id;
                match.logs.push({
                  id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  message: `Tebrikler! Maçı ${player.username} kazandı!`,
                  timestamp: Date.now(),
                });
              }
            }

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }

          case 'action_response': {
            // Processing interaction payload like "Just Say No" response or payment choice
            const match = activeMatches[roomId];
            if (!match) break;

            const { actionRequestId, decision, paymentCardIds } = payload;
            const req = match.activeActionRequest;
            if (!req || req.id !== actionRequestId) break;

            const targetPlayer = match.players.find((p) => p.id === req.targetPlayerId);
            const sourcePlayer = match.players.find((p) => p.id === req.sourcePlayerId);
            if (!targetPlayer || !sourcePlayer) break;

            if (decision === 'just-say-no') {
              // Target player played Just Say No!
              const jsnIdx = targetPlayer.hand.findIndex((c) => c.actionType === 'just-say-no');
              if (jsnIdx !== -1) {
                const jsnCard = targetPlayer.hand.splice(jsnIdx, 1)[0];
                match.discardPile.push(jsnCard);

                match.logs.push({
                  id: `jsn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  message: `${targetPlayer.username}, 'Hayır Teşekkürler' diyerek ${sourcePlayer.username}'in hamlesini engelledi!`,
                  timestamp: Date.now(),
                });

                // Swap target and source so the other player has a chance to play a counter JSN (Reddete Redet)!
                const prevSourceId = req.sourcePlayerId;
                req.sourcePlayerId = req.targetPlayerId;
                req.targetPlayerId = prevSourceId;
                req.jsnCount = (req.jsnCount || 0) + 1;

                // Auto-resolve if the new target is a bot or disconnected
                let newTarget = match.players.find((p) => p.id === req.targetPlayerId);
                if (newTarget && (newTarget.isBot || newTarget.isDisconnected)) {
                  const botHasJsn = newTarget.hand.some((c) => c.actionType === 'just-say-no');
                  if (botHasJsn && BotEngine.shouldPlayJustSayNo(newTarget)) {
                    const botJsnIdx = newTarget.hand.findIndex((c) => c.actionType === 'just-say-no');
                    const botJsnCard = newTarget.hand.splice(botJsnIdx, 1)[0];
                    match.discardPile.push(botJsnCard);
                    match.logs.push({
                      id: `jsn-bot-${Date.now()}`,
                      message: `🛡️ ${newTarget.username} 'Hayır Teşekkürler' diyerek senin savunmanı engelledi!`,
                      timestamp: Date.now(),
                    });
                    // Swap back to Human
                    const prevSource2 = req.sourcePlayerId;
                    req.sourcePlayerId = req.targetPlayerId;
                    req.targetPlayerId = prevSource2;
                    req.jsnCount = (req.jsnCount || 0) + 1;
                  } else {
                    // Bot has no JSN! Check if defense succeeds or fails
                    const finalJsnCount = req.jsnCount || 0;
                    if (finalJsnCount % 2 === 0) {
                      // Even count: original action succeeds!
                      if (req.originalAction) {
                        executeOriginalActionServer(match, req);
                      }
                    } else {
                      // Odd count: defense succeeds, action is blocked!
                      match.logs.push({
                        id: `jsn-win-bot-${Date.now()}`,
                        message: `🛡️ Savunma başarılı oldu! Hamle engellendi.`,
                        timestamp: Date.now(),
                      });
                    }
                    match.activeActionRequest = undefined;
                  }
                }
              }
            } else if (decision === 'decline') {
              const jsnCount = req.jsnCount || 0;
              if (jsnCount % 2 === 1) {
                // Odd number of JSNs: defense wins! Clear request and do nothing.
                match.logs.push({
                  id: `jsn-win-${Date.now()}`,
                  message: `🛡️ Savunma başarılı oldu! Hamle engellendi.`,
                  timestamp: Date.now(),
                });
                match.activeActionRequest = undefined;
              } else {
                // Even number of JSNs: original action succeeds!
                if (req.originalAction) {
                  executeOriginalActionServer(match, req);
                }
                match.activeActionRequest = undefined;
              }
            } else if (decision === 'pay') {
              // If it is a property-steal action (originalAction), execute it. Otherwise, handle standard payment.
              if (req.originalAction) {
                executeOriginalActionServer(match, req);
                match.activeActionRequest = undefined;
              } else {
                // Process payment selection
                const amountDue = req.amountDue;
                
                let totalBankValue = 0;
                targetPlayer.bank.forEach((c) => totalBankValue += c.value);

                let totalPropertiesValue = 0;
                let totalPropertiesCount = 0;
                Object.values(targetPlayer.properties).forEach((set) => {
                  if (set && set.cards) {
                    set.cards.forEach((c) => {
                      totalPropertiesValue += c.value;
                      totalPropertiesCount++;
                    });
                  }
                });

                const totalAssetsValue = totalBankValue + totalPropertiesValue;
                const totalCardsCount = targetPlayer.bank.length + totalPropertiesCount;

                let totalSelectedValue = 0;
                paymentCardIds.forEach((cid: string) => {
                  const bc = targetPlayer.bank.find((c) => c.id === cid);
                  if (bc) totalSelectedValue += bc.value;
                  else {
                    for (const colKey in targetPlayer.properties) {
                      const set = targetPlayer.properties[colKey as CardColor];
                      const pc = set?.cards.find((c) => c.id === cid);
                      if (pc) totalSelectedValue += pc.value;
                    }
                  }
                });

                if (totalAssetsValue > 0) {
                  // If they have enough total assets but didn't select enough, or paid with properties when they had enough bank, or didn't select all bank when bank was insufficient:
                  // We enforce/auto-correct on the server so the game state remains valid
                  if (totalBankValue >= amountDue) {
                    const hasSelectedProperty = paymentCardIds.some((cid: string) => 
                      Object.values(targetPlayer.properties).some((set) => set?.cards.some((c) => c.id === cid))
                    );
                    if (hasSelectedProperty || totalSelectedValue < amountDue) {
                      // Auto-select correct payment cards using BotEngine.selectPayment helper
                      paymentCardIds.splice(0, paymentCardIds.length, ...BotEngine.selectPayment(targetPlayer, amountDue));
                    }
                  } else {
                    // totalBankValue < amountDue
                    const selectedBankCount = paymentCardIds.filter((cid: string) => targetPlayer.bank.some((c) => c.id === cid)).length;
                    if (selectedBankCount < targetPlayer.bank.length) {
                      // Must select all bank cards first
                      paymentCardIds.splice(0, paymentCardIds.length, ...BotEngine.selectPayment(targetPlayer, amountDue));
                    } else if (totalAssetsValue >= amountDue) {
                      if (totalSelectedValue < amountDue) {
                        paymentCardIds.splice(0, paymentCardIds.length, ...BotEngine.selectPayment(targetPlayer, amountDue));
                      }
                    } else {
                      // totalAssetsValue < amountDue: must pay everything!
                      if (paymentCardIds.length < totalCardsCount) {
                        const allIds: string[] = [];
                        targetPlayer.bank.forEach((c) => allIds.push(c.id));
                        Object.values(targetPlayer.properties).forEach((set) => {
                          if (set && set.cards) {
                            set.cards.forEach((c) => allIds.push(c.id));
                          }
                        });
                        paymentCardIds.splice(0, paymentCardIds.length, ...allIds);
                      }
                    }
                  }
                }

                let totalPaid = 0;
                const cardsToTransfer: Card[] = [];

                paymentCardIds.forEach((cid: string) => {
                  // Find in bank first
                  const bIdx = targetPlayer.bank.findIndex((c) => c.id === cid);
                  if (bIdx !== -1) {
                    const card = targetPlayer.bank.splice(bIdx, 1)[0];
                    totalPaid += card.value;
                    cardsToTransfer.push(card);
                  } else {
                    // Find in properties
                    for (const colorKey in targetPlayer.properties) {
                      const col = colorKey as CardColor;
                      const propSet = targetPlayer.properties[col];
                      if (propSet) {
                        const pIdx = propSet.cards.findIndex((c) => c.id === cid);
                        if (pIdx !== -1) {
                          const card = propSet.cards.splice(pIdx, 1)[0];
                          totalPaid += card.value;
                          cardsToTransfer.push(card);
                          break;
                        }
                      }
                    }
                  }
                });

                // Add cards to source player's assets (money goes to bank, properties go to property)
                cardsToTransfer.forEach((card) => {
                  if (card.type === 'property' || card.type === 'wildcard') {
                    const col = card.color || 'brown';
                    if (!sourcePlayer.properties[col]) {
                      sourcePlayer.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
                    }
                    sourcePlayer.properties[col]!.cards.push(card);
                  } else {
                    sourcePlayer.bank.push(card);
                  }
                });

                match.logs.push({
                  id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  message: `${targetPlayer.username}, ${sourcePlayer.username} oyuncusuna ${totalPaid}M değerinde ödeme yaptı.`,
                  timestamp: Date.now(),
                });

                match.activeActionRequest = undefined;
              }
            }

            // If activeActionRequest was resolved (is undefined), check if we need to resume bot's turn
            if (!match.activeActionRequest) {
              const currentTurnPlayer = match.players[match.turnIndex];
              if (currentTurnPlayer && (currentTurnPlayer.isBot || currentTurnPlayer.isDisconnected)) {
                setTimeout(() => handleBotTurn(match), 1000);
              }
            }

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }

          case 'quick_reaction': {
            const { emoji } = payload;
            broadcastToRoom(roomId, {
              type: 'quick_reaction',
              userId: userId,
              emoji: emoji,
            });
            break;
          }

          case 'end_turn': {
            const match = activeMatches[roomId];
            if (!match || match.status !== 'playing') break;

            const player = match.players[match.turnIndex];
            if (player.id !== userId) break;

            if (match.activeActionRequest) {
              ws.send(JSON.stringify({ type: 'alert', message: 'Aktif bir ödeme veya hamle talebi varken turunuzu sonlandıramazsınız!' }));
              break;
            }

            // Validate hand size is <= 7. If they have more, they must discard first
            if (player.hand.length > 7) {
              ws.send(JSON.stringify({ type: 'alert', message: 'Elinizde 7\'den fazla kart var. Fazla kartları atmalısınız.' }));
              break;
            }

            // Move to next player
            match.turnIndex = (match.turnIndex + 1) % match.players.length;
            match.actionsPlayedThisTurn = 0;

            const nextPlayer = match.players[match.turnIndex];
            match.logs.push({
              id: `turn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              message: `Sıra ${nextPlayer.username} adlı oyuncuda.`,
              timestamp: Date.now(),
            });

            // Trigger draw for next player
            triggerDrawForActivePlayer(match);

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });

            // If next player is a bot or disconnected, handle its turn asynchronously
            if (nextPlayer.isBot || nextPlayer.isDisconnected) {
              setTimeout(() => handleBotTurn(match), 1000);
            }
            break;
          }

          case 'discard_card': {
            const match = activeMatches[roomId];
            if (!match) break;

            const { cardId } = payload;
            const player = match.players.find((p) => p.id === userId);
            if (!player) break;

            const idx = player.hand.findIndex((c) => c.id === cardId);
            if (idx !== -1) {
              const card = player.hand.splice(idx, 1)[0];
              match.discardPile.push(card);
              match.logs.push({
                id: `disc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                message: `${player.username} elinden ${card.name} kartını attı.`,
                timestamp: Date.now(),
              });
            }

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }

          case 'voice_state': {
            // Player toggles mute or reports speaking
            const match = activeMatches[roomId];
            if (!match) break;

            const { isSpeaking, isMuted } = payload;
            const player = match.players.find((p) => p.id === userId);
            if (player) {
              if (isSpeaking !== undefined) player.isSpeaking = isSpeaking;
              if (isMuted !== undefined) player.isMuted = isMuted;
            }

            broadcastToRoom(roomId, {
              type: 'voice_update',
              players: match.players.map((p) => ({ id: p.id, isSpeaking: p.isSpeaking, isMuted: p.isMuted })),
            });
            break;
          }

          case 'send_chat': {
            const match = activeMatches[roomId];
            if (!match) break;

            const { text } = payload;
            const sender = match.players.find((p) => p.id === userId);
            if (sender) {
              match.logs.push({
                id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                playerName: sender.username,
                message: text,
                timestamp: Date.now(),
              });
            }

            broadcastToRoom(roomId, {
              type: 'room_update',
              matchState: match,
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error handling ws message', err);
      }
    });

    ws.on('close', () => {
      // Find client details
      const c = clients[clientId];
      if (c) {
        updateFriendStatus(c.userId, 'offline');
        if (c.roomId) {
          const match = activeMatches[c.roomId];
          if (match) {
            // Find player and flag them as disconnected
            const disconnectedPlayer = match.players.find(p => p.id === c.userId);
            if (disconnectedPlayer) {
              if (match.status === 'lobby') {
                // Completely remove them from the lobby list!
                match.players = match.players.filter(p => p.id !== c.userId);
                match.logs.push({
                  id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  message: `${disconnectedPlayer.username} lobiden ayrıldı.`,
                  timestamp: Date.now(),
                });
              } else {
                disconnectedPlayer.isDisconnected = true;
                match.logs.push({
                  id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  message: `${disconnectedPlayer.username} bağlantısını kaybetti. Yapay zeka devralıyor.`,
                  timestamp: Date.now(),
                });
              }

              // If there was an active action request for them, resolve it automatically
              if (match.activeActionRequest && match.activeActionRequest.targetPlayerId === disconnectedPlayer.id) {
                const req = match.activeActionRequest;
                const sourcePlayer = match.players.find(p => p.id === req.sourcePlayerId);
                if (sourcePlayer && req.amountDue) {
                  processBotPayment(match, disconnectedPlayer, sourcePlayer, req.amountDue);
                }
                match.activeActionRequest = undefined;
              }

              // If it's their turn, run bot turn automatically
              if (match.status === 'playing' && match.players[match.turnIndex]?.id === disconnectedPlayer.id) {
                setTimeout(() => handleBotTurn(match), 1000);
              }
            }

            // Cleanup room if no active humans remain
            const hasActiveHumans = match.players.some((p) => !p.isBot && !p.isDisconnected);
            if (!hasActiveHumans) {
              delete activeMatches[c.roomId];
            } else {
              broadcastToRoom(c.roomId, {
                type: 'room_update',
                matchState: match,
              });
            }
          }
        }
        delete clients[clientId];
      }
    });
  });

  // Trigger draw for active player
  function triggerDrawForActivePlayer(match: MatchState) {
    const activePlayer = match.players[match.turnIndex];
    const serverDeck: Card[] = (match as any).serverDeck || [];

    // If deck runs out, reshuffle discard pile!
    if (serverDeck.length < 5) {
      const disc = [...match.discardPile];
      match.discardPile = [];
      const shuffled = shuffleDeck(disc);
      serverDeck.push(...shuffled);
      match.logs.push({
        id: `reshuffle-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        message: 'Deste bitti, kartlar yeniden karıştırıldı.',
        timestamp: Date.now(),
      });
    }

    // Drawing rule: if player has 0 cards, draw 5, else draw 2 (or 4 in Chaos Mode).
    let drawCount = activePlayer.hand.length === 0 ? 5 : 2;
    if (match.settings?.gameMode === 'chaos' && activePlayer.hand.length > 0) {
      drawCount = 4;
    }
    const drawn = serverDeck.splice(0, drawCount);
    activePlayer.hand.push(...drawn);

    match.deckCount = serverDeck.length;
    (match as any).serverDeck = serverDeck;

    match.logs.push({
      id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      message: `${activePlayer.username} desteden ${drawCount} kart çekti.`,
      timestamp: Date.now(),
    });
  }

  // Handle action cards execution on server
  function processActionCard(match: MatchState, player: GamePlayer, card: Card, payload: any) {
    if (card.actionType === 'pass-go') {
      const serverDeck: Card[] = (match as any).serverDeck || [];
      const drawn = serverDeck.splice(0, 2);
      player.hand.push(...drawn);
      match.deckCount = serverDeck.length;
      match.logs.push({
        id: `passgo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        message: `${player.username} Başlangıç Noktasından Geçti ve 2 kart çekti!`,
        timestamp: Date.now(),
      });
    } else if (card.actionType === 'birthday') {
      // Demand 2M from all other players
      const targetPlayers = match.players.filter((p) => p.id !== player.id);
      targetPlayers.forEach((tp) => {
        // Create action request
        if (tp.isBot || tp.isDisconnected) {
          // Bots or disconnected players respond instantly
          processBotPayment(match, tp, player, 2);
        } else {
          match.activeActionRequest = {
            id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'make-payment',
            sourcePlayerId: player.id,
            targetPlayerId: tp.id,
            actionCard: card,
            amountDue: 2,
          };
        }
      });
      match.logs.push({
        id: `birthday-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        message: `${player.username} Bugün Benim Doğum Günüm kartını oynadı! Herkesten 2M talep ediyor.`,
        timestamp: Date.now(),
      });
    } else if (card.actionType === 'debt-collector') {
      // Demand 2M from a specific player
      const targetId = payload.targetPlayerId || match.players.find((p) => p.id !== player.id)?.id;
      if (!targetId) return;

      const targetPlayer = match.players.find((p) => p.id === targetId);
      if (targetPlayer) {
        if (targetPlayer.isBot || targetPlayer.isDisconnected) {
          processBotPayment(match, targetPlayer, player, 2);
        } else {
          match.activeActionRequest = {
            id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'make-payment',
            sourcePlayerId: player.id,
            targetPlayerId: targetId,
            actionCard: card,
            amountDue: 2,
          };
        }
        match.logs.push({
          id: `debt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${player.username}, ${targetPlayer.username} adlı oyuncudan 2M borç tahsilatı talep ediyor!`,
          timestamp: Date.now(),
        });
      }
    } else if (card.type === 'rent') {
      // Charge Rent
      const chosenColor = payload.extraColor || payload.color || card.color || 'brown';
      // Find rent value based on property count
      const propSet = player.properties[chosenColor];
      if (propSet && propSet.cards.length > 0) {
        const count = Math.min(propSet.cards.length, MAX_IN_SET[chosenColor]);
        let rentVal = RENT_VALUES[chosenColor][count - 1] || 1;

        // Apply house/hotel bonuses
        if (propSet.hasHouse) rentVal += 3;
        if (propSet.hasHotel) rentVal += 4;

        if (payload.isDoubleRent) {
          rentVal *= 2;
        }

        const targetPlayers = match.players.filter((p) => p.id !== player.id);
        targetPlayers.forEach((tp) => {
          if (tp.isBot || tp.isDisconnected) {
            processBotPayment(match, tp, player, rentVal);
          } else {
            match.activeActionRequest = {
              id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              type: 'make-payment',
              sourcePlayerId: player.id,
              targetPlayerId: tp.id,
              actionCard: card,
              amountDue: rentVal,
            };
          }
        });

        match.logs.push({
          id: `rent-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${player.username}, ${COLOR_LABELS[chosenColor]} mülkleri için herkesten ${rentVal}M kira talep etti!`,
          timestamp: Date.now(),
        });
      } else {
        match.logs.push({
          id: `rent-fail-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${player.username} mülkü olmadığı için kira tahsil edemedi.`,
          timestamp: Date.now(),
        });
      }
    } else if (card.actionType === 'sly-deal') {
      const targetId = payload.targetPlayerId;
      const cardIdToSteal = payload.targetCardId;
      if (!targetId || !cardIdToSteal) return;

      const targetPlayer = match.players.find((p) => p.id === targetId);
      if (targetPlayer) {
        if (targetPlayer.isBot || targetPlayer.isDisconnected) {
          // Execute immediately for bots
          let stolenCard: Card | null = null;
          for (const colKey in targetPlayer.properties) {
            const col = colKey as CardColor;
            const propSet = targetPlayer.properties[col];
            if (propSet && propSet.cards.length < MAX_IN_SET[col]) {
              const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
              if (idx !== -1) {
                stolenCard = propSet.cards.splice(idx, 1)[0];
                if (propSet.cards.length === 0) {
                  delete targetPlayer.properties[col];
                }
                break;
              }
            }
          }
          if (stolenCard) {
            const col = stolenCard.color || 'brown';
            if (!player.properties[col]) {
              player.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
            }
            player.properties[col]!.cards.push(stolenCard);
            match.logs.push({
              id: `sly-${Date.now()}`,
              message: `${player.username}, ${targetPlayer.username}'den ${stolenCard.name} mülkünü sinsi anlaşma ile çaldı!`,
              timestamp: Date.now(),
            });
            if (checkWinner(player.properties)) {
              handleMatchWinner(match, player.id);
            }
          }
        } else {
          // Trigger defense phase for active players!
          match.activeActionRequest = {
            id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'just-say-no',
            sourcePlayerId: player.id,
            targetPlayerId: targetId,
            actionCard: card,
            amountDue: 0,
            targetCardId: cardIdToSteal,
            originalAction: {
              type: 'sly-deal',
              payload: { targetPlayerId: targetId, targetCardId: cardIdToSteal }
            },
            jsnCount: 0
          };
          match.logs.push({
            id: `sly-req-${Date.now()}`,
            message: `📣 ${player.username}, ${targetPlayer.username} adlı oyuncunun mülkünü Sinsi Anlaşma ile çalmak istiyor!`,
            timestamp: Date.now(),
          });
        }
      }
    } else if (card.actionType === 'deal-breaker') {
      const targetId = payload.targetPlayerId;
      const targetColor = payload.targetColor as CardColor;
      if (!targetId || !targetColor) return;

      const targetPlayer = match.players.find((p) => p.id === targetId);
      if (targetPlayer) {
        if (targetPlayer.isBot || targetPlayer.isDisconnected) {
          const propSet = targetPlayer.properties[targetColor];
          if (propSet) {
            player.properties[targetColor] = propSet;
            delete targetPlayer.properties[targetColor];
            match.logs.push({
              id: `db-${Date.now()}`,
              message: `${player.username}, ${targetPlayer.username} adlı oyuncunun tamamlanmış ${COLOR_LABELS[targetColor]} setini Anlaşma Bozan kartı ile çaldı!`,
              timestamp: Date.now(),
            });
            if (checkWinner(player.properties)) {
              handleMatchWinner(match, player.id);
            }
          }
        } else {
          // Trigger defense phase
          match.activeActionRequest = {
            id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'just-say-no',
            sourcePlayerId: player.id,
            targetPlayerId: targetId,
            actionCard: card,
            amountDue: 0,
            targetColor: targetColor,
            originalAction: {
              type: 'deal-breaker',
              payload: { targetPlayerId: targetId, targetColor: targetColor }
            },
            jsnCount: 0
          };
          match.logs.push({
            id: `db-req-${Date.now()}`,
            message: `📣 ${player.username}, ${targetPlayer.username} adlı oyuncunun tamamlanmış ${COLOR_LABELS[targetColor]} setini çalan bir Anlaşma Bozan kartı oynadı!`,
            timestamp: Date.now(),
          });
        }
      }
    } else if (card.actionType === 'forced-deal') {
      const targetId = payload.targetPlayerId;
      const cardIdToSteal = payload.targetCardId;
      const myCardIdToGive = payload.myCardId;
      if (!targetId || !cardIdToSteal || !myCardIdToGive) return;

      const targetPlayer = match.players.find((p) => p.id === targetId);
      if (targetPlayer) {
        if (targetPlayer.isBot || targetPlayer.isDisconnected) {
          // Execute immediately
          let stolenCard: Card | null = null;
          let givenCard: Card | null = null;
          let stolenColor: CardColor | null = null;
          let givenColor: CardColor | null = null;

          for (const colKey in targetPlayer.properties) {
            const col = colKey as CardColor;
            const propSet = targetPlayer.properties[col];
            if (propSet) {
              const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
              if (idx !== -1) {
                stolenCard = propSet.cards.splice(idx, 1)[0];
                stolenColor = col;
                if (propSet.cards.length === 0) {
                  delete targetPlayer.properties[col];
                }
                break;
              }
            }
          }

          for (const colKey in player.properties) {
            const col = colKey as CardColor;
            const propSet = player.properties[col];
            if (propSet) {
              const idx = propSet.cards.findIndex((c) => c.id === myCardIdToGive);
              if (idx !== -1) {
                givenCard = propSet.cards.splice(idx, 1)[0];
                givenColor = col;
                if (propSet.cards.length === 0) {
                  delete player.properties[col];
                }
                break;
              }
            }
          }

          if (stolenCard && givenCard) {
            const colS = stolenCard.color || stolenColor || 'brown';
            if (!player.properties[colS]) {
              player.properties[colS] = { cards: [], hasHouse: false, hasHotel: false };
            }
            player.properties[colS]!.cards.push(stolenCard);

            const colG = givenCard.color || givenColor || 'brown';
            if (!targetPlayer.properties[colG]) {
              targetPlayer.properties[colG] = { cards: [], hasHouse: false, hasHotel: false };
            }
            targetPlayer.properties[colG]!.cards.push(givenCard);

            match.logs.push({
              id: `forced-${Date.now()}`,
              message: `${player.username}, ${targetPlayer.username} ile ${stolenCard.name} karşılığında ${givenCard.name} mülkünü takas etti!`,
              timestamp: Date.now(),
            });

            if (checkWinner(player.properties)) {
              handleMatchWinner(match, player.id);
            }
            if (checkWinner(targetPlayer.properties)) {
              handleMatchWinner(match, targetPlayer.id);
            }
          }
        } else {
          // Trigger defense phase
          match.activeActionRequest = {
            id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'just-say-no',
            sourcePlayerId: player.id,
            targetPlayerId: targetId,
            actionCard: card,
            amountDue: 0,
            targetCardId: cardIdToSteal,
            myCardId: myCardIdToGive,
            originalAction: {
              type: 'forced-deal',
              payload: { targetPlayerId: targetId, targetCardId: cardIdToSteal, myCardId: myCardIdToGive }
            },
            jsnCount: 0
          };
          match.logs.push({
            id: `forced-req-${Date.now()}`,
            message: `📣 ${player.username}, ${targetPlayer.username} ile ${myCardIdToGive} mülkü karşılığında ${cardIdToSteal} mülkünü Zoraki Takas ile değiştirmek istiyor!`,
            timestamp: Date.now(),
          });
        }
      }
    }
  }

  // Direct bot payment simulator for fast turns
  function processBotPayment(match: MatchState, bot: GamePlayer, receiver: GamePlayer, amount: number) {
    let accumulated = 0;
    const cardsPaid: Card[] = [];

    // Bank pay
    const bCopy = [...bot.bank];
    for (const card of bCopy) {
      if (accumulated >= amount) break;
      const idx = bot.bank.findIndex((c) => c.id === card.id);
      if (idx !== -1) {
        bot.bank.splice(idx, 1);
        accumulated += card.value;
        cardsPaid.push(card);
      }
    }

    // Properties pay if bank was insufficient
    if (accumulated < amount) {
      for (const colKey in bot.properties) {
        if (accumulated >= amount) break;
        const col = colKey as CardColor;
        const propSet = bot.properties[col];
        if (propSet) {
          const pCopy = [...propSet.cards];
          for (const card of pCopy) {
            if (accumulated >= amount) break;
            const idx = propSet.cards.findIndex((c) => c.id === card.id);
            if (idx !== -1) {
              propSet.cards.splice(idx, 1);
              accumulated += card.value;
              cardsPaid.push(card);
            }
          }
        }
      }
    }

    // Give payment to receiver
    cardsPaid.forEach((card) => {
      if (card.type === 'property' || card.type === 'wildcard') {
        const col = card.color || 'brown';
        if (!receiver.properties[col]) {
          receiver.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
        }
        receiver.properties[col]!.cards.push(card);
      } else {
        receiver.bank.push(card);
      }
    });

    match.logs.push({
      id: `bot-pay-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      message: `${bot.username}, ${receiver.username} oyuncusuna ${accumulated}M ödeme yaptı.`,
      timestamp: Date.now(),
    });
  }



  // Direct bot turn automation
  function handleBotTurn(match: MatchState) {
    if (match.status !== 'playing') return;

    const bot = match.players[match.turnIndex];
    if (!bot || (!bot.isBot && !bot.isDisconnected)) return;

    let botActions = 0;

    while (botActions < 3) {
      const decision = BotEngine.selectPlayAction(bot, match);
      if (!decision) break;

      const cardIdx = bot.hand.findIndex((c) => c.id === decision.cardId);
      if (cardIdx === -1) break;

      const card = bot.hand[cardIdx];

      if (decision.targetZone === 'bank') {
        bot.hand.splice(cardIdx, 1);
        bot.bank.push(card);
        match.actionsPlayedThisTurn++;
        match.logs.push({
          id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${bot.username} bankaya ${card.value}M para ekledi.`,
          timestamp: Date.now(),
        });
      } else if (decision.targetZone === 'property') {
        bot.hand.splice(cardIdx, 1);
        const col = decision.extraColor || card.color || 'brown';
        if (!bot.properties[col]) {
          bot.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
        }
        bot.properties[col]!.cards.push({ ...card, color: col });
        match.actionsPlayedThisTurn++;
        match.logs.push({
          id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${bot.username}, ${COLOR_LABELS[col]} grubuna ${card.name} yerleştirdi.`,
          timestamp: Date.now(),
        });

        if (checkWinner(bot.properties)) {
          handleMatchWinner(match, bot.id);
          broadcastToRoom(match.roomId, { type: 'room_update', matchState: match });
          return;
        }
      } else if (decision.targetZone === 'action') {
        bot.hand.splice(cardIdx, 1);
        match.discardPile.push(card);
        match.actionsPlayedThisTurn++;
        match.logs.push({
          id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${bot.username} aksiyon kartı oynadı: ${card.name}`,
          timestamp: Date.now(),
        });

        processActionCard(match, bot, card, {
          ...decision.payload,
          extraColor: decision.extraColor
        });
      }

      botActions++;
    }

    // End Bot Turn
    setTimeout(() => {
      // Discard excess
      while (bot.hand.length > 7) {
        const discarded = bot.hand.splice(0, 1)[0];
        match.discardPile.push(discarded);
        match.logs.push({
          id: `bot-disc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: `${bot.username} elinden ${discarded.name} kartını attı.`,
          timestamp: Date.now(),
        });
      }

      match.turnIndex = (match.turnIndex + 1) % match.players.length;
      match.actionsPlayedThisTurn = 0;

      const nextPlayer = match.players[match.turnIndex];
      match.logs.push({
        id: `turn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        message: `Sıra ${nextPlayer.username} adlı oyuncuda.`,
        timestamp: Date.now(),
      });

      triggerDrawForActivePlayer(match);
      broadcastToRoom(match.roomId, { type: 'room_update', matchState: match });

      // If next is bot or disconnected too, chain
      if (nextPlayer.isBot || nextPlayer.isDisconnected) {
        setTimeout(() => handleBotTurn(match), 1000);
      }
    }, 1000);
  }

  // Broadcast helper
  function broadcastToRoom(roomId: string, message: any) {
    Object.values(clients).forEach((client) => {
      if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // Update online presence for friends panel
  function updateFriendStatus(userId: string, status: 'online' | 'offline' | 'in_game') {
    const users = loadUsers();
    const user = users[userId];
    if (user) {
      Object.values(users).forEach((u) => {
        const fr = u.friends.find((f) => f.id === userId);
        if (fr) {
          fr.status = status;
        }
      });
      saveUsers(users);
    }
  }

  // Host/Port binding
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Monopoly Deal running on http://0.0.0.0:${PORT}`);
  });
}

const COLOR_LABELS: Record<CardColor, string> = {
  brown: 'Kahverengi',
  lightblue: 'Açık Mavi',
  pink: 'Pembe',
  orange: 'Turuncu',
  red: 'Kırmızı',
  yellow: 'Sarı',
  green: 'Yeşil',
  darkblue: 'Koyu Mavi',
  railroad: 'Demiryolu',
  utility: 'Kamu Hizmeti',
};

const RENT_VALUES: Record<CardColor, number[]> = {
  brown: [1, 2],
  lightblue: [1, 2, 3],
  pink: [1, 2, 4],
  orange: [1, 3, 5],
  red: [2, 3, 6],
  yellow: [2, 4, 6],
  green: [2, 4, 7],
  darkblue: [3, 8],
  railroad: [1, 2, 3, 4],
  utility: [1, 2],
};

function executeOriginalActionServer(match: any, req: any) {
  const sourcePlayer = match.players.find((p: any) => p.id === req.sourcePlayerId);
  const targetPlayer = match.players.find((p: any) => p.id === req.targetPlayerId);
  if (!sourcePlayer || !targetPlayer) return;

  const type = req.originalAction?.type || req.actionCard?.actionType || req.actionCard?.type;
  if (!type) return;

  if (type === 'sly-deal') {
    const cardIdToSteal = req.targetCardId;
    let stolenCard: Card | null = null;
    let stolenColor: CardColor | null = null;

    for (const colKey in targetPlayer.properties) {
      const col = colKey as CardColor;
      const propSet = targetPlayer.properties[col];
      if (propSet) {
        const idx = propSet.cards.findIndex((c: any) => c.id === cardIdToSteal);
        if (idx !== -1) {
          stolenCard = propSet.cards.splice(idx, 1)[0];
          stolenColor = col;
          if (propSet.cards.length === 0) {
            delete targetPlayer.properties[col];
          }
          break;
        }
      }
    }

    if (stolenCard) {
      const col = stolenCard.color || stolenColor || 'brown';
      if (!sourcePlayer.properties[col]) {
        sourcePlayer.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
      }
      sourcePlayer.properties[col]!.cards.push(stolenCard);

      match.logs.push({
        id: `sly-res-${Date.now()}`,
        message: `${sourcePlayer.username}, ${targetPlayer.username}'den ${stolenCard.name} mülkünü sinsi anlaşma ile aldı!`,
        timestamp: Date.now(),
      });

      if (checkWinner(sourcePlayer.properties, getWinSetsTarget(match))) {
        handleMatchWinner(match, sourcePlayer.id);
      }
    }

  } else if (type === 'deal-breaker') {
    const targetColor = req.targetColor;
    if (targetColor) {
      const propSet = targetPlayer.properties[targetColor];
      if (propSet) {
        sourcePlayer.properties[targetColor] = { ...propSet };
        delete targetPlayer.properties[targetColor];

        match.logs.push({
          id: `db-res-${Date.now()}`,
          message: `${sourcePlayer.username}, ${targetPlayer.username} adlı oyuncunun tamamlanmış ${COLOR_LABELS[targetColor]} setini çaldı!`,
          timestamp: Date.now(),
        });

        if (checkWinner(sourcePlayer.properties, getWinSetsTarget(match))) {
          handleMatchWinner(match, sourcePlayer.id);
        }
      }
    }

  } else if (type === 'forced-deal') {
    const cardIdToSteal = req.targetCardId;
    const myCardIdToGive = req.myCardId;
    
    let stolenCard: Card | null = null;
    let givenCard: Card | null = null;
    let stolenColor: CardColor | null = null;
    let givenColor: CardColor | null = null;

    for (const colKey in targetPlayer.properties) {
      const col = colKey as CardColor;
      const propSet = targetPlayer.properties[col];
      if (propSet) {
        const idx = propSet.cards.findIndex((c: any) => c.id === cardIdToSteal);
        if (idx !== -1) {
          stolenCard = propSet.cards.splice(idx, 1)[0];
          stolenColor = col;
          if (propSet.cards.length === 0) {
            delete targetPlayer.properties[col];
          }
          break;
        }
      }
    }

    for (const colKey in sourcePlayer.properties) {
      const col = colKey as CardColor;
      const propSet = sourcePlayer.properties[col];
      if (propSet) {
        const idx = propSet.cards.findIndex((c: any) => c.id === myCardIdToGive);
        if (idx !== -1) {
          givenCard = propSet.cards.splice(idx, 1)[0];
          givenColor = col;
          if (propSet.cards.length === 0) {
            delete sourcePlayer.properties[col];
          }
          break;
        }
      }
    }

    if (stolenCard && givenCard) {
      const colS = stolenCard.color || stolenColor || 'brown';
      if (!sourcePlayer.properties[colS]) {
        sourcePlayer.properties[colS] = { cards: [], hasHouse: false, hasHotel: false };
      }
      sourcePlayer.properties[colS]!.cards.push(stolenCard);

      const colG = givenCard.color || givenColor || 'brown';
      if (!targetPlayer.properties[colG]) {
        targetPlayer.properties[colG] = { cards: [], hasHouse: false, hasHotel: false };
      }
      targetPlayer.properties[colG]!.cards.push(givenCard);

      match.logs.push({
        id: `forced-res-${Date.now()}`,
        message: `${sourcePlayer.username}, ${targetPlayer.username} ile ${stolenCard.name} karşılığında ${givenCard.name} kartını takas etti!`,
        timestamp: Date.now(),
      });

      if (checkWinner(sourcePlayer.properties, getWinSetsTarget(match))) {
        handleMatchWinner(match, sourcePlayer.id);
      }
      if (checkWinner(targetPlayer.properties, getWinSetsTarget(match))) {
        handleMatchWinner(match, targetPlayer.id);
      }
    }
  }
}

startServer().catch((err) => {
  console.error('Failed to start fullstack server:', err);
});

// Handle Match Win State on Server
async function handleMatchWinner(match: any, winnerId: string) {
  match.status = 'finished';
  match.winnerId = winnerId;

  const winner = match.players.find((p: any) => p.id === winnerId);
  match.logs.push({
    id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    message: `Tebrikler! Maçı ${winner?.username} kazandı!`,
    timestamp: Date.now(),
  });

  // Securely update profiles in parallel
  const updatePromises = match.players.map(async (p: any) => {
    if (p.isBot) return;
    const isWinner = p.id === winnerId;
    const user = await getUserProfileById(p.id);
    if (user) {
      if (isWinner) {
        user.coins += (cachedAdminSettings.winCoins || 200); // Admin settings win coins
        user.xp += 150;
        user.stats.gamesPlayed++;
        user.stats.gamesWon++;
        user.stats.totalSetsCompleted += 3;
        
        // Check level up based on Admin settings rate
        user.level = Math.floor(user.xp / (cachedAdminSettings.xpLevelRate || 500)) + 1;
        
        // Update quests
        user.dailyQuests.forEach((q: any) => {
          if (q.description.includes('yen') || q.description.includes('maç')) {
            q.currentValue = Math.min(q.targetValue, q.currentValue + 1);
            if (q.currentValue >= q.targetValue) q.completed = true;
          }
        });
      } else {
        user.coins += 50; // loser participation bonus
        user.xp += 50;
        user.stats.gamesPlayed++;
        user.stats.gamesLost++;
        user.level = Math.floor(user.xp / (cachedAdminSettings.xpLevelRate || 500)) + 1;
      }
      await saveUserProfile(user);
    }
  });

  await Promise.all(updatePromises);
}
