import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/apiConfig';

interface Quest {
  id: string;
  description: string;
  targetValue: number;
  rewardCoins: number;
  rewardXp: number;
}

interface Player {
  id: string;
  username: string;
  level: number;
  xp: number;
  coins: number;
  gamesWon: number;
  gamesPlayed: number;
  friendsCount: number;
}

interface AdminSettings {
  enable3DCardFlip: boolean;
  enablePropertySetGlow: boolean;
  enableFloatingEmojis: boolean;
  enableCoinFlyEffect: boolean;
  enableBuildingSmoke: boolean;
  enableHoverCardSidebar: boolean;
  enableUndoInTraining: boolean;
  questsEnabled: boolean;
  codexTabEnabled: boolean;
  rankedLeagueEnabled: boolean;
  turnTimeoutSeconds: number;
  actionTimeoutSeconds: number;
  targetSets: number;
  turnActionLimit: number;
  goldMultiplier: number;
  maintenanceMode: boolean;
  enableSystemVoiceovers: boolean;
}

interface Stats {
  supabaseStatus: string;
  supabaseRowCount: number;
  totalUsersInMemory: number;
  activeRooms: number;
  activeTournamentsCount: number;
  uptimeSeconds: number;
}

interface Props {
  onSettingsUpdated?: (newSettings: AdminSettings) => void;
}

export const AdminDashboard: React.FC<Props> = ({ onSettingsUpdated }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'rules' | 'players' | 'quests' | 'tournaments' | 'translations' | 'voices'>('analytics');
  const [settings, setSettings] = useState<AdminSettings>({
    enable3DCardFlip: true,
    enablePropertySetGlow: true,
    enableFloatingEmojis: true,
    enableCoinFlyEffect: true,
    enableBuildingSmoke: true,
    enableHoverCardSidebar: true,
    enableUndoInTraining: true,
    questsEnabled: true,
    codexTabEnabled: true,
    rankedLeagueEnabled: true,
    turnTimeoutSeconds: 35,
    actionTimeoutSeconds: 20,
    targetSets: 3,
    turnActionLimit: 3,
    goldMultiplier: 1.0,
    maintenanceMode: false,
    enableSystemVoiceovers: true
  });

  const [stats, setStats] = useState<Stats>({
    supabaseStatus: 'loading',
    supabaseRowCount: 0,
    totalUsersInMemory: 0,
    activeRooms: 0,
    activeTournamentsCount: 0,
    uptimeSeconds: 0
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editCoins, setEditCoins] = useState(0);
  const [editLevel, setEditLevel] = useState(1);
  const [editXp, setEditXp] = useState(0);

  const [quests, setQuests] = useState<Quest[]>([]);
  const [newQuestDesc, setNewQuestDesc] = useState('');
  const [newQuestTarget, setNewQuestTarget] = useState(3);
  const [newQuestCoins, setNewQuestCoins] = useState(50);
  const [newQuestXp, setNewQuestXp] = useState(40);

  const [tournamentName, setTournamentName] = useState('');
  const [tournamentPlayers, setTournamentPlayers] = useState('Bot Memo, Bot Can, Bot Defne');

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Translation editing states
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});
  const [editingLang, setEditingLang] = useState<string>('tr');
  const [newLangCode, setNewLangCode] = useState<string>('');
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyDefaultVal, setNewKeyDefaultVal] = useState<string>('');
  const [transSearch, setTransSearch] = useState<string>('');

  interface VoiceItem {
    id: string;
    name: string;
    filename: string;
    scope?: 'global' | 'duel' | 'actor';
    trExists: boolean;
    enExists: boolean;
  }

  const defaultVoiceList: VoiceItem[] = [
    { id: 'place_bank', name: 'Bankaya Para Koyma', filename: 'place_bank.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'place_property', name: 'Mülk/Arazi Yerleştirme', filename: 'place_property.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'play_passgo', name: 'Çizgiden Geç (Pass & Go)', filename: 'play_passgo.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'play_birthday', name: 'Doğum Günü Kartı', filename: 'play_birthday.mp3', scope: 'global', trExists: false, enExists: false },
    { id: 'play_debt', name: 'Haciz / Borç Tahsildarı', filename: 'play_debt.mp3', scope: 'duel', trExists: false, enExists: false },
    { id: 'play_sly', name: 'Sinsi Anlaşma', filename: 'play_sly.mp3', scope: 'duel', trExists: false, enExists: false },
    { id: 'play_dealbreaker', name: 'Anlaşma Bozan', filename: 'play_dealbreaker.mp3', scope: 'global', trExists: false, enExists: false },
    { id: 'play_forced', name: 'Zoraki Takas', filename: 'play_forced.mp3', scope: 'duel', trExists: false, enExists: false },
    { id: 'play_double', name: 'Çift Kira', filename: 'play_double.mp3', scope: 'duel', trExists: false, enExists: false },
    { id: 'play_rent', name: 'Kira Kartı', filename: 'play_rent.mp3', scope: 'global', trExists: false, enExists: false },
    { id: 'play_jsn', name: 'Hayır Teşekkürler (JSN)', filename: 'play_jsn.mp3', scope: 'duel', trExists: false, enExists: false },
    { id: 'play_action', name: 'Diğer Aksiyon Kartları', filename: 'play_action.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'game_start', name: 'Oyun Başlangıcı (Start)', filename: 'game_start.mp3', scope: 'global', trExists: false, enExists: false },
    { id: 'your_turn', name: 'Sıra Sende Splash', filename: 'your_turn.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'end_turn', name: 'Turu Sonlandırma', filename: 'end_turn.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'set_completed', name: 'Mülk Seti Tamamlama', filename: 'set_completed.mp3', scope: 'global', trExists: false, enExists: false },
    { id: 'build_house', name: 'Ev İnşa Etme', filename: 'build_house.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'build_hotel', name: 'Otel İnşa Etme', filename: 'build_hotel.mp3', scope: 'actor', trExists: false, enExists: false },
    { id: 'bankruptcy', name: 'İflas Olayı (Bankruptcy)', filename: 'bankruptcy.mp3', scope: 'global', trExists: false, enExists: false },
    { id: 'victory', name: 'Kazanma / Zafer', filename: 'victory.mp3', scope: 'global', trExists: false, enExists: false },
    { id: 'defeat', name: 'Kaybetme / Yenilgi', filename: 'defeat.mp3', scope: 'global', trExists: false, enExists: false },
  ];

  const [voices, setVoices] = useState<VoiceItem[]>(defaultVoiceList);
  const [uploadLoading, setUploadLoading] = useState<string | null>(null);

  const fetchVoiceList = () => {
    fetch(`${API_BASE_URL}/api/admin/voice-list`)
      .then((res) => {
        if (!res.ok) throw new Error('API not available yet');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setVoices(data);
        } else {
          setVoices(defaultVoiceList);
        }
      })
      .catch((err) => {
        console.warn('Voice list API not running, using fallback:', err);
        setVoices(defaultVoiceList);
      });
  };

  const handleUploadVoice = (e: React.ChangeEvent<HTMLInputElement>, item: VoiceItem, lang: 'tr' | 'en') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.mp3')) {
      alert('Lütfen yalnızca .mp3 formatında ses dosyası yükleyin.');
      return;
    }

    setUploadLoading(`${item.id}_${lang}`);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Data = reader.result as string;

      fetch(`${API_BASE_URL}/api/admin/upload-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          filename: item.filename,
          base64Data
        })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            fetchVoiceList();
            setNotification({ message: `${item.name} ses dosyası başarıyla yüklendi!`, type: 'success' });
          } else {
            alert('Yükleme başarısız: ' + (data.error || 'Bilinmeyen hata'));
          }
        })
        .catch((err) => {
          console.error('Upload voice error:', err);
          alert('Dosya yüklenirken ağ hatası oluştu.');
        })
        .finally(() => {
          setUploadLoading(null);
        });
    };
  };

  const playPreview = (filename: string, lang: 'tr' | 'en') => {
    const audioUrl = `${API_BASE_URL}/assets/sounds/voices/${lang}/${filename}?t=${Date.now()}`;
    const audio = new Audio(audioUrl);
    audio.volume = 0.8;
    audio.play().catch((err) => console.error('Preview playback failed:', err));
  };

  useEffect(() => {
    if (activeTab === 'voices') {
      fetchVoiceList();
    }
  }, [activeTab]);

  // Auto-clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load Initial Settings & Stats
  useEffect(() => {
    fetchSettings();
    fetchStats();
    fetchPlayers();
    fetchQuests();
    fetchTranslations();

    const interval = setInterval(fetchStats, 5000); // refresh stats every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchTranslations = () => {
    fetch(`${API_BASE_URL}/api/translations`)
      .then(res => res.json())
      .then(data => {
        if (data) setTranslations(data);
      })
      .catch(err => console.error('Error fetching translations:', err));
  };

  const handleSaveTranslations = (updated = translations) => {
    fetch(`${API_BASE_URL}/api/translations/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translations: updated })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTranslations(data.translations);
          setNotification({ message: 'Çeviriler başarıyla sunucuya kaydedildi!', type: 'success' });
        } else {
          setNotification({ message: 'Çeviriler kaydedilemedi.', type: 'error' });
        }
      })
      .catch(err => {
        console.error(err);
        setNotification({ message: 'Sunucu hatası.', type: 'error' });
      });
  };

  const handleAddLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newLangCode.trim().toLowerCase();
    if (!code) return;
    if (translations[code]) {
      setNotification({ message: 'Bu dil kodu zaten mevcut!', type: 'error' });
      return;
    }
    // Clone tr baseline or empty
    const baseline = translations['tr'] || {};
    const updated = { ...translations, [code]: { ...baseline } };
    setTranslations(updated);
    handleSaveTranslations(updated);
    setNewLangCode('');
    setNotification({ message: `Yeni dil (${code}) eklendi!`, type: 'success' });
  };

  const handleAddTranslationKey = (e: React.FormEvent) => {
    e.preventDefault();
    const key = newKeyName.trim();
    if (!key) return;

    const firstLang = Object.keys(translations)[0] || 'tr';
    if (translations[firstLang] && translations[firstLang][key] !== undefined) {
      setNotification({ message: 'Bu kelime anahtarı zaten mevcut!', type: 'error' });
      return;
    }

    const updated = { ...translations };
    Object.keys(updated).forEach(lang => {
      updated[lang] = {
        ...updated[lang],
        [key]: lang === 'tr' ? newKeyDefaultVal : key
      };
    });

    setTranslations(updated);
    handleSaveTranslations(updated);
    setNewKeyName('');
    setNewKeyDefaultVal('');
    setNotification({ message: `Yeni kelime anahtarı (${key}) eklendi!`, type: 'success' });
  };

  const handleTranslationChange = (lang: string, key: string, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [lang]: {
        ...prev[lang],
        [key]: value
      }
    }));
  };

  const fetchSettings = () => {
    fetch(`${API_BASE_URL}/api/admin/settings`)
      .then(res => res.json())
      .then(data => {
        if (data) setSettings(data);
      })
      .catch(err => console.error('Error fetching settings:', err));
  };

  const fetchStats = () => {
    fetch(`${API_BASE_URL}/api/admin/stats`)
      .then(res => res.json())
      .then(data => {
        if (data) setStats(data);
      })
      .catch(err => console.error('Error fetching stats:', err));
  };

  const fetchPlayers = () => {
    fetch(`${API_BASE_URL}/api/admin/players`)
      .then(res => res.json())
      .then(data => {
        if (data) setPlayers(data);
      })
      .catch(err => console.error('Error fetching players:', err));
  };

  const fetchQuests = () => {
    fetch(`${API_BASE_URL}/api/admin/quests`)
      .then(res => res.json())
      .then(data => {
        if (data) setQuests(data);
      })
      .catch(err => console.error('Error fetching quests:', err));
  };

  const handleSaveSettings = (updatedSettings = settings) => {
    fetch(`${API_BASE_URL}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: updatedSettings })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(data.settings);
          if (onSettingsUpdated) onSettingsUpdated(data.settings);
          setNotification({ message: 'Ayarlar başarıyla kaydedildi!', type: 'success' });
        } else {
          setNotification({ message: 'Ayarlar kaydedilemedi.', type: 'error' });
        }
      })
      .catch(err => {
        console.error(err);
        setNotification({ message: 'Sunucuyla bağlantı kurulamadı.', type: 'error' });
      });
  };

  const handleToggle = (key: keyof AdminSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    handleSaveSettings(next);
  };

  const handleSliderChange = (key: keyof AdminSettings, val: number) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
  };

  const handleUpdatePlayer = () => {
    if (!selectedPlayer) return;
    fetch(`${API_BASE_URL}/api/admin/players/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: selectedPlayer.id,
        coins: editCoins,
        level: editLevel,
        xp: editXp
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotification({ message: `${selectedPlayer.username} profili güncellendi!`, type: 'success' });
          fetchPlayers();
          setSelectedPlayer(null);
        } else {
          setNotification({ message: 'Güncelleme başarısız.', type: 'error' });
        }
      })
      .catch(err => {
        console.error(err);
        setNotification({ message: 'Sunucu hatası.', type: 'error' });
      });
  };

  const handleAddQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestDesc.trim()) return;

    fetch(`${API_BASE_URL}/api/admin/quests/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: newQuestDesc.trim(),
        targetValue: newQuestTarget,
        rewardCoins: newQuestCoins,
        rewardXp: newQuestXp
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setQuests(data.quests);
          setNewQuestDesc('');
          setNotification({ message: 'Yeni günlük görev eklendi!', type: 'success' });
        }
      })
      .catch(err => console.error(err));
  };

  const handleDeleteQuest = (questId: string) => {
    fetch(`${API_BASE_URL}/api/admin/quests/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setQuests(data.quests);
          setNotification({ message: 'Görev başarıyla silindi.', type: 'success' });
        }
      })
      .catch(err => console.error(err));
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentName.trim()) return;

    const list = tournamentPlayers.split(',').map(p => p.trim()).filter(Boolean);
    if (list.length < 2) {
      alert('Turnuva için en az 2 oyuncu tanımlamalısınız.');
      return;
    }

    fetch(`${API_BASE_URL}/api/admin/tournaments/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: tournamentName.trim(), participants: list })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTournamentName('');
          setNotification({ message: `"${tournamentName}" turnuvası kuruldu!`, type: 'success' });
        }
      })
      .catch(err => console.error(err));
  };

  const selectPlayerForEdit = (p: Player) => {
    setSelectedPlayer(p);
    setEditCoins(p.coins);
    setEditLevel(p.level);
    setEditXp(p.xp);
  };

  const filteredPlayers = players.filter(p =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatUptime = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${hours}s ${minutes}d ${seconds}s`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950/80 backdrop-blur-xl rounded-2xl border border-slate-800 text-slate-100 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛠️</span>
          <div>
            <h2 className="text-lg font-bold tracking-wide bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">YÖNETİCİ KONTROL PANELİ</h2>
            <p className="text-xs text-slate-400">Gerçek zamanlı sunucu, veritabanı, kural ve lobi yönetimi</p>
          </div>
        </div>
        {notification && (
          <div className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
            notification.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
          }`}>
            {notification.message}
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 bg-slate-950/40 border-r border-slate-900 flex flex-col p-4 gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span>🌍</span> Sistem Analitiği
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span>⚙️</span> Oyun Kuralları
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'players' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span>👥</span> Oyuncu Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('quests')}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'quests' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span>📜</span> Görev Tasarımcısı
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'tournaments' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span>🏆</span> Turnuva Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('translations')}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'translations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span>🌐</span> Dil & Kelime Yönetimi
          </button>
          <button
            onClick={() => setActiveTab('voices')}
            className={`w-full px-4 py-3 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all ${
              activeTab === 'voices' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <span>🗣️</span> Seslendirme Yönetimi
          </button>

          <div className="mt-auto p-4 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Durum Kontrolü</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${stats.supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-xs text-slate-400">Supabase Database</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400">Sunucu Çevrimiçi</span>
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950/20">
          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat 1 */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Toplam Oyuncu (Memory / DB)</span>
                  <span className="text-3xl font-extrabold text-indigo-400">{stats.totalUsersInMemory} <span className="text-slate-600 text-lg">/</span> {stats.supabaseRowCount}</span>
                  <span className="text-[10px] text-slate-500">Supabase ve lokal yedeklerdeki toplam oyuncu</span>
                </div>
                {/* Stat 2 */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktif Oda / Canlı Lobi</span>
                  <span className="text-3xl font-extrabold text-amber-400">{stats.activeRooms}</span>
                  <span className="text-[10px] text-slate-500">Oynanmakta olan güncel çok oyunculu maçlar</span>
                </div>
                {/* Stat 3 */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sunucu Çalışma Süresi</span>
                  <span className="text-lg font-bold text-emerald-400 mt-2">{formatUptime(stats.uptimeSeconds)}</span>
                  <span className="text-[10px] text-slate-500">Node.js sunucusu kesintisiz ayakta kalma süresi</span>
                </div>
              </div>

              {/* Database sync status panel */}
              <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Veritabanı Entegrasyon Durumu</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                    <span className="text-xs text-slate-400">Supabase Bağlantı Durumu</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      stats.supabaseStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {stats.supabaseStatus === 'connected' ? 'BAĞLI (ONLINE)' : 'ÇEVRİMDIŞI (FALLBACK AKTİF)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                    <span className="text-xs text-slate-400">Otomatik Çevrimdışı JSON Yedekleme</span>
                    <span className="text-xs text-emerald-400 font-semibold">AKTİF (Çift Yazma Korumalı)</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-900">
                    <span className="text-xs text-slate-400">Aktif Turnuva Havuzu</span>
                    <span className="text-xs text-indigo-400 font-bold">{stats.activeTournamentsCount} Turnuva</span>
                  </div>
                </div>
              </div>

              {/* Maintenance Mode & Emergency Stop */}
              <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-6 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400">Acil Durum & Bakım Modu</h3>
                  <p className="text-xs text-slate-400 mt-1">Bakım modunu aktif ederek yeni oyuncuların lobi kurmasını veya çok oyunculu maçlara girmesini geçici olarak askıya alabilirsiniz.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle('maintenanceMode')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                      settings.maintenanceMode ? 'bg-rose-600 text-white shadow-rose-600/25' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {settings.maintenanceMode ? 'Bakım Modunu Kapat' : 'Bakım Modunu Aktif Et'}
                  </button>
                  {settings.maintenanceMode && (
                    <span className="text-xs text-rose-400 font-semibold animate-pulse">⚠️ Sunucu şu an bakım modunda!</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Global Oyun ve Sistem Ayarları</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Toggles */}
                <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block mb-2 font-semibold">Görsel ve Mekanik Toggles</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">3D Kart Döndürme Efekti</span>
                    <input
                      type="checkbox"
                      checked={settings.enable3DCardFlip}
                      onChange={() => handleToggle('enable3DCardFlip')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Özelleştirilmiş Mülk Set Kenar Işıması (Glow)</span>
                    <input
                      type="checkbox"
                      checked={settings.enablePropertySetGlow}
                      onChange={() => handleToggle('enablePropertySetGlow')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Masaüstü Hover Kart Önizleme Paneli (Sidebar)</span>
                    <input
                      type="checkbox"
                      checked={settings.enableHoverCardSidebar}
                      onChange={() => handleToggle('enableHoverCardSidebar')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Günlük Görevleri Göster</span>
                    <input
                      type="checkbox"
                      checked={settings.questsEnabled}
                      onChange={() => handleToggle('questsEnabled')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Dünya Sıralaması (League) Aktif</span>
                    <input
                      type="checkbox"
                      checked={settings.rankedLeagueEnabled}
                      onChange={() => handleToggle('rankedLeagueEnabled')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Pratik Modunda Hamle Geri Alma (Undo)</span>
                    <input
                      type="checkbox"
                      checked={settings.enableUndoInTraining}
                      onChange={() => handleToggle('enableUndoInTraining')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Karakter Seslendirmelerini Etkinleştir (TR/EN)</span>
                    <input
                      type="checkbox"
                      checked={settings.enableSystemVoiceovers}
                      onChange={() => handleToggle('enableSystemVoiceovers')}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Rules Sliders */}
                <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-6">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block mb-2 font-semibold">Kural Limitleri</span>
                  {/* Slider 1 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Sıra Süresi Zaman Aşımı (AFK)</span>
                      <span className="text-indigo-400 font-bold">{settings.turnTimeoutSeconds} Saniye</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="120"
                      step="5"
                      value={settings.turnTimeoutSeconds}
                      onChange={(e) => handleSliderChange('turnTimeoutSeconds', Number(e.target.value))}
                      onMouseUp={() => handleSaveSettings()}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  {/* Slider 2 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Karar & Ödeme Yanıt Süresi Sınırı</span>
                      <span className="text-indigo-400 font-bold">{settings.actionTimeoutSeconds} Saniye</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={settings.actionTimeoutSeconds}
                      onChange={(e) => handleSliderChange('actionTimeoutSeconds', Number(e.target.value))}
                      onMouseUp={() => handleSaveSettings()}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  {/* Slider 3 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Kazanmak İçin Gereken Set Sayısı</span>
                      <span className="text-indigo-400 font-bold">{settings.targetSets} Set</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="5"
                      step="1"
                      value={settings.targetSets}
                      onChange={(e) => handleSliderChange('targetSets', Number(e.target.value))}
                      onMouseUp={() => handleSaveSettings()}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                  {/* Slider 4 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Altın Ödülü Çarpanı (Event boost)</span>
                      <span className="text-indigo-400 font-bold">{settings.goldMultiplier}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.5"
                      value={settings.goldMultiplier}
                      onChange={(e) => handleSliderChange('goldMultiplier', Number(e.target.value))}
                      onMouseUp={() => handleSaveSettings()}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLAYERS */}
          {activeTab === 'players' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Oyuncu Profil & İlerleme Yönetimi</h3>
                <input
                  type="text"
                  placeholder="Kullanıcı adı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 w-64"
                />
              </div>

              {selectedPlayer && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-indigo-400">👤 {selectedPlayer.username} Profili Düzenleniyor</h4>
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Kapat
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Altın Bakiyesi</label>
                      <input
                        type="number"
                        value={editCoins}
                        onChange={(e) => setEditCoins(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Seviye (Level)</label>
                      <input
                        type="number"
                        value={editLevel}
                        onChange={(e) => setEditLevel(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Deneyim Puanı (XP)</label>
                      <input
                        type="number"
                        value={editXp}
                        onChange={(e) => setEditXp(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleUpdatePlayer}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              )}

              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Oyuncu</th>
                      <th className="px-5 py-3">Seviye</th>
                      <th className="px-5 py-3">Altın</th>
                      <th className="px-5 py-3">Galibiyet / Toplam</th>
                      <th className="px-5 py-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredPlayers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-900/20">
                        <td className="px-5 py-3 font-semibold text-slate-200">{p.username}</td>
                        <td className="px-5 py-3 text-slate-300">Level {p.level} ({p.xp} XP)</td>
                        <td className="px-5 py-3 text-amber-400 font-bold">{p.coins} 🪙</td>
                        <td className="px-5 py-3 text-slate-400">{p.gamesWon} / {p.gamesPlayed} Maç</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => selectPlayerForEdit(p)}
                            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all"
                          >
                            Düzenle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: QUESTS */}
          {activeTab === 'quests' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Günlük Görev Havuzu Editörü</h3>

              {/* Add quest form */}
              <form onSubmit={handleAddQuest} className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Yeni Günlük Görev Ekle</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">Görev Açıklaması</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: 3 kira kartı oyna."
                      value={newQuestDesc}
                      onChange={(e) => setNewQuestDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Hedef (Target)</label>
                      <input
                        type="number"
                        value={newQuestTarget}
                        onChange={(e) => setNewQuestTarget(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Altın Ödülü</label>
                      <input
                        type="number"
                        value={newQuestCoins}
                        onChange={(e) => setNewQuestCoins(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">XP Ödülü</label>
                      <input
                        type="number"
                        value={newQuestXp}
                        onChange={(e) => setNewQuestXp(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                >
                  Görevi Havuza Gönder
                </button>
              </form>

              {/* Active Quests Pool List */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 space-y-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Aktif Havuzdaki Görevler ({quests.length})</span>
                <div className="space-y-2">
                  {quests.map((q) => (
                    <div key={q.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{q.description}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Hedef Sınırı: {q.targetValue} | Ödül: {q.rewardCoins} Altın, {q.rewardXp} XP</p>
                      </div>
                      <button
                        onClick={() => handleDeleteQuest(q.id)}
                        className="p-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-all"
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                  {quests.length === 0 && (
                    <p className="text-slate-500 text-center py-6 text-xs">Havuzda tanımlı özel görev yok. Sunucu yerel varsayılanları kullanacak.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: TOURNAMENTS */}
          {activeTab === 'tournaments' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Yeni Canlı Turnuva Başlatma Paneli</h3>

              <form onSubmit={handleCreateTournament} className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">Turnuva Yapılandırması</span>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">Turnuva İsmi</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Monopoly Deal Türkiye Ligi"
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">Katılımcılar (Virgülle ayırın)</label>
                    <textarea
                      required
                      rows={3}
                      value={tournamentPlayers}
                      onChange={(e) => setTournamentPlayers(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <p className="text-[9px] text-slate-500">Katılımcı isimlerini virgülle ayırarak girin (Örn: Oyuncu1, Bot Memo, Bot Can).</p>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                >
                  Turnuva Kurasını Çek ve Başlat
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: DYNAMIC TRANSLATIONS */}
          {activeTab === 'translations' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-200">Çoklu Dil & Kelime Düzenleyici</h3>
                  <p className="text-xs text-slate-500 mt-1">Oyun genelindeki tüm metinleri, kart adlarını ve butonları anlık olarak düzenleyin.</p>
                </div>
                <button
                  onClick={() => handleSaveTranslations()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
                >
                  💾 Çevirileri Kaydet
                </button>
              </div>

              {/* Grid: Forms to Add Language & Keys */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form 1: Add Language */}
                <form onSubmit={handleAddLanguage} className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Yeni Dil Ekle</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Dil Kodu (Örn: fr, de, es, ru)"
                      value={newLangCode}
                      onChange={(e) => setNewLangCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white cursor-pointer"
                    >
                      Ekle
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Yeni dil eklendiğinde, sistem otomatik olarak Türkçe (tr) dilindeki tüm kelimeleri yeni dile kopyalayacaktır.
                  </p>
                </form>

                {/* Form 2: Add Word/Key */}
                <form onSubmit={handleAddTranslationKey} className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Yeni Kelime Anahtarı Ekle</span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      placeholder="Kelime Anahtarı (Örn: lobby_welcome)"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Varsayılan Değer (TR)"
                        value={newKeyDefaultVal}
                        onChange={(e) => setNewKeyDefaultVal(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white cursor-pointer"
                      >
                        Anahtar Ekle
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Translation Editing Panel */}
              <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 uppercase font-bold">Düzenlenecek Dil:</span>
                    <div className="flex gap-1">
                      {Object.keys(translations).map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setEditingLang(lang)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                            editingLang === lang
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Key Input */}
                  <input
                    type="text"
                    placeholder="Kelime ara..."
                    value={transSearch}
                    onChange={(e) => setTransSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
                  />
                </div>

                {/* Table of Keys */}
                <div className="max-h-[400px] overflow-y-auto border border-slate-850 rounded-xl scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="p-3 w-1/3 border-b border-slate-800">Anahtar</th>
                        <th className="p-3 w-2/3 border-b border-slate-800">Metin / Değer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {Object.keys(translations[editingLang] || {})
                        .filter(key => key.toLowerCase().includes(transSearch.toLowerCase()) || (translations[editingLang]?.[key] || '').toLowerCase().includes(transSearch.toLowerCase()))
                        .map((key) => (
                          <tr key={key} className="hover:bg-slate-900/25 transition-colors">
                            <td className="p-3 font-mono text-slate-400 select-all font-semibold break-all">{key}</td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={translations[editingLang]?.[key] || ''}
                                onChange={(e) => handleTranslationChange(editingLang, key, e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-850 text-slate-200 focus:outline-none focus:border-indigo-600 focus:bg-slate-950 transition-all font-semibold"
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voices' && (
            <div className="space-y-6">
              <div className="border-b border-slate-900 pb-4">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-200">Karakter Seslendirmeleri Yönetimi</h3>
                <p className="text-xs text-slate-500 mt-1">Oynanan kart hamlelerinin seslendirme dosyalarını (.mp3) yükleyin ve test edin.</p>
              </div>

              <div className="bg-slate-900/20 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="p-3 border-b border-slate-800">Hamle / Kart</th>
                        <th className="p-3 border-b border-slate-800">Duyulma Kapsamı</th>
                        <th className="p-3 border-b border-slate-800">Dosya Adı</th>
                        <th className="p-3 border-b border-slate-800 text-center">Türkçe Ses (TR)</th>
                        <th className="p-3 border-b border-slate-800 text-center">İngilizce Ses (EN)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs">
                      {voices.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/25 transition-colors">
                          <td className="p-3 font-semibold text-slate-200">{item.name}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.scope === 'global'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : item.scope === 'duel'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {item.scope === 'global'
                                ? 'Herkes (Küresel)'
                                : item.scope === 'duel'
                                  ? 'Aktör ve Hedef'
                                  : 'Sadece Aktör'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-[11px]">{item.filename}</td>
                          
                          {/* TR Column */}
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              {item.trExists ? (
                                <button
                                  onClick={() => playPreview(item.filename, 'tr')}
                                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                >
                                  🔊 Dinle
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-semibold italic">Yüklenmedi</span>
                              )}
                              
                              <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer border border-slate-750 flex items-center justify-center min-w-[70px]">
                                {uploadLoading === `${item.id}_tr` ? (
                                  <span className="animate-spin inline-block w-2.5 h-2.5 border-2 border-slate-300 border-t-transparent rounded-full" />
                                ) : (
                                  'Dosya Seç'
                                )}
                                <input
                                  type="file"
                                  accept=".mp3"
                                  onChange={(e) => handleUploadVoice(e, item, 'tr')}
                                  className="hidden"
                                  disabled={uploadLoading !== null}
                                />
                              </label>
                            </div>
                          </td>

                          {/* EN Column */}
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              {item.enExists ? (
                                <button
                                  onClick={() => playPreview(item.filename, 'en')}
                                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold border border-emerald-500/30 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                >
                                  🔊 Dinle
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-semibold italic">Yüklenmedi</span>
                              )}
                              
                              <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] transition-all cursor-pointer border border-slate-750 flex items-center justify-center min-w-[70px]">
                                {uploadLoading === `${item.id}_en` ? (
                                  <span className="animate-spin inline-block w-2.5 h-2.5 border-2 border-slate-300 border-t-transparent rounded-full" />
                                ) : (
                                  'Dosya Seç'
                                )}
                                <input
                                  type="file"
                                  accept=".mp3"
                                  onChange={(e) => handleUploadVoice(e, item, 'en')}
                                  className="hidden"
                                  disabled={uploadLoading !== null}
                                />
                              </label>
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
