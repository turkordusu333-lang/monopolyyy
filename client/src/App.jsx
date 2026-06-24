import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence, useIsPresent } from 'framer-motion';
import './App.css';
import {
  isSoundEnabled, setSoundEnabled, sfxCardPlay, sfxCardDraw, sfxWhoosh, sfxCoin, sfxError, sfxYourTurn, sfxTurnEnded, sfxAlert, sfxPaymentDue, sfxBuild, sfxClick,
  sfxTick, playBGM, stopBGM, setBgmVolume, setBgmTension, sfxLaugh, sfxAngry, sfxChaChing, sfxGlassBreak, sfxPartyHorn,
  sfxActionDealbreaker, sfxActionJustSayNo, sfxActionCounterJustSayNo, sfxActionSlyDeal, sfxActionForcedDeal, sfxActionDebtCollector, sfxActionBirthday, sfxActionPassGoTwoDraw,
  sfxRentCardPlayed, sfxRentPaymentDue,
  sfxBankDeposit1M, sfxBankDeposit2M, sfxBankDeposit3M, sfxBankDeposit4M, sfxBankDeposit5M, sfxBankDeposit10M,
  sfxPropertyPlayed, sfxJokerPropertyPlayed, sfxStreetPropertyPlayed, sfxTableSlap, sfxShuffle,
  sfxWin, sfxLobbyJoin, sfxGameStart, sfxTradeProposed, sfxTradeAccepted, sfxTradeRejected,
  sfxDiceRoll, sfxCopied, sfxChatSent, sfxRageQuit, sfxUndo, sfxDoubleRent, sfxHouse, sfxHotel,
  sfxDisconnect, sfxReconnect,
  sfxFire
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

const btnStyle = (bg) => ({
  padding: '10px 18px',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 24,
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 12,
  boxShadow: '0 4px 0 rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.28)',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  transition: 'transform 0.1s, box-shadow 0.1s',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px'
});

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

// ---- AKILLI KART KOMBOLARI VURGULAMA ----
const getCardComboClass = (card, hand) => {
  if (!card || !hand || hand.length <= 1) return '';

  // 1. Kira + 2x Kira -> combo-rent
  if (card.action === 'rent') {
    const hasDoubleRent = hand.some(c => c.action === 'doublerent');
    if (hasDoubleRent) return 'combo-rent';
  }
  if (card.action === 'doublerent') {
    const hasRent = hand.some(c => c.action === 'rent');
    if (hasRent) return 'combo-rent';
  }

  // 2. Ev + Otel -> combo-building
  if (card.action === 'house') {
    const hasHotel = hand.some(c => c.action === 'hotel');
    if (hasHotel) return 'combo-building';
  }
  if (card.action === 'hotel') {
    const hasHouse = hand.some(c => c.action === 'house');
    if (hasHouse) return 'combo-building';
  }

  // 3. Sly Deal + Forced Deal -> combo-deal
  if (card.action === 'slydeal') {
    const hasForcedDeal = hand.some(c => c.action === 'forceddeal');
    if (hasForcedDeal) return 'combo-deal';
  }
  if (card.action === 'forceddeal') {
    const hasSlyDeal = hand.some(c => c.action === 'slydeal');
    if (hasSlyDeal) return 'combo-deal';
  }

  return '';
};

// ---- İÇ İÇE GEÇMİŞ (YELPAZE) ARAZİ GÖRÜNÜMÜ ----
const FannedPropertySet = ({ color, cards, buildings, isOwn, onFlip, onHoverCard }) => {
  const info = COLOR_INFO[color] || { hex: '#fff', name: color };
  const isComplete = isSetComplete(cards, color);

  return (
    <div className={`champion-set-wrapper ${isComplete ? 'complete-set-glow' : ''}`} style={{
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

      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 10px', height: 130, alignItems: 'flex-start' }}>
        {cards.map((c, i) => (
          <div
            key={c.id}
            onMouseEnter={() => onHoverCard && onHoverCard(c)}
            onMouseLeave={() => onHoverCard && onHoverCard(null)}
            className="fanned-card-wrapper"
            style={{
              marginLeft: i > 0 ? -40 : 0,
              zIndex: i,
              position: 'relative',
              transform: `rotate(${(i - (cards.length - 1) / 2) * 8}deg) translateY(${Math.abs(i - (cards.length - 1) / 2) * 4}px)`,
              transition: 'transform 0.2s',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.6))',
              cursor: (isOwn && onFlip && (c.isWild || c.isDual)) || onHoverCard ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (isOwn && onFlip && (c.isWild || c.isDual)) {
                onFlip(c);
              } else if (onHoverCard) {
                onHoverCard(c);
              }
            }}
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
  const AVATAR_STYLES = ['avataaars', 'bottts', 'fun-emoji', 'micah', 'lorelei'];
  const [myAvatarStyle, setMyAvatarStyle] = useState(localStorage.getItem('md_avatar') || 'avataaars');
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
  const [is3DTable, setIs3DTable] = useState(() => localStorage.getItem('md_3d') !== 'off');
  const [handHidden, setHandHidden] = useState(false);
  const [slapActive, setSlapActive] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('board'); // board, log
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
  const [previewLocked, setPreviewLocked] = useState(false);

  const handleCardHover = (card) => {
    if (!previewLocked) {
      setPreviewCard(card);
    }
  };
  const [payingFlyingCards, setPayingFlyingCards] = useState([]); // Ödeme animasyonu için
  const [roomSettings, setRoomSettings] = useState({ autoEndTurn: true, turnTimer: 0, winSets: 3, startCards: 5, handLimit: 7, isPublic: false, allowCounterJustSayNo: true, openHands: false, lockWildcards: false, fastChallenge: false, allowTrades: true, extraDealBreakers: 0, streetThugs: false, gambleZari: false });
  const [tradeSelection, setTradeSelection] = useState({ offerBankIds: [], offerPropIds: [], requestBankIds: [], requestPropIds: [] });
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
  const ttsOn = false;
  const setTtsOn = () => {};
  const logRef = useRef(null);
  const prevLogTimeRef = useRef(null);
  const initialDealLogged = useRef(false);
  const [debugLogs, setDebugLogs] = useState([]); // Sol alt debug konsolu için
  const [showDebug, setShowDebug] = useState(false); // Debug ekranı açık/kapalı durumu
  const [showDeckStats, setShowDeckStats] = useState(false); // Deste istatistik modalı
  const [now, setNow] = useState(Date.now()); // Canlı tur süresi sayacı için
  const prevTurnAlertRef = useRef(null); // Süre dolduğunda çalacak alarm için
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Dinamik önizleme ekranı için
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef(null);
  const [rageQuit, setRageQuit] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showScavengeModal, setShowScavengeModal] = useState(false);
  const [challengeTime, setChallengeTime] = useState(15);

  // ---- TEMEL DURUM SABİTLERİ (TDZ Hatasını Önlemek İçin En Üstte) ----
  const me = gameState?.players?.find(p => p.id === playerId);
  const isMyTurn = gameState?.currentPlayerId === playerId;
  const isBlocked = (gameState?.pendingChallenges?.length > 0) || (gameState?.pendingPayments?.length > 0) || (gameState?.pendingTrades?.length > 0);
  const activeTheme = gameState?.theme || selectedTheme;
  const myPendingTrade = gameState?.pendingTrades?.find(t => t.targetId === playerId);

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

  // ---- HIZLI REDDET GERİ SAYIMI ----
  useEffect(() => {
    if (gameState?.fastChallenge && gameState?.challengeStartTime && gameState?.myPendingChallenge) {
      const inv = setInterval(() => {
        const rem = 15 - Math.floor((Date.now() - gameState.challengeStartTime) / 1000);
        setChallengeTime(rem > 0 ? rem : 0);
      }, 1000);
      return () => clearInterval(inv);
    }
  }, [gameState?.fastChallenge, gameState?.challengeStartTime, gameState?.myPendingChallenge]);

  // ---- YERLEŞİK TÜRKÇE SESLENDİRME (TTS) - DEVRE DIŞI ----
  const playTurkishVoice = useCallback((text) => {
    // Disabled Completely
  }, []);

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
      for (let i = 0; i < count; i++) {
        const sx = fromPos.x + (Math.random() - 0.5) * 50;
        const sy = fromPos.y + (Math.random() - 0.5) * 50;
        const dx = toPos.x + (Math.random() - 0.5) * 80;
        const dy = toPos.y + (Math.random() - 0.5) * 80;
        newParts.push({ id: Math.random(), icon, sx: sx + 'px', sy: sy + 'px', dx: dx + 'px', dy: dy + 'px', dr: (Math.random() - 0.5) * 720 + 'deg' });
      }
    } else {
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;
      for (let i = 0; i < count; i++) {
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

  const toggleTts = () => {};

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
        s.emit('joinRoom', { roomCode: savedRoom, name: savedName, reconnectPlayerId: savedPid, avatar: myAvatarStyle }, (res) => {
          if (res.ok) {
            setPlayerId(savedPid);
            setStatus('Oturum geri yüklendi');
            sfxReconnect();
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
      sfxDisconnect();
    });

    s.on('connect_error', (err) => {
      console.error('Socket bağlantı hatası:', err.message);
      setStatus('Sunucuya bağlanılamıyor! Yeniden deneniyor...');
    });
    s.on('publicRooms', (rooms) => setPublicRooms(rooms));
    s.on('roomClosed', () => { setStatus('Oda host tarafından kapatıldı.'); handleExit(); });
    s.on('returnedToLobby', () => { setStatus('Oyun bitirildi, lobiye dönüldü.'); setScreen('lobby'); });

    s.on('gameState', (state) => {
      setGameState(prev => {
        if (state.winner && (!prev || !prev.winner)) {
          sfxWin();
        }
        return state;
      });
      if (state.phase === 'playing') setScreen('game');
      else if (state.phase === 'lobby') setScreen('lobby'); // OYUN BİTTİĞİNDE HERKESİ LOBİYE ÇEK!
    });

    s.on('gameStarted', () => {
      setStatus('Oyun başladı!');
      sfxGameStart();
    });
    s.on('playerJoined', ({ name, playerCount }) => {
      setStatus(`${name} katıldı (${playerCount} oyuncu)`);
      sfxLobbyJoin();
    });

    s.on('chatMessage', (msg) => {
      setChatMessages(prev => [...prev.slice(-49), msg]);
      if (msg.senderId !== playerId) {
        sfxChatSent();
      }
      if (!isChatOpen) {
        showToast(`💬 ${msg.senderName}: ${msg.text}`, 'info', 3000);
      }
    });

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
      else if (emoji === '🔥') sfxFire();
      setTimeout(() => setEmotes(prev => prev.filter(e => e.id !== id)), 2500);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  // ---- DİNAMİK GERİLİM MÜZİĞİ (Tension BGM) ----
  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') {
      setBgmTension(false);
      return;
    }
    // Odadaki oyunculardan herhangi biri kazanmaya (WinSets - 1) ulaştıysa gerilimi başlat
    const isAnyoneCloseToWin = gameState.players.some(p => {
      let cSets = 0;
      Object.entries(p.properties || {}).forEach(([color, cards]) => {
        if (isSetComplete(cards, color)) cSets++;
      });
      return cSets >= (gameState.winSets - 1);
    });
    setBgmTension(isAnyoneCloseToWin);
  }, [gameState?.players, gameState?.winSets, gameState?.phase]);

  const prevPendingTradeRef = useRef(null);
  useEffect(() => {
    if (myPendingTrade && !prevPendingTradeRef.current) {
      sfxTradeProposed();
    }
    prevPendingTradeRef.current = myPendingTrade;
  }, [myPendingTrade]);

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
  const prevIsMyTurn = useRef(false);
  useEffect(() => {
    if (!me?.hand) return;
    setLocalHand(prev => {
      const meHandIds = me.hand.map(c => c.id);
      const filtered = prev.filter(c => meHandIds.includes(c.id)); // Artık bende olmayan kartları sil
      const localIds = filtered.map(c => c.id);
      const added = me.hand.filter(c => !localIds.includes(c.id)); // Yeni eklenen kartları sona koy
      const nextHand = [...filtered, ...added];

      // Eğer sıra bize yeni geldiyse, el kartlarını otomatik sırala
      if (isMyTurn && !prevIsMyTurn.current) {
        return [...nextHand].sort((a, b) => {
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
      }
      return nextHand;
    });
    prevIsMyTurn.current = isMyTurn;
  }, [me?.hand, isMyTurn]);

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
    const actorName = lastEntry.msg.split(',')[0] || lastEntry.msg.split(' ')[0] || 'Biri';

    if (lastEntry.type === 'action') {
      if (lastLog.includes('kira')) { overlay = { text: 'KİRA ÖDEMESİ!', icon: '🧾' }; playTurkishVoice(`${actorName} kira istiyor. Pamuk eller cebe!`); sfxRentCardPlayed(); }
      else if (lastLog.includes('çaldı') || lastLog.includes('sinsi') || lastLog.includes('aldı!')) { overlay = { text: 'HIRSIZLIK!', icon: '🥷' }; playTurkishVoice(`${actorName} sinsi bir şekilde arazi çaldı.`); sfxActionSlyDeal(); }
      else if (lastLog.includes('takas') || lastLog.includes('zorunlu')) { overlay = { text: 'ZORUNLU TAKAS!', icon: '🔁' }; playTurkishVoice(`${actorName} zorunlu takas oynadı! Kartlar el değiştiriyor.`); sfxActionForcedDeal(); }
      else if (lastLog.includes('anlaşma bozucu')) {
        overlay = { text: 'ANLAŞMA BOZULDU!', icon: '💣' };
        playTurkishVoice(`İşte bu bir soygun! ${actorName} Anlaşma Bozucu oynadı ve koca bir seti çaldı.`);
        sfxGlassBreak();
        setBoardShake('heavy'); setTimeout(() => setBoardShake(false), 1200); // Sinematik Sarsıntı
        sfxActionDealbreaker();
      }
      else if (lastLog.includes('reddet') && (lastLog.includes('karşı') || lastLog.includes('karşı reddet'))) { overlay = { text: 'REDDEDİLDİ!', icon: '🛡️' }; playTurkishVoice(`Hadi oradan! ${actorName} reddet kartı oynadı.`); sfxActionCounterJustSayNo(); }
      else if (lastLog.includes('reddet')) { overlay = { text: 'REDDEDİLDİ!', icon: '🛡️' }; playTurkishVoice(`Hadi oradan! ${actorName} reddet kartı oynadı.`); sfxActionJustSayNo(); }
      else if (lastLog.includes('borç') || lastLog.includes('tahsildar') || lastLog.includes('haciz')) { playTurkishVoice(`${actorName} borç tahsildarı oynadı. Paraları hemen masaya dökün.`); sfxActionDebtCollector(); }
      else if (lastLog.includes('doğum günü')) {
        playTurkishVoice(`Bugün ${actorName}'in doğum günü! Herkes hediye olarak para versin.`);
        sfxPartyHorn();
        sfxActionBirthday();
      }
      else if (lastLog.includes('çifte') || lastLog.includes('iki kat') || lastLog.includes('double rent')) {
        sfxDoubleRent();
      }
      else if (lastLog.includes('başlangıç') || lastLog.includes('pass go')) { playTurkishVoice(`${actorName} başlangıç kartı oynadı ve desteden iki yeni kart çekti.`); sfxActionPassGoTwoDraw(); }
    } else if (lastEntry.type === 'property') {
      if (lastLog.includes('ev') || lastLog.includes('otel')) {
        playTurkishVoice(`Ohooo! ${actorName} yeni bir bina dikti, buradan geçen fena yanacak!`);
        if (lastLog.includes('ev')) {
          sfxHouse();
        } else if (lastLog.includes('otel')) {
          sfxHotel();
        } else {
          sfxBuild();
        }
        showToast(lastEntry.msg, 'success');
      } else {
        // Arazi kartı
        if (lastLog.includes('joker')) sfxJokerPropertyPlayed();
        else {
          // mahalle/ilçe ismini tırnaklar arasından çıkarıp slug'a çevirerek özel mp3 çal
          const match = (lastEntry.msg || '').match(/"([^"]+)"/);
          const propName = match ? match[1] : '';
          const slug = propName
            .toLowerCase()
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
          if (slug) {
            sfxStreetPropertyPlayed(slug);
          }
          sfxPropertyPlayed();
        }
        playTurkishVoice(`${actorName} masaya yeni bir arazi kartı yerleştirdi.`);
      }
    } else if (lastEntry.type === 'money') {
      // Kasaya konan miktara göre ses efekti tetikleme
      const match = lastLog.match(/(\d+)m\s+olarak/);
      if (match) {
        const val = match[1];
        if (val === '1') sfxBankDeposit1M();
        else if (val === '2') sfxBankDeposit2M();
        else if (val === '3') sfxBankDeposit3M();
        else if (val === '4') sfxBankDeposit4M();
        else if (val === '5') sfxBankDeposit5M();
        else if (val === '10') sfxBankDeposit10M();
        else sfxCoin();
      } else {
        sfxCoin();
      }
      playTurkishVoice(`${actorName} banka kasasına para yatırdı.`);
    } else if (lastEntry.type === 'system') {
      if (lastLog.includes('takas teklifini reddetti')) {
        sfxTradeRejected();
      } else if (lastLog.includes('zar attı')) {
        sfxDiceRoll();
      }
    } else if (lastEntry.type === 'property') {
      if (lastLog.includes('takas yaptı')) {
        sfxTradeAccepted();
      }
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
      if (pay.reason && pay.reason.toLowerCase().includes('kira')) {
        sfxRentPaymentDue();
      } else {
        sfxPaymentDue();
      }
    }
    prevPaymentIdRef.current = pay?.id || null;
  }, [gameState?.myPendingChallenge, gameState?.myPendingPayment]);

  // Log mesajındaki isimleri renklendiren yardımcı fonksiyon (useCallback ile optimize edildi)
  const renderLogMsg = useCallback((entry) => {
    const { msg, type } = (typeof entry === 'string' ? { msg: entry, type: 'info' } : entry);
    if (!gameState?.players) return msg;

    // Olay türüne göre ikon belirle
    let icon = 'ℹ️ ';
    switch (type) {
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

    socket.emit('createRoom', { name: myName, settings: { ...roomSettings, avatar: myAvatarStyle } }, (res) => {
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

    socket.emit('joinRoom', { roomCode: joinCode.toUpperCase(), name: myName, avatar: myAvatarStyle }, (res) => {
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

  // ---- MASA DEVİRME (RAGE QUIT) ----
  const handleRageQuit = () => {
    if (!window.confirm("Gerçekten masayı devirip odadan çıkmak istiyor musun?")) return;
    setRageQuit(true);
    sfxRageQuit();
    setTimeout(() => {
      handleExit();
      setRageQuit(false);
    }, 1500);
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

  // ---- TAKAS MANTIĞI ----
  const handleProposeTrade = () => {
    socket.emit('proposeTrade', { targetId: modal.targetId, ...tradeSelection }, (res) => {
      if (res.ok) { setModal(null); setTradeSelection({ offerBankIds: [], offerPropIds: [], requestBankIds: [], requestPropIds: [] }); setError(''); sfxClick(); }
      else { setError(res.error); sfxError(); }
    });
  };

  const handleRespondTrade = (tradeId, accepted) => {
    socket.emit('respondToTrade', { tradeId, accepted }, (res) => {
      if (!res.ok) { sfxError(); showToast(res.error, 'error'); }
      else {
        if (accepted) sfxTradeAccepted();
        else sfxTradeRejected();
      }
    });
  };

  const handleRollGambleDice = () => {
    sfxClick();
    socket.emit('rollGambleDice', {}, (res) => {
      if (!res.ok) { setError(res.error); sfxError(); }
      else { setError(''); sfxDiceRoll(); }
    });
  };

  const handleBuyScavenge = (cardId) => {
    sfxCoin();
    socket.emit('buyScavengeCard', { cardId }, (res) => {
      if (!res.ok) { showToast(res.error, 'error'); sfxError(); }
      else { showToast('Kart satın alındı!', 'success'); setShowScavengeModal(false); }
    });
  };

  // ---- ISKARTA MODALI ----
  const renderDiscardModal = () => {
    if (!showDiscardModal) return null;
    return (
      <Modal title="Iskarta Yığını (Son 5 Kart)" onClose={() => setShowDiscardModal(false)}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {gameState.discard?.length > 0 ? (
            gameState.discard.map(card => (
              <CardVisual key={card.id} card={card} small onHover={handleCardHover} onClick={() => { setPreviewCard(card); setPreviewLocked(true); }} />
            ))
          ) : (
            <p style={{ color: '#aaa' }}>Iskarta yığını boş.</p>
          )}
        </div>
      </Modal>
    );
  };

  // ---- KARABORSA MODALI ----
  const renderScavengeModal = () => {
    if (!showScavengeModal) return null;
    return (
      <Modal title="🕵️ Karaborsa (Çöpteki Kartlar)" onClose={() => setShowScavengeModal(false)}>
        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>Atılan bu kartları <b>2M Nakit</b> karşılığında satın alabilirsiniz (Arazi kartları geçerli değildir, tam para üstü verilmez).</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {gameState.scavengeMarket?.length > 0 ? (
            gameState.scavengeMarket.map(card => (
              <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                <CardVisual card={card} small onHover={handleCardHover} onClick={() => { setPreviewCard(card); setPreviewLocked(true); }} />
                <button onClick={() => handleBuyScavenge(card.id)} style={{ ...btnStyle('#2ECC71'), width: '100%', fontSize: 11 }}>2M ile Al</button>
              </div>
            ))
          ) : (
            <p style={{ color: '#aaa' }}>Karaborsa şu an boş.</p>
          )}
        </div>
      </Modal>
    );
  };

  // ---- GEÇMİŞ MODALI ----
  const renderHistoryModal = () => {
    if (!showHistoryModal) return null;
    return (
      <Modal title="📜 Maç Geçmişi" onClose={() => setShowHistoryModal(false)}>
        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 8 }}>
          {gameState.log?.map((entry, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: 8, fontSize: 13, borderLeft: entry.type === 'system' ? '3px solid #FFD700' : '3px solid #3498DB' }}>
              {renderLogMsg(entry)}
              <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>{new Date(entry.time).toLocaleTimeString('tr-TR')}</div>
            </div>
          )).reverse()}
        </div>
      </Modal>
    );
  }

  // ---- MOBİL MENÜ MODALI ----
  const renderMenuModal = () => {
    if (!isMenuOpen) return null;
    return (
      <Modal title="⚙️ OYUN MENÜSÜ" onClose={() => setIsMenuOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: '#aaa', fontWeight: 'bold' }}>🎴 DESTE KARTLARI</span>
            <button onClick={() => { setIsMenuOpen(false); setShowDeckStats(true); sfxClick(); }} style={btnStyle('rgba(255,255,255,0.15)')}>
              Detayları Gör ({gameState.deckCount})
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: '#aaa', fontWeight: 'bold' }}>🗑️ ISKARTA YIĞINI</span>
            <button onClick={() => { setIsMenuOpen(false); setShowDiscardModal(true); sfxClick(); }} style={btnStyle('rgba(255,255,255,0.15)')}>
              Iskartaya Bak ({gameState.discard?.length || 0})
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: '#aaa', fontWeight: 'bold' }}>👓 3D MASA GÖRÜNÜMÜ</span>
            <button onClick={() => { const next = !is3DTable; setIs3DTable(next); localStorage.setItem('md_3d', next ? 'on' : 'off'); sfxClick(); }} style={btnStyle(is3DTable ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.15)')}>
              {is3DTable ? 'AÇIK' : 'KAPALI'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: '#aaa', fontWeight: 'bold' }}>📜 HAREKET GEÇMİŞİ</span>
            <button onClick={() => { setIsMenuOpen(false); setShowHistoryModal(true); sfxClick(); }} style={btnStyle('rgba(52, 152, 219, 0.25)')}>
              Geçmişi Gör
            </button>
          </div>

          {gameState.streetThugs && gameState.scavengeMarket?.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: '#E74C3C', fontWeight: 'bold' }}>🕵️ KARABORSA</span>
              <button onClick={() => { setIsMenuOpen(false); setShowScavengeModal(true); sfxClick(); }} style={btnStyle('rgba(231, 76, 60, 0.25)')}>
                Markete Git ({gameState.scavengeMarket.length})
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#aaa', fontWeight: 'bold' }}>🔊 SES DÜZEYİ</span>
              <button onClick={() => { toggleSound(); sfxClick(); }} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#fff' }}>
                {soundOn ? '🔊' : '🔇'}
              </button>
            </div>
            {soundOn && (
              <input
                type="range" min="0" max="0.5" step="0.01"
                value={bgmVolume}
                onChange={e => { setBgmVolumeState(e.target.value); setBgmVolume(e.target.value); }}
                style={{ width: '100%', cursor: 'pointer', marginTop: 6 }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            {gameState?.players?.[0]?.id === playerId && (
              <button onClick={() => { setIsMenuOpen(false); socket.emit('returnToLobby', { roomCode }); }} style={{ ...btnStyle('#E67E22'), flex: 1, padding: '12px', fontSize: '13px' }}>
                Oyunu Bitir
              </button>
            )}
            <button onClick={() => { setIsMenuOpen(false); handleRageQuit(); }} style={{ ...btnStyle('#E74C3C'), flex: 1, padding: '12px', fontSize: '13px' }}>
              Masayı Devir
            </button>
          </div>

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
        {gameState?.allowTrades && isMyTurn && !isBlocked && p.id !== playerId && (
          <button onClick={() => { setViewingPlayerId(null); setTradeSelection({ offerBankIds: [], offerPropIds: [], requestBankIds: [], requestPropIds: [] }); setModal({ type: 'proposeTrade', targetId: p.id }); }}
            style={{ ...btnStyle('#3498DB'), width: '100%', padding: '12px', marginBottom: 16, fontSize: 14 }}>
            🤝 Barışçıl Takas Teklif Et (Ticaret)
          </button>
        )}
        <div style={{ marginBottom: 16, padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8, overflowX: 'auto' }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 16 }}>BANKA ({p.bankTotal}M)</div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 110, paddingLeft: 10, minWidth: (p.bank?.length || 0) * 30 + 50 }}>
            {(p.bank || []).map((c, i) => (
              <div key={c.id}
                onMouseEnter={() => handleCardHover(c)}
                onMouseLeave={() => handleCardHover(null)}
                onClick={() => { setPreviewCard(c); setPreviewLocked(true); }}
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
            <FannedPropertySet key={color} color={color} cards={cards} buildings={p.buildings} isOwn={false} onHoverCard={handleCardHover} onClickCard={(c) => { setPreviewCard(c); setPreviewLocked(true); }} />
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

  const handleUndoMove = () => {
    if (!socket) return;
    socket.emit('undoMove', {}, (res) => {
      if (res.ok) {
        setSelectedCard(null);
        setError('');
        sfxWhoosh();
      } else {
        setError(res.error || 'Hamle geri alınamadı');
        sfxError();
      }
    });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('sendChatMessage', { text: chatInput.trim() });
    setChatInput('');
    sfxChatSent();
  };
  useEffect(() => { if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatOpen]);

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
                    {Object.entries(p.properties || {}).every(([c, cards]) => isSetComplete(cards, c) || cards.length === 0) && <span style={{ fontSize: 11, color: '#aaa' }}>Çalınabilecek bağımsız kart yok.</span>}
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
                      {Object.entries(p.properties || {}).every(([c, cards]) => isSetComplete(cards, c) || cards.length === 0) && <span style={{ fontSize: 11, color: '#aaa' }}>Alınabilecek bağımsız kart yok.</span>}
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
                        {Object.entries(me?.properties || {}).every(([c, cards]) => isSetComplete(cards, c) || cards.length === 0) && <span style={{ fontSize: 11, color: '#aaa' }}>Verilebilecek bağımsız kartın yok.</span>}
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
                  {info?.name || color} ({me.properties[color]?.length || 0} arazi) — <b style={{ color: '#2ECC71' }}>{jokerRentAmount}M Al</b>
                </button>
                {doubleRentCards.length > 0 && (
                  <button onClick={() => {
                    if (card.colors === 'all') {
                      setModal({ type: 'selectRentTarget', card, color, double: true, doubleRentCardId: doubleRentCards[0].id });
                    } else {
                      handlePlayCard(card, { color, doubleRentCardId: doubleRentCards[0].id });
                    }
                  }} style={{ ...btnStyle('#D35400'), width: '100%', fontSize: 11 }}>
                    ⚡ İki Kat Kira ile oyna ({info?.name || color}) — <b style={{ color: '#FFD700' }}>{doubleJokerRentAmount}M Al</b>
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
      const card = modal.card;
      const allColors = card.colors || Object.keys(COLOR_INFO);
      return (
        <Modal title="Mülk Kartı Rengini Değiştir" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
            {/* Left Column: 3D Visual Preview */}
            <div style={{
              perspective: '1000px',
              width: 132 * 1.25,
              height: 192 * 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: isMobile ? 10 : 0
            }}>
              <div style={{
                transform: 'rotateY(-12deg) rotateX(8deg)',
                transformStyle: 'preserve-3d',
                boxShadow: '0 15px 35px rgba(0,0,0,0.5), 0 0 15px rgba(255,215,0,0.2)',
                borderRadius: '8px',
                transition: 'transform 0.4s ease',
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg) scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'rotateY(-12deg) rotateX(8deg)'}
              >
                <CardVisual card={card} small={false} />
              </div>
            </div>

            {/* Right Column: Color Options with Rents */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <p style={{ color: '#E0E0E0', fontSize: 13, margin: 0, opacity: 0.9, lineHeight: 1.4 }}>
                Bu kart şu anda <span style={{ color: COLOR_INFO[card.activeColor]?.light || '#fff', fontWeight: 900, textDecoration: 'underline' }}>{COLOR_INFO[card.activeColor]?.name || card.activeColor}</span> grubunda. Çevirmek istediğiniz yeni rengi seçin:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '280px', overflowY: 'auto', paddingRight: 4 }}>
                {allColors.map(color => {
                  const info = COLOR_INFO[color];
                  if (!info) return null;
                  const isActive = card.activeColor === color;

                  return (
                    <div
                      key={color}
                      onClick={() => {
                        if (!isActive) {
                          doFlip(card, color);
                        }
                      }}
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${info.hex}88, rgba(0,0,0,0.5))`
                          : `linear-gradient(135deg, ${info.hex}22, rgba(255,255,255,0.03))`,
                        border: isActive
                          ? `2px solid #FFD700`
                          : `1px solid rgba(255, 255, 255, 0.1)`,
                        borderRadius: '10px',
                        padding: '10px 14px',
                        cursor: isActive ? 'default' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? `0 0 12px ${info.hex}55` : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${info.hex}44, rgba(255,255,255,0.06))`;
                          e.currentTarget.style.borderColor = info.hex;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${info.hex}22, rgba(255,255,255,0.03))`;
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'none';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: info.light || '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: info.hex, border: '1px solid rgba(255,255,255,0.3)' }}></span>
                          {info.name}
                        </span>
                        {isActive && (
                          <span style={{ background: '#FFD700', color: '#000', fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: '6px', letterSpacing: 0.5 }}>
                            AKTİF GRUP
                          </span>
                        )}
                      </div>

                      {/* Kira değerleri tablosu */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '4px 8px' }}>
                        {info.rents.map((rentVal, i) => (
                          <div key={i} style={{ fontSize: 10.5, color: '#ccc' }}>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{i + 1} Kart:</span> {rentVal}M
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      );
    }

    if (modal.type === 'viewCardDetails') {
      const card = modal.card;
      const isProp = card.type === 'property';
      const isAction = card.type === 'action';
      const isMoney = card.type === 'money';
      const baseColor = isProp && card.color ? COLOR_INFO[card.color] : null;
      const activeColor = isProp && card.activeColor ? COLOR_INFO[card.activeColor] : null;
      
      const ACTION_COLORS = {
        passgo: '#3498DB',
        dealbreaker: '#8E44AD',
        justsayno: '#E74C3C',
        birthday: '#E91E8C',
        rent: '#16A085',
        doublerent: '#D35400',
        slydeal: '#F39C12',
        forceddeal: '#F39C12',
        debtcollector: '#F39C12',
        house: '#27AE60',
        hotel: '#1E8449'
      };
      
      const cardThemeColor = activeColor?.hex || baseColor?.hex || (isAction ? ACTION_COLORS[card.action] : '#95A5A6');
      const displayName = manifest?.names?.[card.key] || card.name;

      return (
        <Modal title="🔍 KART DETAYLARI" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
            {/* Left Column: Card Visual */}
            <div style={{
              perspective: '1000px',
              width: 132 * 1.25,
              height: 192 * 1.25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <CardVisual card={card} small={false} />
              </div>
            </div>

            {/* Right Column: Card Rents or Description */}
            <div style={{ flex: 1, color: '#fff', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <h3 style={{ color: cardThemeColor, margin: 0, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                {displayName}
              </h3>
              
              <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 6, color: '#aaa', display: 'inline-flex', alignSelf: 'flex-start' }}>
                Değer: <b style={{ color: '#FFD700', marginLeft: 4 }}>{card.value}M Nakit</b>
              </div>

              {isProp && baseColor?.rents && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 'black', color: '#FFD700', fontSize: 11, letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 6, marginBottom: 4 }}>KİRA TABLOSU</div>
                  {baseColor.rents.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 'bold' }}>
                      <span style={{ color: '#ccc' }}>{i + 1} Kart Sahipliği:</span>
                      <span style={{ color: '#2ECC71' }}>{r}M</span>
                    </div>
                  ))}
                </div>
              )}

              {(isAction || card.description) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 'bold', color: '#FFD700', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, marginBottom: 4 }}>KART AÇIKLAMASI</div>
                  <p style={{ lineHeight: 1.5, margin: 0, fontSize: 12, color: '#eee' }}>
                    {getDetailedCardTip(card)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      );
    }

    return null;
  };

  // ---- LOBİ AYARLARI PANELİ OLUŞTURUCU ----
  const renderRoomSettings = (disabled = false) => {
    const selStyle = { background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '6px 12px', outline: 'none', cursor: 'pointer' };
    return (
      <details className="settings-details" style={{ pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.7 : 1, marginTop: 12, width: '100%' }}>
        <summary>⚙️ GELİŞMİŞ OYUN AYARLARI</summary>
        <div className="settings-content">

          <label className="switch-container">
            <span className="switch-label">⏱️ Eli Otomatik Bitir (3 Hamle)</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.autoEndTurn} onChange={e => setRoomSettings(prev => ({ ...prev, autoEndTurn: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <label className="switch-container">
            <span className="switch-label">🛡️ Çifte Reddet (Savunmaya İtiraz)</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.allowCounterJustSayNo} onChange={e => setRoomSettings(prev => ({ ...prev, allowCounterJustSayNo: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <label className="switch-container">
            <span className="switch-label">👁️‍🗨️ Açık El Modu (Antrenman)</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.openHands} onChange={e => setRoomSettings(prev => ({ ...prev, openHands: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <label className="switch-container">
            <span className="switch-label">🔒 Joker Kilidi (Renk Sabitlenir)</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.lockWildcards} onChange={e => setRoomSettings(prev => ({ ...prev, lockWildcards: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <label className="switch-container">
            <span className="switch-label">⚡ Hızlı Reddet (15 Saniye limit)</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.fastChallenge} onChange={e => setRoomSettings(prev => ({ ...prev, fastChallenge: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <label className="switch-container">
            <span className="switch-label">🔁 Barışçıl Takas İzni</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.allowTrades} onChange={e => setRoomSettings(prev => ({ ...prev, allowTrades: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <label className="switch-container">
            <span className="switch-label">🕵️ Sokak Haydutları (Karaborsa)</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.streetThugs} onChange={e => setRoomSettings(prev => ({ ...prev, streetThugs: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <label className="switch-container">
            <span className="switch-label">🎲 Kumarbazın Zarı (Ekstra Şans)</span>
            <input type="checkbox" className="switch-checkbox" checked={roomSettings.gambleZari} onChange={e => setRoomSettings(prev => ({ ...prev, gambleZari: e.target.checked }))} />
            <div className="switch-toggle" />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
            <span style={{ fontSize: 13, color: '#aaa' }}>🕒 Hamle Süresi:</span>
            <select value={roomSettings.turnTimer} onChange={e => setRoomSettings(prev => ({ ...prev, turnTimer: Number(e.target.value) }))} style={selStyle}>
              <option value={0}>Sınırsız (Klasik)</option>
              <option value={30}>30 Saniye</option>
              <option value={60}>60 Saniye</option>
              <option value={120}>2 Dakika</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
            <span style={{ fontSize: 13, color: '#aaa' }}>🏆 Kazanma Hedefi:</span>
            <select value={roomSettings.winSets} onChange={e => setRoomSettings(prev => ({ ...prev, winSets: Number(e.target.value) }))} style={selStyle}>
              <option value={2}>2 Tam Set (Hızlı)</option>
              <option value={3}>3 Tam Set (Klasik)</option>
              <option value={4}>4 Tam Set (Uzun)</option>
              <option value={5}>5 Tam Set (Destansı)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
            <span style={{ fontSize: 13, color: '#aaa' }}>🃏 Başlangıç Kart Sayısı:</span>
            <select value={roomSettings.startCards} onChange={e => setRoomSettings(prev => ({ ...prev, startCards: Number(e.target.value) }))} style={selStyle}>
              <option value={5}>5 Kart (Standart)</option>
              <option value={7}>7 Kart (Hızlı)</option>
              <option value={10}>10 Kart (Kaos)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px' }}>
            <span style={{ fontSize: 13, color: '#aaa' }}>💣 Deste Hilesi (Deal Breaker):</span>
            <select value={roomSettings.extraDealBreakers} onChange={e => setRoomSettings(prev => ({ ...prev, extraDealBreakers: Number(e.target.value) }))} style={selStyle}>
              <option value={0}>Yok (Orijinal 2)</option>
              <option value={1}>+1 Ekle (Toplam 3)</option>
              <option value={3}>+3 Ekle (Kaos!)</option>
            </select>
          </div>
        </div>
      </details>
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
      <Modal title={isCounter ? '⚠️ Karşı Reddet! Şansın!' : `⚠️ ${ACTION_NAMES[ch.action] || ch.action} — Yanıt Ver`} onClose={() => { }}>
        <p style={{ color: '#fff', marginBottom: 16, fontSize: 14 }}>{description}</p>
        {isCounter && (
          <p style={{ color: '#aaa', fontSize: 12, marginBottom: 12 }}>
            {ch.targetName} az önce "Reddet!" oynadı ve bu hamleyi geçersiz kıldı. Eğer senin de "Reddet!" kartın varsa,
            onu oynayarak hamleni yine geçerli kılabilirsin!
          </p>
        )}
        {gameState.fastChallenge && <div style={{ color: '#E74C3C', fontWeight: 'bold', marginBottom: 10 }}>⏱️ Otomatik kabul edilmesine: {challengeTime} saniye</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {haveJustSayNo ? (
            <>
              <div style={{ fontSize: 11, color: '#FFD700', fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
                ELİNDEKİ SAVUNMA KARTI (Oynamak için tıkla)
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                {(me?.hand || []).filter(c => c.action === 'justsayno').map(c => (
                  <div key={c.id}
                    onClick={() => handleRespondChallenge(ch.id, true)}
                    onMouseEnter={() => handleCardHover(c)}
                    onMouseLeave={() => handleCardHover(null)}
                    style={{ cursor: 'pointer' }}>
                    <CardVisual card={c} small />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: '#E74C3C', fontSize: 12, fontWeight: 'bold', textAlign: 'center', margin: '10px 0' }}>
              🛡️ Elinizde "Reddet!" (Just Say No) savunma kartı bulunmuyor.
            </div>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => handleRespondChallenge(ch.id, false)} style={{ ...btnStyle('#555'), width: '100%', padding: '12px', fontSize: 13 }}>
              {isCounter ? 'Reddet etme, hamle geçersiz kalsın' : 'Kabul Et ve Öde / Devret'}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  // ── ÖDEME MODALI ──
  const renderPaymentModal = () => {
    if (!gameState?.myPendingPayment) return null;
    const payment = gameState.myPendingPayment;
    // Eğer hiç varlığım yoksa server otomatik geçer, ama yine de göstermeyelim
    const hasBank = (me?.bank || []).length > 0;
    const hasProps = Object.values(me?.properties || {}).flat().length > 0;
    if (!hasBank && !hasProps) return null;

    const selectedTotal =
      (me?.bank || []).filter(c => paymentSelection.bankCardIds.includes(c.id)).reduce((s, c) => s + c.value, 0) +
      Object.values(me?.properties || {}).flat().filter(c => paymentSelection.propertyCardIds.includes(c.id)).reduce((s, c) => s + c.value, 0);

    const totalAssets =
      (me?.bank || []).reduce((s, c) => s + c.value, 0) +
      Object.values(me?.properties || {}).flat().reduce((s, c) => s + c.value, 0);

    const enoughOrAll = selectedTotal >= payment.amount || selectedTotal === totalAssets;
    const canSubmit = selectedTotal > 0 && enoughOrAll;

    return (
      <Modal title="💸 Ödeme Yap" onClose={() => { }}>
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
              {(me?.bank || []).map(c => (
                <div key={c.id}
                  onClick={() => togglePaymentBankCard(c.id)}
                  onMouseEnter={() => handleCardHover(c)}
                  onMouseLeave={() => handleCardHover(null)}
                  style={{ cursor: 'pointer' }}>
                  <CardVisual card={c} small selected={paymentSelection.bankCardIds.includes(c.id)} />
                </div>
              ))}
            </div>
          </>
        )}

        {hasProps && (
          <>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>TAPU SENEDİ KARTLARI (renk ne olursa olsun gidebilir)</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {Object.entries(me?.properties || {}).flatMap(([color, cards]) => cards.map(c => (
                <div key={c.id}
                  onClick={() => togglePaymentPropertyCard(c.id)}
                  onMouseEnter={() => handleCardHover(c)}
                  onMouseLeave={() => handleCardHover(null)}
                  style={{ cursor: 'pointer' }}>
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

  // ── TAKAS TEKLİF VE YANIT MODALLARI ──
  const renderTradeModal = () => {
    if (modal?.type === 'proposeTrade') {
      const target = gameState.players.find(p => p.id === modal.targetId);
      const toggle = (type, id) => setTradeSelection(p => ({ ...p, [type]: p[type].includes(id) ? p[type].filter(x => x !== id) : [...p[type], id] }));
      const canSubmit = tradeSelection.offerBankIds.length + tradeSelection.offerPropIds.length + tradeSelection.requestBankIds.length + tradeSelection.requestPropIds.length > 0;
      return (
        <Modal title={`🤝 ${target?.name} İle Takas Yap`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, background: 'rgba(231,76,60,0.1)', padding: 10, borderRadius: 8 }}>
              <div style={{ color: '#E74C3C', fontWeight: 'bold', marginBottom: 8 }}>Ne Vereceksin? (Senin)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(me?.bank || []).map(c => <div key={c.id} onClick={() => toggle('offerBankIds', c.id)} style={{ cursor: 'pointer', opacity: tradeSelection.offerBankIds.includes(c.id) ? 1 : 0.4 }}><CardVisual card={c} small /></div>)}
                {Object.values(me?.properties || {}).flat().map(c => <div key={c.id} onClick={() => toggle('offerPropIds', c.id)} style={{ cursor: 'pointer', opacity: tradeSelection.offerPropIds.includes(c.id) ? 1 : 0.4 }}><CardVisual card={c} small /></div>)}
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(46,204,113,0.1)', padding: 10, borderRadius: 8 }}>
              <div style={{ color: '#2ECC71', fontWeight: 'bold', marginBottom: 8 }}>Ne Alacaksın? ({target?.name})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {target.bank.map(c => <div key={c.id} onClick={() => toggle('requestBankIds', c.id)} style={{ cursor: 'pointer', opacity: tradeSelection.requestBankIds.includes(c.id) ? 1 : 0.4 }}><CardVisual card={c} small /></div>)}
                {Object.values(target.properties).flat().map(c => <div key={c.id} onClick={() => toggle('requestPropIds', c.id)} style={{ cursor: 'pointer', opacity: tradeSelection.requestPropIds.includes(c.id) ? 1 : 0.4 }}><CardVisual card={c} small /></div>)}
              </div>
            </div>
          </div>
          <button onClick={() => handleProposeTrade(target.id)} disabled={!canSubmit} style={{ ...btnStyle('#27AE60'), width: '100%', marginTop: 10, padding: 10, opacity: canSubmit ? 1 : 0.5 }}>Teklif Et</button>
        </Modal>
      );
    }
  };

  // ---- LOBBY ----
  if (screen === 'lobby') {
    return (
      <div className="lobby-animated-bg" style={{ minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
        {/* Floating Ambient Lights */}
        <div className="ambient-aura ambient-aura-1" />
        <div className="ambient-aura ambient-aura-2" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, zIndex: 1 }}>
          <div style={{ fontSize: 48, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>🏠</div>
          <div>
            <h1 style={{ color: '#FFD700', fontSize: 32, margin: 0, textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>Monopoly Deal</h1>
            <p style={{ color: '#E0E0E0', fontSize: 14, margin: 0, opacity: 0.8 }}>Çevrimiçi Kart Oyunu</p>
          </div>
        </div>

        <div className="glass-card" style={{ width: '100%', maxWidth: 500 }}>

          {/* Avatar ve İsim Seçimi */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#FFD700', fontWeight: 'bold', marginBottom: 12, letterSpacing: 1 }}>KİMLİĞİNİ OLUŞTUR</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', minHeight: 60 }}>
              {AVATAR_STYLES.map(style => (
                <div key={style} className={myAvatarStyle === style ? 'avatar-halo-active' : ''}>
                  <img
                    src={`https://api.dicebear.com/7.x/${style}/svg?seed=${myName || 'Oyuncu'}`}
                    alt={style}
                    onClick={() => { setMyAvatarStyle(style); localStorage.setItem('md_avatar', style); }}
                    style={{
                      width: 48, height: 48, borderRadius: '50%', cursor: 'pointer',
                      border: myAvatarStyle === style ? '3px solid #FFD700' : '2px solid transparent',
                      background: 'rgba(255,255,255,0.1)',
                      transition: 'all 0.2s',
                      transform: myAvatarStyle === style ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: myAvatarStyle === style ? '0 4px 10px rgba(255,215,0,0.4)' : 'none'
                    }}
                  />
                </div>
              ))}
            </div>
            <input
              value={myName}
              onChange={e => setMyName(e.target.value)}
              placeholder="Oyuncu Adın..."
              style={{ ...inputStyle, textAlign: 'center', fontSize: 16, padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.3)', marginTop: 16 }}
            />
          </div>

          {!roomCode ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                {/* ODA KUR */}
                <div style={{ background: 'rgba(230, 126, 34, 0.05)', border: '1px solid rgba(230, 126, 34, 0.2)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ color: '#E67E22', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>✨ Yeni Oyun Kur</h3>

                  <label className="switch-container" style={{ marginBottom: 12 }}>
                    <span className="switch-label">🌍 Herkese Açık Yap</span>
                    <input type="checkbox" className="switch-checkbox" checked={roomSettings.isPublic} onChange={e => setRoomSettings(prev => ({ ...prev, isPublic: e.target.checked }))} />
                    <div className="switch-toggle" />
                  </label>

                  {renderRoomSettings()}
                  <div style={{ flex: 1 }}></div>
                  <button onClick={handleCreate} className="lobby-action-btn" style={{ ...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'), width: '100%', padding: '12px', fontSize: 14, marginTop: 'auto' }}>
                    🚀 Oda Oluştur
                  </button>
                </div>

                {/* ODAYA KATIL */}
                <div style={{ background: 'rgba(46, 204, 113, 0.05)', border: '1px solid rgba(46, 204, 113, 0.2)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ color: '#2ECC71', fontSize: 14, marginBottom: 12, textAlign: 'center' }}>🔑 Özel Odaya Katıl</h3>
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Oda Kodu" style={{ ...inputStyle, letterSpacing: 2, textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(46,204,113,0.3)', marginBottom: 12 }} />
                  <div style={{ flex: 1 }}></div>
                  <button onClick={handleJoin} className="lobby-action-btn" style={{ ...btnStyle('linear-gradient(135deg, #2ECC71, #27AE60)'), width: '100%', padding: '12px', fontSize: 14, marginTop: 'auto' }}>
                    Aramıza Katıl
                  </button>
                </div>
              </div>

              {/* AÇIK ODALAR LİSTESİ */}
              <div style={{ background: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)', padding: 16, borderRadius: 12, marginTop: 16 }}>
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
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Oda Kodu (Arkadaşlarınla Paylaş)</div>
              <div className="glass-card" style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(0,0,0,0.4))',
                border: '2px solid rgba(255, 215, 0, 0.4)',
                boxShadow: '0 8px 32px rgba(255, 215, 0, 0.15), inset 0 1px 1px rgba(255,255,255,0.1)',
                padding: '16px 24px',
                borderRadius: '16px',
                display: 'inline-block',
                marginBottom: 24,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 215, 0, 0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 215, 0, 0.15)';
                }}
                onClick={() => { navigator.clipboard.writeText(roomCode); showToast('Oda kodu kopyalandı!', 'success'); sfxClick(); }}>
                <div style={{ fontSize: 11, color: '#FFD700', fontWeight: 'bold', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>GİRİŞ BİLETİ ODA KODU</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#FFD700', letterSpacing: 6, textShadow: '0 0 15px rgba(255,215,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {roomCode}
                  <span style={{ fontSize: 20, opacity: 0.8 }}>📋</span>
                </div>
                <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>Kopyalamak için Tıklayın</div>
              </div>

              <div style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
                {gameState?.players?.length || 1}/5 oyuncu bağlı
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24, textAlign: 'left' }}>
                {gameState?.players?.map((p, idx) => {
                  const playerColor = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                  const isSelf = p.id === playerId;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: 'rgba(255,255,255,0.03)',
                        padding: '10px 14px',
                        borderRadius: 14,
                        border: `1px solid ${playerColor}44`,
                        boxShadow: `0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.border = `1px solid ${playerColor}`;
                        e.currentTarget.style.boxShadow = `0 6px 20px ${playerColor}33, inset 0 1px 0 rgba(255,255,255,0.05)`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.border = `1px solid ${playerColor}44`;
                        e.currentTarget.style.boxShadow = `0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`;
                      }}
                    >
                      <div className={isSelf ? 'avatar-halo-active' : ''}>
                        <img
                          src={`https://api.dicebear.com/7.x/${p.avatar || 'avataaars'}/svg?seed=${p.name}`}
                          alt="avatar"
                          title={isSelf ? "İsmini değiştirmek için tıkla" : ""}
                          onClick={() => {
                            if (isSelf) {
                              const newName = prompt("Yeni isminizi girin:", p.name);
                              if (newName && newName.trim()) {
                                setMyName(newName.trim());
                                localStorage.setItem('md_name', newName.trim());
                                socket?.emit('updatePlayerName', { roomCode, newName: newName.trim() });
                              }
                            }
                          }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.2)',
                            cursor: isSelf ? 'pointer' : 'default',
                            border: `2px solid ${isSelf ? '#FFD700' : 'rgba(255,255,255,0.2)'}`,
                            boxShadow: isSelf ? '0 0 10px rgba(255,215,0,0.3)' : 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{p.name}</span>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          {isSelf && <span style={{ fontSize: 9, background: '#FFD700', color: '#000', padding: '2px 6px', borderRadius: 10, fontWeight: 'bold', letterSpacing: 0.5 }}>SEN</span>}
                          {idx === 0 && <span style={{ fontSize: 9, background: '#8E44AD', color: '#fff', padding: '2px 6px', borderRadius: 10, fontWeight: 'bold', letterSpacing: 0.5 }}>HOST</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {gameState?.players?.[0]?.id === playerId && (
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

  // Kazananın Rengi
  const winnerColor = gameState?.winner ? PLAYER_COLORS[gameState.players.findIndex(p => p.id === gameState.winner.id) % PLAYER_COLORS.length] : '#0f0f23';

  const getDynamicBackground = () => {
    if (gameState?.winner) {
      return `radial-gradient(circle at center, ${winnerColor}55 0%, #0b071e 80%)`;
    }
    if (showDanger) {
      // Süre azaldığında tehlikeli kırmızı
      return 'radial-gradient(circle at center, #781c1c 0%, #0c081e 80%)';
    }
    if (isBlocked) {
      // Ödeme/itiraz beklenirken gergin mor
      return 'radial-gradient(circle at center, #5b1a78 0%, #0c081e 80%)';
    }
    if (isMyTurn) {
      // Sıra bendeyken odaklanma mavisi
      return 'radial-gradient(circle at center, #1a4da3 0%, #060e22 80%)';
    }
    // Varsayılan arka plan
    return 'radial-gradient(circle at center, #1c2b5e 0%, #080d21 80%)';
  };

  return (
    <ThemeContext.Provider value={{ themeId: activeTheme, manifest }}>
      <style>
        {`
        .rage-quit-active { animation: rage-quit-anim 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; pointer-events: none; }
        @keyframes rage-quit-anim {
           0% { transform: rotate(0deg) scale(1); filter: blur(0px); }
           20% { transform: rotate(-5deg) scale(1.05) translateY(-20px); filter: blur(1px); }
           100% { transform: rotate(180deg) scale(0.2) translateY(1500px); filter: blur(10px); opacity: 0; }
        }
      `}
      </style>
      <div className={`game-board-container ${is3DTable ? 'table-3d' : ''} ${boardShake === 'heavy' ? "board-shake-heavy" : boardShake ? "board-shake-active" : ""}`} style={{ height: isMobile ? '100vh' : 'auto', maxHeight: isMobile ? '100vh' : 'none', overflow: isMobile ? 'hidden' : 'visible', background: getDynamicBackground(), color: '#fff', display: 'flex', flexDirection: 'column', fontSize: 13, transition: 'background 0.8s ease-in-out' }}>

        {/* Üst bar */}
        {!isHeaderOpen ? (
          <div 
            onClick={() => { setIsHeaderOpen(true); sfxClick(); }}
            style={{
              background: '#1a1a2e',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              transition: 'background 0.2s',
              zIndex: 100,
              fontSize: '11px',
              color: '#aaa',
              fontWeight: 'bold',
              letterSpacing: 1,
              userSelect: 'none'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#22223b'}
            onMouseLeave={e => e.currentTarget.style.background = '#1a1a2e'}
          >
            ▼ ÜST BARI GÖSTER
          </div>
        ) : (
          <div className="game-topbar" style={{ background: '#1a1a2e', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', flexWrap: 'wrap', gap: 8, zIndex: 100 }}>
            {isMobile ? (
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#FFD700', fontWeight: 900, fontSize: 15 }}>🏠 Monopoly Deal</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {isMyTurn && (
                    <span style={{ background: '#FFD700', color: '#000', fontWeight: 700, padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>
                      SIRA SENDE
                    </span>
                  )}
                  <button onClick={() => { setIsMenuOpen(true); sfxClick(); }} style={{ ...btnStyle('rgba(255,255,255,0.1)'), padding: '4px 10px', fontSize: 11, border: '1px solid rgba(255,255,255,0.2)' }}>
                    ⚙️ MENÜ
                  </button>
                  <button onClick={() => { setIsHeaderOpen(false); sfxClick(); }} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, padding: '0 4px' }} title="Barı Gizle">
                    ▲
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ color: '#FFD700', fontWeight: 900, fontSize: 16 }}>🏠 Monopoly Deal</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#aaa', fontSize: 11 }}>Oda: <b style={{ color: '#fff' }}>{roomCode}</b></span>
                  <button ref={deckRef} onClick={() => setShowDeckStats(true)} style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 6, color: '#aaa', fontSize: 11, border: 'none', cursor: 'pointer' }}>
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
                  <button onClick={() => { const next = !is3DTable; setIs3DTable(next); localStorage.setItem('md_3d', next ? 'on' : 'off'); sfxClick(); }} style={{ ...btnStyle(is3DTable ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.1)'), padding: '4px 8px', fontSize: 11, border: is3DTable ? '1px solid rgba(46,204,113,0.4)' : 'none' }}>
                    {is3DTable ? '👓 3D Masa: Açık' : '👓 3D Masa: Kapalı'}
                  </button>
                  {isMyTurn && (
                    <span style={{ background: '#FFD700', color: '#000', fontWeight: 700, padding: '4px 8px', borderRadius: 6, fontSize: 11 }}>
                      SIRA SENİN ({gameState.actionsLeft} aksiyon)
                    </span>
                  )}
                  <button onClick={() => setShowHistoryModal(true)} style={{ ...btnStyle('rgba(52, 152, 219, 0.2)'), padding: '4px 8px', fontSize: 11, border: '1px solid rgba(52, 152, 219, 0.5)' }}>
                    📜 Geçmiş
                  </button>
                  {gameState.streetThugs && gameState.scavengeMarket?.length > 0 && (
                    <button onClick={() => setShowScavengeModal(true)} style={{ ...btnStyle('rgba(231, 76, 60, 0.2)'), padding: '4px 8px', fontSize: 11, border: '1px solid rgba(231, 76, 60, 0.5)' }}>
                      🕵️ Karaborsa ({gameState.scavengeMarket.length})
                    </button>
                  )}
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
                  <button onClick={handleRageQuit} style={{ background: 'transparent', border: '1px solid #E74C3C', color: '#E74C3C', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
                    (╯°□°)╯︵ ┻━┻ Masayı Devir
                  </button>
                  <button onClick={() => { setIsHeaderOpen(false); sfxClick(); }} style={{ ...btnStyle('rgba(255,255,255,0.1)'), padding: '4px 8px', fontSize: 11 }}>
                    ▲ Gizle
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Canlı Hamle Şeridi (Action Ticker) */}
        {gameState.log?.length > 0 && (
          <div className="action-ticker-container">
            <span style={{ fontSize: 13, textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>📢 SON HAMLE:</span>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <div className="action-ticker-text" key={gameState.log[gameState.log.length - 1].time}>
                {gameState.log[gameState.log.length - 1].msg.replace(/\(.*?\)/g, '').trim()}
              </div>
            </div>
          </div>
        )}

        {/* Zaman Sınırı Fitil Sayacı (Burning Fuse) */}
        {gameState.turnTimer > 0 && gameState.turnStartTime && !isBlocked && (
          <div className="fuse-bar-container" title={`Kalan Tur Süresi: ${remainingTime} saniye`}>
            <div className="fuse-bar" style={{ width: `${Math.max(0, Math.min(100, (remainingTime / gameState.turnTimer) * 100))}%` }} />
            <div className="fuse-spark" style={{ left: `calc(${Math.max(0, Math.min(100, (remainingTime / gameState.turnTimer) * 100))}% - 5px)` }} />
          </div>
        )}

        {renderModal()}
        {renderChallengeModal()}
        {renderPaymentModal()}
        {renderDiscardModal()}
        {renderMenuModal()}
        {renderDeckStatsModal()}
        {renderPlayerDetailsModal()}
        {renderTradeModal()}
        {renderScavengeModal()}
        {renderHistoryModal()}
        <ToastStack toasts={toasts} />

        {/* Son Saniye Kırmızı Tehlike Ekranı */}
        {showDanger && <div className="danger-vignette" />}

        {/* Anlaşma Bozucu Sinematik Flaş */}
        {boardShake === 'heavy' && <div className="flash-red-overlay" />}

        {/* Kanlı Kira Gecesi Efekti */}
        {gameState.myPendingPayment && <div className="bloody-payment-overlay" />}

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

        {/* BARIŞÇIL TAKAS ONAY EKRANI (Hedef İçin) */}
        {myPendingTrade && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <div style={{ background: '#1a1a2e', padding: 24, borderRadius: 12, border: '2px solid #3498DB', maxWidth: 400, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🤝</div>
              <h2 style={{ color: '#3498DB', marginBottom: 16 }}>{myPendingTrade.sourceName} Takas Teklif Ediyor!</h2>
              <div style={{ color: '#aaa', fontSize: 13, marginBottom: 20 }}>Senden <b>{myPendingTrade.requestBankIds.length + myPendingTrade.requestPropIds.length} kart</b> istiyor ve karşılığında <b>{myPendingTrade.offerBankIds.length + myPendingTrade.offerPropIds.length} kart</b> veriyor. Detayları görmek ister misin? (Takas yaparsanız varlıklar doğrudan yer değiştirir.)</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleRespondTrade(myPendingTrade.id, true)} style={{ ...btnStyle('#2ECC71'), flex: 1, padding: 12, fontSize: 14 }}>✅ Kabul Et</button>
                <button onClick={() => handleRespondTrade(myPendingTrade.id, false)} style={{ ...btnStyle('#E74C3C'), flex: 1, padding: 12, fontSize: 14 }}>❌ Reddet</button>
              </div>
            </div>
          </div>
        )}

        {/* Desteden Uçan Kartlar (Çekme Animasyonu) */}
        <AnimatePresence>
          {flyingCards.map(fc => (
            <div key={fc.id} className="card-draw-3d-wrapper">
              <motion.div
                initial={{ x: fc.startX, y: fc.startY, scale: 0.1, rotateY: 180, rotateZ: -30, opacity: 0 }}
                animate={{
                  x: [fc.startX, window.innerWidth / 2, window.innerWidth / 2 - 60 + (Math.random() * 20 - 10)],
                  y: [fc.startY, window.innerHeight / 2 - 100, window.innerHeight - 150],
                  scale: [0.1, 1.8, 0.8],
                  rotateY: [180, 270, 360], /* 3D Hearthstone Çevirme Efekti */
                  rotateZ: [-30, 10, 360 + (Math.random() * 20 - 10)],
                  opacity: [0, 1, 1]
                }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.85, delay: fc.delay, ease: "easeOut", times: [0, 0.4, 1] }}
                style={{ position: 'relative' }}
              >
                <CardVisual card={fc.card} />
              </motion.div>
            </div>
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

        {/* Kart Önizleme Tooltip Kaldırıldı */}

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

        <div className={`game-main ${rageQuit ? 'rage-quit-active' : ''}`} style={{ display: 'flex', flex: 1, overflowY: isMobile ? 'hidden' : 'auto', overflowX: 'hidden', flexDirection: 'column' }}>
          {/* Üst: Diğer oyuncular (Mobil ve Masaüstü sütunlu yerleşim) */}
          <div className="opponents-top-row" style={{
            display: 'flex',
            gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            overflowX: 'auto',
            background: 'rgba(0,0,0,0.12)',
            zIndex: 10,
            flexShrink: 0
          }}>
            {gameState.players.filter(p => p.id !== playerId).map(player => {
              const pIdx = gameState.players.findIndex(x => x.id === player.id);
              const playerColor = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
              const isTargeted = gameState.pendingChallenges.some(ch => (ch.action === 'slydeal' || ch.action === 'dealbreaker' || ch.action === 'debtcollector') && ch.targetId === player.id);
              const isCurrent = player.id === gameState.currentPlayerId;

              return (
                <div 
                  key={player.id} 
                  ref={el => (playerPanelRefs.current[player.id] = el)}
                  onClick={() => setViewingPlayerId(player.id)}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? 260 : 300,
                    borderRadius: 16,
                    padding: 12,
                    background: `linear-gradient(to bottom, ${playerColor}15 0%, rgba(20,20,35,0.6) 100%)`,
                    border: isCurrent ? `2.5px solid ${playerColor}` : `1px solid ${playerColor}55`,
                    boxShadow: isCurrent ? `0 0 20px ${playerColor}44` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '--player-color': playerColor
                  }}
                  className={isCurrent ? 'spotlight-glow' : ''}
                >
                  {isTargeted && <div className="target-crosshair" />}
                  
                  {/* Oyuncu Üst Bilgi Başlığı (Header) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: playerColor, boxShadow: `0 0 8px ${playerColor}` }} />
                      <span style={{ fontWeight: 800, color: playerColor, fontSize: 13.5, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                        {player.name}
                      </span>
                      {player.isAFK && <span title="AFK" style={{ fontSize: 13 }}>💤</span>}
                      {player.connected === false && <span style={{ fontSize: 9, color: '#f44' }}>● Çevrimdışı</span>}
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 'bold', color: '#ddd' }}>
                      <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 6 }}>
                        💰 {player.bankTotal}M
                      </span>
                      <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 6 }}>
                        🃏 x{player.handCount}
                      </span>
                    </div>
                  </div>

                  {/* Oyuncu Varlıkları (Mülkler ve Banka Yığını) */}
                  <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 76, overflowX: 'auto', paddingBottom: 4 }}>
                    
                    {/* Banka Para Kartı Yığını */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 8, color: '#888', fontWeight: 'bold' }}>🏦 KASA</span>
                      <div style={{ position: 'relative', width: 44, height: 64 }}>
                        {player.bank?.slice(0, 5).map((c, i) => (
                          <div key={c.id} style={{
                            position: 'absolute',
                            top: i * 4,
                            left: i * 2,
                            width: 32,
                            height: 48,
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #2ECC71, #196F3D)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: 10,
                            color: '#fff',
                            zIndex: i
                          }}>
                            {c.value}M
                          </div>
                        ))}
                        {(player.bank?.length || 0) > 5 && (
                          <div style={{
                            position: 'absolute',
                            top: 20,
                            left: 10,
                            background: 'rgba(0,0,0,0.75)',
                            color: '#FFD700',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            fontWeight: 900,
                            zIndex: 10
                          }}>
                            +{player.bank.length - 5}
                          </div>
                        )}
                        {(!player.bank || player.bank.length === 0) && (
                          <div style={{ width: 32, height: 48, borderRadius: 4, border: '1.2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#444' }}>BOŞ</div>
                        )}
                      </div>
                    </div>

                    {/* Mülk Sütunları (En fazla 4 yan yana - Mobilde Renkli Noktalar) */}
                    {isMobile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ fontSize: 8, color: '#888', fontWeight: 'bold' }}>ARAZİLER</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: '160px' }}>
                          {Object.entries(player.properties || {}).map(([color, cards]) => {
                            if (cards.length === 0) return null;
                            const info = COLOR_INFO[color] || { hex: '#aaa' };
                            const isComplete = isSetComplete(cards, color);
                            return (
                              <div 
                                key={color}
                                className={`micro-card-dot ${isComplete ? 'complete-set-glow' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setModal({ type: 'viewCardDetails', card: cards[0] });
                                }}
                                style={{
                                  width: 14,
                                  height: 18,
                                  borderRadius: 3,
                                  backgroundColor: info.hex,
                                  border: isComplete ? '1.5px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                  boxShadow: isComplete ? `0 0 8px ${info.hex}` : 'none',
                                  opacity: isComplete ? 1 : 0.5,
                                  cursor: 'pointer',
                                  '--glow-color': info.hex
                                }}
                                title={`${info.name}: ${cards.length} kart ${isComplete ? '(Tamamlandı)' : ''}`}
                              />
                            );
                          })}
                          {Object.values(player.properties || {}).flat().length === 0 && (
                            <span style={{ fontSize: 9, color: '#555', fontStyle: 'italic' }}>BOŞ</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 44px)', gap: 6 }}>
                        {Object.entries(player.properties || {}).map(([color, cards]) => {
                          if (cards.length === 0) return null;
                          const info = COLOR_INFO[color] || { hex: '#aaa' };
                          const isComplete = isSetComplete(cards, color);
                          return (
                            <div 
                              key={color} 
                              style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                position: 'relative', 
                                width: 44, 
                                minHeight: 64,
                                background: isComplete ? `${info.hex}15` : 'transparent',
                                borderRadius: 4,
                                padding: 2,
                                border: isComplete ? `1px solid ${info.hex}` : 'none',
                                boxSizing: 'border-box'
                              }}
                            >
                              {/* Dikey stacked kartlar */}
                              {cards.map((c, i) => (
                                <div 
                                  key={c.id} 
                                  className="mini-card-wrapper"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModal({ type: 'viewCardDetails', card: c });
                                  }}
                                  style={{
                                    marginTop: i > 0 ? -42 : 0, // Dikey üst üste binme
                                    zIndex: i,
                                    position: 'relative',
                                    width: 38,
                                    height: 52
                                  }}
                                >
                                  {/* Mini View */}
                                  <div style={{
                                    width: 38,
                                    height: 52,
                                    backgroundColor: '#FFFFFF',
                                    border: isComplete ? `1.5px solid ${info.hex}` : '1px solid rgba(0,0,0,0.15)',
                                    borderRadius: 4,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    overflow: 'hidden',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    boxSizing: 'border-box',
                                    '--glow-color': info.hex
                                  }} className={`mini-card-face ${isComplete ? 'complete-set-glow' : ''}`}>
                                    {/* Üst renk çizgisi */}
                                    <div style={{
                                      width: '100%',
                                      height: 8,
                                      background: c.isWild ? 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB)' : info.hex,
                                      flexShrink: 0
                                    }} />
                                    <div style={{
                                      fontSize: 8,
                                      fontWeight: 900,
                                      color: '#333',
                                      lineHeight: 1,
                                      marginTop: 4,
                                      transform: 'scale(0.85)'
                                    }}>
                                      {c.isWild ? '★' : (c.value || '')}
                                    </div>
                                  </div>

                                  {/* Hover View */}
                                  <div className="mini-card-hover-view">
                                    <CardVisual card={c} small />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Orta Panel (Responsive Masa / Log Görünümü) */}
          {isMobile ? (
            <div className="center-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Tab Selector (Mobil için) */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 8, margin: '8px 10px 4px', padding: 2, flexShrink: 0 }}>
                <button 
                  onClick={() => setActiveTab('board')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: activeTab === 'board' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'board' ? '#FFD700' : '#aaa',
                    fontWeight: 'bold',
                    fontSize: 11,
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  🎮 MASA ÜSTÜ
                </button>
                <button 
                  onClick={() => setActiveTab('log')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    background: activeTab === 'log' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    color: activeTab === 'log' ? '#FFD700' : '#aaa',
                    fontWeight: 'bold',
                    fontSize: 11,
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  📜 OYUN GÜNLÜĞÜ
                </button>
              </div>

              {activeTab === 'log' ? (
                <div ref={logRef} className="game-log" style={{
                  flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 6,
                  margin: '4px 10px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
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
              ) : (
                <div style={{ display: 'flex', gap: 12, padding: 10, flex: 1, overflow: 'hidden' }}>
                  {/* Sol: Deste ve Son Oynanan (Mobil) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)', padding: '10px 6px', borderRadius: 8, width: 80, flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 8, color: '#aaa', fontWeight: 'bold' }}>DESTE ({gameState.deckCount})</span>
                      <div style={{ width: 44, height: 60, borderRadius: 4, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {gameState.deckCount > 0 ? (
                          <div style={{ width: 38, height: 54, borderRadius: 3, background: 'linear-gradient(135deg, #1f4068, #162447)', border: '1px solid #FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 12 }}>🏠</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 8, color: '#444' }}>BOŞ</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 8, color: '#aaa', fontWeight: 'bold' }}>SON OYNANAN</span>
                      <div style={{ width: 44, height: 60, borderRadius: 4, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {gameState.discard?.length > 0 ? (
                          <div style={{ transform: 'scale(0.55)', cursor: 'pointer' }}
                            onClick={() => { setPreviewCard(gameState.discard[gameState.discard.length - 1]); setPreviewLocked(true); }}>
                            <CardVisual card={gameState.discard[gameState.discard.length - 1]} small />
                          </div>
                        ) : (
                          <span style={{ fontSize: 8, color: '#444' }}>YOK</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sağ: Benim Bankam ve Arazilerim (Mobil) */}
                  <div data-drop-target="properties" style={{
                    flex: 1, padding: 8, background: dragOverTarget === 'properties' ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.02)',
                    borderRadius: 8, display: 'flex', flexDirection: 'column', overflowY: 'auto'
                  }}>
                    <div style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', marginBottom: 4 }}>BENİM ARAZİLERİM ({myCompleteSets}/{gameState?.winSets || 3} set)</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      
                      {/* Banka Kasa Column */}
                      <div 
                        ref={myBankRef}
                        data-drop-target="bank"
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: 4, 
                          flexShrink: 0,
                          width: 44,
                          minHeight: 64,
                          background: dragOverTarget === 'bank' ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.03)',
                          border: dragOverTarget === 'bank' ? '2.5px dashed #2ECC71' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 6,
                          padding: 2,
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: 8, color: '#2ECC71', fontWeight: 'bold' }}>🏦 {me.bankTotal}M</span>
                        <div style={{ position: 'relative', width: 38, height: 52 }}>
                          {me.bank?.slice(0, 5).map((c, i) => (
                            <div 
                              key={c.id} 
                              className="mini-card-wrapper"
                              style={{
                                position: 'absolute',
                                top: i * 4,
                                left: i * 2,
                                width: 32,
                                height: 48,
                                zIndex: i
                              }}
                            >
                              <div style={{
                                width: 32,
                                height: 48,
                                borderRadius: 4,
                                background: 'linear-gradient(135deg, #2ECC71, #196F3D)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                fontSize: 9,
                                color: '#fff',
                              }} className="mini-card-face">
                                {c.value}M
                              </div>
                              <div className="mini-card-hover-view">
                                <CardVisual card={c} small />
                              </div>
                            </div>
                          ))}
                          {(!me.bank || me.bank.length === 0) && (
                            <div style={{ width: 32, height: 48, borderRadius: 4, border: '1.2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#444' }}>BOŞ</div>
                          )}
                        </div>
                      </div>

                      {/* Araziler */}
                      {Object.entries(me.properties || {}).map(([color, cards]) => {
                        if (cards.length === 0) return null;
                        const info = COLOR_INFO[color] || { hex: '#aaa' };
                        const isComplete = isSetComplete(cards, color);
                        return (
                          <div 
                            key={color} 
                            style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              position: 'relative', 
                              width: 44, 
                              minHeight: 64,
                              background: isComplete ? `${info.hex}15` : 'transparent',
                              borderRadius: 4,
                              padding: 2,
                              border: isComplete ? `1px solid ${info.hex}` : 'none',
                              boxSizing: 'border-box'
                            }}
                          >
                            {cards.map((c, i) => (
                              <div 
                                key={c.id}
                                className="mini-card-wrapper"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isMyTurn && (c.isWild || c.isDual)) {
                                    handleFlip(c);
                                  } else {
                                    setModal({ type: 'viewCardDetails', card: c });
                                  }
                                }}
                                style={{
                                  marginTop: i > 0 ? -42 : 0,
                                  zIndex: i,
                                  position: 'relative',
                                  width: 38,
                                  height: 52
                                }}
                              >
                                <div style={{
                                  width: 38,
                                  height: 52,
                                  backgroundColor: '#FFFFFF',
                                  border: isComplete ? `1.5px solid ${info.hex}` : '1px solid rgba(0,0,0,0.15)',
                                  borderRadius: 4,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  overflow: 'hidden',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                  boxSizing: 'border-box',
                                  transition: 'opacity 0.1s',
                                  '--glow-color': info.hex
                                }} className={`mini-card-face ${isComplete ? 'complete-set-glow' : ''}`}>
                                  <div style={{ width: '100%', height: 8, background: c.isWild ? 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB)' : info.hex }} />
                                  <div style={{ fontSize: 8, fontWeight: 900, color: '#333', marginTop: 4, transform: 'scale(0.85)' }}>
                                    {c.isWild ? '★' : (c.value || '')}
                                  </div>
                                </div>
                                <div className="mini-card-hover-view">
                                  <CardVisual card={c} small />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {Object.entries(me.properties || {}).every(([_, cards]) => cards.length === 0) && (
                        <span style={{ color: '#555', fontSize: 10 }}>Henüz arazi yok</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Masaüstü (Regular) Görünüm */
            <div className="center-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px 4px' }}>
                <span style={{ fontSize: 11, color: '#aaa', fontWeight: 'bold', letterSpacing: 1 }}>📜 OYUN GÜNLÜĞÜ</span>
                <button 
                  onClick={() => setIsLogOpen(!isLogOpen)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 6,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 10,
                    padding: '3px 8px',
                    fontWeight: 'bold'
                  }}
                >
                  {isLogOpen ? 'Gizle ✕' : 'Göster 👁️'}
                </button>
              </div>
              {isLogOpen && (
                <div ref={logRef} className="game-log" style={{
                  flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 6,
                  maxHeight: '180px', margin: '0 10px 10px',
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
              )}

              {/* Ortak Masa Ortası Alanı (Central Play Area - Desktop) */}
              <div style={{ display: 'flex', gap: 24, padding: '12px 16px', background: 'rgba(0,0,0,0.18)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>🎴 DESTE ({gameState.deckCount})</span>
                  <div style={{ width: 68, height: 96, borderRadius: 6, border: '2px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                    {gameState.deckCount > 0 ? (
                      <div style={{ width: 60, height: 88, borderRadius: 5, background: 'linear-gradient(135deg, #1f4068, #162447)', border: '2px solid #FFD700', boxShadow: '0 2px 5px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }} title="Destedeki Kalan Kart Sayısı">
                        <span style={{ fontSize: 20 }}>🏠</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, color: '#444' }}>BOŞ</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>📤 SON OYNANAN</span>
                  <div style={{ width: 68, height: 96, borderRadius: 6, border: '2px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                    {gameState.discard?.length > 0 ? (
                      <div style={{ transform: 'scale(0.85)', cursor: 'pointer' }}
                        onClick={() => { setPreviewCard(gameState.discard[gameState.discard.length - 1]); setPreviewLocked(true); }}>
                        <CardVisual card={gameState.discard[gameState.discard.length - 1]} small />
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, color: '#444' }}>YOK</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Benim arazilerim (Desktop) */}
              <div data-drop-target="properties" style={{
                padding: 10, borderTop: '1px solid rgba(255,255,255,0.1)', minHeight: 120,
                background: dragOverTarget === 'properties' ? 'linear-gradient(to bottom, rgba(255,215,0,0.1), rgba(0,0,0,0.2))' : 'rgba(255,255,255,0.02)',
                transition: 'background 0.3s ease'
              }}>
                <div style={{ fontSize: 11, color: dragOverTarget === 'properties' ? '#FFD700' : '#666', fontWeight: 'bold', marginBottom: 6, transition: 'color 0.2s' }}>BENİM ARAZİLERİM ({myCompleteSets}/{gameState?.winSets || 3} set)</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  
                  {/* Banka Kasa Column (Desktop) */}
                  <div 
                    ref={myBankRef}
                    data-drop-target="bank"
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: 4, 
                      flexShrink: 0,
                      width: 44,
                      minHeight: 64,
                      background: dragOverTarget === 'bank' ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.03)',
                      border: dragOverTarget === 'bank' ? '2.5px dashed #2ECC71' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6,
                      padding: 2,
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: 8, color: '#2ECC71', fontWeight: 'bold' }}>🏦 {me.bankTotal}M</span>
                    <div style={{ position: 'relative', width: 38, height: 52 }}>
                      {me.bank?.slice(0, 5).map((c, i) => (
                        <div 
                          key={c.id} 
                          className="mini-card-wrapper"
                          style={{
                            position: 'absolute',
                            top: i * 4,
                            left: i * 2,
                            width: 32,
                            height: 48,
                            zIndex: i
                          }}
                        >
                          <div style={{
                            width: 32,
                            height: 48,
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #2ECC71, #196F3D)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: 9,
                            color: '#fff',
                          }} className="mini-card-face">
                            {c.value}M
                          </div>
                          <div className="mini-card-hover-view">
                            <CardVisual card={c} small />
                          </div>
                        </div>
                      ))}
                      {(!me.bank || me.bank.length === 0) && (
                        <div style={{ width: 32, height: 48, borderRadius: 4, border: '1.2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#444' }}>BOŞ</div>
                      )}
                    </div>
                  </div>

                  {/* Araziler (Desktop) */}
                  {Object.entries(me.properties || {}).map(([color, cards]) => {
                    if (cards.length === 0) return null;
                    const info = COLOR_INFO[color] || { hex: '#aaa' };
                    const isComplete = isSetComplete(cards, color);
                    return (
                      <div 
                        key={color} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          position: 'relative', 
                          width: 44, 
                          minHeight: 64,
                          background: isComplete ? `${info.hex}15` : 'transparent',
                          borderRadius: 4,
                          padding: 2,
                          border: isComplete ? `1px solid ${info.hex}` : 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {cards.map((c, i) => (
                          <div 
                            key={c.id}
                            className="mini-card-wrapper"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isMyTurn && (c.isWild || c.isDual)) {
                                handleFlip(c);
                              } else {
                                setModal({ type: 'viewCardDetails', card: c });
                              }
                            }}
                            style={{
                              marginTop: i > 0 ? -42 : 0,
                              zIndex: i,
                              position: 'relative',
                              width: 38,
                              height: 52
                            }}
                          >
                            <div style={{
                              width: 38,
                              height: 52,
                              backgroundColor: '#FFFFFF',
                              border: isComplete ? `1.5px solid ${info.hex}` : '1px solid rgba(0,0,0,0.15)',
                              borderRadius: 4,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              overflow: 'hidden',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              boxSizing: 'border-box',
                              transition: 'opacity 0.1s',
                              '--glow-color': info.hex
                            }} className={`mini-card-face ${isComplete ? 'complete-set-glow' : ''}`}>
                              <div style={{ width: '100%', height: 8, background: c.isWild ? 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB)' : info.hex }} />
                              <div style={{ fontSize: 8, fontWeight: 900, color: '#333', marginTop: 4, transform: 'scale(0.85)' }}>
                                {c.isWild ? '★' : (c.value || '')}
                              </div>
                            </div>
                            <div className="mini-card-hover-view">
                              <CardVisual card={c} small />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {Object.entries(me.properties || {}).every(([_, cards]) => cards.length === 0) && (
                    <span style={{ color: '#555', fontSize: 11 }}>Henüz arazi yok</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ALT: El kartları */}
        <div className="hand-area" style={{
          background: 'linear-gradient(to bottom, rgba(30,30,45,0.95), rgba(15,15,25,1))',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 16px 16px',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
          zIndex: 100
        }}>
          {/* Banka Kaldırıldı (Artık araziler yanında sütun olarak yer alıyor) */}

          {/* El kartları */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingRight: 4 }}>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 'bold' }}>🃏 ELİNDEKİ KARTLAR</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setHandHidden(!handHidden); sfxClick(); }} style={{ background: handHidden ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.1)', border: handHidden ? '1px solid rgba(46,204,113,0.5)' : '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontWeight: 'bold' }}>
                {handHidden ? '👁️ Kartları Göster' : '👁️‍🗨️ Eli Gizle'}
              </button>
              <button onClick={handleSortHand} style={{ background: 'rgba(52, 152, 219, 0.15)', border: '1px solid rgba(52, 152, 219, 0.5)', color: '#3498DB', padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>
                🔄 Otomatik Sırala
              </button>
            </div>
          </div>
          <div className="hand-blurred-container">
            {handHidden && (
              <div className="hand-overlay-peek" onClick={() => { setHandHidden(false); sfxClick(); }}>
                <span style={{ fontSize: 24, marginBottom: 4 }}>👁️‍🗨️</span>
                <span style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>El Kartlarını Göster</span>
                <span style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>Göster/Gizle butonuyla tekrar gizleyebilirsiniz</span>
              </div>
            )}
            <div
              className={handHidden ? 'hand-blurred' : ''}
              style={{
                display: 'flex', gap: isMobile ? 8 : 4, overflowX: 'auto',
                paddingBottom: isMobile ? 15 : 12, paddingTop: isMobile ? 0 : 15, paddingLeft: isMobile ? 0 : 20,
                alignItems: 'flex-end', listStyle: 'none', margin: 0
              }}
            >
              {localHand.map((card, idx) => {
                const mid = (localHand.length - 1) / 2;
                const rotateVal = isMobile ? 0 : (idx - mid) * 4.5;
                const translateVal = isMobile ? 0 : Math.abs(idx - mid) * 2.5;
                const isJSNActive = card.action === 'justsayno' && !!gameState?.myPendingChallenge;
                const cardComboClass = isJSNActive ? 'shield-glow' : getCardComboClass(card, localHand);
                const isCardDimmed = (!isMyTurn || isBlocked) && !discardMode && !isJSNActive;
                return (
                  <motion.div
                    key={card.id}
                    className={`stacked-card-wrapper ${selectedCard?.id === card.id ? 'selected-card' : ''} ${slapActive ? 'card-bounce-active' : ''}`}
                    drag={!isMobile && isMyTurn && !isBlocked && !discardMode} // Mobilde sürüklemeyi kapat, masaüstünde aktif
                    dragElastic={0.2}
                    dragSnapToOrigin={true} // Sürüklenip bırakılmazsa eski yerine yumuşakça döner
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={(e, info) => handleDragEnd(e, info, card)}
                    whileDrag={{ scale: 1.15, zIndex: 1000, cursor: 'grabbing', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                    style={{
                      marginLeft: idx > 0 ? (isMobile ? -25 : -20) : 0,
                      zIndex: selectedCard?.id === card.id ? 1000 : idx,
                      position: 'relative',
                      transformOrigin: 'bottom center',
                      transform: selectedCard?.id === card.id 
                        ? `scale(${isMobile ? 1.05 : 1.35}) translateY(${isMobile ? -15 : -35}px) rotate(0deg)`
                        : `rotate(${rotateVal}deg) translateY(${translateVal}px)`,
                      cursor: !isMobile && isMyTurn && !isBlocked && !discardMode ? 'grab' : 'default',
                      transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), z-index 0.2s'
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
                      dimmed={isCardDimmed}
                      onHover={null} // Kendi kartlarımızda önizlemeyi kapat
                      usable={!discardMode && (isCardUsable(card) || isJSNActive)}
                      comboClass={cardComboClass}
                    />

                    {/* Selected Card Overlay Buttons (Directly on top of the card) */}
                    <AnimatePresence>
                      {selectedCard?.id === card.id && isMyTurn && !isBlocked && !discardMode && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="card-overlay-buttons"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCard(null); // Clicking the overlay background cancels selection
                          }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(10, 10, 20, 0.88)',
                            backdropFilter: 'blur(6px)',
                            borderRadius: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 10,
                            zIndex: 10,
                            padding: 8
                          }}
                        >
                          {/* OYNA */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sfxClick();
                              handleCardAction(card);
                            }}
                            style={{
                              ...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'),
                              padding: '10px 16px',
                              fontSize: 12,
                              borderRadius: 20,
                              width: '85%',
                              boxShadow: '0 4px 10px rgba(230,126,34,0.3)',
                              minHeight: 'auto'
                            }}
                          >
                            🚀 Oyna
                          </button>

                          {/* BANKAYA KOY */}
                          {card.type !== 'property' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                sfxClick();
                                handlePlayCard(card, { asBankMoney: true });
                              }}
                              style={{
                                ...btnStyle('linear-gradient(135deg, #27AE60, #1E8449)'),
                                padding: '10px 16px',
                                fontSize: 12,
                                borderRadius: 20,
                                width: '85%',
                                boxShadow: '0 4px 10px rgba(46,204,113,0.3)',
                                minHeight: 'auto'
                              }}
                            >
                              💰 Banka
                            </button>
                          )}

                          {/* IPTAL/KAPAT */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sfxClick();
                              setSelectedCard(null);
                            }}
                            style={{
                              ...btnStyle('rgba(255,255,255,0.15)'),
                              border: '1px solid rgba(255,255,255,0.3)',
                              color: '#fff',
                              padding: '8px 12px',
                              fontSize: 12,
                              borderRadius: 20,
                              width: '85%',
                              minHeight: 'auto'
                            }}
                          >
                            ✕ Kapat
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center', minHeight: 40 }}>
            {isMyTurn && !discardMode && !isBlocked && (
              <>
                <div style={{ flex: 1 }} />
                {gameState.gambleZari && !me.hasGambledThisTurn && gameState.actionsLeft > 0 && (
                  <button onClick={handleRollGambleDice} style={{ ...btnStyle('linear-gradient(135deg, #16A085, #117864)'), padding: '10px 20px', boxShadow: '0 4px 10px rgba(22,160,133,0.4)', fontSize: 13 }}>
                    🎲 Zar At
                  </button>
                )}
                {gameState.canUndo && (
                  <button onClick={() => { sfxClick(); handleUndoMove(); }} style={{ ...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'), padding: '10px 20px', boxShadow: '0 4px 10px rgba(230,126,34,0.4)', fontSize: 13, marginRight: 8 }}>
                    ↩️ Geri Al
                  </button>
                )}
                <button onClick={() => { sfxClick(); handleEndTurn(); }} style={{ ...btnStyle('linear-gradient(135deg, #8E44AD, #5B2C6F)'), padding: '10px 24px', boxShadow: '0 4px 10px rgba(142,68,173,0.4)', fontSize: 13 }}>
                  🏁 Turu Bitir
                </button>
              </>
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

        {/* ---- SOHBET (CHAT) PENCERESİ ---- */}
        <div style={{ position: 'fixed', bottom: isMobile ? 60 : 20, right: 20, zIndex: 1500, width: isMobile ? 280 : 320, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pointerEvents: 'none' }}>


          <AnimatePresence>
            {isChatOpen && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                style={{ background: 'rgba(20, 20, 30, 0.95)', pointerEvents: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 10, width: '100%', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 'bold', color: '#FFD700' }}>Oda Sohbeti</span>
                  <button onClick={() => setIsChatOpen(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ flex: 1, maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4, marginBottom: 8 }}>
                  {chatMessages.length === 0 && <div style={{ color: '#666', fontSize: 11, textAlign: 'center', margin: 'auto' }}>Sohbete ilk mesajı sen gönder...</div>}
                  {chatMessages.map(msg => (
                    <div key={msg.id} style={{ alignSelf: msg.senderId === playerId ? 'flex-end' : 'flex-start', background: msg.senderId === playerId ? 'rgba(52, 152, 219, 0.2)' : 'rgba(255,255,255,0.1)', border: `1px solid ${msg.senderId === playerId ? 'rgba(52,152,219,0.5)' : 'rgba(255,255,255,0.1)'}`, padding: '6px 10px', borderRadius: 12, borderBottomRightRadius: msg.senderId === playerId ? 2 : 12, borderBottomLeftRadius: msg.senderId === playerId ? 12 : 2, maxWidth: '85%' }}>
                      <div style={{ fontSize: 9, color: msg.senderId === playerId ? '#3498DB' : '#aaa', marginBottom: 2 }}>{msg.senderName}</div>
                      <div style={{ fontSize: 12, wordBreak: 'break-word' }}>{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Hazır Replikler (Taunts) */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8, justifyContent: 'center' }}>
                  {['Paraları hazırla! 💸', 'Yemezler! 🛡️', 'Şansına küs! 🎲', 'Anlaşma Bozuldu! 💣', 'İyi oyundu! 🤝'].map(txt => (
                    <button key={txt} type="button" onClick={() => { socket?.emit('sendChatMessage', { text: txt }); sfxClick(); }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 12, padding: '4px 8px', fontSize: 9, cursor: 'pointer', fontWeight: 600 }}>
                      {txt}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 8 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Bir şeyler yaz..." style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, color: '#fff', fontSize: 12, outline: 'none' }} maxLength={120} />
                  <button type="submit" style={{ ...btnStyle('#2ECC71'), borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
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
