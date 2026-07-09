import React from 'react';
import { UserProfile, Friend, DailyQuest } from '../types';
import { sounds } from '../lib/SoundSystem';
import { AvatarWithFrame } from './AvatarWithFrame';
import { PerformanceChart } from './PerformanceChart';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const ProfilePanel: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [friendUsername, setFriendUsername] = React.useState('');
  const [friendError, setFriendError] = React.useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = React.useState<string | null>(null);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendError(null);
    setFriendSuccess(null);

    if (friendUsername.trim() === '') return;

    try {
      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, targetUsername: friendUsername }),
      });

      if (response.ok) {
        const data = await response.json();
        const updated = {
          ...profile,
          friends: data.friends,
        };
        onUpdateProfile(updated);
        setFriendSuccess(`${friendUsername} arkadaş olarak başarıyla eklendi!`);
        setFriendUsername('');
        sounds.playCoin(profile.settings);
      } else {
        const err = await response.json();
        setFriendError(err.error || 'Arkadaş ekleme başarısız.');
        sounds.playAlert(profile.settings);
      }
    } catch (err) {
      setFriendError('Sunucu bağlantı hatası oluştu.');
      sounds.playAlert(profile.settings);
    }
  };

  const handleClaimQuest = async (questId: string) => {
    try {
      const response = await fetch('/api/quests/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, questId }),
      });

      if (response.ok) {
        const data = await response.json();
        const updated = {
          ...profile,
          coins: data.coins,
          dailyQuests: data.dailyQuests,
        };
        onUpdateProfile(updated);
        sounds.playCoin(profile.settings);
      }
    } catch (e) {
      console.error('Failed to claim quest reward', e);
    }
  };

  const nextLevelXp = 500;
  const xpPercentage = Math.min(100, (profile.xp % nextLevelXp) / (nextLevelXp / 100));

  return (
    <div id="profile-panel" className="max-w-5xl mx-auto space-y-6 text-white p-2">
      {/* Upper Grid: Profile Summary and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Info & XP Card */}
        <div className="md:col-span-1 bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <AvatarWithFrame
                avatarId={profile.avatarId}
                frameId={profile.settings.profileFrame || 'frame_none'}
                sizeClassName="w-16 h-16 text-3xl"
              />
              <div>
                <h3 className="font-bold text-xl text-white">{profile.username}</h3>
                <span className="text-xs text-red-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-full inline-block mt-1">
                  Seviye {profile.level}
                </span>
              </div>
            </div>

            {/* XP progress bar */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>XP Gelişimi</span>
                <span className="text-red-400 font-semibold">{profile.xp % nextLevelXp} / {nextLevelXp} XP</span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-500"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4 flex justify-between items-center text-sm">
            <span className="text-slate-400">Kazanılan Altın:</span>
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-md shadow-yellow-400/20"></div>
              {profile.coins} Altın
            </span>
          </div>
        </div>

        {/* Player Stats Card */}
        <div className="md:col-span-2 bg-black/20 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">Maç İstatistikleri</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
              <span className="text-2xl font-black text-slate-200">{profile.stats.gamesPlayed}</span>
              <p className="text-xs text-slate-400 mt-1">Toplam Maç</p>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
              <span className="text-2xl font-black text-red-500">{profile.stats.gamesWon}</span>
              <p className="text-xs text-slate-400 mt-1">Kazanma</p>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
              <span className="text-2xl font-black text-slate-500">{profile.stats.gamesLost}</span>
              <p className="text-xs text-slate-400 mt-1">Kaybetme</p>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
              <span className="text-2xl font-black text-red-400">
                {profile.stats.gamesPlayed > 0
                  ? Math.round((profile.stats.gamesWon / profile.stats.gamesPlayed) * 100)
                  : 0}%
              </span>
              <p className="text-xs text-slate-400 mt-1">Kazanma Oranı</p>
            </div>
          </div>

          {/* Additional details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm text-slate-300">
            <div className="flex justify-between p-2.5 bg-black/40 border border-white/5 rounded-lg">
              <span>Toplanan Kira Bedeli:</span>
              <span className="font-bold text-red-400">{profile.stats.totalRentCollected}M</span>
            </div>
            <div className="flex justify-between p-2.5 bg-black/40 border border-white/5 rounded-lg">
              <span>Çalınan Kart Sayısı:</span>
              <span className="font-bold text-red-400">{profile.stats.totalCardsStolen} Kart</span>
            </div>
            <div className="flex justify-between p-2.5 bg-black/40 border border-white/5 rounded-lg">
              <span>Tamamlanan Arsa Seti:</span>
              <span className="font-bold text-red-400">{profile.stats.totalSetsCompleted} Set</span>
            </div>
            <div className="flex justify-between p-2.5 bg-black/40 border border-white/5 rounded-lg">
              <span>Banka Kasası Toplamı:</span>
              <span className="font-bold text-red-400">{profile.stats.totalMoneyBanked}M</span>
            </div>
          </div>
        </div>

        {/* D3 Performance Chart Full-Width Card */}
        <div className="col-span-1 md:col-span-3">
          <PerformanceChart stats={profile.stats} />
        </div>
      </div>

      {/* Middle Grid: Friends and Daily Quests */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Friends Management Panel */}
        <div className="bg-black/20 border border-white/10 rounded-2xl p-6 md:col-span-1 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Arkadaşlar ({profile.friends.length})</h3>

          {/* Add Friend Form */}
          <form onSubmit={handleAddFriend} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Kullanıcı adı yazın..."
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-all"
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all transform active:scale-95"
              >
                Ekle
              </button>
            </div>
            {friendError && <p className="text-xs text-red-400 mt-1">{friendError}</p>}
            {friendSuccess && <p className="text-xs text-emerald-400 mt-1">{friendSuccess}</p>}
          </form>

          {/* Friends List */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {profile.friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm border border-slate-700">
                    👤
                  </div>
                  <div>
                    <span className="font-semibold text-xs block text-white">{friend.username}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${friend.status === 'online' ? 'bg-red-500' : 'bg-slate-600'}`} />
                      {friend.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                    </span>
                  </div>
                </div>
                {friend.status === 'online' && (
                  <button
                    onClick={() => sounds.playPlay(profile.settings)}
                    className="text-[10px] bg-red-500/15 border border-red-500/25 text-red-400 px-2 py-1 rounded hover:bg-red-600 hover:text-white font-bold transition-all cursor-pointer"
                  >
                    Davet Et
                  </button>
                )}
              </div>
            ))}
            {profile.friends.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-4">Henüz arkadaş eklenmemiş.</p>
            )}
          </div>
        </div>

        {/* Daily Quests and Achievements Panel */}
        <div className="bg-black/20 border border-white/10 rounded-2xl p-6 md:col-span-2 space-y-6 shadow-2xl">
          
          {/* Daily Quests */}
          <div>
            <h3 className="text-lg font-bold text-red-500 mb-3 flex items-center gap-2">
              <span>📅</span> Günlük Görevler ve Ödüller
            </h3>
            <div className="space-y-3">
              {profile.dailyQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <span className="text-xs text-slate-300 font-medium block">{quest.description}</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="bg-red-500 h-full"
                          style={{ width: `${(quest.currentValue / quest.targetValue) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {quest.currentValue} / {quest.targetValue}
                      </span>
                    </div>
                  </div>

                  <div>
                    {quest.claimed ? (
                      <span className="text-xs text-slate-500 font-bold bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                        Alındı
                      </span>
                    ) : quest.completed ? (
                      <button
                        onClick={() => handleClaimQuest(quest.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 shadow"
                      >
                        Claim 💰{quest.rewardCoins}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 font-bold bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 inline-block">
                        💰{quest.rewardCoins}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-lg font-bold text-red-500 mb-3 flex items-center gap-2">
              <span>🏆</span> Kalıcı Başarılar (Achievements)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.achievements.map((ach) => (
                <div key={ach.id} className="bg-black/40 border border-white/5 rounded-xl p-3 flex flex-col justify-between hover:border-white/10 transition-all">
                  <div>
                    <h4 className="font-bold text-xs text-red-400">{ach.title}</h4>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{ach.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-bold">
                      +{ach.rewardCoins} Altın
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">Maçlarla İlerler</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
