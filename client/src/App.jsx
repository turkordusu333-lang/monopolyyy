import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence, useIsPresent } from 'framer-motion';
import './App.css';
import {
  isSoundEnabled, setSoundEnabled, setLocalPlayerId, sfxCardPlay, sfxCardDraw, sfxWhoosh, sfxCoin, sfxError, sfxYourTurn, sfxTurnEnded, sfxAlert, sfxPaymentDue, sfxBuild, sfxClick,
  sfxTick, playBGM, stopBGM, setBgmVolume, setBgmTension, sfxLaugh, sfxAngry, sfxChaChing, sfxGlassBreak, sfxPartyHorn,
  sfxActionDealbreaker, sfxActionJustSayNo, sfxActionCounterJustSayNo, sfxActionSlyDeal, sfxActionForcedDeal, sfxActionDebtCollector, sfxActionBirthday, sfxActionPassGoTwoDraw,
  sfxRentCardPlayed, sfxRentPaymentDue,
  sfxBankDeposit1M, sfxBankDeposit2M, sfxBankDeposit3M, sfxBankDeposit4M, sfxBankDeposit5M, sfxBankDeposit10M,
  sfxPropertyPlayed, sfxJokerPropertyPlayed, sfxStreetPropertyPlayed, sfxTableSlap, sfxShuffle,
  sfxWin, sfxLobbyJoin, sfxGameStart, sfxTradeProposed, sfxTradeAccepted, sfxTradeRejected,
  sfxDiceRoll, sfxCopied, sfxChatSent, sfxRageQuit, sfxUndo, sfxDoubleRent, sfxHouse, sfxHotel,
  sfxDisconnect, sfxReconnect,
  sfxFire,
  sfxJackpot, sfxWompWomp, sfxCricket, sfxSwordClash, sfxCrumple, sfxHeartbeat, sfxBlackMarket, sfxCoinsCling, sfxVaultClose, sfxCry, sfxShock, sfxClap,
  setSfxVolume, getSfxVolume, stopAllSFX
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
const SERVER_URL = import.meta.env.VITE_SERVER_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);


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

const ACTION_NAMES = { rent: 'Kira', birthday: 'Doğum Günüm!', debtcollector: 'Borç Tahsildarı', slydeal: 'Sinsi Anlaşma', forceddeal: 'Zorunlu Anlaşma', dealbreaker: 'Anlaşma Bozucu', thief_squirrel: 'Hırsız Sincap' };

// ── TRANSLATIONS DICTIONARY ──
const TRANSLATIONS = {
  tr: {
    username: "Kullanıcı Adı",
    login: "Giriş Yap",
    changeUsername: "Kullanıcı Adı Değiştir",
    newUsername: "Yeni Kullanıcı Adı",
    change: "Değiştir",
    pleaseEnterUsername: "Lütfen kullanıcı adı girin",
    lobbyTitle: "Kart Oyunu Lobisi",
    lobbySub: "Oda oluşturma, aktif odalara katılma veya lobi ayarları.",
    roomListTab: "ODA LİSTESİ",
    createRoomTab: "ODA OLUŞTUR",
    myRoomTab: "ODAM",
    error: "Hata",
    roomHost: "Oda Kurucusu",
    roomSettings: "Oda Ayarları",
    allSettings: "Tüm Ayarlar",
    getReady: "Hazır Ol!",
    readyStatus: "Hazır Durumu",
    startGame: "Oyunu Başlat",
    waitingPlayers: "Bekleyen Oyuncular",
    playersCount: "Oyuncu",
    cancel: "İptal",
    confirm: "Onayla",
    close: "Kapat",
    leaveRoom: "Odadan Ayrıl",
    createRoomBtn: "Oda Kur",
    quickJoin: "Hızlı Katıl",
    noActiveRooms: "Aktif oda yok, yeni bir oda oluşturabilirsiniz.",
    loadingStats: "Kullanıcı istatistikleri yükleniyor...",
    points: "Puan:",
    wins: "Zaferler:",
    turnTimer: "Tur Süresi",
    fastChallengeTimer: "Hızlı İtiraz Süresi",
    setsToWin: "Kazanılacak Set Sayısı",
    maxPlayers: "Maksimum Oyuncu",
    handLimit: "El Kart Sınırı",
    thiefSquirrel: "Hırsız Sincap Kartı",
    on: "Açık",
    off: "Kapalı",
    ready: "Hazır",
    notReady: "Hazır Değil",
    remainingTurnTime: "Kalan Tur Süresi:",
    seconds: "saniye",
    yourTurn: "SIRA SENDE",
    turnOf: "SIRA: ",
    paused: "DURDURULDU",
    history: "Geçmiş",
    discard: "Iskarta",
    deck: "Deste",
    table3d: "3D Masa",
    blackMarket: "Karaborsa",
    endGame: "Oyunu Bitir",
    menu: "⚙️ MENÜ",
    sound: "Ses",
    music: "Müzik",
    sfx: "Ses Efektleri",
    roomLabel: "Oda:",
    showMyHand: "👁️ KARTLARIM",
    hideMyHand: "👁️ ELİ GİZLE",
    endTurn: "Turunu Bitir",
    drawingCard: "Kart Çekiliyor...",
    timeLimitReached: "Süre sınırına ulaşıldı!",
    myProperties: "BENİM ARAZİLERİM",
    myBank: "BENİM KASAM",
    sets: "set",
    noPropertiesYet: "henüz arazi yok",
    empty: "BOŞ",
    none: "YOK",
    showTopbar: "▼ ÜST BARI GÖSTER",
    hideTopbar: "Barı Gizle",
    payUp: "Ödeme Yap",
    selectPayCards: "Lütfen borcunuzu ödemek için kart seçin.",
    remainingDebt: "Kalan Borç:",
    autoSelect: "Otomatik Seç",
    completePayment: "Ödemeyi Tamamla",
    flipProperty: "Mülkü Çevir",
    whichColorFlip: "Hangi renge çevirmek istersiniz?",
    deckStats: "🎴 Deste Kalan Kart İstatistikleri",
    unknownCardPool: "Bilinmeyen Kart Havuzu",
    unknownCardPoolDesc: "Bu panel; elinizdeki, ortadaki ve ıskartadaki kartları hesaplayarak desteden çekilme ihtimallerini gösterir.",
    bankVault: "Banka Kasası",
    propertyCards: "Mülk Kartları",
    selectSlyTarget: "Sinsi Anlaşma Hedefi Seç",
    selectForcedTargets: "Zorunlu Anlaşma Hedefleri Seç",
    selectYourProp: "Kendi mülkünü seç:",
    selectTheirProp: "Rakip mülkünü seç:",
    selected: "Seçilenler:",
    select: "Seç",
    clear: "Temizle",
    challenge: "İtiraz Et!",
    dontChallenge: "İtiraz Etme (Öde)",
    challengeWindow: "Rakibin Hamlesine İtiraz Süresi",
    cardDetails: "Kart Detayları",
    bankValue: "Banka Değeri:",
    propertyColor: "Mülk Rengi:",
    discardCards: "Kartları At",
    handLimitWarning: "Elinizde en fazla 7 kart olmalıdır.",
    handLimitAction: "El limiti aşıldı! Atılacak kartları seçin.",
    rageQuit: "Öfke Patlaması (Rage Quit)",
    soundOn: "Mute",
    soundOff: "Unmute",
    details: "Detay",
    activeLobbies: "AKTİF LOBİLER",
    noRoomsFound: "Oda bulunamadı.",
    roomCode: "Oda Kodu",
    roomStatus: "Oda Durumu",
    roomAction: "Aksiyon",
    roomPublic: "Herkese Açık",
    roomPrivate: "Özel (Sadece Davet)",
    join: "Katıl",
    createRoomHeader: "Yeni Oyun Odası Oluştur",
    roomRules: "Oda Kuralları & Limitleri",
    lobbySettings: "Lobi & Oyuncu Ayarları",
  },
  en: {
    username: "Username",
    login: "Log In",
    changeUsername: "Change Username",
    newUsername: "New Username",
    change: "Change",
    pleaseEnterUsername: "Please enter username",
    lobbyTitle: "Card Game Lobby",
    lobbySub: "Create a room, join active rooms, or adjust lobby settings.",
    roomListTab: "ROOM LIST",
    createRoomTab: "CREATE ROOM",
    myRoomTab: "MY ROOM",
    error: "Error",
    roomHost: "Room Host",
    roomSettings: "Room Settings",
    allSettings: "All Settings",
    getReady: "Ready Up!",
    readyStatus: "Ready Status",
    startGame: "Start Game",
    waitingPlayers: "Waiting Players",
    playersCount: "Players",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    leaveRoom: "Leave Room",
    createRoomBtn: "Create Room",
    quickJoin: "Quick Join",
    noActiveRooms: "No active rooms, feel free to create one.",
    loadingStats: "Loading player statistics...",
    points: "Points:",
    wins: "Wins:",
    turnTimer: "Turn Timer",
    fastChallengeTimer: "Fast Challenge",
    setsToWin: "Sets to Win",
    maxPlayers: "Max Players",
    handLimit: "Hand Limit",
    thiefSquirrel: "Thief Squirrel Card",
    on: "On",
    off: "Off",
    ready: "Ready",
    notReady: "Not Ready",
    remainingTurnTime: "Remaining Time:",
    seconds: "seconds",
    yourTurn: "YOUR TURN",
    turnOf: "TURN: ",
    paused: "PAUSED",
    history: "History",
    discard: "Discard",
    deck: "Deck",
    table3d: "3D Table",
    blackMarket: "Black Market",
    endGame: "End Game",
    menu: "⚙️ MENU",
    sound: "Sound",
    music: "Music",
    sfx: "SFX",
    roomLabel: "Room:",
    showMyHand: "👁️ MY CARDS",
    hideMyHand: "👁️ HIDE HAND",
    endTurn: "End Turn",
    drawingCard: "Drawing...",
    timeLimitReached: "Time limit reached!",
    myProperties: "MY PROPERTIES",
    myBank: "MY BANK",
    sets: "sets",
    noPropertiesYet: "no properties yet",
    empty: "EMPTY",
    none: "NONE",
    showTopbar: "▼ SHOW TOPBAR",
    hideTopbar: "Hide Bar",
    payUp: "Pay Debt",
    selectPayCards: "Please select cards to pay your debt.",
    remainingDebt: "Remaining Debt:",
    autoSelect: "Auto Select",
    completePayment: "Pay Debt",
    flipProperty: "Flip Property",
    whichColorFlip: "Which color do you want to flip to?",
    deckStats: "🎴 Deck Remaining Card Statistics",
    unknownCardPool: "Unknown Card Pool",
    unknownCardPoolDesc: "This panel calculates remaining cards in the deck by subtracting visible cards from hands, bank vault, and discard pile.",
    bankVault: "Bank Vault",
    propertyCards: "Property Cards",
    selectSlyTarget: "Select Sly Deal Target",
    selectForcedTargets: "Select Forced Deal Targets",
    selectYourProp: "Select your property:",
    selectTheirProp: "Select opponent's property:",
    selected: "Selected:",
    select: "Select",
    clear: "Clear",
    challenge: "Challenge!",
    dontChallenge: "Pay (No Challenge)",
    challengeWindow: "Opponent Action Challenge Window",
    cardDetails: "Card Details",
    bankValue: "Bank Value:",
    propertyColor: "Property Color:",
    discardCards: "Discard Cards",
    handLimitWarning: "You must have at most 7 cards in your hand.",
    handLimitAction: "Hand limit exceeded! Select cards to discard.",
    rageQuit: "Rage Quit",
    soundOn: "Mute",
    soundOff: "Unmute",
    details: "Details",
    activeLobbies: "ACTIVE LOBBIES",
    noRoomsFound: "No active rooms.",
    roomCode: "Room Code",
    roomStatus: "Status",
    roomAction: "Action",
    roomPublic: "Public",
    roomPrivate: "Private (Invite Only)",
    join: "Join",
    createRoomHeader: "Create New Game Room",
    roomRules: "Room Rules & Limits",
    lobbySettings: "Lobby & User Settings",
  }
};

const getColorName = (color, lang) => {
  if (lang === 'en') {
    const enNames = {
      brown: 'Brown',
      lightblue: 'Light Blue',
      pink: 'Pink',
      orange: 'Orange',
      red: 'Red',
      yellow: 'Yellow',
      green: 'Green',
      blue: 'Dark Blue',
      railroad: 'Railroad',
      utility: 'Utility'
    };
    return enNames[color] || color;
  }
  return COLOR_INFO[color]?.name || color;
};

const translateCard = (card, lang) => {
  if (!card) return { name: '', description: '' };
  if (lang !== 'en') {
    return { name: card.name, description: card.description || '' };
  }

  let name = card.name;
  let description = card.description || '';

  if (card.type === 'money') {
    name = `${card.value}M`;
    description = `Bank value: ${card.value}M`;
  } else if (card.type === 'property') {
    if (card.isWild) {
      name = 'WILD CARD';
      description = 'Can be used as any property color group. Cannot be put in bank vault.';
    } else if (card.isDual) {
      const colorsTranslated = card.colors.map(c => {
        const names = { brown: 'Brown', lightblue: 'Light Blue', pink: 'Pink', orange: 'Orange', red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Dark Blue', railroad: 'Railroad', utility: 'Utility' };
        return names[c] || c;
      });
      name = colorsTranslated.join(' / ');
      description = `Dual property card. Tap/Click to flip active color between: ${colorsTranslated.join(', ')}`;
    } else {
      const propertyEnNames = {
        'KASIMPAŞA': 'KASIMPASA',
        'DOLAPDERE': 'DOLAPDERE',
        'SULTANAHMET': 'SULTANAHMET',
        'KARAKÖY': 'KARAKOY',
        'SİRKECİ': 'SIRKECI',
        'BEY OĞLU': 'BEYOGLU',
        'TAKSİM': 'TAKSIM',
        'BEŞİKTAŞ': 'BESIKTAS',
        'HARBİYE': 'HARBIYE',
        'MECİDİYEKÖY': 'MECIDIYEKOY',
        'ŞİŞLİ': 'SISLI',
        'ERENKÖY': 'ERENKOY',
        'CADDEBOSTAN': 'CADDEBOSTAN',
        'BOSTANCI': 'BOSTANCI',
        'TEŞVİKİYE': 'TESVIKIYE',
        'MAÇKA': 'MACKA',
        'NİŞANTAŞI': 'NISANTASI',
        'BEBEK': 'BEBEK',
        'LEVENT': 'LEVENT',
        'ETİLER': 'ETILER',
        'YENİKÖY': 'YENIKOY',
        'TARABYA': 'TARABYA',
        'KADIKÖY VAPUR İSKELESİ': 'KADIKOY FERRY TERMINAL',
        'KABATAŞ VAPUR İSKELESİ': 'KABATAS FERRY TERMINAL',
        'HAYDARPAŞA TREN İSTASYONU': 'HAYDARPASA TRAIN STATION',
        'SİRKECİ TREN İSTASYONU': 'SIRKECI TRAIN STATION',
        'ELEKTRİK İDARESİ': 'ELECTRIC COMPANY',
        'SU İDARESİ': 'WATER WORKS'
      };
      name = propertyEnNames[card.name] || card.name;
      description = `Property Card. Rent for full set: ${COLOR_INFO[card.color]?.rents?.map(r => r + 'M').join(', ') || ''}`;
    }
  } else if (card.type === 'action') {
    switch (card.action) {
      case 'passgo':
        name = 'PASS GO';
        description = 'Draw 2 extra cards from the deck.';
        break;
      case 'dealbreaker':
        name = 'DEAL BREAKER';
        description = 'Steal a completed property set from an opponent, including any House/Hotel on it.';
        break;
      case 'justsayno':
        name = 'JUST SAY NO';
        description = 'Block any action card played against you.';
        break;
      case 'slydeal':
        name = 'SLY DEAL';
        description = 'Steal a single property card from an opponent (cannot be part of a completed set).';
        break;
      case 'forceddeal':
        name = 'FORCED DEAL';
        description = 'Swap one of your properties with an opponent\'s property (cannot be part of a completed set).';
        break;
      case 'debtcollector':
        name = 'DEBT COLLECTOR';
        description = 'Demand 5M from any player.';
        break;
      case 'birthday':
        name = 'ITS MY BIRTHDAY';
        description = 'Demand 2M from every player.';
        break;
      case 'house':
        name = 'HOUSE';
        description = 'Add to any completed property set (except Railroads & Utilities) to increase rent by 3M.';
        break;
      case 'hotel':
        name = 'HOTEL';
        description = 'Add to a property set that already has a House to increase rent by 4M. House stays.';
        break;
      case 'doublerent':
        name = 'DOUBLE RENT';
        description = 'Double the rent amount. Must be played together with a Rent card.';
        break;
      case 'thief_squirrel':
        name = 'THIEF SQUIRREL';
        description = 'Steal a random card from an opponent\'s hand.';
        break;
      case 'rent':
        name = 'RENT';
        if (card.colors && Array.isArray(card.colors)) {
          const colorNames = card.colors.map(c => {
            const names = { brown: 'Brown', lightblue: 'Light Blue', pink: 'Pink', orange: 'Orange', red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Dark Blue', railroad: 'Railroad', utility: 'Utility' };
            return names[c] || c;
          });
          description = `Collect rent for ${colorNames.join('/')} from all players.`;
        } else {
          description = 'Collect rent for active colors from all players.';
        }
        break;
      case 'rent_all':
        name = 'ANY RENT';
        description = 'Collect rent for a color of your choice from any single player.';
        break;
      default:
        break;
    }
  }

  return { name, description };
};

const translateLog = (logText, lang) => {
  if (lang !== 'en') return logText;
  if (!logText) return '';

  let t = logText;

  t = t.replace(/Oyun başladı!\s*🎲\s*İlk oyuncu:\s*(.+)/i, 'Game started! 🎲 First player: $1');
  t = t.replace(/(.+) desteden (\d+) yeni kart çekti\.\s*\(Deste:\s*(\d+)\)/i, '$1 drew $2 cards from the deck. (Deck: $3)');
  t = t.replace(/⚠️\s*DİKKAT:\s*Destede sadece (\d+) kart kaldı!/i, '⚠️ ATTENTION: Only $1 cards left in the deck!');
  t = t.replace(/(.+) elindeki (.+) (\d+)M olarak kasaya koydu\.\s*\(Güncel Kasa:\s*(\d+)M\)/i, (match, player, type, val, currentBank) => {
    return `${player} deposited ${val}M into the bank vault. (Current Vault: ${currentBank}M)`;
  });
  t = t.replace(/(.+),\s*(.+) grubuna "(.+)" arazisini ekledi\./i, (match, player, color, prop) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} added property "${prop}" to ${enColor} group.`;
  });
  t = t.replace(/(.+) "(.+)" arazisini (.+) rengine çevirdi\./i, (match, player, prop, color) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} flipped property "${prop}" to ${enColor}.`;
  });
  t = t.replace(/(.+) "Geç Go!" oynadı, 2 kart çekti/i, '$1 played "Pass Go" and drew 2 cards');
  t = t.replace(/(.+) "Doğum Günüm!" oynadı! Herkes 2M ödeyecek\s*\(itiraz süresi\)/i, '$1 played "It\'s My Birthday!"! Everyone pays 2M (challenge window)');
  t = t.replace(/(.+) "Borç Tahsildarı" oynadı, (.+)'dan 5M istiyor\s*\(itiraz süresi\)/i, '$1 played "Debt Collector", demanding 5M from $2 (challenge window)');
  t = t.replace(/(.+) "Hırsız Sincap" oynadı!\s*(.+)'ın elinden rastgele bir kart çalma girişimi\s*\(itiraz süresi\)/i, '$1 played "Thief Squirrel"! Attempting to steal a card from $2 (challenge window)');
  t = t.replace(/(.+) "Joker Kira" oynadı!\s*(.+) hedef seçildi ve (\d+)M ödeyecek\s*\(itiraz süresi\)/i, '$1 played "Wild Rent"! $2 is targeted and must pay $3M (challenge window)');
  t = t.replace(/(.+),\s*(.+) kirası topluyor\s*(\(2X\))?\s*\(itiraz süresi\)/i, (match, player, color, double) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} is collecting ${enColor} rent ${double ? ' (2X)' : ''} (challenge window)`;
  });
  t = t.replace(/(.+) "Sinsi Anlaşma" kullandı!\s*(.+)'ın "(.+)" arazisini çalmak istiyor\s*\(itiraz süresi\)/i, '$1 played "Sly Deal", targeting $2\'s property "$3" (challenge window)');
  t = t.replace(/(.+) zorunlu takas başlattı!\s*(.+) ile arazi değiş-tokuşu istiyor\./i, '$1 initiated a Forced Deal, requesting a trade with $2.');
  t = t.replace(/(.+) "Anlaşma Bozucu" oynadı!\s*(.+)'ın tamamlanmış (.+) setini çalmak istiyor\s*\(itiraz süresi\)/i, (match, player, target, color) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} played "Deal Breaker", targeting $2\'s completed ${enColor} set (challenge window)`;
  });
  t = t.replace(/(.+) muazzam bir yatırım yaptı!\s*(.+) setine bir (.+) kartı ekledi\./i, (match, player, color, building) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility'
    }[color.toLowerCase()] || color;
    const enBuilding = building === 'ev' ? 'House' : 'Hotel';
    return `${player} made a major investment! Added a ${enBuilding} to their completed ${enColor} set.`;
  });
  t = t.replace(/(.+) "Reddet!" oynadı!\s*Hamle geçersiz/i, '$1 played "Just Say No!" Action blocked.');
  t = t.replace(/(.+) "Reddet!" oynadı!\s*Hamle yine geçerli/i, '$1 played "Just Say No!" Action is still valid.');
  t = t.replace(/(.+) "(.+)" hamlesini Reddet! ile durdurdu/i, '$1 blocked "$2" action with Just Say No!');
  t = t.replace(/(.+) "(.+)" arazisini (.+)'dan aldı!/i, '$1 took property "$2" from $3!');
  t = t.replace(/(.+),\s*"(.+)" ile\s*(.+)'ın "(.+)" arazisini takas etti!/i, '$1 swapped "$2" with $3\'s property "$4"!');
  t = t.replace(/(.+)\s*(.+)'ın\s*(.+) setini çaldı!/i, (match, player, target, color) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} stole ${target}'s completed ${enColor} set!`;
  });
  t = t.replace(/(.+),\s*(.+)'ın elinden rastgele bir kart çaldı!/i, '$1 stole a random card from $2\'s hand!');
  t = t.replace(/(.+),\s*(.+)'ın elinden kart çalmaya çalıştı ama hedef oyuncunun eli boş çıktı!/i, '$1 tried to steal from $2, but target hand was empty!');
  t = t.replace(/(.+) ödeyecek hiçbir şeyi yok,\s*(.+) bu sefer boş döndü/i, '$1 has nothing to pay, $2 returns empty-handed');
  t = t.replace(/\[BOT\]\s*(.+) borcunu ödeyemedi,\s*tüm varlıklarına el konuldu!/i, '[BOT] $1 could not pay debt, all assets seized!');
  t = t.replace(/\[BOT\]\s*(.+) otomatik olarak (\d+)M ödedi\./i, '[BOT] $1 automatically paid $2M.');
  t = t.replace(/(.+),\s*(.+)'a (\d+)M ödedi\.\s*\(Kalan Kasası:\s*(\d+)M\)/i, '$1 paid $3M to $2. (Remaining Vault: $4M)');
  t = t.replace(/(.+),\s*(.+) ile barışçıl bir takas yapmak istiyor!\s*🤝/i, '$1 wants to trade with $2! 🤝');
  t = t.replace(/(.+),\s*takas teklifini reddetti\.\s*❌/i, '$1 rejected the trade offer. ❌');
  t = t.replace(/(.+) ve\s*(.+) takas yaptı!\s*🤝/i, '$1 and $2 completed a trade! 🤝');
  t = t.replace(/(.+),\s*(.+) kartını atarak elini düzenledi\./i, '$1 discarded "$2" to adjust hand.');
  t = t.replace(/(.+) pas geçti, sıra\s*(.+)'ye geçti\./i, '$1 passed, turn goes to $2.');
  t = t.replace(/(.+) pas geçti, sıra\s*(.+)'a geçti\./i, '$1 passed, turn goes to $2.');
  t = t.replace(/(.+) pas geçti, sıra\s*(.+)'e geçti\./i, '$1 passed, turn goes to $2.');
  t = t.replace(/(.+) pas geçti, sıra\s*(.+)'u geçti\./i, '$1 passed, turn goes to $2.');
  t = t.replace(/(.+) pas geçti, sıra\s*(.+)'i geçti\./i, '$1 passed, turn goes to $2.');
  t = t.replace(/(.+) süre sınırı nedeniyle elindeki kartları ıskartaya attı ve sırasını bitirdi\./i, '$1 timed out, discarded cards to hand limit, and ended turn.');
  t = t.replace(/(.+) zaman aşımına uğradı, sıra\s*(.+)'ye geçti\./i, '$1 timed out, turn goes to $2.');
  t = t.replace(/(.+) zaman aşımına uğradı, sıra\s*(.+)'a geçti\./i, '$1 timed out, turn goes to $2.');
  t = t.replace(/(.+) zaman aşımına uğradı, sıra\s*(.+)'e geçti\./i, '$1 timed out, turn goes to $2.');
  t = t.replace(/(.+) zaman aşımına uğradı, sıra\s*(.+)'u geçti\./i, '$1 timed out, turn goes to $2.');
  t = t.replace(/(.+) zaman aşımına uğradı, sıra\s*(.+)'i geçti\./i, '$1 timed out, turn goes to $2.');
  t = t.replace(/(.+) oyuna geri döndü, bağlantı sağlandı\./i, '$1 reconnected to the game.');
  t = t.replace(/(.+) oyundan çıktı veya bağlantısı koptu\./i, '$1 disconnected or left the game.');
  t = t.replace(/itiraz süresi doldu/i, 'challenge window expired');
  t = t.replace(/itiraz edilmedi, hamle uygulanıyor/i, 'no challenge, applying action');

  return t;
};

// ---- GELİŞMİŞ İPUCU ÜRETİCİ ----
const getDetailedCardTip = (card, lang) => {
  if (lang === 'en') {
    if (card.type === 'money') return `Instantly adds ${card.value}M cash to your bank vault. Keeping money in your vault is always good to avoid losing properties for payments.`;
    if (card.type === 'property') {
      if (card.isWild) return 'Very Powerful! You can change it to any color to quickly complete missing sets.';
      if (card.isDual) return 'Flexible dual-color card. You can flip its active color to complete different sets depending on the state of the board.';
      const cName = { brown: 'Brown', lightblue: 'Light Blue', pink: 'Pink', orange: 'Orange', red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Dark Blue', railroad: 'Railroad', utility: 'Utility' }[card.activeColor || card.color] || card.color;
      return `Play this property card on the board. You need ${SET_SIZES[card.activeColor || card.color] || 3} cards to complete the ${cName} set. Rent increases massively when the set is complete.`;
    }
    if (card.type === 'action') {
      const tips = {
        passgo: 'Draw 2 extra cards from the deck for free. Be careful not to exceed the hand limit of 7 cards by the end of your turn.',
        dealbreaker: 'THE MOST BRUTAL CARD IN THE GAME! Steal an opponent\'s completed set (including House/Hotel) in one move.',
        slydeal: 'Slyly steal a single property card from an opponent (cannot be part of a completed set).',
        forceddeal: 'Force-swap one of your useless properties with a valuable property of an opponent (cannot be part of a completed set).',
        debtcollector: 'Hurt an opponent of your choice. They must pay you 5M cash instantly.',
        birthday: 'It\'s your birthday! EVERY player on the table must give you 2M cash as a gift.',
        justsayno: 'The ultimate defense card! Blocks any theft, rent, or swap targeting you. Can also be deposited in the bank for 4M.',
        rent: 'Collect rent for your active properties from all players. The more properties in the set, the more they pay.',
        doublerent: 'Play together with any Rent card to double the rent value. Perfect for bankrupting opponents!',
        house: 'Build on any completed set to permanently increase rent value by 3M.',
        hotel: 'Build on a set that already has a House to permanently increase rent by an additional 4M. The House stays.',
        thief_squirrel: 'Cute but deadly! Steal a random card from an opponent\'s hand and add it to yours.'
      };
      return tips[card.action] || 'Use this action card for strategic advantage, or deposit it into your bank.';
    }
    return 'Use this card strategically, or put it in the bank.';
  }

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
      hotel: 'Zaten Ev dikilmiş bir setine inşa ederek kirayı Ev\'in üzerine kalıcı olarak +4M daha artırır.',
      thief_squirrel: 'Şirin ama tehlikeli! Seçtiğin bir rakibin elinden rastgele bir kart çalıp kendi eline eklersin.'
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

// ---- ANIMATED BANK BALANCE TICKER ----
const BankTicker = ({ value }) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  React.useEffect(() => {
    let start = displayValue;
    const end = value;
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = range > 0 ? 1 : -1;
    const stepTime = Math.abs(Math.floor(180 / range)) || 15;
    const timer = setInterval(() => {
      current += increment;
      setDisplayValue(current);
      if (current === end) {
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{displayValue}M</span>;
};

// ---- İÇ İÇE GEÇMİŞ (YELPAZE) ARAZİ GÖRÜNÜMÜ ----
const FannedPropertySet = ({ color, cards, buildings, isOwn, onFlip, onHoverCard }) => {
  const lang = localStorage.getItem('md_lang') || 'tr';
  const infoRaw = COLOR_INFO[color] || { hex: '#fff', name: color };
  const info = {
    ...infoRaw,
    name: getColorName(color, lang)
  };
  const isComplete = isSetComplete(cards, color);

  // Kira hesabı (bileşen içinde)
  const setSize = SET_SIZES[color] || 2;
  const rentBase = info.rents ? info.rents[Math.min(cards.length, info.rents.length) - 1] || 0 : 0;
  const hasHouse = buildings?.[color]?.houses > 0;
  const hasHotel = buildings?.[color]?.hotel;
  const rentBonus = isComplete ? ((hasHouse ? 3 * buildings[color].houses : 0) + (hasHotel ? 4 : 0)) : 0;
  const totalRent = isComplete ? rentBase + rentBonus : rentBase;

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
      {/* Başlık + set ilerleme */}
      <div style={{ fontSize: 11, color: info.light || '#fff', fontWeight: 900, marginBottom: 4, textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.8)', textAlign: 'center' }}>
        {info.name} {isComplete && '★'}
      </div>
      <div style={{ fontSize: 10, color: isComplete ? '#FFD700' : 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 10, textAlign: 'center' }}>
        {cards.length}/{setSize} {lang === 'en' ? 'cards' : 'kart'}
        {isComplete && (
          <span style={{ marginLeft: 6, background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: 4, padding: '1px 5px', fontSize: 10, color: '#FFD700' }}>
            {lang === 'en' ? 'Rent:' : 'Kira:'} {totalRent}M
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 10px', height: 120, alignItems: 'flex-start' }}>
        {cards.map((c, i) => (
          <div
            key={c.id}
            onMouseEnter={() => onHoverCard && onHoverCard(c)}
            onMouseLeave={() => onHoverCard && onHoverCard(null)}
            className="fanned-card-wrapper"
            style={{
              marginLeft: i > 0 ? -25 : 0,
              zIndex: i,
              position: 'relative',
              transform: `rotate(${(i - (cards.length - 1) / 2) * 8}deg) translateY(${Math.abs(i - (cards.length - 1) / 2) * 4 - ((c.isWild || c.isDual) ? 15 : 0)}px)`,
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
            <CardVisual card={c} small lang={lang} />
          </div>
        ))}
      </div>

      {/* Ev / Otel gösterimi */}
      {(hasHouse || hasHotel) && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {hasHouse && (
            <span style={{
              background: 'linear-gradient(135deg, #27AE60, #1a8a4a)',
              padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 900,
              boxShadow: '0 2px 8px rgba(39,174,96,0.5)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: 3
            }}>🏠 Ev +{3 * buildings[color].houses}M</span>
          )}
          {hasHotel && (
            <span style={{
              background: 'linear-gradient(135deg, #C0392B, #922b21)',
              padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 900,
              boxShadow: '0 2px 8px rgba(192,57,43,0.5)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', gap: 3
            }}>🏨 Otel +4M</span>
          )}
        </div>
      )}

      {/* Kira özeti (tam set yoksa) */}
      {!isComplete && cards.length > 0 && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 6, textAlign: 'center' }}>
          Şu an kira: {rentBase}M
        </div>
      )}
    </div>
  );
};

// ---- MAIN APP ----
export default function App() {
  const [lang, setLang] = useState(localStorage.getItem('md_lang') || 'tr');
  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['tr']?.[key] || key;

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
  const [showTurnFlash, setShowTurnFlash] = useState(false);
  const [showShield, setShowShield] = useState(false);
  const [showSparks, setShowSparks] = useState(false);
  const [showScratch, setShowScratch] = useState(false);
  const [profilePlayer, setProfilePlayer] = useState(null);
  const [zoomedCard, setZoomedCard] = useState(null);

  const [isHeaderOpen, setIsHeaderOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const renderActionPoints = (actionsLeft) => {
    const dots = [];
    const total = 3;
    for (let i = 0; i < total; i++) {
      if (i < actionsLeft) {
        dots.push(
          <span key={i} style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: '#FFD700',
            boxShadow: '0 0 6px #FFD700',
            marginLeft: 2,
            verticalAlign: 'middle'
          }} />
        );
      } else {
        dots.push(
          <span key={i} style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '0.5px solid rgba(255, 255, 255, 0.4)',
            marginLeft: 2,
            verticalAlign: 'middle'
          }} />
        );
      }
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 4,
        background: 'rgba(0,0,0,0.4)',
        padding: '1px 4px',
        borderRadius: 4,
        border: '0.5px solid rgba(255,215,0,0.3)',
        fontSize: '7px',
        color: '#FFD700',
        fontWeight: 'bold',
        verticalAlign: 'middle'
      }}>
        {dots}
      </span>
    );
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    // Load Google Fonts Plus Jakarta Sans dynamically
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        document.head.removeChild(link);
      } catch (e) {}
    };
  }, []);

  const [themeSelected, setThemeSelected] = useState('default');
  const [selectedTheme, setSelectedTheme] = useState('default'); // host'un lobide seçtiği tema

  const [dbUser, setDbUser] = useState(() => {
    try {
      const saved = localStorage.getItem('md_db_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [leaderboard, setLeaderboard] = useState([]);
  const [lobbyTab, setLobbyTab] = useState('create'); // 'create', 'join', 'public'

  useEffect(() => {
    if (dbUser) {
      setMyName(dbUser.displayName || dbUser.display_name || dbUser.username);
      if (dbUser.avatar) setMyAvatarStyle(dbUser.avatar);
    }
  }, [dbUser]);

  const syncUserStats = useCallback((username) => {
    if (!socket || !username) return;
    socket.emit('getUserInfo', { username }, (res) => {
      if (res && res.ok && res.user) {
        setDbUser(res.user);
        localStorage.setItem('md_db_user', JSON.stringify(res.user));
      }
    });
  }, [socket]);

  const handleDbRegister = (username, password) => {
    if (!socket) return;
    socket.emit('userRegister', { username, password }, (res) => {
      if (res.ok) {
        setDbUser(res.user);
        localStorage.setItem('md_db_user', JSON.stringify(res.user));
        setMyName(res.user.displayName || res.user.display_name || res.user.username);
        if (res.user.avatar) setMyAvatarStyle(res.user.avatar);
        showToast('Kayıt Başarılı! Hoş geldiniz.', 'success');
        setModal(null);
      } else {
        setError(res.error || 'Kayıt başarısız.');
      }
    });
  };

  const handleDbLogin = (username, password) => {
    if (!socket) return;
    socket.emit('userLogin', { username, password }, (res) => {
      if (res.ok) {
        setDbUser(res.user);
        localStorage.setItem('md_db_user', JSON.stringify(res.user));
        setMyName(res.user.displayName || res.user.display_name || res.user.username);
        if (res.user.avatar) setMyAvatarStyle(res.user.avatar);
        showToast('Giriş Başarılı! Hoş geldiniz.', 'success');
        setModal(null);
      } else {
        setError(res.error || 'Giriş başarısız.');
      }
    });
  };

  const handleDbLogout = () => {
    setDbUser(null);
    localStorage.removeItem('md_db_user');
    showToast('Çıkış yapıldı.', 'info');
  };

  const handleOpenLeaderboard = () => {
    if (!socket) return;
    socket.emit('getLeaderboard', (res) => {
      setLeaderboard(res || []);
      setModal({ type: 'leaderboard' });
    });
  };

  const handleSelectAvatar = (style) => {
    setMyAvatarStyle(style);
    localStorage.setItem('md_avatar', style);
    if (dbUser && socket) {
      socket.emit('updateDbAvatar', { username: dbUser.username, avatar: style }, (res) => {
        if (res.ok) {
          const updated = { ...dbUser, avatar: style };
          setDbUser(updated);
          localStorage.setItem('md_db_user', JSON.stringify(updated));
        }
      });
    }
  };

  useEffect(() => {
    setLocalPlayerId(playerId);
  }, [playerId]);

  const [paymentSelection, setPaymentSelection] = useState({ bankCardIds: [], propertyCardIds: [] });
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
  const [roomSettings, setRoomSettings] = useState({ autoEndTurn: true, turnTimer: 30, winSets: 3, startCards: 5, handLimit: 7, isPublic: true, allowCounterJustSayNo: true, openHands: false, lockWildcards: false, fastChallenge: false, allowTrades: false, extraDealBreakers: 0, streetThugs: false, gambleZari: false, botDifficulty: 'hard', thiefSquirrelEnabled: false });

  const applyPreset = (preset) => {
    let newSettings = {};
    if (preset === 'classic') {
      newSettings = {
        autoEndTurn: true,
        turnTimer: 30,
        winSets: 3,
        startCards: 5,
        handLimit: 7,
        allowCounterJustSayNo: true,
        openHands: false,
        lockWildcards: false,
        fastChallenge: false,
        allowTrades: true,
        extraDealBreakers: 0,
        streetThugs: false,
        gambleZari: false,
        botDifficulty: 'medium',
        thiefSquirrelEnabled: true
      };
    } else if (preset === 'speed') {
      newSettings = {
        autoEndTurn: true,
        turnTimer: 30,
        winSets: 2,
        startCards: 7,
        handLimit: 7,
        allowCounterJustSayNo: true,
        openHands: false,
        lockWildcards: false,
        fastChallenge: true,
        allowTrades: true,
        extraDealBreakers: 0,
        streetThugs: false,
        gambleZari: false,
        botDifficulty: 'medium',
        thiefSquirrelEnabled: false
      };
    } else if (preset === 'chaos') {
      newSettings = {
        autoEndTurn: true,
        turnTimer: 60,
        winSets: 4,
        startCards: 10,
        handLimit: 10,
        allowCounterJustSayNo: true,
        openHands: true,
        lockWildcards: false,
        fastChallenge: false,
        allowTrades: true,
        extraDealBreakers: 3,
        streetThugs: true,
        gambleZari: true,
        botDifficulty: 'hard',
        thiefSquirrelEnabled: true
      };
    }
    setRoomSettings(prev => ({ ...prev, ...newSettings }));
  };

  const [tradeSelection, setTradeSelection] = useState({ offerBankIds: [], offerPropIds: [], requestBankIds: [], requestPropIds: [] });
  const [publicRooms, setPublicRooms] = useState([]); // Açık odalar
  const draggedRef = useRef(false); // Kart sürükleniyor mu? (onClick ile çakışmayı önlemek için)
  const [isDragging, setIsDragging] = useState(false); // Kart sürükleniyor mu?
  const [dragTrail, setDragTrail] = useState([]); // Sürükleme izi için
  const [dragOverTarget, setDragOverTarget] = useState(null); // Hangi drop target'ın üzerindeyiz? ('bank', 'properties', null)
  const [boardShake, setBoardShake] = useState(false);
  const [flyingCards, setFlyingCards] = useState([]); // Animasyonlu kartlar
  const [directionalFlyingCards, setDirectionalFlyingCards] = useState([]); // Yönlü uçan ödeme kartları
  const [isTimeRunningOut, setIsTimeRunningOut] = useState(false); // Zaman sınırı uyarısı
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
  const [sfxVolume, setSfxVolumeState] = useState(() => {
    const saved = localStorage.getItem('md_sfx_vol');
    return saved !== null ? parseFloat(saved) : getSfxVolume();
  });
  const ttsOn = false;
  const setTtsOn = () => { };
  const logRef = useRef(null);
  const prevLogTimeRef = useRef(null);
  const initialDealLogged = useRef(false);
  const [debugLogs, setDebugLogs] = useState([]); // Sol alt debug konsolu için
  const [showDebug, setShowDebug] = useState(false); // Debug ekranı açık/kapalı durumu
  const [showDeckStats, setShowDeckStats] = useState(false); // Deste istatistik modalı
  const [now, setNow] = useState(Date.now()); // Canlı tur süresi sayacı için
  const stateReceivedTimeRef = useRef(Date.now()); // Sunucudan gelen gameState'in yerel varış zamanı
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

  // ---- SIRALI EL HESAPLAMA ----
  const handToRender = isMyTurn ? [...localHand].sort((a, b) => {
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
  }) : localHand;

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

  useEffect(() => {
    setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  // ---- CANLI SÜRE SAYACI ----
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- HIZLI REDDET GERİ SAYIMI ----
  useEffect(() => {
    if (gameState?.fastChallenge && gameState?.challengeStartTime && gameState?.myPendingChallenge && gameState?.serverTime) {
      const inv = setInterval(() => {
        const clientElapsedSinceUpdate = Date.now() - stateReceivedTimeRef.current;
        const currentServerTime = gameState.serverTime + clientElapsedSinceUpdate;
        const elapsedChallengeTime = currentServerTime - gameState.challengeStartTime;
        const rem = 15 - Math.floor(elapsedChallengeTime / 1000);
        setChallengeTime(rem > 0 ? rem : 0);
      }, 1000);
      return () => clearInterval(inv);
    }
  }, [gameState?.fastChallenge, gameState?.challengeStartTime, gameState?.myPendingChallenge, gameState?.serverTime]);

  // ---- YERLEŞİK TÜRKÇE SESLENDİRME (TTS) - DEVRE DIŞI ----
  const playTurkishVoice = useCallback((text) => {
    // Disabled Completely
  }, []);

  // ---- BİLDİRİM (TOAST) SİSTEMİ ----
  const showToast = useCallback((text, kind = 'info', duration = 2500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text, kind }]);
    
    // 📳 Haptic Feedback (Dokunsal Geri Bildirim)
    if (navigator.vibrate) {
      if (kind === 'turn') navigator.vibrate([200, 100, 200]);
      else if (kind === 'error') navigator.vibrate([80, 50, 80]);
      else if (kind === 'success') navigator.vibrate(50);
    }

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
    if (isMyTurn && !isBlocked && gameState?.turnTimer > 0 && gameState?.turnStartTime && gameState?.serverTime) {
      const clientElapsedSinceUpdate = Date.now() - stateReceivedTimeRef.current;
      const currentServerTime = gameState.serverTime + clientElapsedSinceUpdate;
      const elapsedTurnTime = currentServerTime - gameState.turnStartTime;
      const remaining = gameState.turnTimer - Math.floor(elapsedTurnTime / 1000);

      // SÜRE AZALDI TİK-TAK SESİ
      if (remaining > 0 && remaining <= 10) {
        if (remaining <= 5) {
          sfxHeartbeat();
          setIsTimeRunningOut(true);
        } else {
          sfxTick();
          setIsTimeRunningOut(false);
        }
      } else {
        setIsTimeRunningOut(false);
      }

      if (remaining <= 0 && prevTurnAlertRef.current !== gameState.turnStartTime) {
        sfxAlert(); // Süre doldu alarmı!
        playTurkishVoice("Süren doldu! Turunu otomatik geçiriyorum.");
        showToast("Süreniz doldu! Otomatik geçiliyor...", "error");

        // Clear local states
        setModal(null);
        setSelectedCard(null);
        setDiscardMode(false);
        setDiscardSelected([]);
        setError('');

        prevTurnAlertRef.current = gameState.turnStartTime;
      }
    } else if (!isMyTurn) {
      prevTurnAlertRef.current = null;
      setIsTimeRunningOut(false);
    }
  }, [now, gameState?.currentPlayerId, playerId, isMyTurn, isBlocked, gameState?.turnTimer, gameState?.turnStartTime, gameState?.serverTime, playTurkishVoice, showToast]);
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

  const toggleTts = () => { };

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

      // Sunucudan en güncel istatistikleri çekip eşitle
      const savedUser = JSON.parse(localStorage.getItem('md_db_user') || 'null');
      if (savedUser && savedUser.username) {
        s.emit('getUserInfo', { username: savedUser.username }, (res) => {
          if (res && res.ok && res.user) {
            setDbUser(res.user);
            localStorage.setItem('md_db_user', JSON.stringify(res.user));
          }
        });
      }

      // Sayfa yenilendiyse veya bağlantı koptuysa otomatik odaya geri gir
      const savedRoom = localStorage.getItem('md_room');
      const savedName = localStorage.getItem('md_name');
      const savedPid = localStorage.getItem('md_pid');

      if (savedRoom && savedName && savedPid) {
        const savedUserForJoin = JSON.parse(localStorage.getItem('md_db_user') || 'null');
        const dbUsername = savedUserForJoin ? savedUserForJoin.username : null;
        s.emit('joinRoom', { roomCode: savedRoom, name: savedName, reconnectPlayerId: savedPid, avatar: myAvatarStyle, dbUsername }, (res) => {
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
    s.on('roomClosed', () => {
      setStatus('Oda host tarafından kapatıldı.');
      stopAllSFX();
      setBgmTension(false);
      handleExit();
    });
    s.on('returnedToLobby', () => {
      setStatus('Oyun bitirildi, lobiye dönüldü.');
      stopAllSFX();
      setBgmTension(false);
      setScreen('lobby');

      // Lobide güncel istatistikleri göster
      const savedUser = JSON.parse(localStorage.getItem('md_db_user') || 'null');
      if (savedUser && savedUser.username) {
        s.emit('getUserInfo', { username: savedUser.username }, (res) => {
          if (res && res.ok && res.user) {
            setDbUser(res.user);
            localStorage.setItem('md_db_user', JSON.stringify(res.user));
          }
        });
      }
    });

    s.on('gameState', (state) => {
      setGameState(prev => {
        if (state.winner && (!prev || !prev.winner)) {
          stopAllSFX();
          setBgmTension(false);
          sfxWin();
        }

        // Detect action plays & responses from log
        if (prev && state && state.log && prev.log) {
          const lastLog = state.log[state.log.length - 1];
          const prevLog = prev.log[prev.log.length - 1];
          if (lastLog && lastLog !== prevLog) {
            const logText = lastLog.text || '';
            if (logText.includes('Reddet!') || logText.includes('Just Say No')) {
              setShowShield(true);
              setTimeout(() => setShowShield(false), 900);
            }
            if (logText.includes('Anlaşma Bozan') || logText.includes('Deal Breaker')) {
              setShowSparks(true);
              setTimeout(() => setShowSparks(false), 1500);
            }
            if (logText.includes('Hırsız Sincap') || logText.includes('Thief Squirrel')) {
              setShowScratch(true);
              setTimeout(() => setShowScratch(false), 800);
            }
          }
        }
        return state;
      });
      if (state.phase === 'playing') setScreen('game');
      else if (state.phase === 'lobby') setScreen('lobby');
      stateReceivedTimeRef.current = Date.now();
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
      // 🔊 Sesli Reaksiyonlar (Audio Emote Spams)
      if (msg.text.includes('💸')) sfxChaChing();
      else if (msg.text.includes('🛡️') || msg.text.includes('Yemezler')) sfxActionJustSayNo();
      else if (msg.text.includes('🎲')) sfxDiceRoll();
      else if (msg.text.includes('💣') || msg.text.includes('Anlaşma')) sfxGlassBreak();
      else if (msg.text.includes('🤝')) sfxTradeAccepted();

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
      else if (emoji === '😭') sfxCry();
      else if (emoji === '😱') sfxShock();
      else if (emoji === '👏') sfxClap();
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

  // Kartı kimlik numarasına göre tüm oyunda arayan yardımcı fonksiyon
  const findCardInGame = (cardId) => {
    if (!gameState || !gameState.players) return null;
    for (const p of gameState.players) {
      const bankCard = p.bank?.find(c => c.id === cardId);
      if (bankCard) return bankCard;
      for (const color in p.properties) {
        const propCard = p.properties[color]?.find(c => c.id === cardId);
        if (propCard) return propCard;
      }
    }
    return null;
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
      sfxBuild();
      showToast('✨ Muhteşem! Bir renk setini tamamladın!', 'success', 4000);
      spawnMoney({ count: 20, icon: '✨' });
    }
    prevCompleteSetsRef.current = myCompleteSetsCount;
  }, [myCompleteSetsCount, showToast, spawnMoney]);

  // ---- RAKİP SET TAMAMLAMA FLASH EFEKTİ ----
  const [flashingPlayers, setFlashingPlayers] = useState({}); // { playerId: true }
  const prevCompetitorSetsRef = useRef({});
  useEffect(() => {
    if (!gameState?.players) return;
    gameState.players.forEach(p => {
      if (p.id === playerId) return; // Kendimizi atlıyoruz
      const sets = Object.entries(p.properties || {}).filter(([c, cards]) => isSetComplete(cards, c)).length;
      const prev = prevCompetitorSetsRef.current[p.id] || 0;
      if (sets > prev) {
        // Bu oyuncu yeni set tamamladı — flash tetikle
        setFlashingPlayers(fp => ({ ...fp, [p.id]: true }));
        setTimeout(() => setFlashingPlayers(fp => { const n = { ...fp }; delete n[p.id]; return n; }), 1800);
        showToast(`⚠️ ${p.name} bir set tamamladı!`, 'error', 3500);
      }
      prevCompetitorSetsRef.current[p.id] = sets;
    });
  }, [gameState?.players, playerId, showToast]);

  // ---- EL KARTLARINI YEREL DURUMA (LOCALHAND) SENKRONİZE ETME ----
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
  const getCoordsForPlayer = (pid) => {
    if (!pid) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    if (pid === playerId) {
      const el = myBankRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      return { x: window.innerWidth / 2, y: window.innerHeight - 150 };
    } else {
      const el = playerPanelRefs.current[pid];
      if (el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      return { x: window.innerWidth / 2, y: 100 };
    }
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;

    // Yeni bir log geldiğinde aksiyonu analiz et ve gerekirse overlay göster
    if (!gameState?.log?.length) return;
    const lastEntry = gameState.log[gameState.log.length - 1];

    // Aynı logu tekrar işlemiyoruz
    if (lastEntry.time === prevLogTimeRef.current) return;
    prevLogTimeRef.current = lastEntry.time;

    const lastLog = lastEntry.msg.toLowerCase();
    let overlay = null;
    const actorName = lastEntry.msg.split(',')[0] || lastEntry.msg.split(' ')[0] || 'Biri';
    const audioContext = { actorId: lastEntry.actorId, targetId: lastEntry.targetId };

    // ÖNEMLİ: 'kasaya koydu' kontrolü EN BAŞA alındı — aksiyon/aksiyon kartının adını içerse bile doğru bildirimi verir
    if (lastLog.includes('kasaya koydu')) {
      overlay = { text: 'KASAYA YATIRILDI!', icon: '💰' };
      playTurkishVoice(`${actorName} banka kasasına para yatırdı.`);
      const match = lastLog.match(/(\d+)m\s+olarak/);
      if (match) {
        const val = match[1];
        if (val === '1') sfxBankDeposit1M(audioContext);
        else if (val === '2') sfxBankDeposit2M(audioContext);
        else if (val === '3') sfxBankDeposit3M(audioContext);
        else if (val === '4') sfxBankDeposit4M(audioContext);
        else if (val === '5') sfxBankDeposit5M(audioContext);
        else if (val === '10') { sfxBankDeposit10M(audioContext); sfxVaultClose(audioContext); }
        else sfxCoin(audioContext);
      } else {
        sfxCoin(audioContext);
      }
      if (overlay) {
        setActionOverlay(overlay);
        spawnMoney({ icon: '💰' });
        setTimeout(() => setActionOverlay(null), 2500);
      }
      return; // Kasaya koydu ise başka kontrollere girme
    }

    if (lastLog.includes('anlaşma bozucu')) {
      overlay = { text: 'ANLAŞMA BOZULDU!', icon: '💣' };
      playTurkishVoice(`İşte bu bir soygun! ${actorName} Anlaşma Bozucu oynadı ve koca bir seti çaldı.`);
      sfxGlassBreak(audioContext);
      setBoardShake('heavy'); setTimeout(() => setBoardShake(false), 1200);
      sfxActionDealbreaker(audioContext);
    }
    else if (lastLog.includes('hırsız sincap') || lastLog.includes('sincap')) {
      overlay = { text: 'HIRSIZ SİNCAP!', icon: '🐿️' };
      playTurkishVoice(`Dikkat! ${actorName} hırsız sincap kartı oynadı ve elden kart çalıyor!`);
      sfxActionSlyDeal(audioContext);
    }
    else if (lastLog.includes('reddet') && (lastLog.includes('karşı') || lastLog.includes('karşı reddet'))) {
      overlay = { text: 'KARŞI REDDET!', icon: '🛡️' };
      playTurkishVoice(`Hadi oradan! ${actorName} reddet kartı oynadı.`);
      sfxActionCounterJustSayNo(audioContext);
      sfxSwordClash(audioContext);
    }
    else if (lastLog.includes('reddet')) {
      overlay = { text: 'REDDEDİLDİ!', icon: '🛡️' };
      playTurkishVoice(`Hadi oradan! ${actorName} reddet kartı oynadı.`);
      sfxActionJustSayNo(audioContext);
    }
    else if (lastLog.includes('sinsi') || lastLog.includes('çaldı') || lastLog.includes('aldı!')) {
      overlay = { text: 'SİNSİ ANLAŞMA!', icon: '🥷' };
      playTurkishVoice(`${actorName} sinsi bir şekilde arazi çaldı.`);
      sfxActionSlyDeal(audioContext);
    }
    else if (lastLog.includes('zorunlu') || lastLog.includes('takas başlattı')) {
      overlay = { text: 'ZORUNLU TAKAS!', icon: '🔁' };
      playTurkishVoice(`${actorName} zorunlu takas oynadı! Kartlar el değiştiriyor.`);
      sfxActionForcedDeal(audioContext);
    }
    else if (lastLog.includes('kirası topluyor') || lastLog.includes('kira istiyor') || lastLog.includes('kira kartı')) {
      overlay = { text: 'KİRA İSTENDİ!', icon: '💸' };
      playTurkishVoice(`${actorName} kira istiyor. Pamuk eller cebe!`);
      sfxRentCardPlayed(audioContext);
    }
    else if (lastLog.includes('çifte') || lastLog.includes('iki kat') || lastLog.includes('double rent')) {
      overlay = { text: 'İKİ KAT KİRA!', icon: '⚡' };
      sfxDoubleRent(audioContext);
    }
    else if (lastLog.includes('borç tahsildarı') || lastLog.includes('tahsildar') || lastLog.includes('haciz') || lastLog.includes('borç')) {
      overlay = { text: 'BORÇ İSTENDİ!', icon: '🧾' };
      playTurkishVoice(`${actorName} borç tahsildarı oynadı. Paraları hemen masaya dökün.`);
      sfxActionDebtCollector(audioContext);
    }
    else if (lastLog.includes('doğum günü') || lastLog.includes('doğum günüm')) {
      overlay = { text: 'MUTLU YILLAR!', icon: '🎂' };
      playTurkishVoice(`Bugün ${actorName}'in doğum günü! Herkes hediye olarak para versin.`);
      sfxPartyHorn();
      sfxActionBirthday(audioContext);
    }
    else if (lastLog.includes('geç go') || lastLog.includes('başlangıç')) {
      overlay = { text: 'KART ÇEKİLİYOR!', icon: '🎴' };
      playTurkishVoice(`${actorName} başlangıç kartı oynadı ve desteden iki yeni kart çekti.`);
      sfxActionPassGoTwoDraw(audioContext);
    }
    // (kasaya koydu zaten en üstte işlendi, buraya gelinmez)
    else if (lastLog.includes('otel inşa')) {
      overlay = { text: 'OTEL İNŞA EDİLDİ!', icon: '🏨' };
      playTurkishVoice(`Ohooo! ${actorName} yeni bir otel dikti, buradan geçen yandı!`);
      sfxHotel(audioContext);
    }
    else if (lastLog.includes('ev inşa') || (lastLog.includes('ev') && lastLog.includes('inşa'))) {
      overlay = { text: 'EV İNŞA EDİLDİ!', icon: '🏠' };
      playTurkishVoice(`Ohooo! ${actorName} yeni bir ev dikti, buradan geçen yandı!`);
      sfxHouse(audioContext);
    }
    else if (lastLog.includes('grubuna') && lastLog.includes('arazisini ekledi')) {
      overlay = { text: 'MÜLK EKLENDİ!', icon: '🗺️' };
      playTurkishVoice(`${actorName} masaya yeni bir arazi kartı yerleştirdi.`);
      if (lastLog.includes('joker')) sfxJokerPropertyPlayed(audioContext);
      else {
        const match = (lastEntry.msg || '').match(/"([^"]+)"/);
        const propName = match ? match[1] : '';
        const slug = propName
          .toLowerCase()
          .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        if (slug) sfxStreetPropertyPlayed(slug, audioContext);
        sfxPropertyPlayed(audioContext);
      }
    }
    else if (lastLog.includes('arazisini') && lastLog.includes('rengine taşıdı')) {
      overlay = { text: 'RENK DEĞİŞTİ!', icon: '🎨' };
    }
    else if (lastLog.includes('ödedi') && lastLog.includes('kasası')) {
      overlay = { text: 'ÖDEME YAPILDI!', icon: '💵' };
      if (lastEntry.actorId && lastEntry.targetId) {
        const fromPos = getCoordsForPlayer(lastEntry.actorId);
        const toPos = getCoordsForPlayer(lastEntry.targetId);
        const dummyCards = [
          { id: Math.random() + '_pay_1', type: 'money', value: 1, name: 'Ödeme Kartı', key: 'money_1' },
          { id: Math.random() + '_pay_2', type: 'money', value: 2, name: 'Ödeme Kartı', key: 'money_2' }
        ];
        dummyCards.forEach((card, idx) => {
          setTimeout(() => {
            sfxWhoosh();
            setDirectionalFlyingCards(prev => [...prev, {
              id: card.id,
              card,
              sx: fromPos.x,
              sy: fromPos.y,
              dx: toPos.x,
              dy: toPos.y
            }]);
            setTimeout(() => {
              setDirectionalFlyingCards(prev => prev.filter(c => c.id !== card.id));
              spawnMoney({ fromPos: toPos, toPos: null, count: 4 });
            }, 800);
          }, idx * 180);
        });
      }
    }
    else if (lastLog.includes('barışçıl bir takas yapmak istiyor')) {
      overlay = { text: 'TAKAS TEKLİFİ!', icon: '🤝' };
      sfxTradeProposed();
    }
    else if (lastLog.includes('takas yaptı') || lastLog.includes('takas gerçekleştirdi')) {
      overlay = { text: 'TAKAS YAPILDI!', icon: '✅' };
      sfxTradeAccepted();
    }
    else if (lastLog.includes('takas teklifini reddetti')) {
      overlay = { text: 'TAKAS REDDEDİLDİ!', icon: '❌' };
      sfxTradeRejected();
    }
    else if (lastLog.includes('karaborsa')) {
      overlay = { text: 'KARABORSA!', icon: '🕵️‍♂️' };
      sfxBlackMarket(audioContext);
    }
    else if (lastLog.includes('zar attı') && lastLog.includes('kötü şans')) {
      overlay = { text: 'KÖTÜ ŞANS!', icon: '😢' };
      sfxDiceRoll();
      sfxWompWomp();
    }
    else if (lastLog.includes('zar attı') && lastLog.includes('jackpot')) {
      overlay = { text: 'JACKPOT!', icon: '🎰' };
      sfxDiceRoll();
      sfxJackpot();
    }
    else if (lastLog.includes('zar attı') && lastLog.includes('şanslı')) {
      overlay = { text: 'ŞANSLI RULO!', icon: '🎲' };
      sfxDiceRoll();
      sfxCricket();
    }
    else if (lastLog.includes('kart attı')) {
      overlay = { text: 'KART ATILDI!', icon: '🗑️' };
      sfxCrumple(audioContext);
    }
    else if (lastLog.includes('süresi bittiği için') || lastLog.includes('otomatik geçti')) {
      overlay = { text: 'ZAMAN AŞIMI!', icon: '💤' };
    }
    else if (lastLog.includes('geri aldı') || lastLog.includes('↩️')) {
      overlay = { text: 'HAMLE GERİ ALINDI!', icon: '↩️' };
    }
    else if (lastLog.includes('masayı devirdi') || lastLog.includes('ragequit') || lastLog.includes('rage_quit')) {
      overlay = { text: 'MASAYI DEVİRDİ!', icon: '┬─┬ ︵ ┻━┻' };
      sfxTableSlap();
      sfxRageQuit();
    }
    else if (lastLog.includes('kazandi') || lastLog.includes('kazandı')) {
      overlay = { text: 'KAZANDI! 🏆', icon: '🏆' };
      sfxWin();
    }
    else if (lastLog.includes('oyun başladı')) {
      overlay = { text: 'OYUN BAŞLADI!', icon: '🎮' };
    }


    if (overlay) {
      setActionOverlay(overlay);
      if (overlay.icon === '🧾' || overlay.icon === '💰' || overlay.icon === '💸' || overlay.icon === '💵') spawnMoney({ icon: overlay.icon === '💰' ? '💰' : '💸' });
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
    } else if (draggedRef.current) {
      // 🚀 Swipe Gestures (Yukarı/Aşağı Hızlı Sürükleme)
      if (info.offset.y < -120) {
        handleCardAction(card);
        if (navigator.vibrate) navigator.vibrate(60);
      } else if (info.offset.y > 100) {
        if (card.type === 'property') {
          setError('Tapu Senedi kartları bankaya konamaz!');
          sfxError();
        } else {
          handlePlayCard(card, { asBankMoney: true });
          if (navigator.vibrate) navigator.vibrate(60);
        }
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
        showToast(lang === 'en' ? '✅ Turn Ended' : '✅ Tur Bitti', 'success', 1800);
        setActionOverlay({ text: lang === 'en' ? 'TURN ENDED!' : 'TUR BİTTİ!', icon: '⏳' });
        setTimeout(() => setActionOverlay(null), 2500);
        sfxTurnEnded();
      }
      if (curr === playerId) {
        showToast(lang === 'en' ? '🎲 YOUR TURN!' : '🎲 SIRA SENDE!', 'turn', 2800);
        setActionOverlay({ text: lang === 'en' ? 'YOUR TURN!' : 'SIRA SENDE!', icon: '🎲' });
        setTimeout(() => setActionOverlay(null), 2500);
        sfxYourTurn();
        setShowTurnFlash(true);
        setTimeout(() => setShowTurnFlash(false), 1200);
        // Titreşim (Destekleyen cihazlar için)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } else {
        const p = gameState.players.find(pl => pl.id === curr);
        if (p) {
          showToast(lang === 'en' ? `🎲 ${p.name}'s turn` : `🎲 ${p.name}'in sırası`, 'info', 1800);
          setActionOverlay({ text: lang === 'en' ? `${p.name.toUpperCase()}'S TURN!` : `${p.name.toUpperCase()}'İN SIRASI!`, icon: '🎲' });
          setTimeout(() => setActionOverlay(null), 2500);
        }
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

      // Auto-select payment selection based on rules: Cash first, then property.
      let remaining = pay.amount;
      const bankCards = me?.bank || [];
      const propertyCards = Object.values(me?.properties || {}).flat();
      const sortedBank = [...bankCards].sort((a, b) => a.value - b.value);
      const sortedProps = [...propertyCards].sort((a, b) => a.value - b.value);
      const bankIds = [];
      const propIds = [];

      for (const c of sortedBank) {
        if (remaining <= 0) break;
        bankIds.push(c.id);
        remaining -= c.value;
      }
      if (remaining > 0) {
        for (const c of sortedProps) {
          if (remaining <= 0) break;
          propIds.push(c.id);
          remaining -= c.value;
        }
      }
      setPaymentSelection({
        bankCardIds: bankIds,
        propertyCardIds: propIds
      });
    }
    prevPaymentIdRef.current = pay?.id || null;
  }, [gameState?.myPendingChallenge, gameState?.myPendingPayment]);

  // Log mesajındaki isimleri renklendiren yardımcı fonksiyon (useCallback ile optimize edildi)
  const renderLogMsg = useCallback((entry) => {
    const { msg, type } = (typeof entry === 'string' ? { msg: entry, type: 'info' } : entry);
    if (!gameState?.players) return msg;

    const translatedMsg = translateLog(msg, lang);

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
    if (translatedMsg.toLowerCase().includes('won') || translatedMsg.includes('kazandı')) icon = '🏆 ';
    if (translatedMsg.toLowerCase().includes('no') || translatedMsg.includes('reddet')) icon = '🛡️ ';

    let parts = [{ text: translatedMsg, type: 'text' }];

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
    const moveRegex = lang === 'en'
      ? /\((?:\d+ moves? left|turn ended)\)/gi
      : /\((?:\d+ hamle kaldı|Hamle bitti)\)/g;
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

    socket.emit('createRoom', { name: myName, settings: { ...roomSettings, avatar: myAvatarStyle }, dbUsername: dbUser?.username }, (res) => {
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

    socket.emit('joinRoom', { roomCode: joinCode.toUpperCase(), name: myName, avatar: myAvatarStyle, dbUsername: dbUser?.username }, (res) => {
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
    stopAllSFX();
    setBgmTension(false);
    setScreen('lobby');
  };

  const handleNewGame = () => {
    socket.emit('startGame', { theme: activeTheme, settings: roomSettings }, (res) => {
      if (!res?.ok) setError(res?.error || 'Başlatılamadı');
    });
  };

  const handleExit = () => {
    stopAllSFX();
    setBgmTension(false);
    localStorage.removeItem('md_room');
    localStorage.removeItem('md_pid');
    setRoomCode('');
    setPlayerId(null);
    setGameState(null);
    setScreen('lobby');
    setError('');

    // Çıkış yaparken güncel verileri eşitle
    const savedUser = JSON.parse(localStorage.getItem('md_db_user') || 'null');
    if (savedUser && savedUser.username && socket) {
      socket.emit('getUserInfo', { username: savedUser.username }, (res) => {
        if (res && res.ok && res.user) {
          setDbUser(res.user);
          localStorage.setItem('md_db_user', JSON.stringify(res.user));
        }
      });
    }
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

  const selectOptimalSubset = (cards, target) => {
    let bestSubset = null;
    let bestSum = Infinity;

    const backtrack = (index, currentSubset, currentSum) => {
      if (currentSum >= target) {
        if (currentSum < bestSum) {
          bestSum = currentSum;
          bestSubset = [...currentSubset];
        } else if (currentSum === bestSum) {
          if (currentSubset.length < bestSubset.length) {
            bestSubset = [...currentSubset];
          }
        }
        return;
      }
      if (index >= cards.length) return;

      currentSubset.push(cards[index]);
      backtrack(index + 1, currentSubset, currentSum + cards[index].value);
      currentSubset.pop();

      backtrack(index + 1, currentSubset, currentSum);
    };

    const sortedCards = [...cards].sort((a, b) => a.value - b.value);
    backtrack(0, [], 0);

    if (!bestSubset) {
      return sortedCards;
    }
    return bestSubset;
  };

  const handleAutoSelectPayment = () => {
    const pay = gameState?.myPendingPayment;
    if (!pay) return;
    const targetAmount = pay.amount;
    const bankCards = me?.bank || [];
    const propertyCards = Object.values(me?.properties || {}).flat();

    const totalBankValue = bankCards.reduce((sum, c) => sum + c.value, 0);

    if (totalBankValue >= targetAmount) {
      const optimalBank = selectOptimalSubset(bankCards, targetAmount);
      setPaymentSelection({
        bankCardIds: optimalBank.map(c => c.id),
        propertyCardIds: []
      });
    } else {
      const remaining = targetAmount - totalBankValue;
      const optimalProps = selectOptimalSubset(propertyCards, remaining);
      setPaymentSelection({
        bankCardIds: bankCards.map(c => c.id),
        propertyCardIds: optimalProps.map(c => c.id)
      });
    }
  };

  const handleClearPaymentSelection = () => {
    setPaymentSelection({ bankCardIds: [], propertyCardIds: [] });
  };

  const handleTouchStart = (e) => {
    const touch = e.touches ? e.touches[0] : null;
    if (touch) {
      e.currentTarget.setAttribute('data-start-x', touch.clientX);
      e.currentTarget.setAttribute('data-start-y', touch.clientY);
    }
  };

  const isClickTouchScroll = (e) => {
    const startX = e.currentTarget.getAttribute('data-start-x');
    const startY = e.currentTarget.getAttribute('data-start-y');
    if (startX && startY) {
      const diffX = Math.abs(e.clientX - parseFloat(startX));
      const diffY = Math.abs(e.clientY - parseFloat(startY));
      if (diffX > 10 || diffY > 10) {
        return true;
      }
    }
    return false;
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
      else { showToast(lang === 'en' ? 'Card purchased successfully!' : 'Kart satın alındı!', 'success'); setShowScavengeModal(false); }
    });
  };

  // ---- ISKARTA MODALI ----
  const renderDiscardModal = () => {
    if (!showDiscardModal) return null;
    return (
      <Modal title={lang === 'en' ? '🗑️ Discard Pile (Last 5 Cards)' : '🗑️ Iskarta Yığını (Son 5 Kart)'} onClose={() => setShowDiscardModal(false)}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 14,
          padding: '24px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 120,
          boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.2)'
        }}>
          {gameState.discard?.length > 0 ? (
            gameState.discard.map(card => (
              <div
                key={card.id}
                style={{
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <CardVisual card={card} small onHover={handleCardHover} onClick={() => { setPreviewCard(card); setPreviewLocked(true); }} lang={lang} />
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.35)', fontSize: 13 }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🗑️</span>
              {lang === 'en' ? 'Discard pile is empty.' : 'Iskarta yığını henüz boş.'}
            </div>
          )}
        </div>
        <p style={{ color: '#8892b0', fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
          {lang === 'en' ? 'You can click on cards to inspect their details.' : 'Kart detaylarını incelemek için kartların üzerine tıklayabilirsiniz.'}
        </p>
      </Modal>
    );
  };

  // ---- KARABORSA MODALI ----
  const renderScavengeModal = () => {
    if (!showScavengeModal) return null;
    return (
      <Modal title={lang === 'en' ? '🕵️ Black Market (Discard Market)' : '🕵️ Karaborsa (Çöpteki Kartlar)'} onClose={() => setShowScavengeModal(false)}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.08), rgba(142, 68, 173, 0.08))',
          border: '1px solid rgba(231, 76, 60, 0.2)',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          boxShadow: '0 4px 15px rgba(231, 76, 60, 0.05)'
        }}>
          <p style={{ color: '#E2E8F0', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            {lang === 'en' ? 'You can purchase discarded cards back for' : 'Atılan kartları'} <strong style={{ color: '#FFD700' }}>2M {lang === 'en' ? 'Cash' : 'Nakit'}</strong> {lang === 'en' ? '.' : 'karşılığında geri satın alabilirsiniz.'}
            <span style={{ display: 'block', fontSize: 10, color: '#a0aec0', marginTop: 4 }}>
              * {lang === 'en' ? 'Property cards are not eligible. Exact change only.' : 'Arazi kartları geçerli değildir. Tam para üstü verilmez.'}
            </span>
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 14,
          padding: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          justifyContent: 'center',
          minHeight: 120
        }}>
          {gameState.scavengeMarket?.length > 0 ? (
            gameState.scavengeMarket.map(card => (
              <div
                key={card.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.25)',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.05)',
                  width: 90,
                  boxSizing: 'content-box'
                }}
              >
                <div style={{ cursor: 'pointer' }} onClick={() => { setPreviewCard(card); setPreviewLocked(true); }}>
                  <CardVisual card={card} small onHover={handleCardHover} lang={lang} />
                </div>
                <button
                  onClick={() => handleBuyScavenge(card.id)}
                  style={{
                    ...btnStyle('linear-gradient(135deg, #2ECC71, #27AE60)'),
                    width: '100%',
                    fontSize: 10,
                    padding: '6px 8px',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(46,204,113,0.3)'
                  }}
                >
                  {lang === 'en' ? '💵 Buy for 2M' : '💵 2M ile Al'}
                </button>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.35)', fontSize: 13, padding: '20px 0' }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>🕵️</span>
              {lang === 'en' ? 'Black Market is currently empty.' : 'Karaborsa şu an boş.'}
            </div>
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
        <div
          style={{
            maxHeight: '60vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            paddingRight: 6
          }}
          className="custom-scrollbar"
        >
          {gameState.log?.length > 0 ? (
            gameState.log.map((entry, i) => {
              let accentColor = '#3498DB';
              if (entry.type === 'system') accentColor = '#FFD700';
              else if (entry.type === 'card_play') accentColor = '#a855f7';
              else if (entry.type === 'payment' || entry.type === 'rent') accentColor = '#2ECC71';
              else if (entry.type === 'trade') accentColor = '#E67E22';
              else if (entry.type === 'error' || entry.type === 'quit') accentColor = '#E74C3C';

              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    padding: '12px 14px',
                    borderRadius: 12,
                    fontSize: 13,
                    borderLeft: `4px solid ${accentColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                  }}
                >
                  <div style={{ color: '#E2E8F0', lineHeight: 1.4 }}>
                    {renderLogMsg(entry)}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: '#718096',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    alignSelf: 'flex-end',
                    marginTop: 2
                  }}>
                    🕒 {new Date(entry.time).toLocaleTimeString('tr-TR')}
                  </div>
                </div>
              );
            }).reverse()
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '24px 0' }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>📜</span>
              Henüz bir hareket kaydı bulunmuyor.
            </div>
          )}
        </div>
      </Modal>
    );
  };

  // ---- MOBİL MENÜ MODALI ----
  const renderMenuModal = () => {
    if (!isMenuOpen) return null;
    return (
      <Modal title="⚙️ Oyun Ayarları ve Menü" onClose={() => setIsMenuOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>

          {/* Deck Stats Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#FFD700', fontWeight: '800', letterSpacing: '0.3px' }}>🎴 DESTE KARTLARI</span>
              <span style={{ fontSize: 10, color: '#718096' }}>Destede kalan kart oranları</span>
            </div>
            <button
              onClick={() => { setIsMenuOpen(false); setShowDeckStats(true); sfxClick(); }}
              style={{
                ...btnStyle('rgba(255, 215, 0, 0.1)'),
                border: '1px solid rgba(255, 215, 0, 0.2)',
                color: '#FFD700',
                padding: '6px 12px',
                fontSize: 11,
                borderRadius: 8
              }}
            >
              Kalan: {gameState.deckCount}
            </button>
          </div>

          {/* Discard Pile Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#E2E8F0', fontWeight: '800', letterSpacing: '0.3px' }}>🗑️ ISKARTA YIĞINI</span>
              <span style={{ fontSize: 10, color: '#718096' }}>Son atılan kartları incele</span>
            </div>
            <button
              onClick={() => { setIsMenuOpen(false); setShowDiscardModal(true); sfxClick(); }}
              style={{
                ...btnStyle('rgba(255,255,255,0.08)'),
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px 12px',
                fontSize: 11,
                borderRadius: 8
              }}
            >
              Gözat ({gameState.discard?.length || 0})
            </button>
          </div>

          {/* 3D View Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#E2E8F0', fontWeight: '800', letterSpacing: '0.3px' }}>👓 3D MASA GÖRÜNÜMÜ</span>
              <span style={{ fontSize: 10, color: '#718096' }}>Kamera açısını değiştirir</span>
            </div>
            <button
              onClick={() => { const next = !is3DTable; setIs3DTable(next); localStorage.setItem('md_3d', next ? 'on' : 'off'); sfxClick(); }}
              style={{
                ...btnStyle(is3DTable ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.08)'),
                border: is3DTable ? '1px solid rgba(46,204,113,0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: is3DTable ? '#2ECC71' : '#E2E8F0',
                padding: '6px 14px',
                fontSize: 11,
                borderRadius: 8
              }}
            >
              {is3DTable ? '✓ AÇIK' : 'KAPALI'}
            </button>
          </div>

          {/* History Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#3498DB', fontWeight: '800', letterSpacing: '0.3px' }}>📜 HAREKET GEÇMİŞİ</span>
              <span style={{ fontSize: 10, color: '#718096' }}>Oyun günlüğü ve akışı</span>
            </div>
            <button
              onClick={() => { setIsMenuOpen(false); setShowHistoryModal(true); sfxClick(); }}
              style={{
                ...btnStyle('rgba(52, 152, 219, 0.12)'),
                border: '1px solid rgba(52, 152, 219, 0.25)',
                color: '#3498DB',
                padding: '6px 12px',
                fontSize: 11,
                borderRadius: 8
              }}
            >
              Geçmişi Gör
            </button>
          </div>

          {/* Scavenge (Black Market) Row */}
          {gameState.streetThugs && gameState.scavengeMarket?.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(231, 76, 60, 0.15)',
              padding: '12px 16px',
              borderRadius: 12
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, color: '#E74C3C', fontWeight: '800', letterSpacing: '0.3px' }}>🕵️ KARABORSA</span>
                <span style={{ fontSize: 10, color: '#718096' }}>Çöpe atılan kartları satın al</span>
              </div>
              <button
                onClick={() => { setIsMenuOpen(false); setShowScavengeModal(true); sfxClick(); }}
                style={{
                  ...btnStyle('rgba(231, 76, 60, 0.12)'),
                  border: '1px solid rgba(231, 76, 60, 0.25)',
                  color: '#E74C3C',
                  padding: '6px 12px',
                  fontSize: 11,
                  borderRadius: 8
                }}
              >
                Markete Git ({gameState.scavengeMarket.length})
              </button>
            </div>
          )}

          {/* Sound Controls Card */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '14px 16px',
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, color: '#E2E8F0', fontWeight: '800', letterSpacing: '0.3px' }}>🔊 SES AYARLARI</span>
                <span style={{ fontSize: 10, color: '#718096' }}>Müzik ve efekt düzeyleri</span>
              </div>
              <button
                onClick={() => { toggleSound(); sfxClick(); }}
                style={{
                  background: soundOn ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                {soundOn ? '🔊' : '🔇'}
              </button>
            </div>
            {soundOn && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, color: '#718096', width: 30 }}>BGM:</span>
                  <input
                    type="range" min="0" max="0.5" step="0.01"
                    value={bgmVolume}
                    onChange={e => { setBgmVolumeState(e.target.value); setBgmVolume(e.target.value); }}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      height: 4,
                      borderRadius: 2,
                      background: '#2d3748',
                      accentColor: '#FFD700',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#718096', minWidth: 28, textAlign: 'right' }}>%{Math.round(bgmVolume * 200)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, color: '#718096', width: 30 }}>SFX:</span>
                  <input
                    type="range" min="0" max="1.0" step="0.02"
                    value={sfxVolume}
                    onChange={e => { setSfxVolumeState(e.target.value); setSfxVolume(e.target.value); }}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      height: 4,
                      borderRadius: 2,
                      background: '#2d3748',
                      accentColor: '#FFD700',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#718096', minWidth: 28, textAlign: 'right' }}>%{Math.round(sfxVolume * 100)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            {gameState?.players?.[0]?.id === playerId ? (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  socket.emit('returnToLobby', { roomCode }, (res) => {
                    if (res && !res.ok) setError(res.error || 'Oyun bitirilemedi');
                  });
                }}
                style={{
                  ...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'),
                  flex: 1,
                  padding: '12px 14px',
                  fontSize: '12px',
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(230,126,34,0.25)'
                }}
              >
                🛑 Oyunu Bitir
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (!window.confirm('Odadan ayrılmak istediğinden emin misin?')) return;
                  socket?.emit('leaveRoom', { roomCode }, () => { });
                  handleExit();
                }}
                style={{
                  ...btnStyle('linear-gradient(135deg, #E74C3C, #C0392B)'),
                  flex: 1,
                  padding: '12px 14px',
                  fontSize: '12px',
                  borderRadius: 10,
                  boxShadow: '0 4px 12px rgba(231,76,60,0.25)'
                }}
              >
                🚪 Odadan Çık
              </button>
            )}
            <button
              onClick={() => { setIsMenuOpen(false); handleRageQuit(); }}
              style={{
                ...btnStyle('linear-gradient(135deg, #E74C3C, #C0392B)'),
                flex: 1,
                padding: '12px 14px',
                fontSize: '12px',
                borderRadius: 10,
                boxShadow: '0 4px 12px rgba(231,76,60,0.25)'
              }}
            >
              💥 Masayı Devir
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
      <Modal title={lang === 'en' ? `${p.name} - All Assets` : `${p.name} - Tüm Varlıklar`} onClose={() => setViewingPlayerId(null)}>
        {/* EMOTE CONTAINER */}
        <div style={{
          marginBottom: 16,
          padding: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 12
        }}>
          <div style={{
            fontSize: 11,
            color: '#FFD700',
            marginBottom: 10,
            fontWeight: '800',
            letterSpacing: '0.5px',
            textAlign: 'center'
          }}>
            {lang === 'en' ? 'SEND EMOTE' : 'İFADE GÖNDER'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {EMOTES.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  socket.emit('sendEmote', { targetId: p.id, emoji });
                  setViewingPlayerId(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  width: 42,
                  height: 42,
                  fontSize: 22,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)';
                  e.currentTarget.style.borderColor = '#FFD700';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {gameState?.allowTrades && isMyTurn && !isBlocked && p.id !== playerId && (
          <button
            onClick={() => {
              setViewingPlayerId(null);
              setTradeSelection({ offerBankIds: [], offerPropIds: [], requestBankIds: [], requestPropIds: [] });
              setModal({ type: 'proposeTrade', targetId: p.id });
            }}
            style={{
              ...btnStyle('linear-gradient(135deg, #3498DB, #2980B9)'),
              width: '100%',
              padding: '12px',
              marginBottom: 16,
              fontSize: 13,
              borderRadius: 10,
              boxShadow: '0 4px 12px rgba(52,152,219,0.25)'
            }}
          >
            {lang === 'en' ? '🤝 Propose Peaceful Trade (Commerce)' : '🤝 Barışçıl Takas Teklif Et (Ticaret)'}
          </button>
        )}

        {/* BANK ASSETS CONTAINER */}
        <div style={{
          marginBottom: 16,
          padding: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12, fontWeight: '800', letterSpacing: '0.4px' }}>
            {lang === 'en' ? `🏦 BANK (${p.bankTotal}M)` : `🏦 BANKA (${p.bankTotal}M)`}
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            minHeight: isMobile ? 'auto' : 100,
            padding: '4px 0'
          }}>
            {(p.bank || []).map((c) => (
              <div
                key={c.id}
                onMouseEnter={() => handleCardHover(c)}
                onMouseLeave={() => handleCardHover(null)}
                onClick={() => { setPreviewCard(c); setPreviewLocked(true); }}
                style={{
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
              >
                <CardVisual card={c} small />
              </div>
            ))}
            {(!p.bank || p.bank.length === 0) && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
                {lang === 'en' ? 'No cash in the bank...' : 'Bankada hiç nakit yok...'}
              </span>
            )}
          </div>
        </div>

        {/* PROPERTIES CONTAINER */}
        <div style={{
          padding: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12
        }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12, fontWeight: '800', letterSpacing: '0.4px' }}>
            {lang === 'en' ? '🏘️ PROPERTIES & SETS' : '🏘️ ARSALAR VE MÜLKLER'}
          </div>
          {Object.keys(p.properties || {}).length > 0 && Object.values(p.properties || {}).flat().length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              {Object.entries(p.properties || {}).map(([color, cards]) => (
                cards.length > 0 && (
                  <FannedPropertySet
                    key={color}
                    color={color}
                    cards={cards}
                    buildings={p.buildings}
                    isOwn={false}
                    onHoverCard={handleCardHover}
                    onClickCard={(c) => { setPreviewCard(c); setPreviewLocked(true); }}
                  />
                )
              ))}
            </div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>
              {lang === 'en' ? 'No properties on the board.' : 'Masada hiç arsası bulunmuyor.'}
            </div>
          )}
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
        case 'thief_squirrel':
          setModal({ type: 'selectTarget', card, action: 'thief_squirrel' });
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
        <Modal title={lang === 'en' ? 'Select Color' : 'Renk Seç'} onClose={() => setModal(null)}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            {lang === 'en' ? 'Which color group would you like to use this wild property card for?' : 'Bu joker mülk kartını hangi renk grubu için kullanmak istersiniz?'}
          </div>
          <div className="premium-option-grid">
            {modal.colors.map(color => {
              const infoRaw = COLOR_INFO[color] || { hex: '#475569', name: color, light: '#64748b' };
              const info = {
                ...infoRaw,
                name: getColorName(color, lang)
              };
              return (
                <div
                  key={color}
                  className="premium-option-card"
                  style={{ '--card-accent': info.hex }}
                  onClick={() => handlePlayCard(card, { color })}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${info.hex}, ${info.light || info.hex})`,
                    boxShadow: `0 4px 10px ${info.hex}44, 0 0 0 2.5px rgba(255,255,255,0.12)`,
                  }} />
                  <span className="premium-option-label" style={{ color: '#fff', marginTop: 4 }}>
                    {info.name || color}
                  </span>
                </div>
              );
            })}
          </div>
        </Modal>
      );
    }

    if (modal.type === 'selectTarget') {
      const others = gameState.players.filter(p => p.id !== playerId);
      const filteredOthers = modal.step === 2 && modal.targetId
        ? others.filter(p => p.id === modal.targetId)
        : others;
      return (
        <Modal
          title={lang === 'en'
            ? `${{ slydeal: 'Sly Deal', forceddeal: 'Forced Deal', dealbreaker: 'Deal Breaker', debtcollector: 'Debt Collector', thief_squirrel: 'Thief Squirrel' }[modal.action] || 'Action'} - Select Target`
            : `${ACTION_NAMES[modal.action] || 'Aksiyon'} - Hedef Seç`}
          onClose={() => setModal(null)}
        >
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            {lang === 'en' ? 'Who do you want to play this card against? Select a player and target below.' : 'Bu kartı kime karşı kullanmak istiyorsunuz? Aşağıdan bir oyuncu ve hedef seçin.'}
          </div>
          {(modal.action === 'slydeal' || modal.action === 'forceddeal' || modal.action === 'dealbreaker') && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ fontSize: 11, fontWeight: 'bold', color: '#FFD700', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                {lang === 'en' ? '👤 Your Current Properties:' : '👤 Senin Mevcut Arazilerin:'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(me?.properties || {}).filter(([, cards]) => cards.length > 0).map(([color, cards]) => {
                  const infoRaw = COLOR_INFO[color] || { hex: '#aaa' };
                  const info = {
                    ...infoRaw,
                    name: getColorName(color, lang)
                  };
                  const isComplete = isSetComplete(cards, color);
                  const setSize = SET_SIZES[color] || 2;
                  return (
                    <div
                      key={color}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: isComplete ? `${info.hex}25` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isComplete ? info.hex : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: 9,
                        fontWeight: 'bold',
                        color: isComplete ? '#FFD700' : '#fff'
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: info.hex }} />
                      <span>{info.name} ({cards.length}/{setSize})</span>
                      {isComplete && <span style={{ fontSize: 8 }}>⭐</span>}
                    </div>
                  );
                })}
                {(!me?.properties || Object.values(me.properties).every(c => c.length === 0)) && (
                  <div style={{ fontSize: 10, color: '#555', fontStyle: 'italic' }}>{lang === 'en' ? 'You have no properties on the board.' : 'Masada hiç araziniz bulunmuyor.'}</div>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredOthers.map(p => {
              // Mini arazi renk badge'ları
              const propEntries = Object.entries(p.properties || {}).filter(([, cards]) => cards.length > 0);
              return (
                <div key={p.id} className="modal-profile-card">
                  <div className="modal-profile-header">
                    <div className="modal-profile-name">
                      <img
                        src={`https://api.dicebear.com/7.x/${p.avatar || 'avataaars'}/svg?seed=${p.name}`}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>{p.name}</span>
                        {/* Mini arazi renk badge'ları */}
                        {propEntries.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {propEntries.map(([color, cards]) => {
                              const infoRaw = COLOR_INFO[color] || { hex: '#aaa' };
                              const info = {
                                ...infoRaw,
                                name: getColorName(color, lang)
                              };
                              const complete = isSetComplete(cards, color);
                              const sz = SET_SIZES[color] || 2;
                              return (
                                <div key={color} title={`${info.name}: ${cards.length}/${sz}${complete ? (lang === 'en' ? ' ✓ FULL SET' : ' ✓ TAM SET') : ''}`}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    background: complete ? `${info.hex}30` : 'rgba(255,255,255,0.06)',
                                    border: complete ? `1px solid ${info.hex}` : `1px solid ${info.hex}55`,
                                    borderRadius: 5, padding: '2px 5px',
                                    boxShadow: complete ? `0 0 6px ${info.hex}66` : 'none'
                                  }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.hex, flexShrink: 0 }} />
                                  <span style={{ fontSize: 9, fontWeight: 900, color: complete ? '#FFD700' : '#ccc' }}>
                                    {cards.length}/{sz}{complete ? '★' : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12, alignSelf: 'flex-start' }}>
                      {lang === 'en' ? 'Bank:' : 'Banka:'} {p.bankTotal}M
                    </span>
                  </div>

                  {modal.action === 'debtcollector' && (
                    <button onClick={() => handlePlayCard(card, { targetId: p.id })} style={{ ...btnStyle('#E74C3C'), width: '100%', padding: '12px 16px', borderRadius: 8, margin: 0 }}>
                      {lang === 'en' ? `💸 Collect 5M from ${p.name}` : `💸 ${p.name}'den 5M Tahsil Et`}
                    </button>
                  )}

                  {modal.action === 'thief_squirrel' && (
                    <button
                      disabled={p.handCount === 0}
                      onClick={() => handlePlayCard(card, { targetId: p.id })}
                      style={{
                        ...btnStyle(p.handCount === 0 ? '#555' : '#8B4513'),
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 8,
                        margin: 0,
                        cursor: p.handCount === 0 ? 'not-allowed' : 'pointer',
                        opacity: p.handCount === 0 ? 0.5 : 1
                      }}
                    >
                      {lang === 'en' ? `🐿️ Steal Card from ${p.name} (Has ${p.handCount || 0} Cards)` : `🐿️ ${p.name}'dan Kart Çal (Elde ${p.handCount || 0} Kart var)`}
                    </button>
                  )}

                  {modal.action === 'dealbreaker' && (
                    <div>
                      <div style={{ color: '#a855f7', fontWeight: 'bold', fontSize: 12, marginBottom: 10 }}>{lang === 'en' ? 'Select the completed set you want to steal:' : 'Çalmak istediğiniz tamamlanmış seti seçin:'}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {Object.entries(p.properties || {}).filter(([color, cards]) => isSetComplete(cards, color)).map(([color, cards]) => {
                          const infoRaw = COLOR_INFO[color] || { hex: '#444', name: color, light: '#666' };
                          const info = {
                            ...infoRaw,
                            name: getColorName(color, lang)
                          };
                          const b = p.buildings?.[color];
                          return (
                            <div key={color} style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10, border: `1.5px solid ${info.hex}`, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110 }}>
                              <div style={{ color: info.light || '#fff', fontSize: 10, fontWeight: 900, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{info.name.toUpperCase()} {lang === 'en' ? 'SET' : 'SETİ'}</div>

                              {/* Card Previews */}
                              <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
                                {cards.map(c => (
                                  <div key={c.id} style={{
                                    width: 16, height: 22, backgroundColor: '#fff',
                                    border: `1.2px solid ${info.hex}`, borderRadius: 3,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden'
                                  }}>
                                    <div style={{ width: '100%', height: 3, background: c.isWild ? 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB)' : (c.isDual && c.colors ? `linear-gradient(90deg, ${COLOR_INFO[c.colors[0]]?.hex} 0%, ${COLOR_INFO[c.colors[0]]?.hex} 50%, ${COLOR_INFO[c.colors[1]]?.hex} 50%, ${COLOR_INFO[c.colors[1]]?.hex} 100%)` : info.hex) }} />
                                    <span style={{ fontSize: 6, fontWeight: 900, color: '#333', transform: 'scale(0.8)', marginTop: 2 }}>{c.isWild ? '★' : c.value}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Buildings indicator */}
                              {b && (b.houses > 0 || b.hotel) && (
                                <div style={{ display: 'flex', gap: 3, marginBottom: 8, background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
                                  {b.houses > 0 && <span title="Ev" style={{ fontSize: 10 }}>🏠</span>}
                                  {b.hotel && <span title="Otel" style={{ fontSize: 10 }}>🏨</span>}
                                </div>
                              )}

                              <button onClick={() => handlePlayCard(card, { targetId: p.id, targetColor: color })} style={{ ...btnStyle('#a855f7'), padding: '6px 14px', fontSize: 11, width: '100%', margin: 0 }}>
                                {lang === 'en' ? '💣 STEAL' : '💣 ÇAL'}
                              </button>
                            </div>
                          );
                        })}
                        {Object.entries(p.properties || {}).filter(([color, cards]) => isSetComplete(cards, color)).length === 0 && (
                          <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic', padding: '4px 0' }}>{lang === 'en' ? 'No completed property sets found.' : 'Tamamlanmış mülk seti bulunmuyor.'}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {modal.action === 'slydeal' && (
                    <div>
                      <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 12, marginBottom: 10 }}>{lang === 'en' ? 'Select the single property card you want to steal (excluding completed sets):' : 'Çalmak istediğiniz bağımsız araziyi seçin (Setler Hariç):'}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(p.properties || {}).flatMap(([color, cards]) =>
                          !isSetComplete(cards, color) ? cards.map(propCard => {
                            // Akıllı Uyarı Mantığı (Profitable Glow)
                            let isProfitable = false;
                            const me = gameState.players.find(pl => pl.id === playerId);
                            if (me) {
                              if (propCard.isWild) isProfitable = true;
                              else {
                                const pColors = propCard.isDual ? propCard.colors : [propCard.color];
                                isProfitable = pColors.some(clr => me.properties?.[clr]?.length > 0);
                              }
                            }

                            return (
                              <div
                                key={propCard.id}
                                className={isProfitable ? 'profitable-glow' : ''}
                                onClick={() => handlePlayCard(card, { targetId: p.id, targetColor: color, targetCardId: propCard.id })}
                                style={{
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  borderRadius: 8,
                                  overflow: 'hidden',
                                  border: '2px solid transparent'
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                                  e.currentTarget.style.borderColor = '#3b82f6';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.transform = 'none';
                                  e.currentTarget.style.borderColor = 'transparent';
                                }}
                              >
                                <CardVisual card={propCard} small lang={lang} />
                              </div>
                            );
                          }) : []
                        )}
                        {Object.entries(p.properties || {}).every(([c, cards]) => isSetComplete(cards, c) || cards.length === 0) && (
                          <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic', padding: '4px 0' }}>Çalınabilecek bağımsız arsa bulunmuyor.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {modal.action === 'forceddeal' && (
                    <div className="stepper-container">
                      {/* Step 1 */}
                      <div className={`step-card ${modal.step !== 2 ? 'active' : 'inactive'}`}>
                        <div className="step-header" style={{ color: '#e11d48' }}>
                          <span>①</span> {lang === 'en' ? `Select Card to Take from ${p.name}` : `${p.name}'den Alacağınız Kartı Seçin`}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {Object.entries(p.properties || {}).flatMap(([color, cards]) => {
                            const isSetDone = isSetComplete(cards, color);
                            return cards.map(propCard => {
                              const isSelected = modal.targetCardId === propCard.id;
                              let isProfitable = false;
                              const me = gameState.players.find(pl => pl.id === playerId);
                              if (me && !isSetDone) {
                                  if (propCard.isWild) isProfitable = true;
                                  else {
                                    const pColors = propCard.isDual ? propCard.colors : [propCard.color];
                                    isProfitable = pColors.some(clr => me.properties?.[clr]?.length > 0);
                                  }
                              }
                              return (
                                <div
                                  key={propCard.id}
                                  className={isSetDone ? '' : (isProfitable && !isSelected ? 'profitable-glow' : '')}
                                  onClick={() => {
                                    if (isSetDone) {
                                      showToast(lang === 'en' ? "You cannot take cards from a completed set!" : "Tamamlanmış bir setten kart alamazsınız!", "warning");
                                      return;
                                    }
                                    setModal({ ...modal, targetId: p.id, targetColor: color, targetCardId: propCard.id, step: 2 });
                                  }}
                                  style={{
                                    cursor: isSetDone ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    transform: isSelected ? 'scale(1.08)' : 'none',
                                    outline: isSelected ? '2.5px solid #e11d48' : 'none',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    boxShadow: isSelected ? '0 0 15px rgba(225,29,72,0.5)' : 'none',
                                    opacity: isSetDone ? 0.45 : 1,
                                    filter: isSetDone ? 'grayscale(80%)' : 'none',
                                    position: 'relative'
                                  }}
                                >
                                  <CardVisual card={propCard} small lang={lang} />
                                  {isSetDone && (
                                    <div style={{
                                      position: 'absolute', inset: 0,
                                      background: 'rgba(0,0,0,0.6)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 8, fontWeight: 900, color: '#fff', textAlign: 'center',
                                      padding: 2,
                                      zIndex: 2
                                    }}>
                                      🔒 SET
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })}
                          {Object.entries(p.properties || {}).every(([c, cards]) => cards.length === 0) && (
                            <div style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>{lang === 'en' ? 'No property available to take.' : 'Alınabilecek arsa bulunmuyor.'}</div>
                          )}
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className={`step-card ${modal.step === 2 ? 'active' : 'inactive'}`}>
                        <div className="step-header" style={{ color: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span><span>②</span> {lang === 'en' ? 'Select Card to Give from Yours' : 'Kendi Kartlarınızdan Vereceğinizi Seçin'}</span>
                          {modal.step === 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setModal({ ...modal, step: 1, targetId: null, targetColor: null, targetCardId: null });
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                color: '#fff',
                                borderRadius: 4,
                                padding: '2px 8px',
                                fontSize: 10,
                                cursor: 'pointer',
                                margin: 0
                              }}
                            >
                              {lang === 'en' ? '◀ Back' : '◀ Geri Dön'}
                            </button>
                          )}
                        </div>
                        {modal.step === 2 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, animation: 'toast-in 0.25s ease' }}>
                            {Object.entries(me?.properties || {}).flatMap(([color, cards]) => {
                              const isSetDone = isSetComplete(cards, color);
                              return cards.map(propCard => {
                                let isDangerous = false;
                                if (!isSetDone) {
                                  if (propCard.isWild) isDangerous = true;
                                  else {
                                    const cColors = propCard.isDual ? propCard.colors : [propCard.color];
                                    isDangerous = cColors.some(clr => p.properties?.[clr]?.length > 0);
                                  }
                                }
                                return (
                                  <div
                                    key={propCard.id}
                                    className={isSetDone ? '' : (isDangerous ? 'danger-glow' : '')}
                                    onClick={() => {
                                      if (isSetDone) {
                                        showToast("Tamamlanmış bir setten kart veremezsiniz!", "warning");
                                        return;
                                      }
                                      handlePlayCard(card, {
                                        targetId: modal.targetId,
                                        targetColor: modal.targetColor,
                                        targetCardId: modal.targetCardId,
                                        myColor: color,
                                        myCardId: propCard.id,
                                      });
                                    }}
                                    style={{
                                      cursor: isSetDone ? 'not-allowed' : 'pointer',
                                      transition: 'all 0.2s ease',
                                      borderRadius: 8,
                                      overflow: 'hidden',
                                      border: '2px solid transparent',
                                      opacity: isSetDone ? 0.45 : 1,
                                      filter: isSetDone ? 'grayscale(80%)' : 'none',
                                      position: 'relative'
                                    }}
                                    onMouseOver={(e) => {
                                      if (!isSetDone) {
                                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                                        e.currentTarget.style.borderColor = '#10b981';
                                      }
                                    }}
                                    onMouseOut={(e) => {
                                      if (!isSetDone) {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.borderColor = 'transparent';
                                      }
                                    }}
                                  >
                                    <CardVisual card={propCard} small lang={lang} />
                                    {isSetDone && (
                                      <div style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(0,0,0,0.6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 8, fontWeight: 900, color: '#fff', textAlign: 'center',
                                        padding: 2,
                                        zIndex: 2
                                      }}>
                                        🔒 SET
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })}
                            {Object.entries(me?.properties || {}).every(([c, cards]) => cards.length === 0) && (
                              <div style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>{lang === 'en' ? 'No property available to give.' : 'Verilebilecek arsanız bulunmuyor.'}</div>
                            )}
                          </div>
                        )}
                        {modal.step !== 2 && (
                          <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
                            {lang === 'en' ? 'Please select the card to take from above first.' : 'Lütfen önce yukarıdan alacağınız kartı seçin.'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>
      );
    }

    if (modal.type === 'viewBankCards') {
      const bankCards = me?.bank || [];
      return (
        <Modal title={lang === 'en' ? `💰 Bank Vault (${me?.bankTotal || 0}M)` : `💰 Banka Kasası (${me?.bankTotal || 0}M)`} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 12, fontSize: 12, color: '#94a3b8' }}>
            {lang === 'en' ? 'All cards in your bank are listed below. Money cards and action cards you deposited to the bank appear here.' : 'Bankandaki tüm kartlar aşağıda listeleniyor. Para kartları ve bankaya yatırdığın aksiyon kartları burada görünür.'}
          </div>
          {bankCards.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: 24, fontStyle: 'italic', fontSize: 13 }}>{lang === 'en' ? 'Bank vault is empty.' : 'Banka kasası boş.'}</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxHeight: 360, overflowY: 'auto' }}>
              {bankCards.map(c => (
                <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <CardVisual card={c} small lang={lang} />
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#2ECC71', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 6, padding: '2px 8px' }}>
                    {c.value}M
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#aaa', fontSize: 12 }}>{lang === 'en' ? 'Total Bank Value:' : 'Toplam Banka Değeri:'}</span>
            <span style={{ color: '#FFD700', fontWeight: 900, fontSize: 16 }}>{me?.bankTotal || 0}M</span>
          </div>
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
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            Hangi renk setiniz üzerinden kira toplamak istiyorsunuz? Varsa "Çifte Kira" kartını da kullanabilirsiniz.
          </div>
          {validColors.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 14, padding: '20px 0' }}>
              ⚠️ Bu kira kartı için masada uygun mülkünüz bulunmuyor.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {validColors.map(color => {
              const info = COLOR_INFO[color] || { hex: '#444', name: color, light: '#fff' };
              const rentAmount = calculateRentClient(me, color);
              const doubleRentAmount = rentAmount * 2;

              return (
                <div key={color} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: info.light || '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: info.hex, border: '1.5px solid rgba(255,255,255,0.4)' }}></span>
                      {info.name} Grubu
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {me.properties[color]?.length || 0} Kart Sahipsin
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: doubleRentCards.length > 0 ? '1fr 1fr' : '1fr', gap: 10 }}>
                    <button onClick={() => {
                      if (card.colors === 'all') {
                        setModal({ type: 'selectRentTarget', card, color, double: false });
                      } else {
                        handlePlayCard(card, { color });
                      }
                    }} style={{ ...btnStyle(info.hex), width: '100%', margin: 0, padding: '10px' }}>
                      💰 {rentAmount}M Kira İste
                    </button>

                    {doubleRentCards.length > 0 && (
                      <button onClick={() => {
                        if (card.colors === 'all') {
                          setModal({ type: 'selectRentTarget', card, color, double: true, doubleRentCardId: doubleRentCards[0].id });
                        } else {
                          handlePlayCard(card, { color, doubleRentCardId: doubleRentCards[0].id });
                        }
                      }} style={{ ...btnStyle('linear-gradient(135deg, #d35400, #e67e22)'), width: '100%', margin: 0, padding: '10px', boxShadow: '0 4px 15px rgba(211,84,0,0.4)' }}>
                        ⚡ Çifte Kira ({doubleRentAmount}M)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      );
    }

    if (modal.type === 'selectRentTarget') {
      const others = gameState.players.filter(p => p.id !== playerId);
      return (
        <Modal title={`Hedef Seç (Herhangi Kira${modal.double ? ' — İKİ KAT' : ''})`} onClose={() => setModal(null)}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            Herhangi Kira kartıyla hangi oyuncudan kira tahsil etmek istiyorsunuz?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {others.map(p => {
              const propEntries = Object.entries(p.properties || {}).filter(([, cards]) => cards.length > 0);
              return (
                <div key={p.id} className="modal-profile-card">
                  <div className="modal-profile-header">
                    <div className="modal-profile-name">
                      <img
                        src={`https://api.dicebear.com/7.x/${p.avatar || 'avataaars'}/svg?seed=${p.name}`}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span>{p.name}</span>
                        {/* Mini arazi renk badge'ları */}
                        {propEntries.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {propEntries.map(([color, cards]) => {
                              const info = COLOR_INFO[color] || { hex: '#aaa' };
                              const complete = isSetComplete(cards, color);
                              const sz = SET_SIZES[color] || 2;
                              return (
                                <div key={color} title={`${info.name || color}: ${cards.length}/${sz}${complete ? ' ✓ TAM SET' : ''}`}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    background: complete ? `${info.hex}30` : 'rgba(255,255,255,0.06)',
                                    border: complete ? `1px solid ${info.hex}` : `1px solid ${info.hex}55`,
                                    borderRadius: 5, padding: '2px 5px',
                                    boxShadow: complete ? `0 0 6px ${info.hex}66` : 'none'
                                  }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.hex, flexShrink: 0 }} />
                                  <span style={{ fontSize: 9, fontWeight: 900, color: complete ? '#FFD700' : '#ccc' }}>
                                    {cards.length}/{sz}{complete ? '★' : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 12, alignSelf: 'flex-start' }}>
                      Banka: {p.bankTotal}M
                    </span>
                  </div>

                  <button
                    onClick={() => handlePlayCard(card, {
                      color: modal.color,
                      targetId: p.id,
                      ...(modal.double ? { doubleRentCardId: modal.doubleRentCardId } : {}),
                    })}
                    style={{ ...btnStyle('#16A085'), width: '100%', padding: '12px 16px', borderRadius: 8, margin: 0 }}
                  >
                    🎯 Seç ve Kira İste
                  </button>
                </div>
              );
            })}
          </div>
        </Modal>
      );
    }

    if (modal.type === 'selectMyColor') {
      const isHotel = card.action === 'hotel';
      const completeSets = Object.entries(me?.properties || {})
        .filter(([color, cards]) => {
          if (color === 'railroad' || color === 'utility') return false;
          if (!isSetComplete(cards, color)) return false;
          const b = me?.buildings?.[color] || {};
          if (isHotel) return b.houses > 0 && !b.hotel;
          return !b.houses && !b.hotel;
        })
        .map(([color]) => color);

      return (
        <Modal title={`${isHotel ? 'Otel' : 'Ev'} İçin Renk Seç`} onClose={() => setModal(null)}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            Hangi tamamlanmış renk grubunuza bina inşa etmek istiyorsunuz?
          </div>
          {completeSets.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12, padding: '10px 0', lineHeight: 1.4 }}>
              {isHotel
                ? '⚠️ Otel inşa edebilmek için önce üzerinde "Ev" olan tamamlanmış bir setiniz olmalıdır (Demiryolu/Kamu hariç).'
                : '⚠️ Ev inşa edebilmek için tamamlanmış (üzerinde henüz bina olmayan) bir arsa setiniz olmalıdır (Demiryolu/Kamu hariç).'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {completeSets.map(color => {
              const info = COLOR_INFO[color] || { hex: '#444', name: color, light: '#fff' };
              const b = me?.buildings?.[color] || {};
              return (
                <button
                  key={color}
                  onClick={() => handlePlayCard(card, { color })}
                  style={{
                    ...btnStyle(info.hex),
                    width: '100%',
                    margin: 0,
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
                  {info.name} Seti {b.houses > 0 ? '🏠' : ''}{b.hotel ? '🏨' : ''}
                </button>
              );
            })}
          </div>
        </Modal>
      );
    }

    if (modal.type === 'flipColor') {
      const card = modal.card;
      const allColors = card.colors || Object.keys(COLOR_INFO);
      return (
        <Modal title={lang === 'en' ? 'Flip Property Color' : 'Mülk Rengini Değiştir'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
            {/* Left Column: 3D Visual Preview */}
            <div style={{
              perspective: '1000px',
              width: 132 * 1.22,
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
                <CardVisual card={card} small={false} lang={lang} />
              </div>
            </div>

            {/* Right Column: Color Options with Rents */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              <p style={{ color: '#E0E0E0', fontSize: 13, margin: 0, opacity: 0.9, lineHeight: 1.4 }}>
                {lang === 'en' ? 'This card is currently in the' : 'Bu kart şu anda'} <span style={{ color: COLOR_INFO[card.activeColor]?.light || '#fff', fontWeight: 900, textDecoration: 'underline' }}>{getColorName(card.activeColor, lang)}</span> {lang === 'en' ? 'group. Select the new color to flip to:' : 'grubunda. Çevirmek istediğiniz yeni rengi seçin:'}
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
                          {getColorName(color, lang)}
                        </span>
                        {isActive && (
                          <span style={{ background: '#FFD700', color: '#000', fontSize: 9, fontWeight: 900, padding: '1px 5px', borderRadius: '6px', letterSpacing: 0.5 }}>
                            {lang === 'en' ? 'ACTIVE GROUP' : 'AKTİF GRUP'}
                          </span>
                        )}
                      </div>

                      {/* Kira değerleri tablosu */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(0,0,0,0.25)', borderRadius: '6px', padding: '4px 8px' }}>
                        {info.rents.map((rentVal, i) => (
                          <div key={i} style={{ fontSize: 10.5, color: '#ccc' }}>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>{i + 1} {lang === 'en' ? (i === 0 ? 'Card' : 'Cards') : 'Kart'}:</span> {rentVal}M
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
      const displayName = translateCard(card, lang).name;

      return (
        <Modal title={lang === 'en' ? '🔍 CARD DETAILS' : '🔍 KART DETAYLARI'} onClose={() => setModal(null)}>
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
                <CardVisual card={card} small={false} lang={lang} />
              </div>
            </div>

            {/* Right Column: Card Rents or Description */}
            <div style={{ flex: 1, color: '#fff', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <h3 style={{ color: cardThemeColor, margin: 0, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                {displayName}
              </h3>

              <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 6, color: '#aaa', display: 'inline-flex', alignSelf: 'flex-start' }}>
                {lang === 'en' ? 'Value:' : 'Değer:'} <b style={{ color: '#FFD700', marginLeft: 4 }}>{card.value}M {lang === 'en' ? 'Cash' : 'Nakit'}</b>
              </div>

              {isProp && baseColor?.rents && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 'black', color: '#FFD700', fontSize: 11, letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 6, marginBottom: 4 }}>{lang === 'en' ? 'RENT TABLE' : 'KİRA TABLOSU'}</div>
                  {baseColor.rents.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 'bold' }}>
                      <span style={{ color: '#ccc' }}>{i + 1} {lang === 'en' ? 'Cards Owned:' : 'Kart Sahipliği:'}</span>
                      <span style={{ color: '#2ECC71' }}>{r}M</span>
                    </div>
                  ))}
                </div>
              )}

              {(isAction || card.description) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 'bold', color: '#FFD700', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, marginBottom: 4 }}>{lang === 'en' ? 'CARD DESCRIPTION' : 'KART AÇIKLAMASI'}</div>
                  <p style={{ lineHeight: 1.5, margin: 0, fontSize: 12, color: '#eee' }}>
                    {getDetailedCardTip(card, lang)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      );
    }
    if (modal.type === 'auth') {
      return (
        <Modal title={authMode === 'login' ? '🔑 Üye Girişi' : '📝 Kayıt Ol'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 280 }}>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4, fontWeight: 'bold' }}>KULLANICI ADI</label>
              <input
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
                placeholder="kullanici_adi"
                style={{ ...inputStyle, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4, fontWeight: 'bold' }}>ŞİFRE</label>
              <input
                type="password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                placeholder="••••••"
                style={{ ...inputStyle, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              />
            </div>

            <button
              onClick={() => {
                if (authMode === 'login') {
                  handleDbLogin(authUsername, authPassword);
                } else {
                  handleDbRegister(authUsername, authPassword);
                }
              }}
              style={{ ...btnStyle('linear-gradient(135deg, #9b59b6, #8e44ad)'), margin: '10px 0 0 0', padding: 12, borderRadius: 8 }}
            >
              {authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 12, marginTop: 10 }}>
              {authMode === 'login' ? (
                <span style={{ color: '#94a3b8' }}>
                  Hesabınız yok mu?{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('register'); }} style={{ color: '#9b59b6', fontWeight: 'bold', textDecoration: 'none' }}>Kayıt Olun</a>
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  Zaten üye misiniz?{' '}
                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('login'); }} style={{ color: '#9b59b6', fontWeight: 'bold', textDecoration: 'none' }}>Giriş Yapın</a>
                </span>
              )}
            </div>
          </div>
        </Modal>
      );
    }

    if (modal.type === 'leaderboard') {
      return (
        <Modal title="🏆 LİDERLİK TABLOSU (GLOBAL)" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 320, maxHeight: 400, overflowY: 'auto', paddingRight: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, fontSize: 11, fontWeight: 'bold', color: '#94a3b8' }}>
              <span>Sıra</span>
              <span>Oyuncu</span>
              <span style={{ textAlign: 'center' }}>Zafer</span>
              <span style={{ textAlign: 'center' }}>Puan</span>
            </div>
            {leaderboard.map((item) => (
              <div
                key={item.username}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 60px 60px',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  fontSize: 12,
                  background: item.username === dbUser?.username ? 'rgba(255,215,0,0.05)' : 'transparent',
                  borderRadius: 6
                }}
              >
                <span style={{ fontWeight: 'bold', color: item.rank === 1 ? '#FFD700' : item.rank === 2 ? '#C0C0C0' : item.rank === 3 ? '#CD7F32' : '#718096' }}>
                  #{item.rank}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img
                    src={`https://api.dicebear.com/7.x/${item.avatar || 'avataaars'}/svg?seed=${item.username}`}
                    alt=""
                    style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}
                  />
                  <span style={{ fontWeight: item.username === dbUser?.username ? 'bold' : 'normal', color: item.username === dbUser?.username ? '#FFD700' : '#fff' }}>
                    {item.displayName || item.username}
                  </span>
                </div>
                <span style={{ textAlign: 'center', fontWeight: 'bold', color: '#2ECC71' }}>{item.wins}</span>
                <span style={{ textAlign: 'center', fontWeight: 'bold', color: '#F1C40F' }}>{item.points}</span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic', padding: 20 }}>Henüz kayıtlı üye bulunmuyor.</div>
            )}
          </div>
        </Modal>
      );
    }

    return null;
  };

  // ---- LOBİ AYARLARI PANELİ OLUŞTURUCU ----
  const renderRoomSettings = (disabled = false) => {
    const selStyle = { background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', outline: 'none', cursor: 'pointer', fontSize: 13, width: '100%', boxSizing: 'border-box' };
    return (
      <details className="settings-details" style={{ pointerEvents: disabled ? 'none' : 'auto', opacity: disabled ? 0.8 : 1, marginTop: 12, width: '100%' }}>
        <summary style={{ fontWeight: 800, color: '#FFD700', letterSpacing: 0.5, cursor: 'pointer', padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{lang === 'en' ? '⚙️ ADVANCED ROOM SETTINGS' : '⚙️ GELİŞMİŞ OYUN AYARLARI'}</summary>
        <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
          
          {/* Hazır Şablonlar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,215,0,0.05)', borderRadius: 10, border: '1px solid rgba(255,215,0,0.15)' }}>
            <span style={{ fontSize: 12, color: '#FFD700', fontWeight: 'bold' }}>{lang === 'en' ? '🎮 Presets:' : '🎮 Hazır Şablonlar:'}</span>
            <select onChange={e => e.target.value && applyPreset(e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #FFD700', borderRadius: 8, padding: '6px 12px', outline: 'none', cursor: 'pointer', fontSize: 11 }}>
              <option value="">{lang === 'en' ? 'Select Preset...' : 'Şablon Seç...'}</option>
              <option value="classic">{lang === 'en' ? '🎲 Classic Mode' : '🎲 Klasik Mod'}</option>
              <option value="speed">{lang === 'en' ? '⚡ Speed Mode' : '⚡ Hızlı Başlangıç'}</option>
              <option value="chaos">{lang === 'en' ? '🔥 Chaos Mode' : '🔥 Kaos Modu'}</option>
            </select>
          </div>

          {/* Bölüm 1: Genel Akış ve Hedefler */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ color: '#3498DB', fontSize: 11, fontWeight: 900, margin: '0 0 10px 0', letterSpacing: 1, textTransform: 'uppercase' }}>{lang === 'en' ? '⚡ GAME FLOW' : '⚡ OYUN AKIŞI'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#a0aec0', display: 'block', marginBottom: 4 }}>{lang === 'en' ? 'Win Condition:' : 'Kazanma Hedefi:'}</span>
                  <select value={roomSettings.winSets} onChange={e => setRoomSettings(prev => ({ ...prev, winSets: Number(e.target.value) }))} style={selStyle}>
                    <option value={2}>{lang === 'en' ? '2 Sets (Fast)' : '2 Set (Hızlı)'}</option>
                    <option value={3}>{lang === 'en' ? '3 Sets (Classic)' : '3 Set (Klasik)'}</option>
                    <option value={4}>{lang === 'en' ? '4 Sets (Long)' : '4 Set (Uzun)'}</option>
                    <option value={5}>{lang === 'en' ? '5 Sets (Epic)' : '5 Set (Destansı)'}</option>
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#a0aec0', display: 'block', marginBottom: 4 }}>{lang === 'en' ? 'Starting Hand:' : 'Başlangıç El Kartı:'}</span>
                  <select value={roomSettings.startCards} onChange={e => setRoomSettings(prev => ({ ...prev, startCards: Number(e.target.value) }))} style={selStyle}>
                    <option value={5}>{lang === 'en' ? '5 Cards (Standard)' : '5 Kart (Standart)'}</option>
                    <option value={7}>{lang === 'en' ? '7 Cards (Fast)' : '7 Kart (Hızlı)'}</option>
                    <option value={10}>{lang === 'en' ? '10 Cards (Chaos)' : '10 Kart (Kaos)'}</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#a0aec0', display: 'block', marginBottom: 4 }}>{lang === 'en' ? 'Turn Time:' : 'Hamle Süresi:'}</span>
                  <select value={roomSettings.turnTimer} onChange={e => setRoomSettings(prev => ({ ...prev, turnTimer: Number(e.target.value) }))} style={selStyle}>
                    <option value={0}>{lang === 'en' ? 'Unlimited' : 'Sınırsız (Klasik)'}</option>
                    <option value={30}>{lang === 'en' ? '30 Seconds' : '30 Saniye'}</option>
                    <option value={60}>{lang === 'en' ? '60 Seconds' : '60 Saniye'}</option>
                    <option value={120}>{lang === 'en' ? '2 Minutes' : '2 Dakika'}</option>
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#a0aec0', display: 'block', marginBottom: 4 }}>{lang === 'en' ? 'Bot Difficulty:' : 'Bot Zorluğu:'}</span>
                  <select value={roomSettings.botDifficulty || 'medium'} onChange={e => setRoomSettings(prev => ({ ...prev, botDifficulty: e.target.value }))} style={selStyle}>
                    <option value="easy">{lang === 'en' ? 'Easy' : 'Kolay'}</option>
                    <option value="medium">{lang === 'en' ? 'Medium' : 'Orta'}</option>
                    <option value="hard">{lang === 'en' ? 'Hard (Aggressive)' : 'Zor (Agresif)'}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Bölüm 2: Özel Kurallar */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ color: '#E67E22', fontSize: 11, fontWeight: 900, margin: '0 0 10px 0', letterSpacing: 1, textTransform: 'uppercase' }}>{lang === 'en' ? '🛡️ SPECIAL RULES' : '🛡️ ÖZEL KURALLAR'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '⏱️ Auto End Turn (after 3 moves)' : '⏱️ Eli Otomatik Bitir (3 Hamle)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.autoEndTurn} onChange={e => setRoomSettings(prev => ({ ...prev, autoEndTurn: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🛡️ Allow Counter Just Say No' : '🛡️ Çifte Reddet (Savunmaya İtiraz)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.allowCounterJustSayNo} onChange={e => setRoomSettings(prev => ({ ...prev, allowCounterJustSayNo: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🔒 Lock Wildcards after placing' : '🔒 Joker Kilidi (Renk Sabitlenir)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.lockWildcards} onChange={e => setRoomSettings(prev => ({ ...prev, lockWildcards: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🔁 Allow Property Trades' : '🔁 Barışçıl Takas İzni'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.allowTrades} onChange={e => setRoomSettings(prev => ({ ...prev, allowTrades: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#a0aec0', display: 'block', marginBottom: 4 }}>{lang === 'en' ? 'Extra Deal Breakers:' : 'İlave Deal Breaker (Set Çalma):'}</span>
                <select value={roomSettings.extraDealBreakers} onChange={e => setRoomSettings(prev => ({ ...prev, extraDealBreakers: Number(e.target.value) }))} style={selStyle}>
                  <option value={0}>{lang === 'en' ? 'None (Original 2 Cards)' : 'Yok (Orijinal 2 Kart)'}</option>
                  <option value={1}>{lang === 'en' ? '+1 Card (Total 3)' : '+1 Kart (Toplam 3)'}</option>
                  <option value={3}>{lang === 'en' ? '+3 Cards (Chaos!)' : '+3 Kart (Kaos!)'}</option>
                </select>
              </div>

            </div>
          </div>

          {/* Bölüm 3: Modlar ve Eğlence */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ color: '#2ECC71', fontSize: 11, fontWeight: 900, margin: '0 0 10px 0', letterSpacing: 1, textTransform: 'uppercase' }}>{lang === 'en' ? '🔥 FUN MODES' : '🔥 EĞLENCE MODLARI'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '👁️‍🗨️ Open Hands (Training)' : '👁️‍🗨️ Açık El Modu (Antrenman)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.openHands} onChange={e => setRoomSettings(prev => ({ ...prev, openHands: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '⚡ Fast Challenge (15s JSN limit)' : '⚡ Hızlı Reddet (15sn Savunma limit)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.fastChallenge} onChange={e => setRoomSettings(prev => ({ ...prev, fastChallenge: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🕵️ Street Thugs (Black Market)' : '🕵️ Sokak Haydutları (Karaborsa)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.streetThugs} onChange={e => setRoomSettings(prev => ({ ...prev, streetThugs: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🎲 Gambler\'s Die (Gamble roll)' : '🎲 Kumarbazın Zarı (Şans zarı)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.gambleZari} onChange={e => setRoomSettings(prev => ({ ...prev, gambleZari: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🐿️ Thief Squirrel Cards' : '🐿️ Hırsız Sincap Kartları'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.thiefSquirrelEnabled} onChange={e => setRoomSettings(prev => ({ ...prev, thiefSquirrelEnabled: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>

            </div>
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
      const countFn = (c) => { if (c?.key === key) visible++; };
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
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16
        }}>
          <p style={{ color: '#a0aec0', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
            Bu panel; elinizdeki, ortadaki ve ıskartadaki kartları hesaplayarak desteden çekilme ihtimallerini gösterir.
            <span style={{ display: 'block', color: '#ffb020', marginTop: 4, fontWeight: 'bold' }}>
              Bilinmeyen Kart Havuzu: {unknownCardsCount} kart (Deste + Rakiplerin Elleri)
            </span>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(categories).map(([cat, items]) => (
            <div key={cat}>
              <div style={{
                color: '#FFD700',
                fontSize: 13,
                fontWeight: '800',
                marginBottom: 10,
                borderBottom: '1px solid rgba(255,215,0,0.2)',
                paddingBottom: 6,
                letterSpacing: '0.4px'
              }}>
                {cat}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                {items.map(item => {
                  const prob = parseFloat(item.probability);
                  let probColor = '#E74C3C'; // Low probability
                  let probBg = 'rgba(231, 76, 60, 0.1)';
                  if (prob >= 15) {
                    probColor = '#2ECC71';
                    probBg = 'rgba(46, 204, 113, 0.1)';
                  } else if (prob >= 5) {
                    probColor = '#F39C12';
                    probBg = 'rgba(243, 156, 18, 0.1)';
                  }

                  return (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        padding: '10px 12px',
                        borderRadius: 8,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
                    >
                      <span style={{ color: '#CBD5E0', fontWeight: '500', marginRight: 8 }}>{getName(item.key)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          color: probColor,
                          background: probBg,
                          padding: '2px 6px',
                          borderRadius: 6,
                          fontWeight: '800',
                          fontSize: 10
                        }}>
                          %{item.probability}
                        </span>
                        <b style={{
                          color: item.remaining > 0 ? '#fff' : '#a0aec0',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11
                        }}>
                          {item.remaining} / {item.total}
                        </b>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    );
  };

  // ── REDDET! (Just Say No) YANIT MODALI ──
  // ── REDDET! (Just Say No) YANIT MODALI ──
  const renderChallengeModal = () => {
    if (!gameState?.myPendingChallenge) return null;
    const ch = gameState.myPendingChallenge;
    const iAmDefender = ch.responderId === playerId;
    if (!iAmDefender) return null; // sadece sırası gelen oyuncu görür

    const haveJustSayNo = me?.hasJustSayNo;
    const isCounter = ch.responderId === ch.sourceId; // sıra orijinal oyuncuya geri döndü (karşı-Reddet)

    let description = '';
    let alertTitle = 'AKSİYON YANITI BEKLENİYOR';
    let alertColor = '#e11d48';
    let alertIcon = '⚡';

    switch (ch.action) {
      case 'rent':
        description = `${ch.sourceName} sizden kira istiyor: ${ch.data.amount}M (${ch.data.reason})`;
        alertTitle = 'KİRA ÖDEMESİ';
        alertColor = '#e67e22';
        alertIcon = '🧾';
        break;
      case 'birthday':
        description = `${ch.sourceName} "Doğum Günüm!" oynadı, sizden 2M hediye istiyor`;
        alertTitle = 'DOĞUM GÜNÜ HEDİYESİ';
        alertColor = '#ec4899';
        alertIcon = '🎂';
        break;
      case 'debtcollector':
        description = `${ch.sourceName} "Borç Tahsildarı" oynadı, sizden 5M istiyor`;
        alertTitle = 'BORÇ TAHSİLATI';
        alertColor = '#3b82f6';
        alertIcon = '💸';
        break;
      case 'slydeal':
        description = `${ch.sourceName} sizin "${ch.data.cardName}" arazinizi çalmak istiyor (Sinsi Anlaşma)`;
        alertTitle = 'SİNSİ ANLAŞMA (HIRSIZLIK)';
        alertColor = '#a855f7';
        alertIcon = '🥷';
        break;
      case 'forceddeal':
        description = `${ch.sourceName} sizin "${ch.data.myCardName}" araziniz ile kendi "${ch.data.theirCardName}" arazisini takas etmek istiyor (Zorunlu Anlaşma)`;
        alertTitle = 'ZORUNLU ANLAŞMA';
        alertColor = '#eab308';
        alertIcon = '🔁';
        break;
      case 'dealbreaker':
        description = `${ch.sourceName} sizin tamamlanmış ${COLOR_INFO[ch.data.targetColor]?.name || ch.data.targetColor} setinizi çalmak istiyor (Anlaşma Bozucu)!`;
        alertTitle = 'ANLAŞMA BOZUCU!';
        alertColor = '#dc2626';
        alertIcon = '💣';
        break;
      default:
        description = `${ch.sourceName} size karşı bir aksiyon başlattı`;
    }

    if (isCounter) {
      alertTitle = lang === 'en' ? 'COUNTER JUST SAY NO!' : 'KARŞI REDDET!';
      alertColor = '#eab308';
      alertIcon = '🛡️';
    }

    let opponentCard = null;
    if (isCounter) {
      opponentCard = { type: 'action', action: 'justsayno', name: lang === 'en' ? 'Just Say No!' : 'Reddet!', value: 4, key: 'action_justsayno' };
    } else {
      switch (ch.action) {
        case 'rent': opponentCard = { type: 'action', action: 'rent', name: lang === 'en' ? 'Rent Card' : 'Kira Kartı', value: 1, key: 'rent_all' }; break;
        case 'birthday': opponentCard = { type: 'action', action: 'birthday', name: lang === 'en' ? 'Its My Birthday' : 'Doğum Günü', value: 2, key: 'action_birthday' }; break;
        case 'debtcollector': opponentCard = { type: 'action', action: 'debtcollector', name: lang === 'en' ? 'Debt Collector' : 'Borç Tahsildarı', value: 3, key: 'action_debtcollector' }; break;
        case 'slydeal': opponentCard = { type: 'action', action: 'slydeal', name: lang === 'en' ? 'Sly Deal' : 'Sinsi Anlaşma', value: 3, key: 'action_slydeal' }; break;
        case 'forceddeal': opponentCard = { type: 'action', action: 'forceddeal', name: lang === 'en' ? 'Forced Deal' : 'Zorunlu Anlaşma', value: 3, key: 'action_forceddeal' }; break;
        case 'dealbreaker': opponentCard = { type: 'action', action: 'dealbreaker', name: lang === 'en' ? 'Deal Breaker' : 'Anlaşma Bozucu', value: 5, key: 'action_dealbreaker' }; break;
        default: opponentCard = { type: 'action', action: 'passgo', name: lang === 'en' ? 'Pass Go' : 'Pas Geç', value: 1, key: 'action_passgo' };
      }
    }

    return (
      <Modal title={isCounter ? (lang === 'en' ? '🛡️ Counter with Just Say No!' : '🛡️ Karşı Reddet! Şansın!') : `⚠️ ${alertTitle}`} onClose={() => { }}>
        <div className="modal-split-layout">
          {/* Left Column: 3D Card Preview */}
          <div style={{
            perspective: '1000px',
            width: 132 * 1.15,
            height: 192 * 1.15,
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
              <CardVisual card={opponentCard} small={false} lang={lang} />
            </div>
          </div>

          {/* Right Column: Actions / Options */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
            <div style={{
              background: `${alertColor}15`,
              border: `1px solid ${alertColor}40`,
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <span style={{ fontSize: 20 }}>{alertIcon}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: alertColor, letterSpacing: 0.5 }}>{alertTitle}</span>
            </div>

            <p style={{ color: '#E2E8F0', fontSize: 14, margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
              {description}
            </p>

            {isCounter && (
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
                Rakibiniz az önce "Reddet!" kartınızı savunmak için kendi "Reddet!" kartını oynadı. Eğer elinizde başka bir "Reddet!" varsa, onu kullanarak hamleyi yeniden geçerli kılabilirsiniz!
              </p>
            )}

            {gameState.fastChallenge && (
              <div style={{
                background: 'rgba(231, 76, 60, 0.08)',
                border: '1px solid rgba(231, 76, 60, 0.2)',
                borderRadius: 8,
                padding: '6px 12px',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                ⏱️ Kabul edilmesine kalan süre: <span style={{ color: '#fff', background: '#ef4444', padding: '1px 6px', borderRadius: 4 }}>{challengeTime}s</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {haveJustSayNo ? (
                <div style={{
                  background: 'rgba(255,215,0,0.03)',
                  border: '1px solid rgba(255,215,0,0.2)',
                  borderRadius: 12,
                  padding: 12,
                  boxShadow: '0 4px 15px rgba(255,215,0,0.02)'
                }}>
                  <div style={{ fontSize: 10, color: '#FFD700', fontWeight: 800, textAlign: 'center', marginBottom: 10, letterSpacing: 0.5 }}>
                    {lang === 'en' ? '🛡️ YOU HAVE A DEFENSE CARD! (Click to use)' : '🛡️ ELİNİZDE SAVUNMA KARTI VAR! (Kullanmak için tıkla)'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContext: 'center', justifyContent: 'center' }}>
                    {(me?.hand || []).filter(c => c.action === 'justsayno').map(c => (
                      <div key={c.id}
                        onClick={() => handleRespondChallenge(ch.id, true)}
                        onMouseEnter={() => handleCardHover(c)}
                        onMouseLeave={() => handleCardHover(null)}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.08) translateY(-4px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <CardVisual card={c} small lang={lang} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(231,76,60,0.06)', border: '1px dashed rgba(231,76,60,0.2)', borderRadius: 10, padding: 12, color: '#ef4444', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                  🛡️ Elinizde "Reddet!" (Just Say No) savunma kartı bulunmuyor.
                </div>
              )}

              <button
                onClick={() => handleRespondChallenge(ch.id, false)}
                style={{
                  ...btnStyle(isCounter ? 'linear-gradient(135deg, #475569, #334155)' : 'linear-gradient(135deg, #10b981, #059669)'),
                  width: '100%',
                  padding: '12px',
                  fontSize: 13,
                  height: 44,
                  borderRadius: 8,
                  margin: 0,
                  boxShadow: isCounter ? 'none' : '0 4px 15px rgba(16,185,129,0.3)'
                }}
              >
                {isCounter ? 'İtiraz Etme, Hamle İptal Kalsın' : 'Kabul Et ve Öde / Kartı Devret'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  // ── ÖDEME MODALI ──
  const renderPaymentModal = () => {
    if (!gameState?.myPendingPayment) return null;
    const payment = gameState.myPendingPayment;
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

    let paymentCard = null;
    if (payment.reason.toLowerCase().includes('doğum günü') || payment.reason.toLowerCase().includes('birthday')) {
      paymentCard = { type: 'action', action: 'birthday', name: 'Doğum Günü', value: 2, key: 'action_birthday' };
    } else if (payment.reason.toLowerCase().includes('borç') || payment.reason.toLowerCase().includes('debt')) {
      paymentCard = { type: 'action', action: 'debtcollector', name: 'Borç Tahsildarı', value: 3, key: 'action_debtcollector' };
    } else {
      paymentCard = { type: 'action', action: 'rent', name: 'Kira Ödemesi', value: payment.amount, key: 'rent_all' };
    }

    return (
      <Modal title="💸 Ödeme Yap" onClose={() => { }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>

          {/* Üst Bilgi Kartı */}
          <div style={{
            background: 'rgba(231, 76, 60, 0.08)',
            border: '1px solid rgba(231, 76, 60, 0.2)',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ color: '#E2E8F0', fontSize: 14, fontWeight: 600 }}>
                <b style={{ color: '#FFD700' }}>{payment.collectorName}</b>'e toplam <b style={{ color: '#ef4444', fontSize: 16 }}>{payment.amount}M</b> ödemeniz gerekiyor.
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>Gerekçe: {payment.reason}</div>
            </div>
            {/* Küçük Görsel Önizleme */}
            <div style={{ width: 44, height: 60, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', flexShrink: 0 }}>
              <CardVisual card={paymentCard} small />
            </div>
          </div>

          {/* Hızlı Seçim Yardımcı Araçları (Daha uzakta, güvenli butonlar) */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <button
              onClick={() => { sfxClick(); handleAutoSelectPayment(); }}
              style={{ ...btnStyle('rgba(46, 204, 113, 0.12)'), border: '1px solid rgba(46, 204, 113, 0.3)', color: '#2ECC71', padding: '6px 12px', fontSize: 11, minHeight: 'auto', borderRadius: 8, margin: 0 }}
            >
              🤖 Otomatik Seç (Öncelikli Para)
            </button>
            <button
              onClick={() => { sfxClick(); handleSelectAllPayment(); }}
              style={{ ...btnStyle('rgba(255,255,255,0.05)'), border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '6px 12px', fontSize: 11, minHeight: 'auto', borderRadius: 8, margin: 0 }}
            >
              Tümünü Seç
            </button>
            <button
              onClick={() => { sfxClick(); handleClearPaymentSelection(); }}
              style={{ ...btnStyle('rgba(231, 76, 60, 0.05)'), border: '1px solid rgba(231, 76, 60, 0.15)', color: '#e74c3c', padding: '6px 12px', fontSize: 11, minHeight: 'auto', borderRadius: 8, margin: 0 }}
            >
              Temizle
            </button>
          </div>

          {/* Kart Grupları (Yatay Kaydırılabilir Şeritler - Mobil Dostu) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {hasBank && (
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#10b981', fontWeight: 900, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>💵 Banka Kasasındaki Paralar</div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, WebkitOverflowScrolling: 'touch' }}>
                  {(me?.bank || []).map(c => {
                    const isSelected = paymentSelection.bankCardIds.includes(c.id);
                    return (
                      <div key={c.id}
                        onTouchStart={handleTouchStart}
                        onClick={(e) => {
                          if (isClickTouchScroll(e)) return;
                          togglePaymentBankCard(c.id);
                        }}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'scale(1.04) translateY(-2px)' : 'none',
                          border: isSelected ? '3px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10,
                          position: 'relative',
                          flexShrink: 0,
                          boxShadow: isSelected ? '0 6px 15px rgba(16,185,129,0.3)' : 'none'
                        }}
                      >
                        <CardVisual card={c} small />
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#10b981', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 'bold', zIndex: 10
                          }}>✓</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasProps && (
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 900, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>🏠 Tapu Senetleriniz (Mülkleriniz)</div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, WebkitOverflowScrolling: 'touch' }}>
                  {Object.entries(me?.properties || {}).flatMap(([color, cards]) => cards.map(c => {
                    const isSelected = paymentSelection.propertyCardIds.includes(c.id);

                    // Akıllı Uyarı Mantığı (Danger Glow)
                    const collector = gameState.players.find(p => p.id === payment.collectorId);
                    let isDangerous = false;
                    if (collector) {
                      if (c.isWild) isDangerous = true;
                      else {
                        const cColors = c.isDual ? c.colors : [c.color];
                        isDangerous = cColors.some(clr => collector.properties?.[clr]?.length > 0);
                      }
                    }

                    return (
                      <div key={c.id}
                        className={isDangerous && !isSelected ? 'danger-glow' : ''}
                        onTouchStart={handleTouchStart}
                        onClick={(e) => {
                          if (isClickTouchScroll(e)) return;
                          togglePaymentPropertyCard(c.id);
                        }}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'scale(1.04) translateY(-2px)' : 'none',
                          border: isSelected ? '3px solid #f59e0b' : (isDangerous ? '1px dashed #ef4444' : '1px solid rgba(255,255,255,0.1)'),
                          borderRadius: 10,
                          position: 'relative',
                          flexShrink: 0,
                          boxShadow: isSelected ? '0 6px 15px rgba(245,158,11,0.3)' : 'none'
                        }}
                      >
                        <CardVisual card={c} small />
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#f59e0b', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 'bold', zIndex: 10
                          }}>✓</div>
                        )}
                        {isDangerous && !isSelected && (
                          <div style={{
                            position: 'absolute', bottom: 4, right: 4,
                            background: '#ef4444', color: '#fff',
                            padding: '1px 5px', borderRadius: 4,
                            fontSize: 8, fontWeight: 'bold', zIndex: 10
                          }}>🚨 TEHLİKE</div>
                        )}
                      </div>
                    );
                  }))}
                </div>
              </div>
            )}

          </div>

          {/* Alt Ödeme Gönderme Bölümü */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ color: selectedTotal >= payment.amount ? '#10b981' : '#f59e0b', fontWeight: 900, fontSize: 13.5 }}>
                Seçilen Toplam: <span style={{ fontSize: 16, color: selectedTotal >= payment.amount ? '#10b981' : '#f59e0b' }}>{selectedTotal}M</span> / {payment.amount}M
                {selectedTotal < payment.amount && selectedTotal === totalAssets && totalAssets > 0 && (
                  <span style={{ color: '#ef4444', display: 'block', fontSize: 11, fontWeight: 'normal', marginTop: 2 }}>⚠️ Tüm varlığınızla ödeme yapıyorsunuz</span>
                )}
              </div>
            </div>

            <button onClick={handleSubmitPayment} disabled={!canSubmit}
              style={{
                ...btnStyle('#10b981'),
                width: '100%',
                padding: '12px',
                opacity: canSubmit ? 1 : 0.4,
                fontSize: 14,
                fontWeight: 900,
                height: 48,
                borderRadius: 10,
                margin: 0,
                boxShadow: canSubmit ? '0 4px 15px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              Ödeme Gönder ({selectedTotal}M)
            </button>
          </div>

        </div>
      </Modal>
    );
  };

  const renderTradeModal = () => {
    if (modal?.type === 'proposeTrade') {
      const target = gameState.players.find(p => p.id === modal.targetId);
      const toggle = (type, id) => setTradeSelection(p => ({ ...p, [type]: p[type].includes(id) ? p[type].filter(x => x !== id) : [...p[type], id] }));
      const canSubmit = tradeSelection.offerBankIds.length + tradeSelection.offerPropIds.length + tradeSelection.requestBankIds.length + tradeSelection.requestPropIds.length > 0;
      return (
        <Modal title={`🤝 ${target?.name} İle Takas Yap`} onClose={() => setModal(null)}>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            Karşılıklı anlaşmaya dayalı olarak kart takas edin. Detaylar onay için karşı tarafa iletilir.
          </div>
          <div style={{ display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Give Panel */}
            <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: 14, borderRadius: 12 }}>
              <div style={{ color: '#f87171', fontWeight: 800, marginBottom: 12, fontSize: 13, letterSpacing: 0.5 }}>📤 NE VERECEKSİN? (SENİN)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: '200px', overflowY: 'auto' }}>
                {(me?.bank || []).map(c => (
                  <div key={c.id}
                    onTouchStart={handleTouchStart}
                    onClick={(e) => {
                      if (isClickTouchScroll(e)) return;
                      toggle('offerBankIds', c.id);
                    }}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s', opacity: tradeSelection.offerBankIds.includes(c.id) ? 1 : 0.35 }}
                  >
                    <CardVisual card={c} small />
                  </div>
                ))}
                {Object.values(me?.properties || {}).flat().map(c => (
                  <div key={c.id}
                    onTouchStart={handleTouchStart}
                    onClick={(e) => {
                      if (isClickTouchScroll(e)) return;
                      toggle('offerPropIds', c.id);
                    }}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s', opacity: tradeSelection.offerPropIds.includes(c.id) ? 1 : 0.35 }}
                  >
                    <CardVisual card={c} small />
                  </div>
                ))}
                {(me?.bank || []).length === 0 && Object.values(me?.properties || {}).flat().length === 0 && (
                  <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>Verebileceğiniz varlığınız yok</span>
                )}
              </div>
            </div>

            {/* Take Panel */}
            <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: 14, borderRadius: 12 }}>
              <div style={{ color: '#34d399', fontWeight: 800, marginBottom: 12, fontSize: 13, letterSpacing: 0.5 }}>📥 NE ALACAKSIN? ({target?.name.toUpperCase()})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: '200px', overflowY: 'auto' }}>
                {target.bank.map(c => (
                  <div key={c.id}
                    onTouchStart={handleTouchStart}
                    onClick={(e) => {
                      if (isClickTouchScroll(e)) return;
                      toggle('requestBankIds', c.id);
                    }}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s', opacity: tradeSelection.requestBankIds.includes(c.id) ? 1 : 0.35 }}
                  >
                    <CardVisual card={c} small />
                  </div>
                ))}
                {Object.values(target.properties).flat().map(c => (
                  <div key={c.id}
                    onTouchStart={handleTouchStart}
                    onClick={(e) => {
                      if (isClickTouchScroll(e)) return;
                      toggle('requestPropIds', c.id);
                    }}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s', opacity: tradeSelection.requestPropIds.includes(c.id) ? 1 : 0.35 }}
                  >
                    <CardVisual card={c} small />
                  </div>
                ))}
                {target.bank.length === 0 && Object.values(target.properties).flat().length === 0 && (
                  <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>Oyuncunun alınabilecek varlığı yok</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleProposeTrade(target.id)}
            disabled={!canSubmit}
            style={{
              ...btnStyle('linear-gradient(135deg, #10b981, #059669)'),
              width: '100%',
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              opacity: canSubmit ? 1 : 0.4,
              boxShadow: canSubmit ? '0 4px 15px rgba(16,185,129,0.3)' : 'none',
              margin: '16px 0 0 0'
            }}
          >
            🤝 Takas Teklifini Gönder
          </button>
        </Modal>
      );
    }

    return null;
  };

  // ---- LOBBY ----
  if (screen === 'lobby') {
    return (
      <div className="lobby-imperial-bg" style={{ minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', position: 'relative', overflowX: 'hidden' }}>
        {/* Floating Ambient Lights */}
        <div className="ambient-aura ambient-aura-1" />
        <div className="ambient-aura ambient-aura-2" />

        {/* PREMIUM NAVIGATION / HEADER BAR */}
        <header style={{
          width: '100%',
          maxWidth: 640,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(22, 30, 49, 0.45)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          marginBottom: 20,
          zIndex: 10,
          boxSizing: 'border-box'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24, filter: 'drop-shadow(0 2px 6px rgba(255, 215, 0, 0.3))' }}>🏰</span>
            <span style={{ color: '#FFD700', fontSize: 16, fontWeight: 950, letterSpacing: '0.5px' }}>Castle Deal</span>
          </div>

          {/* User Profile Info or Auth Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => {
                const nextLang = lang === 'tr' ? 'en' : 'tr';
                setLang(nextLang);
                localStorage.setItem('md_lang', nextLang);
                sfxClick();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
            </button>
            {dbUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 20 }}>
                <img
                  src={`https://api.dicebear.com/7.x/${dbUser.avatar || 'avataaars'}/svg?seed=${dbUser.username}`}
                  alt="avatar"
                  style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: '#FFD700', lineHeight: 1.1 }}>{dbUser.displayName || dbUser.display_name || dbUser.username}</span>
                  <span style={{ fontSize: 8, color: '#a0aec0', marginTop: 1 }}>🏆 {dbUser.wins || 0} Zafer | 🪙 {dbUser.points || 100} Puan</span>
                </div>
                <button onClick={handleDbLogout} style={{ background: 'rgba(231, 76, 60, 0.15)', border: '1px solid rgba(231, 76, 60, 0.3)', color: '#E74C3C', padding: '1px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 8, fontWeight: 'bold', marginLeft: 4 }}>Çıkış</button>
              </div>
            ) : (
              <button onClick={() => { setAuthMode('login'); setModal({ type: 'auth' }); sfxClick(); }} style={{ ...btnStyle('linear-gradient(135deg, #9b59b6, #8e44ad)'), margin: 0, padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 900, boxShadow: '0 4px 10px rgba(155,89,182,0.2)' }}>
                🔑 Giriş
              </button>
            )}

            <button onClick={() => { handleOpenLeaderboard(); sfxClick(); }} style={{ ...btnStyle('linear-gradient(135deg, #f1c40f, #f39c12)'), margin: 0, padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 900, boxShadow: '0 4px 10px rgba(241,196,15,0.2)' }}>
              🏆 Sıralama
            </button>
          </div>
        </header>

        {/* MAIN CONTAINER */}
        <div className="glass-card" style={{ width: '100%', maxWidth: 640, boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)', padding: 18, zIndex: 1, boxSizing: 'border-box' }}>
          
          {/* USER IDENTITY FORM */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 10, color: '#FFD700', fontWeight: 900, marginBottom: 12, letterSpacing: 1.5, textTransform: 'uppercase' }}>👤 KİMLİĞİNİ OLUŞTUR</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', minHeight: 52 }}>
              {AVATAR_STYLES.map(style => (
                <div key={style} className={myAvatarStyle === style ? 'avatar-halo-active' : ''}>
                  <img
                    src={`https://api.dicebear.com/7.x/${style}/svg?seed=${myName || 'Oyuncu'}`}
                    alt={style}
                    onClick={() => handleSelectAvatar(style)}
                    style={{
                      width: 44, height: 44, borderRadius: '50%', cursor: 'pointer',
                      border: myAvatarStyle === style ? '2.5px solid #FFD700' : '2px solid transparent',
                      background: 'rgba(255,255,255,0.06)',
                      transition: 'all 0.2s ease',
                      transform: myAvatarStyle === style ? 'scale(1.1) translateY(-1px)' : 'scale(1)'
                    }}
                  />
                </div>
              ))}
            </div>
            <input
              value={myName}
              disabled={!!dbUser}
              onChange={e => setMyName(e.target.value)}
              placeholder="Oyuncu Adınızı Yazın..."
              style={{ ...inputStyle, textAlign: 'center', fontSize: 14, fontWeight: 'bold', padding: '10px 14px', background: !!dbUser ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.25)', marginTop: 14, marginBottom: 0, borderRadius: 8, cursor: !!dbUser ? 'not-allowed' : 'text', opacity: !!dbUser ? 0.8 : 1 }}
            />
          </div>

          {/* HOME PANEL VS WAITING ROOM */}
          {!roomCode ? (
            <>
              {/* TABS HEADER FOR MOBILE RESPONSIVENESS */}
              <div className="lobby-tabs" style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.2)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                <button
                  onClick={() => { setLobbyTab('create'); sfxClick(); }}
                  className={`lobby-tab-btn ${lobbyTab === 'create' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: lobbyTab === 'create' ? 'linear-gradient(135deg, #E67E22, #D35400)' : 'transparent',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: lobbyTab === 'create' ? '0 4px 12px rgba(230, 126, 34, 0.3)' : 'none'
                  }}
                >
                  {lang === 'en' ? '🎮 Create Room' : '🎮 Oda Kur'}
                </button>
                <button
                  onClick={() => { setLobbyTab('join'); sfxClick(); }}
                  className={`lobby-tab-btn ${lobbyTab === 'join' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: lobbyTab === 'join' ? 'linear-gradient(135deg, #2ECC71, #27AE60)' : 'transparent',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: lobbyTab === 'join' ? '0 4px 12px rgba(46, 204, 113, 0.3)' : 'none'
                  }}
                >
                  {lang === 'en' ? '🔑 Join Room' : '🔑 Odaya Katıl'}
                </button>
                <button
                  onClick={() => { setLobbyTab('public'); sfxClick(); }}
                  className={`lobby-tab-btn ${lobbyTab === 'public' ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: lobbyTab === 'public' ? 'linear-gradient(135deg, #3498DB, #2980B9)' : 'transparent',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: lobbyTab === 'public' ? '0 4px 12px rgba(52, 152, 219, 0.3)' : 'none'
                  }}
                >
                  {lang === 'en' ? '🌍 Public Rooms' : '🌍 Açık Odalar'} {publicRooms.length > 0 && <span style={{ background: '#E74C3C', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 10, marginLeft: 4 }}>{publicRooms.length}</span>}
                </button>
              </div>

              {/* TAB CONTENT */}
              {lobbyTab === 'create' && (
                <div className="lobby-card-orange" style={{ animation: 'fade-in-slide 0.25s ease-out' }}>
                  <h3 style={{ color: '#E67E22', fontSize: 13, fontWeight: 900, marginBottom: 12, textAlign: 'center', letterSpacing: 0.5 }}>{lang === 'en' ? '✨ CREATE NEW ROOM' : '✨ YENİ OYUN KUR'}</h3>
                  
                  <label className="switch-container" style={{ marginBottom: 12, padding: '8px 12px' }}>
                    <span className="switch-label" style={{ fontSize: 12 }}>{lang === 'en' ? '🌍 Public Room' : '🌍 Herkese Açık'}</span>
                    <input type="checkbox" className="switch-checkbox" checked={roomSettings.isPublic} onChange={e => setRoomSettings(prev => ({ ...prev, isPublic: e.target.checked }))} />
                    <div className="switch-toggle" />
                  </label>

                  {renderRoomSettings()}
                  <div style={{ minHeight: 12 }}></div>
                  <button onClick={handleCreate} className="lobby-action-btn" style={{ ...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'), width: '100%', padding: '12px', fontSize: 13, borderRadius: 8, margin: 0 }}>
                    {lang === 'en' ? '🚀 Create Room' : '🚀 Oda Oluştur'}
                  </button>
                </div>
              )}

              {lobbyTab === 'join' && (
                <div className="lobby-card-green" style={{ animation: 'fade-in-slide 0.25s ease-out' }}>
                  <h3 style={{ color: '#2ECC71', fontSize: 13, fontWeight: 900, marginBottom: 12, textAlign: 'center', letterSpacing: 0.5 }}>{lang === 'en' ? '🔑 JOIN PRIVATE ROOM' : '🔑 ÖZEL ODAYA KATIL'}</h3>
                  <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder={lang === 'en' ? 'Room Code' : 'Oda Kodu'} style={{ ...inputStyle, letterSpacing: 3, textAlign: 'center', fontWeight: 'bold', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(46,204,113,0.25)', marginBottom: 12, borderRadius: 8 }} />
                  <div style={{ minHeight: 12 }}></div>
                  <button onClick={handleJoin} className="lobby-action-btn" style={{ ...btnStyle('linear-gradient(135deg, #2ECC71, #27AE60)'), width: '100%', padding: '12px', fontSize: 13, borderRadius: 8, margin: 0 }}>
                    {lang === 'en' ? '🚪 Enter Room' : '🚪 Odaya Giriş Yap'}
                  </button>
                </div>
              )}

              {lobbyTab === 'public' && (
                <div className="lobby-card-blue" style={{ animation: 'fade-in-slide 0.25s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, letterSpacing: 1 }}>{lang === 'en' ? '🌍 ACTIVE PUBLIC ROOMS' : '🌍 HAREKETLİ AÇIK ODALAR'}</div>
                    <button onClick={() => socket?.emit('requestPublicRooms')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 800 }}>
                      {lang === 'en' ? '🔄 Refresh' : '🔄 Yenile'}
                    </button>
                  </div>
                  {publicRooms.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>{lang === 'en' ? 'No active public rooms currently available.' : 'Şu an katılabileceğiniz açık oda bulunmuyor.'}</div>
                  ) : (
                    <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                      {publicRooms.map(r => (
                        <div key={r.code} className="public-room-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{r.hostName}'in Odası</div>
                            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>Hedef: {r.winSets} Set | Oyuncu: {r.playerCount}/5</div>
                          </div>
                          <button onClick={() => { setJoinCode(r.code); handleJoin(); }} style={{ ...btnStyle('#3498DB'), padding: '6px 14px', fontSize: 11, margin: 0 }}>GİRİŞ</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              {/* WAITING ROOM / ACTIVE LOBBY */}
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>ODA GİRİŞ BİLETİ (Kopyalamak İçin Tıkla)</div>
              
              <div className="glass-card" style={{
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(0,0,0,0.5))',
                border: '1.5px solid rgba(255, 215, 0, 0.3)',
                boxShadow: '0 8px 32px rgba(255, 215, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: '14px 24px',
                borderRadius: '12px',
                display: 'inline-block',
                marginBottom: 20,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                maxWidth: 320,
                boxSizing: 'border-box'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)';
                  e.currentTarget.style.borderColor = '#FFD700';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 215, 0, 0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 215, 0, 0.08)';
                }}
                onClick={() => { navigator.clipboard.writeText(roomCode); showToast('Oda kodu kopyalandı!', 'success'); sfxClick(); }}>
                <div style={{ fontSize: 9, color: '#FFD700', fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>KOPYALA</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700', letterSpacing: 4, textShadow: '0 0 12px rgba(255,215,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  {roomCode}
                  <span style={{ fontSize: 16, opacity: 0.8 }}>📋</span>
                </div>
              </div>

              <div style={{ color: '#fff', fontSize: 14, marginBottom: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span>👥 Oyuncular</span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{gameState?.players?.length || 1} / 5</span>
              </div>

              {/* LOBBY PLAYER SLOTS (GRID SYSTEM FOR MOBILE RESPONSIVENESS) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const p = gameState?.players?.[idx];
                  
                  if (p) {
                    const isSelf = p.id === playerId;
                    const isReady = p.isReady || idx === 0; // Host is always ready
                    
                    return (
                      <div
                        key={p.id}
                        className={`waiting-player-card ${isReady ? 'ready-halo-active' : ''}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          background: 'rgba(22, 30, 49, 0.4)',
                          border: `1.5px solid ${isReady ? '#2ecc71' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 16,
                          padding: '10px 14px',
                          boxShadow: isReady ? '0 8px 24px rgba(46,204,113,0.15)' : '0 8px 24px rgba(0,0,0,0.3)',
                          transition: 'all 0.25s ease',
                          position: 'relative'
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          {((isSelf ? (dbUser?.wins || 0) : (p.isBot ? 2 : 0)) > 0) && (
                            <span className="avatar-gear-crown" style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 14, filter: 'drop-shadow(0 2px 4px rgba(255,215,0,0.5))', zIndex: 2 }}>👑</span>
                          )}
                          <img
                            src={`https://api.dicebear.com/7.x/${p.avatar || 'avataaars'}/svg?seed=${p.name}`}
                            alt="avatar"
                            title={isSelf ? "İsmini değiştirmek için tıkla" : "Profili gör"}
                            onClick={() => {
                              if (isSelf) {
                                const newName = prompt("Yeni isminizi girin:", p.name);
                                if (newName && newName.trim()) {
                                  setMyName(newName.trim());
                                  localStorage.setItem('md_name', newName.trim());
                                  socket?.emit('updatePlayerName', { roomCode, newName: newName.trim() });
                                }
                              } else {
                                setProfilePlayer(p);
                                socket?.emit('sendEmote', { targetId: p.id, emoji: '👋' });
                              }
                            }}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              background: 'rgba(0,0,0,0.2)',
                              cursor: 'pointer',
                              border: `2px solid ${isSelf ? '#FFD700' : 'rgba(255,255,255,0.15)'}`,
                              boxShadow: isSelf ? '0 0 10px rgba(255,215,0,0.3)' : 'none',
                              transition: 'transform 0.2s'
                            }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{p.name}</span>
                            {isSelf && <span style={{ fontSize: 8, background: '#FFD700', color: '#000', padding: '1px 5px', borderRadius: 8, fontWeight: 900 }}>SEN</span>}
                            {idx === 0 && <span style={{ fontSize: 8, background: '#8E44AD', color: '#fff', padding: '1px 5px', borderRadius: 8, fontWeight: 900 }}>HOST</span>}
                          </div>
                          <span style={{ fontSize: 9, color: '#a0aec0', marginTop: 1 }}>
                            {p.isBot ? '🤖 Yapay Zeka Oyuncu' : '👤 Çevrimiçi Oyuncu'}
                          </span>
                        </div>
                        
                        {/* Status badge */}
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 9,
                          fontWeight: 900,
                          background: isReady ? 'rgba(46, 204, 113, 0.12)' : 'rgba(230, 126, 34, 0.12)',
                          color: isReady ? '#2ECC71' : '#E67E22',
                          border: `1px solid ${isReady ? 'rgba(46, 204, 113, 0.25)' : 'rgba(230, 126, 34, 0.25)'}`
                        }}>
                          {isReady ? '✓ HAZIR' : '⏳ BEKLİYOR'}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={`empty-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          background: 'rgba(255,255,255,0.01)',
                          border: '1.5px dashed rgba(255,255,255,0.08)',
                          borderRadius: 16,
                          padding: '12px 14px',
                          color: '#64748b'
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'rgba(255,255,255,0.1)' }}>
                          ?
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>Boş Yuva</span>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.08)', marginTop: 1 }}>Oyuncu bekleniyor...</span>
                        </div>
                        <div className="lobby-pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                    );
                  }
                })}
              </div>

              {/* ACTION PANEL (DEPENDING ON HOST OR GUEST ROLE) */}
              {gameState?.players?.[0]?.id === playerId ? (
                <>
                  {/* Host Panel */}
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: 14,
                    borderRadius: 14,
                    marginBottom: 16
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase' }}>🎨 KART TEMA AYARI</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {THEMES.map(t => (
                        <button key={t.id} onClick={() => { setSelectedTheme(t.id); sfxClick(); }} style={{
                          padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 800,
                          border: selectedTheme === t.id ? '1.5px solid #FFD700' : '1px solid rgba(255,255,255,0.12)',
                          background: selectedTheme === t.id ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
                          color: '#fff',
                          margin: 0,
                          transition: 'all 0.15s ease'
                        }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  {renderRoomSettings()}
                  <div style={{ height: 16 }} />

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {gameState?.players?.length < 5 && (
                      <button onClick={() => {
                        socket?.emit('addBot', { roomCode }, res => {
                          if (res?.ok) showToast('Bot odaya eklendi', 'success');
                          else if (res?.error) showToast(res.error, 'error');
                        });
                      }} style={{ ...btnStyle('linear-gradient(135deg, #8E44AD, #9B59B6)'), width: '100%', padding: '12px', fontSize: 13, borderRadius: 8, margin: 0 }}>
                        🤖 Bot Ekle (Yapay Zeka)
                      </button>
                    )}

                    <button onClick={handleStart} style={{ ...btnStyle('linear-gradient(135deg, #10b981, #059669)'), width: '100%', padding: '12px', fontSize: 13, borderRadius: 8, margin: 0 }}>
                      🏁 Oyunu Başlat ({gameState?.players?.length || 1} Oyuncu)
                    </button>
                    
                    <button onClick={handleCloseRoom} style={{
                      ...btnStyle('rgba(231,76,60,0.15)'),
                      width: '100%', padding: '10px', fontSize: 12, borderRadius: 8, border: '1px solid rgba(231,76,60,0.3)', color: '#E74C3C', margin: 0
                    }}>
                      ❌ Odayı Kapat
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Guest Panel */}
                  <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8, marginBottom: 12, fontStyle: 'italic' }}>Host oyunu başlatacak, lütfen bekleyin...</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Ready Toggle */}
                    <button
                      onClick={() => {
                        socket?.emit('toggleReady', { roomCode });
                        sfxClick();
                      }}
                      style={{
                        ...btnStyle(gameState?.players?.find(p => p.id === playerId)?.isReady ? 'linear-gradient(135deg, #e74c3c, #c0392b)' : 'linear-gradient(135deg, #2ecc71, #27ae60)'),
                        width: '100%', padding: '12px', fontSize: 13, borderRadius: 8, fontWeight: 900, margin: 0
                      }}
                    >
                      {gameState?.players?.find(p => p.id === playerId)?.isReady ? '❌ HAZIR DEĞİLİM' : '✅ HAZIR OL!'}
                    </button>

                    {/* View Only Settings */}
                    {renderRoomSettings(true)}
                    
                    <button
                      onClick={() => {
                        if (!window.confirm('Odadan ayrılmak istediğinden emin misin?')) return;
                        socket?.emit('leaveRoom', { roomCode }, () => { });
                        handleExit();
                      }}
                      style={{
                        ...btnStyle('rgba(255,255,255,0.06)'),
                        width: '100%', padding: '10px', fontSize: 12,
                        borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                        color: '#eee', margin: 0
                      }}
                    >
                      🚪 Odadan Ayrıl
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {error && <div style={{ color: '#ef4444', marginTop: 14, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>⚠️ {error}</div>}
          <div style={{ color: '#64748b', marginTop: 8, fontSize: 11, textAlign: 'center' }}>{status}</div>
        </div>
        {renderModal()}
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
    : (gameState?.turnTimer > 0 && gameState?.turnStartTime && gameState?.serverTime
       ? Math.max(0, gameState.turnTimer - Math.floor(((gameState.serverTime + (Date.now() - stateReceivedTimeRef.current)) - gameState.turnStartTime) / 1000))
       : null);
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
      // Ödeme/itiraz beklenirken yumuşak kömür/slate geçişi
      return 'radial-gradient(circle at center, #1e1520 0%, #08070d 80%)';
    }
    if (isMyTurn) {
      // Sıra bendeyken şık çelik mavisi odak geçişi
      if (activeTheme === 'cyberpunk') return 'radial-gradient(circle at center, #1a162b 0%, #06050b 80%)';
      if (activeTheme === 'retro') return 'radial-gradient(circle at center, #0f1813 0%, #050806 80%)';
      if (activeTheme === 'wood') return 'radial-gradient(circle at center, #241a15 0%, #0d0907 80%)';
      return 'radial-gradient(circle at center, #162238 0%, #070a12 80%)';
    }
    // Varsayılan premium kömür grisi arka planlar
    if (activeTheme === 'cyberpunk') return 'radial-gradient(circle at center, #13121a 0%, #06050b 80%)';
    if (activeTheme === 'retro') return 'radial-gradient(circle at center, #0a0d0a 0%, #050806 80%)';
    if (activeTheme === 'wood') return 'radial-gradient(circle at center, #1c1511 0%, #0d0907 80%)';
    return 'radial-gradient(circle at center, #121829 0%, #06080e 80%)';
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
      <div className={`game-layout game-board-container theme-${activeTheme} ${is3DTable ? 'table-3d' : ''} ${boardShake === 'heavy' ? "board-shake-heavy" : boardShake ? "board-shake-active" : ""}`} style={{ background: getDynamicBackground(), color: '#fff', fontSize: 13, transition: 'background 0.8s ease-in-out' }}>
        
        {/* Holographic Grid Overlay */}
        <div className="holographic-mesh-grid" />
        <div className="ambient-nebula-left" />
        <div className="ambient-nebula-right" />

        {/* Sıra Geçiş Ekran Parlaması */}
        {showTurnFlash && <div className="turn-flash-overlay" />}
        {showTurnFlash && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99999,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(217, 119, 6, 0.95))',
                padding: '16px 40px',
                borderRadius: 20,
                boxShadow: '0 15px 45px rgba(251, 191, 36, 0.45), 0 0 25px rgba(251, 191, 36, 0.2)',
                border: '2px solid #FFF',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>🎲</span>
              <span style={{
                color: '#FFF',
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                textTransform: 'uppercase'
              }}>{lang === 'en' ? 'YOUR TURN!' : 'Sıra Sende!'}</span>
            </motion.div>
          </div>
        )}

        {/* Fullscreen Kalkan Efekti */}
        {showShield && <div className="jsn-shield-overlay" />}

        {/* Fullscreen Hırsız Sincap Pençe Efekti */}
        {showScratch && (
          <div className="claw-scratch-container">
            <div className="claw-scratch-mark" />
            <div className="claw-scratch-mark claw-scratch-mark-2" />
          </div>
        )}

        {/* Fullscreen Yıldırım Şimşek Efekti */}
        {showSparks && (
          <div style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 99999,
            border: '8px solid #818cf8',
            boxShadow: 'inset 0 0 80px rgba(129, 138, 248, 0.65)',
            animation: 'sparks-pulse-anim 0.4s infinite alternate ease-in-out'
          }} />
        )}

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
                  <span style={{
                    background: isMyTurn ? '#FFD700' : 'rgba(255,255,255,0.05)',
                    color: isMyTurn ? '#000' : '#aaa',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    border: isMyTurn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    {isMyTurn ? 'SIRA SENDE' : `${gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || 'Rakip'}'de`}
                    {renderActionPoints(gameState.actionsLeft)}
                  </span>
                  <button
                    onClick={() => {
                      const nextLang = lang === 'tr' ? 'en' : 'tr';
                      setLang(nextLang);
                      localStorage.setItem('md_lang', nextLang);
                      sfxClick();
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: 9, padding: '4px 6px',
                      fontWeight: 'bold'
                    }}
                  >
                    {lang === 'tr' ? '🇹🇷' : '🇬🇧'}
                  </button>
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
                  <span style={{
                    background: isMyTurn ? '#FFD700' : 'rgba(255,255,255,0.05)',
                    color: isMyTurn ? '#000' : '#aaa',
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    border: isMyTurn ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    {isMyTurn ? 'SIRA SENDE' : `SIRA: ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || 'Rakip'}`}
                    {renderActionPoints(gameState.actionsLeft)}
                  </span>
                  <button onClick={() => setShowHistoryModal(true)} style={{ ...btnStyle('rgba(52, 152, 219, 0.2)'), padding: '4px 8px', fontSize: 11, border: '1px solid rgba(52, 152, 219, 0.5)' }}>
                    📜 Geçmiş
                  </button>
                  {gameState.streetThugs && gameState.scavengeMarket?.length > 0 && (
                    <button onClick={() => setShowScavengeModal(true)} style={{ ...btnStyle('rgba(231, 76, 60, 0.2)'), padding: '4px 8px', fontSize: 11, border: '1px solid rgba(231, 76, 60, 0.5)' }}>
                      🕵️ Karaborsa ({gameState.scavengeMarket.length})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const nextLang = lang === 'tr' ? 'en' : 'tr';
                      setLang(nextLang);
                      localStorage.setItem('md_lang', nextLang);
                      sfxClick();
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '4px 8px',
                      fontWeight: 'bold'
                    }}
                  >
                    {lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
                  </button>
                  <button onClick={toggleSound} title={soundOn ? 'Sesi Kapat' : 'Sesi Aç'} style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 13, padding: '3px 8px',
                  }}>
                    {soundOn ? '🔊' : '🔇'}
                  </button>
                  {soundOn && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: 10, color: '#718096' }} title="Müzik">🎵</span>
                      <input
                        type="range" min="0" max="0.5" step="0.01"
                        value={bgmVolume}
                        onChange={e => { setBgmVolumeState(e.target.value); setBgmVolume(e.target.value); }}
                        title="Arka Plan Müziği Sesi"
                        style={{ width: 45, cursor: 'pointer', height: 4, accentColor: '#FFD700' }}
                      />
                      <span style={{ fontSize: 10, color: '#718096' }} title="Ses Efektleri">🔊</span>
                      <input
                        type="range" min="0" max="1.0" step="0.02"
                        value={sfxVolume}
                        onChange={e => { setSfxVolumeState(e.target.value); setSfxVolume(e.target.value); }}
                        title="Ses Efektleri Sesi"
                        style={{ width: 45, cursor: 'pointer', height: 4, accentColor: '#FFD700' }}
                      />
                    </div>
                  )}
                  {gameState?.players?.[0]?.id === playerId && (
                    <button onClick={() => {
                      socket.emit('returnToLobby', { roomCode }, (res) => {
                        if (res && !res.ok) setError(res.error || 'Oyun bitirilemedi');
                      });
                    }} style={{ background: '#E67E22', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
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



        {/* Zaman Sınırı Fitil Sayacı (Burning Fuse) */}
        {gameState.turnTimer > 0 && gameState.turnStartTime && !isBlocked && (() => {
          const pct = Math.max(0, Math.min(100, (remainingTime / gameState.turnTimer) * 100));
          let timerClass = 'safe';
          if (pct <= 20) timerClass = 'danger';
          else if (pct <= 55) timerClass = 'warning';

          return (
            <div className="fuse-bar-container" title={`Kalan Tur Süresi: ${remainingTime} saniye`}>
              <div className={`fuse-bar ${timerClass}`} style={{ width: `${pct}%` }} />
              <div className={`fuse-spark ${timerClass}`} style={{ left: `calc(${pct}% - 7px)` }} />
            </div>
          );
        })()}

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
            <div style={{ background: '#1a1a2e', padding: 24, borderRadius: 12, border: '2px solid #3498DB', maxWidth: 520, width: '90%', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🤝</div>
              <h2 style={{ color: '#3498DB', marginBottom: 8 }}>{myPendingTrade.sourceName} Takas Teklif Ediyor!</h2>
              <p style={{ color: '#aaa', fontSize: 13, marginBottom: 20 }}>
                Aşağıdaki kartların karşılıklı olarak takas edilmesini onaylıyor musunuz?
              </p>

              <div style={{ display: 'flex', gap: 14, marginBottom: 24, textAlign: 'left', flexDirection: 'row' }}>
                {/* Sana Verilecek (Offered by source player) */}
                <div style={{ flex: 1, background: 'rgba(46, 204, 113, 0.05)', border: '1px solid rgba(46, 204, 113, 0.15)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: '#2ECC71', fontSize: 11, fontWeight: 900, marginBottom: 10, letterSpacing: 0.5 }}>📤 SANA VERİLECEK</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '2px 0' }}>
                    {[...myPendingTrade.offerBankIds, ...myPendingTrade.offerPropIds].map(id => {
                      const c = findCardInGame(id);
                      return c ? <CardVisual key={id} card={c} small /> : null;
                    })}
                    {myPendingTrade.offerBankIds.length + myPendingTrade.offerPropIds.length === 0 && (
                      <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>Hiç kart verilmiyor</span>
                    )}
                  </div>
                </div>

                {/* Senden İstenecek (Requested from me) */}
                <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ color: '#F87171', fontSize: 11, fontWeight: 900, marginBottom: 10, letterSpacing: 0.5 }}>📥 SENDEN İSTENEN</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '2px 0' }}>
                    {[...myPendingTrade.requestBankIds, ...myPendingTrade.requestPropIds].map(id => {
                      const c = findCardInGame(id);
                      return c ? <CardVisual key={id} card={c} small /> : null;
                    })}
                    {myPendingTrade.requestBankIds.length + myPendingTrade.requestPropIds.length === 0 && (
                      <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>Hiç kart istenmiyor</span>
                    )}
                  </div>
                </div>
              </div>

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

        {/* Yönlü Uçan Ödeme Kartları (Flying Card Payments) */}
        {directionalFlyingCards.map(fc => (
          <div
            key={fc.id}
            className="flying-card-entity"
            style={{
              '--fsx': fc.sx + 'px',
              '--fsy': fc.sy + 'px',
              '--fdx': fc.dx + 'px',
              '--fdy': fc.dy + 'px'
            }}
          >
            <CardVisual card={fc.card} small />
          </div>
        ))}

        {/* Kendi Uçan Emojilerimiz */}
        {emotes.filter(e => e.senderId === playerId).map(emote => (
          <div
            key={emote.id}
            className="floating-emote"
            style={{
              position: 'fixed',
              bottom: '160px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '44px',
              pointerEvents: 'none',
              zIndex: 1050
            }}
          >
            {emote.emoji}
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
            myPlayerId={playerId}
            players={gameState.players}
            isHost={gameState.players?.[0]?.id === playerId}
            onReturnToLobby={handleReturnToLobby}
            onNewGame={handleNewGame}
            onExit={handleExit}
            history={gameState.history}
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

        <div className={`game-content ${rageQuit ? 'rage-quit-active' : ''} ${isTimeRunningOut ? 'time-running-out-glow' : ''}`}>

          {/* ═══ SOL SÜTUN: OYUNCULAR ═══ */}
          <div className="players-col player-avatar-strip">
            {gameState.players.filter(p => p.id !== playerId).map(player => {
              const pIdx = gameState.players.findIndex(x => x.id === player.id);
              const playerColor = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
              const isTargeted = gameState.pendingChallenges.some(ch =>
                (ch.action === 'slydeal' || ch.action === 'dealbreaker' || ch.action === 'debtcollector') && ch.targetId === player.id
              );
              const isCurrent = player.id === gameState.currentPlayerId;
              const propColors = Object.entries(player.properties || {})
                .filter(([, cards]) => cards.length > 0)
                .map(([color, cards]) => ({ color, isComplete: isSetComplete(cards, color) }));
              const completeSets = propColors.filter(p => p.isComplete).length;

              return (
                <div
                  key={player.id}
                  ref={el => (playerPanelRefs.current[player.id] = el)}
                  onClick={() => setViewingPlayerId(player.id)}
                  className={isCurrent ? 'player-strip-card ref-style spotlight-glow turn-pulsate' : 'player-strip-card ref-style'}
                  style={{
                    flexShrink: 0,
                    width: isMobile ? 120 : '100%',
                    borderRadius: 14,
                    padding: isMobile ? '8px 8px' : '10px 10px',
                    background: isCurrent
                      ? `linear-gradient(160deg, ${playerColor}35 0%, rgba(10,8,22,0.95) 100%)`
                      : `linear-gradient(160deg, ${playerColor}15 0%, rgba(10,8,22,0.85) 100%)`,
                    border: isCurrent ? `2px solid ${playerColor}` : `1px solid ${playerColor}45`,
                    boxShadow: isCurrent ? `0 0 20px ${playerColor}50, inset 0 0 12px ${playerColor}10` : '0 3px 12px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Hedef çarpı */}
                  {isTargeted && <div className="target-crosshair" />}

                  {/* Aktif sıra göstergesi — üst çizgi */}
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, transparent, ${playerColor}, transparent)`,
                      borderRadius: '14px 14px 0 0',
                      animation: 'active-player-pulse 1.5s ease-in-out infinite',
                    }} />
                  )}

                  {/* ── ÜSTE: Avatar yuvarlak + İsim + Para ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {/* Avatar */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfilePlayer(player);
                        socket?.emit('sendEmote', { targetId: player.id, emoji: '👋' });
                      }}
                      style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        border: `2.5px solid ${playerColor}`,
                        background: `${playerColor}25`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: isCurrent ? `0 0 10px ${playerColor}99` : `0 0 4px ${playerColor}44`,
                      }}
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/${player.avatarStyle || 'bottts'}/svg?seed=${player.name}`}
                        alt={player.name}
                        style={{ width: '100%', height: '100%' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    {/* İsim + Durum */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: '#fff', fontWeight: 800, fontSize: isMobile ? 10 : 12,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textShadow: `0 0 10px ${playerColor}88`,
                        letterSpacing: 0.3,
                      }}>
                        {player.name}
                        {player.isAFK && ' 💤'}
                        {player.connected === false && <span style={{ color: '#f44', fontSize: 8 }}> ●</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                        {/* Monopoly M rozeti */}
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%', background: '#e63946',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 7, fontWeight: 900, color: '#fff', flexShrink: 0,
                        }}>M</div>
                        <span style={{ fontSize: 10, color: '#2ECC71', fontWeight: 800 }}>
                          {player.bankTotal}M
                        </span>
                        {isCurrent && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <span style={{
                              fontSize: 7, color: '#FFD700', fontWeight: 900, letterSpacing: 0.5,
                              background: 'rgba(255,215,0,0.15)', padding: '1px 4px', borderRadius: 4,
                              border: '1px solid rgba(255,215,0,0.35)',
                              animation: 'active-player-pulse 1s ease-in-out infinite',
                            }}>▶ SIRADA</span>
                            {renderActionPoints(gameState.actionsLeft)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── ORTA: El Kartları (arka yüz stacked mini) ── */}
                  {player.handCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {/* Stacked kart görseli */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {/* Arka kart gölgesi (derinlik) */}
                        {player.handCount > 2 && (
                          <div style={{
                            position: 'absolute', top: -2, left: 2,
                            width: 22, height: 30, borderRadius: 4,
                            background: 'linear-gradient(135deg, #1a2a4a, #0d1520)',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }} />
                        )}
                        {player.handCount > 1 && (
                          <div style={{
                            position: 'absolute', top: -1, left: 1,
                            width: 22, height: 30, borderRadius: 4,
                            background: 'linear-gradient(135deg, #1e3158, #0f1c30)',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }} />
                        )}
                        {/* Öne kart */}
                        <div style={{
                          width: 22, height: 30, borderRadius: 4,
                          background: 'linear-gradient(135deg, #243b6e, #162040)',
                          border: `1.5px solid ${playerColor}99`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 2px 6px rgba(0,0,0,0.5), 0 0 4px ${playerColor}33`,
                          position: 'relative', zIndex: 2,
                        }}>
                          <div style={{ fontSize: 10, color: playerColor, fontWeight: 900 }}>🂠</div>
                        </div>
                      </div>
                      {/* Kart sayısı etiketi */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 900, color: '#fff',
                          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                          lineHeight: 1,
                        }}>×{player.handCount}</span>
                        <span style={{ fontSize: 8, color: '#aaa', marginTop: 1 }}>kart</span>
                      </div>
                    </div>
                  )}

                  {/* ── ALT: Arazi mini kartları (renk şeritli) ── */}
                  {propColors.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 3,
                      paddingTop: 5,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {propColors.map(({ color, isComplete }) => {
                        const info = COLOR_INFO[color] || { hex: '#aaa' };
                        const setSize = SET_SIZES[color] || 2;
                        const owned = Object.entries(player.properties || {}).find(([c]) => c === color)?.[1]?.length || 0;
                        return (
                          <div
                            key={color}
                            title={`${color}${isComplete ? ' (TAM SET)' : ` (${owned}/${setSize})`}`}
                            style={{
                              width: 20, height: 28, borderRadius: 3,
                              background: '#fff',
                              border: isComplete ? `1.5px solid ${info.hex}` : '1px solid rgba(0,0,0,0.2)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              overflow: 'hidden', position: 'relative',
                              boxShadow: isComplete
                                ? `0 0 6px ${info.hex}88, 0 1px 3px rgba(0,0,0,0.4)`
                                : '0 1px 3px rgba(0,0,0,0.4)',
                              transition: 'all 0.2s',
                            }}
                          >
                            {/* Renk şeridi */}
                            <div style={{
                              width: '100%', height: 6,
                              background: info.hex,
                              flexShrink: 0,
                            }} />
                            {/* Değer */}
                            <div style={{
                              fontSize: 7, fontWeight: 900, color: '#222',
                              marginTop: 2, lineHeight: 1,
                            }}>{owned}/{setSize}</div>
                            {/* Tam set yıldız */}
                            {isComplete && (
                              <div style={{
                                position: 'absolute', bottom: 0, right: 0,
                                fontSize: 7, color: '#FFD700',
                              }}>★</div>
                            )}
                          </div>
                        );
                      })}
                      {completeSets > 0 && (
                        <div style={{
                          fontSize: 8, color: '#FFD700', fontWeight: 900,
                          alignSelf: 'center',
                          background: 'rgba(255,215,0,0.12)',
                          padding: '2px 4px', borderRadius: 4,
                          border: '1px solid rgba(255,215,0,0.3)',
                        }}>⭐{completeSets}</div>
                      )}
                    </div>
                  )}
                  {propColors.length === 0 && (
                    <div style={{
                      fontSize: 8, color: '#333', fontStyle: 'italic',
                      textAlign: 'center', paddingTop: 3,
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>henüz arazi yok</div>
                  )}
                </div>
              );
            })}
          </div>


          {/* ═══ ORTA SÜTUN: MASA / ARAZİLER ═══ */}
          <div className="board-col">

            {/* Orta Panel (Responsive Masa / Log Görünümü) */}
            {isMobile ? (
              <div className="center-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, flex: 1, overflow: 'hidden' }}>
                  {/* Yeni Yatay Deste ve Son Oynanan (Mobil - Hologram Temalı) */}
                  <div style={{
                    position: 'relative',
                    height: '100px',
                    background: 'rgba(17, 12, 38, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    padding: '8px 16px',
                    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {/* Glowing holo ring in background */}
                    <div className="holo-board-ring" style={{ width: 84, height: 84 }} />
                    
                    {/* Deste */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 1 }}>
                      <div style={{
                        width: 44,
                        height: 60,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #3d1b7a, #160f38)',
                        border: '2px solid #FFD700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(255,215,0,0.25)',
                        cursor: 'default',
                        position: 'relative'
                      }}>
                        <span style={{ fontSize: 18 }}>🎴</span>
                        <div style={{
                          position: 'absolute', bottom: -4, right: -4,
                          background: '#FFD700', color: '#000',
                          fontSize: 9, fontWeight: 900, borderRadius: '50%',
                          width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                        }}>{gameState.deckCount}</div>
                      </div>
                      <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>DESTE</span>
                    </div>

                    {/* Son Oynanan / Discard */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 1 }}>
                      <div style={{
                        width: 44,
                        height: 60,
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px dashed rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                      }}>
                        {gameState.discard?.length > 0 ? (
                          <div style={{ transform: 'scale(0.5)', cursor: 'pointer', position: 'absolute' }}
                            onClick={() => { setPreviewCard(gameState.discard[gameState.discard.length - 1]); setPreviewLocked(true); }}>
                            <CardVisual card={gameState.discard[gameState.discard.length - 1]} small />
                          </div>
                        ) : (
                          <span style={{ fontSize: 8, color: '#666' }}>BOŞ</span>
                        )}
                      </div>
                      <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>SON HAMLE</span>
                    </div>
                  </div>

                  {/* Benim Bankam ve Arazilerim (Mobil) */}
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
                        onClick={() => { setModal({ type: 'viewBankCards' }); sfxClick(); }}
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
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: 8, color: '#2ECC71', fontWeight: 'bold' }}>🏦 <BankTicker value={me.bankTotal} /></span>
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

                      {/* Araziler (Mobil) */}
                      {Object.entries(me.properties || {}).map(([color, cards]) => {
                        if (cards.length === 0) return null;
                        const info = COLOR_INFO[color] || { hex: '#aaa' };
                        const isComplete = isSetComplete(cards, color);
                        const setSize = SET_SIZES[color] || 2;
                        return (
                          <div
                            key={color}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
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
                                  <div style={{ width: '100%', height: 8, background: c.isWild ? 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB)' : (c.isDual && c.colors ? `linear-gradient(90deg, ${COLOR_INFO[c.colors[0]]?.hex} 0%, ${COLOR_INFO[c.colors[0]]?.hex} 50%, ${COLOR_INFO[c.colors[1]]?.hex} 50%, ${COLOR_INFO[c.colors[1]]?.hex} 100%)` : info.hex) }} />
                                  <div style={{ fontSize: 8, fontWeight: 900, color: '#333', marginTop: 4, transform: 'scale(0.85)' }}>
                                    {c.isWild ? '★' : (c.value || '')}
                                  </div>
                                </div>
                                <div className="mini-card-hover-view">
                                  <CardVisual card={c} small />
                                </div>
                              </div>
                            ))}
                            {/* Set ilerleme etiketi (Mobil) */}
                            <div style={{
                              fontSize: 8, fontWeight: 900,
                              color: isComplete ? '#FFD700' : info.hex,
                              background: isComplete ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.45)',
                              border: isComplete ? '1px solid rgba(255,215,0,0.4)' : `1px solid ${info.hex}55`,
                              borderRadius: 3,
                              padding: '1px 4px',
                              marginTop: 3,
                              lineHeight: 1.4,
                              zIndex: 20,
                              position: 'relative'
                            }}>
                              {isComplete ? `✓ ${cards.length}/${setSize}` : `${cards.length}/${setSize}`}
                            </div>
                            {/* Rent/Building Status Badge (Mobil) */}
                            <div style={{
                              fontSize: 7.5, fontWeight: 900,
                              color: '#2ECC71',
                              background: 'rgba(0,0,0,0.6)',
                              border: '1px solid rgba(46,204,113,0.3)',
                              borderRadius: 3,
                              padding: '1px 3px',
                              marginTop: 2,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              zIndex: 20,
                              position: 'relative',
                              justifyContent: 'center',
                              width: '100%',
                              boxSizing: 'border-box'
                            }} title="Güncel Kira Getirisi ve Binalar">
                              <span>💵{calculateRentClient(me, color)}M</span>
                              {isComplete && me.buildings?.[color] && (
                                <>
                                  {me.buildings[color].houses > 0 && <span>🏠</span>}
                                  {me.buildings[color].hotel && <span>🏨</span>}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {Object.entries(me.properties || {}).every(([_, cards]) => cards.length === 0) && (
                        <span style={{ color: '#555', fontSize: 10 }}>Henüz arazi yok</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Masaüstü (Regular) Görünüm — Log artık log-col'da */
              <div className="center-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'visible' }}>

                {/* Ortak Masa Ortası Alanı (Central Play Area - Desktop) */}
                <div className="central-play-arena">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>🎴 DESTE ({gameState.deckCount})</span>
                    <div className="play-arena-slot">
                      {gameState.deckCount > 0 ? (
                        <div className="premium-deck-card" title="Destedeki Kalan Kart Sayısı">
                          <span style={{ fontSize: 20 }}>🏠</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 10, color: '#444' }}>BOŞ</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>📤 SON OYNANAN</span>
                    <div className="play-arena-slot">
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
                      onClick={() => { setModal({ type: 'viewBankCards' }); sfxClick(); }}
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
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: 8, color: '#2ECC71', fontWeight: 'bold' }}>🏦 <BankTicker value={me.bankTotal} /></span>
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
                      const setSize = SET_SIZES[color] || 2;
                      return (
                        <div
                          key={color}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
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
                                <div style={{ width: '100%', height: 8, background: c.isWild ? 'linear-gradient(90deg, #E74C3C, #F39C12, #2ECC71, #3498DB)' : (c.isDual && c.colors ? `linear-gradient(90deg, ${COLOR_INFO[c.colors[0]]?.hex} 0%, ${COLOR_INFO[c.colors[0]]?.hex} 50%, ${COLOR_INFO[c.colors[1]]?.hex} 50%, ${COLOR_INFO[c.colors[1]]?.hex} 100%)` : info.hex) }} />
                                <div style={{ fontSize: 8, fontWeight: 900, color: '#333', marginTop: 4, transform: 'scale(0.85)' }}>
                                  {c.isWild ? '★' : (c.value || '')}
                                </div>
                              </div>
                              <div className="mini-card-hover-view">
                                <CardVisual card={c} small />
                              </div>
                            </div>
                          ))}
                          {/* Set ilerleme etiketi */}
                          <div style={{
                            fontSize: 8, fontWeight: 900,
                            color: isComplete ? '#FFD700' : info.hex,
                            background: isComplete ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.45)',
                            border: isComplete ? '1px solid rgba(255,215,0,0.4)' : `1px solid ${info.hex}55`,
                            borderRadius: 3,
                            padding: '1px 4px',
                            marginTop: 3,
                            letterSpacing: 0.3,
                            textShadow: 'none',
                            lineHeight: 1.4,
                            zIndex: 20,
                            position: 'relative'
                          }}>
                            {isComplete ? `✓ ${cards.length}/${setSize}` : `${cards.length}/${setSize}`}
                          </div>
                          {/* Rent/Building Status Badge (Desktop) */}
                          <div style={{
                            fontSize: 7.5, fontWeight: 900,
                            color: '#2ECC71',
                            background: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(46,204,113,0.3)',
                            borderRadius: 3,
                            padding: '1px 3px',
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            zIndex: 20,
                            position: 'relative',
                            justifyContent: 'center',
                            width: '100%',
                            boxSizing: 'border-box'
                          }} title="Güncel Kira Getirisi ve Binalar">
                            <span>💵{calculateRentClient(me, color)}M</span>
                            {isComplete && me.buildings?.[color] && (
                              <>
                                {me.buildings[color].houses > 0 && <span>🏠</span>}
                                {me.buildings[color].hotel && <span>🏨</span>}
                              </>
                            )}
                          </div>
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

            {!isMobile && (
              <div
                className="log-col"
                style={{
                  width: isLogOpen ? 260 : 50,
                  transition: 'width 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: isLogOpen ? 12 : '12px 6px',
                  background: isLogOpen ? 'rgba(0, 0, 0, 0.25)' : 'rgba(0, 0, 0, 0.15)',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                  height: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: isLogOpen ? 'row' : 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: isLogOpen ? 10 : 0,
                  paddingBottom: isLogOpen ? 8 : 0,
                  borderBottom: isLogOpen ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  gap: 8,
                  width: '100%'
                }}>
                  {isLogOpen ? (
                    <>
                      <span style={{ fontSize: 10, color: '#aaa', fontWeight: 'bold', letterSpacing: 1 }}>📜 OYUN GEÇMİŞİ</span>
                      <button
                        onClick={() => { setIsLogOpen(false); sfxClick(); }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 6,
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: 9,
                          padding: '3px 8px',
                          fontWeight: 'bold',
                          margin: 0
                        }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setIsLogOpen(true); sfxClick(); }}
                      title="Log Geçmişini Aç"
                      style={{
                        background: 'rgba(255,215,0,0.1)',
                        border: '1px solid rgba(255,215,0,0.25)',
                        borderRadius: 8,
                        color: '#FFD700',
                        cursor: 'pointer',
                        fontSize: 14,
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        margin: '0 auto',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      📜
                    </button>
                  )}
                </div>
                {isLogOpen && (
                  <div ref={logRef} className="game-log" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
                    {[...(gameState.log || [])].slice(-30).reverse().map((entry, i) => {
                      const isSystem = entry.type === 'system';
                      const isImportant = entry.type === 'payment' || entry.type === 'property' || entry.type === 'action';
                      return (
                        <div key={i} style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          fontSize: 10, color: isSystem ? '#FFD700' : '#ccc', padding: '6px 8px',
                          background: isSystem ? 'rgba(255,215,0,0.1)' : isImportant ? 'rgba(255,255,255,0.04)' : 'transparent',
                          borderRadius: 6, borderLeft: isSystem ? '2px solid #FFD700' : isImportant ? '2px solid rgba(255,255,255,0.2)' : '2px solid transparent',
                          animation: 'fw-fade-in 0.3s ease-out'
                        }}>
                          <div className={isSystem ? 'system-log-blink' : ''} style={{ lineHeight: 1.4, wordBreak: 'break-word' }}>{renderLogMsg(entry)}</div>
                          <div style={{ fontSize: 8, color: '#555', marginTop: 3, textAlign: 'right' }}>
                            {new Date(entry.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


        {/* ALT: El kartları */}
        {(() => {
          const numCards = handToRender.length;
          const listJustifyContent = numCards > (isMobile ? 4 : 5) ? 'flex-start' : 'center';
          const smartHighlightIds = getSmartHighlightIds(handToRender, me, gameState.players);

          return (
            <div
              className="hand-dock"
              style={{
                transform: handHidden ? 'translateY(calc(100% - 38px))' : 'translateY(0)',
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
            >
              {/* El kartları başlığı, butonlar ve emoji çubuğu (tek satır) */}
              {selectedCard && isMyTurn && !isBlocked && !discardMode && isMobile ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  marginBottom: '8px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingBottom: '6px',
                  animation: 'toast-in 0.2s ease',
                  pointerEvents: 'auto'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#FFD700' }}>
                      {translateCard(selectedCard, lang).name}
                    </span>
                    <span style={{ fontSize: 10, color: '#aaa' }}>
                      ({selectedCard.value}M)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleCardAction(selectedCard)}
                      style={{
                        ...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'),
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 'bold',
                        borderRadius: 6,
                        margin: 0
                      }}
                    >
                      {lang === 'en' ? '🚀 Play' : '🚀 Oyna'}
                    </button>
                    {selectedCard.type !== 'property' && (
                      <button
                        onClick={() => handlePlayCard(selectedCard, { asBankMoney: true })}
                        style={{
                          ...btnStyle('linear-gradient(135deg, #27AE60, #1E8449)'),
                          padding: '8px 16px',
                          fontSize: 12,
                          fontWeight: 'bold',
                          borderRadius: 6,
                          margin: 0
                        }}
                      >
                        {lang === 'en' ? '💰 Bank' : '💰 Banka'}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedCard(null)}
                      style={{
                        ...btnStyle('rgba(255,255,255,0.15)'),
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 'bold',
                        borderRadius: 6,
                        margin: 0
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingBottom: '6px',
                  userSelect: 'none',
                  pointerEvents: 'auto'
                }}>
                  {/* Toggle butonu */}
                  <div
                    onClick={() => { sfxClick(); setHandHidden(!handHidden); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  >
                    <span style={{ fontSize: '11px', color: '#FFD700', fontWeight: '900', letterSpacing: '0.5px' }}>
                      {handHidden ? (lang === 'en' ? '👁️ SHOW HAND' : '👁️ ELİ GÖSTER') : (lang === 'en' ? '🃏 MY CARDS' : '🃏 KARTLARIM')} ({handToRender.length})
                    </span>
                    <span style={{ fontSize: '9px', color: '#aaa', display: 'inline-block', transform: handHidden ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                      ▼
                    </span>
                  </div>

                  {/* Sağ: Eylem butonları */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {isMyTurn && !discardMode && !isBlocked && gameState.canUndo && (
                      <button
                        onClick={() => { sfxClick(); handleUndoMove(); }}
                        style={{
                          background: 'rgba(230, 126, 34, 0.15)',
                          border: '1px solid rgba(230, 126, 34, 0.4)',
                          color: '#E67E22',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.15)'}
                      >
                        {lang === 'en' ? '↩️ Undo' : '↩️ Geri Al'}
                      </button>
                    )}
                    {isMyTurn && !discardMode && !isBlocked && (
                      <button
                        onClick={() => { sfxClick(); handleEndTurn(); }}
                        style={{
                          background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                          border: 'none',
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: '900',
                          boxShadow: '0 4px 12px rgba(155,89,182,0.3)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 15px rgba(155,89,182,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(155,89,182,0.3)'; }}
                      >
                        {lang === 'en' ? '🏁 End Turn' : '🏁 Turu Bitir'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="hand-blurred-container" style={{ overflow: 'visible', pointerEvents: handHidden ? 'none' : 'auto' }}>
                <div
                  className={handHidden ? 'hand-blurred' : ''}
                  style={{
                    display: 'flex',
                    overflowX: 'auto',
                    overflowY: 'visible',
                    paddingBottom: '14px',
                    paddingTop: '14px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    alignItems: 'flex-end',
                    listStyle: 'none',
                    margin: 0,
                    justifyContent: listJustifyContent,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    gap: isMobile ? 10 : 0
                  }}
                >
                  {handToRender.map((card, idx) => {
                    const isJSNActive = card.action === 'justsayno' && !!gameState?.myPendingChallenge;
                    const cardComboClass = isJSNActive ? 'shield-glow' : getCardComboClass(card, handToRender);
                    const isCardDimmed = (!isMyTurn || isBlocked) && !discardMode && !isJSNActive;
                    const isSelected = selectedCard?.id === card.id;
                    const overlapOffset = isMobile ? 0 : -36;

                    const cardScale = isMobile ? 0.85 : 1.5;
                    const visualScale = isMobile ? 0.8 : 0.85;
                    const cardW = 132 * cardScale;
                    const cardH = 192 * cardScale;
                    const wrapperW = cardW * visualScale;
                    const wrapperH = cardH * visualScale;

                    return (
                      <motion.div
                        key={card.id}
                        className={`stacked-card-wrapper ${isSelected ? 'selected-card' : ''} ${smartHighlightIds.includes(card.id) ? 'smart-glow' : ''}`}
                        drag={isMyTurn && !isBlocked && !discardMode ? 'y' : false}
                        dragElastic={0.2}
                        dragSnapToOrigin={true}
                        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                        onDragStart={handleDragStart}
                        onDrag={handleDrag}
                        onDragEnd={(e, info) => handleDragEnd(e, info, card)}
                        whileDrag={{ scale: 1.15, zIndex: 1000, cursor: 'grabbing' }}
                        style={{
                          width: wrapperW,
                          height: wrapperH,
                          zIndex: isSelected ? 1000 : idx,
                          position: 'relative',
                          cursor: isMyTurn && !isBlocked && !discardMode ? 'grab' : 'default',
                          transformOrigin: 'bottom center',
                          flexShrink: 0,
                          marginLeft: idx === 0 ? 0 : overlapOffset,
                          transition: 'transform 0.2s ease, z-index 0s',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = 'translateY(-18px)';
                            e.currentTarget.style.zIndex = 900;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.zIndex = idx;
                          }
                        }}
                        onDoubleClick={() => {
                          setZoomedCard(card);
                          sfxClick();
                        }}
                        onClick={() => {
                          if (draggedRef.current) return;
                          
                          // Mobile Double-Tap check:
                          const now = Date.now();
                          if (window.__lastCardTap && window.__lastCardTap.cardId === card.id && (now - window.__lastCardTap.time < 300)) {
                            setZoomedCard(card);
                            sfxClick();
                            return;
                          }
                          window.__lastCardTap = { cardId: card.id, time: now };

                          if (discardMode) {
                            setDiscardSelected(prev =>
                              prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
                            );
                          } else {
                            openCardModal(card);
                          }
                        }}
                      >
                        <div style={{
                          width: cardW,
                          height: cardH,
                          transform: `scale(${visualScale})`,
                          transformOrigin: 'bottom center',
                          position: 'absolute',
                          bottom: 0,
                          left: '50%',
                          marginLeft: -cardW / 2
                        }}>
                          <CardVisual
                            card={card}
                            selected={discardMode ? discardSelected.includes(card.id) : selectedCard?.id === card.id}
                            dimmed={isCardDimmed}
                            usable={!discardMode && (isCardUsable(card) || isJSNActive)}
                            comboClass={cardComboClass}
                          />
                        </div>

                        <AnimatePresence>
                          {selectedCard?.id === card.id && isMyTurn && !isBlocked && !discardMode && !isMobile && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(10, 10, 20, 0.95)',
                                borderRadius: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: 6,
                                zIndex: 10,
                                padding: 4
                              }}
                            >
                              <button onClick={(e) => { e.stopPropagation(); handleCardAction(card); }} style={{ ...btnStyle('linear-gradient(135deg, #E67E22, #D35400)'), fontSize: 10, padding: '12px 22px', borderRadius: 4 }}>{lang === 'en' ? '🚀 Play' : '🚀 Oyna'}</button>
                              {card.type !== 'property' && (
                                <button onClick={(e) => { e.stopPropagation(); handlePlayCard(card, { asBankMoney: true }); }} style={{ ...btnStyle('linear-gradient(135deg, #27AE60, #1E8449)'), fontSize: 8, padding: '12px 22px', borderRadius: 4 }}>{lang === 'en' ? '💰 Bank' : '💰 Banka'}</button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setSelectedCard(null); }} style={{ ...btnStyle('rgba(255,255,255,0.15)'), fontSize: 10, padding: '12px 22px', borderRadius: 4 }}>{lang === 'en' ? 'Close✕' : 'Kapat✕'}</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              {(discardMode || (isMyTurn && !discardMode && !isBlocked && gameState.gambleZari && !me.hasGambledThisTurn && gameState.actionsLeft > 0)) && (
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {isMyTurn && !discardMode && !isBlocked && gameState.gambleZari && !me.hasGambledThisTurn && gameState.actionsLeft > 0 && (
                    <button onClick={handleRollGambleDice} style={{ ...btnStyle('linear-gradient(135deg, #16A085, #117864)'), padding: '10px 20px', boxShadow: '0 4px 10px rgba(22,160,133,0.4)', fontSize: 13, marginLeft: 'auto' }}>
                      🎲 Zar At
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
                </div>
              )}
              {error && <div style={{ color: '#f44', fontSize: 13, textAlign: 'center', marginTop: 8, fontWeight: 'bold' }}>{error}</div>}
            </div>
          );
        })()}

        {/* ---- SOHBET (CHAT) PENCERESİ ---- */}
        <div style={{ position: 'fixed', bottom: isMobile ? 170 : 175, right: 16, zIndex: 1500, width: isMobile ? 280 : 320, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pointerEvents: 'none' }}>
          <AnimatePresence>
            {!isChatOpen && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={() => { setIsChatOpen(true); sfxClick(); }}
                style={{
                  pointerEvents: 'auto',
                  background: 'linear-gradient(135deg, #3498DB, #2980B9)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  boxShadow: '0 8px 25px rgba(52,152,219,0.4), 0 0 10px rgba(52,152,219,0.2)',
                  cursor: 'pointer',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                💬
              </motion.button>
            )}
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

        {/* Visual History Strip (Hamle Geçmişi Replay) */}
        {screen === 'game' && !isMobile && gameState?.log && gameState.log.length > 0 && (
          <div className="visual-history-strip">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 9, color: '#FFD700', fontWeight: 900, letterSpacing: 0.5 }}>SON HAMLELER</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[...gameState.log].slice(-3).reverse().map((entry, idx) => {
                  let emoji = '📝';
                  const msgText = entry.msg || '';
                  if (msgText.includes('banka') || msgText.includes('para') || msgText.includes('Banka')) emoji = '🏦';
                  else if (msgText.includes('arazi') || msgText.includes('tapu') || msgText.includes('mülk')) emoji = '🏠';
                  else if (msgText.includes('kira') || msgText.includes('ödeme') || msgText.includes('Ödeme')) emoji = '💸';
                  else if (msgText.includes('reddet') || msgText.includes('say no') || msgText.includes('Reddet')) emoji = '🛡️';
                  else if (msgText.includes('hırsız') || msgText.includes('çal') || msgText.includes('Hırsız')) emoji = '🥷';
                  
                  return (
                    <div key={idx} className="visual-history-item">
                      <span style={{ fontSize: 13 }}>{emoji}</span>
                      <span style={{ maxWidth: 90, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={msgText}>{msgText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Profile Card Modal */}
        {profilePlayer && (
          <Modal title={`👤 ${profilePlayer.name} Profili`} onClose={() => setProfilePlayer(null)}>
            <div style={{ textAlign: 'center', padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={`https://api.dicebear.com/7.x/${profilePlayer.avatar || profilePlayer.avatarStyle || 'avataaars'}/svg?seed=${profilePlayer.name}`}
                  alt="avatar"
                  style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', border: '3px solid #FFD700', boxShadow: '0 0 20px rgba(255,215,0,0.2)' }}
                />
                {profilePlayer.isReady && <span style={{ position: 'absolute', bottom: 0, right: 0, fontSize: 16 }}>✅</span>}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: '#FFD700' }}>{profilePlayer.name}</h3>
                <p style={{ color: '#aaa', fontSize: 11, margin: '4px 0 0 0' }}>Oyuncu Seviyesi: Altın Üye</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginTop: 8 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 9, color: '#aaa' }}>TOPLAM MAÇ</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginTop: 4 }}>14</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 9, color: '#aaa' }}>TOPLAM ZAFER</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#FFD700', marginTop: 4 }}>{profilePlayer.isBot ? 4 : 10}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 9, color: '#aaa' }}>KAZANMA ORANI</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#2ECC71', marginTop: 4 }}>71.4%</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 9, color: '#aaa' }}>EN SEVİLEN KART</div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#3498DB', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Haciz Kartı 🔵</div>
                </div>
              </div>
              <button
                onClick={() => {
                  socket?.emit('sendEmote', { targetId: profilePlayer.id, emoji: '👋' });
                  showToast(`${profilePlayer.name} oyuncusuna el salladınız! 👋`, 'success');
                  sfxClick();
                }}
                style={{ ...btnStyle('linear-gradient(135deg, #3498db, #2980b9)'), width: '100%', padding: '10px', fontSize: 12, borderRadius: 8, marginTop: 8 }}
              >
                👋 Selam Gönder
              </button>
            </div>
          </Modal>
        )}

        {/* Zoom Card Modal */}
        {zoomedCard && (
          <div
            onClick={() => setZoomedCard(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100000,
              background: 'rgba(5, 7, 12, 0.93)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(20px)',
              animation: 'fw-fade-in 0.25s ease-out'
            }}
          >
            <div style={{ transform: 'scale(1.6)' }} onClick={e => e.stopPropagation()}>
              <CardVisual card={zoomedCard} />
            </div>
            <div style={{ marginTop: 40, color: '#aaa', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>Kapatmak için herhangi bir yere dokunun</div>
          </div>
        )}

      </div>
    </ThemeContext.Provider>
  );
}

const getSmartHighlightIds = (hand, me, players) => {
  if (!me || !hand || !players) return [];
  const ids = [];
  const myProperties = me.properties || {};

  hand.forEach(card => {
    // 1. Property completing a set
    if (card.type === 'property' && card.colors) {
      card.colors.forEach(col => {
        const count = myProperties[col]?.length || 0;
        const size = SET_SIZES[col] || 999;
        if (count + 1 === size) {
          ids.push(card.id);
        }
      });
    }
    // 2. Rent card matching our properties
    if (card.action === 'rent') {
      if (card.colors === 'all') {
        const hasProps = Object.values(myProperties).some(arr => arr.length > 0);
        if (hasProps) ids.push(card.id);
      } else if (Array.isArray(card.colors)) {
        const hasMatch = card.colors.some(col => myProperties[col]?.length > 0);
        if (hasMatch) ids.push(card.id);
      }
    }
    // 3. Deal Breaker and opponents have complete sets
    if (card.action === 'dealbreaker') {
      const hasOpponentSet = players.some(opp => {
        if (opp.id === me.id) return false;
        return Object.entries(opp.properties || {}).some(([col, cards]) => isSetComplete(cards, col));
      });
      if (hasOpponentSet) ids.push(card.id);
    }
    // 4. Buildings (House/Hotel) on complete sets
    if (card.action === 'house' || card.action === 'hotel') {
      const hasValidSet = Object.entries(myProperties).some(([col, cards]) => {
        if (col === 'railroad' || col === 'utility') return false;
        const isComp = isSetComplete(cards, col);
        if (!isComp) return false;
        const b = me.buildings?.[col] || { houses: 0, hotel: false };
        if (card.action === 'house' && b.houses === 0) return true;
        if (card.action === 'hotel' && b.houses >= 1 && !b.hotel) return true;
        return false;
      });
      if (hasValidSet) ids.push(card.id);
    }
  });

  return ids;
};
