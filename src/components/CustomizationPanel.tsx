import React from 'react';
import { UserProfile, UserSettings } from '../types';
import { sounds } from '../lib/SoundSystem';
import { AvatarWithFrame } from './AvatarWithFrame';
import { t } from '../lib/TranslationSystem';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

const THEME_OPTIONS = [
  { id: 'theme_slate', name: 'Kozmik Slate', color: '#1E293B', description: 'Koyu gri minimalist arka plan.' },
  { id: 'theme_green', name: 'Nane Yeşili', color: '#064E3B', description: 'Geleneksel yeşil masası.' },
  { id: 'theme_purple', name: 'Kraliyet Moru', color: '#581C87', description: 'Altın detaylı zengin mor masa.' },
  { id: 'theme_cyberpunk', name: 'Siber Izgara', color: '#090D16', description: 'Fütüristik yüksek kontrastlı neon çizgileri.' },
  // New board themes
  { id: 'theme_lava', name: 'Magma Krateri', color: '#450A0A', description: 'Aktif yanardağ lavları üzerinde sıcak masa.' },
  { id: 'theme_abyss', name: 'Karanlık Çukur', color: '#020617', description: 'Denizin en karanlık noktasındaki su altı arenası.' },
  { id: 'theme_gold', name: 'Hazine Odası', color: '#78350F', description: 'Altın külçelerle süslenmiş zengin masa.' },
  { id: 'theme_sakura', name: 'Sakura Vadisi', color: '#500724', description: 'Kiraz çiçeklerinin süzüldüğü huzurlu masa.' },
  { id: 'theme_ice', name: 'Kar Fırtınası', color: '#1E3A8A', description: 'Kar fırtınası altında kalmış kristal buz masası.' },
  { id: 'theme_retro', name: 'Atari Salonu', color: '#311042', description: '80ler atari salonu neon çizgi desenli masa.' },
  { id: 'theme_toxic', name: 'Zehirli Vaha', color: '#022C22', description: 'Yeşil asit havuzlu tekinsiz endüstriyel masa.' },
  { id: 'theme_matrix', name: 'Sanal Matris', color: '#022C22', description: 'Yeşil akan kod yağmuru altında sanal masa.' },
  { id: 'theme_space', name: 'Uzay İstasyonu', color: '#0F172A', description: 'Dünya manzaralı uzay üssü gözlem masası.' },
  { id: 'theme_desert', name: 'Kayıp Tapınak', color: '#7C2D12', description: 'Mısır kumları altındaki kadim çöl masası.' },
];

const CARD_BACKS = [
  { id: 'back_classic', name: 'Klasik Kırmızı', color: '#EF5350', pattern: '◆' },
  { id: 'back_cosmic', name: 'Kozmik Siyah', color: '#0F172A', pattern: '★' },
  { id: 'back_gold', name: 'V.I.P Altın', color: '#D97706', pattern: '♛' },
  { id: 'back_neon', name: 'Retro Dalga', color: '#EC407A', pattern: '▲' },
  // New card backs
  { id: 'back_fire', name: 'Volkanik Magma', color: '#B91C1C', pattern: '🔥' },
  { id: 'back_ice', name: 'Kutup Rüzgarı', color: '#0891B2', pattern: '❄️' },
  { id: 'back_void', name: 'Karanlık Rift', color: '#3B0764', pattern: '🌀' },
  { id: 'back_matrix', name: 'Siber Kod Yağmuru', color: '#052E16', pattern: '💾' },
  { id: 'back_rainbow', name: 'Gökkuşağı Prizması', color: '#475569', pattern: '🌈' },
  { id: 'back_bubble', name: 'Deniz Köpüğü', color: '#38BDF8', pattern: '🫧' },
  { id: 'back_steampunk', name: 'Buharlı Çark', color: '#78350F', pattern: '⚙️' },
  { id: 'back_laser', name: 'Retro Grid Lazer', color: '#1E1B4B', pattern: '⚡' },
  { id: 'back_galaxy', name: 'Nebula Bulutu', color: '#1E1B4B', pattern: '🌌' },
  { id: 'back_darkness', name: 'Gölgeler Diyarı', color: '#090514', pattern: '👁️' },
];

const PROFILE_FRAMES = [
  { id: 'frame_none', name: 'Klasik Sınır', description: 'Standart sade çerçeve.' },
  { id: 'frame_neon', name: 'Neon Aura', description: 'Siberpunk parlayan pembe.' },
  { id: 'frame_gold', name: 'V.I.P Altın', description: 'Asil saf altın kaplama.' },
  { id: 'frame_fire', name: 'Volkanik Ateş', description: 'Ateşli lav ve köz tasarımı.' },
  { id: 'frame_royal', name: 'Kraliyet Elması', description: 'Göz alıcı mavi elmas süsü.' },
  // New profile frames
  { id: 'frame_plasma', name: 'Plazma Kalkanı', description: 'Mavi elektrik arklarıyla parlayan çerçeve.' },
  { id: 'frame_rainbow', name: 'Gökkuşağı Spektrumu', description: 'Renk değiştiren RGB spektrum çerçeve.' },
  { id: 'frame_toxic', name: 'Radyoaktif Slime', description: 'Yemyeşil zehir akıntılı slime çerçeve.' },
  { id: 'frame_ice', name: 'Buz Kristali', description: 'Mavi buz kristalli soğuk çerçeve.' },
  { id: 'frame_steampunk', name: 'Buharlı Dişliler', description: 'Dönen bronz dişli çarklı çerçeve.' },
  { id: 'frame_matrix', name: 'Matris Kod Hattı', description: 'Akan yeşil binary kodlu çerçeve.' },
  { id: 'frame_thunder', name: 'Şimşek Hattı', description: 'Sarı şimşekler fırlayan çerçeve.' },
  { id: 'frame_darkness', name: 'Karanlık Duman', description: 'Koyu mor gölge dumanları tüten çerçeve.' },
  { id: 'frame_galaxy', name: 'Galaksi Sarmalı', description: 'Dönen galaksi sarmallı çerçeve.' },
  { id: 'frame_dragon', name: 'Ejderha Pulları', description: 'Kızıl ejderha pullu çerçeve.' },
];

const CELEBRATION_SOUNDS = [
  { id: 'sound_classic', name: 'Klasik Melodi', description: 'Klasik zafer melodisi.' },
  { id: 'sound_applause', name: 'Coşkulu Alkış', description: 'Coşkulu alkışlama efekti.' },
  { id: 'sound_fireworks', name: 'Havai Fişek', description: 'Heyecanlı gökyüzü şenlik patlamaları.' },
  { id: 'sound_laser', name: 'Siber Lazer', description: 'Fütüristik retro lazer şovu.' },
  { id: 'sound_fanfare', name: 'Şampiyon Fanfarı', description: 'Asil zafer fanfar melodisi.' },
  // New celebration sounds
  { id: 'sound_victory', name: 'Zafer Marşı', description: 'Trompet sesli epik zafer marşı.' },
  { id: 'sound_arcade', name: '8-Bit Atari', description: 'Eski atari oyunu ses efektleri.' },
  { id: 'sound_coins', name: 'Para Yağmuru', description: 'Kasaya para girerken çalan jackpot şıkırtısı.' },
  { id: 'sound_laser_zap', name: 'Lazer Silahı', description: 'Fütüristik siber lazer atış sesleri.' },
  { id: 'sound_rock', name: 'Elektro Gitar Riffi', description: 'Havalı rock gitar riffi.' },
  { id: 'sound_synthwave', name: 'Synthwave Bas', description: '80ler tarzı elektronik bas ritimleri.' },
  { id: 'sound_thunder', name: 'Kuvvetli Yıldırım', description: 'Güçlü gök gürültüsü ve şimşek.' },
  { id: 'sound_magical', name: 'Sihirli Değnek', description: 'Parıltılı büyü melodisi.' },
];

const AVATAR_OPTIONS = [
  { id: 'avatar_classic', name: 'Klasik Hükümdar', description: 'Geleneksel şapkalı asilzade.' },
  { id: 'avatar_skater', name: 'Kaykaycı Çocuk', description: 'Cool şapkalı sokak tarzı.' },
  { id: 'avatar_neon', name: 'Cyberpunk Neon', description: 'Fütüristik neon parıltısı.' },
  { id: 'avatar_golden', name: 'Altın Kral', description: 'Zenginlik ve ihtişam simgesi.' },
  // New avatars
  { id: 'avatar_alien', name: 'Siber Uzaylı', description: 'Samanyolu dışından gelen zeka.' },
  { id: 'avatar_ninja', name: 'Gölge Ninja', description: 'Gizlilik ve sessizlik ustası.' },
  { id: 'avatar_wizard', name: 'Başbüyücü', description: 'Kaderi yöneten kart sihirbazı.' },
  { id: 'avatar_dragon', name: 'Kadim Ejderha', description: 'Ateş saçan efsanevi ejderha.' },
  { id: 'avatar_astronaut', name: 'Uzay Gezgini', description: 'Derin uzay astronot tasarımı.' },
  { id: 'avatar_robot', name: 'Siber Mekanik', description: 'Yapay zeka metalik robot.' },
  { id: 'avatar_dj', name: 'Tempolu DJ', description: 'Arenaya müzik getiren DJ.' },
  { id: 'avatar_ghost', name: 'Kabus Hayalet', description: 'Rakiplerinin korkulu rüyası.' },
  { id: 'avatar_knight', name: 'Onurlu Şövalye', description: 'Zırhlı kraliyet muhafızı.' },
  { id: 'avatar_unicorn', name: 'Efsanevi Tekboynuz', description: 'Gökkuşağı büyülü unicorn.' },
  { id: 'avatar_pharaoh', name: 'Mısır Firavunu', description: 'Antik piramit hükümdarı.' },
  { id: 'avatar_zombie', name: 'Zombi Saldırganı', description: 'Karanlıktan fırlayan yaşayan ölü.' },
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
          <h2 className="text-2xl font-bold tracking-tight text-white">{t('settings_title', profile)}</h2>
          <p className="text-slate-400 text-sm">{t('settings_desc', profile)}</p>
        </div>
        <button
          onClick={handleSoundTest}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all text-sm flex items-center gap-2 transform active:scale-95"
        >
          <span>🔔</span> {t('settings_test_sound', profile)}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Sound Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-red-500 flex items-center gap-2">
            <span>🔊</span> {t('settings_synth_title', profile)}
          </h3>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">{t('master_volume', profile)}</span>
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
              <span className="text-slate-300">{t('sound_pitch', profile)}</span>
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
            <span className="text-slate-300 text-sm block mb-3">{t('wave_type', profile)}</span>
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
                  {type === 'sine' ? 'Sinüs' : type === 'square' ? 'Kare' : type === 'triangle' ? 'Üçgen' : 'Testere'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-slate-300 text-sm block mb-3">{t('active_sound', profile)}</span>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
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
                          🔊 {t('settings_play', profile)}
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
                          {isSelected ? t('settings_selected', profile) : t('settings_select', profile)}
                        </button>
                      ) : (
                        <span className="text-[9px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded">
                          {t('settings_locked', profile)}
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
            <span>🎨</span> {t('customizations', profile)}
          </h3>

          {/* Language Selection */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">{t('settings_language', profile)}</span>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { id: 'tr', name: 'Türkçe 🇹🇷' },
                { id: 'en', name: 'English 🇺🇸' }
              ].map((lang) => {
                const isSelected = (currentSettings.language || 'tr') === lang.id;
                return (
                  <button
                    key={lang.id}
                    onClick={() => handleSaveSetting('language', lang.id)}
                    className={`p-2.5 rounded-xl border text-left font-semibold text-xs transition-all relative ${isSelected
                      ? 'border-red-500 bg-red-600/10 text-white'
                      : 'border-white/5 bg-black/40 hover:border-white/10 text-slate-400'
                    }`}
                  >
                    {lang.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avatar Selection */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">{t('active_avatar', profile)}</span>
            <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {AVATAR_OPTIONS.map((av) => {
                const isUnlocked = av.id === 'avatar_classic' || profile.unlockedItems.includes(av.id);
                const isSelected = profile.avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    disabled={!isUnlocked}
                    onClick={() => handleSaveSetting('avatarId', av.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''
                      } ${isSelected
                        ? 'border-red-500 bg-red-600/10'
                        : 'border-white/5 bg-black/40 hover:border-white/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <AvatarWithFrame
                        avatarId={av.id}
                        frameId="frame_none"
                        sizeClassName="w-10 h-10 text-xl"
                      />
                      <div>
                        <span className="font-semibold text-xs block text-white">{av.name}</span>
                        <span className="text-[10px] text-slate-400 leading-none">{av.description}</span>
                      </div>
                    </div>
                    {!isUnlocked && (
                      <span className="absolute top-1 right-1 text-[10px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded">
                        {t('settings_locked', profile)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board Themes */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">{t('active_theme', profile)}</span>
            <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
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
                        {t('settings_locked', profile)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card Back Styles */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">{t('active_card_back', profile)}</span>
            <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
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
                        <span className="text-[10px] text-slate-400">{t('card_back', profile)}</span>
                      </div>
                    </div>
                    {!isUnlocked && (
                      <span className="absolute top-1 right-1 text-[10px] bg-red-600/90 text-white font-bold px-1.5 py-0.5 rounded">
                        {t('settings_locked', profile)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Frames Selection */}
          <div>
            <span className="text-slate-300 text-sm block mb-3">{t('active_frame', profile)}</span>
            <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
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
                        {t('settings_locked', profile)}
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
