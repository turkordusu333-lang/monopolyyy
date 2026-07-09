// Akıllı Ses Sistemi (Smart Audio System)

let enabled = true;
let localPlayerId = null;
let sfxVolume = 0.7;

// Ayarları geri yükle
try {
  const saved = localStorage.getItem('monopolyDealSound');
  if (saved === 'off') enabled = false;
} catch (e) { /* ignore */ }

try {
  const savedSfx = localStorage.getItem('md_sfx_vol');
  if (savedSfx !== null) sfxVolume = parseFloat(savedSfx);
} catch (e) { /* ignore */ }

export function isSoundEnabled() { return enabled; }
export function setLocalPlayerId(id) { localPlayerId = id; }
export function getSfxVolume() { return sfxVolume; }

export function setSfxVolume(volume) {
  sfxVolume = parseFloat(volume);
  try { localStorage.setItem('md_sfx_vol', volume); } catch (e) { /* ignore */ }
}

let bgmAudio = null;

export function setSoundEnabled(value) {
  enabled = value;
  try { localStorage.setItem('monopolyDealSound', value ? 'on' : 'off'); } catch (e) { /* ignore */ }
  if (!value && bgmAudio) bgmAudio.pause();
  else if (value && bgmAudio) bgmAudio.play().catch(() => { });
}

// ── SES ÜST ÜSTE BİNMEYİ ÖNLEME SİSTEMİ ──
//
// Her URL için tek bir Audio nesnesi tutulur.
// Aynı ses tekrar tetiklendiğinde önce durdurulur ve baştan çalınır.
// Bu sayede aynı ses asla üst üste binmez.
//
// Throttle: Bir sesin aynı URL ile arka arkaya çalınabilmesi için
// geçmesi gereken minimum süre. Bu süre içinde gelen istekler yok sayılır.

const audioInstances = {}; // url -> Audio
const lastPlayedTimestamps = {}; // url -> timestamp
const THROTTLE_MS = 50; // ms — üst üste binmeyi önlemek için yeterli süre
let lastGlobalSfxTime = 0;
const GLOBAL_MIN_INTERVAL = 50; // ms — iki farklı oyun içi sesin çalması arasındaki minimum süre

/**
 * Akıllı Ses Çalma Fonksiyonu
 * @param {string} url       Ses dosyasının yolu
 * @param {number} volume    Ses seviyesi (0.0 – 1.0)
 * @param {string} category  'local' | 'targeted' | 'global'
 * @param {string} actorId   İşlemi yapan oyuncu kimliği
 * @param {string} targetId  Hedef oyuncu kimliği
 */
function playSmart({ url, volume = 0.5, category = 'global', actorId = null, targetId = null, fallbackUrl = null }) {
  if (!enabled) return;

  // Oyun ve bot hamleleri çok hızlı olduğunda seslerin üst üste binmesini önleyen global throttle
  // (Oyuncu tıklama seslerinin akıcılığını bozmamak için click sesleri hariç tutulur)
  const isClickSound = url && (url.includes('click') || url.includes('button'));
  const now = Date.now();
  if (!isClickSound && (now - lastGlobalSfxTime < GLOBAL_MIN_INTERVAL)) {
    return;
  }
  if (!isClickSound) {
    lastGlobalSfxTime = now;
  }

  // 1. Hedefleme Kontrolü
  const isMe = localPlayerId && ((actorId === localPlayerId) || (targetId === localPlayerId));
  if (category === 'local' && !isMe && actorId) return;
  if (category === 'targeted' && !isMe && actorId) return;
  // category === 'global' → herkes duyar

  // 2. Throttle — çok hızlı ardışık çağrıları engelle
  if (lastPlayedTimestamps[url] && (now - lastPlayedTimestamps[url] < THROTTLE_MS)) return;
  lastPlayedTimestamps[url] = now;

  // 3. Per-URL singleton — aynı ses çalıyorsa durdur ve baştan başlat
  try {
    if (!audioInstances[url]) {
      audioInstances[url] = new Audio(url);
      if (fallbackUrl) {
        audioInstances[url].addEventListener('error', () => {
          console.warn(`Custom meme sound failing to load (${url}), trying fallback: ${fallbackUrl}`);
          const fallbackAudio = new Audio(fallbackUrl);
          fallbackAudio.volume = Math.min(1, Math.max(0, volume * sfxVolume));
          fallbackAudio.play().catch(e => console.warn('Fallback failed:', e));
        }, { once: true });
      }
    }
    const audio = audioInstances[url];
    audio.pause();
    audio.currentTime = 0;
    audio.volume = Math.min(1, Math.max(0, volume * sfxVolume));
    audio.play().catch(e => {
      console.warn('Ses çalınamadı:', e);
      if (fallbackUrl) {
        console.log(`Fallback triggered due to play failure: ${fallbackUrl}`);
        const fallbackAudio = new Audio(fallbackUrl);
        fallbackAudio.volume = Math.min(1, Math.max(0, volume * sfxVolume));
        fallbackAudio.play().catch(e2 => console.warn('Fallback failed:', e2));
      }
    });
  } catch (e) { /* ignore */ }
}

// Geriye dönük uyumluluk
function playFile(url, volume = 0.5) {
  playSmart({ url, volume, category: 'global' });
}


// Arka Plan Müziği (BGM)
export function playBGM() {
  if (!enabled) return;
  if (!bgmAudio) {
    bgmAudio = new Audio('/sounds/bgm.mp3');
    bgmAudio.loop = true;
    const savedVolume = localStorage.getItem('md_bgm_vol');
    bgmAudio.volume = savedVolume !== null ? parseFloat(savedVolume) : 0.15;
  }
  bgmAudio.play().catch(e => console.warn('BGM autoplay engellendi, etkileşim bekleniyor:', e));
}

export function setBgmVolume(volume) {
  if (bgmAudio) bgmAudio.volume = volume;
  try { localStorage.setItem('md_bgm_vol', volume); } catch (e) { }
}

export function setBgmTension(isTense) {
  if (bgmAudio) {
    bgmAudio.playbackRate = isTense ? 1.15 : 1.0;
  }
}

export function stopBGM() {
  if (bgmAudio) bgmAudio.pause();
}

// ── SES EFEKTLERİ ──

// Kart oynama - kısa "tık"
export function sfxCardPlay({ actorId } = {}) {
  playSmart({ url: '/sounds/card_play.mp3', volume: 0.85, category: 'local', actorId });
}

// Kart çekme - hızlı yükselen "hışırtı"
export function sfxCardDraw({ actorId } = {}) {
  playSmart({ url: '/sounds/card_draw.mp3', volume: 0.8, category: 'local', actorId });
}

// Kart fırlatma (masaya atma)
export function sfxWhoosh({ actorId } = {}) {
  playSmart({ url: '/sounds/whoosh.mp3', volume: 0.7, category: 'local', actorId });
}

export function sfxCoin({ actorId } = {}) {
  // Tok metal sikke sesi (coins_cling.mp3), eğer yoksa standart coin.mp3
  playSmart({ url: '/sounds/coins_cling.mp3', volume: 0.85, category: 'local', actorId, fallbackUrl: '/sounds/coin.mp3' });
}

export function sfxCardHover() {
  // Kartların üzerine gelindiğinde/kaydırıldığında hafif kağıt/kart sürtünme sesi
  playSmart({ url: '/sounds/card_slide.mp3', volume: 0.28, category: 'local', actorId: localPlayerId, fallbackUrl: '/sounds/card_draw.mp3' });
}

export function sfxCashCounter() {
  // Kağıt para sayma makinesi sesi
  playSmart({ url: '/sounds/cash_counter.mp3', volume: 0.85, category: 'global', fallbackUrl: '/sounds/meme_money.mp3' });
}

export function sfxError({ actorId } = {}) {
  playSmart({ url: '/sounds/error.mp3', volume: 0.8, category: 'local', actorId });
}

export function sfxYourTurn({ targetId } = {}) {
  playSmart({ url: '/sounds/your-turn.mp3', volume: 0.85, category: 'local', actorId: targetId });
}

// ── MONOPOLY DEAL KART SESLERİ (MP3) ──
export function sfxActionDealbreaker({ actorId, targetId } = {}) { playSmart({ url: '/sounds/dealbreaker_haciz.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxActionJustSayNo({ actorId, targetId } = {}) { playSmart({ url: '/sounds/justsayno_reddet.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxActionCounterJustSayNo({ actorId, targetId } = {}) { playSmart({ url: '/sounds/justsayno_counter_reddet_reddet.mp3', volume: 0.95, category: 'targeted', actorId, targetId }); }
export function sfxActionSlyDeal({ actorId, targetId } = {}) { playSmart({ url: '/sounds/slydeal_tapu.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxActionForcedDeal({ actorId, targetId } = {}) { playSmart({ url: '/sounds/forceddeal_degiskokus.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxActionDebtCollector({ actorId, targetId } = {}) { playSmart({ url: '/sounds/debtcollector_tasilat.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxActionBirthday({ actorId } = {}) { playSmart({ url: '/sounds/birthday_dogum_gunu.mp3', volume: 0.9, category: 'global' }); }
export function sfxActionPassGoTwoDraw({ actorId } = {}) { playSmart({ url: '/sounds/two-draw_2-kart-cek.mp3', volume: 0.9, category: 'local', actorId }); }

// Kira kartı & ödeme
export function sfxRentCardPlayed({ actorId, targetId } = {}) { playSmart({ url: '/sounds/rent_kira_karti.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxRentPaymentDue({ actorId, targetId } = {}) { playSmart({ url: '/sounds/rent-paid_kiranizi-odeyin.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }

// Bankaya para koyma
export function sfxBankDeposit1M({ actorId } = {}) { playSmart({ url: '/sounds/bank_deposit_1m.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxBankDeposit2M({ actorId } = {}) { playSmart({ url: '/sounds/bank_deposit_2m.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxBankDeposit3M({ actorId } = {}) { playSmart({ url: '/sounds/bank_deposit_3m.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxBankDeposit4M({ actorId } = {}) { playSmart({ url: '/sounds/bank_deposit_4m.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxBankDeposit5M({ actorId } = {}) { playSmart({ url: '/sounds/bank_deposit_5m.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxBankDeposit10M({ actorId } = {}) { playSmart({ url: '/sounds/bank_deposit_10m.mp3', volume: 0.85, category: 'local', actorId }); }

// Arazi kartı
export function sfxPropertyPlayed({ actorId } = {}) { playSmart({ url: '/sounds/property_play.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxJokerPropertyPlayed({ actorId } = {}) { playSmart({ url: '/sounds/joker_arazi.mp3', volume: 0.9, category: 'local', actorId }); }

export function sfxStreetPropertyPlayed(slug, { actorId } = {}) {
  if (!slug) return;
  playSmart({ url: `/sounds/${slug}.mp3`, volume: 0.9, category: 'local', actorId });
}

export function sfxActionRentAll({ actorId } = {}) { playSmart({ url: '/sounds/rent_kira_karti.mp3', volume: 0.85, category: 'global' }); }

// Tur bitti
export function sfxTurnEnded() { playSmart({ url: '/sounds/turn_ended.mp3', volume: 0.8, category: 'local' }); }

// Reddet! / itiraz uyarısı
export function sfxAlert({ targetId } = {}) { playSmart({ url: '/sounds/alert.mp3', volume: 0.85, category: 'local', actorId: targetId }); }

// Ödeme isteği geldi
export function sfxPaymentDue({ targetId } = {}) { playSmart({ url: '/sounds/payment_due.mp3', volume: 0.85, category: 'local', actorId: targetId }); }

// Kazanma fanfarı
export function sfxWin() { playSmart({ url: '/sounds/win.mp3', volume: 0.9, category: 'global' }); }

// Genel UI tıklama sesi
export function sfxClick() { playSmart({ url: '/sounds/click.mp3', volume: 0.7, category: 'local', actorId: localPlayerId }); }

// Ev/Otel inşa etme
export function sfxBuild({ actorId } = {}) { playSmart({ url: '/sounds/build.mp3', volume: 0.85, category: 'local', actorId }); }

// Son 10 saniye tik-tak
export function sfxTick() { playSmart({ url: '/sounds/tick.mp3', volume: 0.65, category: 'global' }); }

// --- EMOJİ SESLERİ --- (Global)
export function sfxLaugh() { playSmart({ url: '/sounds/meme_laugh.mp3', volume: 0.75, category: 'global', fallbackUrl: '/sounds/laugh.mp3' }); }
export function sfxAngry() { playSmart({ url: '/sounds/meme_angry.mp3', volume: 0.75, category: 'global', fallbackUrl: '/sounds/angry.mp3' }); }
export function sfxChaChing() { playSmart({ url: '/sounds/meme_money.mp3', volume: 0.8, category: 'global', fallbackUrl: '/sounds/cha-ching.mp3' }); }
export function sfxFire() { playSmart({ url: '/sounds/meme_fire.mp3', volume: 0.85, category: 'global', fallbackUrl: '/sounds/fire.mp3' }); }
export function sfxClap() { playSmart({ url: '/sounds/meme_clap.mp3', volume: 0.85, category: 'global', fallbackUrl: '/sounds/clap.mp3' }); }
export function sfxCry() { playSmart({ url: '/sounds/meme_sad.mp3', volume: 0.85, category: 'global', fallbackUrl: '/sounds/cry.mp3' }); }
export function sfxShock() { playSmart({ url: '/sounds/meme_shock.mp3', volume: 0.85, category: 'global', fallbackUrl: '/sounds/shock.mp3' }); }

// Anlaşma Bozucu (Cam Kırılma Sesi)
export function sfxGlassBreak({ actorId, targetId } = {}) { playSmart({ url: '/sounds/glass.mp3', volume: 0.85, category: 'targeted', actorId, targetId }); }

// Doğum Günü (Parti Düdüğü)
export function sfxPartyHorn() { playSmart({ url: '/sounds/horn.mp3', volume: 0.85, category: 'global' }); }

// Masaya vurunca çalacak bas sarsıntı sesi
export function sfxTableSlap() { playSmart({ url: '/sounds/table_slap.mp3', volume: 0.9, category: 'global' }); }

// Kart destesi karıştırma sesi
export function sfxShuffle() { playSmart({ url: '/sounds/shuffle.mp3', volume: 0.85, category: 'global' }); }

// ── YENİ EKLENEN SES SİSTEMLERİ ──
export function sfxLobbyJoin() { playSmart({ url: '/sounds/lobby_join.mp3', volume: 0.8, category: 'global' }); }
export function sfxGameStart() { playSmart({ url: '/sounds/game_start.mp3', volume: 0.85, category: 'global' }); }
export function sfxTradeProposed({ actorId, targetId } = {}) { playSmart({ url: '/sounds/trade_proposed.mp3', volume: 0.85, category: 'targeted', actorId, targetId }); }
export function sfxTradeAccepted({ actorId, targetId } = {}) { playSmart({ url: '/sounds/trade_accepted.mp3', volume: 0.85, category: 'targeted', actorId, targetId }); }
export function sfxTradeRejected({ actorId, targetId } = {}) { playSmart({ url: '/sounds/trade_rejected.mp3', volume: 0.8, category: 'targeted', actorId, targetId }); }
export function sfxDiceRoll() { playSmart({ url: '/sounds/dice_roll.mp3', volume: 0.85, category: 'global' }); }
export function sfxCopied() { playSmart({ url: '/sounds/copied.mp3', volume: 0.85, category: 'local', actorId: localPlayerId }); }
export function sfxChatSent() { playSmart({ url: '/sounds/chat_sent.mp3', volume: 0.75, category: 'global' }); }
export function sfxRageQuit() { playSmart({ url: '/sounds/rage_quit.mp3', volume: 0.9, category: 'global' }); }
export function sfxUndo({ actorId } = {}) { playSmart({ url: '/sounds/undo.mp3', volume: 0.8, category: 'local', actorId }); }
export function sfxDoubleRent({ actorId, targetId } = {}) { playSmart({ url: '/sounds/double_rent.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxHouse({ actorId } = {}) { playSmart({ url: '/sounds/house.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxHotel({ actorId } = {}) { playSmart({ url: '/sounds/hotel.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxDisconnect() { playSmart({ url: '/sounds/disconnect.mp3', volume: 0.8, category: 'global' }); }
export function sfxReconnect() { playSmart({ url: '/sounds/reconnect.mp3', volume: 0.85, category: 'global' }); }

// ── EKSTRA EFEKTLER (PLANLANAN YENİ SESLER) ──
export function sfxJackpot() { playSmart({ url: '/sounds/jackpot.mp3', volume: 0.9, category: 'global' }); }
export function sfxWompWomp() { playSmart({ url: '/sounds/wompwomp.mp3', volume: 0.9, category: 'global' }); }
export function sfxCricket() { playSmart({ url: '/sounds/cricket.mp3', volume: 0.85, category: 'global' }); }
export function sfxSwordClash({ actorId, targetId } = {}) { playSmart({ url: '/sounds/sword_clash.mp3', volume: 0.9, category: 'targeted', actorId, targetId }); }
export function sfxCrumple({ actorId } = {}) { playSmart({ url: '/sounds/crumple.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxHeartbeat() { playSmart({ url: '/sounds/heartbeat.mp3', volume: 0.8, category: 'local', actorId: localPlayerId }); }
export function sfxBlackMarket({ actorId } = {}) { playSmart({ url: '/sounds/blackmarket.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxCoinsCling({ actorId } = {}) { playSmart({ url: '/sounds/coins_cling.mp3', volume: 0.85, category: 'local', actorId }); }
export function sfxVaultClose({ actorId } = {}) { playSmart({ url: '/sounds/vault_close.mp3', volume: 0.9, category: 'local', actorId }); }

export function sfxPlayEffectFlame() { playSmart({ url: '/sounds/sfx_effect_flame.mp3', volume: 0.8, category: 'global', fallbackUrl: '/sounds/whoosh.mp3' }); }
export function sfxPlayEffectThunder() { playSmart({ url: '/sounds/sfx_effect_thunder.mp3', volume: 0.85, category: 'global', fallbackUrl: '/sounds/alert.mp3' }); }
export function sfxPlayEffectCosmic() { playSmart({ url: '/sounds/sfx_effect_cosmic.mp3', volume: 0.8, category: 'global', fallbackUrl: '/sounds/whoosh.mp3' }); }
export function sfxPlayEffectBlackhole() { playSmart({ url: '/sounds/sfx_effect_blackhole.mp3', volume: 0.85, category: 'global', fallbackUrl: '/sounds/glass.mp3' }); }
export function sfxPlayEffectConfetti() { playSmart({ url: '/sounds/sfx_effect_confetti.mp3', volume: 0.8, category: 'global', fallbackUrl: '/sounds/horn.mp3' }); }
export function sfxPlayEffectHeart() { playSmart({ url: '/sounds/sfx_effect_heart.mp3', volume: 0.75, category: 'global', fallbackUrl: '/sounds/click.mp3' }); }
export function sfxPlayEffectCash() { playSmart({ url: '/sounds/sfx_effect_cash.mp3', volume: 0.8, category: 'global', fallbackUrl: '/sounds/coin.mp3' }); }

export function stopAllSFX() {
  Object.values(audioInstances).forEach(audio => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) { /* ignore */ }
  });
}
