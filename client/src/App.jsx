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
  sfxPlayEffectFlame, sfxPlayEffectThunder, sfxPlayEffectCosmic, sfxPlayEffectBlackhole, sfxPlayEffectConfetti, sfxPlayEffectHeart, sfxPlayEffectCash,
  setSfxVolume, getSfxVolume, stopAllSFX, sfxCardHover, sfxCashCounter
} from './sounds';

import { THEMES, COLOR_INFO, PLAYER_COLORS, SET_SIZES, ACTION_STYLE, CARD_TOTAL_COUNTS } from './constants';
import { getCardTip, isSetComplete, getCardTotalCount, getRarity } from './utils';
import { ThemeContext } from './ThemeContext';

import { Modal } from './components/Modal';
import { PlayerPanel } from './components/PlayerPanel';
import { CardVisual } from './components/CardVisual';
import { CardBack } from './components/CardBack';
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

const translateReason = (reason, lang) => {
  if (lang !== 'en') return reason;
  if (!reason) return '';
  let r = reason;
  r = r.replace(/Doğum Günü/gi, "It's My Birthday!");
  r = r.replace(/Borç Tahsildarı/gi, "Debt Collector");
  r = r.replace(/Kira/gi, "Rent");
  r = r.replace(/Hırsız Sincap/gi, "Thief Squirrel");
  r = r.replace(/Tüm Oyuncular/gi, "All Players");
  r = r.replace(/Çift Renkli Kira/gi, "Dual Color Rent");
  r = r.replace(/Herhangi Bir Kira/gi, "Any Rent");
  return r;
};

const translateLog = (logText, lang) => {
  if (lang !== 'en') return logText;
  if (!logText) return '';

  let t = logText;

  t = t.replace(/Oyun başladı!\s*[🎲🚀]\s*İlk oyuncu:\s*(.+)/i, 'Game started! 🚀 First player: $1');
  t = t.replace(/(.+) desteden (\d+) yeni kart çekti\.\s*\(Deste:\s*(\d+)\)/i, '$1 drew $2 cards from the deck. (Deck: $3)');
  t = t.replace(/⚠️\s*DİKKAT:\s*Destede sadece (\d+) kart kaldı!/i, '⚠️ ATTENTION: Only $1 cards left in the deck!');
  t = t.replace(/(.+) elindeki (.+) (\d+)M olarak kasaya koydu\.\s*\(Güncel Kasa:\s*(\d+)M\)/i, (match, player, type, val, currentBank) => {
    return `${player} deposited ${val}M into the bank vault. (Current Vault: ${currentBank}M)`;
  });
  t = t.replace(/(.+?),\s*(.+?) grubuna "(.+?)" arazisini ekledi\./i, (match, player, color, prop) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility',
      'brown': 'Brown', 'lightblue': 'Light Blue', 'pink': 'Pink', 'orange': 'Orange',
      'red': 'Red', 'yellow': 'Yellow', 'green': 'Green', 'blue': 'Dark Blue',
      'railroad': 'Railroad', 'utility': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} added property "${prop}" to ${enColor} group.`;
  });
  t = t.replace(/(.+) "(.+)" arazisini (.+) rengine (çevirdi\.|taşıdı)/i, (match, player, prop, color) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility',
      'brown': 'Brown', 'lightblue': 'Light Blue', 'pink': 'Pink', 'orange': 'Orange',
      'red': 'Red', 'yellow': 'Yellow', 'green': 'Green', 'blue': 'Dark Blue',
      'railroad': 'Railroad', 'utility': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} flipped property "${prop}" to ${enColor}.`;
  });
  t = t.replace(/(.+) "Geç Go!" oynadı, 2 kart çekti/i, '$1 played "Pass Go" and drew 2 cards');
  t = t.replace(/(.+) "Doğum Günüm!" oynadı! Herkes 2M ödeyecek\s*\(itiraz süresi\)/i, '$1 played "It\'s My Birthday!"! Everyone pays 2M (challenge window)');
  t = t.replace(/(.+) "Borç Tahsildarı" oynadı, (.+)'dan 5M istiyor\s*\(itiraz süresi\)/i, '$1 played "Debt Collector", demanding 5M from $2 (challenge window)');
  t = t.replace(/(.+) "Hırsız Sincap" oynadı!\s*(.+)'ın elinden rastgele bir kart çalma girişimi\s*\(itiraz süresi\)/i, '$1 played "Thief Squirrel"! Attempting to steal a card from $2 (challenge window)');
  t = t.replace(/(.+) "Hırsız Sincap" oynadı!\s*(.+)'ın elinden rastgele bir kart çalmaya çalışıyor!\s*\(itiraz süresi\)/i, '$1 played "Thief Squirrel"! Attempting to steal a card from $2 (challenge window)');
  t = t.replace(/(.+) "Joker Kira" oynadı!\s*(.+) hedef seçildi ve (\d+)M (ödeyecek|ödemesi istendi)\s*\(itiraz süresi\)?/i, '$1 played "Wild Rent"! $2 is targeted and must pay $3M (challenge window)');
  t = t.replace(/(.+),\s*(.+) kirası topluyor\s*(\(2X\))?\s*!?\s*(.+?) için (\d+)M (borç çıkartıldı|itiraz süresi)/i, (match, player, color, double, target, amount) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility',
      'brown': 'Brown', 'lightblue': 'Light Blue', 'pink': 'Pink', 'orange': 'Orange',
      'red': 'Red', 'yellow': 'Yellow', 'green': 'Green', 'blue': 'Dark Blue',
      'railroad': 'Railroad', 'utility': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} is collecting ${enColor} rent${double ? ' (2X)' : ''} from ${target} for ${amount}M (challenge window)`;
  });
  t = t.replace(/(.+) "Sinsi Anlaşma" (kullandı!|oynadı!)\s*(.+)'ın "(.+)" arazisini (çalmak istiyor|çalmak için hamle yaptı)\s*(\(itiraz süresi\))?/i, '$1 played "Sly Deal", targeting $3\'s property "$4" (challenge window)');
  t = t.replace(/(.+) zorunlu takas başlattı!\s*(.+) ile arazi değiş-tokuşu istiyor\./i, '$1 initiated a Forced Deal, requesting a trade with $2.');
  t = t.replace(/(.+) "Anlaşma Bozucu" oynadı!\s*(.+)'ın tamamlanmış (.+) (setini çalmak istiyor|setinin tamamını ele geçirmeye çalışıyor!)(\s*\(itiraz süresi\))?/i, (match, player, target, color) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility',
      'brown': 'Brown', 'lightblue': 'Light Blue', 'pink': 'Pink', 'orange': 'Orange',
      'red': 'Red', 'yellow': 'Yellow', 'green': 'Green', 'blue': 'Dark Blue',
      'railroad': 'Railroad', 'utility': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} played "Deal Breaker", targeting ${target}'s completed ${enColor} set (challenge window)`;
  });
  t = t.replace(/(.+) muazzam bir yatırım yaptı!\s*(.+) setine bir (🏨 Otel|🏠 Ev|ev|otel)(.*?) (ekledi\.|inşa etti\.)/i, (match, player, color, building) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility',
      'brown': 'Brown', 'lightblue': 'Light Blue', 'pink': 'Pink', 'orange': 'Orange',
      'red': 'Red', 'yellow': 'Yellow', 'green': 'Green', 'blue': 'Dark Blue',
      'railroad': 'Railroad', 'utility': 'Utility'
    }[color.toLowerCase()] || color;
    const enBuilding = (building.includes('Ev') || building.toLowerCase().includes('ev')) ? 'House' : 'Hotel';
    const buildingEmoji = (building.includes('Ev') || building.toLowerCase().includes('ev')) ? '🏠' : '🏨';
    return `${player} made a major investment! Added a ${buildingEmoji} ${enBuilding} to their completed ${enColor} set.`;
  });
  t = t.replace(/(.+) "Reddet!" oynadı!\s*Hamle (geçersiz|yine geçerli)(\s*\(karşı tarafa söz hakkı\))?/i, (match, player, status) => {
    return `${player} played "Just Say No!" Action ${status === 'geçersiz' ? 'blocked' : 'is still valid'}.`;
  });
  t = t.replace(/(.+?) "(.+?)" hamlesini Reddet! ile durdurdu/i, (match, player, action) => {
    const actionEn = {
      rent: 'Rent',
      birthday: "It's My Birthday!",
      debtcollector: 'Debt Collector',
      slydeal: 'Sly Deal',
      forceddeal: 'Forced Deal',
      dealbreaker: 'Deal Breaker',
      thief_squirrel: 'Thief Squirrel'
    }[action.toLowerCase()] || action;
    return `${player} blocked "${actionEn}" action with Just Say No!`;
  });
  t = t.replace(/(.+) "(.+)" arazisini (.+)'dan aldı!/i, '$1 took property "$2" from $3!');
  t = t.replace(/(.+),\s*"(.+)" ile\s*(.+)'ın "(.+)" arazisini takas etti!/i, '$1 swapped "$2" with $3\'s property "$4"!');
  t = t.replace(/(.+?)\s+(.+?)'ın\s+(.+) setini çaldı!/i, (match, player, target, color) => {
    const enColor = {
      'kahverengi': 'Brown', 'açık mavi': 'Light Blue', 'pembe': 'Pink', 'turuncu': 'Orange',
      'kırmızı': 'Red', 'sarı': 'Yellow', 'yeşil': 'Green', 'lacivert': 'Dark Blue',
      'demir yolları': 'Railroad', 'kamu hizmetleri': 'Utility',
      'brown': 'Brown', 'lightblue': 'Light Blue', 'pink': 'Pink', 'orange': 'Orange',
      'red': 'Red', 'yellow': 'Yellow', 'green': 'Green', 'blue': 'Dark Blue',
      'railroad': 'Railroad', 'utility': 'Utility'
    }[color.toLowerCase()] || color;
    return `${player} stole ${target}'s completed ${enColor} set!`;
  });
  t = t.replace(/(.+),\s*(.+)'ın elinden rastgele bir kart çaldı!/i, '$1 stole a random card from $2\'s hand!');
  t = t.replace(/(.+?)\s+"(.+?)"'ın elinden kart çalmaya çalıştı ama hedef oyuncunun elinde hiç kart yok!/i, '$1 tried to steal from $2, but target hand was empty!');
  t = t.replace(/(.+) ödeyecek hiçbir şeyi yok,\s*(.+) bu sefer boş döndü/i, '$1 has nothing to pay, $2 returns empty-handed');
  t = t.replace(/\[BOT\]\s*(.+) borcunu ödeyemedi,\s*tüm varlıklarına el konuldu!/i, '[BOT] $1 could not pay debt, all assets seized!');
  t = t.replace(/\[BOT\]\s*(.+) otomatik olarak (\d+)M ödedi\./i, '[BOT] $1 automatically paid $2M.');
  t = t.replace(/(.+?),\s+(.+?)'a (\d+)M ödedi\.\s*\(Kalan Kasası:\s*(\d+)M\s*\|\s*Alıcının Kasası:\s*(\d+)M\)/i, '$1 paid $3M to $2. (Remaining Vault: $4M | Collector Vault: $5M)');
  t = t.replace(/(.+?),\s+(.+?)'a (\d+)M ödedi\.\s*\(Kalan Kasası:\s*(\d+)M\)/i, '$1 paid $3M to $2. (Remaining Vault: $4M)');
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
  t = t.replace(/(.+) oyuna geri bağlandı\.\s*🔌/i, '$1 reconnected to the game. 🔌');
  t = t.replace(/(.+) oyundan çıktı veya bağlantısı koptu\./i, '$1 disconnected or left the game.');
  t = t.replace(/itiraz süresi doldu/i, 'challenge window expired');
  t = t.replace(/itiraz edilmedi, hamle uygulanıyor/i, 'no challenge, applying action');
  t = t.replace(/(.+?)\s+(\d+)\s+kart attı/i, '$1 discarded $2 cards');
  t = t.replace(/(.+?)\s+süresi dolduğu için\s+(\d+)\s+adet kartı sistem tarafından otomatik atıldı\./i, '$1 timed out, system automatically discarded $2 cards.');
  t = t.replace(/(.+?)\s+süresi bittiği için turu otomatik geçti\.\s*💤\s*\(AFK\)/i, '$1 timed out, turn passed automatically. 💤 (AFK)');
  t = t.replace(/---\s*Sıra\s*(.+?)\s+oyuncusuna geçti\s*\(Elde\s*(\d+)\s*kart kaldı\)\s*---/i, '--- Turn passed to $1 ($2 cards left in hand) ---');
  t = t.replace(/(.+?)\s+son hamlesini geri aldı\.\s*↩️/i, '$1 undid their last move. ↩️');
  t = t.replace(/🏆\s*(.+?)\s+KAZANDI!\s*(\d+)\s*tam set tamamladı!/i, '🏆 $1 WON! Completed $2 full sets!');
  t = t.replace(/(.+?),\s*Karaborsa'dan 2M ödeyerek çöpten kart aldı!\s*🕵️‍♂️/i, '$1 drew a card from the discard pile via Black Market for 2M! 🕵️‍♂️');

  return t;
};

// ---- GELİŞMİŞ İPUCU ÜRETİCİ ----

const renderColorizedDetailedTip = (text) => {
  if (!text) return text;

  const colorsMap = {
    brown: '#e5a93b', kahverengi: '#e5a93b',
    lightblue: '#4FA8D5', 'açık mavi': '#4FA8D5', 'light blue': '#4FA8D5',
    pink: '#ff7ebb', pembe: '#ff7ebb',
    orange: '#E67E22', turuncu: '#E67E22',
    red: '#E74C3C', kırmızı: '#E74C3C',
    yellow: '#F1C40F', sarı: '#F1C40F',
    green: '#2ECC71', yeşil: '#2ECC71',
    blue: '#3498DB', lacivert: '#3498DB',
    railroad: '#95A5A6', demiryolu: '#95A5A6', 'demir yolları': '#95A5A6',
    utility: '#BDC3C7', 'kamu hizmetleri': '#BDC3C7', 'kamu hizmeti': '#BDC3C7'
  };

  const regex = /(\d+M|Kahverengi|Açık Mavi|Pembe|Turuncu|Kırmızı|Sarı|Yeşil|Lacivert|Demir Yolları|Demiryolu|Kamu Hizmetleri|Kamu Hizmeti|Brown|Light Blue|Pink|Orange|Red|Yellow|Green|Blue|Railroad|Utility)/gi;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    const lowerPart = part.toLowerCase();
    
    if (/^\d+m$/i.test(lowerPart)) {
      return (
        <strong key={i} style={{ color: '#2ECC71', fontWeight: 900, textShadow: '0 0 4px rgba(46,204,113,0.3)' }}>
          {part}
        </strong>
      );
    }
    
    if (colorsMap[lowerPart] != null) {
      return (
        <strong key={i} style={{ color: colorsMap[lowerPart], fontWeight: 900 }}>
          {part}
        </strong>
      );
    }
    
    return part;
  });
};

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

// ---- KOMPAKT ARAZİ SETİ GÖRÜNÜMÜ (RAKİP DETAYLARI İÇİN) ----
const CompactPropertySet = ({ color, cards, buildings, lang = 'tr' }) => {
  const infoRaw = COLOR_INFO[color] || { hex: '#fff', name: color };
  const info = {
    ...infoRaw,
    name: getColorName(color, lang)
  };
  const isComplete = isSetComplete(cards, color);
  const setSize = SET_SIZES[color] || 2;
  const rentBase = info.rents ? info.rents[Math.min(cards.length, info.rents.length) - 1] || 0 : 0;
  const houses = buildings?.[color]?.houses || 0;
  const hasHotel = !!buildings?.[color]?.hotel;
  const rentBonus = isComplete ? ((houses > 0 ? 3 * houses : 0) + (hasHotel ? 4 : 0)) : 0;
  const totalRent = isComplete ? rentBase + rentBonus : rentBase;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.015)',
      border: `1px solid ${isComplete ? info.hex : 'rgba(255, 255, 255, 0.08)'}`,
      borderLeft: `5px solid ${info.hex}`,
      borderRadius: 10,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      boxShadow: isComplete ? `0 0 10px ${info.hex}22` : 'none',
      boxSizing: 'border-box'
    }}>
      {/* Set Başlığı & Durum */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: '900', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.name}</span>
        <span style={{
          fontSize: 9,
          fontWeight: '900',
          color: isComplete ? '#FFD700' : '#aaa',
          background: isComplete ? 'rgba(255, 215, 0, 0.12)' : 'rgba(255,255,255,0.04)',
          padding: '2px 5px',
          borderRadius: 4,
          border: isComplete ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255,255,255,0.06)',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}>
          {isComplete ? (lang === 'en' ? '★ FULL' : '★ SET') : `${cards.length}/${setSize}`}
        </span>
      </div>

      {/* Kart Listesi (Sırayla Yatay Rozetler) */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {cards.map(c => {
          let cardLabel = '';
          if (c.isWild) cardLabel = lang === 'en' ? 'Wild' : 'Joker';
          else if (c.isDual) cardLabel = lang === 'en' ? 'Dual' : 'Çift Renk';
          else cardLabel = c.name || '';

          return (
            <div
              key={c.id}
              style={{
                fontSize: 9,
                fontWeight: '700',
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '2px 5px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                maxWidth: 90,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={cardLabel}
            >
              {cardLabel}
            </div>
          );
        })}
      </div>

      {/* Kira ve Ev/Otel Bilgileri */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 9,
        color: '#a0aec0',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: 4,
        marginTop: 2
      }}>
        <span>{lang === 'en' ? 'Rent:' : 'Kira:'} <strong style={{ color: '#2ECC71', fontWeight: 800 }}>{totalRent}M</strong></span>
        {(houses > 0 || hasHotel) && (
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {houses > 0 && <span style={{ color: '#FFD700', fontWeight: 'bold' }}>🏠x{houses}</span>}
            {hasHotel && <span style={{ color: '#E74C3C', fontWeight: 'bold' }}>🏢Otel</span>}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- İÇ İÇE GEÇMİŞ (YELPAZE) ARAZİ GÖRÜNÜMÜ ----
const FannedPropertySet = ({ color, cards, buildings, isOwn, onFlip, onHoverCard, lang = 'tr' }) => {
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
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('allTime');
  const [hoveredShopItem, setHoveredShopItem] = useState(null); // { type: 'border' | 'cardBack', id: string }
  const [shopCoins, setShopCoins] = useState([]);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [diceRollResult, setDiceRollResult] = useState(null);


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
      } catch (e) { }
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
        showToast(lang === 'en' ? 'Registration Successful! Welcome.' : 'Kayıt Başarılı! Hoş geldiniz.', 'success');
        setModal(null);
      } else {
        setError(res.error || (lang === 'en' ? 'Registration failed.' : 'Kayıt başarısız.'));
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
        showToast(lang === 'en' ? 'Login Successful! Welcome.' : 'Giriş Başarılı! Hoş geldiniz.', 'success');
        setModal(null);
      } else {
        setError(res.error || (lang === 'en' ? 'Login failed.' : 'Giriş başarısız.'));
      }
    });
  };

  const handleDbLogout = () => {
    setDbUser(null);
    localStorage.removeItem('md_db_user');
    showToast(lang === 'en' ? 'Logged out.' : 'Çıkış yapıldı.', 'info');
  };

  const fetchLeaderboard = (period = 'allTime') => {
    if (!socket) return;
    setLeaderboardPeriod(period);
    socket.emit('getLeaderboard', { period }, (res) => {
      setLeaderboard(res || []);
    });
  };

  const handleOpenLeaderboard = () => {
    fetchLeaderboard('allTime');
    setModal({ type: 'leaderboard' });
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

  const triggerShopPurchaseAnimation = (e) => {
    const count = 25;
    const newCoins = [];
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    if (e && e.clientX && e.clientY) {
      startX = e.clientX;
      startY = e.clientY;
    } else if (e && e.target) {
      const rect = e.target.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const velocity = 60 + Math.random() * 120;
      newCoins.push({
        id: Math.random(),
        x: startX,
        y: startY,
        dx: `${Math.cos(angle) * velocity}px`,
        dy: `${Math.sin(angle) * velocity - 60}px`,
        dr: `${Math.random() * 360}deg`
      });
    }
    setShopCoins(newCoins);
    setTimeout(() => {
      setShopCoins([]);
    }, 1000);
  };

  const handleBuyCustomization = (itemType, itemId, cost, event = null) => {
    if (!dbUser || !socket) return;
    socket.emit('buyCustomization', { username: dbUser.username, itemType, itemId, cost }, (res) => {
      if (res.ok) {
        setDbUser(res.user);
        localStorage.setItem('md_db_user', JSON.stringify(res.user));
        showToast(lang === 'en' ? 'Purchase successful!' : 'Satın alma başarılı!', 'success');
        if (sfxCoin) sfxCoin();
        triggerShopPurchaseAnimation(event);
      } else {
        setError(res.error);
        if (sfxError) sfxError();
      }
    });
  };

  const handleSelectCustomization = (itemType, itemId) => {
    if (!dbUser || !socket) return;
    socket.emit('selectCustomization', { username: dbUser.username, itemType, itemId }, (res) => {
      if (res.ok) {
        setDbUser(res.user);
        localStorage.setItem('md_db_user', JSON.stringify(res.user));
        showToast(lang === 'en' ? 'Equipped successfully!' : 'Kuşanma başarılı!', 'success');
        if (sfxClick) sfxClick();
      } else {
        setError(res.error);
        if (sfxError) sfxError();
      }
    });
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
  const [aiHintsEnabled, setAiHintsEnabled] = useState(() => {
    const saved = localStorage.getItem('md_ai_hints');
    return saved !== null ? saved === 'true' : true;
  });
  const [showHintsAfterDelay, setShowHintsAfterDelay] = useState(false);

  useEffect(() => {
    localStorage.setItem('md_ai_hints', aiHintsEnabled);
  }, [aiHintsEnabled]);



  const handleCardHover = (card) => {
    if (!previewLocked) {
      setPreviewCard(card);
    }
  };
  const [payingFlyingCards, setPayingFlyingCards] = useState([]); // Ödeme animasyonu için
  const [roomSettings, setRoomSettings] = useState({ gameMode: 'normal', autoEndTurn: true, turnTimer: 30, winSets: 3, startCards: 5, handLimit: 7, isPublic: true, allowCounterJustSayNo: true, openHands: false, lockWildcards: false, fastChallenge: false, allowTrades: false, extraDealBreakers: 0, streetThugs: false, gambleZari: false, botDifficulty: 'hard', thiefSquirrelEnabled: false });

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
  const [discardFlyingCards, setDiscardFlyingCards] = useState([]); // Animasyonlu atılan kartlar
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
  const [activeMegaEmote, setActiveMegaEmote] = useState(null);
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

  useEffect(() => {
    if (isMyTurn && !isBlocked) {
      setShowHintsAfterDelay(false);
      const timer = setTimeout(() => {
        setShowHintsAfterDelay(true);
      }, 7000); // 7 saniye gecikme
      return () => clearTimeout(timer);
    } else {
      setShowHintsAfterDelay(false);
    }
  }, [isMyTurn, isBlocked, gameState?.turnStartTime]);

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
  const showToast = useCallback((textOrObj, kind = 'info', duration = 2500) => {
    let text = '';
    let subtext = null;
    let icon = null;
    let toastKind = kind;
    let toastDuration = duration;

    if (typeof textOrObj === 'object' && textOrObj !== null) {
      text = textOrObj.text;
      subtext = textOrObj.subtext;
      icon = textOrObj.icon;
      toastKind = textOrObj.kind || kind;
      toastDuration = textOrObj.duration || duration;
    } else {
      text = textOrObj;
    }

    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text, subtext, icon, kind: toastKind }]);

    // 📳 Haptic Feedback (Dokunsal Geri Bildirim)
    if (navigator.vibrate) {
      if (toastKind === 'turn') navigator.vibrate([200, 100, 200]);
      else if (toastKind === 'error' || toastKind === 'danger') navigator.vibrate([80, 50, 80]);
      else if (toastKind === 'success') navigator.vibrate(50);
    }

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toastDuration);
  }, []);

  // --- Animasyon Fonksiyonları (TDZ Hatasını Önlemek İçin En Üste Taşındı) ---
  const spawnSmoke = useCallback((count) => {
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

  const PLAY_EFFECT_ICONS = { 
    gold: '✨', 
    heart: '💖', 
    flame: '🔥', 
    cosmic: '☄️',
    cash: '💵',
    emerald: '💚',
    blackhole: '🕳️',
    thunder: '⚡',
    confetti: '🎉',
    pixie: '✨',
    sakura_petals: '🌸',
    bubbles: '🫧',
    skulls: '💀',
    ice_shards: '❄️'
  };

  const spawnMoney = useCallback((options = {}) => {
    const { fromPos, toPos, count = 12, forceIcon } = options;

    let effect = 'default';
    // Resolve the icon: first check the last log actor's selectedPlayEffect,
    // then fall back to dbUser's own effect, then default money icon.
    let finalIcon = '💸';
    if (forceIcon) {
      finalIcon = forceIcon;
    } else {
      // Try to get the actor from last log entry
      let actorEffect = null;
      if (gameState?.log?.length > 0) {
        const lastEntry = gameState.log[gameState.log.length - 1];
        const actorId = lastEntry?.actorId;
        if (actorId) {
          const actor = gameState.players?.find(p => p.id === actorId);
          actorEffect = actor?.selectedPlayEffect;
        }
      }
      // Fall back to our own effect if we're the actor or no actor found
      effect = actorEffect || dbUser?.selectedPlayEffect || 'default';
      if (effect && effect !== 'default') {
        finalIcon = PLAY_EFFECT_ICONS[effect] || '💸';
      }
    }

    let newParts = [];
    if (fromPos && toPos) {
      if (effect === 'flame') sfxPlayEffectFlame();
      else if (effect === 'thunder') sfxPlayEffectThunder();
      else if (effect === 'cosmic') sfxPlayEffectCosmic();
      else if (effect === 'blackhole') sfxPlayEffectBlackhole();
      else if (effect === 'confetti') sfxPlayEffectConfetti();
      else if (effect === 'heart') sfxPlayEffectHeart();
      else if (effect === 'cash') sfxPlayEffectCash();
      else if (effect === 'sakura_petals') sfxWhoosh();
      else if (effect === 'bubbles') sfxClick();
      else if (effect === 'skulls') sfxShock();
      else if (effect === 'ice_shards') sfxGlassBreak();
      else sfxCoin();
      for (let i = 0; i < count; i++) {
        const sx = fromPos.x + (Math.random() - 0.5) * 50;
        const sy = fromPos.y + (Math.random() - 0.5) * 50;
        const dx = toPos.x + (Math.random() - 0.5) * 80;
        const dy = toPos.y + (Math.random() - 0.5) * 80;
        newParts.push({ id: Math.random(), icon: finalIcon, sx: sx + 'px', sy: sy + 'px', dx: dx + 'px', dy: dy + 'px', dr: (Math.random() - 0.5) * 720 + 'deg' });
      }
    } else {
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;
      for (let i = 0; i < count; i++) {
        newParts.push({ id: Math.random(), icon: finalIcon, sx: startX + 'px', sy: startY + 'px', dx: (Math.random() * window.innerWidth) + 'px', dy: (Math.random() * (window.innerHeight / 2)) + 'px', dr: (Math.random() - 0.5) * 720 + 'deg' });
      }
    }
    setMoneyParticles(prev => [...prev, ...newParts]);
    setTimeout(() => { setMoneyParticles(prev => prev.filter(p => !newParts.includes(p))); }, 1600);
  }, [gameState?.log, gameState?.players, dbUser?.selectedPlayEffect]);
  // ---- SÜRE BİTİMİ UYARI SESİ & OTOMATİK TUR ATLATMA ----
  useEffect(() => {
    if (screen === 'game' && isMyTurn && !isBlocked && gameState?.turnTimer > 0 && gameState?.turnStartTime && gameState?.serverTime) {
      const clientElapsedSinceUpdate = Date.now() - stateReceivedTimeRef.current;
      const currentServerTime = gameState.serverTime + clientElapsedSinceUpdate;
      const elapsedTurnTime = currentServerTime - gameState.turnStartTime;
      const remaining = gameState.turnTimer - Math.floor(elapsedTurnTime / 1000);

      // SÜRE AZALDI TİK-TAK SESİ & BGM GERİLİM HIZLANDIRMA
      if (remaining > 0 && remaining <= 10) {
        setBgmTension(true); // Gerilim müziğini hızlandır
        if (remaining <= 5) {
          sfxHeartbeat();
          setIsTimeRunningOut(true);
        } else {
          sfxTick();
          setIsTimeRunningOut(false);
        }
      } else {
        setBgmTension(false); // Normal BGM hızına dön
        setIsTimeRunningOut(false);
      }

      if (remaining <= 0 && prevTurnAlertRef.current !== gameState.turnStartTime) {
        sfxAlert(); // Süre doldu alarmı!
        playTurkishVoice("Süren doldu! Turunu otomatik geçiriyorum.");
        showToast(lang === 'en' ? "Your time is up! Auto-passing turn..." : "Süreniz doldu! Otomatik geçiliyor...", "error");

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
      setBgmTension(false); // Normal BGM hızına dön
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
      if (msg.text && msg.text.startsWith('[MEGA_EMOTE:')) {
        const emoteId = msg.text.split(':')[1].replace(']', '');
        setActiveMegaEmote({ id: emoteId, senderName: msg.senderName });
        setTimeout(() => {
          setActiveMegaEmote(null);
        }, 5500);
        
        // Play corresponding epic sound effect!
        if (emoteId === 'nuke_boom') {
          sfxGlassBreak(); // Nuke siren style
        } else if (emoteId === 'make_it_rain') {
          sfxChaChing();
        } else {
          sfxChatSent();
        }
        return;
      }

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

    s.on('playerEmote', ({ senderId, targetId, emoji }) => {
      const id = Math.random();
      setEmotes(prev => [...prev, { id, senderId, targetId, emoji }]);
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

  // Çift renk ve wild kartların masada hangi aktif renkte olduğunu gösteren şerit stili
  const getMiniCardStripeStyle = (c, activeColor) => {
    const activeHex = COLOR_INFO[activeColor]?.hex || '#aaa';
    if (c.isWild) {
      // Aktif renk baskın (65%), diğer renkler küçük bir gökkuşağı şeridi olarak sağda (35%)
      return `linear-gradient(90deg, ${activeHex} 0%, ${activeHex} 65%, #E74C3C 65%, #F39C12 75%, #2ECC71 85%, #3498DB 100%)`;
    }
    if (c.isDual && c.colors) {
      const inactiveColor = c.colors.find(col => col !== activeColor);
      const inactiveHex = COLOR_INFO[inactiveColor]?.hex || activeHex;
      // Aktif renk baskın (75%), pasif renk ikincil olarak sağda (25%)
      return `linear-gradient(90deg, ${activeHex} 0%, ${activeHex} 75%, ${inactiveHex} 75%, ${inactiveHex} 100%)`;
    }
    return activeHex;
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
      showToast(lang === 'en' ? '✨ Awesome! You completed a color set!' : '✨ Muhteşem! Bir renk setini tamamladın!', 'success', 4000);
      spawnMoney({ count: 20 }); // uses our own playEffect
    }
    prevCompleteSetsRef.current = myCompleteSetsCount;
  }, [myCompleteSetsCount, showToast, spawnMoney]);

  // ---- SIRA DEĞİŞİMİ EFEKTİ — Her yeni sıra başında o oyuncunun efekti saçılır ----
  const prevTurnPlayerIdRef = useRef(null);
  useEffect(() => {
    if (!gameState?.currentPlayerId || gameState?.phase !== 'playing') return;
    const newTurnId = gameState.currentPlayerId;
    if (newTurnId !== prevTurnPlayerIdRef.current) {
      prevTurnPlayerIdRef.current = newTurnId;
      // Get the new current player's play effect
      const currentPlayer = gameState.players?.find(p => p.id === newTurnId);
      const effect = currentPlayer?.selectedPlayEffect;
      if (effect && effect !== 'default') {
        const icon = { 
          gold: '✨', 
          heart: '💖', 
          flame: '🔥', 
          cosmic: '☄️',
          cash: '💵',
          emerald: '💚',
          blackhole: '🕳️',
          thunder: '⚡',
          confetti: '🎉',
          pixie: '✨'
        }[effect];
        if (icon) {
          // Small burst from that player's panel position
          const panelEl = playerPanelRefs.current?.[newTurnId];
          if (panelEl) {
            const rect = panelEl.getBoundingClientRect();
            const pos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            setMoneyParticles(prev => {
              const particles = Array.from({ length: 8 }, () => ({
                id: Math.random(),
                icon,
                sx: pos.x + 'px',
                sy: pos.y + 'px',
                dx: (pos.x + (Math.random() - 0.5) * 200) + 'px',
                dy: (pos.y - 80 - Math.random() * 120) + 'px',
                dr: (Math.random() - 0.5) * 360 + 'deg'
              }));
              setTimeout(() => setMoneyParticles(p => p.filter(mp => !particles.includes(mp))), 1400);
              return [...prev, ...particles];
            });
          }
        }
      }
    }
  }, [gameState?.currentPlayerId, gameState?.phase, gameState?.players]);

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
        showToast(lang === 'en' ? `⚠️ ${p.name} completed a set!` : `⚠️ ${p.name} bir set tamamladı!`, 'error', 3500);
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

  // ── Overlay subtext renk vurgulayıcı (component seviyesinde) ──────────────
  const OVERLAY_COLOR_HEX = {
    'Kahverengi': '#D2691E', 'Açık Mavi': '#4FA8D5', 'Pembe': '#FF69B4',
    'Turuncu': '#FFA500',   'Kırmızı': '#FF4444',   'Sarı': '#FFD700',
    'Yeşil': '#52BE80',     'Lacivert': '#2E86C1',
    'Demir Yolları': '#AAAAAA', 'Kamu Hizmetleri': '#ADB5BD',
    'Brown': '#D2691E', 'Light Blue': '#4FA8D5', 'Pink': '#FF69B4',
    'Orange': '#FFA500', 'Red': '#FF4444', 'Yellow': '#FFD700',
    'Green': '#52BE80', 'Navy': '#2E86C1', 'Railroad': '#AAAAAA', 'Utility': '#ADB5BD',
  };
  const formatSubtext = (text) => {
    if (!text) return null;
    const colorNames = Object.keys(OVERLAY_COLOR_HEX).sort((a, b) => b.length - a.length);
    const colorPattern = colorNames.map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const tokenRe = new RegExp(`("[^"]+")|(\\d+M)|(↔|→|←)|(${colorPattern})`, 'g');
    const parts = [];
    let last = 0, m;
    while ((m = tokenRe.exec(text)) !== null) {
      if (m.index > last) parts.push(<span key={`t-${last}`}>{text.slice(last, m.index)}</span>);
      if (m[1]) {
        // Tırnaklı kart adı → altın sarısı
        const inner = m[1].slice(1, -1);
        parts.push(<span key={`q-${m.index}`} className="overlay-token-card">"<b>{inner}</b>"</span>);
      } else if (m[2]) {
        // Para miktarı (5M, 8M) → parlak yeşil
        parts.push(<span key={`m-${m.index}`} className="overlay-token-money">{m[2]}</span>);
      } else if (m[3]) {
        // Ok sembolü → beyaz
        parts.push(<span key={`a-${m.index}`} className="overlay-token-arrow">{m[3]}</span>);
      } else if (m[4]) {
        // Renk adı → o rengin gerçek rengi
        const hex = OVERLAY_COLOR_HEX[m[4]];
        parts.push(<span key={`c-${m.index}`} className="overlay-token-color" style={{ color: hex, textShadow: `0 0 10px ${hex}99` }}>{m[4]}</span>);
      }
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(<span key={`t-end`}>{text.slice(last)}</span>);
    return parts;
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;

    // Yeni bir log geldiğinde aksiyonu analiz et ve gerekirse overlay göster
    if (!gameState?.log?.length) return;
    const lastEntry = gameState.log[gameState.log.length - 1];

    prevLogTimeRef.current = lastEntry.time;
    const lastLog = lastEntry.msg.toLowerCase();
    const rawMsg = lastEntry.msg;
    let overlay = null;
    const actorName = lastEntry.msg.split(',')[0] || lastEntry.msg.split(' ')[0] || 'Biri';
    const audioContext = { actorId: lastEntry.actorId, targetId: lastEntry.targetId };

    // Yardımcı: log içinden tırnaklı string çek ("..") → ["kart1", "kart2"]
    const extractQuoted = (msg) => { const m = []; let re = /"([^"]+)"/g, x; while ((x = re.exec(msg)) !== null) m.push(x[1]); return m; };
    // Yardımcı: log içinden sayısal değer çek (örn. "5M", "2M")
    const extractAmount = (msg) => { const m = msg.match(/(\d+)M/i); return m ? m[1] : null; };
    // Yardımcı: log içinden hedef oyuncu ismi çek ("X'dan", "X'ın", vb.)
    const extractTarget = (msg) => { const m = msg.match(/(?:ile\s+)([^'"]+?)(?:'[aeiouıöü]?[ndnı]|\s+için)/i); return m ? m[1].trim() : null; };

    // Eğer log nesnesinde kart metadatası varsa, uçuş animasyonunu tetikle!
    if (lastEntry.cards && Array.isArray(lastEntry.cards) && lastEntry.cards.length > 0 && lastEntry.actorId) {
      const fromPos = getCoordsForPlayer(lastEntry.actorId);
      const isDiscard = lastEntry.type === 'discard';
      const toPos = isDiscard 
        ? { x: window.innerWidth / 2 - 80, y: window.innerHeight / 2 - 50 } 
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 };

      lastEntry.cards.forEach((card, idx) => {
        setTimeout(() => {
          sfxWhoosh();
          const uniqueId = `${card.id}_log_${Math.random()}`;
          setDiscardFlyingCards(prev => [...prev, {
            id: uniqueId,
            card,
            sx: fromPos.x,
            sy: fromPos.y,
            dx: toPos.x,
            dy: toPos.y
          }]);
          setTimeout(() => {
            setDiscardFlyingCards(prev => prev.filter(c => c.id !== uniqueId));
            if (isDiscard) {
              sfxCrumple(audioContext);
              spawnSmoke(10);
            } else {
              sfxBuild();
              spawnSmoke(10);
            }
          }, 850);
        }, idx * 200);
      });
    }

    if (lastLog.includes('kasaya koydu')) {
      const amountM = extractAmount(rawMsg);
      const bankTotalMatch = rawMsg.match(/Güncel Kasa:\s*(\d+)M/);
      const bankTotal = bankTotalMatch ? bankTotalMatch[1] : null;
      const subtextTR = amountM
        ? `${actorName} ${amountM}M kasaya yatırdı.${bankTotal ? ` (Kasa toplamı: ${bankTotal}M)` : ''}`
        : `${actorName} banka kasasına para istifledi.`;
      const subtextEN = amountM
        ? `${actorName} deposited ${amountM}M into the vault.${bankTotal ? ` (Total vault: ${bankTotal}M)` : ''}`
        : `${actorName} deposited money into the bank vault.`;
      overlay = { text: 'KASAYA YATIRILDI!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '💰', type: 'success' };
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
        setTimeout(() => setActionOverlay(null), 2000);
      }
      return; // Kasaya koydu ise başka kontrollere girme
    }

    if (lastLog.includes('anlaşma bozucu')) {
      // "...X'ın TAM_RENKADİ setinin tamamını ele geçirmeye çalışıyor!" veya "...X'ın RENK setini çaldı!"
      const colorMatch = rawMsg.match(/([A-ZÇĞİÖŞÜa-zçğışöüñ]+(?:\s+[A-ZÇĞİÖŞÜa-zçğışöüñ]+)*)\s+set/);
      const victimMatch = rawMsg.match(/([\w\u00C0-\u024F]+)'[ıi]n\s+.*?set/);
      const colorName = colorMatch ? colorMatch[1] : '';
      const victim = victimMatch ? victimMatch[1] : '';
      const subtextTR = victim && colorName
        ? `${actorName}, ${victim}'ın tüm ${colorName} setini gasp etti! 💀`
        : `Eyvah! ${actorName} Anlaşma Bozucu oynayarak koca bir seti gasp etti!`;
      const subtextEN = victim && colorName
        ? `${actorName} seized ${victim}'s entire ${colorName} set! 💀`
        : `Oh no! ${actorName} played Deal Breaker and stole a full set!`;
      overlay = { text: 'ANLAŞMA BOZULDU!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '💣', type: 'danger' };
      playTurkishVoice(`İşte bu bir soygun! ${actorName} Anlaşma Bozucu oynadı ve koca bir seti çaldı.`);
      sfxGlassBreak(audioContext);
      setBoardShake('heavy'); setTimeout(() => setBoardShake(false), 1200);
      sfxActionDealbreaker(audioContext);
    }
    else if (lastLog.includes('hırsız sincap') || lastLog.includes('sincap')) {
      // "...X'ın elinden rastgele bir kart çaldı!" veya "...X'ın elinden kart çalmaya çalıştı"
      const victimMatch = rawMsg.match(/([\w\u00C0-\u024F]+)'[ıiın]{1,2}\s+elinden/);
      const victim = victimMatch ? victimMatch[1] : null;
      const alreadyStolen = lastLog.includes('çaldı!');
      const subtextTR = victim
        ? alreadyStolen
          ? `${actorName}, ${victim}'ın elinden gizlice bir kart kaptı! 🐿️`
          : `${actorName}, ${victim}'ın elinden kart çalmaya çalışıyor! (itiraz süresi)`
        : `Dikkat! ${actorName} hırsız sincap kartı oynadı ve elden kart çaldı!`;
      const subtextEN = victim
        ? alreadyStolen
          ? `${actorName} sneakily snatched a card from ${victim}'s hand! 🐿️`
          : `${actorName} is trying to steal from ${victim}'s hand! (challenge window)`
        : `${actorName} snuck in and stole a card from hand!`;
      overlay = { text: 'HIRSIZ SİNCAP!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🐿️', type: 'warning' };
      playTurkishVoice(`Dikkat! ${actorName} hırsız sincap kartı oynadı ve elden kart çalıyor!`);
      sfxActionSlyDeal(audioContext);
    }
    else if (lastLog.includes('reddet') && (lastLog.includes('karşı') || lastLog.includes('karşı reddet'))) {
      overlay = { text: 'KARŞI REDDET!', subtext: lang === 'en' ? `Incredible! ${actorName} countered the counter-attack!` : `İnanılmaz! ${actorName} itiraza itiraz (karşı reddet) kartı fırlattı!`, icon: '🛡️', type: 'danger' };
      playTurkishVoice(`Hadi oradan! ${actorName} reddet kartı oynadı.`);
      sfxActionCounterJustSayNo(audioContext);
      sfxSwordClash(audioContext);
    }
    else if (lastLog.includes('reddet')) {
      overlay = { text: 'REDDEDİLDİ!', subtext: lang === 'en' ? `${actorName} blocked the move using Just Say No!` : `${actorName} Just Say No fırlatarak hamleyi engelledi!`, icon: '🛡️', type: 'info' };
      playTurkishVoice(`Hadi oradan! ${actorName} reddet kartı oynadı.`);
      sfxActionJustSayNo(audioContext);
    }
    else if (lastLog.includes('sinsi') || lastLog.includes('çaldı') || lastLog.includes('aldı!')) {
      // Log format 1 (actionSlyDeal tetiklenince): "X "Sinsi Anlaşma" kullandı! Y'ın "KartAdı" arazisini çalmak için hamle yaptı."
      // Log format 2 (finalizeChallenge): "X "KartAdı" arazisini Y'dan aldı!"
      const quoted = extractQuoted(rawMsg);
      const cardName = quoted.find(q => !q.includes('Sinsi') && !q.includes('Anlaşma')) || null;
      // Hedef oyuncuyu bul
      const victimMatch = rawMsg.match(/([\w\u00C0-\u024F]+)'[ıi](?:[nd]|\s)/) || rawMsg.match(/(\w+)'dan\s+aldı/);
      const victim = victimMatch ? victimMatch[1] : null;
      const subtextTR = cardName && victim
        ? `${actorName}, ${victim}'ın "${cardName}" arazisini sinsice çaldı! 🥷`
        : cardName
          ? `${actorName} "${cardName}" arazisini sinsice kaptı! 🥷`
          : `${actorName} sinsice tek bir arazi çaldı!`;
      const subtextEN = cardName && victim
        ? `${actorName} sneakily stole "${cardName}" from ${victim}! 🥷`
        : cardName
          ? `${actorName} snatched "${cardName}"! 🥷`
          : `${actorName} sneakily stole a single property!`;
      overlay = { text: 'SİNSİ ANLAŞMA!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🥷', type: 'warning' };
      playTurkishVoice(`${actorName} sinsi bir şekilde arazi çaldı.`);
      sfxActionSlyDeal(audioContext);
    }
    else if (lastLog.includes('zorunlu') || lastLog.includes('takas başlattı') || (lastLog.includes('takas etti') && !lastLog.includes('barışçıl'))) {
      // Log format 1 (actionForcedDeal): "X zorunlu takas başlattı! Y ile arazi değiş-tokuşu istiyor."
      // Log format 2 (finalizeChallenge): "X, "BenimKartım" ile Y'ın "OnunKartı" arazisini takas etti!"
      const quoted = extractQuoted(rawMsg);
      const myCard = quoted[0] || null;
      const theirCard = quoted[1] || null;
      // Hedef isim: "Y ile" veya "Y'ın"
      const victimMatch = rawMsg.match(/ile\s+([\w\u00C0-\u024F]+)'/) || rawMsg.match(/ile\s+([\w\u00C0-\u024F]+)\s+arazi/);
      const victim = victimMatch ? victimMatch[1] : null;
      const subtextTR = myCard && theirCard
        ? `${actorName} "${myCard}" ↔ "${theirCard}" takasını zorla yaptırdı!`
        : victim
          ? `${actorName}, ${victim} ile arazi değiş-tokuşunu zorladı!`
          : `${actorName} zorunlu takas başlattı, kartlar el değiştiriyor!`;
      const subtextEN = myCard && theirCard
        ? `${actorName} force-swapped "${myCard}" ↔ "${theirCard}"!`
        : victim
          ? `${actorName} forced a swap with ${victim}!`
          : `${actorName} forced a property swap!`;
      overlay = { text: 'ZORUNLU TAKAS!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🔁', type: 'info' };
      playTurkishVoice(`${actorName} zorunlu takas oynadı! Kartlar el değiştiriyor.`);
      sfxActionForcedDeal(audioContext);
    }
    else if (lastLog.includes('kirası topluyor') || lastLog.includes('kira istiyor') || lastLog.includes('kira kartı') || lastLog.includes('joker kira')) {
      // Log: "X, RENK kirası topluyor! Y, Z için NM borç çıkartıldı." veya "X Joker Kira oynadı! Y hedef seçildi ve NM ödemesi istendi."
      const amountM = extractAmount(rawMsg);
      const doubleRent = lastLog.includes('2x') || lastLog.includes('iki kat') || lastLog.includes('çifte');
      const colorMatch = rawMsg.match(/([A-ZÇĞİÖŞÜ][a-zçğışöüñ]+(?:\s+[A-ZÇĞİÖŞÜa-zçğışöüñ]+)*)\s+kiras/);
      const colorName = colorMatch ? colorMatch[1] : null;
      const subtextTR = amountM
        ? `${actorName}${colorName ? ` (${colorName})` : ''} ${doubleRent ? '⚡×2 ' : ''}${amountM}M kira talep ediyor! Pamuk eller cebe!`
        : `${actorName} kira talep ediyor! Pamuk eller cebe!`;
      const subtextEN = amountM
        ? `${actorName}${colorName ? ` (${colorName})` : ''} demands ${doubleRent ? '⚡×2 ' : ''}${amountM}M rent! Pay up!`
        : `${actorName} is collecting rent! Pay up!`;
      overlay = { text: 'KİRA İSTENDİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '💸', type: 'danger' };
      playTurkishVoice(`${actorName} kira istiyor. Pamuk eller cebe!`);
      sfxRentCardPlayed(audioContext);
    }
    else if (lastLog.includes('çifte') || lastLog.includes('iki kat') || lastLog.includes('double rent')) {
      overlay = { text: 'İKİ KAT KİRA!', subtext: lang === 'en' ? `Rent value has been doubled!` : `Kira bedeli iki katına çıkartıldı!`, icon: '⚡', type: 'danger' };
      sfxDoubleRent(audioContext);
    }
    else if (lastLog.includes('borç tahsildarı') || lastLog.includes('tahsildar') || lastLog.includes('haciz') || lastLog.includes('borç')) {
      // Log: "X "Borç Tahsildarı" oynadı, Y'dan 5M istiyor"
      const amountM = extractAmount(rawMsg);
      const victimMatch = rawMsg.match(/,\s*([\w\u00C0-\u024F]+)'[^,]+?(\d+)M/);
      const victim = victimMatch ? victimMatch[1] : null;
      const subtextTR = victim && amountM
        ? `${actorName}, ${victim}'dan ${amountM}M borç tahsil ediyor! Hemen öde!`
        : amountM
          ? `${actorName} borç tahsildarı oynadı! ${amountM}M ödenmeli!`
          : `${actorName} borç tahsildarı oynadı! Herkesten 2M tahsil ediyor!`;
      const subtextEN = victim && amountM
        ? `${actorName} is collecting ${amountM}M debt from ${victim}! Pay up!`
        : amountM
          ? `${actorName} played Debt Collector! ${amountM}M due!`
          : `${actorName} played Debt Collector! Pay 5M!`;
      overlay = { text: 'BORÇ İSTENDİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🧾', type: 'danger' };
      playTurkishVoice(`${actorName} borç tahsildarı oynadı. Paraları hemen masaya dökün.`);
      sfxActionDebtCollector(audioContext);
      sfxActionBirthday(audioContext);
    }
    else if (lastLog.includes('doğum günü') || lastLog.includes('doğum günüm')) {
      // Log: "X "Doğum Günüm!" oynadı! Herkes 2M ödeyecek"
      const amountM = extractAmount(rawMsg) || '2';
      const subtextTR = `🎉 Bugün ${actorName}'in doğum günü! Herkes ${amountM}M hediye verecek!`;
      const subtextEN = `🎉 It's ${actorName}'s birthday! Everyone must give ${amountM}M!`;
      overlay = { text: 'MUTLU YILLAR!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🎂', type: 'success' };
      playTurkishVoice(`Bugün ${actorName}'in doğum günü! Herkes hediye olarak para versin.`);
      sfxPartyHorn();
      sfxActionBirthday(audioContext);
    }
    else if (lastLog.includes('geç go') || lastLog.includes('başlangıç')) {
      // Log: "X "Geç Go!" oynadı, 2 kart çekti"
      const deckMatch = rawMsg.match(/Deste:\s*(\d+)/);
      const deckCount = deckMatch ? deckMatch[1] : null;
      const subtextTR = `${actorName} "Geç Go!" oynadı ve desteden 2 kart çekti.${deckCount ? ` (Destede ${deckCount} kart kaldı)` : ''}`;
      const subtextEN = `${actorName} played Pass Go and drew 2 cards.${deckCount ? ` (${deckCount} cards left in deck)` : ''}`;
      overlay = { text: 'KART ÇEKİLİYOR!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🎴', type: 'success' };
      playTurkishVoice(`${actorName} başlangıç kartı oynadı ve desteden iki yeni kart çekti.`);
      sfxActionPassGoTwoDraw(audioContext);
    }
    else if (lastLog.includes('otel inşa')) {
      // Log: "X muazzam bir yatırım yaptı! RENK setine bir 🏨 Otel inşa etti."
      const colorMatch = rawMsg.match(/([A-ZÇĞİÖŞÜ][a-zçğışöüñ]+(?:\s+[A-ZÇĞİÖŞÜa-zçğışöüñ]+)*)\s+setine/);
      const colorName = colorMatch ? colorMatch[1] : null;
      const subtextTR = colorName
        ? `${actorName} ${colorName} setine 🏨 Otel dikti! Bu setten geçenler yanacak!`
        : `${actorName} mülküne otel dikti! Kira bedeli 4M arttı!`;
      const subtextEN = colorName
        ? `${actorName} built a 🏨 Hotel on the ${colorName} set! Anyone passing pays big!`
        : `${actorName} built a hotel! Rent increased by 4M!`;
      overlay = { text: 'OTEL İNŞA EDİLDİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🏨', type: 'success' };
      playTurkishVoice(`Ohooo! ${actorName} yeni bir otel dikti, buradan geçen yandı!`);
      sfxHotel(audioContext);
    }
    else if (lastLog.includes('ev inşa') || (lastLog.includes('ev') && lastLog.includes('inşa'))) {
      const colorMatch = rawMsg.match(/([A-ZÇĞİÖŞÜ][a-zçğışöüñ]+(?:\s+[A-ZÇĞİÖŞÜa-zçğışöüñ]+)*)\s+setine/);
      const colorName = colorMatch ? colorMatch[1] : null;
      const subtextTR = colorName
        ? `${actorName} ${colorName} setine 🏠 Ev dikti! Kira daha da pahalı!`
        : `${actorName} mülküne ev dikti! Kira bedeli 3M arttı!`;
      const subtextEN = colorName
        ? `${actorName} built a 🏠 House on the ${colorName} set! Rent just went up!`
        : `${actorName} built a house! Rent increased by 3M!`;
      overlay = { text: 'EV İNŞA EDİLDİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🏠', type: 'success' };
      playTurkishVoice(`Ohooo! ${actorName} yeni bir ev dikti, buradan geçen yandı!`);
      sfxHouse(audioContext);
    }
    else if (lastLog.includes('grubuna') && lastLog.includes('arazisini ekledi')) {
      // Log: "X, RENK grubuna "KartAdı" arazisini ekledi."
      const quoted = extractQuoted(rawMsg);
      const cardName = quoted[0] || null;
      const colorMatch = rawMsg.match(/,\s*([A-ZÇĞİÖŞÜ][a-zçğışöüñ]+(?:\s+[A-ZÇĞİÖŞÜa-zçğışöüñ]+)*)\s+grubuna/);
      const colorName = colorMatch ? colorMatch[1] : null;
      const subtextTR = cardName && colorName
        ? `${actorName} "${cardName}" kartını ${colorName} setine koydu.`
        : cardName
          ? `${actorName} "${cardName}" arazisini masaya yerleştirdi.`
          : `${actorName} masaya yeni bir mülk yerleştirdi.`;
      const subtextEN = cardName && colorName
        ? `${actorName} placed "${cardName}" into the ${colorName} set.`
        : cardName
          ? `${actorName} placed "${cardName}" on the board.`
          : `${actorName} put a new property card on the board.`;
      overlay = { text: 'MÜLK EKLENDİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🗺️', type: 'success' };
      playTurkishVoice(`${actorName} masaya yeni bir arazi kartı yerleştirdi.`);
      if (lastLog.includes('joker')) {
        sfxJokerPropertyPlayed(audioContext);
      } else {
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
    // Log: "X "KartAdı" arazisini RENK rengine taşıdı"
    const quoted = extractQuoted(rawMsg);
    const cardName = quoted[0] || null;
    const colorMatch = rawMsg.match(/([A-ZÇĞİÖŞÜ][a-zçğışöüñ]+)\s+rengine\s+taşıdı/);
    const colorName = colorMatch ? colorMatch[1] : null;
    const subtextTR = cardName && colorName
      ? `${actorName} "${cardName}" kartını ${colorName} rengine çevirdi!`
      : `${actorName} çoklu renk arazi kartının yönünü değiştirdi!`;
    const subtextEN = cardName && colorName
      ? `${actorName} flipped "${cardName}" to the ${colorName} color!`
      : `${actorName} rotated their multi-color property card.`;
    overlay = { text: 'RENK DEĞİŞTİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🎨', type: 'info' };
  }
  else if (lastLog.includes('ödedi') && lastLog.includes('kasası')) {
    // Log: "X, Y'ın kasasına ZM ödedi."
    const amountM = extractAmount(rawMsg);
    const receiverMatch = rawMsg.match(/([\w\u00C0-\u024F]+)'[ıi]n\s+kasasına/);
    const receiver = receiverMatch ? receiverMatch[1] : null;
    const subtextTR = amountM && receiver
      ? `${actorName}, ${receiver}'a ${amountM}M ödedi. İşlem tamamlandı.`
      : amountM
        ? `${actorName} ${amountM}M ödedi.`
        : `Ödeme işlemi başarıyla tamamlandı.`;
    const subtextEN = amountM && receiver
      ? `${actorName} paid ${amountM}M to ${receiver}. Done!`
      : amountM
        ? `${actorName} paid ${amountM}M.`
        : `Payment completed successfully.`;
    overlay = { text: 'ÖDEME YAPILDI!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '💵', type: 'success' };
    // Büyük ödemelerde para sayma makinesi sesi, normalde metal sikke sesi
    if (amountM && parseInt(amountM) >= 3) {
      sfxCashCounter();
    } else {
      sfxCoin();
    }
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
    // Log: "X, Y ile barışçıl bir takas yapmak istiyor: ..."
    const victimMatch = rawMsg.match(/([\w\u00C0-\u024F]+)\s+ile\s+barışçıl/);
    const victim = victimMatch ? victimMatch[1] : null;
    const subtextTR = victim
      ? `${actorName}, ${victim}'e barışçıl takas teklifi sundu! Kabul edecek mi?`
      : `${actorName} barışçıl bir takas teklifi sundu!`;
    const subtextEN = victim
      ? `${actorName} proposed a peaceful trade to ${victim}! Will they accept?`
      : `${actorName} proposed a property trade.`;
    overlay = { text: 'TAKAS TEKLİFİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🤝', type: 'warning' };
    sfxTradeProposed();
  }
  else if (lastLog.includes('takas yaptı') || lastLog.includes('takas gerçekleştirdi')) {
    // Log: "X ve Y anlaşmaya vardı. X, Y'a ... verdi ve ... aldı."
    const quoted = extractQuoted(rawMsg);
    const subtextTR = quoted.length >= 2
      ? `"${quoted[0]}" ↔ "${quoted[1]}" takası başarıyla gerçekleşti! ✅`
      : `Takas taraflarca kabul edildi ve gerçekleştirildi!`;
    const subtextEN = quoted.length >= 2
      ? `"${quoted[0]}" ↔ "${quoted[1]}" trade completed! ✅`
      : `The trade negotiation succeeded!`;
    overlay = { text: 'TAKAS YAPILDI!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '✅', type: 'success' };
    sfxTradeAccepted();
  }
  else if (lastLog.includes('takas teklifini reddetti')) {
    const victimMatch = rawMsg.match(/([\w\u00C0-\u024F]+)\s+takas teklifini reddetti/);
    const victim = victimMatch ? victimMatch[1] : null;
    const subtextTR = victim ? `${victim} takas teklifini geri çevirdi!` : `Takas teklifi reddedildi!`;
    const subtextEN = victim ? `${victim} declined the trade offer!` : `The trade offer was declined.`;
    overlay = { text: 'TAKAS REDDEDİLDİ!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '❌', type: 'danger' };
    sfxTradeRejected();
  }
  else if (lastLog.includes('karaborsa')) {
    overlay = { text: 'KARABORSA!', subtext: lang === 'en' ? `${actorName} entered the dark black market!` : `${actorName} gizemli karaborsaya adım attı!`, icon: '🕵️‍♂️', type: 'warning' };
    sfxBlackMarket(audioContext);
  }
  else if (lastLog.includes('zar attı') && lastLog.includes('kötü şans')) {
    overlay = { text: 'KÖTÜ ŞANS!', subtext: lang === 'en' ? `A bad roll lost a random card!` : `Kötü şans zarı atıldı! Elden kart kaybedildi!`, icon: '😢', type: 'danger' };
    sfxDiceRoll();
    sfxWompWomp();
  }
  else if (lastLog.includes('zar attı') && lastLog.includes('jackpot')) {
    overlay = { text: 'JACKPOT!', subtext: lang === 'en' ? `Jackpot! Drew 2 cards successfully!` : `Harika! Jackpot zarı atıldı ve 2 kart çekildi!`, icon: '🎰', type: 'success' };
    sfxDiceRoll();
    sfxJackpot();
  }
  else if (lastLog.includes('zar attı') && lastLog.includes('şanslı')) {
    overlay = { text: 'ŞANSLI RULO!', subtext: lang === 'en' ? `Lucky roll! Saved from losing anything.` : `Şanslı! Eli boş olduğu için hiçbir şey kaybetmedi.`, icon: '🎲', type: 'info' };
    sfxDiceRoll();
    sfxCricket();
  }
  else if (lastLog.includes('kart attı')) {
    // Log: "X, el limitini aşığı için Y kartını ıskartaya attı" gibi
    const quoted = extractQuoted(rawMsg);
    const cardName = quoted[0] || null;
    const handLimitMatch = rawMsg.match(/(\d+)\s+kart/i);
    const subtextTR = cardName
      ? `${actorName} "${cardName}" kartını el limiti nedeniyle çöpe attı.`
      : `${actorName} el limiti sınırından ötürü kart ıskartaya attı.`;
    const subtextEN = cardName
      ? `${actorName} discarded "${cardName}" due to the hand limit.`
      : `${actorName} discarded a card due to hand limit.`;
    overlay = { text: 'KART ATILDI!', subtext: lang === 'en' ? subtextEN : subtextTR, icon: '🗑️', type: 'info' };
    sfxCrumple(audioContext);
  }
  else if (lastLog.includes('süresi bittiği için') || lastLog.includes('otomatik geçti')) {
    overlay = { text: 'ZAMAN AŞIMI!', subtext: lang === 'en' ? `Turn skipped automatically.` : `Süre bittiği için tur otomatik olarak sonlandırıldı.`, icon: '💤', type: 'warning' };
  }
  else if (lastLog.includes('geri aldı') || lastLog.includes('↩️')) {
    overlay = { text: 'HAMLE GERİ ALINDI!', subtext: lang === 'en' ? `The last action was reverted.` : `Yapılan son hamle başarıyla geri alındı.`, icon: '↩️', type: 'warning' };
  }
  else if (lastLog.includes('masayı devirdi') || lastLog.includes('ragequit') || lastLog.includes('rage_quit')) {
    overlay = { text: 'MASAYI DEVİRDİ!', subtext: lang === 'en' ? `Rage quit! Table flipped!` : `Rage Quit! Sinirlenen oyuncu masayı havaya uçurdu!`, icon: '┬─┬ ︵ ┻━┻', type: 'danger' };
    sfxTableSlap();
    sfxRageQuit();
  }
  else if (lastLog.includes('kazandi') || lastLog.includes('kazandı')) {
    overlay = { text: 'KAZANDI! 🏆', subtext: lang === 'en' ? `Victory belongs to ${actorName}!` : `Zafer ${actorName} oyuncusunun oldu!`, icon: '🏆', type: 'success' };
    sfxWin();
  }
  else if (lastLog.includes('oyun başladı')) {
    overlay = { text: 'OYUN BAŞLADI!', subtext: lang === 'en' ? `Get ready to deal!` : `Kartlar dağıtıldı, amansız mücadele başladı!`, icon: '🎮', type: 'success' };
  }


  if (overlay) {
    setActionOverlay(overlay);
    // Trigger play effect particles on ALL major game events
    const moneyIcons = ['🧾', '💰', '💸', '💵'];
    const celebrateIcons = ['🏆', '🎂', '✅', '✨'];
    const actionIcons = ['🥷', '🔁', '💣', '🃏'];
    if (moneyIcons.includes(overlay.icon) || celebrateIcons.includes(overlay.icon)) {
      spawnMoney({ count: 16 });
    } else if (actionIcons.includes(overlay.icon)) {
      spawnMoney({ count: 10 });
    } else if (overlay.icon === '🗺️' || overlay.icon === '🏠' || overlay.icon === '🏨') {
      // Property / house / hotel — smaller burst
      spawnMoney({ count: 8 });
    } else if (overlay.icon === '🎴') {
      spawnMoney({ count: 6 });
    }
    setTimeout(() => setActionOverlay(null), 2000);
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
    } else if (info.offset.y > 120) {
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
  if (!gameState?.currentPlayerId || !playerId || screen !== 'game') return; // Guard clause
  const prev = prevCurrentPlayerRef.current;
  const curr = gameState.currentPlayerId;
  if (prev !== null && prev !== curr) {
    if (prev === playerId) {
      setActionOverlay({ text: lang === 'en' ? 'TURN ENDED!' : 'TUR BİTTİ!', icon: '⏳' });
      setTimeout(() => setActionOverlay(null), 2000);
      sfxTurnEnded();
    }
    if (curr === playerId) {
      setActionOverlay({ text: lang === 'en' ? 'YOUR TURN!' : 'SIRA SENDE!', icon: '🎲' });
      setTimeout(() => setActionOverlay(null), 2000);
      sfxYourTurn();
      setShowTurnFlash(true);
      setTimeout(() => setShowTurnFlash(false), 1200);
      // Titreşim (Destekleyen cihazlar için)
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    } else {
      const p = gameState.players.find(pl => pl.id === curr);
      if (p) {
        setActionOverlay({ text: lang === 'en' ? `${p.name.toUpperCase()}'S TURN!` : `${p.name.toUpperCase()}'İN SIRASI!`, icon: '🎲' });
        setTimeout(() => setActionOverlay(null), 2000);
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
    else {
      setError('');
      // Trigger dice roll animation
      setDiceRollResult(res.roll);
      setIsDiceRolling(true);
      sfxDiceRoll();
      setTimeout(() => {
        setIsDiceRolling(false);
      }, 1300);
    }
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
                {entry.cards && Array.isArray(entry.cards) && entry.cards.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {entry.cards.map((c, cIdx) => (
                      <div key={cIdx} style={{ transform: 'scale(0.55)', transformOrigin: 'top left', width: 38 * 0.55, height: 52 * 0.55, marginRight: 22, marginBottom: 8 }}>
                        <CardVisual card={c} small lang={lang} />
                      </div>
                    ))}
                  </div>
                )}
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

  // Group bank cards by value
  const bankGroups = {};
  (p.bank || []).forEach(c => {
    const val = c.value || 0;
    if (!bankGroups[val]) bankGroups[val] = [];
    bankGroups[val].push(c);
  });

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
        {/* Mega Emote Fire Button */}
        {me?.selectedMegaEmote && me.selectedMegaEmote !== 'default' && (() => {
          const megaCfg = {
            tomato_splat: { label: '🍅 DOMATES YAĞMURU', color: '#e74c3c' },
            make_it_rain: { label: '💸 PARA SAÇMA', color: '#2ecc71' },
            salt_bae: { label: '🧂 TUZLAMA', color: '#ecf0f1' },
            nuke_boom: { label: '☢️ NÜKLEER', color: '#f39c12' }
          };
          const cfg = megaCfg[me.selectedMegaEmote] || { label: '📣 MEGA İFADE', color: '#9b59b6' };
          return (
            <button
              onClick={() => {
                socket?.emit('sendChatMessage', { text: `[MEGA_EMOTE:${me.selectedMegaEmote}]` });
                setViewingPlayerId(null);
              }}
              style={{
                marginTop: 10, width: '100%',
                background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}88)`,
                border: `2px solid ${cfg.color}`,
                color: '#fff', fontSize: 13, fontWeight: 900,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                boxShadow: `0 4px 20px ${cfg.color}66`,
                animation: 'active-player-pulse 1.8s ease-in-out infinite',
                letterSpacing: 1
              }}
            >
              {cfg.label}
            </button>
          );
        })()}
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

      {/* BANK ASSETS CONTAINER (GROUPED VAULT) */}
      <div style={{
        marginBottom: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12
      }}>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12, fontWeight: '800', letterSpacing: '0.4px' }}>
          {lang === 'en' ? `🏦 BANK VAULT (${p.bankTotal}M)` : `🏦 BANKA KASASI (${p.bankTotal}M)`}
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          padding: '4px 0'
        }}>
          {Object.entries(bankGroups)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([val, cards]) => {
              const cardValue = Number(val);
              const billColor = cardValue >= 10 ? '#FFD700' : cardValue >= 5 ? '#9B59B6' : cardValue >= 3 ? '#3498DB' : '#2ECC71';
              return (
                <div
                  key={val}
                  style={{
                    background: `linear-gradient(135deg, ${billColor}25, rgba(0,0,0,0.6))`,
                    border: `1.5px solid ${billColor}66`,
                    borderRadius: 8,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (cards[0]) {
                      setPreviewCard(cards[0]);
                      setPreviewLocked(true);
                    }
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    width: 24,
                    height: 16,
                    borderRadius: 3,
                    background: billColor,
                    color: '#000',
                    fontSize: 9,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 3px rgba(0,0,0,0.5)'
                  }}>
                    {val}M
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}>
                    x{cards.length}
                  </span>
                </div>
              );
            })}
          {(!p.bank || p.bank.length === 0) && (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
              {lang === 'en' ? 'No cash in the bank...' : 'Bankada hiç nakit yok...'}
            </span>
          )}
        </div>
      </div>

      {/* PROPERTIES CONTAINER (COMPACT GRID) */}
      <div style={{
        padding: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12
      }}>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12, fontWeight: '800', letterSpacing: '0.4px' }}>
          {lang === 'en' ? '🏘️ PROPERTIES & SETS' : '🏘️ ARSALAR VE SETLER'}
        </div>
        {Object.keys(p.properties || {}).length > 0 && Object.values(p.properties || {}).flat().length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: 8 }}>
            {Object.entries(p.properties || {}).map(([color, cards]) => (
              cards.length > 0 && (
                <CompactPropertySet
                  key={color}
                  color={color}
                  cards={cards}
                  buildings={p.buildings}
                  lang={lang}
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

useEffect(() => {
  if (isChatOpen && chatEndRef.current) {
    const parent = chatEndRef.current.parentNode;
    if (parent) {
      parent.scrollTop = parent.scrollHeight;
    }
  }
}, [chatMessages, isChatOpen]);

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
                                  <div style={{ width: '100%', height: 3, background: getMiniCardStripeStyle(c, color) }} />
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
                                      showToast(lang === 'en' ? "You cannot trade a card from a completed set!" : "Tamamlanmış bir setten kart veremezsiniz!", "warning");
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

  if (modal.type === 'manageSet') {
    const { color, cards } = modal;
    const info = COLOR_INFO[color] || { hex: '#aaa', name: color };
    return (
      <Modal title={lang === 'en' ? `Set Management - ${getColorName(color, lang)}` : `Set Yönetimi - ${getColorName(color, lang)}`} onClose={() => setModal(null)}>
        <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>
          {lang === 'en' ? 'Click on a card to change its color or view details.' : 'Detayları görmek veya renk değiştirmek için kartların altındaki butonları kullanabilirsiniz.'}
        </p>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '10px 0', justifyContent: 'center', flexWrap: 'wrap' }}>
          {cards.map(c => {
            const canFlip = isMyTurn && (c.isWild || c.isDual);
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ cursor: 'pointer' }} onClick={() => { setPreviewCard(c); setPreviewLocked(true); }}>
                  <CardVisual card={c} small lang={lang} />
                </div>
                {canFlip ? (
                  <button
                    onClick={() => handleFlip(c)}
                    style={{
                      ...btnStyle('linear-gradient(135deg, #f59e0b, #d97706)'),
                      fontSize: 11,
                      padding: '6px 12px',
                      borderRadius: 8,
                      margin: 0,
                      boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
                      fontWeight: 800
                    }}
                  >
                    🎨 {lang === 'en' ? 'Change Color' : 'Renk Değiştir'}
                  </button>
                ) : (
                  <button
                    onClick={() => { setPreviewCard(c); setPreviewLocked(true); }}
                    style={{
                      ...btnStyle('rgba(255,255,255,0.08)'),
                      fontSize: 11,
                      padding: '6px 12px',
                      borderRadius: 8,
                      margin: 0,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    🔍 {lang === 'en' ? 'Inspect' : 'İncele'}
                  </button>
                )}
              </div>
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
                  {renderColorizedDetailedTip(getDetailedCardTip(card, lang))}
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
      <Modal title={authMode === 'login' ? (lang === 'en' ? '🔑 Member Login' : '🔑 Üye Girişi') : (lang === 'en' ? '📝 Register' : '📝 Kayıt Ol')} onClose={() => setModal(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 280 }}>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4, fontWeight: 'bold' }}>{lang === 'en' ? 'USERNAME' : 'KULLANICI ADI'}</label>
            <input
              value={authUsername}
              onChange={e => setAuthUsername(e.target.value)}
              placeholder={lang === 'en' ? "username" : "kullanici_adi"}
              style={{ ...inputStyle, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4, fontWeight: 'bold' }}>{lang === 'en' ? 'PASSWORD' : 'ŞİFRE'}</label>
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
            {authMode === 'login' ? (lang === 'en' ? 'Log In' : 'Giriş Yap') : (lang === 'en' ? 'Register' : 'Kayıt Ol')}
          </button>

          <div style={{ textAlign: 'center', fontSize: 12, marginTop: 10 }}>
            {authMode === 'login' ? (
              <span style={{ color: '#94a3b8' }}>
                {lang === 'en' ? "Don't have an account? " : "Hesabınız yok mu? "}
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('register'); }} style={{ color: '#9b59b6', fontWeight: 'bold', textDecoration: 'none' }}>{lang === 'en' ? "Register here" : "Kayıt Olun"}</a>
              </span>
            ) : (
              <span style={{ color: '#94a3b8' }}>
                {lang === 'en' ? "Already a member? " : "Zaten üye misiniz? "}
                <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode('login'); }} style={{ color: '#9b59b6', fontWeight: 'bold', textDecoration: 'none' }}>{lang === 'en' ? "Log In here" : "Giriş Yapın"}</a>
              </span>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  if (modal.type === 'leaderboard') {
    return (
      <Modal title={lang === 'en' ? "🏆 LEADERBOARD (GLOBAL)" : "🏆 LİDERLİK TABLOSU (GLOBAL)"} onClose={() => setModal(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 320, maxHeight: 400, overflowY: 'auto', paddingRight: 6 }}>
          {/* Period Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8, background: 'rgba(0,0,0,0.3)', padding: 3, borderRadius: 8 }}>
            {[
              { id: 'daily', tr: 'Günlük', en: 'Daily' },
              { id: 'weekly', tr: 'Haftalık', en: 'Weekly' },
              { id: 'monthly', tr: 'Aylık', en: 'Monthly' },
              { id: 'allTime', tr: 'Genel', en: 'All-Time' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { fetchLeaderboard(t.id); sfxClick(); }}
                style={{
                  flex: 1,
                  padding: '6px 4px',
                  fontSize: 10,
                  fontWeight: 'bold',
                  background: leaderboardPeriod === t.id ? 'linear-gradient(135deg, #f1c40f, #f39c12)' : 'transparent',
                  color: leaderboardPeriod === t.id ? '#000' : '#aaa',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}
              >
                {lang === 'en' ? t.en : t.tr}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px 60px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6, fontSize: 11, fontWeight: 'bold', color: '#94a3b8' }}>
            <span>{lang === 'en' ? 'Rank' : 'Sıra'}</span>
            <span>{lang === 'en' ? 'Player' : 'Oyuncu'}</span>
            <span style={{ textAlign: 'center' }}>{lang === 'en' ? 'Wins' : 'Zafer'}</span>
            <span style={{ textAlign: 'center' }}>{lang === 'en' ? 'Points' : 'Puan'}</span>
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
                <div
                  className={`avatar-container border-style-${item.selectedBorder || 'default'}`}
                  style={{
                    width: 24,
                    height: 24,
                    boxShadow: item.selectedBorder && item.selectedBorder !== 'default' ? 'none' : '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/${item.avatar || 'avataaars'}/svg?seed=${item.username}`}
                    alt=""
                  />
                </div>
                <span style={{ fontWeight: item.username === dbUser?.username ? 'bold' : 'normal', color: item.username === dbUser?.username ? '#FFD700' : '#fff' }}>
                  {item.displayName || item.username}
                </span>
              </div>
              <span style={{ textAlign: 'center', fontWeight: 'bold', color: '#2ECC71' }}>{item.wins}</span>
              <span style={{ textAlign: 'center', fontWeight: 'bold', color: '#F1C40F' }}>{item.points}</span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic', padding: 20 }}>{lang === 'en' ? 'No players found for this period.' : 'Bu periyot için kayıtlı üye bulunmuyor.'}</div>
          )}
        </div>
      </Modal>
    );
  }

  if (modal.type === 'shop') {
    const unlockedBorders = dbUser?.unlockedBorders || ['default'];
    const unlockedCardBacks = dbUser?.unlockedCardBacks || ['default'];
    const unlockedTitles = dbUser?.unlockedTitles || ['default'];
    const unlockedPlayEffects = dbUser?.unlockedPlayEffects || ['default'];
    const unlockedTableThemes = dbUser?.unlockedTableThemes || ['default'];
    const unlockedDiceSkins = dbUser?.unlockedDiceSkins || ['default'];
    const unlockedAuras = dbUser?.unlockedAuras || ['default'];
    const unlockedChatSkins = dbUser?.unlockedChatSkins || ['default'];
    const unlockedMegaEmotes = dbUser?.unlockedMegaEmotes || ['default'];

    const currentBorder = dbUser?.selectedBorder || 'default';
    const currentCardBack = dbUser?.selectedCardBack || 'default';
    const currentTitle = dbUser?.selectedTitle || 'default';
    const currentPlayEffect = dbUser?.selectedPlayEffect || 'default';
    const currentTableTheme = dbUser?.selectedTableTheme || 'default';
    const currentDiceSkin = dbUser?.selectedDiceSkin || 'default';
    const currentAura = dbUser?.selectedAura || 'default';
    const currentChatSkin = dbUser?.selectedChatSkin || 'default';
    const currentMegaEmote = dbUser?.selectedMegaEmote || 'default';

    const points = dbUser?.points || 0;

    const previewBorder = (hoveredShopItem?.type === 'border' ? hoveredShopItem.id : currentBorder);
    const previewCardBack = (hoveredShopItem?.type === 'cardBack' ? hoveredShopItem.id : currentCardBack);
    const previewTitle = (hoveredShopItem?.type === 'title' ? hoveredShopItem.id : currentTitle);
    const previewPlayEffect = (hoveredShopItem?.type === 'playEffect' ? hoveredShopItem.id : currentPlayEffect);
    const previewTableTheme = (hoveredShopItem?.type === 'tableTheme' ? hoveredShopItem.id : currentTableTheme);
    const previewDiceSkin = (hoveredShopItem?.type === 'diceSkin' ? hoveredShopItem.id : currentDiceSkin);
    const previewAura = (hoveredShopItem?.type === 'aura' ? hoveredShopItem.id : currentAura);
    const previewChatSkin = (hoveredShopItem?.type === 'chatSkin' ? hoveredShopItem.id : currentChatSkin);
    const previewMegaEmote = (hoveredShopItem?.type === 'megaEmote' ? hoveredShopItem.id : currentMegaEmote);

    const tableThemeItems = [
      { id: 'volcano', name: { tr: '🌋 Lav Çukuru', en: '🌋 Volcanic Rift' }, cost: 300, color: '#ff4500', desc: { tr: 'Sıcak akan lavlar ve yanan közler', en: 'Flowing volcanic magma background' } },
      { id: 'cosmic', name: { tr: '🌌 Kozmik Bulut', en: '🌌 Cosmic Nebulae' }, cost: 400, color: '#8e44ad', desc: { tr: 'Yıldızlar ve mor nebula bulutları', en: 'Deep space purple starry galaxy backdrop' } },
      { id: 'matrix', name: { tr: '🟢 Neon Matris', en: '🟢 Neon Grid' }, cost: 300, color: '#39ff14', desc: { tr: 'Siber kod yağmuru ve yeşil gridler', en: 'Cyberpunk neon green hacker grid layout' } },
      { id: 'gold', name: { tr: '👑 Altın Saray', en: '👑 Golden Palace' }, cost: 500, color: '#FFD700', desc: { tr: 'Lüks altın parçacıkları ve sarı ışıltılar', en: 'Luxury golden palace premium backdrop' } },
      { id: 'snow', name: { tr: '❄️ Kış Uykusu', en: '❄️ Winter Snowfall' }, cost: 350, color: '#a5f3fc', desc: { tr: 'Yumuşak kar taneleri ve buz mavisi atmosfer', en: 'Gentle snowflakes falling on ice blue backdrop' } },
      { id: 'blizzard', name: { tr: '💨 Kar Fırtınası', en: '💨 Blizzard Storm' }, cost: 500, color: '#e2e8f0', desc: { tr: 'Dondurucu fırtına rüzgarları ve kar birikintileri', en: 'Violent freezing blizzard storm with frost particles' } },
      { id: 'neon_alley', name: { tr: '🌆 Siber Sokak', en: '🌆 Neon Alley' }, cost: 450, color: '#ff00ff', desc: { tr: 'Mor ve turkuaz neon ışıklı siber şehir', en: 'Cyberpunk city alley with neon lights' } },
      { id: 'zen_garden', name: { tr: '🎋 Zen Bahçesi', en: '🎋 Zen Garden' }, cost: 350, color: '#2ecc71', desc: { tr: 'Huzurlu bambular ve yeşil bahçe masası', en: 'Bamboo forest and zen green garden table' } },
      { id: 'haunted_castle', name: { tr: '🏰 Drakula Şatosu', en: '🏰 Haunted Castle' }, cost: 480, color: '#7f00ff', desc: { tr: 'Loş mum ışıklı karanlık gotik şato', en: 'Dark gothic castle with dim candlelight' } },
      { id: 'pirate_ship', name: { tr: '🏴‍☠️ Korsan Kamarası', en: '🏴‍☠️ Pirate Ship' }, cost: 380, color: '#d4af37', desc: { tr: 'Eski ahşap haritalı denizci masası', en: 'Captain cabin wooden map table' } }
    ];

    const diceSkinItems = [
      { id: 'gold', name: { tr: '👑 Altın Zar', en: '👑 Gold Dice' }, cost: 150, color: '#FFD700', symbol: '🪙', desc: { tr: 'Zar atarken altın maden saçılır', en: 'Rolls premium golden luxury dice' } },
      { id: 'matrix', name: { tr: '🟢 Neon Zar', en: '🟢 Neon Dice' }, cost: 200, color: '#39ff14', symbol: '🔋', desc: { tr: 'Siber yeşil neon iz bırakan zar', en: 'Matrix green cyberpunk trail dice' } },
      { id: 'lava', name: { tr: '🔥 Lav Zarı', en: '🔥 Lava Dice' }, cost: 250, color: '#ff4500', symbol: '☄️', desc: { tr: 'Yanan alev topları fırlatan zar', en: 'Rolls burning volcanic ember dice' } },
      { id: 'cosmic', name: { tr: '🌌 Kozmik Zar', en: '🌌 Cosmic Dice' }, cost: 300, color: '#8e44ad', symbol: '🌌', desc: { tr: 'Kuyruklu yıldız izi bırakan mor zar', en: 'Nebula stardust space portal dice' } },
      { id: 'crystal', name: { tr: '🧊 Kristal Buz Zarı', en: '🧊 Crystal Ice Dice' }, cost: 250, color: '#a5f3fc', symbol: '❄️', desc: { tr: 'Şeffaf buzul kristalinden oyulmuş zar', en: 'Rolls frosted crystal ice dice' } },
      { id: 'wood_carved', name: { tr: '🪵 El Oyması Ahşap Zar', en: '🪵 Wood Carved Dice' }, cost: 150, color: '#8b5a2b', symbol: '🪵', desc: { tr: 'Tok ses çıkaran antik meşe ağacı zarı', en: 'Classic wooden dice roll sound' } },
      { id: 'emerald_dice', name: { tr: '💚 Zümrüt Zar', en: '💚 Emerald Dice' }, cost: 300, color: '#2ecc71', symbol: '💚', desc: { tr: 'Yeşil parıltılı lüks değerli taş zar', en: 'Luxury emerald gemstone dice' } }
    ];

    const borderItems = [
      { id: 'gold', name: { tr: 'Altın Çerçeve', en: 'Gold Border' }, cost: 150, color: '#FFD700', desc: { tr: 'Göz alıcı altın ışıltısı', en: 'Premium golden glow' } },
      { id: 'neon', name: { tr: 'Neon Çerçeve', en: 'Neon Border' }, cost: 250, color: '#ff00ff', desc: { tr: 'Fütüristik mor neon parlaması', en: 'Vibrant neon purple glow' } },
      { id: 'cyber', name: { tr: 'Siber Çerçeve', en: 'Cyber Border' }, cost: 350, color: '#39ff14', desc: { tr: 'Hacker yeşili matrix efekti', en: 'Cyberpunk green glow' } },
      { id: 'flame', name: { tr: 'Alevli Çerçeve', en: 'Flame Border' }, cost: 500, color: '#ff4500', desc: { tr: 'Efsanevi yanan alev halkası', en: 'Legendary burning flame border' } },
      { id: 'cosmic', name: { tr: 'Kozmik Çerçeve', en: 'Cosmic Border' }, cost: 600, color: '#8e44ad', desc: { tr: 'Uzay yıldızlı gizemli çerçeve', en: 'Mysterious space nebula border' } },
      { id: 'rgb', name: { tr: 'RGB Dalga Çerçeve', en: 'RGB Wave Border' }, cost: 400, color: '#ff3f34', desc: { tr: 'Gökkuşağı neon renk döngüsü', en: 'Rainbow neon color wave' } },
      { id: 'vortex', name: { tr: 'Girdap Çerçeve', en: 'Vortex Border' }, cost: 450, color: '#9b5de5', desc: { tr: 'Kozmik karanlık uzay girdabı', en: 'Cosmic space portal vortex' } },
      { id: 'tesla', name: { tr: 'Tesla Çerçeve', en: 'Tesla Border' }, cost: 350, color: '#00d2ff', desc: { tr: 'Elektrik kıvılcımlı parlama', en: 'Pulsing electric tesla spark border' } },
      { id: 'matrix_code', name: { tr: 'Matris Çerçeve', en: 'Matrix Border' }, cost: 300, color: '#00ff00', desc: { tr: 'Aşağı süzülen siber yeşil kod', en: 'Green matrix cyber hacker border' } },
      { id: 'frost', name: { tr: 'Buzlu Çerçeve', en: 'Frost Border' }, cost: 280, color: '#80deea', desc: { tr: 'Dondurucu buz kristali parıltısı', en: 'Icy frostbite glowing outline' } },
      { id: 'bio', name: { tr: 'Biyo Çerçeve', en: 'Biohazard Border' }, cost: 260, color: '#78ffd6', desc: { tr: 'Biyo-tehlike parlak toksik gaz', en: 'Toxic green biohazard border' } },
      { id: 'sakura', name: { tr: 'Sakura Çerçeve', en: 'Sakura Border' }, cost: 220, color: '#ff7ebb', desc: { tr: 'Pembe yaprak saçan kiraz çiçeği', en: 'Cherry blossom petal overlay' } },
      { id: 'pirate', name: { tr: 'Korsan Çerçevesi', en: 'Pirate Border' }, cost: 300, color: '#d4af37', desc: { tr: 'Altın sikkeler ve antik kurukafalar', en: 'Gold coins and pirate skull border' } },
      { id: 'haunted', name: { tr: 'Hayalet Çerçeve', en: 'Haunted Border' }, cost: 350, color: '#9b5de5', desc: { tr: 'Mor dumanlı tekinsiz gölge', en: 'Purple smoke haunted shadow glow' } }
    ];

    const cardBackItems = [
      { id: 'naruto', name: { tr: 'Naruto Teması', en: 'Naruto Back' }, cost: 150, symbol: '🍥', bg: 'linear-gradient(135deg, #ff5722, #e64a19)', border: '#ffeb3b', desc: { tr: 'Girdap logolu turuncu arkalık', en: 'Orange vortex card design' } },
      { id: 'onepiece', name: { tr: 'One Piece Teması', en: 'One Piece Back' }, cost: 250, symbol: '☠️', bg: 'linear-gradient(135deg, #2a2a2a, #0d0d0d)', border: '#f1c40f', desc: { tr: 'Korsan logolu karanlık arkalık', en: 'Dark Strawhat Jolly Roger design' } },
      { id: 'cyberpunk', name: { tr: 'Cyberpunk Teması', en: 'Cyberpunk Back' }, cost: 350, symbol: '⚡', bg: 'linear-gradient(135deg, #0f0f1b, #f7df1e)', border: '#39ff14', desc: { tr: 'Matris yeşili neon siber desen', en: 'Neon hacker matrix layout' } },
      { id: 'holo', name: { tr: 'Holo Prizma Arkalık', en: 'Prism Holo Back' }, cost: 300, symbol: '💎', bg: 'linear-gradient(135deg, #00f0ff, #ff007f, #7f00ff)', border: '#ffffff', desc: { tr: 'Holografik metalik parıltı', en: 'Holographic metallic rainbow glow' } },
      { id: 'carbon', name: { tr: 'Karbon Fiber Arkalık', en: 'Carbon Stealth Back' }, cost: 350, symbol: '🏁', bg: 'linear-gradient(45deg, #111, #222)', border: '#ff4757', desc: { tr: 'Yarış arabası karbon dokusu', en: 'Sporty carbon fiber matte texture' } },
      { id: 'scroll', name: { tr: 'Antik Parşömen Arkalık', en: 'Royal Scroll Back' }, cost: 200, symbol: '📜', bg: 'linear-gradient(135deg, #f3e5ab, #c19a6b)', border: '#8b5a2b', desc: { tr: 'Eski antika deri kaplama', en: 'Old royal leather scroll texture' } },
      { id: 'galaxy', name: { tr: 'Galaksi Nebulası Arkalık', en: 'Milky Way Back' }, cost: 400, symbol: '🌌', bg: 'linear-gradient(135deg, #2d1b4e, #0c081e)', border: '#a8a5e6', desc: { tr: 'Yıldızlı derin uzay nebulası', en: 'Star stardust galaxy space texture' } },
      { id: 'retro_arcade', name: { tr: 'Retro Arcade Arkalık', en: 'Vaporwave Back' }, cost: 220, symbol: '👾', bg: 'linear-gradient(135deg, #ff007f, #7f00ff)', border: '#00f0ff', desc: { tr: '80ler retro piksel sanatı', en: 'Retro pixel vaporwave gaming texture' } },
      { id: 'gilded_deco', name: { tr: 'Altın Bölme Arkalık', en: 'Gilded Deco Back' }, cost: 280, symbol: '⚜️', bg: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)', border: '#d4af37', desc: { tr: 'Kraliyet saray çizgi desenleri', en: 'Royal geometric gold line back' } },
      { id: 'retro_boy', name: { tr: 'Gameboy Arkalık', en: 'Gameboy Back' }, cost: 200, symbol: '🎮', bg: 'linear-gradient(135deg, #386b52, #1b3a2b)', border: '#00ff00', desc: { tr: '90lar retro el konsolu deseni', en: '90s retro hand console pattern' } },
      { id: 'steampunk', name: { tr: 'Steampunk Arkalık', en: 'Steampunk Back' }, cost: 300, symbol: '⚙️', bg: 'linear-gradient(135deg, #5c3a21, #2e1d0f)', border: '#d4af37', desc: { tr: 'Dönen mekanik altın çarklar', en: 'Rotating mechanical gold brass gears' } },
      { id: 'ancient', name: { tr: 'Mısır Parşömeni', en: 'Ancient Egyptian' }, cost: 220, symbol: '🏺', bg: 'linear-gradient(135deg, #dfc15d, #a28522)', border: '#ffffff', desc: { tr: 'Kum sarısı parıldayan hiyeroglifler', en: 'Ancient hieroglyphic desert yellow' } },
      { id: 'candy', name: { tr: 'Şeker Diyarı', en: 'Candy Crush Back' }, cost: 180, symbol: '🍬', bg: 'linear-gradient(135deg, #ff9eb5, #e91e63)', border: '#ffeb3b', desc: { tr: 'Bonbon desenli kremalı kaplama', en: 'Cute colorful candy land back' } }
    ];

    const titleItems = [
      { id: 'gold', name: { tr: '💰 Para Babası', en: '💰 Money Bag' }, cost: 100, color: '#FFD700', desc: { tr: 'Altın renkli parıldayan unvan', en: 'Gold shimmering profile title' } },
      { id: 'flame', name: { tr: '🔥 Sinsi Hırsız', en: '🔥 Sly Thief' }, cost: 200, color: '#ff4500', desc: { tr: 'Yanan alevli sinsi unvan', en: 'Flaming red thief profile title' } },
      { id: 'cyber', name: { tr: '⚡ Siber Kartal', en: '⚡ Cyber Falcon' }, cost: 300, color: '#39ff14', desc: { tr: 'Matris yeşili neon siber unvan', en: 'Cyberpunk glowing profile title' } },
      { id: 'kral', name: { tr: '👑 Oyunun Kralı', en: '👑 Game King' }, cost: 450, color: '#f1c40f', desc: { tr: 'Altın renkli hareketli unvan', en: 'Golden bouncing king profile title' } },
      { id: 'cosmic', name: { tr: '🌌 Kozmik Efendi', en: '🌌 Cosmic Lord' }, cost: 500, color: '#8e44ad', desc: { tr: 'Nebula moru dönen kozmik unvan', en: 'Space rotating celestial title' } },
      { id: 'ice_bender', name: { tr: '🧊 Buz Bükücü', en: '🧊 Ice Bender' }, cost: 120, color: '#a5f3fc', desc: { tr: 'Soğukkanlı strateji kuran akıllar', en: 'Frost tactical master profile title' } },
      { id: 'sea_raider', name: { tr: '🏴‍☠️ Deniz Yağmacısı', en: '🏴‍☠️ Sea Raider' }, cost: 150, color: '#d4af37', desc: { tr: 'Kartları çalan korsan ruhlar', en: 'Greedy pirate sailor profile title' } },
      { id: 'gamer', name: { tr: '👾 Retro Oyuncu', en: '👾 Retro Gamer' }, cost: 100, color: '#ff00ff', desc: { tr: 'Arcade atari salonu nostaljisi', en: 'Classic gaming layout enthusiast' } },
      { id: 'lucky', name: { tr: '🍀 Şanslı Yusuf', en: '🍀 Lucky Charm' }, cost: 120, color: '#2ecc71', desc: { tr: 'Hep en iyi kartı çeken şanslı eller', en: 'Always draws the right card' } }
    ];

    const playEffectItems = [
      { id: 'gold', name: { tr: '✨ Yıldız Patlaması', en: '✨ Star Explosion' }, cost: 150, symbol: '✨', bg: 'linear-gradient(135deg, #FFD700, #F39C12)', border: '#ffe57f', desc: { tr: 'Kart atınca altın yıldızlar saçar', en: 'Gold stars fly out on play' } },
      { id: 'heart', name: { tr: '💖 Neon Kalpler', en: '💖 Neon Hearts' }, cost: 250, symbol: '💖', bg: 'linear-gradient(135deg, #e91e63, #ad1457)', border: '#ff80ab', desc: { tr: 'Pembe renkli parlayan kalpler atar', en: 'Glow hearts fly out on play' } },
      { id: 'flame', name: { tr: '🔥 Alev Topları', en: '🔥 Fireballs' }, cost: 350, symbol: '🔥', bg: 'linear-gradient(135deg, #d35400, #e67e22)', border: '#ffab40', desc: { tr: 'Yanan kırmızı alev kıvılcımları saçar', en: 'Fire ember sparks fly out on play' } },
      { id: 'cosmic', name: { tr: '☄️ Kozmik Meteor', en: '☄️ Cosmic Meteor' }, cost: 400, symbol: '☄️', bg: 'linear-gradient(135deg, #8e44ad, #2980b9)', border: '#b388ff', desc: { tr: 'Mor renkli kayan yıldızlar saçar', en: 'Celestial stardust flies out on play' } },
      { id: 'cash', name: { tr: '💵 Para Yağmuru', en: '💵 Cash Shower' }, cost: 300, symbol: '💵', bg: 'linear-gradient(135deg, #2ecc71, #27ae60)', border: '#a3e4d7', desc: { tr: 'Havada uçuşan nakit dolarlar saçar', en: 'Flying paper dollar cash spray' } },
      { id: 'emerald', name: { tr: '💚 Zümrüt Yağmuru', en: '💚 Emerald Shower' }, cost: 250, symbol: '💚', bg: 'linear-gradient(135deg, #2ecc71, #1abc9c)', border: '#abebc6', desc: { tr: 'Yeşil parıldayan zümrütler saçar', en: 'Emerald gemstone shards fly out' } },
      { id: 'blackhole', name: { tr: '🕳️ Kara Delik', en: '🕳️ Black Hole' }, cost: 450, symbol: '🕳️', bg: 'linear-gradient(135deg, #34495e, #2c3e50)', border: '#5d6d7e', desc: { tr: 'Yerçekimini büken uzay girdapları', en: 'Vortex spatial gravity particles' } },
      { id: 'thunder', name: { tr: '⚡ Yıldırım Şimşek', en: '⚡ Thunder Strike' }, cost: 380, symbol: '⚡', bg: 'linear-gradient(135deg, #f1c40f, #f39c12)', border: '#fcf3cf', desc: { tr: 'Elektrikli sarı şimşekler çakar', en: 'Lightning bolt sparks fly out' } },
      { id: 'confetti', name: { tr: '🎉 Konfeti Bombası', en: '🎉 Celebration Pop' }, cost: 200, symbol: '🎉', bg: 'linear-gradient(135deg, #e74c3c, #9b5de5)', border: '#f5b041', desc: { tr: 'Etrafa renkli konfetiler saçar', en: 'Festive party confetti spray' } },
      { id: 'pixie', name: { tr: '✨ Peri Tozu', en: '✨ Pixie Dust' }, cost: 180, symbol: '✨', bg: 'linear-gradient(135deg, #f5b041, #f4d03f)', border: '#f9e79f', desc: { tr: 'Hafif süzülen peri simleri saçar', en: 'Slow magical glitter sparkles spray' } },
      { id: 'sakura_petals', name: { tr: '🌸 Sakura Yaprakları', en: '🌸 Sakura Petals' }, cost: 200, symbol: '🌸', bg: 'linear-gradient(135deg, #ffb3c6, #ff7ebb)', border: '#ffe5ec', desc: { tr: 'Uçuşan pembe kiraz yaprakları', en: 'Cherry blossom petals blow in breeze' } },
      { id: 'bubbles', name: { tr: '🫧 Sabun Köpükleri', en: '🫧 Soap Bubbles' }, cost: 150, symbol: '🫧', bg: 'linear-gradient(135deg, #85e3ff, #4ea8de)', border: '#caf0f8', desc: { tr: 'Etrafa dağılan parlak şeffaf balonlar', en: 'Free floating glossy water bubbles' } },
      { id: 'skulls', name: { tr: '💀 Lanetli Kemikler', en: '💀 Haunted Skulls' }, cost: 280, symbol: '💀', bg: 'linear-gradient(135deg, #a29bfe, #6c5ce7)', border: '#d63031', desc: { tr: 'Karanlık hayaletli kurukafalar fırlatır', en: 'Spooky cartoon skulls float out' } },
      { id: 'ice_shards', name: { tr: '❄️ Buz Kıymıkları', en: '❄️ Frost Shards' }, cost: 220, symbol: '❄️', bg: 'linear-gradient(135deg, #afeeee, #80deea)', border: '#ffffff', desc: { tr: 'Soğuk havada donan buz kristalleri', en: 'Freezing snowflake ice fragments spray' } }
    ];

    const unlockedBadges = dbUser?.unlockedBadges || ['default'];
    const currentBadge = dbUser?.selectedBadge || 'default';

    const badgeItems = [
      { id: 'rookie', name: { tr: '🌱 Çaylak', en: '🌱 Rookie' }, cost: 50, color: '#4ade80', cssClass: 'badge-rookie', desc: { tr: 'Başlangıç düzeyi oyuncu rozeti', en: 'Entry level player badge' } },
      { id: 'veteran', name: { tr: '⚔️ Veteran', en: '⚔️ Veteran' }, cost: 200, color: '#60a5fa', cssClass: 'badge-veteran', desc: { tr: 'Mavi parlayan veteran rozeti', en: 'Blue glowing veteran badge' } },
      { id: 'ghost', name: { tr: '👻 Hayalet', en: '👻 Ghost' }, cost: 300, color: '#c084fc', cssClass: 'badge-ghost', desc: { tr: 'Mor süzülen hayalet rozeti', en: 'Floating purple ghost badge' } },
      { id: 'legend', name: { tr: '🦁 Efsane', en: '🦁 Legend' }, cost: 500, color: '#fbbf24', cssClass: 'badge-legend', desc: { tr: 'Altın renkli parlayan efsane rozeti', en: 'Shining gold legend badge' } },
      { id: 'king', name: { tr: '🫅 Hükümdar', en: '🫅 Ruler' }, cost: 750, color: '#FFD700', cssClass: 'badge-king', desc: { tr: 'Altın ışıltılı kral rozeti', en: 'Royal pulsing king badge' } }
    ];

    const auraItems = [
      { id: 'hellfire', name: { tr: '🔥 Cehennem Ateşi', en: '🔥 Hellfire Aura' }, cost: 600, color: '#ff4500', desc: { tr: 'Profil arkasından yükselen cehennem alevleri', en: 'Hellfire flames rising behind profile' } },
      { id: 'royal_crown', name: { tr: '👑 Hükümdar Tacı', en: '👑 Royal Crown' }, cost: 750, color: '#ffd700', desc: { tr: 'Profil üstünde süzülen asil altın taç', en: 'Noble gold crown floating above profile' } },
      { id: 'glitch', name: { tr: '👾 Siber Dalgalanma', en: '👾 Cyber Glitch' }, cost: 500, color: '#ff00ff', desc: { tr: 'Neon renklerde dalgalanan siber parlamalar', en: 'Cyberpunk neon glitch aura distortion' } },
      { id: 'frozen_aurora', name: { tr: '🌌 Kutup Işıkları', en: '🌌 Polar Aurora' }, cost: 650, color: '#00ffff', desc: { tr: 'Yeşil kutup ışıklarının göksel dansı', en: 'Mystical green polar lights glow' } }
    ];

    const chatSkinItems = [
      { id: 'gold_leaf', name: { tr: '⚜️ Altın Varak Balon', en: '⚜️ Gold Leaf Bubble' }, cost: 400, color: '#ffd700', desc: { tr: 'Altın renklerinde parlayan lüks sohbet balonu', en: 'Luxury golden shining chat message box' } },
      { id: 'matrix_hacker', name: { tr: '🟢 Hacker Balonu', en: '🟢 Hacker Bubble' }, cost: 300, color: '#39ff14', desc: { tr: 'Siyah üzerine yeşil akan matris kodları', en: 'Matrix green terminal typing bubble' } },
      { id: 'rainbow_wave', name: { tr: '🌈 RGB Dalgalanma', en: '🌈 RGB Wave' }, cost: 450, color: '#ff00ff', desc: { tr: 'Gökkuşağı renklerinde değişen sohbet balonu', en: 'Rainbow neon color loop message skin' } },
      { id: 'lava_bubble', name: { tr: '🔥 Erimiş Lav Balonu', en: '🔥 Volcanic Bubble' }, cost: 380, color: '#e67e22', desc: { tr: 'Kenarlarından dumanlar tüten alevli kutu', en: 'Molten magma hot orange bubble' } }
    ];

    const megaEmoteItems = [
      { id: 'tomato_splat', name: { tr: '🍅 Domates Yağmuru', en: '🍅 Tomato Splat' }, cost: 300, color: '#e74c3c', desc: { tr: 'Ekranı kaplayan dev sulu domatesler fırlatır', en: 'Throws giant red tomatoes all over screens' } },
      { id: 'make_it_rain', name: { tr: '💸 Para Saçma Şovu', en: '💸 Make It Rain' }, cost: 500, color: '#2ecc71', desc: { tr: 'Ekrandan aşağı yağan binlerce dolar banknotu', en: 'Showers massive dollar bills on screens' } },
      { id: 'salt_bae', name: { tr: '🧂 Tuzlama Şovu', en: '🧂 Salt Bae' }, cost: 350, color: '#ecf0f1', desc: { tr: 'Arazilerin üzerine havalı tuz taneleri döker', en: 'Sprinkles seasoning salt across the board' } },
      { id: 'nuke_boom', name: { tr: '☢️ Nükleer Patlama', en: '☢️ Nuclear Strike' }, cost: 600, color: '#f39c12', desc: { tr: 'Tüm ekranda devasa bir mantar bulutu patlatır', en: 'Explodes a massive mushroom cloud overlay' } }
    ];

    return (
      <Modal title={lang === 'en' ? "🛍️ CUSTOMIZATION SHOP" : "🛍️ ÖZELLEŞTİRME MAĞAZASI"} onClose={() => { setModal(null); setHoveredShopItem(null); }}>
        {/* Shop purchase coin splash overlay */}
        {shopCoins.map(coin => (
          <div
            key={coin.id}
            className="coin-spray-particle"
            style={{
              left: coin.x,
              top: coin.y,
              '--dx': coin.dx,
              '--dy': coin.dy,
              '--dr': coin.dr
            }}
          >
            🪙
          </div>
        ))}

        <div className="shop-layout">
          {/* LEFT SIDE: Preview */}
          <div className="shop-preview-side">
            <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' }}>
              {lang === 'en' ? 'LIVE PREVIEW' : 'CANLI ÖNİZLEME'}
            </span>

            <div className="preview-card-floating">
              {/* 3D Preview Border Card */}
              <div className="preview-card-3d">
                <div
                  className={`avatar-container border-style-${previewBorder}`}
                  style={{ width: 64, height: 64, marginBottom: 12 }}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/${myAvatarStyle}/svg?seed=${myName || 'user'}`}
                    alt="avatar"
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block', marginBottom: 2 }}>
                  {myName || 'Oyuncu'}
                </span>

                {/* PREVIEW TITLE */}
                <div className={`title-style-${previewTitle}`} style={{ fontSize: 9.5, fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
                  {
                    previewTitle === 'default'
                      ? (lang === 'en' ? 'Classic Player' : 'Klasik Oyuncu')
                      : titleItems.find(t => t.id === previewTitle)?.name[lang] || previewTitle
                  }
                </div>

                <span style={{ fontSize: 8, color: '#64748b', fontWeight: 'bold' }}>
                  {lang === 'en' ? 'SHOP ITEM PREVIEWS' : 'MAĞAZA ÖNİZLEMELERİ'}
                </span>
              </div>

              <div style={{ marginTop: 15, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: '#64748b', letterSpacing: 0.5 }}>
                    {lang === 'en' ? 'CARD BACK' : 'KART ARKALIĞI'}
                  </span>
                  <div style={{ width: 30, height: 42, borderRadius: 6, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                    <CardBack theme={previewCardBack} small />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: '#64748b', letterSpacing: 0.5 }}>
                    {lang === 'en' ? 'EFFECT' : 'HAMLE EFEKTİ'}
                  </span>
                  <div style={{
                    width: 30, height: 42, borderRadius: 6,
                    background: previewPlayEffect === 'default' ? 'linear-gradient(135deg, #1e293b, #0f172a)' : (playEffectItems.find(e => e.id === previewPlayEffect)?.bg || 'linear-gradient(135deg, #1e293b, #0f172a)'),
                    border: `1px solid ${previewPlayEffect === 'default' ? 'rgba(255,255,255,0.1)' : (playEffectItems.find(e => e.id === previewPlayEffect)?.border || 'rgba(255,255,255,0.1)')}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                  }}>
                    {previewPlayEffect === 'default' ? '💸' : (playEffectItems.find(e => e.id === previewPlayEffect)?.symbol || '💸')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: List & Items */}
          <div className="shop-items-area">
            {/* Points balance */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 215, 0, 0.08)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 'bold',
              color: '#FFD700',
              boxSizing: 'border-box'
            }}>
              <span>{lang === 'en' ? 'YOUR BALANCE:' : 'MEVCUT PUANINIZ:'}</span>
              <span style={{ fontSize: 16, letterSpacing: 0.5 }}>🪙 {points} PTS</span>
            </div>

            {/* Borders Section */}
            <div>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? 'Profile Borders' : 'Profil Çerçeveleri'}
              </h3>
              <div className="shop-items-grid">
                {/* Default Border Card */}
                <div
                  className={`shop-item-card ${currentBorder === 'default' ? 'is-active' : ''}`}
                  style={{
                    '--card-accent': '#aaa',
                    '--card-glow': 'rgba(255,255,255,0.05)'
                  }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'border', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentBorder !== 'default' && handleSelectCustomization('border', 'default')}
                >
                  <div className="avatar-container border-style-default" style={{ width: 44, height: 44, marginBottom: 8 }}>
                    <img src={`https://api.dicebear.com/7.x/${myAvatarStyle}/svg?seed=${myName || 'user'}`} alt="" />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Classic' : 'Klasik'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard look' : 'Standart çerçeve'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentBorder === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Borders Cards */}
                {borderItems.map(item => {
                  const unlocked = unlockedBorders.includes(item.id);
                  const active = currentBorder === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{
                        '--card-accent': item.color,
                        '--card-glow': `${item.color}33`
                      }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'border', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div className={`avatar-container border-style-${item.id}`} style={{ width: 44, height: 44, marginBottom: 8 }}>
                        <img src={`https://api.dicebear.com/7.x/${myAvatarStyle}/svg?seed=${myName || 'user'}`} alt="" />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button
                            onClick={() => handleSelectCustomization('border', item.id)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
                          >
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('border', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #000)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none',
                              fontSize: 9,
                              fontWeight: 'bold',
                              padding: '4px 8px',
                              borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card Backs Section */}
            <div>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? 'Card Backs' : 'Kart Arkalıkları'}
              </h3>
              <div className="shop-items-grid">
                {/* Default Card Back Card */}
                <div
                  className={`shop-item-card ${currentCardBack === 'default' ? 'is-active' : ''}`}
                  style={{
                    '--card-accent': '#c0392b',
                    '--card-glow': 'rgba(192, 57, 43, 0.15)'
                  }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'cardBack', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentCardBack !== 'default' && handleSelectCustomization('cardBack', 'default')}
                >
                  <div style={{ width: 30, height: 40, borderRadius: 4, background: 'linear-gradient(135deg, #c0392b, #78281f)', border: '1px solid #f1c40f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 8 }}>🎲</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Classic Red' : 'Klasik Kırmızı'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard Red' : 'Standart kırmızı deste'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentCardBack === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Card Backs Cards */}
                {cardBackItems.map(item => {
                  const unlocked = unlockedCardBacks.includes(item.id);
                  const active = currentCardBack === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{
                        '--card-accent': item.border,
                        '--card-glow': `${item.border}33`
                      }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'cardBack', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div style={{ width: 30, height: 40, borderRadius: 4, background: item.bg, border: `1.5px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', marginBottom: 8 }}>{item.symbol}</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.border, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button
                            onClick={() => handleSelectCustomization('cardBack', item.id)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
                          >
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('cardBack', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.border}, #000)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none',
                              fontSize: 9,
                              fontWeight: 'bold',
                              padding: '4px 8px',
                              borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.border}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Titles Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? 'Profile Titles' : 'Profil Unvanları'}
              </h3>
              <div className="shop-items-grid">
                {/* Default Title */}
                <div
                  className={`shop-item-card ${currentTitle === 'default' ? 'is-active' : ''}`}
                  style={{
                    '--card-accent': '#64748b',
                    '--card-glow': 'rgba(100, 116, 139, 0.15)'
                  }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'title', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentTitle !== 'default' && handleSelectCustomization('title', 'default')}
                >
                  <div style={{ fontSize: 18, marginBottom: 6 }}>👤</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Classic Player' : 'Klasik Oyuncu'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard profile title' : 'Standart oyuncu unvanı'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentTitle === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Titles */}
                {titleItems.map(item => {
                  const unlocked = unlockedTitles.includes(item.id);
                  const active = currentTitle === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{
                        '--card-accent': item.color,
                        '--card-glow': `${item.color}33`
                      }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'title', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div className={`title-style-${item.id}`} style={{ fontSize: 12, fontWeight: 'bold', height: 16, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.name[lang]}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2 }}>
                        {lang === 'en' ? 'Animated Title' : 'Hareketli Unvan'}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button
                            onClick={() => handleSelectCustomization('title', item.id)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
                          >
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('title', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #000)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none',
                              fontSize: 9,
                              fontWeight: 'bold',
                              padding: '4px 8px',
                              borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Play Effects Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? 'Play Card Effects' : 'Kart Fırlatma Efektleri'}
              </h3>
              <div className="shop-items-grid">
                {/* Default Play Effect */}
                <div
                  className={`shop-item-card ${currentPlayEffect === 'default' ? 'is-active' : ''}`}
                  style={{
                    '--card-accent': '#3498db',
                    '--card-glow': 'rgba(52, 152, 219, 0.15)'
                  }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'playEffect', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentPlayEffect !== 'default' && handleSelectCustomization('playEffect', 'default')}
                >
                  <div style={{ width: 30, height: 40, borderRadius: 4, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 8 }}>💸</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Classic Money' : 'Para Fırlatma'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard money spray' : 'Klasik para fırlatma efekti'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentPlayEffect === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Play Effects */}
                {playEffectItems.map(item => {
                  const unlocked = unlockedPlayEffects.includes(item.id);
                  const active = currentPlayEffect === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{
                        '--card-accent': item.border,
                        '--card-glow': `${item.border}33`
                      }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'playEffect', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div style={{ width: 30, height: 40, borderRadius: 4, background: item.bg, border: `1.5px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', marginBottom: 8 }}>{item.symbol}</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.border, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button
                            onClick={() => handleSelectCustomization('playEffect', item.id)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
                          >
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('playEffect', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.border}, #000)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none',
                              fontSize: 9,
                              fontWeight: 'bold',
                              padding: '4px 8px',
                              borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.border}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Player Badges Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? '🏅 Player Badges' : '🏅 Oyuncu Rozetleri'}
              </h3>
              <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                {lang === 'en' ? 'Shown next to your name during gameplay and in lobby.' : 'Oyun içinde ve lobide isminizin yanında görünür.'}
              </p>
              <div className="shop-items-grid">
                {/* Default Badge */}
                <div
                  className={`shop-item-card ${currentBadge === 'default' ? 'is-active' : ''}`}
                  style={{ '--card-accent': '#64748b', '--card-glow': 'rgba(100,116,139,0.15)' }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'badge', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentBadge !== 'default' && handleSelectCustomization('badge', 'default')}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🎮</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'No Badge' : 'Rozetsiz'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard player, no badge' : 'Rozetsiz standart görünüm'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentBadge === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Badges */}
                {badgeItems.map(item => {
                  const unlocked = unlockedBadges.includes(item.id);
                  const active = currentBadge === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{ '--card-accent': item.color, '--card-glow': `${item.color}33` }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'badge', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <span className={`player-badge ${item.cssClass}`} style={{ fontSize: 10, marginBottom: 8, padding: '3px 8px' }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </span>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2, marginTop: 4 }}>
                        {lang === 'en' ? 'Player Badge' : 'Oyuncu Rozeti'}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button onClick={() => handleSelectCustomization('badge', item.id)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('badge', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #1e293b)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table Themes Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? '🖼️ Table Board Themes' : '🖼️ Oyun Masası Temaları'}
              </h3>
              <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                {lang === 'en' ? 'Changes the table background style and ambiance.' : 'Oyun alanının arka planını ve atmosferini değiştirir.'}
              </p>
              <div className="shop-items-grid">
                {/* Default Table Theme */}
                <div
                  className={`shop-item-card ${currentTableTheme === 'default' ? 'is-active' : ''}`}
                  style={{ '--card-accent': '#64748b', '--card-glow': 'rgba(100,116,139,0.15)' }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'tableTheme', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentTableTheme !== 'default' && handleSelectCustomization('tableTheme', 'default')}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🌌</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Classic Board' : 'Klasik Masa'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard steel blue background' : 'Standart çelik mavisi arka plan'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentTableTheme === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Table Themes */}
                {tableThemeItems.map(item => {
                  const unlocked = unlockedTableThemes.includes(item.id);
                  const active = currentTableTheme === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{ '--card-accent': item.color, '--card-glow': `${item.color}33` }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'tableTheme', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{item.id === 'volcano' ? '🌋' : item.id === 'cosmic' ? '🌌' : item.id === 'matrix' ? '🟢' : '👑'}</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button onClick={() => handleSelectCustomization('tableTheme', item.id)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('tableTheme', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #1e293b)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dice Skins Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? '🎲 Dice Skins' : '🎲 Özel Zar Görünümleri'}
              </h3>
              <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                {lang === 'en' ? 'Custom style for your gamble/chance dice rolls.' : 'Şans zarlarınızı atarken görünen özel stiller.'}
              </p>
              <div className="shop-items-grid">
                {/* Default Dice Skin */}
                <div
                  className={`shop-item-card ${currentDiceSkin === 'default' ? 'is-active' : ''}`}
                  style={{ '--card-accent': '#64748b', '--card-glow': 'rgba(100,116,139,0.15)' }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'diceSkin', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentDiceSkin !== 'default' && handleSelectCustomization('diceSkin', 'default')}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🎲</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Classic Dice' : 'Klasik Zar'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard white dice' : 'Standart beyaz renkli zar'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentDiceSkin === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Dice Skins */}
                {diceSkinItems.map(item => {
                  const unlocked = unlockedDiceSkins.includes(item.id);
                  const active = currentDiceSkin === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{ '--card-accent': item.color, '--card-glow': `${item.color}33` }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'diceSkin', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>🎲</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button onClick={() => handleSelectCustomization('diceSkin', item.id)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('diceSkin', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #1e293b)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Profil Auraları Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? '🔮 Profile Auras' : '🔮 Profil Auraları'}
              </h3>
              <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                {lang === 'en' ? 'Glowing animations surrounding your profile panel card.' : 'Profil panelinizin arkasında dönen parıltılı efektler.'}
              </p>
              <div className="shop-items-grid">
                {/* Default Aura */}
                <div
                  className={`shop-item-card ${currentAura === 'default' ? 'is-active' : ''}`}
                  style={{ '--card-accent': '#64748b', '--card-glow': 'rgba(100,116,139,0.15)' }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'aura', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentAura !== 'default' && handleSelectCustomization('aura', 'default')}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>🔮</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'No Aura' : 'Aura Yok'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'No background effect' : 'Arka plan efekti kapatılır'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentAura === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Auras */}
                {auraItems.map(item => {
                  const unlocked = unlockedAuras.includes(item.id);
                  const active = currentAura === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{ '--card-accent': item.color, '--card-glow': `${item.color}33` }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'aura', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>🔮</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button onClick={() => handleSelectCustomization('aura', item.id)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('aura', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #1e293b)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sohbet Balonları Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? '💬 Chat Bubble Skins' : '💬 Sohbet Balonu Temaları'}
              </h3>
              <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                {lang === 'en' ? 'Custom styled layouts for your chat messages.' : 'Sohbette yazdığınız mesaj kutularının özel görünümleri.'}
              </p>
              <div className="shop-items-grid">
                {/* Default Chat Skin */}
                <div
                  className={`shop-item-card ${currentChatSkin === 'default' ? 'is-active' : ''}`}
                  style={{ '--card-accent': '#64748b', '--card-glow': 'rgba(100,116,139,0.15)' }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'chatSkin', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentChatSkin !== 'default' && handleSelectCustomization('chatSkin', 'default')}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>💬</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Standard Box' : 'Klasik Balon'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'Standard dark bubble' : 'Sistem varsayılan koyu mesaj kutusu'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentChatSkin === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Chat Skins */}
                {chatSkinItems.map(item => {
                  const unlocked = unlockedChatSkins.includes(item.id);
                  const active = currentChatSkin === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{ '--card-accent': item.color, '--card-glow': `${item.color}33` }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'chatSkin', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>💬</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button onClick={() => handleSelectCustomization('chatSkin', item.id)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('chatSkin', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #1e293b)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mega İfadeler Section */}
            <div style={{ marginTop: 15 }}>
              <h3 style={{ fontSize: 11, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 4, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {lang === 'en' ? '📣 Screen Takeover Mega Emotes' : '📣 Dev Mega İfadeler'}
              </h3>
              <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10, fontStyle: 'italic' }}>
                {lang === 'en' ? 'Sends full-screen overlay animations to all players.' : 'Tetiklendiğinde diğer oyuncuların ekranını dev animasyonlarla kaplar.'}
              </p>
              <div className="shop-items-grid">
                {/* Default Mega Emote */}
                <div
                  className={`shop-item-card ${currentMegaEmote === 'default' ? 'is-active' : ''}`}
                  style={{ '--card-accent': '#64748b', '--card-glow': 'rgba(100,116,139,0.15)' }}
                  onMouseEnter={() => setHoveredShopItem({ type: 'megaEmote', id: 'default' })}
                  onMouseLeave={() => setHoveredShopItem(null)}
                  onClick={() => currentMegaEmote !== 'default' && handleSelectCustomization('megaEmote', 'default')}
                >
                  <div style={{ fontSize: 20, marginBottom: 6 }}>📣</div>
                  <div style={{ fontSize: 11, fontWeight: 'bold', color: '#fff', marginBottom: 2 }}>
                    {lang === 'en' ? 'Classic Emote' : 'Standart İfade'}
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                    {lang === 'en' ? 'No screen overlay' : 'Ekranı kaplayan animasyon yok'}
                  </div>
                  <div style={{ marginTop: 8, width: '100%' }}>
                    {currentMegaEmote === 'default' ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'EQUIP' : 'KUŞAN'}</span>
                    )}
                  </div>
                </div>

                {/* Custom Mega Emotes */}
                {megaEmoteItems.map(item => {
                  const unlocked = unlockedMegaEmotes.includes(item.id);
                  const active = currentMegaEmote === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`shop-item-card ${active ? 'is-active' : ''}`}
                      style={{ '--card-accent': item.color, '--card-glow': `${item.color}33` }}
                      onMouseEnter={() => setHoveredShopItem({ type: 'megaEmote', id: item.id })}
                      onMouseLeave={() => setHoveredShopItem(null)}
                    >
                      <div style={{ fontSize: 20, marginBottom: 6 }}>📣</div>
                      <div style={{ fontSize: 11, fontWeight: 'bold', color: item.color, marginBottom: 2 }}>
                        {lang === 'en' ? item.name.en : item.name.tr}
                      </div>
                      <div style={{ fontSize: 8, color: '#64748b', height: 20, overflow: 'hidden', lineHeight: 1.1 }}>
                        {lang === 'en' ? item.desc.en : item.desc.tr}
                      </div>
                      <div style={{ marginTop: 8, width: '100%' }}>
                        {active ? (
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#39ff14', background: 'rgba(57,255,20,0.1)', padding: '3px 8px', borderRadius: 6, display: 'block' }}>{lang === 'en' ? 'ACTIVE' : 'AKTİF'}</span>
                        ) : unlocked ? (
                          <button onClick={() => handleSelectCustomization('megaEmote', item.id)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}>
                            {lang === 'en' ? 'EQUIP' : 'KUŞAN'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleBuyCustomization('megaEmote', item.id, item.cost, e)}
                            disabled={points < item.cost}
                            style={{
                              width: '100%',
                              background: points >= item.cost ? `linear-gradient(135deg, ${item.color}, #1e293b)` : 'rgba(255,255,255,0.03)',
                              color: points >= item.cost ? '#fff' : '#555',
                              border: 'none', fontSize: 9, fontWeight: 'bold', padding: '4px 8px', borderRadius: 6,
                              cursor: points >= item.cost ? 'pointer' : 'default',
                              boxShadow: points >= item.cost ? `0 2px 8px ${item.color}33` : 'none'
                            }}
                          >
                            🪙 {item.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </Modal>
    );
  }

  return null;
};

// ---- LOBİ AYARLARI PANELİ OLUŞTURUCU ----
const renderRoomSettings = (disabled = false) => {
  const selStyle = { background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', outline: 'none', cursor: 'pointer', fontSize: 13, width: '100%', boxSizing: 'border-box' };
  const descStyle = { fontSize: 10, color: '#94a3b8', marginTop: 3, display: 'block', fontStyle: 'italic', lineHeight: 1.3, letterSpacing: 0.2 };
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
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#a0aec0', display: 'block', marginBottom: 4 }}>{lang === 'en' ? '🎮 Game Mode:' : '🎮 Oyun Modu:'}</span>
              <select value={roomSettings.gameMode || 'normal'} onChange={e => {
                const mode = e.target.value;
                setRoomSettings(prev => {
                  const updated = { ...prev, gameMode: mode };
                  if (mode === 'blitz') {
                    updated.turnTimer = 15;
                    updated.startCards = 7;
                    updated.winSets = 2;
                  } else if (mode === 'scavenge') {
                    updated.streetThugs = true;
                  }
                  return updated;
                });
              }} style={selStyle}>
                <option value="normal">{lang === 'en' ? '🎲 Normal Mode' : '🎲 Normal Mod'}</option>
                <option value="blitz">{lang === 'en' ? '⚡ Blitz Mode (15s, 7 Cards, 2 Sets)' : '⚡ Blitz Modu (15sn, 7 Kart, 2 Set)'}</option>
                <option value="scavenge">{lang === 'en' ? '🕵️ Scavenge Madness (Free Karaborsa)' : '🕵️ Karaborsa Çılgınlığı (Bedava Karaborsa)'}</option>
              </select>
              <span style={descStyle}>
                {lang === 'en' ? '🎮 Alters turn time, starting cards, and Black Market costs.' : '🎮 Sıra süresi, başlangıç kartları ve Karaborsa bedelini otomatik belirler.'}
              </span>
            </div>
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

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '⏱️ Auto End Turn (after 3 moves)' : '⏱️ Eli Otomatik Bitir (3 Hamle)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.autoEndTurn} onChange={e => setRoomSettings(prev => ({ ...prev, autoEndTurn: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '⏱️ Turn ends automatically after playing 3 cards.' : '⏱️ 3 kart oynama limitine ulaştığınızda sıranızı otomatik olarak sonlandırır.'}
              </span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🛡️ Allow Counter Just Say No' : '🛡️ Çifte Reddet (Savunmaya İtiraz)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.allowCounterJustSayNo} onChange={e => setRoomSettings(prev => ({ ...prev, allowCounterJustSayNo: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '🛡️ Players can counter a "Just Say No" card with another "Just Say No" card.' : '🛡️ "Reddet!" (Just Say No) kartına karşı başka bir "Reddet!" kartı ile çifte itiraz/savunma yapılabilmesini sağlar.'}
              </span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🔒 Lock Wildcards after placing' : '🔒 Joker Kilidi (Renk Sabitlenir)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.lockWildcards} onChange={e => setRoomSettings(prev => ({ ...prev, lockWildcards: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '🔒 Wildcards cannot change color once placed on the table.' : '🔒 Masaya konulan çift renkli jokerlerin rengi sonradan değiştirilemez.'}
              </span>
            </div>

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

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '👁️‍🗨️ Open Hands (Training)' : '👁️‍🗨️ Açık El Modu (Antrenman)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.openHands} onChange={e => setRoomSettings(prev => ({ ...prev, openHands: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '👁️‍🗨️ Opponents can see each other\'s cards in real time.' : '👁️‍🗨️ Tüm oyuncuların elindeki kartlar rakipler tarafından açık şekilde görülebilir.'}
              </span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '⚡ Fast Challenge (15s JSN limit)' : '⚡ Hızlı Reddet (15sn Savunma limit)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.fastChallenge} onChange={e => setRoomSettings(prev => ({ ...prev, fastChallenge: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '⚡ Reduces the "Just Say No" defense response window to 15 seconds.' : '⚡ "Reddet!" (Just Say No) savunma kartı oynamak için tanınan süreyi 15 saniyeye indirerek oyunu hızlandırır.'}
              </span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🕵️ Street Thugs (Black Market)' : '🕵️ Sokak Haydutları (Karaborsa)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.streetThugs} onChange={e => setRoomSettings(prev => ({ ...prev, streetThugs: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '🕵️ Pay to draw the top card from the discard pile (Black Market).' : '🕵️ Çöp (Iskarta) destesinin en üstündeki kartı para karşılığında satın almanızı sağlar.'}
              </span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🎲 Gambler\'s Die (Gamble roll)' : '🎲 Kumarbazın Zarı (Şans zarı)'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.gambleZari} onChange={e => setRoomSettings(prev => ({ ...prev, gambleZari: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '🎲 Roll a die on your turn to gamble for winning or losing extra cash.' : '🎲 Turunuzda şans zarı atarak para kazanma veya kaybetme üzerine kumar oynamanızı sağlar.'}
              </span>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label className="switch-container">
                <span className="switch-label">{lang === 'en' ? '🐿️ Thief Squirrel Cards' : '🐿️ Hırsız Sincap Kartları'}</span>
                <input type="checkbox" className="switch-checkbox" checked={roomSettings.thiefSquirrelEnabled} onChange={e => setRoomSettings(prev => ({ ...prev, thiefSquirrelEnabled: e.target.checked }))} />
                <div className="switch-toggle" />
              </label>
              <span style={descStyle}>
                {lang === 'en' ? '🐿️ Adds squirrel cards to steal bank money or property sets.' : '🐿️ Desteye, rakiplerin bankasını veya arazilerini soymaya yarayan sincap kartları ekler.'}
              </span>
            </div>

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
const renderChallengeModal = () => {
  if (!gameState?.myPendingChallenge) return null;
  const ch = gameState.myPendingChallenge;
  const iAmDefender = ch.responderId === playerId;
  if (!iAmDefender) return null; // sadece sırası gelen oyuncu görür

  const haveJustSayNo = me?.hasJustSayNo;
  const isCounter = ch.responderId === ch.sourceId; // sıra orijinal oyuncuya geri döndü (karşı-Reddet)

  let description = '';
  let alertTitle = lang === 'en' ? 'ACTION RESPONSE PENDING' : 'AKSİYON YANITI BEKLENİYOR';
  let alertColor = '#e11d48';
  let alertIcon = '⚡';

  switch (ch.action) {
    case 'rent':
      description = lang === 'en'
        ? `${ch.sourceName} wants rent from you: ${ch.data.amount}M (${translateReason(ch.data.reason, lang)})`
        : `${ch.sourceName} sizden kira istiyor: ${ch.data.amount}M (${ch.data.reason})`;
      alertTitle = lang === 'en' ? 'RENT PAYMENT' : 'KİRA ÖDEMESİ';
      alertColor = '#e67e22';
      alertIcon = '🧾';
      break;
    case 'birthday':
      description = lang === 'en'
        ? `${ch.sourceName} played "It's My Birthday!" and wants a 2M gift from you`
        : `${ch.sourceName} "Doğum Günüm!" oynadı, sizden 2M hediye istiyor`;
      alertTitle = lang === 'en' ? 'BIRTHDAY GIFT' : 'DOĞUM GÜNÜ HEDİYESİ';
      alertColor = '#ec4899';
      alertIcon = '🎂';
      break;
    case 'debtcollector':
      description = lang === 'en'
        ? `${ch.sourceName} played "Debt Collector" and demands 5M from you`
        : `${ch.sourceName} "Borç Tahsildarı" oynadı, sizden 5M istiyor`;
      alertTitle = lang === 'en' ? 'DEBT COLLECTION' : 'BORÇ TAHSİLATI';
      alertColor = '#3b82f6';
      alertIcon = '💸';
      break;
    case 'slydeal':
      {
        const cardNameEn = translateCard({ type: 'property', name: ch.data.cardName }, lang).name;
        description = lang === 'en'
          ? `${ch.sourceName} wants to steal your property "${cardNameEn}" (Sly Deal)`
          : `${ch.sourceName} sizin "${ch.data.cardName}" arazinizi çalmak istiyor (Sinsi Anlaşma)`;
      }
      alertTitle = lang === 'en' ? 'SLY DEAL (STEAL)' : 'SİNSİ ANLAŞMA (HIRSIZLIK)';
      alertColor = '#a855f7';
      alertIcon = '🥷';
      break;
    case 'forceddeal':
      {
        const myCardNameEn = translateCard({ type: 'property', name: ch.data.myCardName }, lang).name;
        const theirCardNameEn = translateCard({ type: 'property', name: ch.data.theirCardName }, lang).name;
        description = lang === 'en'
          ? `${ch.sourceName} wants to swap your property "${myCardNameEn}" with their "${theirCardNameEn}" (Forced Deal)`
          : `${ch.sourceName} sizin "${ch.data.myCardName}" araziniz ile kendi "${ch.data.theirCardName}" arazisini takas etmek istiyor (Zorunlu Anlaşma)`;
      }
      alertTitle = lang === 'en' ? 'FORCED DEAL' : 'ZORUNLU ANLAŞMA';
      alertColor = '#eab308';
      alertIcon = '🔁';
      break;
    case 'dealbreaker':
      {
        const colorNameEn = {
          brown: 'Brown', lightblue: 'Light Blue', pink: 'Pink', orange: 'Orange',
          red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Dark Blue',
          railroad: 'Railroad', utility: 'Utility'
        }[ch.data.targetColor] || ch.data.targetColor;
        const colorName = COLOR_INFO[ch.data.targetColor]?.name || ch.data.targetColor;
        description = lang === 'en'
          ? `${ch.sourceName} wants to steal your completed ${colorNameEn} set (Deal Breaker)!`
          : `${ch.sourceName} sizin tamamlanmış ${colorName} setinizi çalmak istiyor (Anlaşma Bozucu)!`;
      }
      alertTitle = lang === 'en' ? 'DEAL BREAKER!' : 'ANLAŞMA BOZUCU!';
      alertColor = '#dc2626';
      alertIcon = '💣';
      break;
    default:
      description = lang === 'en'
        ? `${ch.sourceName} initiated an action against you`
        : `${ch.sourceName} size karşı bir aksiyon başlattı`;
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
              {lang === 'en'
                ? 'Your opponent just played a "Just Say No!" card to block your action. If you have another "Just Say No!" card, you can play it to counter their block!'
                : 'Rakibiniz az önce "Reddet!" kartınızı savunmak için kendi "Reddet!" kartını oynadı. Eğer elinizde başka bir "Reddet!" varsa, onu kullanarak hamleyi yeniden geçerli kılabilirsiniz!'}
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
              ⏱️ {lang === 'en' ? 'Time remaining to accept:' : 'Kabul edilmesine kalan süre:'} <span style={{ color: '#fff', background: '#ef4444', padding: '1px 6px', borderRadius: 4 }}>{challengeTime}s</span>
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
                {lang === 'en'
                  ? '🛡️ You do not have a "Just Say No!" defense card in your hand.'
                  : '🛡️ Elinizde "Reddet!" (Just Say No) savunma kartı bulunmuyor.'}
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
              {isCounter
                ? (lang === 'en' ? 'Do Not Counter, Let Action Be Blocked' : 'İtiraz Etme, Hamle İptal Kalsın')
                : (lang === 'en' ? 'Accept and Pay / Give Property' : 'Kabul Et ve Öde / Kartı Devret')}
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
    <Modal title={lang === 'en' ? "💸 Pay Debt" : "💸 Ödeme Yap"} onClose={() => { }}>
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
              {lang === 'en' ? <>You need to pay a total of <b style={{ color: '#ef4444', fontSize: 16 }}>{payment.amount}M</b> to <b style={{ color: '#FFD700' }}>{payment.collectorName}</b>.</> : <><b style={{ color: '#FFD700' }}>{payment.collectorName}</b>'e toplam <b style={{ color: '#ef4444', fontSize: 16 }}>{payment.amount}M</b> ödemeniz gerekiyor.</>}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>{lang === 'en' ? 'Reason' : 'Gerekçe'}: {translateReason(payment.reason, lang)}</div>
          </div>
          {/* Küçük Görsel Önizleme */}
          <div style={{ width: 44, height: 60, borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', flexShrink: 0 }}>
            <CardVisual card={paymentCard} small lang={lang} />
          </div>
        </div>

        {/* Hızlı Seçim Yardımcı Araçları (Daha uzakta, güvenli butonlar) */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <button
            onClick={() => { sfxClick(); handleAutoSelectPayment(); }}
            style={{ ...btnStyle('rgba(46, 204, 113, 0.12)'), border: '1px solid rgba(46, 204, 113, 0.3)', color: '#2ECC71', padding: '6px 12px', fontSize: 11, minHeight: 'auto', borderRadius: 8, margin: 0 }}
          >
            {lang === 'en' ? '🤖 Auto Select (Money First)' : '🤖 Otomatik Seç (Öncelikli Para)'}
          </button>
          <button
            onClick={() => { sfxClick(); handleSelectAllPayment(); }}
            style={{ ...btnStyle('rgba(255,255,255,0.05)'), border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', padding: '6px 12px', fontSize: 11, minHeight: 'auto', borderRadius: 8, margin: 0 }}
          >
            {lang === 'en' ? 'Select All' : 'Tümünü Seç'}
          </button>
          <button
            onClick={() => { sfxClick(); handleClearPaymentSelection(); }}
            style={{ ...btnStyle('rgba(231, 76, 60, 0.05)'), border: '1px solid rgba(231, 76, 60, 0.15)', color: '#e74c3c', padding: '6px 12px', fontSize: 11, minHeight: 'auto', borderRadius: 8, margin: 0 }}
          >
            {lang === 'en' ? 'Clear' : 'Temizle'}
          </button>
        </div>

        {/* Kart Grupları (Yatay Kaydırılabilir Şeritler - Mobil Dostu) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {hasBank && (
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 10, color: '#10b981', fontWeight: 900, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>{lang === 'en' ? '💵 Cash in Bank Vault' : '💵 Banka Kasasındaki Paralar'}</div>
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
                      <CardVisual card={c} small lang={lang} />
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
              <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 900, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>{lang === 'en' ? '🏠 Your Property Cards' : '🏠 Tapu Senetleriniz (Mülkleriniz)'}</div>
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
                      <CardVisual card={c} small lang={lang} />
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
                        }}>{lang === 'en' ? '🚨 DANGER' : '🚨 TEHLİKE'}</div>
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
              {lang === 'en' ? 'Selected Total' : 'Seçilen Toplam'}: <span style={{ fontSize: 16, color: selectedTotal >= payment.amount ? '#10b981' : '#f59e0b' }}>{selectedTotal}M</span> / {payment.amount}M
              {selectedTotal < payment.amount && selectedTotal === totalAssets && totalAssets > 0 && (
                <span style={{ color: '#ef4444', display: 'block', fontSize: 11, fontWeight: 'normal', marginTop: 2 }}>{lang === 'en' ? '⚠️ You are paying with all your assets' : '⚠️ Tüm varlığınızla ödeme yapıyorsunuz'}</span>
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
            {lang === 'en' ? `Send Payment (${selectedTotal}M)` : `Ödeme Gönder (${selectedTotal}M)`}
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
      <Modal title={lang === 'en' ? `🤝 Trade with ${target?.name}` : `🤝 ${target?.name} İle Takas Yap`} onClose={() => setModal(null)}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
          {lang === 'en' ? 'Trade cards based on mutual agreement. Details will be sent to the opponent for approval.' : 'Karşılıklı anlaşmaya dayalı olarak kart takas edin. Detaylar onay için karşı tarafa iletilir.'}
        </div>
        <div style={{ display: 'flex', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Give Panel */}
          <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: 14, borderRadius: 12 }}>
            <div style={{ color: '#f87171', fontWeight: 800, marginBottom: 12, fontSize: 13, letterSpacing: 0.5 }}>{lang === 'en' ? '📤 WHAT WILL YOU GIVE? (YOURS)' : '📤 NE VERECEKSİN? (SENİN)'}</div>
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
                  <CardVisual card={c} small lang={lang} />
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
                  <CardVisual card={c} small lang={lang} />
                </div>
              ))}
              {(me?.bank || []).length === 0 && Object.values(me?.properties || {}).flat().length === 0 && (
                <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>{lang === 'en' ? 'You have no assets to give' : 'Verebileceğiniz varlığınız yok'}</span>
              )}
            </div>
          </div>

          {/* Take Panel */}
          <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: 14, borderRadius: 12 }}>
            <div style={{ color: '#34d399', fontWeight: 800, marginBottom: 12, fontSize: 13, letterSpacing: 0.5 }}>{lang === 'en' ? `📥 WHAT WILL YOU GET? (${target?.name.toUpperCase()})` : `📥 NE ALACAKSIN? (${target?.name.toUpperCase()})`}</div>
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
                  <CardVisual card={c} small lang={lang} />
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
                  <CardVisual card={c} small lang={lang} />
                </div>
              ))}
              {target.bank.length === 0 && Object.values(target.properties).flat().length === 0 && (
                <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>{lang === 'en' ? 'Player has no assets to trade' : 'Oyuncunun alınabilecek varlığı yok'}</span>
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
          {lang === 'en' ? '🤝 Send Trade Offer' : '🤝 Takas Teklifini Gönder'}
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
        marginBottom: 16,
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="Chaos Deal Cart" style={{ height: 26, filter: 'drop-shadow(0 2px 6px rgba(255, 215, 0, 0.3))' }} />
          <span style={{ color: '#FFD700', fontSize: 14, fontWeight: 950, letterSpacing: '0.5px' }}>Chaos Deal</span>
        </div>

        {/* Actions: Lang, Leaderboard, Login/Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
              padding: '5px 8px',
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
          </button>

          <button
            onClick={() => { handleOpenLeaderboard(); sfxClick(); }}
            style={{
              background: 'linear-gradient(135deg, rgba(241,196,15,0.15), rgba(243,156,18,0.15))',
              border: '1px solid rgba(241,196,15,0.35)',
              color: '#FFD700',
              padding: '5px 10px',
              borderRadius: 20,
              fontSize: 10,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(241,196,15,0.1)'
            }}
          >
            🏆 {lang === 'en' ? 'Rank' : 'Sıralama'}
          </button>

          {dbUser ? (
            <button
              onClick={handleDbLogout}
              style={{
                background: 'linear-gradient(135deg, rgba(231,76,60,0.15), rgba(192,57,43,0.15))',
                border: '1px solid rgba(231,76,60,0.35)',
                color: '#E74C3C',
                padding: '5px 10px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(231,76,60,0.1)'
              }}
            >
              🚪 {lang === 'en' ? 'Logout' : 'Çıkış'}
            </button>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setModal({ type: 'auth' }); sfxClick(); }}
              style={{
                background: 'linear-gradient(135deg, #9b59b6, #8e44ad)',
                border: 'none',
                color: '#fff',
                padding: '5px 10px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(155,89,182,0.2)'
              }}
            >
              🔑 {lang === 'en' ? 'Login' : 'Giriş'}
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="glass-card" style={{ width: '100%', maxWidth: 640, boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)', padding: 18, zIndex: 1, boxSizing: 'border-box' }}>

        {/* USER PROFILE DASHBOARD CARD */}
        {dbUser && (
          <div className={`aura-effect-${dbUser.selectedAura || 'default'}`} style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
              <div
                className={`avatar-container border-style-${dbUser.selectedBorder || 'default'}`}
                style={{
                  width: 52,
                  height: 52,
                  flexShrink: 0,
                  boxShadow: dbUser.selectedBorder && dbUser.selectedBorder !== 'default' ? 'none' : '0 4px 15px rgba(0,0,0,0.4)',
                }}
              >
                <img
                  src={`https://api.dicebear.com/7.x/${dbUser.avatar || 'avataaars'}/svg?seed=${dbUser.username}`}
                  alt="avatar"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                {/* Name + Badge on one row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#FFD700', textShadow: '0 2px 10px rgba(255,215,0,0.2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                    {dbUser.displayName || dbUser.display_name || dbUser.username}
                  </span>
                  {dbUser.selectedBadge && dbUser.selectedBadge !== 'default' && (
                    <span className={`player-badge badge-${dbUser.selectedBadge}`} style={{ fontSize: 10 }}>
                      {{ rookie: '🌱 Çaylak', veteran: '⚔️ Veteran', ghost: '👻 Hayalet', legend: '🦁 Efsane', king: '🫅 Hükümdar' }[dbUser.selectedBadge] || dbUser.selectedBadge}
                    </span>
                  )}
                </div>
                {/* Title */}
                <div className={`title-style-${dbUser.selectedTitle || 'default'}`} style={{ fontSize: 9.5, fontWeight: 'bold', marginTop: 2 }}>
                  {
                    dbUser.selectedTitle && dbUser.selectedTitle !== 'default'
                      ? {
                        gold: { tr: '💰 Para Babası', en: '💰 Money Bag' },
                        flame: { tr: '🔥 Sinsi Hırsız', en: '🔥 Sly Thief' },
                        cyber: { tr: '⚡ Siber Kartal', en: '⚡ Cyber Falcon' },
                        kral: { tr: '👑 Oyunun Kralı', en: '👑 Game King' },
                        cosmic: { tr: '🌌 Kozmik Efendi', en: '🌌 Cosmic Lord' }
                      }[dbUser.selectedTitle]?.[lang] || dbUser.selectedTitle
                      : (lang === 'en' ? 'Classic Player' : 'Klasik Oyuncu')
                  }
                </div>
                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10.5, color: '#e2e8f0', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(255,255,255,0.04)' }}>
                    🏆 <b>{dbUser.wins || 0}</b> {lang === 'en' ? 'Wins' : 'Zafer'}
                  </span>
                  <span style={{ fontSize: 10.5, color: '#F1C40F', background: 'rgba(241,196,15,0.1)', padding: '2px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid rgba(241,196,15,0.15)' }}>
                    🪙 <b>{dbUser.points || 100}</b> {lang === 'en' ? 'Pts' : 'Puan'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto', justifyContent: 'flex-end', minWidth: 120 }}>
              <button
                onClick={() => { setModal({ type: 'shop' }); sfxClick(); }}
                style={{
                  ...btnStyle('linear-gradient(135deg, #f1c40f, #d4ac0d)'),
                  margin: 0,
                  padding: '10px 20px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 900,
                  boxShadow: '0 4px 15px rgba(241,196,15,0.25)',
                  flex: 1,
                  maxWidth: 160
                }}
              >
                🛍️ {lang === 'en' ? 'Shop' : 'Mağaza'}
              </button>
            </div>
          </div>
        )}

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
                          <div style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{lang === 'en' ? `${r.hostName}'s Room` : `${r.hostName}'in Odası`}</div>
                          <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{lang === 'en' ? `Target: ${r.winSets} Sets | Players: ${r.playerCount}/5` : `Hedef: ${r.winSets} Set | Oyuncu: ${r.playerCount}/5`}</div>
                        </div>
                        <button onClick={() => { setJoinCode(r.code); handleJoin(); }} style={{ ...btnStyle('#3498DB'), padding: '6px 14px', fontSize: 11, margin: 0 }}>{lang === 'en' ? 'JOIN' : 'GİRİŞ'}</button>
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
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{lang === 'en' ? 'ROOM ACCESS TICKET (Click to Copy)' : 'ODA GİRİŞ BİLETİ (Kopyalamak İçin Tıkla)'}</div>

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
              onClick={() => { navigator.clipboard.writeText(roomCode); showToast(lang === 'en' ? 'Room code copied!' : 'Oda kodu kopyalandı!', 'success'); sfxClick(); }}>
              <div style={{ fontSize: 9, color: '#FFD700', fontWeight: 900, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{lang === 'en' ? 'COPY' : 'KOPYALA'}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#FFD700', letterSpacing: 4, textShadow: '0 0 12px rgba(255,215,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {roomCode}
                <span style={{ fontSize: 16, opacity: 0.8 }}>📋</span>
              </div>
            </div>

            <div style={{ color: '#fff', fontSize: 14, marginBottom: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span>{lang === 'en' ? '👥 Players' : '👥 Oyuncular'}</span>
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
                        <div
                          className={`avatar-container border-style-${isSelf ? (dbUser?.selectedBorder || p.selectedBorder || 'default') : (p.selectedBorder || 'default')}`}
                          style={{
                            width: 44,
                            height: 44,
                            cursor: 'pointer',
                            boxShadow: isSelf ? '0 0 12px rgba(255,215,0,0.35)' : 'none',
                            transition: 'transform 0.2s'
                          }}
                          onClick={() => {
                            if (isSelf) {
                              const newName = prompt(lang === 'en' ? "Enter your new name:" : "Yeni isminizi girin:", p.name);
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
                          title={isSelf ? (lang === 'en' ? "Click to change name" : "İsmini değiştirmek için tıkla") : (lang === 'en' ? "View profile" : "Profili gör")}
                        >
                          <img
                            src={`https://api.dicebear.com/7.x/${p.avatar || 'avataaars'}/svg?seed=${p.name}`}
                            alt="avatar"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{p.name}</span>
                          {isSelf && <span style={{ fontSize: 8, background: '#FFD700', color: '#000', padding: '1px 5px', borderRadius: 8, fontWeight: 900 }}>{lang === 'en' ? 'YOU' : 'SEN'}</span>}
                          {idx === 0 && <span style={{ fontSize: 8, background: '#8E44AD', color: '#fff', padding: '1px 5px', borderRadius: 8, fontWeight: 900 }}>HOST</span>}
                          {/* Player Badge */}
                          {((isSelf ? dbUser?.selectedBadge : p.selectedBadge) && (isSelf ? dbUser?.selectedBadge : p.selectedBadge) !== 'default') && (
                            <span className={`player-badge badge-${isSelf ? dbUser.selectedBadge : p.selectedBadge}`} style={{ fontSize: 8, padding: '1px 4px' }}>
                              {{ rookie: '🌱', veteran: '⚔️', ghost: '👻', legend: '🦁', king: '🫅' }[isSelf ? dbUser.selectedBadge : p.selectedBadge]}
                            </span>
                          )}
                        </div>
                        {/* Player Custom Title */}
                        {((isSelf ? dbUser?.selectedTitle : p.selectedTitle) && (isSelf ? dbUser?.selectedTitle : p.selectedTitle) !== 'default') && (
                          <div className={`title-style-${isSelf ? dbUser.selectedTitle : p.selectedTitle}`} style={{ fontSize: 8, fontWeight: 'bold', marginTop: 1 }}>
                            {
                              {
                                gold: { tr: '💰 Para Babası', en: '💰 Money Bag' },
                                flame: { tr: '🔥 Sinsi Hırsız', en: '🔥 Sly Thief' },
                                cyber: { tr: '⚡ Siber Kartal', en: '⚡ Cyber Falcon' },
                                kral: { tr: '👑 Oyunun Kralı', en: '👑 Game King' },
                                cosmic: { tr: '🌌 Kozmik Efendi', en: '🌌 Cosmic Lord' }
                              }[isSelf ? dbUser.selectedTitle : p.selectedTitle]?.[lang] || (isSelf ? dbUser.selectedTitle : p.selectedTitle)
                            }
                          </div>
                        )}
                        <span style={{ fontSize: 8.5, color: '#a0aec0', marginTop: 1 }}>
                          {p.isBot ? (lang === 'en' ? '🤖 AI Player' : '🤖 Yapay Zeka Oyuncu') : (lang === 'en' ? '👤 Online Player' : '👤 Çevrimiçi Oyuncu')}
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
                        {isReady ? (lang === 'en' ? '✓ READY' : '✓ HAZIR') : (lang === 'en' ? '⏳ WAITING' : '⏳ BEKLİYOR')}
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
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.15)' }}>{lang === 'en' ? 'Empty Slot' : 'Boş Yuva'}</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.08)', marginTop: 1 }}>{lang === 'en' ? 'Waiting for player...' : 'Oyuncu bekleniyor...'}</span>
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
                  <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 8, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase' }}>{lang === 'en' ? '🎨 CARD THEME SETTINGS' : '🎨 KART TEMA AYARI'}</div>
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
                        {t.id === 'default' ? (lang === 'en' ? '🎲 Classic' : t.name) : (t.id === 'wood' ? (lang === 'en' ? '🪵 Wooden Table' : t.name) : t.name)}
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
                        if (res?.ok) showToast(lang === 'en' ? 'Bot added to room' : 'Bot odaya eklendi', 'success');
                        else if (res?.error) showToast(res.error, 'error');
                      });
                    }} style={{ ...btnStyle('linear-gradient(135deg, #8E44AD, #9B59B6)'), width: '100%', padding: '12px', fontSize: 13, borderRadius: 8, margin: 0 }}>
                      {lang === 'en' ? '🤖 Add Bot (AI)' : '🤖 Bot Ekle (Yapay Zeka)'}
                    </button>
                  )}

                  <button onClick={handleStart} style={{ ...btnStyle('linear-gradient(135deg, #10b981, #059669)'), width: '100%', padding: '12px', fontSize: 13, borderRadius: 8, margin: 0 }}>
                    {lang === 'en' ? `🏁 Start Game (${gameState?.players?.length || 1} Players)` : `🏁 Oyunu Başlat (${gameState?.players?.length || 1} Oyuncu)`}
                  </button>

                  <button onClick={handleCloseRoom} style={{
                    ...btnStyle('rgba(231,76,60,0.15)'),
                    width: '100%', padding: '10px', fontSize: 12, borderRadius: 8, border: '1px solid rgba(231,76,60,0.3)', color: '#E74C3C', margin: 0
                  }}>
                    {lang === 'en' ? '❌ Close Room' : '❌ Odayı Kapat'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Guest Panel */}
                <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8, marginBottom: 12, fontStyle: 'italic' }}>{lang === 'en' ? 'Host will start the game, please wait...' : 'Host oyunu başlatacak, lütfen bekleyin...'}</p>

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
                    {gameState?.players?.find(p => p.id === playerId)?.isReady ? (lang === 'en' ? '❌ NOT READY' : '❌ HAZIR DEĞİLİM') : (lang === 'en' ? '✅ READY UP!' : '✅ HAZIR OL!')}
                  </button>

                  {/* View Only Settings */}
                  {renderRoomSettings(true)}

                  <button
                    onClick={() => {
                      if (!window.confirm(lang === 'en' ? 'Are you sure you want to leave the room?' : 'Odadan ayrılmak istediğinden emin misin?')) return;
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
                    {lang === 'en' ? '🚪 Leave Room' : '🚪 Odadan Ayrıl'}
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
    return 'radial-gradient(circle at center, #781c1c 0%, #0c081e 80%)';
  }
  if (isBlocked) {
    return 'radial-gradient(circle at center, #1e1520 0%, #08070d 80%)';
  }

  // Check if player has selected a custom Table Board Theme
  const tableTheme = dbUser?.selectedTableTheme || 'default';
  if (tableTheme === 'volcano') {
    return 'radial-gradient(circle at center, #2d0e07 0%, #0c0200 100%)';
  }
  if (tableTheme === 'cosmic') {
    return 'radial-gradient(circle at center, #150926 0%, #05020c 100%)';
  }
  if (tableTheme === 'matrix') {
    return 'radial-gradient(circle at center, #041404 0%, #010501 100%)';
  }
  if (tableTheme === 'gold') {
    return 'radial-gradient(circle at center, #221a08 0%, #070502 100%)';
  }

  if (isMyTurn) {
    if (activeTheme === 'cyberpunk') return 'radial-gradient(circle at center, #1a162b 0%, #06050b 80%)';
    if (activeTheme === 'retro') return 'radial-gradient(circle at center, #0f1813 0%, #050806 80%)';
    if (activeTheme === 'wood') return 'radial-gradient(circle at center, #241a15 0%, #0d0907 80%)';
    return 'radial-gradient(circle at center, #162238 0%, #070a12 80%)';
  }
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

      {/* Custom Table Themeoverlay = { text:s Overlays */}
      {dbUser?.selectedTableTheme && dbUser.selectedTableTheme !== 'default' && (
        <>
          <div className={`table-theme-overlay theme-overlay-${dbUser.selectedTableTheme}`} />
          {dbUser.selectedTableTheme === 'volcano' && (
            <div className="lava-bubbles-container">
              <div className="lava-bubble" style={{ '--left': '10%', '--size': '80px', '--delay': '0s', '--dur': '12s' }} />
              <div className="lava-bubble" style={{ '--left': '30%', '--size': '120px', '--delay': '3s', '--dur': '16s' }} />
              <div className="lava-bubble" style={{ '--left': '55%', '--size': '90px', '--delay': '1s', '--dur': '14s' }} />
              <div className="lava-bubble" style={{ '--left': '80%', '--size': '110px', '--delay': '5s', '--dur': '18s' }} />
            </div>
          )}
          {dbUser.selectedTableTheme === 'cosmic' && (
            <div className="cosmic-stars-container">
              <div className="cosmic-star" style={{ '--top': '15%', '--left': '15%', '--delay': '0s' }} />
              <div className="cosmic-star" style={{ '--top': '25%', '--left': '75%', '--delay': '1.5s' }} />
              <div className="cosmic-star" style={{ '--top': '65%', '--left': '10%', '--delay': '0.5s' }} />
              <div className="cosmic-star" style={{ '--top': '80%', '--left': '85%', '--delay': '2s' }} />
              <div className="cosmic-star" style={{ '--top': '40%', '--left': '50%', '--delay': '2.5s' }} />
            </div>
          )}
          {dbUser.selectedTableTheme === 'gold' && (
            <div className="gold-sparkles-container">
              <div className="gold-sparkle" style={{ '--left': '5%', '--delay': '0s', '--dur': '6s' }} />
              <div className="gold-sparkle" style={{ '--left': '25%', '--delay': '2s', '--dur': '8s' }} />
              <div className="gold-sparkle" style={{ '--left': '45%', '--delay': '1s', '--dur': '7s' }} />
              <div className="gold-sparkle" style={{ '--left': '70%', '--delay': '3s', '--dur': '9s' }} />
              <div className="gold-sparkle" style={{ '--left': '90%', '--delay': '1.5s', '--dur': '6s' }} />
            </div>
          )}
          {dbUser.selectedTableTheme === 'snow' && (
            <div className="snow-flakes-container">
              <div className="snow-flake" style={{ '--left': '10%', '--size': '8px', '--delay': '0s', '--dur': '10s', '--drift': '50px' }} />
              <div className="snow-flake" style={{ '--left': '25%', '--size': '12px', '--delay': '3s', '--dur': '14s', '--drift': '-30px' }} />
              <div className="snow-flake" style={{ '--left': '45%', '--size': '6px', '--delay': '1s', '--dur': '8s', '--drift': '40px' }} />
              <div className="snow-flake" style={{ '--left': '65%', '--size': '10px', '--delay': '4s', '--dur': '12s', '--drift': '-20px' }} />
              <div className="snow-flake" style={{ '--left': '85%', '--size': '8px', '--delay': '2s', '--dur': '9s', '--drift': '30px' }} />
            </div>
          )}
          {dbUser.selectedTableTheme === 'blizzard' && (
            <div className="blizzard-winds-container">
              <div className="blizzard-wind" style={{ '--left': '20%', '--size': '15px', '--delay': '0s', '--dur': '4s' }} />
              <div className="blizzard-wind" style={{ '--left': '40%', '--size': '25px', '--delay': '1s', '--dur': '5s' }} />
              <div className="blizzard-wind" style={{ '--left': '60%', '--size': '18px', '--delay': '0.5s', '--dur': '3.5s' }} />
              <div className="blizzard-wind" style={{ '--left': '80%', '--size': '22px', '--delay': '2s', '--dur': '4.5s' }} />
              <div className="blizzard-wind" style={{ '--left': '95%', '--size': '12px', '--delay': '1.5s', '--dur': '3.8s' }} />
            </div>
          )}
          {dbUser.selectedTableTheme === 'zen_garden' && (
            <div className="snow-flakes-container">
              <div className="snow-flake" style={{ '--left': '15%', '--size': '10px', '--delay': '0s', '--dur': '8s', '--drift': '40px', background: 'transparent', fontSize: 10 }}>🍃</div>
              <div className="snow-flake" style={{ '--left': '35%', '--size': '12px', '--delay': '2s', '--dur': '11s', '--drift': '-20px', background: 'transparent', fontSize: 12 }}>🌸</div>
              <div className="snow-flake" style={{ '--left': '60%', '--size': '9px', '--delay': '1s', '--dur': '9s', '--drift': '30px', background: 'transparent', fontSize: 9 }}>🍃</div>
              <div className="snow-flake" style={{ '--left': '80%', '--size': '11px', '--delay': '3s', '--dur': '10s', '--drift': '-15px', background: 'transparent', fontSize: 11 }}>🌸</div>
            </div>
          )}
          {dbUser.selectedTableTheme === 'haunted_castle' && (
            <div className="snow-flakes-container">
              <div className="snow-flake" style={{ '--left': '20%', '--size': '14px', '--delay': '0s', '--dur': '6s', '--drift': '-100px', background: 'transparent', fontSize: 14 }}>🦇</div>
              <div className="snow-flake" style={{ '--left': '50%', '--size': '16px', '--delay': '2.5s', '--dur': '7s', '--drift': '80px', background: 'transparent', fontSize: 16 }}>🦇</div>
              <div className="snow-flake" style={{ '--left': '80%', '--size': '12px', '--delay': '1s', '--dur': '5.5s', '--drift': '-60px', background: 'transparent', fontSize: 12 }}>🦇</div>
            </div>
          )}
          {dbUser.selectedTableTheme === 'pirate_ship' && (
            <div className="gold-sparkles-container">
              <div className="gold-sparkle" style={{ '--left': '10%', '--delay': '0s', '--dur': '7s', background: 'transparent', fontSize: 8, transform: 'none', boxShadow: 'none' }}>🪙</div>
              <div className="gold-sparkle" style={{ '--left': '35%', '--delay': '2s', '--dur': '9s', background: 'transparent', fontSize: 11, transform: 'none', boxShadow: 'none' }}>🫧</div>
              <div className="gold-sparkle" style={{ '--left': '65%', '--delay': '1s', '--dur': '8s', background: 'transparent', fontSize: 9, transform: 'none', boxShadow: 'none' }}>🪙</div>
              <div className="gold-sparkle" style={{ '--left': '85%', '--delay': '3s', '--dur': '6s', background: 'transparent', fontSize: 10, transform: 'none', boxShadow: 'none' }}>🫧</div>
            </div>
          )}
        </>
      )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FFD700', fontWeight: 900, fontSize: 13.5 }}><img src="/logo.png" alt="logo" style={{ height: 18 }} /> Chaos Deal Cart</div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFD700', fontWeight: 900, fontSize: 15.5 }}><img src="/logo.png" alt="logo" style={{ height: 22 }} /> Chaos Deal Cart</div>
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
      <ToastStack toasts={toasts} actionOverlay={actionOverlay} />

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
            <h2 style={{ color: '#3498DB', marginBottom: 8 }}>{lang === 'en' ? `${myPendingTrade.sourceName} is Proposing a Trade!` : `${myPendingTrade.sourceName} Takas Teklif Ediyor!`}</h2>
            <p style={{ color: '#aaa', fontSize: 13, marginBottom: 20 }}>
              {lang === 'en' ? 'Do you approve the mutual trade of the following cards?' : 'Aşağıdaki kartların karşılıklı olarak takas edilmesini onaylıyor musunuz?'}
            </p>

            <div style={{ display: 'flex', gap: 14, marginBottom: 24, textAlign: 'left', flexDirection: 'row' }}>
              {/* Sana Verilecek (Offered by source player) */}
              <div style={{ flex: 1, background: 'rgba(46, 204, 113, 0.05)', border: '1px solid rgba(46, 204, 113, 0.15)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#2ECC71', fontSize: 11, fontWeight: 900, marginBottom: 10, letterSpacing: 0.5 }}>{lang === 'en' ? '📤 TO BE GIVEN TO YOU' : '📤 SANA VERİLECEK'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '2px 0' }}>
                  {[...myPendingTrade.offerBankIds, ...myPendingTrade.offerPropIds].map(id => {
                    const c = findCardInGame(id);
                    return c ? <CardVisual key={id} card={c} small lang={lang} /> : null;
                  })}
                  {myPendingTrade.offerBankIds.length + myPendingTrade.offerPropIds.length === 0 && (
                    <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>{lang === 'en' ? 'No cards offered' : 'Hiç kart verilmiyor'}</span>
                  )}
                </div>
              </div>

              {/* Senden İstenecek (Requested from me) */}
              <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: 12, borderRadius: 10, display: 'flex', flexDirection: 'column' }}>
                <div style={{ color: '#F87171', fontSize: 11, fontWeight: 900, marginBottom: 10, letterSpacing: 0.5 }}>{lang === 'en' ? '📥 REQUESTED FROM YOU' : '📥 SENDEN İSTENEN'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto', padding: '2px 0' }}>
                  {[...myPendingTrade.requestBankIds, ...myPendingTrade.requestPropIds].map(id => {
                    const c = findCardInGame(id);
                    return c ? <CardVisual key={id} card={c} small lang={lang} /> : null;
                  })}
                  {myPendingTrade.requestBankIds.length + myPendingTrade.requestPropIds.length === 0 && (
                    <span style={{ color: '#64748b', fontSize: 11, fontStyle: 'italic' }}>{lang === 'en' ? 'No cards requested' : 'Hiç kart istenmiyor'}</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleRespondTrade(myPendingTrade.id, true)} style={{ ...btnStyle('#2ECC71'), flex: 1, padding: 12, fontSize: 14 }}>{lang === 'en' ? '✅ Accept' : '✅ Kabul Et'}</button>
              <button onClick={() => handleRespondTrade(myPendingTrade.id, false)} style={{ ...btnStyle('#E74C3C'), flex: 1, padding: 12, fontSize: 14 }}>{lang === 'en' ? '❌ Reject' : '❌ Reddet'}</button>
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
              <CardVisual card={fc.card} lang={lang} />
            </motion.div>
          </div>
        ))}
      </AnimatePresence>



      {/* Kart Önizleme Tooltip Kaldırıldı */}

      {/* Ödeme Yaparken Uçan Kartlar */}
      {payingFlyingCards.map(card => (
        <div key={card.id} className="thrown-card-ghost" style={{ '--sx': '0px', '--sy': '400px' }}>
          <CardVisual card={card} lang={lang} />
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
          <CardVisual card={fc.card} small lang={lang} />
        </div>
      ))}

      {/* Iskarta Uçan Kartlar (Discarded / Played Flying Cards) */}
      {discardFlyingCards.map(fc => (
        <div
          key={fc.id}
          className="flying-card-entity discard-anim"
          style={{
            '--fsx': fc.sx + 'px',
            '--fsy': fc.sy + 'px',
            '--fdx': fc.dx + 'px',
            '--fdy': fc.dy + 'px'
          }}
        >
          <CardVisual card={fc.card} small lang={lang} />
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

      {/* Şans Zarı Animasyon Overlay */}
      {isDiceRolling && (
        <div className={`dice-rolling-overlay dice-skin-${dbUser?.selectedDiceSkin || 'default'}`}>
          <div className="dice-rolling-card">
            <div className="dice-cube-wrapper">
              <div className="dice-cube-3d">
                <div className="dice-side face-front">⚀</div>
                <div className="dice-side face-back">⚅</div>
                <div className="dice-side face-right">⚂</div>
                <div className="dice-side face-left">⚃</div>
                <div className="dice-side face-top">⚄</div>
                <div className="dice-side face-bottom">⚁</div>
              </div>
            </div>
            <div className="dice-rolling-text">
              {lang === 'en' ? 'ROLLING THE DIE...' : 'KUMARBAZIN ZARI ATILIYOR...'}
            </div>
          </div>
        </div>
      )}

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
          lang={lang}
        />
      )}

      {/* Bekleyen itiraz/ödeme bildirimi (diğer oyuncular için) */}
      {isBlocked && !gameState.myPendingChallenge && !gameState.myPendingPayment && (
        <div style={{ background: 'rgba(255,215,0,0.15)', borderBottom: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', textAlign: 'center', padding: 8, fontSize: 12 }}>
          {gameState.pendingChallenges?.length > 0 && gameState.pendingChallenges.map(ch => (
            <div key={ch.id}>
              ⏳ {ch.action === 'birthday' ? (lang === 'en' ? `${ch.sourceName}'s Birthday gift` : `${ch.sourceName}'in Doğum Günü hediyesi`) : (lang === 'en' ? `${ch.sourceName} made a move` : `${ch.sourceName} bir hamle yaptı`)} — <b>{ch.responderName}</b> {lang === 'en' ? 'is responding...' : 'yanıt veriyor...'}
            </div>
          ))}
          {gameState.pendingPayments?.length > 0 && gameState.pendingPayments.map(p => (
            <div key={p.id}>
              ⏳ {lang === 'en' ? <><b>{p.payerName}</b> is paying {p.amount}M to {p.collectorName}...</> : <><b>{p.payerName}</b>, {p.collectorName}'e {p.amount}M ödeme yapıyor...</>}
            </div>
          ))}
        </div>
      )}

      <div className={`game-content ${rageQuit ? 'rage-quit-active' : ''} ${isTimeRunningOut ? 'time-running-out-glow' : ''}`}>

        {/* ═══ SOL SÜTUN: OYUNCULAR ═══ */}
        <div className="players-col player-avatar-strip">
          {gameState.players.map(player => {
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
                className={`${isCurrent ? 'player-strip-card ref-style spotlight-glow turn-pulsate' : 'player-strip-card ref-style'} aura-effect-${player.selectedAura || 'default'}`}
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
                  overflow: 'visible',
                  boxSizing: 'border-box',
                }}
              >
                {/* Hedef çarpı */}
                {isTargeted && <div className="target-crosshair" />}

                {/* Emote Animations Directed at this Player */}
                <AnimatePresence>
                  {emotes.filter(e => e.targetId === player.id).map(emote => (
                    <motion.div
                      key={emote.id}
                      initial={{ scale: 0.2, y: 10, x: '-50%', opacity: 0 }}
                      animate={{ scale: [1, 1.6, 1.3], y: [-15, -45, -55], opacity: [1, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.2, ease: "easeOut" }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        fontSize: '48px',
                        pointerEvents: 'none',
                        zIndex: 1000,
                        textShadow: '0 4px 15px rgba(0,0,0,0.8)'
                      }}
                    >
                      {emote.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Aktif sıra göstergesi — üst çizgi */}
                {isCurrent && (
                  <>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, transparent, ${playerColor}, transparent)`,
                      borderRadius: '14px 14px 0 0',
                      animation: 'active-player-pulse 1.5s ease-in-out infinite',
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, rgba(22, 16, 45, 0.95), rgba(12, 10, 24, 0.98))',
                      border: `1.5px solid ${playerColor}`,
                      borderRadius: 12,
                      padding: '3px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      boxShadow: `0 4px 12px ${playerColor}60, inset 0 0 6px ${playerColor}20`,
                      zIndex: 100,
                      whiteSpace: 'nowrap',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      animation: 'active-player-pulse 1.8s ease-in-out infinite'
                    }}>
                      <span style={{ 
                        fontSize: 8, 
                        color: playerColor, 
                        fontWeight: 900, 
                        letterSpacing: 0.5,
                        textShadow: `0 0 4px ${playerColor}50`
                      }}>
                        {lang === 'en' ? 'TURN' : 'SIRA'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 2 }}>
                        {renderActionPoints(gameState.actionsLeft)}
                      </span>
                    </div>
                  </>
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
                    className={`avatar-container border-style-${player.selectedBorder || 'default'}${isCurrent ? ' turn-glow-active' : ''}`}
                    style={{
                      width: 34, height: 34, flexShrink: 0,
                      cursor: 'pointer',
                      '--turn-color': playerColor,
                      boxShadow: isCurrent ? `0 0 12px ${playerColor}` : `0 0 4px ${playerColor}44`,
                    }}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/${player.avatar || 'bottts'}/svg?seed=${player.name}`}
                      alt={player.name}
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <span>{player.name}</span>
                      {player.id === playerId && <span style={{ fontSize: 8, background: '#FFD700', color: '#000', padding: '0 4px', borderRadius: 4, fontWeight: 900 }}>{lang === 'en' ? 'YOU' : 'SEN'}</span>}
                      {player.selectedBadge && player.selectedBadge !== 'default' && (
                        <span className={`player-badge badge-${player.selectedBadge}`}>
                          {{ rookie: '🌱', veteran: '⚔️', ghost: '👻', legend: '🦁', king: '🫅' }[player.selectedBadge]}
                        </span>
                      )}
                      {player.isAFK && ' 💤'}
                      {player.connected === false && <span style={{ color: '#f44', fontSize: 8 }}> ●</span>}
                    </div>
                    {/* Active customization title */}
                    <div className={`title-style-${player.selectedTitle || 'default'}`} style={{ fontSize: 8.5, fontWeight: 'bold', marginTop: 1 }}>
                      {
                        player.selectedTitle && player.selectedTitle !== 'default'
                          ? {
                            gold: { tr: '💰 Para Babası', en: '💰 Money Bag' },
                            flame: { tr: '🔥 Sinsi Hırsız', en: '🔥 Sly Thief' },
                            cyber: { tr: '⚡ Siber Kartal', en: '⚡ Cyber Falcon' },
                            kral: { tr: '👑 Oyunun Kralı', en: '👑 Game King' },
                            cosmic: { tr: '🌌 Kozmik Efendi', en: '🌌 Cosmic Lord' }
                          }[player.selectedTitle]?.[lang] || player.selectedTitle
                          : (lang === 'en' ? 'Classic' : 'Klasik')
                      }
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
                        position: 'relative', zIndex: 2,
                        overflow: 'hidden',
                        boxShadow: `0 2px 6px rgba(0,0,0,0.5), 0 0 4px ${playerColor}33`,
                      }}>
                        <CardBack theme={player.selectedCardBack || 'default'} small />
                      </div>
                    </div>
                    {/* Kart sayısı etiketi */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{
                        fontSize: 13, fontWeight: 900, color: '#fff',
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                        lineHeight: 1,
                      }}>×{player.handCount}</span>
                      <span style={{ fontSize: 8, color: '#aaa', marginTop: 1 }}>{lang === 'en' ? 'cards' : 'kart'}</span>
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
                            background: isComplete ? 'linear-gradient(135deg, #FFF, #FFF8D0)' : '#fff',
                            border: isComplete ? '1.5px solid #FFD700' : '1px solid rgba(0,0,0,0.2)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            overflow: 'hidden', position: 'relative',
                            boxShadow: isComplete
                              ? '0 0 10px #FFD700, 0 1px 3px rgba(0,0,0,0.4)'
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
                          {/* Tam set tacı */}
                          {isComplete && (
                            <div style={{
                              position: 'absolute', bottom: 0, right: 0,
                              fontSize: 7, color: '#FFD700',
                              textShadow: '0 0 3px #FFD700'
                            }}>👑</div>
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
                  }}>{TRANSLATIONS[lang]?.noPropertiesYet || 'henüz arazi yok'}</div>
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
                      boxShadow: '0 4px 15px rgba(255,215,0,0.25)',
                      cursor: 'default',
                      position: 'relative',
                      overflow: 'visible'
                    }}>
                      {/* Mobil 3D Deste Kalınlık Katmanları */}
                      {gameState.deckCount >= 40 && <div style={{ position: 'absolute', inset: 0, top: 2, left: 1.5, background: 'rgba(0,0,0,0.4)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.06)', zIndex: 1 }} />}
                      {gameState.deckCount >= 25 && <div style={{ position: 'absolute', inset: 0, top: 1.5, left: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.07)', zIndex: 2 }} />}
                      {gameState.deckCount >= 10 && <div style={{ position: 'absolute', inset: 0, top: 0.8, left: 0.5, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '0.5px solid rgba(255,255,255,0.08)', zIndex: 3 }} />}
                      
                      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden', zIndex: 4 }}>
                        <CardBack theme={dbUser?.selectedCardBack || 'default'} small />
                        <div style={{
                          position: 'absolute', bottom: -4, right: -4,
                          background: '#FFD700', color: '#000',
                          fontSize: 9, fontWeight: 900, borderRadius: '50%',
                          width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                          zIndex: 6
                        }}>{gameState.deckCount}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>{lang === 'en' ? 'DECK' : 'DESTE'}</span>
                  </div>

                  {/* ── MOBIL GERI SAYIM ── */}
                  {(() => {
                    if (!gameState.turnTimer || gameState.turnTimer <= 0 || !gameState.turnStartTime) {
                      const currentP = gameState.players.find(p => p.id === gameState.currentPlayerId);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 1 }}>
                          <span style={{ fontSize: 7, color: '#555', fontWeight: 'bold' }}>{lang === 'en' ? 'TURN' : 'SIRA'}</span>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            border: '1.5px solid rgba(99,179,237,0.3)',
                            background: 'rgba(99,179,237,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14,
                          }}>
                            {currentP?.avatar?.slice(0,2) || '🎲'}
                          </div>
                          <span style={{ fontSize: 7, color: '#667', maxWidth: 46, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentP?.name || ''}
                          </span>
                        </div>
                      );
                    }
                    const totalTime = gameState.turnTimer;
                    const secs = remainingTime ?? totalTime;
                    const pct = Math.max(0, Math.min(100, (secs / totalTime) * 100));
                    const isDanger = secs <= 10 && secs > 0;
                    const isWarn   = secs <= 20 && secs > 10;
                    const r = 16;
                    const circ = 2 * Math.PI * r;
                    const dashOffset = circ * (1 - pct / 100);
                    const ringColor = isDanger ? '#ef4444' : isWarn ? '#f59e0b' : '#34d399';
                    const textColor = isDanger ? '#ef4444' : isWarn ? '#f59e0b' : '#e2e8f0';
                    const bgColor   = isDanger ? 'rgba(239,68,68,0.12)' : isWarn ? 'rgba(245,158,11,0.1)' : 'rgba(52,211,153,0.08)';
                    const currentP  = gameState.players.find(p => p.id === gameState.currentPlayerId);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 1 }}>
                        <span style={{ fontSize: 7, color: '#555', fontWeight: 'bold' }}>{lang === 'en' ? 'TIME' : 'SÜRE'}</span>
                        <div style={{
                          position: 'relative', width: 40, height: 40,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          animation: isDanger ? 'active-player-pulse 0.8s ease-in-out infinite' : 'none',
                        }}>
                          <svg width="40" height="40" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                            <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                            <circle
                              cx="20" cy="20" r={r}
                              fill="none"
                              stroke={ringColor}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeDasharray={circ}
                              strokeDashoffset={dashOffset}
                              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease', filter: `drop-shadow(0 0 3px ${ringColor})` }}
                            />
                          </svg>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: bgColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: textColor }}>
                              {secs}
                            </span>
                          </div>
                        </div>
                        <span style={{
                          fontSize: 7, color: isDanger ? '#ef4444' : '#667',
                          maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontWeight: isDanger ? '900' : 'normal',
                        }}>
                          {currentP?.name || ''}
                        </span>
                      </div>
                    );
                  })()}

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
                          <CardVisual card={gameState.discard[gameState.discard.length - 1]} small lang={lang} />
                        </div>
                      ) : (
                        <span style={{ fontSize: 8, color: '#666' }}>{TRANSLATIONS[lang]?.empty || 'BOŞ'}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>{lang === 'en' ? 'LAST MOVE' : 'SON HAMLE'}</span>
                  </div>
                </div>

                {/* Benim Bankam ve Arazilerim (Mobil) */}
                <div data-drop-target="properties" style={{
                  flex: 1, padding: 8, background: dragOverTarget === 'properties' ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.02)',
                  borderRadius: 8, display: 'flex', flexDirection: 'column', overflowY: 'auto'
                }}>
                  <div style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', marginBottom: 4 }}>{TRANSLATIONS[lang]?.myProperties || 'BENİM ARAZİLERİM'} ({myCompleteSets}/{gameState?.winSets || 3} {lang === 'en' ? 'sets' : 'set'})</div>
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
                        width: 64,
                        minHeight: 88,
                        background: dragOverTarget === 'bank' ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.03)',
                        border: dragOverTarget === 'bank' ? '2.5px dashed #2ECC71' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: 4,
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: 9, color: '#2ECC71', fontWeight: 'bold' }}>🏦 <BankTicker value={me.bankTotal} /></span>
                      <div style={{ position: 'relative', width: 54, height: 72 }}>
                        {me.bank?.slice(0, 5).map((c, i) => (
                          <div
                            key={c.id}
                            className="mini-card-wrapper"
                            style={{
                              position: 'absolute',
                              top: i * 4,
                              left: i * 2,
                              width: 48,
                              height: 64,
                              zIndex: i
                            }}
                          >
                            <div style={{
                              width: 48,
                              height: 64,
                              borderRadius: 4,
                              background: 'linear-gradient(135deg, #2ECC71, #196F3D)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: 11,
                              color: '#fff',
                            }} className="mini-card-face">
                              {c.value}M
                            </div>
                            <div className="mini-card-hover-view">
                              <CardVisual card={c} small lang={lang} />
                            </div>
                          </div>
                        ))}
                        {(!me.bank || me.bank.length === 0) && (
                          <div style={{ width: 48, height: 64, borderRadius: 4, border: '1.2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#444' }}>{TRANSLATIONS[lang]?.empty || 'BOŞ'}</div>
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
                            background: isComplete ? 'rgba(255, 215, 0, 0.08)' : 'transparent',
                            borderRadius: 4,
                            padding: 2,
                            border: isComplete ? '1.5px solid #FFD700' : 'none',
                            boxShadow: isComplete ? '0 0 10px rgba(255, 215, 0, 0.4), inset 0 0 6px rgba(255, 215, 0, 0.1)' : 'none',
                            boxSizing: 'border-box'
                          }}
                        >
                          {/* Yüzen Set Tamamlandı Tacı */}
                          {isComplete && (
                            <div style={{
                              position: 'absolute',
                              top: -12,
                              fontSize: 10,
                              zIndex: 100,
                              animation: 'active-player-pulse 1.5s infinite ease-in-out',
                              textShadow: '0 0 5px #FFD700'
                            }}>👑</div>
                          )}
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
                                <div style={{ width: '100%', height: 8, background: getMiniCardStripeStyle(c, color) }} />
                                <div style={{ fontSize: 8, fontWeight: 900, color: '#333', marginTop: 4, transform: 'scale(0.85)' }}>
                                  {c.isWild ? '★' : (c.value || '')}
                                </div>
                              </div>
                              <div className="mini-card-hover-view">
                                <CardVisual card={c} small lang={lang} />
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
                          }} title={lang === 'en' ? 'Current Rent Income and Buildings' : 'Güncel Kira Getirisi ve Binalar'}>
                            <span>💵{calculateRentClient(me, color)}M</span>
                            {isComplete && me.buildings?.[color] && (
                              <>
                                {me.buildings[color].houses > 0 && <span>🏠</span>}
                                {me.buildings[color].hotel && <span>🏨</span>}
                              </>
                            )}
                          </div>
                          
                          {/* Set Yönetimi Butonu (Mobil) */}
                          <div
                            onClick={() => { setModal({ type: 'manageSet', color, cards }); sfxClick(); }}
                            style={{
                              fontSize: 7.5, fontWeight: 900,
                              color: '#FFD700',
                              background: 'rgba(255,215,0,0.12)',
                              border: '1.2px solid rgba(255,215,0,0.4)',
                              borderRadius: 3,
                              padding: '2px 4px',
                              marginTop: 3,
                              cursor: 'pointer',
                              zIndex: 25,
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              justifyContent: 'center',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                            title={lang === 'en' ? 'Manage Set / Change Colors' : 'Seti Yönet / Renk Değiştir'}
                          >
                            ⚙️ {lang === 'en' ? 'MANAGE' : 'YÖNET'}
                          </div>
                        </div>
                      );
                    })}
                    {Object.entries(me.properties || {}).every(([_, cards]) => cards.length === 0) && (
                      <span style={{ color: '#555', fontSize: 10 }}>{TRANSLATIONS[lang]?.noPropertiesYet || 'Henüz arazi yok'}</span>
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
                  <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>🎴 {lang === 'en' ? 'DECK' : 'DESTE'} ({gameState.deckCount})</span>
                  <div className="play-arena-slot" style={{ position: 'relative', overflow: 'visible' }}>
                    {gameState.deckCount > 0 ? (
                      <>
                        {/* 3D Deste Kalınlık Katmanları */}
                        {gameState.deckCount >= 40 && <div style={{ position: 'absolute', inset: 0, top: 4, left: 3, background: 'rgba(0,0,0,0.4)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', zIndex: 1 }} />}
                        {gameState.deckCount >= 30 && <div style={{ position: 'absolute', inset: 0, top: 3, left: 2, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)', zIndex: 2 }} />}
                        {gameState.deckCount >= 20 && <div style={{ position: 'absolute', inset: 0, top: 2, left: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', zIndex: 3 }} />}
                        {gameState.deckCount >= 10 && <div style={{ position: 'absolute', inset: 0, top: 1, left: 0, background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', zIndex: 4 }} />}
                        
                        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 8, overflow: 'hidden', zIndex: 5 }} title={lang === 'en' ? 'Remaining Cards in Deck' : 'Destedeki Kalan Kart Sayısı'}>
                          <CardBack theme={dbUser?.selectedCardBack || 'default'} />
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 10, color: '#444' }}>{TRANSLATIONS[lang]?.empty || 'BOŞ'}</span>
                    )}
                  </div>
                </div>

                {/* ── GERI SAYIM (Deste ile Son Hamle Arasında) ── */}
                {(() => {
                  if (!gameState.turnTimer || gameState.turnTimer <= 0 || !gameState.turnStartTime) {
                    // Zamansız mod: sadece aktif oyuncu avatarı
                    const currentP = gameState.players.find(p => p.id === gameState.currentPlayerId);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 8, color: '#555', letterSpacing: 0.5, fontWeight: 'bold' }}>
                          {lang === 'en' ? 'TURN' : 'SIRA'}
                        </span>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          border: '2px solid rgba(99,179,237,0.4)',
                          background: 'rgba(99,179,237,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20,
                        }}>
                          {currentP?.avatar?.slice(0,2) || '🎲'}
                        </div>
                        <span style={{ fontSize: 8, color: '#667', maxWidth: 54, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {currentP?.name || ''}
                        </span>
                      </div>
                    );
                  }

                  const totalTime = gameState.turnTimer;
                  const secs = remainingTime ?? totalTime;
                  const pct = Math.max(0, Math.min(100, (secs / totalTime) * 100));
                  const isDanger = secs <= 10 && secs > 0;
                  const isWarn   = secs <= 20 && secs > 10;

                  // SVG çember için
                  const r = 22;
                  const circ = 2 * Math.PI * r;
                  const dashOffset = circ * (1 - pct / 100);

                  const ringColor = isDanger ? '#ef4444' : isWarn ? '#f59e0b' : '#34d399';
                  const textColor = isDanger ? '#ef4444' : isWarn ? '#f59e0b' : '#e2e8f0';
                  const bgColor   = isDanger ? 'rgba(239,68,68,0.12)' : isWarn ? 'rgba(245,158,11,0.1)' : 'rgba(52,211,153,0.08)';
                  const currentP  = gameState.players.find(p => p.id === gameState.currentPlayerId);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 8, color: '#555', letterSpacing: 0.5, fontWeight: 'bold' }}>
                        {lang === 'en' ? 'TIME LEFT' : 'KALAN SÜRE'}
                      </span>

                      {/* SVG Ring Countdown */}
                      <div style={{
                        position: 'relative', width: 54, height: 54,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: isDanger ? 'active-player-pulse 0.8s ease-in-out infinite' : 'none',
                      }}>
                        <svg width="54" height="54" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                          {/* Track */}
                          <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
                          {/* Progress */}
                          <circle
                            cx="27" cy="27" r={r}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray={circ}
                            strokeDashoffset={dashOffset}
                            style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease', filter: `drop-shadow(0 0 4px ${ringColor})` }}
                          />
                        </svg>
                        {/* Center number */}
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: bgColor,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'column',
                        }}>
                          <span style={{ fontSize: secs >= 100 ? 11 : 15, fontWeight: 900, color: textColor, lineHeight: 1 }}>
                            {secs}
                          </span>
                          {currentP && (
                            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>s</span>
                          )}
                        </div>
                      </div>

                      {/* Aktif Oyuncu İsmi */}
                      <span style={{
                        fontSize: 8, color: isDanger ? '#ef4444' : '#667',
                        maxWidth: 60, textAlign: 'center',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: isDanger ? 900 : 'normal',
                      }}>
                        {currentP?.name || ''}
                      </span>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: '#aaa', fontWeight: 'bold', letterSpacing: 0.5 }}>📤 {lang === 'en' ? 'LAST MOVEMENT' : 'SON OYNANAN'}</span>
                  <div className="play-arena-slot">
                    {gameState.discard?.length > 0 ? (
                      <div style={{ transform: 'scale(0.85)', cursor: 'pointer' }}
                        onClick={() => { setPreviewCard(gameState.discard[gameState.discard.length - 1]); setPreviewLocked(true); }}>
                        <CardVisual card={gameState.discard[gameState.discard.length - 1]} small lang={lang} />
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, color: '#444' }}>{TRANSLATIONS[lang]?.none || 'YOK'}</span>
                    )}
                  </div>
                </div>
              </div>


              {/* Benim arazilerim (Desktop) */}
              <div data-drop-target="properties" style={{
                padding: 10, borderTop: '1px solid rgba(255,255,255,0.1)', minHeight: 260,
                background: dragOverTarget === 'properties' ? 'linear-gradient(to bottom, rgba(255,215,0,0.1), rgba(0,0,0,0.2))' : 'rgba(255,255,255,0.02)',
                transition: 'background 0.3s ease'
              }}>
                <div style={{ fontSize: 11, color: dragOverTarget === 'properties' ? '#FFD700' : '#666', fontWeight: 'bold', marginBottom: 6, transition: 'color 0.2s' }}>{TRANSLATIONS[lang]?.myProperties || 'BENİM ARAZİLERİM'} ({myCompleteSets}/{gameState?.winSets || 3} {lang === 'en' ? 'sets' : 'set'})</div>
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
                      width: 64,
                      minHeight: 88,
                      background: dragOverTarget === 'bank' ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.03)',
                      border: dragOverTarget === 'bank' ? '2.5px dashed #2ECC71' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: 4,
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: 9, color: '#2ECC71', fontWeight: 'bold' }}>🏦 <BankTicker value={me.bankTotal} /></span>
                    <div style={{ position: 'relative', width: 54, height: 72 }}>
                      {me.bank?.slice(0, 5).map((c, i) => (
                        <div
                          key={c.id}
                          className="mini-card-wrapper"
                          style={{
                            position: 'absolute',
                            top: i * 4,
                            left: i * 2,
                            width: 48,
                            height: 64,
                            zIndex: i
                          }}
                        >
                          <div style={{
                            width: 48,
                            height: 64,
                            borderRadius: 4,
                            background: 'linear-gradient(135deg, #2ECC71, #196F3D)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: 11,
                            color: '#fff',
                          }} className="mini-card-face">
                            {c.value}M
                          </div>
                          <div className="mini-card-hover-view">
                            <CardVisual card={c} small lang={lang} />
                          </div>
                        </div>
                      ))}
                      {(!me.bank || me.bank.length === 0) && (
                        <div style={{ width: 48, height: 64, borderRadius: 4, border: '1.2px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#444' }}>{TRANSLATIONS[lang]?.empty || 'BOŞ'}</div>
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
                          background: isComplete ? 'rgba(255, 215, 0, 0.08)' : 'transparent',
                          borderRadius: 4,
                          padding: 2,
                          border: isComplete ? '1.5px solid #FFD700' : 'none',
                          boxShadow: isComplete ? '0 0 10px rgba(255, 215, 0, 0.4), inset 0 0 6px rgba(255, 215, 0, 0.1)' : 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {/* Yüzen Set Tamamlandı Tacı */}
                        {isComplete && (
                          <div style={{
                            position: 'absolute',
                            top: -12,
                            fontSize: 10,
                            zIndex: 100,
                            animation: 'active-player-pulse 1.5s infinite ease-in-out',
                            textShadow: '0 0 5px #FFD700'
                          }}>👑</div>
                        )}
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
                              <div style={{ width: '100%', height: 8, background: getMiniCardStripeStyle(c, color) }} />
                              <div style={{ fontSize: 8, fontWeight: 900, color: '#333', marginTop: 4, transform: 'scale(0.85)' }}>
                                {c.isWild ? '★' : (c.value || '')}
                              </div>
                            </div>
                            <div className="mini-card-hover-view">
                              <CardVisual card={c} small lang={lang} />
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
                        }} title={lang === 'en' ? 'Current Rent Income and Buildings' : 'Güncel Kira Getirisi ve Binalar'}>
                          <span>💵{calculateRentClient(me, color)}M</span>
                          {isComplete && me.buildings?.[color] && (
                            <>
                              {me.buildings[color].houses > 0 && <span>🏠</span>}
                              {me.buildings[color].hotel && <span>🏨</span>}
                            </>
                          )}
                        </div>
                        
                        {/* Set Yönetimi Butonu (Desktop) */}
                        <div
                          onClick={() => { setModal({ type: 'manageSet', color, cards }); sfxClick(); }}
                          style={{
                            fontSize: 7.5, fontWeight: 900,
                            color: '#FFD700',
                            background: 'rgba(255,215,0,0.12)',
                            border: '1.2px solid rgba(255,215,0,0.4)',
                            borderRadius: 3,
                            padding: '2px 4px',
                            marginTop: 3,
                            cursor: 'pointer',
                            zIndex: 25,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            justifyContent: 'center',
                            width: '100%',
                            boxSizing: 'border-box',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.25)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,215,0,0.12)'; }}
                          title={lang === 'en' ? 'Manage Set / Change Colors' : 'Seti Yönet / Renk Değiştir'}
                        >
                          ⚙️ {lang === 'en' ? 'MANAGE' : 'YÖNET'}
                        </div>
                      </div>
                    );
                  })}
                  {Object.entries(me.properties || {}).every(([_, cards]) => cards.length === 0) && (
                    <span style={{ color: '#555', fontSize: 11 }}>{TRANSLATIONS[lang]?.noPropertiesYet || 'Henüz arazi yok'}</span>
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
                        {entry.cards && Array.isArray(entry.cards) && entry.cards.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                            {entry.cards.map((c, cIdx) => (
                              <div key={cIdx} style={{ transform: 'scale(0.42)', transformOrigin: 'top left', width: 38 * 0.42, height: 52 * 0.42, marginRight: 14, marginBottom: 4 }}>
                                <CardVisual card={c} small lang={lang} />
                              </div>
                            ))}
                          </div>
                        )}
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
        const recommendations = (aiHintsEnabled && showHintsAfterDelay)
          ? getSmartHighlightIds(handToRender, me, gameState, lang)
          : {};

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
                  <button
                    onClick={() => { sfxClick(); setAiHintsEnabled(!aiHintsEnabled); }}
                    style={{
                      background: aiHintsEnabled ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: aiHintsEnabled ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: aiHintsEnabled ? '#FFD700' : '#888',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={lang === 'en' ? 'Toggle AI Hints' : 'Yapay Zeka İpuçlarını Aç/Kapat'}
                  >
                    <span>💡</span>
                    {!isMobile && <span>{lang === 'en' ? 'AI Hint' : 'İpucu'}</span>}
                  </button>

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
                  const rec = recommendations[card.id];
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
                      className={`stacked-card-wrapper ${isSelected ? 'selected-card' : ''} ${rec ? `smart-glow-${rec.type}` : ''}`}
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
                          sfxCardHover(); // Kart sürtünme sesi
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

                      {rec && (
                        <div className="card-ai-hint-tooltip">
                          💡 {rec.reason}
                        </div>
                      )}

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





      {/* Profile Card Modal */}
      {profilePlayer && (
        <Modal title={lang === 'en' ? `👤 ${profilePlayer.name}'s Profile` : `👤 ${profilePlayer.name} Profili`} onClose={() => setProfilePlayer(null)}>
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
              <p style={{ color: '#aaa', fontSize: 11, margin: '4px 0 0 0' }}>
                {lang === 'en' ? 'Player Level: Gold Member' : 'Oyuncu Seviyesi: Altın Üye'}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginTop: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 9, color: '#aaa' }}>{lang === 'en' ? 'TOTAL MATCHES' : 'TOPLAM MAÇ'}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginTop: 4 }}>14</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 9, color: '#aaa' }}>{lang === 'en' ? 'TOTAL WINS' : 'TOPLAM ZAFER'}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#FFD700', marginTop: 4 }}>{profilePlayer.isBot ? 4 : 10}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 9, color: '#aaa' }}>{lang === 'en' ? 'WIN RATE' : 'KAZANMA ORANI'}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#2ECC71', marginTop: 4 }}>71.4%</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 9, color: '#aaa' }}>{lang === 'en' ? 'FAVORITE CARD' : 'EN SEVİLEN KART'}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#3498DB', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lang === 'en' ? 'Rent Card 🔵' : 'Haciz Kartı 🔵'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                socket?.emit('sendEmote', { targetId: profilePlayer.id, emoji: '👋' });
                showToast(lang === 'en' ? `You waved at ${profilePlayer.name}! 👋` : `${profilePlayer.name} oyuncusuna el salladınız! 👋`, 'success');
                sfxClick();
              }}
              style={{ ...btnStyle('linear-gradient(135deg, #3498db, #2980b9)'), width: '100%', padding: '10px', fontSize: 12, borderRadius: 8, marginTop: 8 }}
            >
              {lang === 'en' ? '👋 Send Wave' : '👋 Selam Gönder'}
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
            <CardVisual card={zoomedCard} lang={lang} />
          </div>
          <div style={{ marginTop: 40, color: '#aaa', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>
            {lang === 'en' ? 'Tap anywhere to close' : 'Kapatmak için herhangi bir yere dokunun'}
          </div>
        </div>
      )}

      {/* ── MEGA EMOTE FULL-SCREEN OVERLAY ── */}
      {activeMegaEmote && (() => {
        const emoteConfig = {
          tomato_splat: { particles: ['🍅', '🍅', '🍅', '🍅', '🍅', '🍅', '🍅', '🍅'], bg: 'rgba(183,28,28,0.92)', label: '🍅 DOMATES SALDIRISI!' },
          make_it_rain: { particles: ['💵', '💸', '💴', '💶', '💵', '💸', '💵', '💴'], bg: 'rgba(27,94,32,0.92)', label: '💸 PARA YAĞMURU!' },
          salt_bae: { particles: ['🧂', '✨', '🧂', '✨', '🧂', '🧂', '✨', '🧂'], bg: 'rgba(38,50,56,0.92)', label: '🧂 TUZLAMA ŞOVU!' },
          nuke_boom: { particles: ['☢️', '💥', '🔥', '☢️', '💥', '🔥', '💥', '☢️'], bg: 'rgba(90,40,0,0.95)', label: '☢️ NÜKLEER PATLAMA!' },
        };
        const cfg = emoteConfig[activeMegaEmote.id] || emoteConfig.tomato_splat;
        return (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: cfg.bg,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              animation: 'fw-fade-in 0.3s ease-out',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {/* Particles flying down */}
            {cfg.particles.map((p, i) => (
              <div key={i} className="mega-emote-particle" style={{
                position: 'absolute',
                left: `${(i / cfg.particles.length) * 100 + Math.random() * 10}%`,
                top: '-60px',
                fontSize: `${36 + Math.random() * 24}px`,
                animation: `mega-particle-fall ${1.2 + i * 0.18}s ease-in ${i * 0.12}s both`,
                pointerEvents: 'none',
              }}>
                {p}
              </div>
            ))}
            <div style={{ fontSize: 80, marginBottom: 20, animation: 'bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}>
              {cfg.particles[0]}
            </div>
            <div style={{
              fontSize: 28, fontWeight: 900, color: '#fff',
              textShadow: '0 0 20px rgba(255,255,255,0.8), 0 4px 20px rgba(0,0,0,0.8)',
              letterSpacing: 2, animation: 'bounce-in 0.6s 0.2s both',
              textAlign: 'center', padding: '0 20px'
            }}>
              {cfg.label}
            </div>
            <div style={{
              fontSize: 15, color: 'rgba(255,255,255,0.7)',
              marginTop: 12, fontStyle: 'italic', animation: 'bounce-in 0.6s 0.4s both'
            }}>
              {lang === 'en' ? `by ${activeMegaEmote.senderName}` : `${activeMegaEmote.senderName} attı!`}
            </div>
          </div>
        );
      })()}

      {/* ── FLOATING CHAT PANEL ── */}
      {(() => {
        const myMegaEmote = me?.selectedMegaEmote || dbUser?.selectedMegaEmote || 'default';
        const megaEmojiMap = { tomato_splat:'🍅', make_it_rain:'💸', salt_bae:'🧂', nuke_boom:'☢️' };
        const megaLabelMap = {
          tomato_splat:{tr:'DOMATES!',en:'TOMATO!'}, make_it_rain:{tr:'PARA SAÇMA!',en:'MAKE IT RAIN!'},
          salt_bae:{tr:'TUZLAMA!',en:'SALT BAE!'}, nuke_boom:{tr:'NÜKLEER!',en:'NUKE!'}
        };
        return (
          <>
            {/* FAB */}
            <button
              onClick={() => { setIsChatOpen(p => !p); sfxClick(); }}
              style={{
                position:'fixed', bottom: isMobile ? 100 : 28, right: isMobile ? 14 : 24,
                zIndex:3000, width:52, height:52, borderRadius:'50%',
                background:'linear-gradient(135deg,#1e3a5f,#0d1b2a)',
                border:'2px solid rgba(99,179,237,0.6)',
                boxShadow:'0 4px 20px rgba(0,0,0,0.5),0 0 12px rgba(99,179,237,0.3)',
                color:'#fff', fontSize:22, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}
              title={lang==='en'?'Open Chat':'Sohbeti Aç'}
            >
              💬
            </button>

            {/* Panel */}
            {isChatOpen && (
              <div style={{
                position:'fixed', bottom: isMobile ? 160 : 88, right: isMobile ? 8 : 24,
                width: isMobile ? 'calc(100vw - 16px)' : 300,
                maxHeight: isMobile ? '55vh' : 420,
                zIndex:2999, background:'rgba(8,12,24,0.97)',
                border:'1px solid rgba(99,179,237,0.25)', borderRadius:16,
                display:'flex', flexDirection:'column',
                boxShadow:'0 20px 60px rgba(0,0,0,0.6)',
                animation:'fw-fade-in 0.2s ease-out', overflow:'hidden',
              }}>
                {/* Header */}
                <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'rgba(99,179,237,0.06)', flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#93c5fd', letterSpacing:1 }}>
                    💬 {lang==='en'?'CHAT':'SOHBET'}
                  </span>
                  <button onClick={()=>{ setIsChatOpen(false); sfxClick(); }}
                    style={{ background:'none', border:'none', color:'#666', cursor:'pointer', fontSize:14 }}>✕</button>
                </div>

                {/* Mega Emote Fire Button */}
                {myMegaEmote !== 'default' && (
                  <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
                    <button onClick={() => { socket?.emit('sendChatMessage',{text:`[MEGA_EMOTE:${myMegaEmote}]`}); sfxChaChing(); }}
                      style={{
                        width:'100%',
                        background:'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(234,88,12,0.2))',
                        border:'1.5px solid rgba(239,68,68,0.6)', color:'#fca5a5',
                        fontSize:11, fontWeight:900, letterSpacing:1,
                        padding:'7px 10px', borderRadius:8, cursor:'pointer',
                        animation:'active-player-pulse 2s ease-in-out infinite',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6
                      }}>
                      {megaEmojiMap[myMegaEmote]||'📣'}&nbsp;
                      {lang==='en'?`MEGA: ${megaLabelMap[myMegaEmote]?.en||myMegaEmote.toUpperCase()}`:`MEGA: ${megaLabelMap[myMegaEmote]?.tr||myMegaEmote.toUpperCase()}`}
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div style={{ flex:1, overflowY:'auto', padding:'10px', display:'flex', flexDirection:'column', gap:6 }}>
                  {chatMessages.length===0 && (
                    <div style={{ textAlign:'center', color:'#4b5563', fontSize:11, marginTop:20 }}>
                      {lang==='en'?'No messages yet…':'Henüz mesaj yok…'}
                    </div>
                  )}
                  {chatMessages.map((msg,i)=>{
                    const isMine = msg.senderId===playerId;
                    const senderPlayer = gameState?.players?.find(p=>p.id===msg.senderId);
                    const senderSkin = senderPlayer?.selectedChatSkin || 'default';
                    const skinClass = senderSkin!=='default' ? `chat-skin-${senderSkin}` : '';
                    return (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems: isMine?'flex-end':'flex-start' }}>
                        {!isMine && <div style={{ fontSize:9, color:'#64748b', marginBottom:2, marginLeft:4 }}>{msg.senderName}</div>}
                        <div className={skinClass} style={{
                          maxWidth:'82%', padding:'6px 10px',
                          borderRadius: isMine?'12px 12px 4px 12px':'12px 12px 12px 4px',
                          background: isMine?'rgba(37,99,235,0.35)':'rgba(30,30,50,0.9)',
                          border:`1px solid ${isMine?'rgba(37,99,235,0.4)':'rgba(255,255,255,0.07)'}`,
                          fontSize:12, color:'#e2e8f0', wordBreak:'break-word', lineHeight:1.4,
                        }}>{msg.text}</div>
                        <div style={{ fontSize:8, color:'#374151', marginTop:2 }}>
                          {msg.time?new Date(msg.time).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):''}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef}/>
                </div>

                {/* Hızlı Mesajlar (Quick Messages) */}
                <div style={{
                  display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  scrollbarWidth: 'none',
                  flexShrink: 0
                }} className="no-scrollbar">
                  {(lang === 'en'
                    ? ['Good luck! 🎲', 'Nice move! 👏', 'Watch out for rent! 💸', 'Bank is empty! 🏦', 'Oh no! 😢', 'Wanna trade? 🤝', 'I have Just Say No! 🛡️']
                    : ['Bol şans! 🎲', 'Güzel hamle! 👏', 'Kiralara dikkat! 💸', 'Banka boşaldı! 🏦', 'Yapma be! 😢', 'Takas yapalım mı? 🤝', 'Reddet var! 🛡️']
                  ).map((qMsg, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        socket?.emit('sendChatMessage', { text: qMsg });
                        sfxChatSent();
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 20,
                        color: '#fff',
                        fontSize: 10,
                        padding: '4px 10px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    >
                      {qMsg}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={handleSendChat} style={{
                  display: 'flex', gap: 6, padding: '8px 10px',
                  borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', flexShrink: 0
                }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder={lang === 'en' ? 'Type a message…' : 'Mesaj yaz…'}
                    maxLength={120}
                    onFocus={() => {
                      if (isMobile) {
                        // iOS/Android fixed container view alignment fixes
                        setTimeout(() => {
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          document.body.scrollTop = 0;
                        }, 80);
                      }
                    }}
                    onBlur={() => {
                      if (isMobile) {
                        setTimeout(() => {
                          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          document.body.scrollTop = 0;
                        }, 80);
                      }
                    }}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                      color: '#e2e8f0', fontSize: 12, padding: '7px 10px', outline: 'none',
                    }}
                  />
                  <button type="submit" disabled={!chatInput.trim()} style={{
                    background: chatInput.trim() ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: 8,
                    color: chatInput.trim() ? '#fff' : '#4b5563',
                    fontSize: 16, width: 36, cursor: chatInput.trim() ? 'pointer' : 'default', flexShrink: 0,
                  }}>↑</button>
                </form>
              </div>
            )}
          </>
        );
      })()}

    </div>
  </ThemeContext.Provider>
);
}

const getSmartHighlightIds = (hand, me, gameState, lang) => {
  if (!me || !hand || !gameState) return {};
  const players = gameState.players;
  if (!players) return {};
  const recs = {};
  const myProperties = me.properties || {};

  hand.forEach(card => {
    // 1. Property completing a set (GOLD)
    if (card.type === 'property' && card.colors) {
      card.colors.forEach(col => {
        const count = myProperties[col]?.length || 0;
        const size = SET_SIZES[col] || 999;
        if (count + 1 === size) {
          recs[card.id] = {
            type: 'gold',
            reason: lang === 'en' 
              ? `Completes your set of ${col.toUpperCase()}!` 
              : `${COLOR_INFO[col]?.name || col} setini tamamlar!`
          };
        }
      });
    }
    // 2. Rent card matching our properties (RED)
    if (card.action === 'rent') {
      if (card.colors === 'all') {
        const hasProps = Object.values(myProperties).some(arr => arr.length > 0);
        if (hasProps) {
          recs[card.id] = {
            type: 'red',
            reason: lang === 'en' ? 'Collect rent on your best set!' : 'En yüksek mülk grubundan kira topla!'
          };
        }
      } else if (Array.isArray(card.colors)) {
        const hasMatch = card.colors.some(col => myProperties[col]?.length > 0);
        if (hasMatch) {
          recs[card.id] = {
            type: 'red',
            reason: lang === 'en' ? 'Collect rent on matching property!' : 'Uyumlu renkteki mülk grubundan kira iste!'
          };
        }
      }
    }
    // 3. Deal Breaker and opponents have complete sets (GOLD)
    if (card.action === 'dealbreaker') {
      const oppWithCompleteSet = players.find(opp => {
        if (opp.id === me.id) return false;
        return Object.entries(opp.properties || {}).some(([col, cards]) => isSetComplete(cards, col));
      });
      if (oppWithCompleteSet) {
        recs[card.id] = {
          type: 'gold',
          reason: lang === 'en' 
            ? `Steal a full set from ${oppWithCompleteSet.name}!` 
            : `${oppWithCompleteSet.name} oyuncusunun tam setini çal!`
        };
      }
    }
    // 4. Buildings (House/Hotel) on complete sets (GOLD)
    if (card.action === 'house' || card.action === 'hotel') {
      const validSet = Object.entries(myProperties).find(([col, cards]) => {
        if (col === 'railroad' || col === 'utility') return false;
        const isComp = isSetComplete(cards, col);
        if (!isComp) return false;
        const b = me.buildings?.[col] || { houses: 0, hotel: false };
        if (card.action === 'house' && b.houses === 0) return true;
        if (card.action === 'hotel' && b.houses >= 1 && !b.hotel) return true;
        return false;
      });
      if (validSet) {
        recs[card.id] = {
          type: 'gold',
          reason: lang === 'en' 
            ? `Build a ${card.action} on your ${validSet[0].toUpperCase()} set!` 
            : `${COLOR_INFO[validSet[0]]?.name || validSet[0]} setine ${card.action === 'house' ? 'Ev' : 'Otel'} kur!`
        };
      }
    }
    // 5. Card drawing / pass go (BLUE - Utility/Speed)
    if (card.action === 'passgo') {
      recs[card.id] = {
        type: 'blue',
        reason: lang === 'en' ? 'Draw 2 extra cards to gain advantage!' : 'Avantaj kazanmak için 2 ekstra kart çek!'
      };
    }
    // 6. Just say no defense (BLUE - Defense saving)
    if (card.action === 'justsayno' && gameState?.myPendingChallenge) {
      recs[card.id] = {
        type: 'blue',
        reason: lang === 'en' ? 'Play to block the opponent\'s attack!' : 'Rakibin hamlesini engellemek için fırlat!'
      };
    }
  });

  return recs;
};
