import React from 'react';
import { UserProfile } from './types';
import { MainMenu } from './components/MainMenu';
import { GameRoom } from './components/GameRoom';
import { sounds } from './lib/SoundSystem';

export default function App() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = React.useState('');
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Navigation states
  const [currentRoom, setCurrentRoom] = React.useState<{ roomId: string; isOffline: boolean } | null>(null);

  // Authenticate user on startup or after input
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() === '') return;

    setLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput }),
      });

      if (response.ok) {
        const user = await response.json();
        setProfile(user);

        // Play welcome sound!
        sounds.playCoin(user.settings);
      } else {
        const err = await response.json();
        setAuthError(err.error || 'Giriş yapılamadı.');
      }
    } catch (err) {
      setAuthError('Sunucu bağlantısı kurulamadı. Lütfen sunucunun çalıştığından emin olun.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setProfile(updated);

    // Sync with the server database!
    fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: updated.id,
        avatarUrl: updated.avatarUrl,
        gamesHistory: updated.gamesHistory,
        coins: updated.coins,
        xp: updated.xp,
        stats: updated.stats,
        dailyQuests: updated.dailyQuests,
        achievements: updated.achievements,
      }),
    })
      .then((res) => {
        if (!res.ok) console.error('Profil sunucuyla senkronize edilemedi.');
      })
      .catch((err) => console.error('Senkronizasyon hatası:', err));
  };

  const handleJoinRoom = (roomId: string, isOffline: boolean) => {
    setCurrentRoom({ roomId, isOffline });
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    // Refresh user profile stats on game completion
    if (profile) {
      fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.username }),
      })
        .then((res) => {
          if (res.ok) return res.json();
        })
        .then((data) => {
          if (data) setProfile(data);
        })
        .catch(console.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] flex flex-col justify-between selection:bg-red-500 selection:text-white">

      {/* 1. Login State */}
      {!profile ? (
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-16">
          <div className="w-full max-w-md bg-black/40 border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Background glowing effects */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-600/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-slate-500/5 blur-3xl" />

            <div className="text-center space-y-4 relative">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg shadow-red-900/40 text-white italic">
                  M
                </div>
                <h1 className="text-xl font-bold tracking-tight uppercase italic text-white">
                  Deal Master <span className="text-red-500">PRO</span>
                </h1>
              </div>
              <h2 className="font-extrabold text-sm text-slate-300 tracking-tight mt-2">
                Kart Oyunu Arenası
              </h2>
              <p className="text-xs text-slate-400">
                Eş zamanlı çok oyunculu, sesli sohbetli ve bot pratikli modern Deal Master PRO deneyimi.
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4 relative">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-bold block">
                  Kullanıcı Adınız (Nickname)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Deal Master PRO Kralı"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  disabled={loading}
                  maxLength={16}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 placeholder:text-slate-500 transition-all focus:ring-1 focus:ring-red-500/30"
                />
              </div>

              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs flex items-center gap-1.5">
                  <span>⚠️</span> {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || usernameInput.trim() === ''}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transform active:scale-95"
              >
                {loading ? 'Yükleniyor...' : 'Arenaya Giriş Yap 🚀'}
              </button>
            </form>

            <div className="border-t border-white/10 pt-4 text-center">
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                Platform ve Cihaz Uyumluluğu
              </span>
              <p className="text-[9px] text-slate-400 mt-1">
                Hem masaüstü tarayıcılarda hem de mobil tarayıcılarda tam dokunmatik hassasiyeti ve optimize performans.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Navigation Flow */
        <div className="flex-1 flex flex-col">
          {currentRoom ? (
            <GameRoom
              roomId={currentRoom.roomId}
              isOffline={currentRoom.isOffline}
              profile={profile}
              onLeaveRoom={handleLeaveRoom}
              onUpdateProfile={handleUpdateProfile}
            />
          ) : (
            <MainMenu
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onJoinRoom={handleJoinRoom}
            />
          )}
        </div>
      )}
    </div>
  );
}
