import React from 'react';
import { UserProfile } from '../types';
import { sounds } from '../lib/SoundSystem';

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

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const AdminPanel: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'settings' | 'users' | 'system'>('settings');
  const [settings, setSettings] = React.useState<AdminSettings>({
    turnDuration: 30,
    botDelay: 1800,
    extraTimeEnabled: true,
    unlimitedDoubleRent: false,
    winCoins: 200,
    xpLevelRate: 500,
    winSetsTarget: 3,
    autoEndTurn: false,
    gameMode: 'classic',
  });
  
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [editCoins, setEditCoins] = React.useState<number>(0);
  const [editLevel, setEditLevel] = React.useState<number>(1);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Fetch admin settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playCoin(profile.settings);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSaveSuccess('Sistem ayarları başarıyla kaydedildi!');
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    sounds.playCoin(profile.settings);
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coins: editCoins, level: editLevel }),
      });
      if (res.ok) {
        setEditingUserId(null);
        fetchUsers();
        // If updating oneself, update local profile too
        if (userId === profile.id) {
          onUpdateProfile({ ...profile, coins: editCoins, level: editLevel });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) return;
    sounds.playPlay(profile.settings);
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-950/60 border border-white/5 rounded-3xl p-4 sm:p-6 w-full shadow-2xl backdrop-blur-xl relative overflow-hidden animate-fade-in col-span-1 lg:col-span-3">
      {/* Glow lines */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 mb-6 gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            🛡️ YÖNETİM (ADMIN) PANELİ
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
            Sunucu parametrelerini düzenleyin, kullanıcı bakiyelerini yönetin ve sistem ayarlarına müdahale edin.
          </p>
        </div>

        {/* Tab selection menu */}
        <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 self-stretch sm:self-auto">
          {[
            { id: 'settings', label: '⚙️ Oyun Ayarları' },
            { id: 'users', label: '👤 Kullanıcılar' },
            { id: 'system', label: '🔌 Sistem Durumu' },
          ].map((subTab) => (
            <button
              key={subTab.id}
              onClick={() => {
                setActiveSubTab(subTab.id as any);
                sounds.playPlay(profile.settings);
              }}
              className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition-all whitespace-nowrap ${
                activeSubTab === subTab.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {subTab.label}
            </button>
          ))}
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-1.5 animate-pulse">
          <span>✅</span> {saveSuccess}
        </div>
      )}

      {/* 1. SETTINGS TAB */}
      {activeSubTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Game Mode */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                🎮 Oyun Modu (Eğlenceli Modlar)
              </label>
              <select
                value={settings.gameMode}
                onChange={(e) => setSettings({ ...settings, gameMode: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
              >
                <option value="classic" className="bg-slate-950">Klasik Monopoly Deal</option>
                <option value="chaos" className="bg-slate-950">💥 Kaos Modu (Hamle Sınırsız / +4 Kart Çekme)</option>
                <option value="speed" className="bg-slate-950">⚡ Hızlı Monopoly (2 Set Kazanma / 15s Tur)</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Sıradışı kurallarla eğlenceli ve heyecanlı farklı oyun türlerini aktif eder.</span>
            </div>

            {/* Turn Duration */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                ⏱️ Oyuncu Tur Süresi (Süre Sınırı)
              </label>
              <select
                value={settings.turnDuration}
                onChange={(e) => setSettings({ ...settings, turnDuration: Number(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                disabled={settings.gameMode === 'speed'}
              >
                <option value={15} className="bg-slate-950">15 Saniye (Yıldırım Hızı)</option>
                <option value={30} className="bg-slate-950">30 Saniye (Standart)</option>
                <option value={60} className="bg-slate-950">1 Dakika (Rahat)</option>
                <option value={99999} className="bg-slate-950">Sınırsız Süre</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Her oyuncunun sırası geldiğinde hamle yapabileceği maksimum süre. (Hızlı modda 15s kilitlidir).</span>
            </div>

            {/* Win Target Sets */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                🏆 Gerekli Set Hedefi (Kazanma Koşulu)
              </label>
              <select
                value={settings.winSetsTarget}
                onChange={(e) => setSettings({ ...settings, winSetsTarget: Number(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all cursor-pointer"
                disabled={settings.gameMode === 'speed'}
              >
                <option value={2} className="bg-slate-950">2 Tamamlanmış Set (Kısa Maç)</option>
                <option value={3} className="bg-slate-950">3 Tamamlanmış Set (Klasik Kural)</option>
                <option value={4} className="bg-slate-950">4 Tamamlanmış Set (Uzun Stratejik)</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Oyunu kazanmak için tamamlanması gereken farklı renklerdeki arsa seti sayısı.</span>
            </div>

            {/* Bot Delay */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                🤖 YZ Bot Karar Hızı (Milisaniye)
              </label>
              <input
                type="number"
                min={500}
                max={5000}
                step={100}
                value={settings.botDelay}
                onChange={(e) => setSettings({ ...settings, botDelay: Number(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
              />
              <span className="text-[9px] text-slate-500 block">Varsayılan: 1800ms. Yapay zekanın hamleleri arasındaki bekleme hızı.</span>
            </div>

            {/* Win Coins Reward */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                💰 Maç Kazanma Altın Ödülü
              </label>
              <input
                type="number"
                min={10}
                max={1000}
                value={settings.winCoins}
                onChange={(e) => setSettings({ ...settings, winCoins: Number(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
              />
              <span className="text-[9px] text-slate-500 block">Varsayılan: 200 Altın. Maç kazanan oyuncuya verilecek cüzdan ödülü.</span>
            </div>

            {/* Level Rate */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                📈 Seviye Başı Gerekli XP Oranı
              </label>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={settings.xpLevelRate}
                onChange={(e) => setSettings({ ...settings, xpLevelRate: Number(e.target.value) })}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
              />
              <span className="text-[9px] text-slate-500 block">Varsayılan: 500 XP. Oyuncunun her seviye atlaması için gereken deneyim.</span>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Auto End Turn Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.autoEndTurn}
                onChange={(e) => setSettings({ ...settings, autoEndTurn: e.target.checked })}
                className="mt-0.5 rounded border-white/10 text-red-600 focus:ring-red-500/30"
              />
              <div>
                <span className="text-xs font-bold text-white block">🤖 Hamle Sınırında Sırayı Otomatik Bitir</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Oyuncu maksimum hamle sınırına (3 kart oynamaya) ulaştığında turu otomatik sonlandırır.</span>
              </div>
            </label>

            {/* Extra Time Checkbox */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 cursor-pointer select-none" style={{ opacity: settings.gameMode === 'speed' ? 0.4 : 1 }}>
              <input
                type="checkbox"
                checked={settings.extraTimeEnabled}
                onChange={(e) => setSettings({ ...settings, extraTimeEnabled: e.target.checked })}
                disabled={settings.gameMode === 'speed'}
                className="mt-0.5 rounded border-white/10 text-red-600 focus:ring-red-500/30"
              />
              <div>
                <span className="text-xs font-bold text-white block">⏱️ Hamle Başı Ek Süre (+10s)</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Her kart oynandığında oyuncunun süresine 10 saniye ekler. (Hızlı modda deaktiftir).</span>
              </div>
            </label>

            {/* Unlimited Double Rent */}
            <label className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.unlimitedDoubleRent}
                onChange={(e) => setSettings({ ...settings, unlimitedDoubleRent: e.target.checked })}
                className="mt-0.5 rounded border-white/10 text-red-600 focus:ring-red-500/30"
              />
              <div>
                <span className="text-xs font-bold text-white block">🔥 Sınırsız Çift Kira Kuralı</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Aynı turda birden fazla Çift Kira kartı oynanmasına izin verir.</span>
              </div>
            </label>
          </div>

          <div className="border-t border-white/5 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all transform active:scale-95 flex items-center gap-2"
            >
              {loading ? 'Kaydediliyor...' : '⚙️ AYARLARI KAYDET'}
            </button>
          </div>
        </form>
      )}

      {/* 2. USERS TAB */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 text-xs pointer-events-none">🔍</span>
            <input
              type="text"
              placeholder="Kullanıcı adına göre filtrele..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-slate-500 transition-all"
            />
          </div>

          {/* User List Table */}
          <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/20 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] sm:text-[10px] text-slate-400 uppercase font-black">
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3">Seviye & XP</th>
                  <th className="p-3">Altın</th>
                  <th className="p-3">Maç İstatistikleri</th>
                  <th className="p-3 text-right">Eylemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                {filteredUsers.map((u) => {
                  const isEditing = editingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="p-3 font-bold flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center">👤</span>
                        <div>
                          <span className="text-white block leading-none">{u.username}</span>
                          <span className="text-[8px] text-slate-500 block mt-1">ID: {u.id}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={editLevel}
                            onChange={(e) => setEditLevel(Number(e.target.value))}
                            className="bg-slate-950 border border-white/15 w-12 rounded px-1.5 py-0.5 text-xs text-white text-center font-bold"
                          />
                        ) : (
                          <span>Level {u.level} <span className="text-slate-500 text-[10px]">({u.xp} XP)</span></span>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            max={999999}
                            value={editCoins}
                            onChange={(e) => setEditCoins(Number(e.target.value))}
                            className="bg-slate-950 border border-white/15 w-20 rounded px-1.5 py-0.5 text-xs text-amber-300 text-center font-bold"
                          />
                        ) : (
                          <span className="text-amber-300 font-mono font-bold">💰 {u.coins}</span>
                        )}
                      </td>
                      <td className="p-3 text-[10px] text-slate-400">
                        🕹️ {u.stats.gamesPlayed} Oynama / 🏆 {u.stats.gamesWon} Galibiyet
                      </td>
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdateUser(u.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px] shadow"
                            >
                              Kaydet
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[9px]"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditCoins(u.coins);
                                setEditLevel(u.level);
                                sounds.playPlay(profile.settings);
                              }}
                              className="px-2.5 py-1 bg-slate-850 hover:bg-slate-700 hover:text-white border border-white/5 text-slate-300 rounded font-bold text-[9px]"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.username === 'admin'}
                              className="px-2.5 py-1 bg-red-950/40 hover:bg-red-600 hover:text-white border border-red-500/10 text-red-400 rounded font-bold text-[9px] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Sil
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500 italic text-xs">
                      Hiç kayıtlı kullanıcı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SYSTEM TAB */}
      {activeSubTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* DB Status */}
            <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/20 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-black block">VERİTABANI</span>
              <span className="text-sm font-bold block text-white">
                {users.length > 0 && users.some(u => u.username === 'admin') ? 'Supabase Cloud (Canlı)' : 'Local File JSON (data/users.json)'}
              </span>
              <span className="text-[9px] text-emerald-400 flex items-center gap-1 mt-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Çevrimiçi & Aktif
              </span>
            </div>

            {/* Total Users */}
            <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/20 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-black block">KAYITLI KULLANICILAR</span>
              <span className="text-sm font-bold block text-white">{users.length} Oyuncu</span>
              <span className="text-[9px] text-slate-500 block mt-1 font-bold">Toplam veritabanı kaydı</span>
            </div>

            {/* Environment status */}
            <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/20 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-black block">SUNUCU PORTU</span>
              <span className="text-sm font-bold block text-white">3000 / Websocket Aktif</span>
              <span className="text-[9px] text-slate-500 block mt-1 font-bold">Vite 6.2.3 Dev & Prod Mode</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-dashed border-red-500/20 bg-red-950/5 space-y-3">
            <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              ⚠️ KRİTİK ADMİN EYLEMLERİ
            </h4>
            <p className="text-[10px] text-slate-400">
              Aşağıdaki eylemler sunucuyu veya verileri kalıcı olarak etkiler. Dikkatli kullanın.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={async () => {
                  if (!confirm('Tüm oyuncu hesaplarını silmek ve veritabanını sıfırlamak istediğinize emin misiniz?')) return;
                  sounds.playPlay(profile.settings);
                  for (const u of users) {
                    if (u.username !== 'admin') {
                      await fetch('/api/admin/users/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: u.id }),
                      });
                    }
                  }
                  fetchUsers();
                }}
                className="py-1.5 px-3 bg-red-950 hover:bg-red-800 text-red-400 hover:text-white border border-red-500/20 rounded-lg text-[10px] font-black transition-all"
              >
                🚨 TÜM OYUNCULARI TEMİZLE (RESET DB)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
