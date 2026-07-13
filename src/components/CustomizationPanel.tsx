import React from 'react';
import { UserProfile, UserSettings } from '../types';
import { sounds } from '../lib/SoundSystem';
import { AvatarWithFrame } from './AvatarWithFrame';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

const THEME_OPTIONS = [
  { id: 'theme_slate', name: 'Kozmik Slate', color: '#1E293B', description: 'Koyu gri minimalist arka plan.' },
  { id: 'theme_green', name: 'Nane Yeşili', color: '#064E3B', description: 'Geleneksel yeşil  masası.' },
  { id: 'theme_purple', name: 'Kraliyet Moru', color: '#581C87', description: 'Altın detaylı zengin mor masa.' },
  { id: 'theme_cyberpunk', name: 'Siber Izgara', color: '#090D16', description: 'Fütüristik yüksek kontrastlı neon çizgileri.' },
];

const CARD_BACKS = [
  { id: 'back_classic', name: 'Klasik Kırmızı', color: '#EF5350', pattern: '◆' },
  { id: 'back_cosmic', name: 'Kozmik Siyah', color: '#0F172A', pattern: '★' },
  { id: 'back_gold', name: 'V.I.P Altın', color: '#D97706', pattern: '♛' },
  { id: 'back_neon', name: 'Retro Dalga', color: '#EC407A', pattern: '▲' },
];

const PROFILE_FRAMES = [
  { id: 'frame_none', name: 'Klasik Sınır', description: 'Standart sade çerçeve.' },
  { id: 'frame_neon', name: 'Neon Aura', description: 'Siberpunk parlayan pembe.' },
  { id: 'frame_gold', name: 'V.I.P Altın', description: 'Asil saf altın kaplama.' },
  { id: 'frame_fire', name: 'Volkanik Ateş', description: 'Ateşli lav ve köz tasarımı.' },
  { id: 'frame_royal', name: 'Kraliyet Elması', description: 'Göz alıcı mavi elmas süsü.' },
];

const CELEBRATION_SOUNDS = [
  { id: 'sound_classic', name: 'Klasik Melodi', description: 'Klasik retro zafer melodisi.' },
  { id: 'sound_applause', name: 'Coşkulu Alkış', description: 'Coşkulu alkışlama efekti.' },
  { id: 'sound_fireworks', name: 'Havai Fişek', description: 'Heyecanlı gökyüzü şenlik patlamaları.' },
  { id: 'sound_laser', name: 'Siber Lazer', description: 'Fütüristik retro lazer şovu.' },
  { id: 'sound_fanfare', name: 'Şampiyon Fanfarı', description: 'Asil zafer fanfar melodisi.' },
];

export const CustomizationPanel: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const currentSettings = profile.settings;

  const handleSoundTest = () => {
    sounds.playCoin(currentSettings);
  };

  const handleSaveSetting = async (key: keyof UserSettings, value: any) => {
    const updatedSettings = {
      ...currentSettings,
      [key]: value,
    };

    // Optmistic Update
    const updatedProfile = {
      ...profile,
      settings: updatedSettings,
      ...(key === 'avatarId' ? { avatarId: value } : {}),
    };
    onUpdateProfile(updatedProfile);

    // Persist on server
    try {
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, settings: { [key]: value } }),
      });
      if (response.ok) {
        const data = await response.json();
        // Play soft confirmation sound
        sounds.playPlay(updatedSettings);
      }
    } catch (e) {
      console.error('Failed to save settings on server', e);
    }
  };

  return (
    <div id="customization-panel" className="bg-black/20 border border-white/10 rounded-2xl p-6 text-white max-w-4xl mx-auto shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Kişiselleştirme ve Ayarlar</h2>
          <p className="text-slate-400 text-sm">Oyun içi ses, görseller ve masa temasını özelleştirin</p>
        </div>
        <button
          onClick={handleSoundTest}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2 transform active:scale-95"
        >
          <span>🔔</span> Test Sesi Çal
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Sound Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2">
            <span>🔊</span> Ses Sentezleyici Ayarları
          </h3>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Ana Ses Seviyesi</span>
              <span className="text-red-400 font-bold">%{currentSettings.soundVolume}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={currentSettings.soundVolume}
              onChange={(e) => handleSaveSetting('soundVolume', parseInt(e.target.value))}
              className="w-full accent-red-600 bg-white/10 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Ses Perdesi (Pitch Multiplier)</span>
              <span className="text-red-400 font-bold">{currentSettings.soundPitch.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={currentSettings.soundPitch * 10}
              onChange={(e) => handleSaveSetting('soundPitch', parseInt(e.target.value) / 10)}
              className="w-full accent-red-600 bg-white/10 h-2 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <span className="text-slate-300 text-sm block mb-3">Sentezleyici Dalga Tipi (Synth Wave)</span>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['sine', 'square', 'triangle', 'sawtooth'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSaveSetting('synthType', type)}
                  className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-all ${currentSettings.synthType === type
                      ? 'bg-red-600/20 border-red-500 text-red-400'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                >
                  {type === 'sine' ? 'Sinüs (Yumuşak)' : type === 'square' ? 'Kare (Retro)' : type === 'triangle' ? 'Üçgen (Flüt)' : 'Testere (Retro)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-slate-300 text-sm block mb-3">Aktif Kutlama Sesi</span>
            <div className="space-y-2">
              {CELEBRATION_SOUNDS.map((snd) => {
                const isUnlocked = snd.id === 'sound_classic' || profile.unlockedItems.includes(snd.id);
                const isSelected = (currentSettings.celebrationSound || 'sound_classic') === snd.id;
                return (
                  <div
                    key={snd.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all relative ${!isUnlocked ? 'opacity-40' : ''
                      } ${isSelected
                        ? 'border-red-500 bg-red-600/10'
                        : 'border-white/5 bg-black/40'
                      }`}
                  >
                    <div className="flex-1">
                      <span className="font-semibold text-xs block text-white">{snd.name}</span>
                      <span className="text-[10px] text-slate-400 leading-tight block">{snd.description}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnlocked && (
                        <button
                          onClick={() => sounds.playCelebration(snd.id, currentSettings)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-amber-400 cursor-pointer"
                          title="Sesi Dinle"
                        >
                          🔊 Dinle
                        </button>
                      )}
                      {isUnlocked ? (
                        <button
                          disabled={isSelected}
                          onClick={() => handleSaveSetting('celebrationSound', snd.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${isSelected
                              ? 'bg-red-600 text-white cursor-default'
                              : 'bg-white/10 hover:bg-white/20 text-slate-300'
                            }`}
                        >
                          {isSelected ? 'Seçildi' : 'Seç'}
                        </button>
                      ) : (
                        <span className="text-[9px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded">
                          KİLİTLİ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Visual Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2">
            <span>🎨</span> Görsel Özelleştirmeler
          </h3>

          {/* Board Themes */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">Masa Teması</span>
            <div className="grid grid-cols-2 gap-3">
              {THEME_OPTIONS.map((theme) => {
                const isUnlocked = theme.id === 'theme_slate' || profile.unlockedItems.includes(theme.id);
                return (
                  <button
                    key={theme.id}
                    disabled={!isUnlocked}
                    onClick={() => handleSaveSetting('boardTheme', theme.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''
                      } ${currentSettings.boardTheme === theme.id
                        ? 'border-red-500 bg-red-600/10'
                        : 'border-white/5 bg-black/40 hover:border-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.color }} />
                      <span className="font-semibold text-xs text-white">{theme.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{theme.description}</p>
                    {!isUnlocked && (
                      <span className="absolute top-1 right-1 text-[10px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded">
                        KİLİTLİ
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Back Styles */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">Kart Arkalığı Tasarımı</span>
            <div className="grid grid-cols-2 gap-3">
              {CARD_BACKS.map((cb) => {
                const isUnlocked = cb.id === 'back_classic' || profile.unlockedItems.includes(cb.id);
                return (
                  <button
                    key={cb.id}
                    disabled={!isUnlocked}
                    onClick={() => handleSaveSetting('cardBack', cb.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''
                      } ${currentSettings.cardBack === cb.id
                        ? 'border-red-500 bg-red-600/10'
                        : 'border-white/5 bg-black/40 hover:border-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-12 rounded border border-white/10 flex items-center justify-center font-bold text-lg"
                        style={{ backgroundColor: cb.color }}
                      >
                        {cb.pattern}
                      </div>
                      <div>
                        <span className="font-semibold text-xs block text-white">{cb.name}</span>
                        <span className="text-[10px] text-slate-400">Arkalık Deseni</span>
                      </div>
                    </div>
                    {!isUnlocked && (
                      <span className="absolute top-1 right-1 text-[10px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded">
                        KİLİTLİ
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Frames Selection */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">Profil Çerçevesi Tasarımı</span>
            <div className="grid grid-cols-2 gap-3">
              {PROFILE_FRAMES.map((frame) => {
                const isUnlocked = frame.id === 'frame_none' || profile.unlockedItems.includes(frame.id);
                return (
                  <button
                    key={frame.id}
                    disabled={!isUnlocked}
                    onClick={() => handleSaveSetting('profileFrame', frame.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''
                      } ${(currentSettings.profileFrame || 'frame_none') === frame.id
                        ? 'border-red-500 bg-red-600/10'
                        : 'border-white/5 bg-black/40 hover:border-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <AvatarWithFrame
                        avatarId={profile.avatarId}
                        avatarUrl={profile.avatarUrl}
                        frameId={frame.id}
                        sizeClassName="w-10 h-10 text-xl"
                      />
                      <div>
                        <span className="font-semibold text-xs block text-white">{frame.name}</span>
                        <span className="text-[10px] text-slate-400 leading-none">{frame.description}</span>
                      </div>
                    </div>
                    {!isUnlocked && (
                      <span className="absolute top-1 right-1 text-[10px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded">
                        KİLİTLİ
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
