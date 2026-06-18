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
  else if (value && bgmAudio) bgmAudio.play().catch(() => {});
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
  try { localStorage.setItem('md_bgm_vol', volume); } catch(e) {}
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

// Kart oynama - kısa "tık"
export function sfxCardPlay() {
  play(() => tone(520, 0, 0.08, { type: 'triangle', volume: 0.15 }));
}

// Kart çekme - hızlı yükselen "hışırtı"
export function sfxCardDraw() {
  play(() => {
    tone(300, 0, 0.1, { type: 'sine', volume: 0.1 });
    tone(600, 0.05, 0.1, { type: 'sine', volume: 0.08 });
  });
}

// Kart fırlatma (masaya atma) - hızlı alçalan "whoosh"
export function sfxWhoosh() {
  play(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  });
}

// Kart bankaya konuldu - "ka-ching" benzeri
export function sfxCoin() {
  playFile('/sounds/coin.mp3', 0.6);
}

// Hata / geçersiz hamle
export function sfxError() {
  play(() => {
    tone(200, 0, 0.15, { type: 'sawtooth', volume: 0.12 });
    tone(150, 0.1, 0.18, { type: 'sawtooth', volume: 0.12 });
  });
}

// Sıra sana geçti - dikkat çekici, yükselen melodi
export function sfxYourTurn() {
  // playFile fonksiyonu ile public klasöründeki MP3 dosyasını çalıyoruz:
  playFile('/sounds/your-turn.mp3', 0.7);
}

// Turun bitti - kısa, alçalan
export function sfxTurnEnded() {
  play(() => {
    tone(440, 0, 0.1, { type: 'sine', volume: 0.15 }); // A4
    tone(330, 0.08, 0.15, { type: 'sine', volume: 0.15 }); // E4
  });
}

// Reddet! / itiraz uyarısı
export function sfxAlert() {
  play(() => {
    tone(1000, 0, 0.07, { type: 'square', volume: 0.12 });
    tone(1000, 0.12, 0.07, { type: 'square', volume: 0.12 });
  });
}

// Ödeme isteği geldi
export function sfxPaymentDue() {
  play(() => {
    tone(660, 0, 0.1, { type: 'triangle', volume: 0.18 });
    tone(990, 0.1, 0.15, { type: 'triangle', volume: 0.18 });
  });
}

// Kazanma fanfarı
export function sfxWin() {
  playFile('/sounds/win.mp3', 0.8);
}

// Genel UI tıklama sesi
export function sfxClick() {
  play(() => tone(800, 0, 0.05, { type: 'triangle', volume: 0.1 }));
}

// Ev/Otel inşa etme
export function sfxBuild() {
  play(() => {
    tone(200, 0, 0.1, { type: 'square', volume: 0.15 });
    tone(400, 0.1, 0.15, { type: 'square', volume: 0.15 });
    tone(600, 0.2, 0.2, { type: 'square', volume: 0.15 });
  });
}

// Son 10 saniye tik-tak sesi
export function sfxTick() {
  playFile('/sounds/tick.mp3', 0.5);
}

// --- EMOJİ SESLERİ ---
export function sfxLaugh() {
  playFile('/sounds/laugh.mp3', 0.6);
}

export function sfxAngry() {
  playFile('/sounds/angry.mp3', 0.6);
}

export function sfxChaChing() {
  playFile('/sounds/cha-ching.mp3', 0.7);
}

// Anlaşma Bozucu (Cam Kırılma Sesi)
export function sfxGlassBreak() {
  playFile('/sounds/glass.mp3', 0.8);
}

// Doğum Günü (Parti Düdüğü)
export function sfxPartyHorn() {
  playFile('/sounds/horn.mp3', 0.7);
}
