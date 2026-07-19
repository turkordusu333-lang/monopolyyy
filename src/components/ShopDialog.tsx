import React from 'react';
import { UserProfile, StoreItem } from '../types';
import { sounds } from '../lib/SoundSystem';
import { AvatarWithFrame } from './AvatarWithFrame';
import { t } from '../lib/TranslationSystem';
import { API_BASE_URL } from '../lib/apiConfig';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

const AVATAR_EMOJIS: Record<string, string> = {
  avatar_classic: '👑',
  avatar_skater: '🛹',
  avatar_neon: '🌌',
  avatar_golden: '👑',
  avatar_alien: '👽',
  avatar_ninja: '🥷',
  avatar_wizard: '🧙',
  avatar_dragon: '🐉',
  avatar_astronaut: '🧑‍🚀',
  avatar_robot: '🤖',
  avatar_dj: '🎧',
  avatar_ghost: '👻',
  avatar_knight: '🛡️',
  avatar_unicorn: '🦄',
  avatar_pharaoh: '👑',
  avatar_zombie: '🧟',
  avatar_snowstorm: '🥶',
};

const CARD_BACK_STYLES: Record<string, { color: string; symbol: string; bgClass?: string; pColor?: string }> = {
  back_classic: { color: '#EF4444', symbol: '▲', pColor: '#FCA5A5' },
  back_cosmic: { color: '#0F172A', symbol: '★', pColor: '#818CF8' },
  back_gold: { color: '#D97706', symbol: '♛', pColor: '#FBBF24' },
  back_neon: { color: '#EC407A', symbol: '▲', pColor: '#F472B6' },
  back_fire: { color: '#B91C1C', symbol: '🔥', pColor: '#F59E0B', bgClass: 'bg-gradient-to-br from-red-700 to-yellow-600' },
  back_ice: { color: '#0891B2', symbol: '❄️', pColor: '#22D3EE', bgClass: 'bg-gradient-to-br from-cyan-600 to-blue-500' },
  back_void: { color: '#3B0764', symbol: '🌀', pColor: '#C084FC', bgClass: 'bg-gradient-to-br from-purple-950 to-black' },
  back_matrix: { color: '#052E16', symbol: '💾', pColor: '#4ADE80', bgClass: 'bg-gradient-to-br from-green-950 to-black' },
  back_rainbow: { color: '#475569', symbol: '🌈', pColor: '#F87171', bgClass: 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500' },
  back_bubble: { color: '#38BDF8', symbol: '🫧', pColor: '#FFD6E8', bgClass: 'bg-gradient-to-br from-sky-400 to-pink-300' },
  back_steampunk: { color: '#78350F', symbol: '⚙️', pColor: '#F59E0B', bgClass: 'bg-gradient-to-br from-amber-800 to-zinc-700' },
  back_laser: { color: '#1E1B4B', symbol: '⚡', pColor: '#A78BFA', bgClass: 'bg-gradient-to-br from-violet-950 to-fuchsia-900' },
  back_galaxy: { color: '#1E1B4B', symbol: '🌌', pColor: '#C084FC', bgClass: 'bg-gradient-to-br from-purple-950 to-indigo-900' },
  back_darkness: { color: '#090514', symbol: '👁️', pColor: '#EC4899', bgClass: 'bg-gradient-to-br from-slate-950 to-purple-950' },
  back_snowstorm: { color: '#E2E8F0', symbol: '❄️', pColor: '#93C5FD', bgClass: 'bg-gradient-to-br from-blue-100 to-sky-300' },
};

const BOARD_THEME_COLORS: Record<string, string> = {
  theme_slate: '#0F172A',
  theme_green: '#064E3B',
  theme_purple: '#581C87',
  theme_cyberpunk: '#090D16',
  theme_lava: '#450A0A',
  theme_abyss: '#020617',
  theme_gold: '#78350F',
  theme_sakura: '#500724',
  theme_ice: '#1E3A8A',
  theme_retro: '#311042',
  theme_toxic: '#022C22',
  theme_matrix: '#022C22',
  theme_space: '#0F172A',
  theme_desert: '#7C2D12',
  theme_snowstorm: '#0b1329',
};

const STORE_ITEMS: Omit<StoreItem, 'isUnlocked'>[] = [
  // Avatars
  { id: 'avatar_skater', name: 'Cool Kaykaycı', category: 'avatar', price: 100, description: 'Sokak modasına uygun şık kaykaycı avatarı.' },
  { id: 'avatar_neon', name: 'Cyber Neon', category: 'avatar', price: 250, description: 'Gelecekten gelen neon parıltılı hacker siber tasarımı.' },
  { id: 'avatar_golden', name: 'Altın Kral', category: 'avatar', price: 500, description: 'Lüks altın taçlı şampiyon Deal Master PRO Deal kralı.' },

  // NEW AVATARS (12)
  { id: 'avatar_alien', name: 'Siber Uzaylı', category: 'avatar', price: 120, description: 'Samanyolu dışından gelen siber zeka.' },
  { id: 'avatar_ninja', name: 'Gölge Ninja', category: 'avatar', price: 180, description: 'Gizlilik ve sessizlik ustası gölge.' },
  { id: 'avatar_wizard', name: 'Başbüyücü', category: 'avatar', price: 200, description: 'Kartların kaderini değiştiren büyücü.' },
  { id: 'avatar_dragon', name: 'Kadim Ejderha', category: 'avatar', price: 350, description: 'Ateş saçan görkemli efsane.' },
  { id: 'avatar_astronaut', name: 'Uzay Gezgini', category: 'avatar', price: 160, description: 'Derin uzay boşluğunda bir astronot.' },
  { id: 'avatar_robot', name: 'Siber Mekanik', category: 'avatar', price: 140, description: 'Yapay zeka temelli mekanik zeka.' },
  { id: 'avatar_dj', name: 'Ritmin Ustası DJ', category: 'avatar', price: 110, description: 'Arenaya kendi temposunu getiren DJ.' },
  { id: 'avatar_ghost', name: 'Kabus Hayalet', category: 'avatar', price: 130, description: 'Rakiplerinin kabusu olan ruh.' },
  { id: 'avatar_knight', name: 'Onurlu Şövalye', category: 'avatar', price: 220, description: 'Kraliyetin sadık koruyucusu.' },
  { id: 'avatar_unicorn', name: 'Efsanevi Unicorn', category: 'avatar', price: 300, description: 'Gökkuşağının parlayan efsanesi.' },
  { id: 'avatar_pharaoh', name: 'Mısır Firavunu', category: 'avatar', price: 280, description: 'Mısırın kadim altın hükümdarı.' },
  { id: 'avatar_zombie', name: 'Zombi Saldırganı', category: 'avatar', price: 90, description: 'Karanlık geceden fırlayan zombi.' },

  // Card Backs
  { id: 'back_cosmic', name: 'Kozmik Siyah', category: 'card_back', price: 150, description: 'Yıldızlar ve samanyolu desenli kozmik kart arkası.' },
  { id: 'back_gold', name: 'V.I.P Altın', category: 'card_back', price: 300, description: 'Altın kaplamalı elit kulüp lüks desen tasarımı.' },
  { id: 'back_neon', name: 'Retro Dalga', category: 'card_back', price: 200, description: '80\'lerin synthwave mor dalga çizgileri.' },

  // NEW CARD BACKS (10)
  { id: 'back_fire', name: 'Volkanik Magma', category: 'card_back', price: 160, description: 'Kızıl lav efektli sıcak kart arkalığı.' },
  { id: 'back_ice', name: 'Kutup Rüzgarı', category: 'card_back', price: 180, description: 'Kutup soğukluğu taşıyan kristal kartlar.' },
  { id: 'back_void', name: 'Karanlık Rift', category: 'card_back', price: 220, description: 'Uzay boşluğu çeken kara delik deseni.' },
  { id: 'back_matrix', name: 'Siber Kod Yağmuru', category: 'card_back', price: 250, description: 'Yeşil siber veri çizgileriyle akan kodlar.' },
  { id: 'back_rainbow', name: 'Gökkuşağı Prizması', category: 'card_back', price: 210, description: 'Tüm renk tayfını yansıtan prizma.' },
  { id: 'back_bubble', name: 'Deniz Köpüğü', category: 'card_back', price: 140, description: 'Su altı baloncuklu canlı tasarım.' },
  { id: 'back_steampunk', name: 'Buharlı Çark', category: 'card_back', price: 190, description: 'Bronz çarklar ve buhar makineleri.' },
  { id: 'back_laser', name: 'Retro Grid Lazer', category: 'card_back', price: 240, description: 'Lazer ışınlarıyla çizilmiş 80ler gridi.' },
  { id: 'back_galaxy', name: 'Nebula Bulutu', category: 'card_back', price: 280, description: 'Yıldız tozu ve mor nebula süzülmesi.' },
  { id: 'back_darkness', name: 'Gölgeler Diyarı', category: 'card_back', price: 170, description: 'Gizemli gözler ve koyu karanlık.' },

  // Board Themes
  { id: 'theme_green', name: 'Nane Yeşili', category: 'board_theme', price: 100, description: 'Klasik Deal Master PRO yeşil keçe masa tasarımı.' },
  { id: 'theme_purple', name: 'Kraliyet Moru', category: 'board_theme', price: 250, description: 'Mor renk kadife üzerine altın işlemeli lüks masa.' },
  { id: 'theme_cyberpunk', name: 'Siber Izgara', category: 'board_theme', price: 400, description: 'Karanlık odada parlayan siber neon oyun masası.' },

  // NEW BOARD THEMES (10)
  { id: 'theme_lava', name: 'Magma Krateri', category: 'board_theme', price: 220, description: 'Aktif yanardağ lavları üzerinde sıcak masa.' },
  { id: 'theme_abyss', name: 'Karanlık Çukur', category: 'board_theme', price: 240, description: 'Denizin en karanlık dip noktasındaki su altı arenası.' },
  { id: 'theme_gold', name: 'Hazine Odası', category: 'board_theme', price: 400, description: 'Saf altın külçelerle süslenmiş zengin kraliyet masası.' },
  { id: 'theme_sakura', name: 'Sakura Vadisi', category: 'board_theme', price: 260, description: 'Kiraz çiçeklerinin süzüldüğü huzurlu masa.' },
  { id: 'theme_ice', name: 'Kar Fırtınası', category: 'board_theme', price: 250, description: 'Kar fırtınası altında kalmış kristal buz masası.' },
  { id: 'theme_retro', name: 'Atari Salonu', category: 'board_theme', price: 300, description: '80ler atari salonu neon çizgi desenli masa.' },
  { id: 'theme_toxic', name: 'Zehirli Vaha', category: 'board_theme', price: 180, description: 'Yeşil asit havuzlu tekinsiz endüstriyel masa.' },
  { id: 'theme_matrix', name: 'Sanal Matris', category: 'board_theme', price: 350, description: 'Yeşil akan kod yağmuru altında sanal masa.' },
  { id: 'theme_space', name: 'Uzay İstasyonu', category: 'board_theme', price: 450, description: 'Dünya manzaralı uzay üssü gözlem masası.' },
  { id: 'theme_desert', name: 'Kayıp Tapınak', category: 'board_theme', price: 150, description: 'Mısır kumları altındaki kadim çöl masası.' },

  // Profile Frames
  { id: 'frame_neon', name: 'Neon Aura Çerçevesi', category: 'profile_frame', price: 150, description: 'Profil fotoğrafınızın etrafında harika pembe neon parlaması yaratır.' },
  { id: 'frame_gold', name: 'V.I.P Altın Çerçevesi', category: 'profile_frame', price: 300, description: 'Lüks altın kaplamasıyla elit oyuncuların tercihi.' },
  { id: 'frame_fire', name: 'Volkanik Ateş Çerçevesi', category: 'profile_frame', price: 200, description: 'Ateş kırmızısı ve lav akışı efektli çarpıcı çerçeve.' },
  { id: 'frame_royal', name: 'Kraliyet Elması Çerçevesi', category: 'profile_frame', price: 450, description: 'Göz kamaştırıcı mavi elmas süslemeleriyle şampiyonlara özel.' },

  // NEW PROFILE FRAMES (10)
  { id: 'frame_plasma', name: 'Plazma Kalkanı', category: 'profile_frame', price: 225, description: 'Mavi elektrik arklarıyla parlayan plazma çerçeve.' },
  { id: 'frame_rainbow', name: 'Gökkuşağı Spektrumu', category: 'profile_frame', price: 265, description: 'Sürekli renk değiştiren RGB spektrum çerçeve.' },
  { id: 'frame_toxic', name: 'Radyoaktif Slime', category: 'profile_frame', price: 175, description: 'Yemyeşil zehir akıntılı hareketli slime çerçeve.' },
  { id: 'frame_ice', name: 'Buz Kristali', category: 'profile_frame', price: 195, description: 'Kutup soğukluğu saçan parıltılı mavi buz çerçevesi.' },
  { id: 'frame_steampunk', name: 'Buharlı Dişliler', category: 'profile_frame', price: 215, description: 'Dönen bronz dişli çarklar ve bakır çerçeve.' },
  { id: 'frame_matrix', name: 'Matris Kod Hattı', category: 'profile_frame', price: 285, description: 'Aşağı akan yeşil binary siber kod çerçevesi.' },
  { id: 'frame_thunder', name: 'Şimşek Hattı', category: 'profile_frame', price: 325, description: 'Etrafından sarı şimşekler fırlayan dinamik çerçeve.' },
  { id: 'frame_darkness', name: 'Karanlık Duman', category: 'profile_frame', price: 245, description: 'Koyu mor gölge dumanları tüten gizemli çerçeve.' },
  { id: 'frame_galaxy', name: 'Galaksi Sarmalı', category: 'profile_frame', price: 350, description: 'Dönen galaksi sarmalı ve yıldız tozu aurası.' },
  { id: 'frame_dragon', name: 'Ejderha Pulları', category: 'profile_frame', price: 400, description: 'Kızıl ejderha pulları ve parıldayan pullu çerçeve.' },

  // Celebration Sounds
  { id: 'sound_classic', name: 'Klasik Melodi', category: 'celebration_sound', price: 0, description: 'Klasik retro tınılı zafer melodisi.' },
  { id: 'sound_applause', name: 'Coşkulu Alkış', category: 'celebration_sound', price: 100, description: 'Kritik hamlelerinizde ve zaferlerinizde çalan coşkulu alkış efekti.' },
  { id: 'sound_fireworks', name: 'Havai Fişek', category: 'celebration_sound', price: 180, description: 'Gökyüzünde patlayan renkli ve heyecanlı şenlik efekti.' },
  { id: 'sound_laser', name: 'Siber Lazer', category: 'celebration_sound', price: 150, description: 'Cyberpunk arenalara özel fütüristik retro lazer şovu.' },
  { id: 'sound_fanfare', name: 'Şampiyon Fanfarı', category: 'celebration_sound', price: 250, description: 'Zafere ulaştığınızda çalacak asil ve muhteşem şampiyon melodisi.' },

  // NEW CELEBRATION SOUNDS (8)
  { id: 'sound_victory', name: 'Zafer Marşı', category: 'celebration_sound', price: 200, description: 'Trompet sesleriyle dolu epik zafer marşı.' },
  { id: 'sound_arcade', name: '8-Bit Atari', category: 'celebration_sound', price: 120, description: 'Eski atari oyunları tarzı retro ses efektleri.' },
  { id: 'sound_coins', name: 'Para Yağmuru', category: 'celebration_sound', price: 150, description: 'Kasanıza para girerken çalan jackpot şıkırtısı.' },
  { id: 'sound_laser_zap', name: 'Lazer Silahı', category: 'celebration_sound', price: 130, description: 'Fütüristik siber lazer atış sesleri.' },
  { id: 'sound_rock', name: 'Elektro Gitar Riffi', category: 'celebration_sound', price: 220, description: 'Zafere ulaştığınızda çalan havalı gitar solosu.' },
  { id: 'sound_synthwave', name: 'Synthwave Bas', category: 'celebration_sound', price: 170, description: '80ler tarzı elektronik bas ritimleri.' },
  { id: 'sound_thunder', name: 'Kuvvetli Yıldırım', category: 'celebration_sound', price: 250, description: 'Hamlelerinizi taçlandıracak güçlü gök gürültüsü.' },
  { id: 'sound_magical', name: 'Sihirli Değnek', category: 'celebration_sound', price: 180, description: 'Kartlarınızı açtığınızda çalan parıltılı büyü melodisi.' },

  // DYNAMIC BOARD THEMES (Live Mats)
  { id: 'theme_atlantis', name: '🌊 Atlantis Krallığı', category: 'board_theme', price: 800, description: 'Derin okyanus mavisi, yüzen kabarcıklar, ışık kırılması ve deniz tozu partikülleri ile yaşayan bir sualtı masa deneyimi.' },
  { id: 'theme_volcano', name: '🌋 Volkanik Öfke', category: 'board_theme', price: 900, description: 'Nabız gibi atan lav çatlakları, kor parçacıkları ve ısı bozulması efektiyle volkanik bir arena.' },

  // CARD SKINS (Live Skins)
  { id: 'skin_holographic', name: '💠 Holografik Mavi Sektör', category: 'card_skin', price: 1200, description: 'Kartların üzerinde akan mavi veri ızgarası, hover titremesi ve set tamamlandığında radyal parıltı efekti.' },
  { id: 'skin_rune', name: '🔮 Mistik Rün Parşömeni', category: 'card_skin', price: 1000, description: 'Kart kenarlarında parlayan kadim rünler, parşömen dokusu ve kira ödendiğinde mavi-kırmızı renk geçişi.' },

  // ACTION VFX (Epic VFX)
  { id: 'vfx_meteor', name: '☄️ Meteor Saldırısı', category: 'action_vfx', price: 1500, description: 'Deal Breaker oynandığında ekrana meteor düşer, darbe anında ekran sallanır ve altın parçacık patlaması tetiklenir.' },
  { id: 'vfx_mirror_shield', name: '🛡️ Ayna Kalkan', category: 'action_vfx', price: 1300, description: 'Hayır Teşekkürler kartı oynandığında altıgen enerji kalkanı belirir, şok dalgası ve gökkuşağı kırılması efekti.' },

  // KAR FIRTINASI KONSEPT ÜRÜNLERİ (Snowstorm Concept Set)
  { id: 'avatar_snowstorm', name: '❄️ Kar Fırtınası Savaşçısı', category: 'avatar', price: 300, description: 'Kutup ayazında dövüşen buz zırhlı efsanevi savaşçı.' },
  { id: 'back_snowstorm', name: '❄️ Kar Fırtınası', category: 'card_back', price: 200, description: 'Buz kristalleriyle kaplı, soğuk kutup rüzgarı desenli kart arkası.' },
  { id: 'theme_snowstorm', name: '❄️ Dinamik Kar Fırtınası', category: 'board_theme', price: 650, description: 'Sürekli yağan kar taneleri ve buz tutmuş zemin efektiyle yaşayan kış masası.' },
  { id: 'frame_snowstorm', name: '❄️ Kar Fırtınası Çerçevesi', category: 'profile_frame', price: 250, description: 'Buz parçacıkları saçan, hareketli kar fırtınası aurası.' },
  { id: 'sound_snowstorm', name: '❄️ Çığ ve Fırtına Sesi', category: 'celebration_sound', price: 200, description: 'Zafer anınızda çalan ürpertici çığ ve dondurucu fırtına uğultusu.' },
  { id: 'skin_snowstorm', name: '❄️ Donmuş Buz Kaplama', category: 'card_skin', price: 1100, description: 'Kartların üzerinde parıldayan buz kristalleri ve set tamamlandığında buhar çıkma efekti.' },
  { id: 'vfx_snowstorm', name: '❄️ Çığ Felaketi', category: 'action_vfx', price: 1400, description: 'Aksiyon kartı oynandığında oyun alanını kaplayan kar fırtınası ve ekran donması efekti.' }
];

export const ShopDialog: React.FC<Props> = ({ profile, onUpdateProfile }) => {
  const [activeCategory, setActiveCategory] = React.useState<'all' | 'avatar' | 'card_back' | 'board_theme' | 'profile_frame' | 'celebration_sound' | 'card_skin' | 'action_vfx'>('all');
  const [buyingId, setBuyingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [previewItem, setPreviewItem] = React.useState<typeof STORE_ITEMS[0] | null>(null);
  const [soundIsPlaying, setSoundIsPlaying] = React.useState<boolean>(false);
  const [purchasedItemName, setPurchasedItemName] = React.useState<string | null>(null);
  const [vfxTrigger, setVfxTrigger] = React.useState<boolean>(false);

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
      const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
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
          achievements: data.achievements || profile.achievements,
        };
        onUpdateProfile(updatedProfile);
        sounds.playCoin(profile.settings);

        const storeItem = STORE_ITEMS.find(item => item.id === itemId);
        if (storeItem) {
          setPurchasedItemName(storeItem.name);
          setTimeout(() => setPurchasedItemName(null), 4000);
        }

        // Update local preview state
        if (previewItem && previewItem.id === itemId) {
          // If we are purchasing inside the preview window
          sounds.playCelebration('sound_laser', profile.settings);
        }
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

  const playPreviewSound = (itemId: string) => {
    setSoundIsPlaying(true);
    sounds.playCelebration(itemId, profile.settings);
    setTimeout(() => {
      setSoundIsPlaying(false);
    }, 1500);
  };

  return (
    <div id="shop-dialog" className="bg-black/20 border border-white/10 rounded-2xl p-6 text-white max-w-4xl mx-auto shadow-2xl relative">
      {/* Shop Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>🛒</span> {t('shop_title_lbl', profile)}
          </h2>
          <p className="text-slate-400 text-sm">{t('shop_desc_lbl', profile)}</p>
        </div>
        <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-xl">
          <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full shadow-md shadow-yellow-500/20"></div>
          <span className="font-bold text-amber-300 text-lg">{t('shop_coins_lbl', profile, profile.coins)}</span>
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
          { id: 'all', label: t('shop_tab_all', profile) },
          { id: 'avatar', label: t('shop_tab_avatars', profile) },
          { id: 'card_back', label: t('shop_tab_card_backs', profile) },
          { id: 'board_theme', label: t('shop_tab_themes', profile) },
          { id: 'profile_frame', label: t('shop_tab_frames', profile) },
          { id: 'celebration_sound', label: t('shop_tab_sounds', profile) },
          { id: 'card_skin', label: t('shop_tab_card_skins', profile) },
          { id: 'action_vfx', label: t('shop_tab_action_vfx', profile) },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveCategory(tab.id as any);
              sounds.playPlay(profile.settings);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeCategory === tab.id
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
          const isUnlocked = item.id === 'sound_classic' || profile.unlockedItems.includes(item.id);

          return (
            <div
              key={item.id}
              className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-all relative group"
            >
              <div>
                {/* Visual Preview Container */}
                <div
                  onClick={() => {
                    setPreviewItem(item);
                    sounds.playPlay(profile.settings);
                  }}
                  className="aspect-[4/3] rounded-xl mb-4 bg-black/40 flex items-center justify-center relative overflow-hidden group border border-white/5 cursor-pointer hover:bg-black/60 transition-all"
                  title="Önizlemek için Tıklayın"
                >
                  {/* Glassmorphic hover overlay */}
                  <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/10 flex items-center justify-center transition-all duration-300">
                    <span className="opacity-0 group-hover:opacity-100 bg-black/80 border border-white/10 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                      🔍 Önizleme Penceresi
                    </span>
                  </div>

                  {item.category === 'avatar' && (
                    <div className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center text-3xl bg-slate-800 shadow-lg animate-bounce-subtle">
                      {AVATAR_EMOJIS[item.id] || '👑'}
                    </div>
                  )}

                  {item.category === 'card_back' && (() => {
                    const cBack = CARD_BACK_STYLES[item.id] || { color: '#EF4444', symbol: '▲' };
                    return (
                      <div
                        className={`w-16 h-24 rounded-lg border-2 border-white/15 flex items-center justify-center font-bold text-3xl shadow-2xl transition-all duration-300 ${cBack.bgClass || ''} group-hover:scale-110`}
                        style={{
                          backgroundColor: cBack.bgClass ? undefined : cBack.color,
                        }}
                      >
                        <span className="text-white font-black drop-shadow-md">
                          {cBack.symbol}
                        </span>
                      </div>
                    );
                  })()}

                  {item.category === 'board_theme' && (
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center transition-colors duration-300 ${
                        item.id === 'theme_atlantis' ? 'theme-atlantis-bg' : item.id === 'theme_volcano' ? 'theme-volcano-bg' : (item.id === 'theme_snowstorm' ? 'bg-slate-900 border border-blue-300/20' : '')
                      }`}
                      style={{
                        backgroundColor: (item.id === 'theme_atlantis' || item.id === 'theme_volcano') ? undefined : (BOARD_THEME_COLORS[item.id] || '#090D16'),
                      }}
                    >
                      <div className="w-12 h-12 rounded border border-dashed border-white/20 flex items-center justify-center text-white/40 text-[9px] font-black uppercase tracking-wider">
                        {item.id.includes('atlantis') || item.id.includes('volcano') || item.id.includes('snowstorm') ? '❄️ Dinamik' : 'Masa'}
                      </div>
                    </div>
                  )}

                  {item.category === 'profile_frame' && (
                    <AvatarWithFrame
                      avatarId="avatar_classic"
                      avatarUrl={profile.avatarUrl}
                      frameId={item.id}
                      sizeClassName="w-20 h-20 text-4xl"
                    />
                  )}

                  {item.category === 'celebration_sound' && (
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-3xl text-amber-400">
                      {item.id === 'sound_snowstorm' ? '❄️' : '🔊'}
                    </div>
                  )}

                  {item.category === 'card_skin' && (
                    <div className="w-16 h-24 rounded-lg border-2 border-white/10 bg-slate-800 flex items-center justify-center font-bold text-xs shadow-2xl relative overflow-hidden">
                      <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                        {item.id === 'skin_holographic' && <div className="skin-holographic-overlay absolute inset-0" />}
                        {item.id === 'skin_rune' && <div className="skin-rune-overlay absolute inset-0" />}
                        {item.id === 'skin_snowstorm' && <div className="absolute inset-0 bg-gradient-to-br from-blue-300/30 to-sky-100/20 backdrop-blur-[1px] animate-pulse" />}
                      </div>
                      <span className="text-white text-xs drop-shadow-md z-10">{item.id === 'skin_snowstorm' ? 'BUZ' : 'KAPLAMA'}</span>
                    </div>
                  )}

                  {item.category === 'action_vfx' && (
                    <div className="w-14 h-14 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center text-3xl text-red-400 animate-pulse relative">
                      {item.id === 'vfx_meteor' ? '☄️' : (item.id === 'vfx_snowstorm' ? '❄️' : '🛡️')}
                      <div className="absolute inset-0 rounded-full border border-red-400/20 scale-125 animate-ping" />
                    </div>
                  )}

                  {isUnlocked && (
                    <div className="absolute top-2 right-2 bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Açık
                    </div>
                  )}
                </div>

                <h4 className="font-bold text-lg text-white mb-1 flex items-center gap-1.5">
                  {item.name}
                </h4>
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
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transform cursor-pointer"
                  >
                    <span>💰</span> {item.price} Altın - Satın Al
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED INTERACTIVE PREVIEW MODAL */}
      {previewItem && (() => {
        const isUnlocked = previewItem.id === 'sound_classic' || profile.unlockedItems.includes(previewItem.id);

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[99] p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-play-card">
              {/* Close Button */}
              <button
                onClick={() => {
                  setPreviewItem(null);
                  sounds.playPlay(profile.settings);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full cursor-pointer transition-all z-10"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2.5 py-1 rounded-full">
                  ✨ ÜRÜN ÖNİZLEME ODASI
                </span>
                <h3 className="text-2xl font-black text-white mt-3">{previewItem.name}</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">{previewItem.description}</p>
              </div>

              {/* Dynamic Animation Area */}
              <div className="bg-black/40 border border-white/5 rounded-2xl aspect-[1.5] flex items-center justify-center relative overflow-hidden p-6 mb-6">
                {previewItem.category === 'avatar' && (
                  <div className="flex flex-col items-center gap-3 relative">
                    <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center text-5xl bg-slate-800 shadow-xl animate-bounce-subtle z-10 relative">
                      {AVATAR_EMOJIS[previewItem.id] || '👑'}
                    </div>
                    {/* Ripple background ring */}
                    <div className="absolute inset-0 w-32 h-32 rounded-full border border-red-500/20 scale-110 animate-ping opacity-30 pointer-events-none self-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                )}

                {previewItem.category === 'card_back' && (() => {
                  const cBack = CARD_BACK_STYLES[previewItem.id] || { color: '#EF4444', symbol: '▲', pColor: '#FCA5A5' };
                  return (
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-28 h-40 rounded-xl border-2 flex flex-col justify-between p-3 shadow-2xl transition-all duration-500 relative overflow-hidden ${cBack.bgClass || ''}`}
                        style={{
                          backgroundColor: cBack.bgClass ? undefined : cBack.color,
                          borderColor: cBack.pColor || '#FFFFFF',
                          boxShadow: `0 0 25px ${(cBack.pColor || '#FFFFFF')}80`
                        }}
                      >
                        {/* Particles inside card */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[...Array(12)].map((_, idx) => (
                            <span
                              key={idx}
                              className="absolute rounded-full animate-float"
                              style={{
                                left: `${10 + Math.random() * 80}%`,
                                bottom: '-10px',
                                width: `${2 + Math.random() * 4}px`,
                                height: `${2 + Math.random() * 4}px`,
                                backgroundColor: cBack.pColor || '#FFFFFF',
                                boxShadow: `0 0 8px ${cBack.pColor || '#FFFFFF'}`,
                                animationDelay: `${idx * 0.15}s`,
                                animationDuration: '1.6s'
                              }}
                            />
                          ))}
                        </div>

                        <div className="text-white/25 text-left text-[8px] font-black tracking-widest leading-none select-none">Deal Master PRO</div>

                        <span className="text-white text-5xl font-black self-center drop-shadow-xl animate-pulse">
                          {cBack.symbol}
                        </span>

                        <div className="text-white/25 text-right text-[8px] font-black tracking-widest leading-none select-none">DEAL</div>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold mt-3 animate-pulse">
                        ✨ HAREKETLİ TEKSTÜR VE EFEKTLER AKTİF ✨
                      </span>
                    </div>
                  );
                })()}

                {previewItem.category === 'board_theme' && (
                  <div
                    className={`w-full h-full rounded-xl p-4 flex flex-col justify-between transition-colors duration-500 border border-white/10 ${
                      previewItem.id === 'theme_atlantis' ? 'theme-atlantis-bg' : (previewItem.id === 'theme_volcano' ? 'theme-volcano-bg' : (previewItem.id === 'theme_snowstorm' ? 'bg-slate-950 border border-blue-400/20' : ''))
                    }`}
                    style={{
                      backgroundColor: (previewItem.id === 'theme_atlantis' || previewItem.id === 'theme_volcano') ? undefined : (BOARD_THEME_COLORS[previewItem.id] || '#050B14'),
                    }}
                  >
                    {previewItem.id === 'theme_snowstorm' && (
                      <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[0.5px] pointer-events-none flex flex-wrap justify-around items-center opacity-30">
                        <span>❄️</span><span>❄️</span><span>❄️</span><span>❄️</span>
                      </div>
                    )}
                    <div className="w-full flex justify-between items-center border-b border-white/5 pb-2 relative z-10">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <span className="text-[9px] font-mono text-white/40">
                        {previewItem.id.includes('atlantis') || previewItem.id.includes('volcano') || previewItem.id.includes('snowstorm') ? 'DİNAMİK MASA TEMASI' : 'KLASİK MASA TEMASI'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-auto relative z-10">
                      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center text-[10px] font-bold shadow-sm">Banka</div>
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-center text-[10px] font-bold text-amber-400 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]">Deste 🃏</div>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center text-[10px] font-bold shadow-sm">Mülkler</div>
                    </div>

                    <div className="text-center text-[9px] text-white/45 font-black uppercase tracking-wider animate-pulse relative z-10">✨ {previewItem.name} Deneyimi ✨</div>
                  </div>
                )}

                {previewItem.category === 'card_skin' && (
                  <div className="flex flex-col items-center">
                    <div className="w-28 h-40 rounded-xl border-2 border-white/10 bg-slate-800 flex flex-col justify-between p-3 shadow-2xl relative overflow-hidden">
                      {previewItem.id === 'skin_holographic' && <div className="skin-holographic-overlay absolute inset-0" />}
                      {previewItem.id === 'skin_rune' && <div className="skin-rune-overlay absolute inset-0 animate-pulse" />}
                      {previewItem.id === 'skin_snowstorm' && <div className="absolute inset-0 bg-gradient-to-br from-blue-300/40 to-sky-100/15 backdrop-blur-[0.5px] border border-blue-400/20" />}

                      <div className="text-white/20 text-left text-[8px] font-black tracking-widest leading-none select-none relative z-10">KART ÖRNEĞİ</div>
                      <span className="text-white text-3xl font-black self-center drop-shadow-xl select-none relative z-10">🃏</span>
                      <div className="text-white/20 text-right text-[8px] font-black tracking-widest leading-none select-none relative z-10">DEAL PRO</div>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold mt-3 animate-pulse">
                      ✨ CANLI KART KAPLAMASI ÖNİZLEMESİ ✨
                    </span>
                  </div>
                )}

                {previewItem.category === 'action_vfx' && (
                  <div className="flex flex-col items-center justify-center w-full h-full relative">
                    {/* Preview box container with clipping for animations */}
                    <div className={`w-full h-32 border border-white/10 bg-slate-950/80 rounded-xl relative overflow-hidden flex items-center justify-center ${vfxTrigger && previewItem.id === 'vfx_meteor' ? 'vfx-meteor-shake' : ''}`}>
                      {vfxTrigger ? (
                        <>
                          {previewItem.id === 'vfx_meteor' && (
                            <>
                              <div className="vfx-meteor-rock" style={{ top: '10%', right: '10%' }} />
                              <div className="vfx-meteor-shockwave animate-pulse" />
                              <div className="absolute inset-0 bg-orange-500/10 pointer-events-none animate-ping" />
                            </>
                          )}
                          {previewItem.id === 'vfx_mirror_shield' && (
                            <div className="relative w-full h-full flex items-center justify-center">
                              <div className="vfx-shield-hex-grid">
                                {[...Array(9)].map((_, i) => (
                                  <div key={i} className="vfx-shield-hex" />
                                ))}
                              </div>
                              <div className="vfx-shield-shockwave" />
                            </div>
                          )}
                          {previewItem.id === 'vfx_snowstorm' && (
                            <div className="absolute inset-0 bg-blue-100/10 pointer-events-none flex flex-col items-center justify-center">
                              <div className="text-4xl animate-spin" style={{ animationDuration: '4s' }}>❄️</div>
                              <span className="text-[9px] text-blue-300 font-black tracking-widest mt-2 animate-pulse uppercase">ÇIĞ VE BUZ FIRTINASI!</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">Efekti görmek için aşağıdaki butona basın</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setVfxTrigger(true);
                        setTimeout(() => setVfxTrigger(false), 2000);
                      }}
                      disabled={vfxTrigger}
                      className="mt-3 px-4 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 hover:text-white transition-all cursor-pointer"
                    >
                      {vfxTrigger ? 'Efekt Oynatılıyor...' : '💥 Efekti Test Et'}
                    </button>
                  </div>
                )}

                {previewItem.category === 'profile_frame' && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      {/* Pulsing ring underneath frame */}
                      <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping pointer-events-none" />
                      <AvatarWithFrame
                        avatarId="avatar_classic"
                        avatarUrl={profile.avatarUrl}
                        frameId={previewItem.id}
                        sizeClassName="w-28 h-28 text-5xl"
                      />
                    </div>
                    <span className="text-[10px] text-amber-300 font-black tracking-wider animate-pulse mt-2">
                      ✨ HAREKETLİ VE PARILDAYAN ÖZEL ÇERÇEVE AKTİF ✨
                    </span>
                  </div>
                )}

                {previewItem.category === 'celebration_sound' && (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <button
                      onClick={() => playPreviewSound(previewItem.id)}
                      disabled={soundIsPlaying}
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl cursor-pointer shadow-lg transition-transform active:scale-90 ${soundIsPlaying
                          ? 'bg-amber-500 text-white animate-ping'
                          : 'bg-gradient-to-r from-amber-500 to-red-600 text-white hover:from-amber-400 hover:to-red-500'
                        }`}
                      title="Sesi Çal"
                    >
                      {soundIsPlaying ? '🎵' : '▶️'}
                    </button>

                    {/* Animated visualizer bar-waves */}
                    <div className="flex items-end justify-center gap-1.5 h-10 mt-2 w-full">
                      {[...Array(12)].map((_, idx) => {
                        const h = soundIsPlaying ? `${20 + Math.random() * 80}%` : '15%';
                        return (
                          <div
                            key={idx}
                            className="bg-amber-400 w-1.5 rounded-full transition-all duration-150"
                            style={{
                              height: h,
                              boxShadow: '0 0 6px #F59E0B'
                            }}
                          />
                        );
                      })}
                    </div>

                    <span className="text-xs text-slate-400">Önizlemek için başlat butonuna basın</span>
                  </div>
                )}
              </div>

              {/* Purchase/Success Controls inside Preview */}
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewItem(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold rounded-2xl text-sm transition-all cursor-pointer"
                >
                  {t('cancel', profile)}
                </button>

                {isUnlocked ? (
                  <button
                    disabled
                    className="flex-[2] py-3 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold rounded-2xl text-sm cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {t('shop_unlocked_btn', profile)}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(previewItem.id, previewItem.price)}
                    disabled={buyingId !== null}
                    className="flex-[2] py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transform cursor-pointer"
                  >
                    <span>💰</span> {previewItem.price} {t('coins', profile)} - {t('buy', profile)}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {purchasedItemName && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex flex-col items-center justify-center p-6 pointer-events-none animate-fade-in">
          <div className="bg-gradient-to-r from-yellow-500 via-amber-600 to-red-600 p-1 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-bounce-subtle max-w-sm w-full">
            <div className="bg-slate-950 rounded-[22px] px-6 py-8 text-center flex flex-col items-center">
              <span className="text-5xl animate-pulse">🎉</span>
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 mt-4 uppercase tracking-wider">{t('shop_success_title', profile)}</h3>
              <p className="text-white text-sm font-bold mt-2">"{purchasedItemName}"</p>
              <p className="text-emerald-400 text-xs font-semibold mt-1">{t('shop_success_desc', profile)}</p>
              <span className="text-[10px] text-slate-500 mt-6 block">{t('shop_success_hint', profile)}</span>
            </div>
          </div>
          {/* Confetti Explosion Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => {
              const randX = Math.random() * 100;
              const randY = -10 - Math.random() * 40;
              const color = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#F43F5E'][i % 7];
              const size = Math.random() * 8 + 4;
              const delay = Math.random() * 1.5;
              const duration = Math.random() * 2 + 2;
              return (
                <div
                  key={i}
                  className="absolute rounded-sm animate-float"
                  style={{
                    left: `${randX}%`,
                    top: `${randY}%`,
                    width: `${size}px`,
                    height: `${size * 1.5}px`,
                    backgroundColor: color,
                    transform: `rotate(${Math.random() * 360}deg)`,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                    opacity: 0.8,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
