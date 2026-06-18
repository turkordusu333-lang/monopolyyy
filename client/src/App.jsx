import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence, useIsPresent } from 'framer-motion';
import './App.css';
import {
  isSoundEnabled, setSoundEnabled, sfxCardPlay, sfxCardDraw, sfxWhoosh, sfxCoin, sfxError, sfxYourTurn, sfxTurnEnded, sfxAlert, sfxPaymentDue, sfxBuild, sfxClick,
  sfxTick, playBGM, stopBGM, setBgmVolume, sfxLaugh, sfxAngry, sfxChaChing
} from './sounds';
import { THEMES, COLOR_INFO, PLAYER_COLORS, SET_SIZES, ACTION_STYLE, CARD_TOTAL_COUNTS } from './constants';
import { getCardTip, isSetComplete, getCardTotalCount, getRarity } from './utils';
import { ThemeContext } from './ThemeContext';

import { Modal } from './components/Modal';
import { PlayerPanel } from './components/PlayerPanel';
import { CardVisual } from './components/CardVisual';
import { VictoryOverlay } from './components/VictoryOverlay';
import { ToastStack } from './components/ToastStack';
import { CardRentPanel, CardProbabilityPanel } from './components/CardPanels';
import { AnimatedCounter } from './AnimatedCounter';

// GitHub'a yanlışlıkla yüklenen .env dosyasındaki eski modem adresini yoksayıyoruz
const SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;

const inputStyle = { width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' };

const btnStyle = (bg) => ({ padding: '8px 14px', background: bg, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 });

const ACTION_NAMES = { rent: 'Kira', birthday: 'Doğum Günüm!', debtcollector: 'Borç Tahsildarı', slydeal: 'Sinsi Anlaşma', forceddeal: 'Zorunlu Anlaşma', dealbreaker: 'Anlaşma Bozucu' };

// ---- GELİŞMİŞ İPUCU ÜRETİCİ ----
const getDetailedCardTip = (card) => {
  if (card.type === 'money') return `Banka kasanıza anında ${card.value}M nakit ekler. Ödemeler için arazilerinizi kaybetmemek adına kasanızda para tutmak her zaman iyidir.`;
  if (card.type === 'property') {
    if (card.isWild) return 'Çok Güçlü! İstediğiniz renge dönüştürerek eksik setlerinizi hızla tamamlayabilirsiniz.';
    if (card.isDual) return 'İki renkli esnek kart. Oyunun gidişatına göre rengini çevirip farklı setleri tamamlamak için kullanabilirsiniz.';
    return `Bu kartı masaya aç. ${COLOR_INFO[card.activeColor || card.color]?.name || card.color} setini tamamlamak için toplam ${SET_SIZES[card.activeColor || card.color] || 3} kart gerekiyor. Tam set olduğunda kira değeri muazzam artar.`;
  }
  if (card.type === 'action') {
    const tips = {
      passgo: 'Desteden bedavaya 2 yeni kart çekersin. Tur sonu elinde 7\'den fazla kart kalmamasına dikkat et.',
      dealbreaker: 'OYUNDAKİ EN ACIMASIZ KART! Rakibin tamamlanmış (ev/otel dahil) koca bir setini tek hamlede çalarsın.',
      slydeal: 'Rakibin henüz tamamlanmamış (tam set olmayan) bir arazisini sinsi bir şekilde çalıp kendine alırsın.',
      forceddeal: 'Kendi değersiz/işe yaramaz bir arazini rakibe verip, ondaki değerli bir araziyi zorla takas edersin.',
      debtcollector: 'Seçtiğin bir rakibin canını yak. Sana anında 5M ödemek zorunda kalır.',
      birthday: 'Bugün senin doğum günün! Masadaki BÜTÜN rakipler sana 2M hediye vermek zorundadır.',
      justsayno: 'Sana karşı yapılan hırsızlık, kira veya takas işlemlerini iptal eden mükemmel savunma kartı! Aynı zamanda bankaya 4M olarak da konabilir.',
      rent: 'Arazilerin üzerinden rakiplerden para kopar. Arazin ne kadar çoksa, o kadar çok öderler.',
      doublerent: 'Herhangi bir Kira kartıyla birlikte oynanır ve alacağın kirayı anında 2\'ye katlar. Rakipleri iflas ettirmek için harika!',
      house: 'Tamamlanmış bir setine inşa ederek kira değerini kalıcı olarak +3M artırır.',
      hotel: 'Zaten Ev dikilmiş bir setine inşa ederek kirayı Ev\'in üzerine kalıcı olarak +4M daha artırır.'
    };
    return tips[card.action] || 'Bu aksiyon kartını stratejik bir avantaj için kullan veya bankaya para olarak at.';
  }
  return 'Bu kartı stratejik kullan veya bankaya koy.';
};

// ---- İÇ İÇE GEÇMİŞ (YELPAZE) ARAZİ GÖRÜNÜMÜ ----
const FannedPropertySet = ({ color, cards, buildings, isOwn, onFlip, onHoverCard }) => {
  const info = COLOR_INFO[color] || { hex: '#fff', name: color };
  const isComplete = isSetComplete(cards, color);
  
  return (
    <div className="champion-set-wrapper" style={{ 
      background: isComplete ? `linear-gradient(135deg, ${info.hex}44, rgba(0,0,0,0.4))` : 'rgba(0,0,0,0.2)', 
      padding: '12px 10px', 
      borderRadius: 12, 
      border: `2px solid ${isComplete ? info.hex : info.hex + '55'}`, 
      boxShadow: isComplete ? `0 0 15px ${info.hex}88` : 'none',
      '--glow-color': `${info.hex}CC`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      position: 'relative'
    }}>
      <div style={{ fontSize: 12, color: info.light || '#fff', fontWeight: 900, marginBottom: 16, textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.8)', textAlign: 'center' }}>
        {info.name} {isComplete && '★'}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 10px', height: 110, alignItems: 'flex-start' }}>
        {cards.map((c, i) => (
          <div 
            key={c.id} 
            onMouseEnter={() => onHoverCard && onHoverCard(c)}
            onMouseLeave={() => onHoverCard && onHoverCard(null)}
            style={{ 
              marginLeft: i > 0 ? -40 : 0, 
              zIndex: i, 
              position: 'relative', 
              transform: `rotate(${(i - (cards.length - 1) / 2) * 8}deg) translateY(${Math.abs(i - (cards.length - 1) / 2) * 4}px)`, 
              transition: 'transform 0.2s', 
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
              cursor: isOwn && onFlip && (c.isWild || c.isDual) ? 'pointer' : 'default'
            }}
            onClick={() => isOwn && onFlip && (c.isWild || c.isDual) && onFlip(c)}
          >
            <CardVisual card={c} small />
          </div>
        ))}
      </div>
      
      {(buildings?.[color]?.houses > 0 || buildings?.[color]?.hotel) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {buildings[color].houses > 0 && <span style={{ background: '#27AE60', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>🏠 Ev</span>}
          {buildings[color].hotel && <span style={{ background: '#C0392B', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>🏨 Otel</span>}
        </div>
      )}
    </div>
  );
};

// ---- MAIN APP ----
export default function App() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('lobby'); // lobby, game
  const [myName, setMyName] = useState(localStorage.getItem('md_name') || '');
  const [roomCode, setRoomCode] = useState(localStorage.getItem('md_room') || '');
  const [joinCode, setJoinCode] = useState(localStorage.getItem('md_room') || '');
  const [playerId, setPlayerId] = useState(localStorage.getItem('md_pid') || null);
  const [gameState, setGameState] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [modal, setModal] = useState(null); // { type, card, step, ... }
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [discardMode, setDiscardMode] = useState(false);
  const [discardSelected, setDiscardSelected] = useState([]);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [viewingPlayerId, setViewingPlayerId] = useState(null);
  const [localHand, setLocalHand] = useState([]); // Elimizdeki kartları sıralamak için yerel durum
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [paymentSelection, setPaymentSelection] = useState({ bankCardIds: [], propertyCardIds: [] });
  const [selectedTheme, setSelectedTheme] = useState('default'); // host'un lobide seçtiği tema
  const [manifest, setManifest] = useState(null);
  const [emotes, setEmotes] = useState([]); // [{id, senderId, emoji}]
  const [actionOverlay, setActionOverlay] = useState(null); // { text, icon }
  const [moneyParticles, setMoneyParticles] = useState([]); // [{id, dx, dy, dr, icon}]
  const [thrownCard, setThrownCard] = useState(null); // card object
  const [smokeParticles, setSmokeParticles] = useState([]); // Toz dumanı
  const playerPanelRefs = useRef({}); // Oyuncu panellerinin pozisyonları için
  const myBankRef = useRef(null); // Kendi bankamızın pozisyonu için
  const [previewCard, setPreviewCard] = useState(null);
  const [payingFlyingCards, setPayingFlyingCards] = useState([]); // Ödeme animasyonu için
  const [roomSettings, setRoomSettings] = useState({ autoEndTurn: true, turnTimer: 0, winSets: 3, startCards: 5, handLimit: 7, isPublic: false }); 
  const [publicRooms, setPublicRooms] = useState([]); // Açık odalar
  const draggedRef = useRef(false); // Kart sürükleniyor mu? (onClick ile çakışmayı önlemek için)
  const [isDragging, setIsDragging] = useState(false); // Kart sürükleniyor mu?
  const [dragTrail, setDragTrail] = useState([]); // Sürükleme izi için
  const [dragOverTarget, setDragOverTarget] = useState(null); // Hangi drop target'ın üzerindeyiz? ('bank', 'properties', null)
  const [boardShake, setBoardShake] = useState(false);
  const [flyingCards, setFlyingCards] = useState([]); // Animasyonlu kartlar
  const prevHandIds = useRef([]);
  const deckRef = useRef(null);
  const [isConnected, setIsConnected] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [soundOn, setSoundOn] = useState(() => {
    const saved = localStorage.getItem('md_sound');
    return saved !== null ? saved === 'true' : isSoundEnabled();
  });
  const [bgmVolume, setBgmVolumeState] = useState(() => {
    const saved = localStorage.getItem('md_bgm_vol');
    return saved !== null ? parseFloat(saved) : 0.15;
  });
  const [ttsOn, setTtsOn] = useState(() => {
    const saved = localStorage.getItem('md_tts');
    return saved !== null ? saved === 'true' : true; // Varsayılan olarak açık
  });
  const logRef = useRef(null);
  const prevLogTimeRef = useRef(null);
  const initialDealLogged = useRef(false);
  const [debugLogs, setDebugLogs] = useState([]); // Sol alt debug konsolu için
  const [showDebug, setShowDebug] = useState(false); // Debug ekranı açık/kapalı durumu
  const [showDeckStats, setShowDeckStats] = useState(false); // Deste istatistik modalı
  const [now, setNow] = useState(Date.now()); // Canlı tur süresi sayacı için
  const prevTurnAlertRef = useRef(null); // Süre dolduğunda çalacak alarm için
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Dinamik önizleme ekranı için

  // ---- TEMEL DURUM SABİTLERİ (TDZ Hatasını Önlemek İçin En Üstte) ----
  const me = gameState?.players?.find(p => p.id === playerId);
  const isMyTurn = gameState?.currentPlayerId === playerId;
  const isBlocked = (gameState?.pendingChallenges?.length > 0) || (gameState?.pendingPayments?.length > 0);
  const activeTheme = gameState?.theme || selectedTheme;

  // ---- DİNAMİK MOUSE TAKİBİ (Sadece Masaüstü) ----
  useEffect(() => {
    if (isMobile) return;
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isMobile]);

  useEffect(() => {
    // Başlangıçta global sesi local storage bilgisine göre senkronize et
    setSoundEnabled(soundOn);
    
    // Arka plan müziğini başlatmayı dene (tarayıcı izin verirse çalar)
    if (soundOn) {
      playBGM();
    } else {
      stopBGM();
    }
    
    // Kullanıcı sayfayla ilk etkileşime girdiğinde autoplay engeli kalkar, müziği tekrar tetikle
    const handleFirstInteraction = () => { if (soundOn) playBGM(); window.removeEventListener('click', handleFirstInteraction); };
    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, [soundOn]);

  // ---- CANLI SÜRE SAYACI ----
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- YERLEŞİK TÜRKÇE SESLENDİRME (TTS) ----
  const playTurkishVoice = useCallback((text) => {
    if (!ttsOn) return;
    window.speechSynthesis.cancel(); // Önceki sesi sustur
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    u.rate = 1.15; // Konuşma hızı
    u.pitch = 1.1; // Ses tonu
    
    // Cihazdaki en kaliteli Türkçe sesi bulmaya çalış
    const voices = window.speechSynthesis.getVoices();
    const turkishVoice = voices.find(v => v.lang === 'tr-TR' && (v.name.includes('Google') || v.name.includes('Premium')));
    if (turkishVoice) u.voice = turkishVoice;

    window.speechSynthesis.speak(u);
  }, [ttsOn]);

  // ---- BİLDİRİM (TOAST) SİSTEMİ ----
  const showToast = useCallback((text, kind = 'info', duration = 2500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text, kind }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  // --- Animasyon Fonksiyonları (TDZ Hatasını Önlemek İçin En Üste Taşındı) ---
  const spawnSmoke = useCallback(() => {
    const count = 10;
    const newSmoke = [];
    for (let i = 0; i < count; i++) {
      newSmoke.push({
        id: Math.random(),
        dx: (Math.random() - 0.5) * 140 + 'px',
        dy: (Math.random() - 0.5) * 140 + 'px',
      });
    }
    setSmokeParticles(newSmoke);
    setTimeout(() => setSmokeParticles([]), 800);
  }, []);

  const spawnMoney = useCallback((options = {}) => {
    const { icon = '💸', fromPos, toPos, count = 12 } = options;
    
    let newParts = [];
    if (fromPos && toPos) {
        sfxCoin(); 
        for(let i=0; i<count; i++) {
            const sx = fromPos.x + (Math.random() - 0.5) * 50;
            const sy = fromPos.y + (Math.random() - 0.5) * 50;
            const dx = toPos.x + (Math.random() - 0.5) * 80;
            const dy = toPos.y + (Math.random() - 0.5) * 80;
            newParts.push({ id: Math.random(), icon, sx: sx + 'px', sy: sy + 'px', dx: dx + 'px', dy: dy + 'px', dr: (Math.random() - 0.5) * 720 + 'deg' });
        }
    } else {
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight / 2;
        for(let i=0; i<count; i++) {
            newParts.push({ id: Math.random(), icon, sx: startX + 'px', sy: startY + 'px', dx: (Math.random() * window.innerWidth) + 'px', dy: (Math.random() * (window.innerHeight / 2)) + 'px', dr: (Math.random() - 0.5) * 720 + 'deg' });
        }
    }
    setMoneyParticles(prev => [...prev, ...newParts]);
    setTimeout(() => { setMoneyParticles(prev => prev.filter(p => !newParts.includes(p))); }, 1600);
  }, []);

  // ---- SÜRE BİTİMİ UYARI SESİ & OTOMATİK TUR ATLATMA ----
  useEffect(() => {
    if (isMyTurn && !isBlocked && gameState?.turnTimer > 0 && gameState?.turnStartTime) {
      const remaining = gameState.turnTimer - Math.floor((now - gameState.turnStartTime) / 1000);

      // SÜRE AZALDI TİK-TAK SESİ
      if (remaining > 0 && remaining <= 10) {
        sfxTick();
      }

      if (remaining <= 0 && prevTurnAlertRef.current !== gameState.turnStartTime) {
        sfxAlert(); // Süre doldu alarmı!
        playTurkishVoice("Süren doldu! Turunu otomatik geçiriyorum.");
        showToast("Süreniz doldu! Otomatik geçiliyor...", "error");
        
        // Otomatik Tur Atlama Tetikleyicisi
        socket?.emit('endTurn', { isTimeout: true }, (res) => {
          setModal(null);
          setSelectedCard(null);
          setDiscardMode(false);
          setDiscardSelected([]);

          if (!res.ok && res.needsDiscard) {
            // Otomatik Fazla Kartları Atma (Ceza)
            const currentPlayer = gameState?.players?.find(p => p.id === playerId);
            const over = (currentPlayer?.hand?.length || 0) - (gameState.handLimit || 7);
            if (over > 0 && currentPlayer?.hand) {
              const cardsToDiscard = currentPlayer.hand.slice(0, over).map(c => c.id);
              socket.emit('discardCards', { cardIds: cardsToDiscard }, (discardRes) => {
                if (discardRes.ok) socket.emit('endTurn', { isTimeout: true });
              });
            }
          } else {
            setError('');
          }
        });
        
        prevTurnAlertRef.current = gameState.turnStartTime;
      }
    } else if (!isMyTurn) {
      prevTurnAlertRef.current = null;
    }
  }, [now, gameState?.currentPlayerId, playerId, isMyTurn, isBlocked, gameState?.turnTimer, gameState?.turnStartTime, gameState?.pendingChallenges, gameState?.pendingPayments, gameState?.players, gameState?.handLimit, socket, playTurkishVoice, showToast]);

  // ---- CONSOLE KANCA (INTERCEPTOR) ----
  useEffect(() => {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    console.log = (...args) => { origLog(...args); setDebugLogs(prev => [...prev.slice(-19), `[LOG] ${args.join(' ')}`]); };
    console.warn = (...args) => { origWarn(...args); setDebugLogs(prev => [...prev.slice(-19), `[WARN] ${args.join(' ')}`]); };
    console.error = (...args) => { origError(...args); setDebugLogs(prev => [...prev.slice(-19), `[ERR] ${args.join(' ')}`]); };
    // Temizlik
    return () => { console.log = origLog; console.warn = origWarn; console.error = origError; };
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    localStorage.setItem('md_sound', next ? 'true' : 'false'); // Ses tercihini tarayıcıya kaydet
  };

  const toggleTts = () => {
    const next = !ttsOn;
    setTtsOn(next);
    localStorage.setItem('md_tts', next ? 'true' : 'false');
    playTurkishVoice(next ? 'Türkçe seslendirme açık.' : 'Seslendirme kapalı.');
  };

  useEffect(() => {
    // Render.com üzerinde en hızlı ve sorunsuz bağlantı için WebSocket öncelikli ayar
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    s.on('connect', () => {
      setStatus('Bağlandı');
      setIsConnected(true);
      // Sayfa yenilendiyse veya bağlantı koptuysa otomatik odaya geri gir
      const savedRoom = localStorage.getItem('md_room');
      const savedName = localStorage.getItem('md_name');
      const savedPid = localStorage.getItem('md_pid');

      if (savedRoom && savedName && savedPid) {
        s.emit('joinRoom', { roomCode: savedRoom, name: savedName, reconnectPlayerId: savedPid }, (res) => {
          if (res.ok) {
            setPlayerId(savedPid);
            setStatus('Oturum geri yüklendi');
          } else {
            // Oda artık yoksa temizle
            localStorage.removeItem('md_room');
            localStorage.removeItem('md_pid');
          }
        });
      }
    });

    s.on('disconnect', () => {
      setStatus('Bağlantı kesildi');
      setIsConnected(false);
    });
    
    s.on('connect_error', (err) => {
      console.error('Socket bağlantı hatası:', err.message);
      setStatus('Sunucuya bağlanılamıyor! Yeniden deneniyor...');
    });
    s.on('publicRooms', (rooms) => setPublicRooms(rooms));
    s.on('roomClosed', () => { setStatus('Oda host tarafından kapatıldı.'); handleExit(); });
    s.on('returnedToLobby', () => { setStatus('Oyun bitirildi, lobiye dönüldü.'); setScreen('lobby'); });
    
    s.on('gameState', (state) => {
      setGameState(state);
      if (state.phase === 'playing') setScreen('game');
      else if (state.phase === 'lobby') setScreen('lobby'); // OYUN BİTTİĞİNDE HERKESİ LOBİYE ÇEK!
    });

    s.on('gameStarted', () => setStatus('Oyun başladı!'));
    s.on('playerJoined', ({ name, playerCount }) => setStatus(`${name} katıldı (${playerCount} oyuncu)`));
    
    // Sunucudan gelen isim değişikliği olayını dinle
    s.on('playerNameChanged', ({ oldName, newName }) => {
      const msg = `${oldName} ismini ${newName} olarak değiştirdi.`;
      setStatus(msg);
      showToast(`👤 ${msg}`, 'info');
      playTurkishVoice(msg);
    });
    
    s.on('playerEmote', ({ senderId, emoji }) => {
      const id = Math.random();
      setEmotes(prev => [...prev, { id, senderId, emoji }]);
      if (emoji === '😂') sfxLaugh();
      else if (emoji === '😡') sfxAngry();
      else if (emoji === '💸') sfxChaChing();
      else sfxClick(); // Diğer emojiler için varsayılan minik 'pıt' sesi çal
      setTimeout(() => setEmotes(prev => prev.filter(e => e.id !== id)), 2500);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  const handleCloseRoom = () => {
    if (!socket || !roomCode) return;
    socket.emit('closeRoom', { roomCode }, (res) => {
      if (res.ok) {
        handleExit(); // Server başarılı derse anında tamamen çıkış yap
      } else {
        setError(res.error || 'Oda kapatılamadı');
      }
    });
  };

  // Kartın şu an oynanabilir (aksiyon gereksinimlerini karşılıyor) olup olmadığını kontrol et
  const isCardUsable = (card) => {
    if (!gameState || !me) return false;

    // İtiraz durumunda sadece "Reddet!" oynanabilir
    if (card.action === 'justsayno') {
      return !!gameState.myPendingChallenge;
    }

    if (!isMyTurn || isBlocked || gameState.actionsLeft <= 0) return false;

    if (card.type === 'money') return true; 
    if (card.type === 'property') return true;

    if (card.type === 'action') {
      const others = gameState.players.filter(p => p.id !== playerId);
      switch (card.action) {
        case 'passgo': return true;
        case 'birthday': return others.length > 0; // Başka oyuncu varsa doğum günü oynanabilir
        case 'debtcollector': return others.some(p => p.bankTotal > 0 || Object.values(p.properties).flat().length > 0);
        case 'rent': {
          if (card.colors === 'all') {
            // Joker Kira kartı: Benim arazim varsa veya başka oyuncularda arazi varsa oynanabilir
            const hasMyProps = Object.keys(me.properties || {}).some(c => me.properties[c]?.length > 0);
            const hasOtherProps = others.some(p => Object.keys(p.properties || {}).some(c => p.properties[c]?.length > 0));
            return hasMyProps || hasOtherProps;
          } else {
            // Belirli renk kira kartı: O renkten arazim varsa oynanabilir
            return card.colors.some(c => me.properties?.[c]?.length > 0);
          }
        }
        case 'slydeal': return others.some(p => Object.entries(p.properties || {}).some(([c, cards]) => cards.length > 0 && !isSetComplete(cards, c)));
        case 'forceddeal': {
          const myNonFull = Object.entries(me.properties || {}).some(([c, cards]) => cards.length > 0 && !isSetComplete(cards, c));
          const theirNonFull = others.some(p => Object.entries(p.properties || {}).some(([c, cards]) => cards.length > 0 && !isSetComplete(cards, c)));
          return myNonFull && theirNonFull;
        }
        case 'dealbreaker': return others.some(p => Object.entries(p.properties || {}).some(([c, cards]) => isSetComplete(cards, c)));
        case 'house': return Object.entries(me.properties || {}).some(([c, cards]) => c !== 'railroad' && c !== 'utility' && isSetComplete(cards, c) && !me.buildings?.[c]?.houses);
        case 'hotel': return Object.entries(me.properties || {}).some(([c, cards]) => c !== 'railroad' && c !== 'utility' && isSetComplete(cards, c) && me.buildings?.[c]?.houses > 0 && !me.buildings?.[c]?.hotel);
        default: return true;
      }
    }
    return false;
  };

  // Kira modalı için kira miktarını hesaplayan istemci tarafı fonksiyonu
  const calculateRentClient = (player, color) => {
    const props = player?.properties?.[color] || [];
    if (props.length === 0) return 0;

    const colorInfo = COLOR_INFO[color];
    if (!colorInfo) return 0;

    const count = Math.min(props.length, colorInfo.rents.length);
    let rent = colorInfo.rents[count - 1] || 0;

    const buildings = player?.buildings?.[color];
    if (buildings && isSetComplete(props, color)) {
        if (buildings.houses > 0) rent += 3 * buildings.houses; // Her ev için +3M
        if (buildings.hotel) rent += 4; // Otel için +4M (evin üstüne)
    }
    return rent;
  };

  // Tema değişince manifest.json yükle (isim override'ları için)
  useEffect(() => {
    if (!activeTheme || activeTheme === 'default') { setManifest(null); return; }
    let cancelled = false;
    fetch(`/decks/${activeTheme}/manifest.json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) setManifest(data); })
      .catch(() => { if (!cancelled) setManifest(null); });
    return () => { cancelled = true; };
  }, [activeTheme]);

  // ---- OYUN BAŞLANGICI KART SAYISI KONTROLÜ VE LOGLAMA ----
  useEffect(() => {
    if (gameState?.phase !== 'playing') {
      initialDealLogged.current = false; // Oyun bitince veya lobiye dönünce log kilidini sıfırla
    } else if (gameState?.phase === 'playing' && me?.hand && !initialDealLogged.current) {
      const expected = roomSettings.startCards || 5;
      console.log(`[OYUN BAŞLANGICI] Sunucudan gelen başlangıç kart sayısı: ${me.hand.length}`);
      if (me.hand.length < expected) {
        console.warn(`[UYARI] Sunucudan eksik kart geldi! Beklenen: ${expected}, Gelen: ${me.hand.length}`);
      }
      initialDealLogged.current = true;
    }
  }, [gameState?.phase, me?.hand, roomSettings.startCards]);

  // ---- SET TAMAMLAMA BİLDİRİMİ VE EFEKTİ ----
  const prevCompleteSetsRef = useRef(0);
  const myCompleteSetsCount = Object.entries(me?.properties || {}).filter(([c, cards]) => isSetComplete(cards, c)).length;
  useEffect(() => {
    if (myCompleteSetsCount > prevCompleteSetsRef.current) {
       sfxBuild(); // Fanfar/Tamamlama sesi niyetine
       showToast('✨ Muhteşem! Bir renk setini tamamladın!', 'success', 4000);
       spawnMoney({ count: 20, icon: '✨' }); // Set tamamlanınca parlayan yıldızlar saç
    }
    prevCompleteSetsRef.current = myCompleteSetsCount;
  }, [myCompleteSetsCount, showToast, spawnMoney]);

  // ---- EL KARTLARINI YEREL DURUMA (LOCALHAND) SENKRONİZE ETME (SIRALAMA İÇİN) ----
  useEffect(() => {
    if (!me?.hand) return;
    setLocalHand(prev => {
      const meHandIds = me.hand.map(c => c.id);
      const filtered = prev.filter(c => meHandIds.includes(c.id)); // Artık bende olmayan kartları sil
      const localIds = filtered.map(c => c.id);
      const added = me.hand.filter(c => !localIds.includes(c.id)); // Yeni eklenen kartları sona koy
      return [...filtered, ...added];
    });
  }, [me?.hand]);

  // ---- EL KARTLARINI OTOMATİK SIRALAMA (TİPE/RENGE GÖRE) ----
  const handleSortHand = () => {
    setLocalHand(prev => {
      return [...prev].sort((a, b) => {
        const typeScore = { property: 1, action: 2, money: 3 };
        if (typeScore[a.type] !== typeScore[b.type]) return typeScore[a.type] - typeScore[b.type];
        if (a.type === 'property') {
          const colorA = a.activeColor || a.color || 'z';
          const colorB = b.activeColor || b.color || 'z';
          return colorA.localeCompare(colorB);
        }
        if (a.type === 'money') return b.value - a.value; // Paraları büyükten küçüğe
        if (a.type === 'action') return a.action.localeCompare(b.action); // Aksiyonları alfabetik
        return 0;
      });
    });
    sfxCardDraw(); // Sıralama hissini vermek için ses çal
  };

  // ---- KART ÇEKME ANİMASYONU TETİKLEYİCİ ----
  useEffect(() => {
    if (!me?.hand) return;
    const currentIds = me.hand.map(c => c.id);
    const newIds = currentIds.filter(id => !prevHandIds.current.includes(id));

    if (newIds.length > 0 && prevHandIds.current.length > 0) {
      const deckRect = deckRef.current?.getBoundingClientRect();
      const newFlying = newIds.map((id, index) => {
        setTimeout(() => { sfxCardDraw(); }, index * 150); // Ses efekti gecikmesi animasyonla eşitlendi (0.15s)
        return {
          id,
          card: me.hand.find(c => c.id === id),
          startX: deckRect?.left || window.innerWidth / 2,
          startY: deckRect?.top || 20,
          delay: index * 0.15
        };
      });

      setFlyingCards(prev => [...prev, ...newFlying]);
      setTimeout(() => setFlyingCards(prev => prev.filter(fc => !newIds.includes(fc.id))), 1200 + (newIds.length * 150));
    }
    prevHandIds.current = currentIds;
  }, [me?.hand]);

  // --- Log ve Animasyon Tetikleyicileri ---
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    
    // Yeni bir log geldiğinde aksiyonu analiz et ve gerekirse overlay göster
    if (!gameState?.log?.length) return;
    const lastEntry = gameState.log[gameState.log.length - 1];
    
    // Aynı logu tekrar işlemiyoruz
    if (lastEntry.time === prevLogTimeRef.current) return;
    prevLogTimeRef.current = lastEntry.time;

    const lastLog = lastEntry.msg.toLowerCase();
    let overlay = null;

    if (lastEntry.type === 'action') {
      if (lastLog.includes('kira')) { overlay = { text: 'KİRA ÖDEMESİ!', icon: '🧾' }; playTurkishVoice('Kira zamanı! Pamuk eller cebe, çabuk öde.'); }
      else if (lastLog.includes('çaldı') || lastLog.includes('sinsi') || lastLog.includes('aldı!')) { overlay = { text: 'ARAZİ ÇALINDI!', icon: '🫳' }; playTurkishVoice('O güzel arazini sinsi bir şekilde yürütüyorum. Teşekkürler!'); }
      else if (lastLog.includes('takas') || lastLog.includes('zorunlu')) { overlay = { text: 'ZORUNLU TAKAS!', icon: '🔁' }; playTurkishVoice('İtiraz istemiyorum, o kartı bana ver bunu sen al. Zorunlu takas!'); }
      else if (lastLog.includes('anlaşma bozucu')) { 
        overlay = { text: 'ANLAŞMA BOZULDU!', icon: '💣' }; 
        playTurkishVoice('İşte bu bir soygun! Anlaşma bozuldu, o bütün set artık tamamen benim.'); 
        setBoardShake('heavy'); setTimeout(() => setBoardShake(false), 1200); // Sinematik Sarsıntı
      }
      else if (lastLog.includes('reddet')) { overlay = { text: 'REDDEDİLDİ!', icon: '🛡️' }; playTurkishVoice('Hadi oradan! Bunu kesinlikle reddediyorum.'); }
      else if (lastLog.includes('borç') || lastLog.includes('tahsildar') || lastLog.includes('haciz')) { playTurkishVoice('Borç tahsildarı kapıda! Paraları hemen masaya dökün.'); }
      else if (lastLog.includes('doğum günü')) { playTurkishVoice('Bugün benim doğum günüm! Herkes bana hediye olarak para versin.'); }
      else if (lastLog.includes('başlangıç') || lastLog.includes('pass go')) { playTurkishVoice('Başlangıç noktasından geçiyorum, taze kartlarım yolda.'); }
    } else if (lastEntry.type === 'property' && (lastLog.includes('ev') || lastLog.includes('otel'))) {
      playTurkishVoice('Ohooo! Yeni bir bina diktim, buradan geçen fena yanacak!');
      sfxBuild();
      showToast(lastEntry.msg, 'success');
    }

    if (overlay) {
      setActionOverlay(overlay);
      if (overlay.icon === '🧾' || overlay.icon === '💰') spawnMoney({ icon: overlay.icon === '💰' ? '💰' : '💸' });
      setTimeout(() => setActionOverlay(null), 2500);
    } else {
      // Dev overlay çıkmıyorsa bile önemli olayları mini Toast ile göster
      if (lastEntry.type === 'property' || lastEntry.type === 'payment' || lastEntry.type === 'action' || lastEntry.type === 'draw') {
        // "(3 hamle kaldı)" gibi sistem verilerini kaldırıp temiz bir bildirim yap
        const cleanMsg = lastEntry.msg.replace(/\(.*?\)/g, '').trim();
        showToast(cleanMsg, 'info', 3000);
      }
    }
  }, [gameState?.log, spawnMoney, showToast, playTurkishVoice]);

  // ---- SÜRÜKLE BIRAK MANTIĞI ----
  const handleDragStart = () => {
    draggedRef.current = false;
    setIsDragging(true);
  };

  const handleDrag = (event, info) => {
    if (Math.abs(info.offset.x) > 5 || Math.abs(info.offset.y) > 5) {
      draggedRef.current = true;
    }
    const element = document.elementFromPoint(info.point.x, info.point.y);
    const target = element?.closest('[data-drop-target]');
    if (target) {
      setDragOverTarget(target.getAttribute('data-drop-target'));
    } else {
      setDragOverTarget(null);
    }
  };

  const handleDragEnd = (event, info, card) => {
    setIsDragging(false);
    setDragTrail([]);
    setDragOverTarget(null);
    
    // Sürükleme bittikten hemen sonra tıklamayı tetiklememesi için kısa bir gecikme
    setTimeout(() => { draggedRef.current = false; }, 100);

    const element = document.elementFromPoint(info.point.x, info.point.y);
    const target = element?.closest('[data-drop-target]');
    
    if (target && draggedRef.current) {
      const targetType = target.getAttribute('data-drop-target');
      if (targetType === 'bank') {
        if (card.type === 'property') {
          setError('Tapu Senedi kartları bankaya konamaz!');
          sfxError();
        } else {
          handlePlayCard(card, { asBankMoney: true });
        }
      } else if (targetType === 'properties') {
        handleCardAction(card);
      }
    }
  };

  // ── TUR DEĞİŞİMİ BİLDİRİMİ & KART ÇEKME SESİ ──
  const prevCurrentPlayerRef = useRef(null); // Bu ref'i burada tanımlıyoruz
  useEffect(() => {
    if (!gameState?.currentPlayerId || !playerId) return; // Guard clause
    const prev = prevCurrentPlayerRef.current;
    const curr = gameState.currentPlayerId;
    if (prev !== null && prev !== curr) {
      if (prev === playerId) {
        showToast('✅ Tur Bitti', 'success', 1800);
        sfxTurnEnded();
      }
      if (curr === playerId) {
        showToast('🎲 SIRA SENDE!', 'turn', 2800);
        sfxYourTurn();
        // Titreşim (Destekleyen cihazlar için)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } else {
        const p = gameState.players.find(pl => pl.id === curr);
        if (p) showToast(`🎲 ${p.name}'in sırası`, 'info', 1800);
      }
    }
    prevCurrentPlayerRef.current = curr;
  }, [gameState?.currentPlayerId, playerId, showToast]);

  // ── REDDET! İTİRAZI / ÖDEME SESLERİ ──
  const prevChallengeIdRef = useRef(null); // Bu satır zaten vardı, değişmedi
  const prevPaymentIdRef = useRef(null);
  useEffect(() => {
    const ch = gameState?.myPendingChallenge;
    if (ch && ch.id !== prevChallengeIdRef.current) {
      sfxAlert();
    }
    prevChallengeIdRef.current = ch?.id || null;

    const pay = gameState?.myPendingPayment;
    if (pay && pay.id !== prevPaymentIdRef.current) {
      sfxPaymentDue();
    }
    prevPaymentIdRef.current = pay?.id || null;
  }, [gameState?.myPendingChallenge, gameState?.myPendingPayment]);
  
  // Log mesajındaki isimleri renklendiren yardımcı fonksiyon (useCallback ile optimize edildi)
  const renderLogMsg = useCallback((entry) => { 
    const { msg, type } = (typeof entry === 'string' ? { msg: entry, type: 'info' } : entry);
    if (!gameState?.players) return msg;

    // Olay türüne göre ikon belirle
    let icon = 'ℹ️ ';
    switch(type) {
      case 'money': icon = '💰 '; break;
      case 'property': icon = '🏠 '; break;
      case 'payment': icon = '💸 '; break;
      case 'draw': icon = '🎴 '; break;
      case 'system': icon = '⚙️ '; break;
      case 'action': icon = '⚡ '; break;
    }
    if (msg.includes('kazandi')) icon = '🏆 ';
    if (msg.includes('reddet')) icon = '🛡️ ';

    let parts = [{ text: msg, type: 'text' }];
    
    gameState.players.forEach((p, pIdx) => {
      const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
      let nextParts = [];
      parts.forEach(part => {
        if (part.type !== 'text') {
          nextParts.push(part);
        } else {
          const split = part.text.split(p.name);
          split.forEach((sub, i) => {
            if (sub !== '') nextParts.push({ text: sub, type: 'text' });
            if (i < split.length - 1) nextParts.push({ text: p.name, type: 'name', color });
          });
        }
      });
      parts = nextParts;
    });

    // Hamle bilgilerini (X hamle kaldı / Hamle bitti) vurgula
    const moveRegex = /\((?:\d+ hamle kaldı|Hamle bitti)\)/g;
    let finalParts = [];
    parts.forEach(part => {
      if (part.type !== 'text') {
        finalParts.push(part);
      } else {
        const matches = [...part.text.matchAll(moveRegex)];
        if (matches.length === 0) {
          finalParts.push(part);
        } else {
          let lastIdx = 0;
          matches.forEach(match => {
            const before = part.text.slice(lastIdx, match.index);
            if (before) finalParts.push({ text: before, type: 'text' });
            finalParts.push({ text: match[0], type: 'move' });
            lastIdx = match.index + match[0].length;
          });
          const after = part.text.slice(lastIdx);
          if (after) finalParts.push({ text: after, type: 'text' });
        }
      }
    });
    return (
      <span>
        <span style={{ marginRight: 4, filter: 'grayscale(0.3)' }}>
          {icon}
        </span>

        {finalParts.map((p, i) => {
          if (p.type === 'name')
            return (
              <b key={i} style={{ color: p.color }}>
                {p.text}
              </b>
            );

          if (p.type === 'move')
            return (
              <span
                key={i}
                style={{
                  color: '#40E0D0',
                  fontStyle: 'italic',
                  fontWeight: 'bold',
                }}
              >
                {p.text}
              </span>
            );

          return p.text;
        })}
      </span>
    );
  }, [gameState?.players]);

  const handleCreate = () => {
    if (!myName.trim()) return setError('İsim gir');
    if (!socket || !socket.connected) return setError('Sunucuya henüz bağlanılamadı, lütfen bekleyin...');
    
    socket.emit('createRoom', { name: myName, settings: roomSettings }, (res) => {
      if (res.ok) {
        setRoomCode(res.roomCode);
        setPlayerId(res.playerId);
        localStorage.setItem('md_name', myName);
        localStorage.setItem('md_room', res.roomCode);
        localStorage.setItem('md_pid', res.playerId);
        setError('');
      } else setError(res.error);
    });
  };

  const handleJoin = () => {
    if (!myName.trim() || !joinCode.trim()) return setError('İsim ve kod gir');
    if (!socket || !socket.connected) return setError('Sunucuya henüz bağlanılamadı, lütfen bekleyin...');
    
    socket.emit('joinRoom', { roomCode: joinCode.toUpperCase(), name: myName }, (res) => {
      if (res.ok) {
        setRoomCode(joinCode.toUpperCase());
        setPlayerId(res.playerId);
        localStorage.setItem('md_name', myName);
        localStorage.setItem('md_room', joinCode.toUpperCase());
        localStorage.setItem('md_pid', res.playerId);
        setError('');
      }
      else setError(res.error);
    });
  };

  const handleStart = () => {
    socket.emit('startGame', { theme: selectedTheme, settings: roomSettings }, (res) => {
      if (!res?.ok) setError(res?.error || 'Başlatılamadı');
    });
  };

  const handleReturnToLobby = () => {
    setScreen('lobby');
  };

  const handleNewGame = () => {
    socket.emit('startGame', { theme: activeTheme, settings: roomSettings }, (res) => {
      if (!res?.ok) setError(res?.error || 'Başlatılamadı');
    });
  };

  const handleExit = () => {
    localStorage.removeItem('md_room');
    localStorage.removeItem('md_pid');
    setRoomCode('');
    setPlayerId(null);
    setGameState(null);
    setScreen('lobby');
    setError('');
  };

  const handlePlayCard = useCallback((card, options = {}) => {
    // Fırlatma animasyonunu tetikle
    sfxWhoosh();
    setThrownCard(card);
    setTimeout(() => {
      setThrownCard(null);
      spawnSmoke();
      // Kart masaya indiğinde (600ms sonra) ekranı sars
      setBoardShake(true);
      setTimeout(() => setBoardShake(false), 300);
    }, 600);

    socket.emit('playCard', { cardId: card.id, options }, (res) => {
      if (res.ok) {
        setSelectedCard(null); setModal(null); setError('');
        if (options.asBankMoney || card.type === 'money') sfxCoin();
        else sfxCardPlay();
      } else {
        setError(res.error || 'Kart oynamadı');
        sfxError();
      }
    });
  }, [socket]);

  const handleFlip = (card) => {
    setModal({ type: 'flipColor', card });
  };

  const doFlip = (card, newColor) => {
    socket.emit('flipProperty', { cardId: card.id, newColor }, (res) => {
      if (res.ok) { setModal(null); setError(''); }
      else setError(res.error || 'Renk değiştirilemedi');
    });
  };

  const handleRespondChallenge = (challengeId, useJustSayNo) => {
    socket.emit('respondToChallenge', { challengeId, useJustSayNo }, (res) => {
      if (!res.ok) { setError(res.error || 'Yanıt gönderilemedi'); sfxError(); }
      else { setError(''); if (useJustSayNo) sfxAlert(); }
    });
  };

  const togglePaymentBankCard = (cardId) => {
    setPaymentSelection(prev => ({
      ...prev,
      bankCardIds: prev.bankCardIds.includes(cardId)
        ? prev.bankCardIds.filter(id => id !== cardId)
        : [...prev.bankCardIds, cardId],
    }));
  };

  const togglePaymentPropertyCard = (cardId) => {
    setPaymentSelection(prev => ({
      ...prev,
      propertyCardIds: prev.propertyCardIds.includes(cardId)
        ? prev.propertyCardIds.filter(id => id !== cardId)
        : [...prev.propertyCardIds, cardId],
    }));
  };

  const handleSelectAllPayment = () => {
    const bankCardIds = (me?.bank || []).map(c => c.id);
    const propertyCardIds = Object.values(me?.properties || {}).flat().map(c => c.id);
    setPaymentSelection({ bankCardIds, propertyCardIds });
  };

  const handleSubmitPayment = () => {
    const allSelected = [
      ...(me.bank || []).filter(c => paymentSelection.bankCardIds.includes(c.id)),
      ...Object.values(me.properties || {}).flat().filter(c => paymentSelection.propertyCardIds.includes(c.id))
    ];

    // ---- YÖNLÜ PARA ANİMASYONU ----
    // Not: Sunucudan gelen myPendingPayment objesinde `collectorId`'nin de gönderildiğini varsayıyoruz.
    const collector = gameState.players.find(p => p.id === gameState.myPendingPayment.collectorId);
    const fromEl = myBankRef.current;
    const toEl = collector ? playerPanelRefs.current[collector.id] : null;

    if (fromEl && toEl) {
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      // Parçacıkların banka/kasa alanının ortasından çıkıp hedef oyuncu panelinin ortasına gitmesini sağla
      const fromPos = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 };
      const toPos = { x: toRect.left + toRect.width / 2, y: toRect.top + toRect.height / 2 };
      spawnMoney({ fromPos, toPos, count: allSelected.length > 5 ? 12 : 8 });
    }

    // Kartları tek tek fırlat
    allSelected.forEach((card, idx) => {
      setTimeout(() => {
        sfxWhoosh();
        setPayingFlyingCards(prev => [...prev, card]);
        setTimeout(() => {
          setPayingFlyingCards(prev => prev.filter(c => c.id !== card.id));
          spawnSmoke();
        }, 600);
      }, idx * 150);
    });

    // Animasyonların başlaması için kısa bir gecikmeyle emit yap
    setTimeout(() => {
      socket.emit('submitPayment', paymentSelection, (res) => {
        if (res.ok) { setPaymentSelection({ bankCardIds: [], propertyCardIds: [] }); setError(''); } // sfxCoin artık spawnMoney içinde
        else { setError(res.error || 'Ödeme yapılamadı'); sfxError(); }
      });
    }, (allSelected.length * 150) + 100);
  };

  // ---- ISKARTA MODALI ----
  const renderDiscardModal = () => {
    if (!showDiscardModal) return null;
    return (
      <Modal title="Iskarta Yığını (Son 5 Kart)" onClose={() => setShowDiscardModal(false)}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {gameState.discard?.length > 0 ? (
            gameState.discard.map(card => (
              <CardVisual key={card.id} card={card} small onHover={setPreviewCard} />
            ))
          ) : (
            <p style={{ color: '#aaa' }}>Iskarta yığını boş.</p>
          )}
        </div>
      </Modal>
    );
  };

  // ---- OYUNCU DETAY MODALI (RAKİP TAHTASI) ----
  const renderPlayerDetailsModal = () => {
    if (!viewingPlayerId) return null;
    const p = gameState.players.find(x => x.id === viewingPlayerId);
    if (!p) return null;
    
    const EMOTES = ['😂', '😡', '😭', '😱', '👏', '🔥', '💸', '🤝'];
    return (
      <Modal title={`${p.name} - Tüm Varlıklar`} onClose={() => setViewingPlayerId(null)}>
        <div style={{ marginBottom: 16, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#FFD700', marginBottom: 8, fontWeight: 'bold', textAlign: 'center' }}>İFADE GÖNDER</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {EMOTES.map(emoji => (
              <button key={emoji} onClick={() => {
                socket.emit('sendEmote', { targetId: p.id, emoji });
                setViewingPlayerId(null);
              }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 44, height: 44, fontSize: 24, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={e => e.target.style.transform = 'scale(1.2)'} onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, overflowX: 'auto' }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>BANKA ({p.bankTotal}M)</div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 110, paddingLeft: 10, minWidth: (p.bank?.length || 0) * 30 + 50 }}>
            {(p.bank || []).map((c, i) => (
              <div key={c.id}
                   onMouseEnter={() => setPreviewCard(c)}
                   onMouseLeave={() => setPreviewCard(null)}
                   style={{
                     position: 'absolute', left: i * 30,
                     transform: `rotate(${(i - ((p.bank?.length || 1) - 1) / 2) * 4}deg)`,
                     zIndex: i, transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', cursor: 'pointer'
                   }}
                   onMouseOver={(e) => { e.currentTarget.style.transform = `rotate(${(i - ((p.bank?.length || 1) - 1) / 2) * 4}deg) translateY(-15px) scale(1.05)`; e.currentTarget.style.zIndex = 100; }}
                   onMouseOut={(e) => { e.currentTarget.style.transform = `rotate(${(i - ((p.bank?.length || 1) - 1) / 2) * 4}deg)`; e.currentTarget.style.zIndex = i; }}>
                <CardVisual card={c} small />
              </div>
            ))}
            {(!p.bank || p.bank.length === 0) && <span style={{ color: '#555', fontSize: 11, fontStyle: 'italic', marginTop: -50 }}>Banka boş...</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {Object.entries(p.properties || {}).map(([color, cards]) => (
            <FannedPropertySet key={color} color={color} cards={cards} buildings={p.buildings} isOwn={false} onHoverCard={setPreviewCard} />
          ))}
        </div>
      </Modal>
    );
  };

  const handleEndTurn = () => {
    socket.emit('endTurn', {}, (res) => {
      if (res.ok) { setSelectedCard(null); setError(''); }
      else {
        if (res.needsDiscard) { setDiscardMode(true); setDiscardSelected([]); }
        setError(res.error || 'Tur bitmedi');
        sfxError();
      }
    });
  };

  const handleDiscard = () => {
    const over = (me?.hand?.length || 0) - (gameState?.handLimit || 7);
    if (discardSelected.length !== over) return setError(`${over} kart seçmelisin`);
    socket.emit('discardCards', { cardIds: discardSelected }, (res) => {
      if (res.ok) { setDiscardMode(false); setDiscardSelected([]); setError(''); handleEndTurn(); }
      else setError(res.error);
    });
  };

  const openCardModal = (card) => {
    if (!isMyTurn || !me) return;
    if (gameState.pendingChallenges?.length > 0 || gameState.pendingPayments?.length > 0) return;
    if (gameState.actionsLeft <= 0) return setError('Aksiyon hakkın bitti (3/3 kullandın)');
    setSelectedCard(selectedCard?.id === card.id ? null : card);
  };

  const handleCardAction = (card) => {
    if (!card) return;

    // Para → direkt bankaya
    if (card.type === 'money') {
      handlePlayCard(card);
      return;
    }

    // Arazi
    if (card.type === 'property') {
      if (card.isWild || card.isDual) {
        setModal({ type: 'chooseColor', card, colors: card.colors });
      } else {
        handlePlayCard(card, { color: card.color });
      }
      return;
    }

    // Aksiyon
    if (card.type === 'action') {
      switch (card.action) {
        case 'passgo':
          handlePlayCard(card);
          break;
        case 'birthday':
          handlePlayCard(card);
          break;
        case 'justsayno':
          setError('"Reddet!" kartını sadece sana karşı oynanan bir hamleye yanıt olarak kullanabilirsin. İstersen "Bankaya Koy" ile para olarak kullanabilirsin.');
          break;
        case 'debtcollector':
          setModal({ type: 'selectTarget', card, action: 'debtcollector' });
          break;
        case 'rent':
          setModal({ type: 'selectRentColor', card });
          break;
        case 'slydeal':
          setModal({ type: 'selectTarget', card, action: 'slydeal' });
          break;
        case 'forceddeal':
          setModal({ type: 'selectTarget', card, action: 'forceddeal' });
          break;
        case 'dealbreaker':
          setModal({ type: 'selectTarget', card, action: 'dealbreaker' });
          break;
        case 'house':
        case 'hotel':
          setModal({ type: 'selectMyColor', card });
          break;
        default:
          handlePlayCard(card);
      }
    }
  };

  // Render modals
  const renderModal = () => {
    if (!modal) return null;
    const { card } = modal;

    if (modal.type === 'chooseColor') {
      return (
        <Modal title="Renk Seç" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {modal.colors.map(color => {
              const info = COLOR_INFO[color];
              return (
                <button key={color} onClick={() => handlePlayCard(card, { color })} style={{
                  padding: '8px 16px', background: info?.hex, color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
                }}>
                  {info?.name || color}
                </button>
              );
            })}
          </div>
        </Modal>
      );
    }

    if (modal.type === 'selectTarget') {
      const others = gameState.players.filter(p => p.id !== playerId);
      return (
        <Modal title={`${ACTION_NAMES[modal.action] || 'Aksiyon'} - Hedef Seç`} onClose={() => setModal(null)}>
          <div style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
            Bu kartı kime karşı kullanmak istiyorsun? Aşağıdan bir oyuncu ve hedef seçin.
          </div>
          {others.map(p => (
            <div key={p.id} style={{ marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ color: '#FFD700', fontWeight: 900, marginBottom: 12, fontSize: 15, borderBottom: '1px solid rgba(255,215,0,0.2)', paddingBottom: 6 }}>
                👤 {p.name}
              </div>
              
              {modal.action === 'debtcollector' && (
                <button onClick={() => handlePlayCard(card, { targetId: p.id })} style={{ ...btnStyle('#E74C3C'), width: '100%', padding: '10px' }}>
                  {p.name}'den 5M Al
                </button>
              )}
              
              {modal.action === 'dealbreaker' && (
                <div>
                  <div style={{ color: '#9B59B6', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>{p.name}'in Tamamlanmış Setlerinden Birini Çal:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {Object.entries(p.properties || {}).filter(([color, cards]) => isSetComplete(cards, color)).map(([color]) => (
                      <div key={color} style={{ background: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 8, border: `2px solid ${COLOR_INFO[color]?.hex || '#fff'}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ color: COLOR_INFO[color]?.light || '#fff', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' }}>{COLOR_INFO[color]?.name || color} SETİ</div>
                        <button onClick={() => handlePlayCard(card, { targetId: p.id, targetColor: color })} style={{ ...btnStyle('#9B59B6'), width: '100%', fontSize: 12 }}>
                          💣 ÇAL
                        </button>
                      </div>
                    ))}
                    {Object.entries(p.properties || {}).filter(([c, cards]) => isSetComplete(cards, c)).length === 0 && (
                      <span style={{ color: '#aaa', fontSize: 12 }}>Tamamlanmış set yok.</span>
                    )}
                  </div>
                </div>
              )}
              
              {modal.action === 'slydeal' && (
                <div>
                  <div style={{ color: '#3498DB', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>{p.name}'den Çalmak İstediğin Kartı Seç (Tam Setler Hariç):</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(p.properties || {}).flatMap(([color, cards]) =>
                      !isSetComplete(cards, color) ? cards.map(propCard => (
                        <div key={propCard.id} onClick={() => handlePlayCard(card, { targetId: p.id, targetColor: color, targetCardId: propCard.id })}
                          style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                          <CardVisual card={propCard} small />
                        </div>
                      )) : []
                    )}
                    {Object.entries(p.properties || {}).every(([c, cards]) => isSetComplete(cards, c) || cards.length === 0) && <span style={{fontSize: 11, color: '#aaa'}}>Çalınabilecek bağımsız kart yok.</span>}
                  </div>
                </div>
              )}
              
              {modal.action === 'forceddeal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Step 1 */}
                  <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid rgba(231, 76, 60, 0.3)', borderRadius: 8, padding: 12 }}>
                    <div style={{ color: '#E74C3C', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>1. ADIM: {p.name}'den Alacağın Kartı Seç</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.entries(p.properties || {}).flatMap(([color, cards]) =>
                        !isSetComplete(cards, color) ? cards.map(propCard => (
                          <div key={propCard.id} onClick={() => setModal({ ...modal, targetId: p.id, targetColor: color, targetCardId: propCard.id, step: 2 })}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: modal.targetCardId === propCard.id ? 'scale(1.1)' : 'scale(1)', outline: modal.targetCardId === propCard.id ? '3px solid #E74C3C' : 'none', borderRadius: 6, boxShadow: modal.targetCardId === propCard.id ? '0 0 15px rgba(231,76,60,0.6)' : 'none' }}>
                            <CardVisual card={propCard} small />
                          </div>
                        )) : []
                      )}
                      {Object.entries(p.properties || {}).every(([c, cards]) => isSetComplete(cards, c) || cards.length === 0) && <span style={{fontSize: 11, color: '#aaa'}}>Alınabilecek bağımsız kart yok.</span>}
                    </div>
                  </div>
                  
                  {modal.step === 2 && (
                  <div style={{ background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)', borderRadius: 8, padding: 12, animation: 'toast-in 0.3s' }}>
                      <div style={{ color: '#2ECC71', fontWeight: 'bold', fontSize: 12, marginBottom: 8 }}>2. ADIM: Kendi Kartlarından Vereceğini Seç (Takası Tamamla)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(me?.properties || {}).flatMap(([color, cards]) =>
                          !isSetComplete(cards, color) ? cards.map(propCard => (
                            <div key={propCard.id}
                              onClick={() => handlePlayCard(card, {
                                targetId: modal.targetId,
                                targetColor: modal.targetColor,
                                targetCardId: modal.targetCardId,
                                myColor: color,
                                myCardId: propCard.id,
                              })}
                              style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                              <CardVisual card={propCard} small />
                            </div>
                          )) : []
                        )}
                        {Object.entries(me?.properties || {}).every(([c, cards]) => isSetComplete(cards, c) || cards.length === 0) && <span style={{fontSize: 11, color: '#aaa'}}>Verilebilecek bağımsız kartın yok.</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </Modal>
      );
    }

    if (modal.type === 'selectRentColor') {
      const validColors = card.colors === 'all'
        ? Object.keys(me?.properties || {}).filter(c => (me.properties[c]?.length || 0) > 0)
        : (card.colors || []).filter(c => me?.properties?.[c]?.length > 0);

      const doubleRentCards = (me?.hand || []).filter(c => c.action === 'doublerent');

      return (
        <Modal title="Kira Rengi Seç" onClose={() => setModal(null)}>
          {validColors.length === 0 && <p style={{ color: '#aaa' }}>Bu kira için arazin yok</p>}
          {validColors.map(color => {
            const info = COLOR_INFO[color];
            const rentAmount = calculateRentClient(me, color);
            const jokerRentAmount = rentAmount;
            const doubleJokerRentAmount = rentAmount * 2;

            return (
              <div key={color} style={{ marginBottom: 8 }}>
                <button onClick={() => {
                  if (card.colors === 'all') {
                    setModal({ type: 'selectRentTarget', card, color, double: false });
                  } else {
                    handlePlayCard(card, { color });
                  }
                }} style={{ ...btnStyle(info?.hex || '#333'), width: '100%', marginBottom: 4 }}>
                  {info?.name || color} ({me.properties[color]?.length || 0} arazi) — <b style={{color: '#2ECC71'}}>{jokerRentAmount}M Al</b>
                </button>
                {doubleRentCards.length > 0 && (
                  <button onClick={() => {
                    if (card.colors === 'all') {
                      setModal({ type: 'selectRentTarget', card, color, double: true, doubleRentCardId: doubleRentCards[0].id });
                    } else {
                      handlePlayCard(card, { color, doubleRentCardId: doubleRentCards[0].id });
                    }
                  }} style={{ ...btnStyle('#D35400'), width: '100%', fontSize: 11 }}>
                    ⚡ İki Kat Kira ile oyna ({info?.name || color}) — <b style={{color: '#FFD700'}}>{doubleJokerRentAmount}M Al</b>
                  </button>
                )}
              </div>
            );
          })}
        </Modal>
      );
    }

    if (modal.type === 'selectRentTarget') {
      const others = gameState.players.filter(p => p.id !== playerId);
      return (
        <Modal title={`Hedef Seç (Herhangi Kira${modal.double ? ' — İKİ KAT' : ''})`} onClose={() => setModal(null)}>
          <p style={{ color: '#aaa', fontSize: 12 }}>Herhangi Kira: seçilen oyuncu {modal.double ? 'iki kat' : 'normal'} kira öder</p>
          {others.map(p => (
            <button key={p.id} onClick={() => handlePlayCard(card, {
              color: modal.color,
              targetId: p.id,
              ...(modal.double ? { doubleRentCardId: modal.doubleRentCardId } : {}),
            })}
              style={{ ...btnStyle('#16A085'), marginBottom: 8, width: '100%' }}>
              {p.name}
            </button>
          ))}
        </Modal>
      );
    }

    if (modal.type === 'selectMyColor') {
      const isHotel = card.action === 'hotel';
      const completeSets = Object.entries(me?.properties || {})
        .filter(([color, cards]) => {
          if (color === 'railroad' || color === 'utility') return false; // Ev/Otel konamaz
          if (!isSetComplete(cards, color)) return false;
          const b = me?.buildings?.[color] || {};
          if (isHotel) return b.houses > 0 && !b.hotel; // Otel için önce Ev gerekli
          return !b.houses && !b.hotel; // Ev için henüz hiçbir şey olmamalı
        })
        .map(([color]) => color);

      return (
        <Modal title={`${isHotel ? 'Otel' : 'Ev'} için Renk Seç`} onClose={() => setModal(null)}>
          {completeSets.length === 0 && (
            <p style={{ color: '#aaa' }}>
              {isHotel ? 'Önce bir tam sete Ev koymalısın (Demiryolu/Kamu Hizmeti hariç)' : 'Uygun tam setin yok (Demiryolu/Kamu Hizmeti hariç, henüz Ev/Otel olmayan bir tam set gerekli)'}
            </p>
          )}
          {completeSets.map(color => {
            const info = COLOR_INFO[color];
            const b = me?.buildings?.[color] || {};
            return (
              <button key={color} onClick={() => handlePlayCard(card, { color })}
                style={{ ...btnStyle(info?.hex || '#333'), marginBottom: 8, width: '100%' }}>
                {info?.name || color} {b.houses > 0 ? '🏠' : ''}{b.hotel ? '🏨' : ''}
              </button>
            );
          })}
        </Modal>
      );
    }

    if (modal.type === 'flipColor') {
      const otherColors = modal.card.colors.filter(c => c !== modal.card.activeColor);
      return (
        <Modal title="Hangi Renge Taşısın?" onClose={() => setModal(null)}>
          <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>
            Bu kart şu an <b style={{ color: '#FFD700' }}>{COLOR_INFO[modal.card.activeColor]?.name || modal.card.activeColor}</b> grubunda.
            Hangi renge taşımak istiyorsun?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {otherColors.map(color => {
              const info = COLOR_INFO[color];
              return (
                <button key={color} onClick={() => doFlip(modal.card, color)} style={{
                  padding: '8px 16px', background: info?.hex || '#555', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
                }}>
                  {info?.name || color}
                </button>
              );
            })}
          </div>
        </Modal>
      );
    }

    return null;
  };

  // ---- LOBİ AYARLARI PANELİ OLUŞTURUCU ----
  const renderRoomSettings = (disabled = false) => {
    const selStyle = { background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, padding: '4px 8px', outline: 'none' };
    return (
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: 8, marginTop: 12, textAlign: 'left', pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.7 : 1 }}>
        <div style={{ fontSize: 12, color: '#FFD700', fontWeight: 'bold', marginBottom: 12 }}>⚙️ GELİŞMİŞ OYUN AYARLARI</div>
        
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={roomSettings.autoEndTurn} onChange={e => setRoomSettings(prev => ({ ...prev, autoEndTurn: e.target.checked }))} style={{ marginRight: 8 }} />
          <span style={{ fontSize: 13, color: '#fff' }}>3 Hamle Sonrası Eli Otomatik Bitir</span>
        </label>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#fff' }}>Hamle Süresi (Gecikirse Geçer):</span>
          <select value={roomSettings.turnTimer} onChange={e => setRoomSettings(prev => ({ ...prev, turnTimer: Number(e.target.value) }))} style={selStyle}>
            <option value={0}>Sınırsız (Klasik)</option>
            <option value={30}>30 Saniye (Hızlı)</option>
            <option value={60}>60 Saniye</option>
            <option value={120}>2 Dakika</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: '#fff' }}>Kazanma Hedefi:</span>
          <select value={roomSettings.winSets} onChange={e => setRoomSettings(prev => ({ ...prev, winSets: Number(e.target.value) }))} style={selStyle}>
            <option value={2}>2 Tam Set (Kısa Oyun)</option>
            <option value={3}>3 Tam Set (Klasik)</option>
            <option value={4}>4 Tam Set (Uzun)</option>
            <option value={5}>5 Tam Set (Destansı)</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#fff' }}>Başlangıç Kart Sayısı:</span>
          <select value={roomSettings.startCards} onChange={e => setRoomSettings(prev => ({ ...prev, startCards: Number(e.target.value) }))} style={selStyle}>
            <option value={5}>5 Kart (Standart)</option>
            <option value={7}>7 Kart (Hızlı Başlangıç)</option>
            <option value={10}>10 Kart (Kaos Modu)</option>
          </select>
        </div>
      </div>
    );
  };

  // ---- DESTE İSTATİSTİKLERİ MODALI ----
  const renderDeckStatsModal = () => {
    if (!showDeckStats) return null;

    const unknownCardsCount = gameState.deckCount + gameState.players.filter(p => p.id !== playerId).reduce((s, p) => s + p.handCount, 0);

    const stats = Object.keys(CARD_TOTAL_COUNTS).map(key => {
      const total = CARD_TOTAL_COUNTS[key];
      let visible = 0;
      const countFn = (c) => { if (c?.key === key) visible++; }; // Hata önleme (?. eklendi)
      gameState.discard?.forEach(countFn);
      me?.hand?.forEach(countFn);
      gameState.players?.forEach(p => {
         (p.bank || []).forEach(countFn);
         Object.values(p.properties || {}).flat().forEach(countFn);
      });
      const remaining = Math.max(0, total - visible);
      const probability = unknownCardsCount > 0 ? ((remaining / unknownCardsCount) * 100).toFixed(1) : 0;
      return { key, total, visible, remaining, probability };
    });

    const categories = {
       '⚡ Aksiyon Kartları': stats.filter(s => s.key.startsWith('action_')),
       '🧾 Kira Kartları': stats.filter(s => s.key.startsWith('rent_')),
       '💰 Para Kartları': stats.filter(s => s.key.startsWith('money_')),
    };

    const getName = (key) => {
      if (key.startsWith('money_')) return `${key.split('_')[1]}M Nakit Para`;
      if (key.startsWith('rent_')) {
        const parts = key.split('_').slice(1);
        if (parts[0] === 'all') return 'Herhangi Renk Kira';
        return `${COLOR_INFO[parts[0]]?.name || parts[0]} / ${COLOR_INFO[parts[1]]?.name || parts[1]} Kira`;
      }
      if (key.startsWith('action_')) {
        const action = key.split('_')[1];
        const icon = ACTION_STYLE[action]?.icon || '⚡';
        const names = { passgo: 'Başlangıç', dealbreaker: 'Anlaşma Bozucu', justsayno: 'Reddet!', slydeal: 'Sinsi Anlaşma', forceddeal: 'Zorunlu Anlaşma', debtcollector: 'Borç Tahsildarı', birthday: 'Doğum Günüm', house: 'Ev', hotel: 'Otel', doublerent: 'İki Kat Kira' };
        return `${icon} ${names[action] || action}`;
      }
      return key;
    };

    return (
       <Modal title="📊 Deste Kalan Kart İstatistikleri" onClose={() => setShowDeckStats(false)}>
          <p style={{ color: '#aaa', fontSize: 11, marginBottom: 12 }}>Bu panel; senin elindeki, piyasadaki ve ıskartadaki kartları hesaplayıp destede çekilmeyi bekleyen tahmini kartları gösterir. Rakiplerin elindeki kapalı kartlar destede sayılır.</p>
          {Object.entries(categories).map(([cat, items]) => (
             <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ color: '#FFD700', fontSize: 13, fontWeight: 'bold', marginBottom: 8, borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: 4 }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 6 }}>
                   {items.map(item => (
                         <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 6 }}>
                            <span style={{ color: '#ccc', flex: 1 }}>{getName(item.key)}</span>
                            <span style={{ color: item.probability >= 15 ? '#2ECC71' : item.probability >= 5 ? '#F39C12' : '#E74C3C', fontWeight: 'bold', marginRight: 8, fontSize: 10 }}>
                              %{item.probability}
                            </span>
                            <b style={{ color: item.remaining > 0 ? '#fff' : '#E74C3C', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>{item.remaining} / {item.total}</b>
                         </div>
                   ))}
                </div>
             </div>
          ))}
       </Modal>
    );
  };

  // ── REDDET! (Just Say No) YANIT MODALI ──
  const renderChallengeModal = () => {
    if (!gameState?.myPendingChallenge) return null;
    const ch = gameState.myPendingChallenge;
    const iAmDefender = ch.responderId === playerId;
    if (!iAmDefender) return null; // sadece sırası gelen oyuncu görür

    const haveJustSayNo = me?.hasJustSayNo;
    const isCounter = ch.responderId === ch.sourceId; // sıra orijinal oyuncuya geri döndü (karşı-Reddet)

    let description = '';
    switch (ch.action) {
      case 'rent': description = `${ch.sourceName} kira istiyor: ${ch.data.amount}M (${ch.data.reason})`; break;
      case 'birthday': description = `${ch.sourceName} "Doğum Günüm!" oynadı, ${ch.data.amount}M istiyor`; break;
      case 'debtcollector': description = `${ch.sourceName} "Borç Tahsildarı" ile ${ch.data.amount}M istiyor`; break;
      case 'slydeal': description = `${ch.sourceName} "${ch.data.cardName}" arazini çalmak istiyor (Sinsi Anlaşma)`; break;
      case 'forceddeal': description = `${ch.sourceName} "${ch.data.myCardName}" arazini "${ch.data.theirCardName}" ile takas etmek istiyor (Zorunlu Anlaşma)`; break;
      case 'dealbreaker': description = `${ch.sourceName} ${COLOR_INFO[ch.data.targetColor]?.name || ch.data.targetColor} setini çalmak istiyor (Anlaşma Bozucu)!`; break;
      default: description = `${ch.sourceName} bir hamle yaptı`;
    }

    return (
      <Modal title={isCounter ? '⚠️ Karşı Reddet! Şansın!' : `⚠️ ${ACTION_NAMES[ch.action] || ch.action} — Yanıt Ver`} onClose={() => {}}>
        <p style={{ color: '#fff', marginBottom: 16, fontSize: 14 }}>{description}</p>
        {isCounter && (
          <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>
            {ch.targetName} az önce "Reddet!" oynadı ve bu hamleyi geçersiz kıldı. Eğer senin de "Reddet!" kartın varsa,
            onu oynayarak hamleni yine geçerli kılabilirsin!
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {haveJustSayNo ? (
            <button onClick={() => handleRespondChallenge(ch.id, true)} style={{ ...btnStyle('#E74C3C'), flex: 1, padding: '12px' }}>
              🚫 Reddet! Oyna
            </button>
          ) : (
            <div style={{ flex: 1, color: '#666', fontSize: 12, alignSelf: 'center' }}>"Reddet!" kartın yok</div>
          )}
          <button onClick={() => handleRespondChallenge(ch.id, false)} style={{ ...btnStyle('#555'), flex: 1, padding: '12px' }}>
            {isCounter ? 'Reddet etme, hamle geçersiz kalsın' : 'Kabul Et'}
          </button>
        </div>
      </Modal>
    );
  };

  // ── ÖDEME MODALI ──
  const renderPaymentModal = () => {
    if (!gameState?.myPendingPayment) return null;
    const payment = gameState.myPendingPayment;
    // Eğer hiç varlığım yoksa server otomatik geçer, ama yine de göstermeyelim
    const hasBank = (me.bank || []).length > 0;
    const hasProps = Object.values(me.properties || {}).flat().length > 0;
    if (!hasBank && !hasProps) return null;

    const selectedTotal =
      (me.bank || []).filter(c => paymentSelection.bankCardIds.includes(c.id)).reduce((s, c) => s + c.value, 0) +
      Object.values(me.properties || {}).flat().filter(c => paymentSelection.propertyCardIds.includes(c.id)).reduce((s, c) => s + c.value, 0);

    const totalAssets =
      (me.bank || []).reduce((s, c) => s + c.value, 0) +
      Object.values(me.properties || {}).flat().reduce((s, c) => s + c.value, 0);

    const enoughOrAll = selectedTotal >= payment.amount || selectedTotal === totalAssets;
    const canSubmit = selectedTotal > 0 && enoughOrAll;

    return (
      <Modal title="💸 Ödeme Yap" onClose={() => {}}>
        <p style={{ color: '#fff', marginBottom: 4, fontSize: 14 }}>
          <b style={{ color: '#FFD700' }}>{payment.collectorName}</b>'e <b>{payment.amount}M</b> ödemen gerekiyor.
        </p>
        <p style={{ color: '#aaa', fontSize: 11, marginBottom: 12 }}>{payment.reason}</p>
        <p style={{ color: '#aaa', fontSize: 11, marginBottom: 8 }}>
          Ödemek için Banka ve/veya Tapu Senedi kartlarını seç. Yeterli kartın yoksa elindeki HER ŞEYİ seçmen gerekir (para üstü verilmez).
        </p>

        {hasBank && (
          <>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4, marginTop: 8 }}>BANKA KARTLARI</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {(me.bank || []).map(c => (
                <div key={c.id} onClick={() => togglePaymentBankCard(c.id)} style={{
                  cursor: 'pointer',
                  background: paymentSelection.bankCardIds.includes(c.id) ? '#2ECC71' : 'rgba(255,255,255,0.1)',
                  border: paymentSelection.bankCardIds.includes(c.id) ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontWeight: 700, fontSize: 12, padding: '6px 10px', borderRadius: 6,
                }}>
                  {c.value}M
                </div>
              ))}
            </div>
          </>
        )}

        {hasProps && (
          <>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>TAPU SENEDİ KARTLARI (renk ne olursa olsun gidebilir)</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {Object.entries(me.properties || {}).flatMap(([color, cards]) => cards.map(c => (
                <div key={c.id} onClick={() => togglePaymentPropertyCard(c.id)} style={{ cursor: 'pointer' }}>
                  <CardVisual card={c} small selected={paymentSelection.propertyCardIds.includes(c.id)} />
                </div>
              )))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ color: selectedTotal >= payment.amount ? '#2ECC71' : '#FFD700', fontWeight: 700, fontSize: 13 }}>
            Seçilen: {selectedTotal}M / {payment.amount}M gerekli
            {selectedTotal < payment.amount && selectedTotal < totalAssets && ' (eksik)'}
            {selectedTotal < payment.amount && selectedTotal === totalAssets && totalAssets > 0 && ' (elindeki her şey — kabul edilir)'}
          </div>
          <button onClick={handleSelectAllPayment} style={btnStyle('#555')}>Tümünü Seç</button>
        </div>

        <button onClick={handleSubmitPayment} disabled={!canSubmit}
          style={{ ...btnStyle('#27AE60'), width: '100%', marginTop: 10, padding: '12px', opacity: canSubmit ? 1 : 0.4 }}>
          Öde
        </button>
      </Modal>
    );
  };

  // ---- LOBBY ----
  if (screen === 'lobby') {
    return ( // Lobi arka planına animasyon sınıfını ekle
      <div className="lobby-animated-bg" style={{ minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
        <h1 style={{ color: '#FFD700', marginBottom: 4, fontSize: 28 }}>Monopoly Deal</h1>
        <p style={{ color: '#aaa', marginBottom: 24, fontSize: 13 }}>Çevrimiçi Kart Oyunu</p>

        <div style={{ width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 24 }}>
          <input
            value={myName}
            onChange={e => setMyName(e.target.value)}
            placeholder="Adın"
            style={inputStyle}
          />

          {!roomCode ? (
            <>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={roomSettings.isPublic} onChange={e => setRoomSettings(prev => ({ ...prev, isPublic: e.target.checked }))} style={{ marginRight: 8 }} />
                <span style={{ fontSize: 13, color: '#fff' }}>🌍 Odayı Herkese Açık Yap (Lobi Tarayıcısında görünür)</span>
              </label>
              
              {/* ODA AYARLARI PANELİ (Kurulmadan Önce) */}
              {renderRoomSettings()}

              <button onClick={handleCreate} style={{ ...btnStyle('#E67E22'), width: '100%', padding: '12px', fontSize: 15, marginBottom: 12 }}>
                Yeni Oda Oluştur
              </button>
              <div style={{ textAlign: 'center', color: '#666', marginBottom: 12, fontSize: 12 }}>— ya da —</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Oda Kodu" style={{ ...inputStyle, letterSpacing: 2, textAlign: 'center', marginBottom: 0, flex: 1 }} />
                <button onClick={handleJoin} style={{ ...btnStyle('#2ECC71'), padding: '12px 20px', fontSize: 14 }}>Katıl</button>
              </div>
              
              {/* AÇIK ODALAR LİSTESİ */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: '#aaa', fontWeight: 'bold' }}>🌍 AÇIK ODALAR</div>
                  <button onClick={() => socket?.emit('requestPublicRooms')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>
                    🔄 Yenile
                  </button>
                </div>
                {publicRooms.length === 0 ? (
                  <div style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>Şu an herkese açık bekleyen oda yok.</div>
                ) : (
                  <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                    {publicRooms.map(r => (
                      <div key={r.code} className="public-room-item">
                        <div>
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{r.hostName}'in Odası</div>
                          <div style={{ color: '#aaa', fontSize: 11 }}>Hedef: {r.winSets} Set | Oyuncu: {r.playerCount}/5</div>
                        </div>
                        <button onClick={() => { setJoinCode(r.code); handleJoin(); }} style={btnStyle('#3498DB')}>Gir</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>Oda Kodu (arkadaşlarına ver):</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#FFD700', letterSpacing: 8, marginBottom: 16 }}>{roomCode}</div>
              <div style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>
                {gameState?.players?.length || 1}/5 oyuncu
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', marginTop: 16 }}>
                {gameState?.players?.map((p, idx) => (
                  <div key={p.id} style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, 
                    background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: 50,
                    border: `1px solid ${PLAYER_COLORS[idx % PLAYER_COLORS.length]}55`,
                    width: '100%'
                  }}>
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} 
                      alt="avatar" 
                      title={p.id === playerId ? "İsmini değiştirmek için tıkla" : ""}
                      onClick={() => {
                        if (p.id === playerId) {
                          const newName = prompt("Yeni isminizi girin:", p.name);
                          if (newName && newName.trim()) {
                            setMyName(newName.trim());
                            localStorage.setItem('md_name', newName.trim()); // İsmi tarayıcıya kaydet
                            // Sunucuya ismimin değiştiğini haber ver
                            socket?.emit('updatePlayerName', { roomCode, newName: newName.trim() });
                          }
                        }
                      }}
                      style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', cursor: p.id === playerId ? 'pointer' : 'default' }} 
                    />
                    <span style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>
                      {p.name}
                    </span>
                    {p.id === playerId && <span style={{ marginLeft: 'auto', fontSize: 11, background: '#FFD700', color: '#000', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' }}>SEN</span>}
                    {idx === 0 && <span style={{ marginLeft: p.id === playerId ? 0 : 'auto', fontSize: 11, background: '#8E44AD', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' }}>HOST</span>}
                  </div>
                ))}
              </div>
              {gameState?.players?.find(p => p.id === playerId)?.id === gameState?.players?.[0]?.id && (
                <>
                  <div style={{ marginTop: 24, marginBottom: 8 }}>
                    <div style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>Kart Teması:</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {THEMES.map(t => (
                        <button key={t.id} onClick={() => setSelectedTheme(t.id)} style={{
                          padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          border: selectedTheme === t.id ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
                          background: selectedTheme === t.id ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                          color: '#fff',
                        }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                    {selectedTheme !== 'default' && (
                      <div style={{ color: '#666', fontSize: 10, marginTop: 6 }}>
                        PNG yoksa otomatik klasik tasarım gösterilir
                      </div>
                    )}
                  </div>
                  
                  {/* ODA AYARLARI PANELİ (Host İçin) */}
                  {renderRoomSettings()}

                  <button onClick={handleStart} style={{ ...btnStyle('#E74C3C'), width: '100%', padding: '12px', fontSize: 15 }}>
                    Oyunu Başlat ({gameState?.players?.length || 1} oyuncu)
                  </button>
                  <button onClick={handleCloseRoom} style={{
                    ...btnStyle('#666'),
                    width: '100%', padding: '12px', fontSize: 15, marginTop: 8
                  }}>
                    Odayı Kapat
                  </button>
                </>
              )}
              {gameState?.players?.find(p => p.id === playerId)?.id !== gameState?.players?.[0]?.id && (
                <>
                  <p style={{ color: '#aaa', fontSize: 12, marginTop: 12 }}>Host oyunu başlatacak...</p>
                  {/* Konuk oyuncular ayarları sadece "Okunur/Devre Dışı" görebilir */}
                  {renderRoomSettings(true)}
                </>
              )}
            </div>
          )}

          {error && <div style={{ color: '#f44', marginTop: 12, fontSize: 12, textAlign: 'center' }}>{error}</div>}
          <div style={{ color: '#555', marginTop: 8, fontSize: 11, textAlign: 'center' }}>{status}</div>
        </div>
      </div>
    );
  }

  // ---- GAME ----
  if (!gameState || !me) return (
    <div style={{ minHeight: '100vh', background: '#0f0f23', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
      Oyun Yükleniyor...
    </div>
  );

  const myCompleteSets = Object.entries(me.properties || {}).filter(([c, cards]) => isSetComplete(cards, c)).length;
  const over = (me.hand?.length || 0) - (gameState?.handLimit || 7);

  const remainingTime = gameState?.turnPausedRemaining != null 
    ? Math.floor(gameState.turnPausedRemaining) 
    : (gameState?.turnTimer > 0 && gameState?.turnStartTime ? Math.max(0, gameState.turnTimer - Math.floor((now - gameState.turnStartTime) / 1000)) : null);
  const showDanger = isMyTurn && !isBlocked && remainingTime !== null && remainingTime <= 10 && remainingTime > 0;

  const getDynamicBackground = () => {
    if (showDanger) {
      // Süre azaldığında tehlikeli kırmızı
      return 'radial-gradient(ellipse at center, #5c1a1a 0%, #0f0f23 75%)';
    }
    if (isBlocked) {
      // Ödeme/itiraz beklenirken gergin mor
      return 'radial-gradient(ellipse at center, #4a1e4e 0%, #0f0f23 75%)';
    }
    if (isMyTurn) {
      // Sıra bendeyken odaklanma mavisi
      return 'radial-gradient(ellipse at center, #1a2a6c 0%, #0f0f23 75%)';
    }
    // Varsayılan arka plan
    return '#0f0f23';
  };

  return (
    <ThemeContext.Provider value={{ themeId: activeTheme, manifest }}>
      <div className={boardShake === 'heavy' ? "board-shake-heavy" : boardShake ? "board-shake-active" : ""} style={{ minHeight: '100vh', background: getDynamicBackground(), color: '#fff', display: 'flex', flexDirection: 'column', fontSize: 13, transition: 'background 0.8s ease-in-out' }}>
        
        {/* Üst bar */}
        <div className="game-topbar" style={{ background: '#1a1a2e', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: 8, zIndex: 100 }}>
          <div style={{ color: '#FFD700', fontWeight: 900, fontSize: 16 }}>🏠 Monopoly Deal</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#aaa', fontSize: 11 }}>Oda: <b style={{ color: '#fff' }}>{roomCode}</b></span>            <button ref={deckRef} onClick={() => setShowDeckStats(true)} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 6, color: '#aaa', fontSize: 11, border: 'none', cursor: 'pointer' }}>
              🎴 Deste: <b style={{ color: '#fff' }}>{gameState.deckCount}</b> (Detay)
            </button>
            {gameState.turnTimer > 0 && gameState.turnStartTime && (
              <span style={{ background: 'rgba(231, 76, 60, 0.2)', padding: '4px 8px', borderRadius: 6, color: '#fff', fontSize: 11, border: '1px solid rgba(231,76,60,0.5)' }}>
                ⏱️ Süre: <b style={{ color: '#FFD700' }}>
                  {isBlocked ? `DURDURULDU (${remainingTime}s)` : `${remainingTime}s`}
                </b>
              </span>
            )}
            <button onClick={() => setShowDiscardModal(true)} style={{ ...btnStyle('rgba(255,255,255,0.1)'), padding: '4px 8px', fontSize: 11 }}>
              🗑️ Iskarta ({gameState.discard?.length || 0})
            </button>
            {isMyTurn && (
              <span style={{ background: '#FFD700', color: '#000', fontWeight: 700, padding: '4px 8px', borderRadius: 6, fontSize: 11 }}>
                SIRA SENİN ({gameState.actionsLeft} aksiyon)
              </span>
            )}
            <button onClick={toggleTts} title={ttsOn ? 'Türkçe Seslendirmeyi Kapat' : 'Türkçe Seslendirmeyi Aç'} style={{
              background: 'rgba(255,255,255,0.08)', border: `1px solid ${ttsOn ? '#4FC3F7' : 'rgba(255,255,255,0.2)'}`,
              color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, padding: '3px 8px',
            }}>
              {ttsOn ? '🗣️' : '💬'}
            </button>
            <button onClick={toggleSound} title={soundOn ? 'Sesi Kapat' : 'Sesi Aç'} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, padding: '3px 8px',
            }}>
              {soundOn ? '🔊' : '🔇'}
            </button>
            {soundOn && (
              <input 
                type="range" min="0" max="0.5" step="0.01" 
                value={bgmVolume}
                onChange={e => { setBgmVolumeState(e.target.value); setBgmVolume(e.target.value); }}
                title="Arka Plan Müziği Sesi"
                style={{ width: 60, cursor: 'pointer' }}
              />
            )}
            {gameState?.players?.[0]?.id === playerId && (
               <button onClick={() => { socket.emit('returnToLobby', { roomCode }); }} style={{ background: '#E67E22', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
                 Oyunu Bitir
               </button>
            )}
            <button onClick={handleExit} style={{ background: '#E74C3C', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
              Çıkış
            </button>
          </div>
        </div>

        {renderModal()}
        {renderChallengeModal()}
        {renderPaymentModal()}
        {renderDiscardModal()}
        {renderDeckStatsModal()}
        {renderPlayerDetailsModal()}
        <ToastStack toasts={toasts} />

        {/* Son Saniye Kırmızı Tehlike Ekranı */}
        {showDanger && <div className="danger-vignette" />}

        {/* Anlaşma Bozucu Sinematik Flaş */}
        {boardShake === 'heavy' && <div className="flash-red-overlay" />}

        {/* Bağlantı Kesildi Ekranı */}
        {!isConnected && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(20, 20, 40, 0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', animation: 'fw-fade-in 0.3s ease-out' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 80, marginBottom: 20, animation: 'system-log-blink 1s infinite' }}>📡</div>
              <h1 style={{ color: '#E74C3C', fontWeight: 900, letterSpacing: 2 }}>BAĞLANTI KESİLDİ</h1>
              <p style={{ color: '#aaa', fontSize: 16 }}>Sunucu ile bağlantı koptu. Yeniden bağlanmaya çalışılıyor...</p>
            </div>
          </div>
        )}

        {/* Desteden Uçan Kartlar (Çekme Animasyonu) */}
        <AnimatePresence>
          {flyingCards.map(fc => (
            <motion.div
              key={fc.id}
              initial={{ x: fc.startX, y: fc.startY, scale: 0.1, rotateY: 180, rotateZ: -30, opacity: 0 }}
              animate={{
                x: [fc.startX, window.innerWidth / 2, window.innerWidth / 2 - 60 + (Math.random() * 20 - 10)],
                y: [fc.startY, window.innerHeight / 2 - 100, window.innerHeight - 150],
                scale: [0.1, 1.8, 0.8],
                rotateY: 0,
                rotateZ: [-30, 10, 360 + (Math.random() * 20 - 10)],
                opacity: [0, 1, 1]
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.85, delay: fc.delay, ease: "easeOut", times: [0, 0.4, 1] }}
              style={{ position: 'fixed', zIndex: 1001, pointerEvents: 'none' }}
            >
              <CardVisual card={fc.card} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Büyük Aksiyon Duyurusu */}
        {actionOverlay && (
          <div className="action-overlay">
            <div style={{ textAlign: 'center', color: '#fff', textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: 80, marginBottom: 10 }}>{actionOverlay.icon}</div>
              <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: 4 }}>{actionOverlay.text}</div>
            </div>
          </div>
        )}

        {/* Kart Önizleme Tooltip */}
        {previewCard && (
          <>
            {/* Arkaplan karartma (sadece mobil tıklandığında veya hover dışında kalıcıysa) */}
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 999, background: isMobile ? 'rgba(0,0,0,0.4)' : 'transparent', pointerEvents: isMobile ? 'auto' : 'none' }} 
              onClick={() => isMobile && setPreviewCard(null)} 
            />
            <div 
              className="card-preview-window preview-glow-active"
              style={{ 
                position: 'fixed',
                left: isMobile ? '50%' : Math.min(mousePos.x + 20, window.innerWidth - 300),
                top: isMobile ? '50%' : Math.min(mousePos.y + 20, window.innerHeight - 350),
                transform: isMobile ? 'translate(-50%, -50%)' : 'none',
                right: 'auto', bottom: 'auto',
                background: previewCard.type === 'action' ? 'rgba(45, 10, 10, 0.92)' : 
                            previewCard.type === 'money' ? 'rgba(10, 45, 10, 0.92)' : 
                            previewCard.type === 'property' ? 'rgba(45, 40, 10, 0.92)' : 'rgba(0,0,0,0.8)',
                '--glow-color': previewCard.type === 'action' ? '#E74C3C' : 
                                previewCard.type === 'money' ? '#2ECC71' : 
                                (COLOR_INFO[previewCard.activeColor || previewCard.color]?.hex || '#FFD700'),
                boxShadow: `0 0 25px var(--glow-color)`
              }}
            >
              <button className="card-preview-close" onClick={() => setPreviewCard(null)}>✕</button>
              <CardVisual card={previewCard} />
              
              <div className="card-preview-info">
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' }}>{previewCard.name}</div>
                <div style={{ 
                  color: '#fff', 
                  fontWeight: '900',
                  marginBottom: 4, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  fontSize: 13,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  <span style={{ fontSize: 16 }}>
                    {previewCard.type === 'property' ? '🏠' : previewCard.type === 'action' ? '⚡' : '💰'}
                  </span>
                  <span>
                    {previewCard.type === 'property' ? 'ARAZİ KARTI' : previewCard.type === 'action' ? 'AKSİYON KARTI' : 'NAKİT KARTI'}
                  </span>
                </div>

                <div style={{ 
                  marginBottom: 8,
                  background: previewCard.type === 'action' ? 'linear-gradient(90deg, rgba(231, 76, 60, 0.4), transparent)' :
                              previewCard.type === 'money' ? 'linear-gradient(90deg, rgba(46, 204, 113, 0.4), transparent)' :
                              'linear-gradient(90deg, rgba(255, 215, 0, 0.3), transparent)',
                  borderLeft: `4px solid ${previewCard.type === 'action' ? '#E74C3C' : previewCard.type === 'money' ? '#2ECC71' : '#FFD700'}`,
                  padding: '2px 8px',
                  borderRadius: '0 4px 4px 0',
                  fontSize: 10,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: getRarity(previewCard.key).color }}>
                    {'★'.repeat(getRarity(previewCard.key).stars)} {getRarity(previewCard.key).label}
                  </span>
                </div>

                <div style={{ padding: '4px 0' }}>💰 <b>Bankadaki Değeri:</b> <span style={{ color: '#FFD700' }}>{previewCard.value}M</span></div>
                
                {previewCard.type === 'property' && (
                  <>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, marginTop: 4 }}>
                      🎨 <b>Renk Grubu:</b> {COLOR_INFO[previewCard.activeColor || previewCard.color]?.name || 'Joker'}
                    </div>
                    <CardRentPanel previewCard={previewCard} gameState={gameState} />
                    <div style={{ 
                      marginTop: 10, padding: '6px 8px', background: 'rgba(255,255,255,0.05)', 
                      borderRadius: 6, borderLeft: '3px solid #4FC3F7', fontSize: 10.5, color: '#4FC3F7' 
                    }}>
                    💡 <b>İPUCU:</b> {getDetailedCardTip(previewCard)}
                    </div>
                  </>
                )}
                {previewCard.type === 'action' && (
                  <>
                    <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 11, color: '#aaa' }}>
                      Aksiyon kartları stratejik hamleler için kullanılır veya bankaya para olarak yatırılabilir. 
                    </div>
                    <div style={{ 
                      marginTop: 10, padding: '6px 8px', background: 'rgba(255,255,255,0.05)', 
                      borderRadius: 6, borderLeft: '3px solid #4FC3F7', fontSize: 10.5, color: '#4FC3F7' 
                    }}>
                    💡 <b>NASIL OYNANIR?</b> {getDetailedCardTip(previewCard)}
                    </div>
                  </>
                )}
                
                <CardProbabilityPanel previewCard={previewCard} gameState={gameState} playerId={playerId} />
              </div>
            </div>
          </>
        )}

        {/* Ödeme Yaparken Uçan Kartlar */}
        {payingFlyingCards.map(card => (
          <div key={card.id} className="thrown-card-ghost" style={{ '--sx': '0px', '--sy': '400px' }}>
            <CardVisual card={card} />
          </div>
        ))}

        {/* Toz Dumanı Efekti */}
        {smokeParticles.map(p => (
          <div key={p.id} className="smoke-particle" style={{ '--sdx': p.dx, '--sdy': p.dy }} />
        ))}

        {/* Para Parçacıkları */}
        {moneyParticles.map(p => (
          <div key={p.id} className="money-particle" style={{ '--sx': p.sx, '--sy': p.sy, '--dx': p.dx, '--dy': p.dy, '--dr': p.dr }}>
            {p.icon}
          </div>
        ))}

        {/* Kazanan */}
        {gameState.winner && (
          <VictoryOverlay
            winnerName={gameState.winner.name}
            players={gameState.players}
            isHost={gameState.players?.[0]?.id === playerId}
            onReturnToLobby={handleReturnToLobby}
            onNewGame={handleNewGame}
            onExit={handleExit}
          />
        )}

        {/* Bekleyen itiraz/ödeme bildirimi (diğer oyuncular için) */}
        {isBlocked && !gameState.myPendingChallenge && !gameState.myPendingPayment && (
          <div style={{ background: 'rgba(255,215,0,0.15)', borderBottom: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', textAlign: 'center', padding: 8, fontSize: 12 }}>
            {gameState.pendingChallenges?.length > 0 && gameState.pendingChallenges.map(ch => (
              <div key={ch.id}>
                ⏳ {ch.action === 'birthday' ? `${ch.sourceName}'in Doğum Günü hediyesi` : `${ch.sourceName} bir hamle yaptı`} — <b>{ch.responderName}</b> yanıt veriyor...
              </div>
            ))}
            {gameState.pendingPayments?.length > 0 && gameState.pendingPayments.map(p => (
              <div key={p.id}>
                ⏳ <b>{p.payerName}</b>, {p.collectorName}'e {p.amount}M ödeme yapıyor...
              </div>
            ))}
          </div>
        )}

        <div className="game-main" style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Sol: Diğer oyuncular */}
          <div className="players-sidebar" style={{ 
            width: isMobile ? '100%' : 260, height: isMobile ? 'auto' : '100%', maxHeight: isMobile ? '200px' : 'none', 
            padding: '20px 10px', overflowY: 'auto', borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none' 
          }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Oyuncular</div>
            <div style={{ display: isMobile ? 'flex' : 'block', gap: 8 }}>
              {gameState.players.filter(p => p.id !== playerId).map(player => {
                // Renk uyumunu garantilemek için ana listedeki sırasını buluyoruz
                const pIdx = gameState.players.findIndex(x => x.id === player.id);
                return (
                  // PlayerPanel.jsx dosyasını React.forwardRef ile sarmalamayı unutmayın!
                  // export const PlayerPanel = React.forwardRef(({...}, ref) => { ... });
                  <div key={player.id} style={{ 
                    minWidth: isMobile ? '200px' : 'auto',
                    position: 'relative',
                    borderRadius: '12px',
                    boxShadow: (player.id === gameState.currentPlayerId && gameState.turnTimer > 0) 
                      ? `0 0 15px ${remainingTime <= 10 ? '#E74C3C' : '#2ECC71'}` 
                      : 'none',
                    transition: 'box-shadow 0.3s'
                  }}>
                    <PlayerPanel
                      ref={el => (playerPanelRefs.current[player.id] = el)}
                      player={player} 
                      isMe={false}
                      isCurrent={player.id === gameState.currentPlayerId}
                      onHoverCard={setPreviewCard}
                      onSelectTarget={(id) => setViewingPlayerId(id)}
                      playerColor={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]}
                      emotes={emotes.filter(e => e.senderId === player.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orta: Log */}
          <div className="center-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 4px' }}>
              <span style={{ fontSize: 11, color: '#aaa', fontWeight: 'bold', letterSpacing: 1 }}>📜 OYUN GÜNLÜĞÜ</span>
              <span style={{ fontSize: 9, color: '#555', fontStyle: 'italic' }}>Son olaylar</span>
            </div>
            <div ref={logRef} className="game-log" style={{ 
              flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 6, 
              maxHeight: isMobile ? '140px' : '180px', margin: '0 10px 10px',
              background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
            }}>
              {gameState.log?.slice(-20).map((entry, i) => {
                const isSystem = entry.type === 'system';
                const isImportant = entry.type === 'payment' || entry.type === 'property' || entry.type === 'action';
                return (
                  <div key={i} style={{ 
                    fontSize: 11, color: isSystem ? '#FFD700' : '#ddd', padding: '8px 12px', 
                    background: isSystem ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.15), transparent)' : isImportant ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.05), transparent)' : 'transparent', 
                    borderRadius: 8, borderLeft: isSystem ? '3px solid #FFD700' : isImportant ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                    animation: 'fw-fade-in 0.3s ease-out'
                  }}>
                    <div className={isSystem ? 'system-log-blink' : ''} style={{ lineHeight: 1.4 }}>{renderLogMsg(entry)}</div>
                    <div style={{ fontSize: 8, color: '#666', marginTop: 6, textAlign: 'right' }}>
                      {new Date(entry.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Benim arazilerim */}
            <div data-drop-target="properties" style={{ 
              padding: 10, borderTop: '1px solid rgba(255,255,255,0.1)', minHeight: 120,
              background: dragOverTarget === 'properties' ? 'linear-gradient(to bottom, rgba(255,215,0,0.1), rgba(0,0,0,0.2))' : 'rgba(255,255,255,0.02)',
              transition: 'background 0.3s ease'
            }}>
              <div style={{ fontSize: 11, color: dragOverTarget === 'properties' ? '#FFD700' : '#666', fontWeight: 'bold', marginBottom: 6, transition: 'color 0.2s' }}>BENİM ARAZİLERİM ({myCompleteSets}/{gameState?.winSets || 3} set)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {Object.entries(me.properties || {}).map(([color, cards]) => (
                  cards.length > 0 && (
                    <FannedPropertySet key={color} color={color} cards={cards} buildings={me.buildings} isOwn onFlip={isMyTurn ? handleFlip : null} onHoverCard={null} />
                  )
                ))}
                {Object.keys(me.properties || {}).length === 0 && (
                  <span style={{ color: '#555', fontSize: 12 }}>Henüz arazi yok</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ALT: El kartları */}
        <div className="hand-area" style={{ 
          background: 'linear-gradient(to bottom, rgba(30,30,45,0.95), rgba(15,15,25,1))', 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          padding: '16px 16px 16px',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
          zIndex: 100
        }}>
          {/* Banka */}
          <div ref={myBankRef} data-drop-target="bank" style={{ 
            display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', minHeight: 46, 
            background: dragOverTarget === 'bank' ? 'linear-gradient(135deg, rgba(46,204,113,0.2), rgba(0,0,0,0.4))' : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(0,0,0,0.2))',
            border: dragOverTarget === 'bank' ? '2px dashed #2ECC71' : '1px solid rgba(255,255,255,0.1)', 
            boxShadow: dragOverTarget === 'bank' ? '0 0 15px rgba(46,204,113,0.3)' : 'none',
            borderRadius: 12, padding: '8px 12px', transition: 'all 0.3s ease'
          }}>
            <span style={{ fontSize: 12, color: '#aaa', marginRight: 4, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
              🏦 KASAM <span style={{ color: '#2ECC71', fontSize: 14, display: 'flex', alignItems: 'center', gap: 2 }}>
                (<AnimatedCounter value={me.bankTotal} color="#2ECC71" />M)
              </span>
            </span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: (me.bank?.length || 0) * 25, height: 30 }}>
              {me.bank?.map((c, i) => (
                <div key={c.id} style={{ 
                  background: 'linear-gradient(135deg, #2ECC71, #196F3D)', 
                  color: '#fff', fontWeight: 800, fontSize: 11, padding: '4px 8px', 
                  borderRadius: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.4)', 
                  border: '1px solid rgba(255,255,255,0.2)',
                  position: 'absolute',
                  left: i * 25,
                  transform: `rotate(${(i - ((me.bank?.length || 1) - 1) / 2) * 4}deg)`,
                  zIndex: i
                }}>
                  {c.value}M
                </div>
              ))}
            </div>
            {me.bank?.length === 0 && <span style={{ color: '#555', fontSize: 11, fontStyle: 'italic' }}>Banka boş...</span>}
          </div>

          {/* El kartları */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingRight: 4 }}>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 'bold' }}>🃏 ELİNDEKİ KARTLAR</span>
            <button onClick={handleSortHand} style={{ background: 'rgba(52, 152, 219, 0.15)', border: '1px solid rgba(52, 152, 219, 0.5)', color: '#3498DB', padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>
              🔄 Otomatik Sırala
            </button>
          </div>
          <div
            style={{ 
              display: 'flex', gap: 8, overflowX: 'auto', 
              paddingBottom: isMobile ? 15 : 6, paddingLeft: 0, 
              alignItems: 'flex-end', listStyle: 'none', margin: 0 
            }}
          >
            {localHand.map((card, idx) => (
              <motion.div
                key={card.id} 
                className="stacked-card-wrapper"
                drag={!isMobile && isMyTurn && !isBlocked && !discardMode} // Mobilde sürüklemeyi kapat, masaüstünde aktif
                dragElastic={0.2}
                dragSnapToOrigin={true} // Sürüklenip bırakılmazsa eski yerine yumuşakça döner
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={(e, info) => handleDragEnd(e, info, card)}
                whileDrag={{ scale: 1.15, zIndex: 1000, cursor: 'grabbing', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                style={{ 
                  marginLeft: 0, 
                  zIndex: idx,
                  position: 'relative',
                  cursor: !isMobile && isMyTurn && !isBlocked && !discardMode ? 'grab' : 'default' // Sadece masaüstünde ve sürüklenebilir kartlarda grab imleci
                }}
                onContextMenu={(e) => {
                  e.preventDefault(); // Varsayılan sağ tık menüsünü engelle
                  if (draggedRef.current || discardMode || !isMyTurn || isBlocked) return;
                  if (card.type === 'property') {
                    setError('Tapu Senedi kartları bankaya konamaz!');
                    sfxError();
                    return;
                  }
                  handlePlayCard(card, { asBankMoney: true });
                }}
                onClick={() => {
                  if (draggedRef.current) return; // Eğer sürükleme olduysa click'i engelle
                  if (discardMode) { // Discard modunda kart seçimi
                    setDiscardSelected(prev =>
                      prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
                    );
                  } else {
                    openCardModal(card);
                  }
                }}
              >
                <CardVisual
                  card={card}
                  selected={discardMode ? discardSelected.includes(card.id) : selectedCard?.id === card.id}
                  dimmed={(!isMyTurn || isBlocked) && !discardMode}
                  onHover={null} // Kendi kartlarımızda önizlemeyi kapat
                  usable={!discardMode && isCardUsable(card)}
                />
              </motion.div>
            ))}
          </div>

          {/* Aksiyon butonları */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center', minHeight: 40 }}>
            {selectedCard && isMyTurn && !discardMode && !isBlocked && (
              <>
                <div style={{ fontSize: 12, color: '#FFD700', fontWeight: 'bold', marginRight: 8, background: 'rgba(255,215,0,0.1)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,215,0,0.3)' }}>
                  Seçilen: {selectedCard.name}
                </div>
              <button onClick={() => { sfxClick(); handleCardAction(selectedCard); }} style={{...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'), boxShadow: '0 4px 10px rgba(230,126,34,0.4)', padding: '10px 20px', fontSize: 13}}>
                  🚀 Oyna
                </button>
                {selectedCard.type !== 'property' && ( // Arazi kartları bankaya konamaz
                <button onClick={() => { sfxClick(); handlePlayCard(selectedCard, { asBankMoney: true }); }} style={{...btnStyle('linear-gradient(135deg, #27AE60, #1E8449)'), boxShadow: '0 4px 10px rgba(39,174,96,0.4)', padding: '10px 20px', fontSize: 13}}>
                    💰 Bankaya Koy ({selectedCard.value}M)
                  </button>
                )}
                <button onClick={() => setSelectedCard(null)} style={{...btnStyle('#555'), padding: '10px 16px'}}>
                  İptal
                </button>
              </>
            )}

            {!selectedCard && isMyTurn && !discardMode && !isBlocked && (
            <button onClick={() => { sfxClick(); handleEndTurn(); }} style={{ ...btnStyle('linear-gradient(135deg, #8E44AD, #5B2C6F)'), padding: '10px 24px', boxShadow: '0 4px 10px rgba(142,68,173,0.4)', fontSize: 13, marginLeft: 'auto' }}>
                🛑 Turu Bitir
              </button>
            )}

            {discardMode && (
              <>
                <div style={{ color: '#FFD700', fontSize: 12, alignSelf: 'center' }}>
                  {over} kart at ({discardSelected.length} seçildi)
                </div>
              <button onClick={() => { sfxClick(); handleDiscard(); }} disabled={discardSelected.length !== over}
                  style={{ ...btnStyle('#E74C3C'), opacity: discardSelected.length === over ? 1 : 0.5, marginLeft: 'auto' }}>
                  🗑️ Kartları At
                </button>
              </>
            )}

            {error && <div style={{ color: '#f44', fontSize: 13, alignSelf: 'center', fontWeight: 'bold' }}>{error}</div>}
          </div>
        </div>

        {/* ---- DEBUG PENCERESİ AÇMA BUTONU ---- */}
        {!showDebug && (
          <button onClick={() => setShowDebug(true)} style={{
            position: 'fixed', bottom: 10, left: 10, zIndex: 9998, background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36,
            cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            🐛
          </button>
        )}

        {/* ---- DEBUG PENCERESİ (Sol Alt) ---- */}
        {showDebug && debugLogs.length > 0 && (
          <div style={{
            position: 'fixed', bottom: 10, left: 10, zIndex: 9999, background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 8, width: 280, maxHeight: 150,
            overflowY: 'auto', color: '#0f0', fontSize: 10, fontFamily: 'monospace', pointerEvents: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', paddingBottom: 4, marginBottom: 4 }}>
              <span style={{ color: '#aaa', fontWeight: 'bold', textShadow: '0 0 5px rgba(255,255,255,0.5)' }}>🛠️ DEBUG CONSOLE</span>
              <button onClick={() => setShowDebug(false)} style={{ background: 'none', border: 'none', color: '#E74C3C', cursor: 'pointer', fontSize: 12 }}>✕ Kapat</button>
            </div>
            {debugLogs.map((log, i) => (
              <div key={i} style={{ marginBottom: 2, color: log.includes('[WARN]') ? '#FFD700' : log.includes('[ERR]') ? '#E74C3C' : '#0f0' }}>{log}</div>
            ))}
          </div>
        )}
      </div>
    </ThemeContext.Provider>
  );
}
