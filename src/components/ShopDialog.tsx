import React from 'react';
import { UserProfile, StoreItem } from '../types';
import { sounds } from '../lib/SoundSystem';
import { AvatarWithFrame } from './AvatarWithFrame';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

const STORE_ITEMS: Omit<StoreItem, 'isUnlocked'>[] = [
  // Avatars
  { id: 'avatar_skater', name: 'Cool Kaykaycı', category: 'avatar', price: 100, description: 'Sokak modasına uygun şık kaykaycı avatarı.' },
  { id: 'avatar_neon', name: 'Cyber Neon', category: 'avatar', price: 250, description: 'Gelecekten gelen neon parıltılı hacker siber tasarımı.' },
  { id: 'avatar_golden', name: 'Altın Kral', category: 'avatar', price: 500, description: 'Lüks altın taçlı şampiyon Monopoly Deal kralı.' },
  
  // Card Backs
  { id: 'back_cosmic', name: 'Kozmik Siyah', category: 'card_back', price: 150, description: 'Yıldızlar ve samanyolu desenli kozmik kart arkası.' },
  { id: 'back_gold', name: 'V.I.P Altın', category: 'card_back', price: 300, description: 'Altın kaplamalı elit kulüp lüks desen tasarımı.' },
  { id: 'back_neon', name: 'Retro Dalga', category: 'card_back', price: 200, description: '80\'lerin synthwave mor dalga çizgileri.' },

  // Board Themes
  { id: 'theme_green', name: 'Nane Yeşili', category: 'board_theme', price: 100, description: 'Klasik Monopoly yeşil keçe masa tasarımı.' },
  { id: 'theme_purple', name: 'Kraliyet Moru', category: 'board_theme', price: 250, description: 'Mor renk kadife üzerine altın işlemeli lüks masa.' },
  { id: 'theme_cyberpunk', name: 'Siber Izgara', category: 'board_theme', price: 400, description: 'Karanlık odada parlayan siber neon oyun masası.' },

  // Profile Frames
  { id: 'frame_neon', name: 'Neon Aura Çerçevesi', category: 'profile_frame', price: 150, description: 'Profil fotoğrafınızın etrafında harika pembe neon parlaması yaratır.' },
  { id: 'frame_gold', name: 'V.I.P Altın Çerçevesi', category: 'profile_frame', price: 300, description: 'Lüks altın kaplamasıyla elit oyuncuların tercihi.' },
  { id: 'frame_fire', name: 'Volkanik Ateş Çerçevesi', category: 'profile_frame', price: 200, description: 'Ateş kırmızısı ve lav akışı efektli çarpıcı çerçeve.' },
  { id: 'frame_royal', name: 'Kraliyet Elması Çerçevesi', category: 'profile_frame', price: 450, description: 'Göz kamaştırıcı mavi elmas süslemeleriyle şampiyonlara özel.' },
];

export const ShopDialog: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [activeCategory, setActiveCategory] = React.useState<'all' | 'avatar' | 'card_back' | 'board_theme' | 'profile_frame'>('all');
  const [buyingId, setBuyingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const filteredItems = STORE_ITEMS.filter(
    (item) => activeCategory === 'all' || item.category === activeCategory
  );

  const handleBuy = async (itemId: string, price: number) => {
    if (profile.coins < price) {
      setError('Yetersiz altın! Daha fazla maç kazanarak altın biriktirin.');
      sounds.playAlert(profile.settings);
      return;
    }

    setBuyingId(itemId);
    setError(null);

    try {
      const response = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, itemId }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Success
        const updatedProfile = {
          ...profile,
          coins: data.coins,
          unlockedItems: data.unlockedItems,
        };
        onUpdateProfile(updatedProfile);
        sounds.playCoin(profile.settings);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Satın alma işlemi başarısız oldu.');
        sounds.playAlert(profile.settings);
      }
    } catch (e) {
      setError('Sunucu bağlantı hatası oluştu.');
      sounds.playAlert(profile.settings);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div id="shop-dialog" className="bg-black/20 border border-white/10 rounded-2xl p-6 text-white max-w-4xl mx-auto shadow-2xl">
      {/* Shop Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🛒</span> Monopoly Mağazası
          </h2>
          <p className="text-slate-400 text-sm">Avatarlar, kart arkalıkları ve lüks masa temaları satın alın</p>
        </div>
        <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
          <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full shadow-md shadow-yellow-500/20"></div>
          <span className="font-bold text-amber-300 text-lg">{profile.coins} Altın</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'all', label: 'Tüm Ürünler' },
          { id: 'avatar', label: '👤 Avatarlar' },
          { id: 'card_back', label: '🃏 Kart Arkalıkları' },
          { id: 'board_theme', label: '🎨 Masa Temaları' },
          { id: 'profile_frame', label: '🖼️ Profil Çerçeveleri' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveCategory(tab.id as any);
              sounds.playPlay(profile.settings);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeCategory === tab.id
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/15'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Store Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isUnlocked = profile.unlockedItems.includes(item.id);

          return (
            <div
              key={item.id}
              className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all"
            >
              <div>
                {/* Visual Preview Container */}
                <div className="aspect-[4/3] rounded-xl mb-4 bg-black/40 flex items-center justify-center relative overflow-hidden group border border-white/5">
                  {item.category === 'avatar' && (
                    <div className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center text-3xl bg-slate-800 shadow-lg">
                      {item.id === 'avatar_skater' ? '🛹' : item.id === 'avatar_neon' ? '🌌' : '👑'}
                    </div>
                  )}

                  {item.category === 'card_back' && (
                    <div
                      className="w-16 h-24 rounded-lg border-2 border-white/15 flex items-center justify-center font-bold text-3xl shadow-2xl transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor:
                          item.id === 'back_cosmic' ? '#0F172A' : item.id === 'back_gold' ? '#D97706' : '#EC407A',
                      }}
                    >
                      <span className="text-white font-black">
                        {item.id === 'back_cosmic' ? '★' : item.id === 'back_gold' ? '♛' : '▲'}
                      </span>
                    </div>
                  )}

                  {item.category === 'board_theme' && (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center"
                      style={{
                        backgroundColor:
                          item.id === 'theme_green' ? '#064E3B' : item.id === 'theme_purple' ? '#581C87' : '#090D16',
                      }}
                    >
                      <div className="w-12 h-12 rounded border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 text-xs">
                        Masa
                      </div>
                    </div>
                  )}

                  {item.category === 'profile_frame' && (
                    <AvatarWithFrame
                      avatarId="avatar_classic"
                      frameId={item.id}
                      sizeClassName="w-20 h-20 text-4xl"
                    />
                  )}

                  {isUnlocked && (
                    <div className="absolute top-2 right-2 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Açık
                    </div>
                  )}
                </div>

                <h4 className="font-bold text-lg text-white mb-1">{item.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{item.description}</p>
              </div>

              <div>
                {isUnlocked ? (
                  <button
                    disabled
                    className="w-full py-2.5 bg-white/5 border border-white/5 text-slate-500 font-bold rounded-xl text-sm cursor-not-allowed"
                  >
                    Sahipsiniz
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(item.id, item.price)}
                    disabled={buyingId !== null}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transform"
                  >
                    <span>💰</span> {item.price} Altın - Satın Al
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
