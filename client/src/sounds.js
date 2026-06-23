// Basit, dosyasız ses efektleri (Web Audio API ile sentezlenir)

let audioCtx = null;
let enabled = true;

// localStorage'dan tercih oku
try {
  const saved = localStorage.getItem('monopolyDealSound');
  if (saved === 'off') enabled = false;
} catch (e) { /* ignore */ }

export function isSoundEnabled() {
  return enabled;
}

let bgmAudio = null;

export function setSoundEnabled(value) {
  enabled = value;
  try { localStorage.setItem('monopolyDealSound', value ? 'on' : 'off'); } catch (e) { /* ignore */ }
  if (!value && bgmAudio) bgmAudio.pause();
  else if (value && bgmAudio) bgmAudio.play().catch(() => { });
}

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Tek bir "beep" sesi çalar
function tone(freq, startTime, duration, { type = 'sine', volume = 0.2 } = {}) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + startTime);
  osc.stop(ctx.currentTime + startTime + duration);
}

function play(fn) {
  if (!enabled) return;
  try { fn(); } catch (e) { /* ignore - autoplay kısıtlamaları vs */ }
}

// MP3 gibi dış dosyaları çalmak için yardımcı fonksiyon
function playFile(url, volume = 0.5) {
  if (!enabled) return;
  try {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.play().catch(e => console.warn('Ses çalınamadı (Autoplay kısıtlaması olabilir):', e));
  } catch (e) { /* ignore */ }
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

// Gerilim Müziği Hızlandırıcısı (Biri kazanmaya yaklaşınca)
export function setBgmTension(isTense) {
  if (bgmAudio) {
    bgmAudio.playbackRate = isTense ? 1.15 : 1.0;
  }
}

export function stopBGM() {
  if (bgmAudio) bgmAudio.pause();
}

// ── SES EFEKTLERİ ──

// Kart oynama - kısa "tık" veya mp3
export function sfxCardPlay() {
  playFile('/sounds/card_play.mp3', 0.85);
}

// Kart çekme - hızlı yükselen "hışırtı" veya mp3
export function sfxCardDraw() {
  playFile('/sounds/card_draw.mp3', 0.8);
}

// Kart fırlatma (masaya atma) - hızlı alçalan "whoosh"
export function sfxWhoosh() {
  playFile('/sounds/whoosh.mp3', 0.7);
}

// Kart bankaya konuldu - "ka-ching" benzeri
export function sfxCoin() {
  playFile('/sounds/coin.mp3', 0.85);
}

// Hata / geçersiz hamle
export function sfxError() {
  playFile('/sounds/error.mp3', 0.8);
}

// Sıra sana geçti - dikkat çekici, yükselen melodi
export function sfxYourTurn() {
  playFile('/sounds/your-turn.mp3', 0.85);
}

// ── MONOPOLY DEAL KART SESLERİ (MP3) ──
// Not: Dosyalar /public/sounds/ altına konacak.
export function sfxActionDealbreaker() { playFile('/sounds/dealbreaker_haciz.mp3', 0.9); }
export function sfxActionJustSayNo() { playFile('/sounds/justsayno_reddet.mp3', 0.9); }
export function sfxActionCounterJustSayNo() { playFile('/sounds/justsayno_counter_reddet_reddet.mp3', 0.95); }
export function sfxActionSlyDeal() { playFile('/sounds/slydeal_tapu.mp3', 0.9); }
export function sfxActionForcedDeal() { playFile('/sounds/forceddeal_degiskokus.mp3', 0.9); }
export function sfxActionDebtCollector() { playFile('/sounds/debtcollector_tasilat.mp3', 0.9); }
export function sfxActionBirthday() { playFile('/sounds/birthday_dogum_gunu.mp3', 0.9); }
export function sfxActionPassGoTwoDraw() { playFile('/sounds/two-draw_2-kart-cek.mp3', 0.9); }

// Kira kartı & ödeme (kiranızı ödeyin)
export function sfxRentCardPlayed() { playFile('/sounds/rent_kira_karti.mp3', 0.9); }
export function sfxRentPaymentDue() { playFile('/sounds/rent-paid_kiranizi-odeyin.mp3', 0.9); }

// Bankaya para koyma
export function sfxBankDeposit1M() { playFile('/sounds/bank_deposit_1m.mp3', 0.85); }
export function sfxBankDeposit2M() { playFile('/sounds/bank_deposit_2m.mp3', 0.85); }
export function sfxBankDeposit3M() { playFile('/sounds/bank_deposit_3m.mp3', 0.85); }
export function sfxBankDeposit4M() { playFile('/sounds/bank_deposit_4m.mp3', 0.85); }
export function sfxBankDeposit5M() { playFile('/sounds/bank_deposit_5m.mp3', 0.85); }
export function sfxBankDeposit10M() { playFile('/sounds/bank_deposit_10m.mp3', 0.85); }

// Arazi kartı
export function sfxPropertyPlayed() { playFile('/sounds/property_play.mp3', 0.85); }
export function sfxJokerPropertyPlayed() { playFile('/sounds/joker_arazi.mp3', 0.9); }

// İlçe/mahalle (tekil MP3)
export function sfxStreetPropertyPlayed(slug) {
  if (!slug) return;
  playFile(`/sounds/${slug}.mp3`, 0.9);
}

export function sfxActionRentAll() { playFile('/sounds/rent_kira_karti.mp3', 0.85); }

// Turun bitti - kısa, alçalan
export function sfxTurnEnded() {
  playFile('/sounds/turn_ended.mp3', 0.8);
}

// Reddet! / itiraz uyarısı
export function sfxAlert() {
  playFile('/sounds/alert.mp3', 0.85);
}

// Ödeme isteği geldi
export function sfxPaymentDue() {
  playFile('/sounds/payment_due.mp3', 0.85);
}

// Kazanma fanfarı
export function sfxWin() {
  playFile('/sounds/win.mp3', 0.9);
}

// Genel UI tıklama sesi
export function sfxClick() {
  playFile('/sounds/click.mp3', 0.7);
}

// Ev/Otel inşa etme
export function sfxBuild() {
  playFile('/sounds/build.mp3', 0.85);
}

// Son 10 saniye tik-tak sesi
export function sfxTick() {
  playFile('/sounds/tick.mp3', 0.65);
}

// --- EMOJİ SESLERİ ---
export function sfxLaugh() { playFile('/sounds/laugh.mp3', 0.75); }
export function sfxAngry() { playFile('/sounds/angry.mp3', 0.75); }
export function sfxChaChing() { playFile('/sounds/cha-ching.mp3', 0.8); }
export function sfxFire() { playFile('/sounds/fire.mp3', 0.85); }
export function sfxClap() { playFile('/sounds/clap.mp3', 0.85); }
export function sfxCry() { playFile('/sounds/cry.mp3', 0.85); }
export function sfxShock() { playFile('/sounds/shock.mp3', 0.85); }

// Anlaşma Bozucu (Cam Kırılma Sesi)
export function sfxGlassBreak() { playFile('/sounds/glass.mp3', 0.85); }

// Doğum Günü (Parti Düdüğü)
export function sfxPartyHorn() { playFile('/sounds/horn.mp3', 0.85); }

// Masaya vurunca çalacak bas sarsıntı sesi
export function sfxTableSlap() {
  playFile('/sounds/table_slap.mp3', 0.9);
}

// Kart destesi karıştırma sesi
export function sfxShuffle() {
  playFile('/sounds/shuffle.mp3', 0.85);
}

// ── YENİ EKLENEN SES SİSTEMLERİ ──
export function sfxLobbyJoin() { playFile('/sounds/lobby_join.mp3', 0.8); }
export function sfxGameStart() { playFile('/sounds/game_start.mp3', 0.85); }
export function sfxTradeProposed() { playFile('/sounds/trade_proposed.mp3', 0.85); }
export function sfxTradeAccepted() { playFile('/sounds/trade_accepted.mp3', 0.85); }
export function sfxTradeRejected() { playFile('/sounds/trade_rejected.mp3', 0.8); }
export function sfxDiceRoll() { playFile('/sounds/dice_roll.mp3', 0.85); }
export function sfxCopied() { playFile('/sounds/copied.mp3', 0.85); }
export function sfxChatSent() { playFile('/sounds/chat_sent.mp3', 0.75); }
export function sfxRageQuit() { playFile('/sounds/rage_quit.mp3', 0.9); }
export function sfxUndo() { playFile('/sounds/undo.mp3', 0.8); }
export function sfxDoubleRent() { playFile('/sounds/double_rent.mp3', 0.9); }
export function sfxHouse() { playFile('/sounds/house.mp3', 0.85); }
export function sfxHotel() { playFile('/sounds/hotel.mp3', 0.85); }
export function sfxDisconnect() { playFile('/sounds/disconnect.mp3', 0.8); }
export function sfxReconnect() { playFile('/sounds/reconnect.mp3', 0.85); }
