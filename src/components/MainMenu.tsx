import React from 'react';
import { UserProfile, MatchState } from '../types';
import { ShopDialog } from './ShopDialog';
import { ProfilePanel } from './ProfilePanel';
import { CustomizationPanel } from './CustomizationPanel';
import { sounds } from '../lib/SoundSystem';
import { AvatarWithFrame } from './AvatarWithFrame';
import { AdminPanel } from './AdminPanel';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onJoinRoom: (roomId: string, isOffline: boolean) => void;
}

export const MainMenu: React.FC<Props> = ({ profile, onUpdateProfile, onJoinRoom }) => {
  const [activeTab, setActiveTab] = React.useState<'play' | 'bot_practice' | 'tournaments' | 'shop' | 'customization' | 'profile' | 'rules' | 'admin'>('play');
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [customRoomId, setCustomRoomId] = React.useState('');
  const [tournamentJoined, setTournamentJoined] = React.useState(false);
  const [activeTournament, setActiveTournament] = React.useState<any>({
    id: 't-1',
    name: 'Monopoly Deal Türkiye Kupası 2026',
    status: 'registration',
    participants: ['Bot Memo', 'Bot Can', 'Bot Defne', 'Milyoner Bot', 'Hızlı Zar Bot'],
    rounds: []
  });

  // Fetch active multiplayer lobbies
  const fetchLobbies = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (e) {
      console.error('Failed to fetch lobbies', e);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'play') {
      fetchLobbies();
      const interval = setInterval(fetchLobbies, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleCreateRoom = (offline: boolean = false) => {
    const rid = offline 
      ? `offline-${Math.random().toString(36).substr(2, 5)}`
      : customRoomId.trim() !== '' 
        ? customRoomId.trim() 
        : `oda-${Math.random().toString(36).substr(2, 5)}`;
    
    sounds.playPlay(profile.settings);
    onJoinRoom(rid, offline);
  };

  const handleJoinExistingRoom = (roomId: string) => {
    sounds.playPlay(profile.settings);
    onJoinRoom(roomId, false);
  };

  const handleRegisterTournament = () => {
    sounds.playCoin(profile.settings);
    setTournamentJoined(true);
    setActiveTournament((prev: any) => ({
      ...prev,
      status: 'active',
      participants: [...prev.participants, profile.username],
      rounds: [
        {
          roundNumber: 1,
          matches: [
            { id: 'tm-1', player1: 'Bot Memo', player2: 'Bot Can', score1: 3, score2: 2, status: 'completed', winner: 'Bot Memo' },
            { id: 'tm-2', player1: 'Bot Defne', player2: 'Milyoner Bot', score1: 1, score2: 3, status: 'completed', winner: 'Milyoner Bot' },
            { id: 'tm-3', player1: 'Hızlı Zar Bot', player2: profile.username, status: 'pending' }
          ]
        }
      ]
    }));
  };

  const handlePlayTournamentMatch = () => {
    sounds.playPlay(profile.settings);
    // Start bot practice match simulating tournament matchup
    onJoinRoom(`tournament-match-${Math.random().toString(36).substr(2, 5)}`, true);
  };

  return (
    <div id="main-menu" className="min-h-screen bg-[#0A0C10] text-white font-sans flex flex-col justify-between relative overflow-hidden">
      
      {/* Top Header bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center font-black text-lg sm:text-xl shadow-lg shadow-red-955/20 text-white italic">
            M
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-bold tracking-tight uppercase italic text-white leading-none mb-0.5 sm:mb-1">
              Deal Master <span className="text-red-500">PRO</span>
            </h1>
            <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold block leading-none">MOBİL & WEB DESTEKLİ</span>
          </div>
        </div>

        {/* Quick User summary */}
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-white/5">
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full shadow-md shadow-yellow-500/20"></div>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-300">💰 {profile.coins}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 border-l border-white/10 pl-2 sm:pl-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-400 font-medium leading-none">Level {profile.level}</p>
              <p className="text-sm font-bold text-slate-200 mt-1 leading-none">{profile.username}</p>
            </div>
            <AvatarWithFrame
              avatarId={profile.avatarId}
              frameId={profile.settings.profileFrame || 'frame_none'}
              sizeClassName="w-8 h-8 sm:w-10 sm:h-10 text-[10px] sm:text-xs"
            />
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start z-10">
        
        {/* Navigation Sidebar */}
        <nav className="lg:col-span-1 bg-black/20 border border-white/5 rounded-2xl p-2 sm:p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 whitespace-nowrap scrollbar-none">
          {(() => {
            const tabs = [
              { id: 'play', label: '🎮 Çok Oyunculu', color: 'hover:text-red-500' },
              { id: 'bot_practice', label: '🤖 Bot Pratik', color: 'hover:text-red-500' },
              { id: 'tournaments', label: '🏆 Turnuvalar', color: 'hover:text-red-500' },
              { id: 'shop', label: '🛒 Mağaza', color: 'hover:text-red-500' },
              { id: 'customization', label: '🎨 Özelleştir', color: 'hover:text-red-500' },
              { id: 'profile', label: '👤 Profil & İstatistik', color: 'hover:text-red-500' },
              { id: 'rules', label: '📜 Kurallar', color: 'hover:text-red-500' },
            ];
            
            if (profile.username.toLowerCase() === 'admin') {
              tabs.push({ id: 'admin', label: '🛡️ Yönetim Paneli', color: 'hover:text-red-500' });
            }

            return tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  sounds.playPlay(profile.settings);
                }}
                className={`flex-shrink-0 lg:w-full text-left px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-between gap-4 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-red-600/15 to-transparent border-l-4 border-red-500 text-red-400 font-bold shadow-lg shadow-red-600/5'
                    : `text-slate-400 ${tab.color} hover:bg-white/5`
                }`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.id && <span className="text-red-500 text-xs hidden lg:inline">●</span>}
              </button>
            ));
          })()}
        </nav>

        {/* Content Panel Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: Multiplayer Lobby */}
          {activeTab === 'play' && (
            <div className="bg-black/20 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Eş Zamanlı Çok Oyunculu Lobi</h3>
                  <p className="text-xs text-slate-400">Çevrimiçi gerçek oyuncularla odaya katılın veya yeni oda oluşturun</p>
                </div>
                
                {/* Create Room Actions */}
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                  <input
                    type="text"
                    placeholder="Özel Oda ID..."
                    value={customRoomId}
                    onChange={(e) => setCustomRoomId(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-all focus:ring-1 focus:ring-red-500/20"
                  />
                  <button
                    onClick={() => handleCreateRoom(false)}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95 transform"
                  >
                    Oda Kur
                  </button>
                </div>
              </div>

              {/* Lobbies List */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-300">Aktif Oyun Odaları ({rooms.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <div
                      key={room.roomId}
                      className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col justify-between hover:border-white/10 transition-all"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-xs text-red-400 bg-red-600/10 border border-red-500/10 px-2.5 py-0.5 rounded-full">
                            ID: {room.roomId}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            👥 {room.playerCount} Oyuncu
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mb-4 font-semibold">
                          Oyuncular: {room.players.join(', ')}
                        </p>
                      </div>

                      {room.status === 'lobby' || room.players.includes(profile.username) ? (
                        <button
                          onClick={() => handleJoinExistingRoom(room.roomId)}
                          className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-all active:scale-95 transform font-black"
                        >
                          {room.status === 'lobby' ? 'Odaya Katıl' : 'Oyuna Geri Dön'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 bg-white/5 text-slate-500 border border-white/5 font-bold rounded-lg text-xs cursor-not-allowed"
                        >
                          Oyun Devam Ediyor
                        </button>
                      )}
                    </div>
                  ))}

                  {rooms.length === 0 && (
                    <div className="col-span-2 text-center py-8 bg-black/10 rounded-xl border border-dashed border-white/5 text-slate-500 text-xs">
                      Aktif çok oyunculu oda bulunamadı. Kendi özel odanızı kurarak arkadaşlarınızı davet edin!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Bot Practice */}
          {activeTab === 'bot_practice' && (
            <div className="bg-black/20 border border-white/10 rounded-2xl p-6 text-center space-y-6 shadow-2xl">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 text-red-500 text-4xl rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/5">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-white">Bot Pratik Modu (Çevrimdışı)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  İnternet bağlantısına ihtiyaç duymadan akıllı bot rakiplere karşı kendinizi test edin. Kuralları öğrenmek, taktiklerinizi geliştirmek ve desteleri denemek için mükemmel bir fırsat!
                </p>

                <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-left space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">✔</span> Akıllı yapay zeka hamleleri
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">✔</span> Hızlı ve kesintisiz oynanış
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">✔</span> Pratik modu görevleriyle ödüller kazanma şansı
                  </div>
                </div>

                <button
                  onClick={() => handleCreateRoom(true)}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 transform text-sm"
                >
                  Hemen Pratik Maçı Başlat
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Tournaments */}
          {activeTab === 'tournaments' && (
            <div className="bg-black/20 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <span>🏆</span> Turnuva Sistemi
                </h3>
                <p className="text-xs text-slate-400">Turnuvalara kaydolun, rakiplerinizi eleyin ve şampiyonluk ödülü 1000 Altını kazanın!</p>
              </div>

              {!tournamentJoined ? (
                <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center space-y-4 max-w-md mx-auto">
                  <span className="text-4xl">👑</span>
                  <h4 className="font-extrabold text-red-500 uppercase tracking-tight">Monopoly Deal Türkiye Kupası 2026</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kayıtlar devam ediyor! Turnuva başladığında oyuncular rastgele eşleştirilir ve her turda en hızlı 3 galibiyete ulaşan bir üst tura yükselir.
                  </p>
                  <div className="flex items-center justify-between bg-black/60 px-4 py-3 rounded-xl border border-white/5 text-xs">
                    <span className="text-slate-400">Katılım Bedeli:</span>
                    <span className="font-bold text-amber-400">Ücretsiz (Giriş seviyesi)</span>
                  </div>
                  <button
                    onClick={handleRegisterTournament}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95 transform"
                  >
                    Turnuvaya Kaydol (Katıl)
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Bracket visualization */}
                  <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm text-red-400">1. Tur Brackets (Eşleşmeler)</h4>
                      <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/25 px-2.5 py-0.5 rounded-full font-bold">
                        Kaydınız Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeTournament.rounds[0].matches.map((m: any) => (
                        <div key={m.id} className="bg-black/50 border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-all">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className={m.winner === m.player1 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                {m.player1} {m.winner === m.player1 ? '👑' : ''}
                              </span>
                              <span className="font-bold text-slate-400">{m.score1 !== undefined ? m.score1 : '-'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className={m.winner === m.player2 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                {m.player2} {m.winner === m.player2 ? '👑' : ''}
                              </span>
                              <span className="font-bold text-slate-400">{m.score2 !== undefined ? m.score2 : '-'}</span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-2 border-t border-white/5 flex justify-between items-center">
                            <span className={`text-[10px] font-bold uppercase ${m.status === 'completed' ? 'text-slate-500' : 'text-red-500 animate-pulse'}`}>
                              {m.status === 'completed' ? 'Tamamlandı' : 'Sıra Sende'}
                            </span>
                            {m.status === 'pending' && (
                              <button
                                onClick={handlePlayTournamentMatch}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] rounded uppercase transition-all shadow shadow-red-600/10"
                              >
                                Maçı Oyna
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Shop */}
          {activeTab === 'shop' && <ShopDialog profile={profile} onUpdateProfile={onUpdateProfile} />}

          {/* TAB 5: Customization */}
          {activeTab === 'customization' && <CustomizationPanel profile={profile} onUpdateProfile={onUpdateProfile} />}

          {/* TAB 6: Profile */}
          {activeTab === 'profile' && <ProfilePanel profile={profile} onUpdateProfile={onUpdateProfile} />}

          {/* TAB 7: Rules / Instructions */}
          {activeTab === 'rules' && (
            <div className="bg-black/20 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-red-500">📜 Monopoly Deal Kuralları</h3>
                <p className="text-xs text-slate-400">Hızlıca öğrenip kazanmaya başlayın</p>
              </div>

              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div>
                  <h4 className="font-bold text-white mb-1 text-sm">1. Amaç</h4>
                  <p>Farklı renklerde tamamlanmış 3 tam arsa grubuna sahip olan ilk oyuncu oyunu kazanır.</p>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-1 text-sm">2. Sıra Sende Ne Yaparsın?</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Sıranın başında desteden 2 kart çekersin (hiç kartın yoksa 5 kart).</li>
                    <li>Sıran boyunca en fazla 3 kart oynayabilirsin (zorunlu değildir, oynamamayı da seçebilirsin).</li>
                    <li>Kartları bankana para olarak koyabilir, mülk grubuna ekleyebilir veya aksiyon olarak masaya oynayabilirsin.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-1 text-sm">3. Kritik Kartların İşlevleri</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-red-400">Anlaşma Bozan (Deal Breaker):</strong> Rakibin tamamlanmış tam bir mülk setini her şeyiyle çalar.</li>
                    <li><strong className="text-emerald-400">Hayır Teşekkürler (Just Say No):</strong> Sana karşı oynanan tüm aksiyonları durdurur.</li>
                    <li><strong className="text-amber-400">Sinsi Anlaşma (Sly Deal):</strong> Rakibin tamamlanmamış bir setindeki mülkü çalar.</li>
                    <li><strong className="text-blue-400">Zoraki Takas (Forced Deal):</strong> Rakiple mülk takas etmeni sağlar.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-white mb-1 text-sm">4. Ödeme Kuralları</h4>
                  <p>
                    Kira istendiğinde veya borç istendiğinde ödemeyi bankandaki paralardan veya önündeki mülklerden yapabilirsin. Ödemeler eldeki kartlardan YAPILMAZ. Eğer önünde hiç para veya mülk yoksa, ödeme yapmazsın (borç silinir, elindeki kartlara dokunulmaz).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: Admin Panel */}
          {activeTab === 'admin' && profile.username.toLowerCase() === 'admin' && (
            <AdminPanel profile={profile} onUpdateProfile={onUpdateProfile} />
          )}

        </div>
      </main>

      {/* Footer credits line */}
      <footer className="border-t border-white/10 py-4 text-center text-[10px] text-slate-500 bg-black/40 mt-8 z-10">
        © 2026 Monopoly Deal Online. Tüm Hakları Saklıdır. Responsive & Fullstack UI.
      </footer>
    </div>
  );
};
