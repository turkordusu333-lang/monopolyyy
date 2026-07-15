import React from 'react';
import { Card, GamePlayer, MatchState, CardColor, UserProfile, GameLog } from '../types';
import { generateDeck, shuffleDeck, checkWinner, COLOR_LABELS, COLOR_HEX, MAX_IN_SET, RENT_VALUES } from '../lib/deck';
import { BotEngine } from '../lib/BotEngine';
import { sounds } from '../lib/SoundSystem';
import { GameCard, TURKISH_NAMES } from './GameCard';
import { motion, AnimatePresence } from 'motion/react';
import { AvatarWithFrame } from './AvatarWithFrame';
import { t } from '../lib/TranslationSystem';

interface Props {
  roomId: string;
  isOffline: boolean;
  profile: UserProfile;
  onLeaveRoom: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
  adminSettings?: any;
}

const translateCardNameInStr = (name: string, profile: UserProfile): string => {
  if (!name) return '';
  if (profile.settings.language !== 'en') return name;
  const cleanName = name.toLowerCase().replace(/'/g, '').replace(/ /g, '_');
  const key = `card_${cleanName}_name`;
  const val = t(key, profile);
  if (val !== key) return val;

  const cleanNameForProp = cleanName
    .replace(/_avenue/g, '_ave')
    .replace(/_place/g, '_pl')
    .replace(/_gardens/g, '_gardens');
  const propKey = `prop_${cleanNameForProp}`;
  const propVal = t(propKey, profile);
  if (propVal !== propKey) return propVal;

  return name;
};

const translateColorLabelInStr = (colorLabel: string, profile: UserProfile): string => {
  if (!colorLabel) return '';
  if (profile.settings.language !== 'en') return colorLabel;
  for (const col in COLOR_LABELS) {
    if (COLOR_LABELS[col as CardColor] === colorLabel) {
      let cleanCol = col === 'lightblue' ? 'sky_blue' : col;
      if (cleanCol === 'railroad') cleanCol = 'station';
      if (cleanCol === 'darkblue') cleanCol = 'blue';
      const key = `color_${cleanCol}`;
      const val = t(key, profile);
      if (val !== key) return val;
    }
  }
  return colorLabel;
};

const translateRecoveryMessage = (msg: string, profile: UserProfile): string => {
  if (profile.settings.language !== 'en') return msg;
  switch (msg) {
    case 'Atık destesi boş olduğu için kart karıştırılamadı!':
      return 'Could not reshuffle because the discard pile is empty!';
    case 'Kart başarıyla kasanıza eklendi.':
      return 'Card successfully deposited to bank vault.';
    case 'Kart başarıyla arsa setinize eklendi.':
      return 'Card successfully added to property set.';
    case 'Mülk rengi başarıyla değiştirildi.':
      return 'Property color changed successfully.';
    case 'Ev başarıyla kuruldu.':
      return 'House built successfully.';
    case 'Otel başarıyla kuruldu.':
      return 'Hotel built successfully.';
    case 'Yetersiz hamle hakkı! Turunuzda en fazla 3 hamle yapabilirsiniz.':
      return 'No moves remaining! You can only play up to 3 cards per turn.';
    default:
      return msg;
  }
};

const translateLogMessage = (msg: string, profile: UserProfile): string => {
  if (profile.settings.language !== 'en') return msg;
  let out = msg;

  // New room and connection logs
  out = out.replace(/^([^ ]+) odaya eklendi\.$/, '$1 joined the room.');
  out = out.replace(/^([^ ]+) (odadan|lobiden) ayrıldı\.$/, '$1 left the room.');
  out = out.replace(/^([^ ]+) odadan atıldı\.$/, '$1 was kicked from the room.');
  out = out.replace(/^([^ ]+) bağlantısını kaybetti. Yapay zeka devralıyor\.$/, '$1 disconnected. AI is taking over.');

  // Game mode settings translation
  if (out.includes('Oda ayarları güncellendi:')) {
    out = out.replace(/Klasik Mod 🎲/g, 'Classic Mode 🎲');
    out = out.replace(/Kaos Modu 🌀/g, 'Chaos Mode 🌀');
    out = out.replace(/Hedef: (\d+) Set/g, 'Target: $1 Sets');
    out = out.replace(/Tur Süresi: Sınırsız/g, 'Turn Limit: Unlimited');
    out = out.replace(/Tur Süresi: (\d+)/g, 'Turn Limit: $1s');
    out = out.replace(/Otomatik Tur Sonu: Açık/g, 'Auto End Turn: ON');
    out = out.replace(/Otomatik Tur Sonu: Kapalı/g, 'Auto End Turn: OFF');
    out = out.replace(/^Oda ayarları güncellendi: (.*)$/, 'Room settings updated: $1');
  }

  // Draw and turn timeout logs
  out = out.replace(/^([^ ]+) desteden (\d+) kart çekti\.$/, '$1 drew $2 cards from the deck.');
  out = out.replace(/^⏱️ ([^ ]+) süre aşımı nedeniyle sırasını kaybetti! Sıra devrediliyor\.$/, '⏱️ $1 timed out! Turn passed.');
  out = out.replace(/^⏱️ ([^ ]+) yanıt süresini aştı! Sistem otomatik karar alıyor\.$/, '⏱️ $1 timed out! System made an auto-decision.');
  out = out.replace(/^⏱️ Bazı oyuncular yanıt süresini aştı! Sistem otomatik ödeme yaptı\.$/, '⏱️ Some players timed out! Auto-payment resolved.');
  out = out.replace(/^Deste bitti, kartlar yeniden karıştırıldı\.$/, 'Deck exhausted, cards reshuffled.');
  out = out.replace(/^⚠️ Atık kart bulunamadı! Acil durum yedek destesi üretildi\.$/, '⚠️ No discard pile found! Emergency deck generated.');

  // Play and placement logs
  out = out.replace(/^([^,]+), bankaya (\d+)M para ekledi\.$/, '$1 deposited $2M cash in the bank.');
  out = out.replace(/^([^ ]+) bankaya (\d+)M para ekledi\.$/, '$1 deposited $2M cash in the bank.');
  out = out.replace(/^([^ ]+), bankaya (\d+)M para \((.+?)\) ekledi\.$/, (m, p1, val, cardName) => {
    return `${p1} deposited ${val}M cash (${translateCardNameInStr(cardName, profile)}) in the bank.`;
  });
  out = out.replace(/^([^,]+), (.*) grubuna (Ev|Otel) dikti\.$/, (m, name, group, bld) => {
    const enBld = bld === 'Ev' ? 'House' : 'Hotel';
    return `${name} built a ${enBld} on the ${translateColorLabelInStr(group, profile)} set.`;
  });
  out = out.replace(/^([^,]+), (.*) grubuna mülk yerleştirdi\.$/, (m, name, group) => {
    return `${name} placed a property on the ${translateColorLabelInStr(group, profile)} set.`;
  });
  out = out.replace(/^(.+?), (.+?) grubuna (.+?) yerleştirdi\.$/, (m, p1, colGroup, cardName) => {
    const tc = translateCardNameInStr(cardName, profile);
    const tcol = translateColorLabelInStr(colGroup, profile);
    return `${p1} placed "${tc}" on the ${tcol} set.`;
  });
  out = out.replace(/^([^,]+) elinden fazla olan (.*) kartını attı\.$/, (m, name, cardName) => {
    return `${name} discarded excess card: ${translateCardNameInStr(cardName, profile)}.`;
  });
  out = out.replace(/^([^,]+) elinden (.*) kartını attı\.$/, (m, name, cardName) => {
    return `${name} discarded ${translateCardNameInStr(cardName, profile)}.`;
  });
  out = out.replace(/^([^ ]+) elinden (.+?) kartını attı\.$/, (m, p1, cardName) => {
    return `${p1} discarded "${translateCardNameInStr(cardName, profile)}".`;
  });

  // Action cards general logs
  out = out.replace(/^([^,]+) aksiyon kartı oynadı: (.*)$/, (m, name, cardName) => {
    return `${name} played action card: ${translateCardNameInStr(cardName, profile)}`;
  });
  out = out.replace(/^(.+?) aksiyon kartı oynadı: (.+)$/, (m, p1, cardName) => {
    return `${p1} played action card: ${translateCardNameInStr(cardName, profile)}`;
  });
  out = out.replace(/^([^ ]+) aksiyon kartı oynadı: (.*)$/, (m, name, cardName) => {
    return `${name} played action card: ${translateCardNameInStr(cardName, profile)}`;
  });

  // Specific action card request / execution logs
  out = out.replace(/^([^,]+) Başlangıç Noktasından Geçti ve 2 kart çekti!$/, '$1 passed GO and drew 2 cards!');
  out = out.replace(/^([^ ]+) Başlangıç Noktasından Geçti ve 2 kart çekti!$/, '$1 passed GO and drew 2 cards!');
  out = out.replace(/^📣 ([^,]+) doğum günü kartı oynadı ve herkesten 2M talep ediyor!$/, "📣 $1 played It's My Birthday card and demands 2M from everyone!");
  out = out.replace(/^([^ ]+) Bugün Benim Doğum Günüm kartını oynadı! Herkesten 2M talep ediyor\.$/, "$1 played It's My Birthday card! Demands 2M from everyone.");

  // Sly Deal logs
  out = out.replace(/^📣 (.+?), (.+?) adlı oyuncunun mülkünü Sinsi Anlaşma ile çalmak istiyor!$/, '📣 $1 wants to steal a property from $2 using Sly Deal!');
  out = out.replace(/^([^,]+), senden (.*) mülkünü sinsi anlaşma ile çaldı!$/, (m, name, propName) => {
    return `${name} stole ${translateCardNameInStr(propName, profile)} from you using Sly Deal!`;
  });
  out = out.replace(/^([^ ]+), ([^ ]+)'den (.+?) mülkünü sinsi anlaşma ile çaldı!$/, (m, p1, p2, cardName) => {
    return `${p1} stole "${translateCardNameInStr(cardName, profile)}" from ${p2} using Sly Deal!`;
  });
  out = out.replace(/^([^ ]+), ([^ ]+)'den (.+?) mülkünü sinsi anlaşma ile aldı!$/, (m, p1, p2, cardName) => {
    return `${p1} stole "${translateCardNameInStr(cardName, profile)}" from ${p2} using Sly Deal!`;
  });

  // Deal Breaker logs
  out = out.replace(/^📣 (.+?), (.+?) adlı oyuncunun tamamlanmış (.+?) setini çalan bir Anlaşma Bozan kartı oynadı!$/, (m, p1, p2, colGroup) => {
    return `📣 ${p1} played a Deal Breaker to steal the completed ${translateColorLabelInStr(colGroup, profile)} set of ${p2}!`;
  });
  out = out.replace(/^([^,]+), tamamlanmış (.*) setini Anlaşma Bozan kartı ile çaldı!$/, (m, name, group) => {
    return `${name} stole your completed ${translateColorLabelInStr(group, profile)} set using Deal Breaker!`;
  });
  out = out.replace(/^([^ ]+), ([^ ]+) adlı oyuncunun tamamlanmış (.+?) setini çaldı!$/, (m, p1, p2, colGroup) => {
    return `${p1} stole the completed ${translateColorLabelInStr(colGroup, profile)} set of ${p2}!`;
  });

  // Forced Deal logs
  out = out.replace(/^📣 (.+?), (.+?) ile (.+?) mülkü karşılığında (.+?) mülkünü Zoraki Takas ile değiştirmek istiyor!$/, (m, p1, p2, c1, c2) => {
    const tc1 = translateCardNameInStr(c1, profile);
    const tc2 = translateCardNameInStr(c2, profile);
    return `📣 ${p1} wants to swap property "${tc1}" with ${p2}'s "${tc2}" via Forced Deal!`;
  });
  out = out.replace(/^([^,]+), ([^ ]+) ile Zoraki Takas yaptı! (.*) verdi ve (.*) aldı\.$/, (m, p1, p2, give, take) => {
    return `${p1} made a Forced Deal with ${p2}! Gave ${translateCardNameInStr(give, profile)} and took ${translateCardNameInStr(take, profile)}.`;
  });
  out = out.replace(/^([^,]+), seninle Zoraki Takas yaptı! (.*) verdi ve (.*) aldı\.$/, (m, name, give, take) => {
    return `${name} made a Forced Deal with you! Gave ${translateCardNameInStr(give, profile)} and took ${translateCardNameInStr(take, profile)}.`;
  });
  out = out.replace(/^([^ ]+) Zoraki Takas ile "(.*)" mülkünü aldı, karşılığında "(.*)" mülkünü verdi\.$/, (m, name, take, give) => {
    return `${name} took "${translateCardNameInStr(take, profile)}" in Forced Deal, and gave "${translateCardNameInStr(give, profile)}" in return.`;
  });
  out = out.replace(/^([^ ]+), ([^ ]+) ile (.+?) karşılığında (.+?) mülkünü takas etti!$/, (m, p1, p2, card1, card2) => {
    return `${p1} swapped "${translateCardNameInStr(card2, profile)}" with ${p2} for "${translateCardNameInStr(card1, profile)}"!`;
  });
  out = out.replace(/^([^ ]+), ([^ ]+) ile (.+?) karşılığında (.+?) kartını takas etti!$/, (m, p1, p2, card1, card2) => {
    return `${p1} swapped "${translateCardNameInStr(card2, profile)}" with ${p2} for "${translateCardNameInStr(card1, profile)}"!`;
  });

  // Debt Collector logs
  out = out.replace(/^📣 ([^,]+) (Borç Tahsildarı|Sinsi Anlaşma|Anlaşma Bozan|Zoraki Takas) kartı oynadı! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!$/, (m, name, cardName) => {
    return `📣 ${name} played ${translateCardNameInStr(cardName, profile)}! You can play 'Just Say No' to defend!`;
  });
  out = out.replace(/^📣 ([^,]+) (Borç Tahsildarı|Sinsi Anlaşma|Anlaşma Bozan|Zoraki Takas) oynadı! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!$/, (m, name, cardName) => {
    return `📣 ${name} played ${translateCardNameInStr(cardName, profile)}! You can play 'Just Say No' to defend!`;
  });
  out = out.replace(/^📣 ([^,]+) (Borç Tahsildarı|Sinsi Anlaşma|Anlaşma Bozan|Zoraki Takas) Engeli!$/, (m, name, cardName) => {
    return `📣 ${name} ${translateCardNameInStr(cardName, profile)} Blocked!`;
  });
  out = out.replace(/^📣 ([^,]+) (Borç Tahsildarı|Sinsi Anlaşma|Anlaşma Bozan|Zoraki Takas) Oynandı!$/, (m, name, cardName) => {
    return `📣 ${name} ${translateCardNameInStr(cardName, profile)} Played!`;
  });
  out = out.replace(/^📣 ([^,]+) Borç Tahsildarı kartı oynadı ve senden 5M talep ediyor!$/, "📣 $1 played Debt Collector and demands 5M from you!");
  out = out.replace(/^([^ ]+), ([^ ]+) adlı oyuncudan (\d+)M borç tahsilatı talep ediyor!$/, '$1 demands $3M debt collection from $2!');

  // Rent logs
  out = out.replace(/^([^,]+) Kirayı İkiye Katla kartını oynadı!$/, '$1 played Double Rent card!');
  out = out.replace(/^📣 ([^,]+), (.*) mülkleri için senden (\d+)M kira talep ediyor!$/, (m, name, group, amt) => {
    return `📣 ${name} demands ${amt}M rent from you on the ${translateColorLabelInStr(group, profile)} properties!`;
  });
  out = out.replace(/^([^ ]+), ([^ ]+) mülkleri için ([^ ]+) oyuncusundan (\d+)M kira talep etti!$/, (m, p1, colGroup, p2, rentVal) => {
    return `${p1} demanded ${rentVal}M rent from ${p2} on the ${translateColorLabelInStr(colGroup, profile)} properties!`;
  });
  out = out.replace(/^([^ ]+), ([^ ]+) mülkleri için herkesten (\d+)M kira talep etti!$/, (m, p1, colGroup, rentVal) => {
    return `${p1} demanded ${rentVal}M rent from everyone on the ${translateColorLabelInStr(colGroup, profile)} properties!`;
  });
  out = out.replace(/^([^ ]+) mülkü olmadığı için kira tahsil edemedi\.$/, "$1 couldn't collect rent because they have no properties in that color.");

  // Payment and Winner logs
  out = out.replace(/^([^,]+), (.*) adlı oyuncuya (.*)M değerinde ödeme transferi yaptı\.$/, '$1 paid $3M to $2.');
  out = out.replace(/^([^ ]+), ([^ ]+) oyuncusuna (\d+)M ödeme yaptı\.$/, '$1 paid $3M to $2.');
  out = out.replace(/^([^,]+), ([^ ]+) adlı oyuncuya (\d+)M değerinde ödeme transferi yaptı\.$/, '$1 paid $3M to $2.');
  out = out.replace(/^Tebrikler! Maçı ([^ ]+) kazandı!$/, 'Congratulations! $1 won the match!');

  // JSN defense logs
  out = out.replace(/^([^,]+), 'Hayır Deme Hakkı' kullanarak ([^']+)'in hamlesine karşı koydu!$/, "$1 played Just Say No to counter $2's action!");
  out = out.replace(/^([^ ]+), 'Hayır Teşekkürler' diyerek ([^']+)'in hamlesine karşı koydu!$/, "$1 played Just Say No to counter $2's action!");
  out = out.replace(/^([^ ]+), 'Hayır Teşekkürler' diyerek ([^']+)'in hamlesini engelledi!$/, "$1 blocked $2's action with Just Say No!");
  out = out.replace(/^🛡️ ([^ ]+) 'Hayır Deme Hakkı' \(Reddet\) kartını kullanarak senin (.*) hamleni engelledi!$/, (m, defender, action) => {
    return `🛡️ ${defender} played Just Say No and countered your ${translateCardNameInStr(action, profile)} action!`;
  });
  out = out.replace(/^🛡️ ([^ ]+) 'Hayır Teşekkürler' diyerek senin 'Hayır' savunmanı iptal etti! \(Reddete Redet!\)$/, "🛡️ $1 counter-countered with Just Say No!");
  out = out.replace(/^🎯 Savunma iptal edildi! Hamle başarıyla uygulandı\.$/, '🎯 Counter canceled! Action resolved successfully.');
  out = out.replace(/^🛡️ Savunma başarılı oldu! ([^']+)'in hamlesi engellendi\.$/, "🛡️ Defense successful! $1's action was blocked.");
  out = out.replace(/^🛡️ Savunma başarılı oldu! Hamle engellendi\.$/, '🛡️ Defense successful! Action blocked.');

  // Target and general logs
  out = out.replace(/^🎯 ([^,]+), (.*) adlı oyuncudan (.*) mülkünü çaldı!$/, (m, stealer, target, prop) => {
    return `🎯 ${stealer} stole ${translateCardNameInStr(prop, profile)} from ${target}!`;
  });
  out = out.replace(/^🎯 ([^,]+), (.*) adlı oyuncunun tamamlanmış (.*) setini çaldı!$/, (m, stealer, target, group) => {
    return `🎯 ${stealer} stole the completed ${translateColorLabelInStr(group, profile)} set of ${target}!`;
  });
  out = out.replace(/^🎯 ([^,]+), (.*) ile (.*) karşılığında (.*) mülkünü takas etti!$/, (m, stealer, target, give, take) => {
    return `🎯 ${stealer} swapped ${translateCardNameInStr(take, profile)} with ${target} for ${translateCardNameInStr(give, profile)}!`;
  });
  out = out.replace(/^([^,]+), (.*) adlı oyuncunun tamamlanmış (.*) setini Anlaşma Bozan kartı ile çaldı!$/, (m, stealer, target, group) => {
    return `${stealer} stole the completed ${translateColorLabelInStr(group, profile)} set of ${target} using Deal Breaker!`;
  });

  // Excess buildings logs
  out = out.replace(/^Sayı yetersizliğinden dolayı ([^ ]+) adlı oyuncunun (.*) setindeki Otel yıkıldı ve ıskartaya gitti\.$/, (m, name, group) => {
    return `Due to insufficient count, ${name}'s Hotel on the ${translateColorLabelInStr(group, profile)} set was destroyed and discarded.`;
  });
  out = out.replace(/^Sayı yetersizliğinden dolayı ([^ ]+) adlı oyuncunun (.*) setindeki Ev yıkıldı ve ıskartaya gitti\.$/, (m, name, group) => {
    return `Due to insufficient count, ${name}'s House on the ${translateColorLabelInStr(group, profile)} set was destroyed and discarded.`;
  });

  // Bankruptcy and Turn limits
  out = out.replace(/^💥 ([^ ]+) adlı oyuncu iflas etti! Tüm varlıkları ([^ ]+) adlı oyuncuya devredildi\.$/, '💥 $1 went bankrupt! All assets transferred to $2.');
  out = out.replace(/^Sıra ([^ ]+) adlı yapay zekaya geçti\.$/, 'Turn passed to bot: $1.');
  out = out.replace(/^Sıra ([^ ]+) adlı oyuncuda\.$/, 'Turn passed to player: $1.');
  out = out.replace(/^Sıra ([^ ]+) adlı oyuncuda\. \(Önceki oyuncu 3 hamlesini tamamladı\)$/, 'Turn passed to player: $1. (Previous player used 3 moves)');
  out = out.replace(/^([^,]+), (.*) kartının rengini (.*) olarak değiştirdi\.$/, (m, name, cardName, color) => {
    return `${name} changed color of ${translateCardNameInStr(cardName, profile)} to ${translateColorLabelInStr(color, profile)}.`;
  });

  // Emojis and other chat messages
  out = out.replace(/^Rakibe "(.*)" ifadesini gönderdi!$/, 'Sent emoji "$1" to opponent!');
  out = out.replace(/^Sakin ol şampiyon, sadece bir oyun!$/, "Easy champion, it's just a game!");
  out = out.replace(/^Hahaha, çok eğlenceli!$/, 'Hahaha, so fun!');
  out = out.replace(/^Ağlama bebeğim, şansın dönecektir!$/, "Don't cry baby, your luck will turn!");
  out = out.replace(/^Güzel bir anlaşmaya her zaman varım!$/, 'Always open to a good deal!');
  out = out.replace(/^Buralarda paranın sözü geçmez!$/, "Money doesn't talk around here!");
  out = out.replace(/^Masa yanıyor! 🔥$/, 'The board is on fire! 🔥');

  if (out === 'Oyuncu bağlantısı koptu, yapay zeka devraldı.') {
    return 'Player disconnected, AI took over.';
  }
  return out;
};

const getTranslatedCardName = (card: any, profile: UserProfile): string => {
  if (!card) return '';
  if (card.type === 'money') {
    return `${card.value}M`;
  }
  const cleanName = card.name.toLowerCase().replace(/'/g, '').replace(/ /g, '_');
  const key = `card_${cleanName}_name`;
  const val = t(key, profile);
  if (val !== key) return val;

  const cleanNameForProp = cleanName
    .replace(/_avenue/g, '_ave')
    .replace(/_place/g, '_pl')
    .replace(/_gardens/g, '_gardens');
  const propKey = `prop_${cleanNameForProp}`;
  const propVal = t(propKey, profile);
  if (propVal !== propKey) return propVal;

  return TURKISH_NAMES[card.name] || card.name;
};

const COLOR_KEYWORDS: Record<string, { tr: string[]; en: string[]; hex: string }> = {
  brown: { tr: ['kahverengi', 'kahve', 'kahve seti', 'kahverengi seti'], en: ['brown'], hex: '#A16207' },
  sky_blue: { tr: ['açık mavi', 'gökyüzü mavisi', 'açik mavi', 'acik mavi'], en: ['lightblue', 'light blue', 'sky blue'], hex: '#0EA5E9' },
  pink: { tr: ['pembe'], en: ['pink'], hex: '#EC4899' },
  orange: { tr: ['turuncu'], en: ['orange'], hex: '#F97316' },
  red: { tr: ['kırmızı', 'kirmizi'], en: ['red'], hex: '#EF4444' },
  yellow: { tr: ['sarı', 'sari'], en: ['yellow'], hex: '#EAB308' },
  green: { tr: ['yeşil', 'yesil'], en: ['green'], hex: '#22C55E' },
  blue: { tr: ['koyu mavi', 'mavi'], en: ['darkblue', 'dark blue', 'blue'], hex: '#2563EB' },
  station: { tr: ['demiryolu', 'istasyon'], en: ['railroad', 'station'], hex: '#6B7280' },
  utility: { tr: ['kamu kuruluşu', 'kamu hizmeti', 'kamu kuruluşu seti', 'kamu kurulusu'], en: ['utility', 'utilities'], hex: '#0D9488' },
};

const renderColorizedText = (text: string, language: string = 'tr'): React.ReactNode => {
  if (!text) return '';

  const termMap = new Map<string, string>();
  for (const key in COLOR_KEYWORDS) {
    const item = COLOR_KEYWORDS[key];
    const terms = language === 'en' ? item.en : item.tr;
    terms.forEach(t => {
      const lower = t.toLowerCase();
      termMap.set(lower, item.hex);
      termMap.set(t.toUpperCase(), item.hex);
      termMap.set(lower.replace(/i/g, 'İ').toUpperCase(), item.hex);
      termMap.set(lower.replace(/ı/g, 'I').toUpperCase(), item.hex);
      termMap.set(t.replace(/i/g, 'ı').toLowerCase(), item.hex);
    });
  }

  const searchTerms = Array.from(termMap.keys()).sort((a, b) => b.length - a.length);

  const escapedTerms = searchTerms.map(s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, idx) => {
        const lowerPart = part.toLowerCase();
        const hex = termMap.get(part) || termMap.get(lowerPart) || termMap.get(part.toUpperCase());
        if (hex) {
          return (
            <span key={idx} className="font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[7px]" style={{ color: hex }}>
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
};

const getTranslatedCardDesc = (card: any, profile: UserProfile): string => {
  if (!card) return '';
  if (card.type === 'money') {
    return t('card_money_desc', profile, card.value);
  }
  const cleanName = card.name.toLowerCase().replace(/'/g, '').replace(/ /g, '_');
  const key = `card_${cleanName}_desc`;
  const val = t(key, profile);
  if (val !== key) return val;
  return card.description;
};

const getTranslatedColorLabel = (col: string, profile: UserProfile): string => {
  let cleanCol = col === 'lightblue' ? 'sky_blue' : col;
  if (cleanCol === 'railroad') cleanCol = 'station';
  if (cleanCol === 'darkblue') cleanCol = 'blue';
  const key = `color_${cleanCol}`;
  const val = t(key, profile);
  if (val !== key) return val;
  return COLOR_LABELS[col as CardColor] || col;
};

const getBankBreakdown = (bankCards: Card[]) => {
  const counts: Record<number, number> = {};
  bankCards.forEach((c) => {
    counts[c.value] = (counts[c.value] || 0) + 1;
  });
  return Object.keys(counts)
    .map((k) => Number(k))
    .sort((a, b) => b - a)
    .map((value) => ({
      value,
      count: counts[value],
    }));
};

const calculateSetRent = (cards: Card[], color: CardColor, hasHouse: boolean, hasHotel: boolean) => {
  if (cards.length === 0) return 0;
  const count = cards.length;
  const rents = RENT_VALUES[color] || [];
  let baseRent = rents[Math.min(count - 1, rents.length - 1)] || 0;
  if (hasHouse) baseRent += 3;
  if (hasHotel) baseRent += 4;
  return baseRent;
};

const countCompletedSets = (properties: any): number => {
  let count = 0;
  if (!properties) return 0;
  for (const colorKey in properties) {
    const col = colorKey as CardColor;
    const set = properties[col];
    if (set && set.cards && set.cards.length > 0) {
      const required = MAX_IN_SET[col];
      if (required && set.cards.length >= required) {
        count++;
      }
    }
  }
  return count;
};

const CanvasBackground: React.FC<{ theme: string }> = ({ theme }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
    }
    const baseColors: Record<string, string> = {
      theme_slate: '#0f172a',
      theme_green: '#022c22',
      theme_purple: '#0f051d',
      theme_cyberpunk: '#020617',
      theme_lava: '#2a0202',
      theme_abyss: '#01040f',
      theme_gold: '#1e1103',
      theme_sakura: '#1c030d',
      theme_ice: '#07152e',
      theme_retro: '#14051a',
      theme_toxic: '#011c15',
      theme_matrix: '#011c08',
      theme_space: '#02020a',
      theme_desert: '#1f0d03',
      theme_atlantis: '#010d14',
      theme_volcano: '#180200',
    };

    const radialColors: Record<string, { start: string; end: string }> = {
      theme_slate: { start: 'rgba(30, 41, 59, 0.4)', end: 'rgba(7, 9, 15, 0.9)' },
      theme_green: { start: 'rgba(6, 78, 59, 0.35)', end: 'rgba(2, 15, 10, 0.9)' },
      theme_purple: { start: 'rgba(59, 7, 100, 0.4)', end: 'rgba(12, 3, 20, 0.9)' },
      theme_cyberpunk: { start: 'rgba(30, 27, 75, 0.3)', end: 'rgba(3, 7, 18, 0.9)' },
      theme_lava: { start: 'rgba(127, 29, 29, 0.45)', end: 'rgba(15, 3, 3, 0.9)' },
      theme_abyss: { start: 'rgba(15, 23, 42, 0.4)', end: 'rgba(2, 4, 12, 0.95)' },
      theme_gold: { start: 'rgba(120, 53, 15, 0.4)', end: 'rgba(15, 9, 2, 0.95)' },
      theme_sakura: { start: 'rgba(131, 24, 67, 0.35)', end: 'rgba(15, 3, 8, 0.95)' },
      theme_ice: { start: 'rgba(30, 64, 175, 0.35)', end: 'rgba(3, 10, 25, 0.95)' },
      theme_retro: { start: 'rgba(107, 33, 168, 0.35)', end: 'rgba(15, 3, 25, 0.95)' },
      theme_toxic: { start: 'rgba(6, 95, 70, 0.35)', end: 'rgba(2, 15, 10, 0.95)' },
      theme_matrix: { start: 'rgba(22, 101, 52, 0.35)', end: 'rgba(2, 15, 5, 0.95)' },
      theme_space: { start: 'rgba(49, 46, 129, 0.3)', end: 'rgba(2, 2, 8, 0.95)' },
      theme_desert: { start: 'rgba(124, 45, 18, 0.35)', end: 'rgba(15, 6, 2, 0.95)' },
      theme_atlantis: { start: 'rgba(0, 100, 160, 0.45)', end: 'rgba(1, 13, 20, 0.95)' },
      theme_volcano: { start: 'rgba(180, 30, 10, 0.45)', end: 'rgba(18, 2, 0, 0.95)' },
    };

    const particles: Particle[] = [];
    const maxParticles = theme === 'theme_gold' ? 60 : theme === 'theme_purple' ? 50 : theme === 'theme_cyberpunk' ? 70 : 40;

    const createParticle = (): Particle => {
      let pColor = 'rgba(234, 179, 8, '; // default golden
      let vxRange = 0.6, vyRange = 1.0, vyBase = 0.3;
      let pSizeMin = 1.5, pSizeRange = 3.5;
      let alphaMin = 0.3, alphaRange = 0.6;
      let decayMin = 0.001, decayRange = 0.0025;

      if (theme === 'theme_purple') {
        pColor = 'rgba(236, 72, 153, ';
        vyRange = 1.2; vyBase = 0.4;
      } else if (theme === 'theme_cyberpunk') {
        pColor = Math.random() > 0.5 ? 'rgba(99, 102, 241, ' : 'rgba(236, 72, 153, ';
        vxRange = 0.15; vyRange = 0.15; vyBase = -0.075;
      } else if (theme === 'theme_green') {
        pColor = 'rgba(52, 211, 153, ';
        vxRange = 0.3; vyRange = 0.3; vyBase = -0.15;
      } else if (theme === 'theme_lava') {
        pColor = Math.random() > 0.4 ? 'rgba(239, 68, 68, ' : 'rgba(245, 158, 11, ';
        vyRange = 1.4; vyBase = 0.5;
      } else if (theme === 'theme_abyss') {
        pColor = 'rgba(14, 165, 233, ';
        vyRange = 0.8; vyBase = 0.2;
      } else if (theme === 'theme_sakura') {
        pColor = 'rgba(244, 114, 182, ';
        vxRange = 0.8; vyRange = 0.9; vyBase = 0.3;
      } else if (theme === 'theme_ice') {
        pColor = 'rgba(186, 230, 253, ';
        vxRange = 0.4; vyRange = 0.8; vyBase = 0.2;
      } else if (theme === 'theme_retro') {
        pColor = Math.random() > 0.5 ? 'rgba(192, 132, 252, ' : 'rgba(244, 114, 182, ';
      } else if (theme === 'theme_toxic') {
        pColor = 'rgba(16, 185, 129, ';
      } else if (theme === 'theme_matrix') {
        pColor = 'rgba(34, 197, 94, ';
        vxRange = 0.1; vyRange = 1.8; vyBase = 0.6;
      } else if (theme === 'theme_space') {
        pColor = 'rgba(255, 255, 255, ';
        vxRange = 0.1; vyRange = 0.1; vyBase = -0.05;
      } else if (theme === 'theme_desert') {
        pColor = 'rgba(245, 158, 11, ';
        vxRange = 0.9; vyRange = 0.5; vyBase = 0.2;
      } else if (theme === 'theme_atlantis') {
        pColor = Math.random() > 0.6 ? 'rgba(56, 189, 248, ' : 'rgba(147, 197, 253, ';
        vxRange = 0.4; vyRange = 0.6; vyBase = -0.2; // rising bubbles
        pSizeMin = 1; pSizeRange = 2.5;
      } else if (theme === 'theme_volcano') {
        pColor = Math.random() > 0.5 ? 'rgba(239, 68, 68, ' : 'rgba(251, 146, 60, ';
        vxRange = 0.8; vyRange = 1.6; vyBase = 0.6; // falling embers
        pSizeMin = 1; pSizeRange = 3;
      }

      const isSideways = theme === 'theme_cyberpunk' || theme === 'theme_green' || theme === 'theme_space';

      return {
        x: Math.random() * width,
        y: isSideways ? Math.random() * height : height + 10,
        vx: Math.random() * vxRange - (vxRange / 2),
        vy: isSideways ? (Math.random() * vyRange - (vyRange / 2)) : -(Math.random() * vyRange + vyBase),
        size: Math.random() * pSizeRange + pSizeMin,
        color: pColor,
        alpha: Math.random() * alphaRange + alphaMin,
        decay: Math.random() * decayRange + decayMin
      };
    };

    // Prepopulate
    for (let i = 0; i < maxParticles; i++) {
      const p = createParticle();
      p.y = Math.random() * height;
      particles.push(p);
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw background base color matching themeHex
      ctx.fillStyle = baseColors[theme] || '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Draw dynamic radial background
      const radGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.8);
      const rad = radialColors[theme] || { start: 'rgba(20, 30, 50, 0.3)', end: 'rgba(7, 9, 15, 0.9)' };
      radGrad.addColorStop(0, rad.start);
      radGrad.addColorStop(1, rad.end);
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y < -10 || p.x < -10 || p.x > width + 10) {
          particles[idx] = createParticle();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.alpha})`;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none w-full h-full" />;
};

const FireworksCelebration: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Firework {
      x: number;
      y: number;
      targetY: number;
      color: string;
      speed: number;
      exploded: boolean;
      particles: Particle[];
    }

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      alpha: number;
      decay: number;
    }

    const fireworks: Firework[] = [];
    const colors = ['#ec4899', '#3b82f6', '#10b981', '#fbbf24', '#a855f7', '#f43f5e'];

    const createFirework = (): Firework => {
      const x = Math.random() * width;
      const y = height + 10;
      const targetY = Math.random() * (height * 0.4) + 60;
      const color = colors[Math.floor(Math.random() * colors.length)];
      return {
        x,
        y,
        targetY,
        color,
        speed: Math.random() * 3 + 4,
        exploded: false,
        particles: []
      };
    };

    const explode = (firework: Firework) => {
      const count = 35;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        firework.particles.push({
          x: firework.x,
          y: firework.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: firework.color,
          alpha: 1.0,
          decay: Math.random() * 0.02 + 0.015
        });
      }
    };

    let animationFrameId: number;

    const render = () => {
      ctx.fillStyle = 'rgba(7, 9, 15, 0.25)';
      ctx.fillRect(0, 0, width, height);

      if (Math.random() < 0.04 && fireworks.length < 6) {
        fireworks.push(createFirework());
      }

      fireworks.forEach((fw, fIdx) => {
        if (!fw.exploded) {
          fw.y -= fw.speed;
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = fw.color;
          ctx.fill();

          if (fw.y <= fw.targetY) {
            fw.exploded = true;
            explode(fw);
          }
        } else {
          fw.particles.forEach((p, pIdx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04; // gravity
            p.alpha -= p.decay;

            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
            ctx.globalAlpha = 1.0;

            if (p.alpha <= 0) {
              fw.particles.splice(pIdx, 1);
            }
          });

          if (fw.particles.length === 0) {
            fireworks.splice(fIdx, 1);
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none w-full h-full" />;
};

export const GameRoom: React.FC<Props> = ({ roomId, isOffline, profile, onLeaveRoom, onUpdateProfile, adminSettings }) => {
  const [match, setMatch] = React.useState<MatchState | null>(null);
  const matchRef = React.useRef<MatchState | null>(null);
  React.useEffect(() => {
    matchRef.current = match;
  }, [match]);

  // Bot difficulty calculations (Improvement #20)
  const botDifficulty: 'easy' | 'medium' | 'hard' = React.useMemo(() => {
    if (roomId.includes('-easy-') || roomId.includes('practice-easy')) return 'easy';
    if (roomId.includes('-hard-') || roomId.includes('practice-hard')) return 'hard';
    return 'medium';
  }, [roomId]);

  const botDelay = botDifficulty === 'easy' ? 2500 : botDifficulty === 'hard' ? 900 : 1800;
  const botPaymentDelay = botDifficulty === 'easy' ? 2800 : botDifficulty === 'hard' ? 1000 : 2000;
  const botFinishDelay = botDifficulty === 'easy' ? 2000 : botDifficulty === 'hard' ? 700 : 1500;

  const [botIsThinking, setBotIsThinking] = React.useState(false);
  const [localSettings, setLocalSettings] = React.useState({
    targetSets: 3,
    turnLimit: 'unlimited',
    autoEndTurn: false,
    gameMode: 'classic',
  });

  const checkWinnerWithSettings = (properties: any) => {
    return checkWinner(properties, match?.settings?.targetSets || 3);
  };

  const [showShieldDefenseFor, setShowShieldDefenseFor] = React.useState<string | null>(null);
  const [showDealBreakerAnimation, setShowDealBreakerAnimation] = React.useState<{ source: string; target: string; color: CardColor } | null>(null);
  const disable3D = adminSettings ? adminSettings.enable3DCardFlip === false : false;

  const updateMatchState = (newMatch: MatchState | null) => {
    matchRef.current = newMatch;
    setMatch(newMatch);
  };
  const [selectedCard, setSelectedCard] = React.useState<Card | null>(null);
  const [showCardMenu, setShowCardMenu] = React.useState(false);
  const [wildcardColorPick, setWildcardColorPick] = React.useState<Card | null>(null);
  const [propertyWildcardColorPick, setPropertyWildcardColorPick] = React.useState<Card | null>(null);
  const [draggingCard, setDraggingCard] = React.useState<Card | null>(null);
  const [isDragOverBank, setIsDragOverBank] = React.useState(false);
  const [isDragOverProperties, setIsDragOverProperties] = React.useState(false);
  const [rentColorPick, setRentColorPick] = React.useState<Card | null>(null);
  const [rentTargetSelect, setRentTargetSelect] = React.useState<{ card: Card; color: CardColor; payload?: any } | null>(null);
  const [paymentSelection, setPaymentSelection] = React.useState<string[]>([]);
  const [floatingEmojis, setFloatingEmojis] = React.useState<{ id: number; emoji: string; username: string; x: number }[]>([]);
  const [flyingCoins, setFlyingCoins] = React.useState<{ id: number; delay: number; x: number; y: number }[]>([]);
  const [buildSmoke, setBuildSmoke] = React.useState<{ id: number; x: number; y: number }[]>([]);

  const triggerCoinFlyingEffect = React.useCallback(() => {
    if (adminSettings && adminSettings.enableCoinFlyEffect === false) return;

    const count = 12;
    const newCoins = Array.from({ length: count }).map((_, idx) => ({
      id: Date.now() + idx + Math.random(),
      delay: idx * 0.1,
      x: Math.random() * 60 + 20,
      y: Math.random() * 20 + 10
    }));
    setFlyingCoins((prev) => [...prev, ...newCoins]);
    setTimeout(() => {
      setFlyingCoins((prev) => prev.filter((c) => !newCoins.find((nc) => nc.id === c.id)));
    }, 2500);
  }, [adminSettings]);

  const triggerBuildSmoke = React.useCallback(() => {
    if (adminSettings && adminSettings.enableBuildingSmoke === false) return;

    const id = Date.now() + Math.random();
    setBuildSmoke((prev) => [...prev, { id, x: 50, y: 50 }]);
    setTimeout(() => {
      setBuildSmoke((prev) => prev.filter((s) => s.id !== id));
    }, 1500);
  }, [adminSettings]);

  const triggerFloatingEmoji = React.useCallback((emoji: string, username: string) => {
    if (adminSettings && adminSettings.enableFloatingEmojis === false) return;

    const id = Date.now() + Math.random();
    const x = Math.random() * 80 + 10;
    setFloatingEmojis((prev) => [...prev, { id, emoji, username, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, [adminSettings]);

  const calculateLocalChecksum = React.useCallback((m: MatchState): string => {
    let sum = 0;
    m.players.forEach((p) => {
      sum += p.hand.length * 17;
      p.bank.forEach((c) => {
        sum += c.value * 31;
      });
      Object.keys(p.properties).forEach((color) => {
        const set = p.properties[color];
        if (set && set.cards) {
          sum += set.cards.length * 47;
        }
      });
    });
    return `chk-${sum}`;
  }, []);

  const [voiceMuted, setVoiceMuted] = React.useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = React.useState(() => {
    const saved = localStorage.getItem('bgm_enabled');
    return saved === 'true';
  });
  const [speakingList, setSpeakingList] = React.useState<string[]>([]);
  const [customAlert, setCustomAlert] = React.useState<{ message: string; title: string } | null>(null);

  const alert = React.useCallback((message: string, title: string = 'Deal Master PRO') => {
    setCustomAlert({ message, title });
    try {
      sounds.playAlert(profile.settings);
    } catch (e) { }
  }, [profile.settings]);

  // Interaction targets
  const [pendingSlyDeal, setPendingSlyDeal] = React.useState<Card | null>(null);

  // Step-by-step Action target selector states
  const [activeActionCard, setActiveActionCard] = React.useState<Card | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = React.useState<string | null>(null);
  const [selectedStolenCardId, setSelectedStolenCardId] = React.useState<string | null>(null);
  const [selectedStolenColor, setSelectedStolenColor] = React.useState<CardColor | null>(null);
  const [selectedMyCardId, setSelectedMyCardId] = React.useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = React.useState<Card | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const [useDoubleRent, setUseDoubleRent] = React.useState(false);
  const [houseHotelColorPick, setHouseHotelColorPick] = React.useState<Card | null>(null);

  // Holographic card play animation overlay state
  const [playedCardAnimation, setPlayedCardAnimation] = React.useState<{
    card: Card;
    playerName: string;
  } | null>(null);

  const triggerPlayedCardAnimation = (card: Card, playerName: string) => {
    setPlayedCardAnimation({ card, playerName });
    setTimeout(() => {
      setPlayedCardAnimation(null);
    }, 2200);
  };

  const [analyzedProperty, setAnalyzedProperty] = React.useState<{
    color: CardColor;
    ownerName: string;
    cardsCount: number;
    hasHouse: boolean;
    hasHotel: boolean;
    currentRent: number;
  } | null>(null);

  const longPressTimerRef = React.useRef<any>(null);

  const handleStartPress = (col: CardColor, owner: string, setObj: any) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic('medium');
      setExpandedPropertyColor(prev => prev === col ? null : col);
      setAnalyzedProperty({
        color: col,
        ownerName: owner,
        cardsCount: setObj.cards.length,
        hasHouse: setObj.hasHouse,
        hasHotel: setObj.hasHotel,
        currentRent: calculateSetRent(setObj.cards, col, setObj.hasHouse, setObj.hasHotel),
      });
    }, 450);
  };

  const handleEndPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'light') {
          navigator.vibrate(12);
        } else if (type === 'medium') {
          navigator.vibrate(25);
        } else if (type === 'heavy') {
          navigator.vibrate([40, 20, 40]);
        }
      } catch (e) {
        // Safe check
      }
    }
  };

  // Layout & Adaptive Mobile States
  const [isHandExpanded, setIsHandExpanded] = React.useState(true);
  const [showChatPanel, setShowChatPanel] = React.useState(true);
  const [showChatOverlay, setShowChatOverlay] = React.useState(false);
  const [isCompactLayout, setIsCompactLayout] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : true);
  const [timeLeft, setTimeLeft] = React.useState(30);
  const [actionTimeLeft, setActionTimeLeft] = React.useState<number | null>(null);
  const [managedSetColor, setManagedSetColor] = React.useState<CardColor | null>(null);
  const [expandedPropertyColor, setExpandedPropertyColor] = React.useState<CardColor | null>(null);
  const [isOpponentsGrid, setIsOpponentsGrid] = React.useState(false);

  React.useEffect(() => {
    if (!expandedPropertyColor) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest('.property-details-sheet') && !target.closest('.property-set-card-trigger')) {
        setExpandedPropertyColor(null);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handler);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [expandedPropertyColor]);

  const [showHint, setShowHint] = React.useState(false);
  const [showBankVaultModal, setShowBankVaultModal] = React.useState(false);
  const [showOpponentAssetsModal, setShowOpponentAssetsModal] = React.useState(false);
  const [assetsOpponentId, setAssetsOpponentId] = React.useState<string | null>(null);
  const [focusedCard, setFocusedCard] = React.useState<Card | null>(null);
  const [focusedCardZoom, setFocusedCardZoom] = React.useState<number>(1.5);
  const [showYourTurnSplash, setShowYourTurnSplash] = React.useState(false);
  const [activeToast, setActiveToast] = React.useState<string | null>(null);

  // Action Cancel Warning alert state (for troubleshooting / stuck recovery)
  const [isHeaderHidden, setIsHeaderHidden] = React.useState(false);

  const [recoveryAlert, setRecoveryAlert] = React.useState<{
    message: string;
    type: 'warning' | 'success' | 'info';
  } | null>(null);

  // Force bypass/cancel mechanism to prevent the game from getting stuck
  const handleForceCancelActiveAction = (reason?: string) => {
    const activeMatch = matchRef.current;
    if (!activeMatch) return;

    if (sounds.playAlert) {
      sounds.playAlert(profile.settings);
    }

    // Create an updated match without activeActionRequest
    const updatedMatch = { ...activeMatch };
    delete updatedMatch.activeActionRequest;

    // Log the bypass action
    updatedMatch.logs.push({
      id: `bypass-${Date.now()}`,
      message: `⚠️ İşlem İptal: Bekleyen aksiyon zorla iptal edildi. Oyun akışı kurtarıldı!`,
      timestamp: Date.now(),
    });

    updateMatchState(updatedMatch);

    // Clear interaction selections
    setActiveActionCard(null);
    setSelectedCard(null);
    setShowCardMenu(false);
    setPaymentSelection([]);
    setPendingSlyDeal(null);
    setSelectedOpponentId(null);
    setSelectedStolenCardId(null);
    setSelectedMyCardId(null);

    // Show beautiful animated fluid warning alert banner
    setRecoveryAlert({
      message: reason || 'Sistem: Bekleyen işlem iptal edildi ve oyun akışı kurtarıldı!',
      type: 'warning',
    });

    // Auto-hide alert
    setTimeout(() => {
      setRecoveryAlert(null);
    }, 4500);

    // Safely resume bot if it is bot's turn
    const currentTurnPlayer = updatedMatch.players[updatedMatch.turnIndex];
    if (currentTurnPlayer && currentTurnPlayer.isBot) {
      setTimeout(() => {
        resumeBotTurnOffline();
      }, 1000);
    }
  };

  // Mobile Touch Drag and Drop states
  const [touchDragCard, setTouchDragCard] = React.useState<Card | null>(null);
  const [touchPosition, setTouchPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [touchStartPos, setTouchStartPos] = React.useState<{ x: number; y: number } | null>(null);
  const [isTouchDragging, setIsTouchDragging] = React.useState(false);

  const handleTouchStart = (e: React.TouchEvent, card: Card) => {
    if (!isMyTurn) return;
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setTouchDragCard(card);
    setTouchPosition({ x: touch.clientX, y: touch.clientY });
    setIsTouchDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragCard || !touchStartPos) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPos.x;
    const deltaY = touch.clientY - touchStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 15) {
      if (!isTouchDragging) {
        setIsTouchDragging(true);
        setDraggingCard(touchDragCard); // Sync with desktop draggingCard so drop zones highlight
      }
      setTouchPosition({ x: touch.clientX, y: touch.clientY });

      // Highlight drop zones in real-time when dragging on mobile!
      const bankEl = document.getElementById('bank-drop-zone');
      const propertiesEl = document.getElementById('properties-drop-zone');
      const padding = 35; // Forgiving touch zone padding

      if (bankEl) {
        const rect = bankEl.getBoundingClientRect();
        if (
          touch.clientX >= rect.left - padding &&
          touch.clientX <= rect.right + padding &&
          touch.clientY >= rect.top - padding &&
          touch.clientY <= rect.bottom + padding
        ) {
          setIsDragOverBank(true);
        } else {
          setIsDragOverBank(false);
        }
      }

      if (propertiesEl) {
        const rect = propertiesEl.getBoundingClientRect();
        if (
          touch.clientX >= rect.left - padding &&
          touch.clientX <= rect.right + padding &&
          touch.clientY >= rect.top - padding &&
          touch.clientY <= rect.bottom + padding
        ) {
          setIsDragOverProperties(true);
        } else {
          setIsDragOverProperties(false);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragCard) return;

    if (isTouchDragging && touchPosition) {
      const bankEl = document.getElementById('bank-drop-zone');
      const propertiesEl = document.getElementById('properties-drop-zone');

      let droppedOnBank = false;
      let droppedOnProperties = false;
      const padding = 35; // Forgiving touch zone padding

      if (bankEl) {
        const rect = bankEl.getBoundingClientRect();
        if (
          touchPosition.x >= rect.left - padding &&
          touchPosition.x <= rect.right + padding &&
          touchPosition.y >= rect.top - padding &&
          touchPosition.y <= rect.bottom + padding
        ) {
          droppedOnBank = true;
        }
      }

      if (propertiesEl) {
        const rect = propertiesEl.getBoundingClientRect();
        if (
          touchPosition.x >= rect.left - padding &&
          touchPosition.x <= rect.right + padding &&
          touchPosition.y >= rect.top - padding &&
          touchPosition.y <= rect.bottom + padding
        ) {
          droppedOnProperties = true;
        }
      }

      if (droppedOnBank) {
        if (touchDragCard.type === 'property' || touchDragCard.type === 'wildcard') {
          playAlertSound();
          alert('Tapu kartları bankaya yatırılamaz! Sadece para ve aksiyon kartları bankaya yatırılabilir.');
        } else {
          playPlaySound();
          if (isOffline) {
            handleOfflinePlayCard(touchDragCard.id, 'bank');
          } else {
            handlePlayCardMultiplayer(touchDragCard.id, 'bank');
          }
        }
      } else if (droppedOnProperties) {
        if (touchDragCard.type === 'money') {
          playPlaySound();
          if (isOffline) {
            handleOfflinePlayCard(touchDragCard.id, 'bank');
          } else {
            handlePlayCardMultiplayer(touchDragCard.id, 'bank');
          }
        } else if (touchDragCard.type === 'house-hotel') {
          const res = checkHouseHotelPlayability(touchDragCard);
          if (res.playable) {
            playPlaySound();
            setHouseHotelColorPick(touchDragCard);
          } else {
            playAlertSound();
            alert(res.reason || 'Otel/Ev yerleştirilemez!');
          }
        } else if (touchDragCard.isWildcard || touchDragCard.type === 'wildcard') {
          playPlaySound();
          setWildcardColorPick(touchDragCard);
        } else if (touchDragCard.type === 'property') {
          playPlaySound();
          if (isOffline) {
            handleOfflinePlayCard(touchDragCard.id, 'property');
          } else {
            handlePlayCardMultiplayer(touchDragCard.id, 'property');
          }
        } else {
          const res = checkActionPlayability(touchDragCard);
          if (res.playable) {
            playPlaySound();
            if (touchDragCard.type === 'rent') {
              setRentColorPick(touchDragCard);
            } else if (['sly-deal', 'deal-breaker', 'forced-deal', 'debt-collector'].includes(touchDragCard.actionType || '')) {
              setActiveActionCard(touchDragCard);
            } else {
              if (isOffline) handleOfflinePlayCard(touchDragCard.id, 'action');
              else handlePlayCardMultiplayer(touchDragCard.id, 'action');
            }
          } else {
            playAlertSound();
            alert(res.reason || 'Bu kart oynanamaz!');
          }
        }
      }
    } else {
      // Treat as click / selection
      setSelectedCard(touchDragCard);
      setShowCardMenu(true);
      playPlaySound();
    }

    // Clear touch drag states
    setTouchDragCard(null);
    setTouchPosition(null);
    setTouchStartPos(null);
    setIsTouchDragging(false);
    setDraggingCard(null);
    setIsDragOverBank(false);
    setIsDragOverProperties(false);
  };

  // Career stats state
  const [careerStats, setCareerStats] = React.useState({
    wins: 0,
    bankruptcies: 0,
    rentCollected: 0,
  });

  const [showCareerPanel, setShowCareerPanel] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('mono_deal_career_stats');
    if (saved) {
      try {
        setCareerStats(JSON.parse(saved));
      } catch (e) {
        // use default
      }
    }
  }, []);

  const incrementCareerStat = (key: 'wins' | 'bankruptcies', amount = 1) => {
    setCareerStats((prev) => {
      const next = { ...prev, [key]: prev[key] + amount };
      localStorage.setItem('mono_deal_career_stats', JSON.stringify(next));
      return next;
    });
  };

  const addCareerRent = (amount: number) => {
    setCareerStats((prev) => {
      const next = { ...prev, rentCollected: prev.rentCollected + amount };
      localStorage.setItem('mono_deal_career_stats', JSON.stringify(next));
      return next;
    });
  };

  // Drawing cards motion animation state
  const [animatingDrawCards, setAnimatingDrawCards] = React.useState<{ id: number; delay: number }[]>([]);

  // 3D Particles/Light effects state for active card actions
  const [cardEffects, setCardEffects] = React.useState<Record<string, 'steal' | 'rent' | 'bday' | 'gold' | 'house' | 'sly-shadow' | 'debt-seal' | 'birthday-confetti' | null>>({});

  const triggerCardEffect = React.useCallback((cardId: string, type: 'steal' | 'rent' | 'bday' | 'gold' | 'house' | 'sly-shadow' | 'debt-seal' | 'birthday-confetti') => {
    setCardEffects((prev) => ({ ...prev, [cardId]: type }));
    setTimeout(() => {
      setCardEffects((prev) => {
        const copy = { ...prev };
        delete copy[cardId];
        return copy;
      });
    }, 2500);
  }, []);

  // Game notification stack type & state
  interface GameNotification {
    id: string;
    message: string;
    timestamp: Date;
    type: 'action' | 'property' | 'rent' | 'money' | 'other';
  }
  const [notifications, setNotifications] = React.useState<GameNotification[]>([]);

  // Action / Rent Toast State
  const [actionToast, setActionToast] = React.useState<{
    id: string;
    title: string;
    message: string;
    remainingCash: number;
    remainingPropsCount: number;
    type: 'rent' | 'deal-breaker' | 'sly-deal' | 'forced-deal' | 'debt-collector' | 'info';
    victimName: string;
    victimAvatarId: string;
  } | null>(null);

  const translateToastTitle = (tTitle: string, userProfile: UserProfile): string => {
    if (userProfile.settings.language !== 'en') return tTitle;
    let outT = tTitle;
    outT = outT.replace('Sinsi Anlaşma', 'Sly Deal');
    outT = outT.replace('Anlaşma Bozan', 'Deal Breaker');
    outT = outT.replace('Zoraki Takas', 'Forced Deal');
    outT = outT.replace('Borç Tahsildarı', 'Debt Collector');
    outT = outT.replace('Borç Tahsil Edildi', 'Debt Collected');
    outT = outT.replace('Doğum Günü Kutlaması', 'Birthday Celebration');
    outT = outT.replace('Kira Tahsil Edildi', 'Rent Collected');
    outT = outT.replace('Oynandı', 'Played');
    outT = outT.replace('Gerçekleşti', 'Executed');
    outT = outT.replace('Engeli', 'Blocked');
    return outT;
  };

  const showActionToast = (
    type: 'rent' | 'deal-breaker' | 'sly-deal' | 'forced-deal' | 'debt-collector' | 'info',
    title: string,
    message: string,
    victimPlayer: any
  ) => {
    const remainingCash = victimPlayer.bank.reduce((sum: number, c: any) => sum + c.value, 0);
    const remainingPropsCount = Object.values(victimPlayer.properties).reduce(
      (sum: number, set: any) => sum + (set?.cards.length || 0),
      0
    );
    setActionToast({
      id: Math.random().toString(),
      title: translateToastTitle(title, profile),
      message: translateLogMessage(message, profile),
      remainingCash,
      remainingPropsCount,
      type,
      victimName: victimPlayer.username,
      victimAvatarId: victimPlayer.avatarId || '1',
    });
    // Auto-remove after 5.5 seconds
    setTimeout(() => {
      setActionToast((prev) => (prev && prev.title === title ? null : prev));
    }, 5500);
  };

  // Turn Timer Tracking Refs for extra time on action plays
  const prevTurnIndexRef = React.useRef<number | undefined>(undefined);
  const prevActionsPlayedRef = React.useRef<number>(0);
  const botActionsPlayedRef = React.useRef<number>(0);
  const processedLogsRef = React.useRef<Set<string>>(new Set());
  const toastTimeoutRef = React.useRef<any>(null);

  // Extra 10s on action play
  React.useEffect(() => {
    if (match && match.status === 'playing') {
      if (prevTurnIndexRef.current === match.turnIndex) {
        if (match.actionsPlayedThisTurn > prevActionsPlayedRef.current) {
          // Extra 10s added on play (capped at 45 seconds to keep it balanced)
          setTimeLeft((prev) => Math.min(prev + 10, 45));
        }
      }
      prevTurnIndexRef.current = match.turnIndex;
      prevActionsPlayedRef.current = match.actionsPlayedThisTurn;
    } else {
      prevTurnIndexRef.current = undefined;
      prevActionsPlayedRef.current = 0;
    }
  }, [match?.turnIndex, match?.actionsPlayedThisTurn, match?.status]);

  const getTurnLimitSeconds = () => {
    const limit = match?.settings?.turnLimit || 'unlimited';
    if (limit === '15s') return 15;
    if (limit === '30s') return 30;
    if (limit === '1m') return 60;
    return 99999; // Unlimited flag
  };

  // Turn Timer Countdown Effect
  React.useEffect(() => {
    if (match && match.status === 'playing') {
      setTimeLeft(getTurnLimitSeconds());
    }
  }, [match?.turnIndex, match?.status, match?.settings?.turnLimit]);

  React.useEffect(() => {
    if (match && match.status === 'playing') {
      const maxSeconds = getTurnLimitSeconds();
      if (maxSeconds === 99999) {
        setTimeLeft(99999);
        return;
      }

      const timer = setInterval(() => {
        // Paused during active action requests or target selection
        if (match.activeActionRequest || activeActionCard) {
          return;
        }
        setTimeLeft((prev) => {
          if (prev <= 1) {
            const activePlayer = match.players[match.turnIndex];
            const isMyTurn = activePlayer?.id === profile.id;
            if (isMyTurn) {
              if (isOffline) {
                let currentHand = [...activePlayer.hand];
                while (currentHand.length > 7) {
                  const toDiscard = currentHand.shift();
                  if (toDiscard) {
                    handleOfflineDiscard(toDiscard.id);
                  }
                }
                handleOfflineEndTurn();
              } else {
                let currentHand = [...activePlayer.hand];
                if (currentHand.length > 7) {
                  while (currentHand.length > 7) {
                    const toDiscard = currentHand.shift();
                    if (toDiscard) {
                      handleDiscardMultiplayer(toDiscard.id);
                    }
                  }
                  setTimeout(() => {
                    handleEndTurnMultiplayer();
                  }, 500);
                } else {
                  handleEndTurnMultiplayer();
                }
              }
            }
            return maxSeconds;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [match?.turnIndex, match?.status, match?.activeActionRequest, activeActionCard, match?.settings?.turnLimit]);

  // Action Request Timer Countdown Effect (JSN / payments)
  React.useEffect(() => {
    if (actionTimeLeft === null || actionTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setActionTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [actionTimeLeft]);

  // Auto End Turn effect
  React.useEffect(() => {
    if (match && match.status === 'playing' && match.settings?.autoEndTurn) {
      const activePlayer = match.players[match.turnIndex];
      const isMyTurn = activePlayer?.id === profile.id;
      const hasActiveAction = match.activeActionRequest || (match.activeActionRequests && match.activeActionRequests.length > 0);
      if (isMyTurn && match.actionsPlayedThisTurn === 3 && !hasActiveAction && !activeActionCard) {
        // Only end if hand size is <= 7, otherwise they must select cards to discard
        if (activePlayer.hand.length <= 7) {
          if (isOffline) {
            handleOfflineEndTurn();
          } else {
            handleEndTurnMultiplayer();
          }
        }
      }
    }
  }, [match?.actionsPlayedThisTurn, match?.turnIndex, match?.status, match?.settings?.autoEndTurn, match?.activeActionRequest, match?.activeActionRequests, activeActionCard]);

  // "SIRA SENDE" (Your Turn) Splash Screen effect
  const prevTurnIndexForSplash = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!match || match.status !== 'playing') return;
    const isMyTurnNow = match.players[match.turnIndex]?.id === profile.id;
    if (isMyTurnNow && prevTurnIndexForSplash.current !== match.turnIndex) {
      if (sounds.playAlert) {
        sounds.playAlert(profile.settings);
      } else {
        playPlaySound();
      }
      setShowYourTurnSplash(true);
      const timer = setTimeout(() => setShowYourTurnSplash(false), 2000);
      return () => clearTimeout(timer);
    }
    prevTurnIndexForSplash.current = match.turnIndex;
  }, [match?.turnIndex, match?.status, profile.id]);

  // Log-monitoring Effect to show Toasts/Banners and trigger 3D custom particle animations
  React.useEffect(() => {
    if (!match || !match.logs) return;

    const newLogs = match.logs.filter((log: any) => !processedLogsRef.current.has(log.id));
    if (newLogs.length === 0) return;

    newLogs.forEach((log: any) => {
      processedLogsRef.current.add(log.id);
      const text = log.message;

      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setActiveToast(translateLogMessage(text, profile));
      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 3500);

      // Add a dynamic slide-in notification
      let notifType: 'action' | 'property' | 'rent' | 'money' | 'other' = 'other';
      const lowercaseMsg = text.toLowerCase();
      const isBankPlacement = lowercaseMsg.includes('banka') || lowercaseMsg.includes('kasasına') || lowercaseMsg.includes('bankaya') || lowercaseMsg.includes('para ekledi');

      if (lowercaseMsg.includes('mülk') || lowercaseMsg.includes('tapu') || lowercaseMsg.includes('arsa') || lowercaseMsg.includes('set')) {
        notifType = 'property';
      } else if (lowercaseMsg.includes('kira') || lowercaseMsg.includes('bedel')) {
        notifType = 'rent';
      } else if (lowercaseMsg.includes('para') || lowercaseMsg.includes('nakit') || lowercaseMsg.includes('m ekledi')) {
        notifType = 'money';
      } else if (lowercaseMsg.includes('oynadı') || lowercaseMsg.includes('çaldı') || lowercaseMsg.includes('aldı')) {
        notifType = 'action';
      }

      const notifId = log.id || Math.random().toString();
      const newNotif: GameNotification = {
        id: notifId,
        message: text,
        timestamp: new Date(),
        type: notifType,
      };

      setNotifications((prev) => [newNotif, ...prev].slice(0, 5));

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      }, 4000);

      // Detect "Doğum Günü" play
      if (!isBankPlacement && (text.includes('Bugün Benim Doğum Günüm') || text.includes('doğum günü'))) {
        match.players.forEach((p) => {
          p.hand.forEach((c) => triggerCardEffect(c.id, 'birthday-confetti'));
          Object.values(p.properties).forEach((set: any) => {
            set?.cards.forEach((c: any) => triggerCardEffect(c.id, 'birthday-confetti'));
          });
        });

        const activePlayer = match.players[match.turnIndex];
        showActionToast(
          'info',
          '🎂 Doğum Günü Kutlaması!',
          text,
          activePlayer || match.players[0]
        );
      }
      // Detect "Haciz" / "Borç" play
      else if (!isBankPlacement && (text.includes('borç tahsilatı') || text.includes('Borç Tahsildarı') || text.includes('tahsilat'))) {
        match.players.forEach((p) => {
          Object.values(p.properties).forEach((set: any) => {
            set?.cards.forEach((c: any) => triggerCardEffect(c.id, 'debt-seal'));
          });
        });

        const activePlayer = match.players[match.turnIndex];
        showActionToast(
          'debt-collector',
          '💼 Borç / Haciz Talebi!',
          text,
          activePlayer || match.players[0]
        );
      }
      // Detect "Sinsi Anlaşma" play
      else if (!isBankPlacement && (text.includes('sinsi anlaşma') || text.includes('Sinsi Anlaşma'))) {
        match.players.forEach((p) => {
          Object.values(p.properties).forEach((set: any) => {
            set?.cards.forEach((c: any) => triggerCardEffect(c.id, 'sly-shadow'));
          });
        });

        const activePlayer = match.players[match.turnIndex];
        showActionToast(
          'sly-deal',
          '🥷 Sinsi Anlaşma Oynandı!',
          text,
          activePlayer || match.players[0]
        );
      }
      // Detect "Anlaşma Bozan" play
      else if (!isBankPlacement && (text.includes('Anlaşma Bozan') || text.includes('bozan'))) {
        match.players.forEach((p) => {
          Object.values(p.properties).forEach((set: any) => {
            set?.cards.forEach((c: any) => triggerCardEffect(c.id, 'debt-seal'));
          });
        });

        const activePlayer = match.players[match.turnIndex];
        showActionToast(
          'deal-breaker',
          '⚡ Anlaşma Bozan Oynandı!',
          text,
          activePlayer || match.players[0]
        );

        // Trigger Meteor Strike VFX (offline/bot games)
        if (profile.settings.actionVfx === 'vfx_meteor') {
          setShowDealBreakerAnimation({ source: '', target: '', color: 'brown' });
          setTimeout(() => setShowDealBreakerAnimation(null), 2200);
        }
      }
      // Detect "Zoraki Takas" play
      else if (!isBankPlacement && (text.includes('Zoraki Takas') || text.includes('forced-deal'))) {
        match.players.forEach((p) => {
          Object.values(p.properties).forEach((set: any) => {
            set?.cards.forEach((c: any) => triggerCardEffect(c.id, 'sly-shadow'));
          });
        });

        const activePlayer = match.players[match.turnIndex];
        showActionToast(
          'forced-deal',
          '🤝 Zoraki Takas Oynandı!',
          text,
          activePlayer || match.players[0]
        );
      }
      // Detect "Hayır Teşekkürler" (Just Say No) play or counter
      else if (!isBankPlacement && (text.includes('Hayır Teşekkürler') || text.includes('savunma') || text.includes('Savunma') || text.includes('JSN') || text.includes('jsn'))) {
        match.players.forEach((p: any) => {
          p.hand.forEach((c: any) => triggerCardEffect(c.id, 'sly-shadow'));
        });

        const activePlayer = match.players[match.turnIndex];
        showActionToast(
          'info',
          '🛡️ Hayır Teşekkürler!',
          text,
          activePlayer || match.players[0]
        );

        // Trigger Mirror Shield VFX (offline/bot games)
        if (profile.settings.actionVfx === 'vfx_mirror_shield') {
          setShowShieldDefenseFor(profile.id);
          setTimeout(() => setShowShieldDefenseFor(null), 2500);
        }
      }
    });
  }, [match?.logs?.length, match?.players]);

  // Clear payment selection when active action request changes
  React.useEffect(() => {
    setPaymentSelection([]);
  }, [match?.activeActionRequest?.id]);

  const socketRef = React.useRef<WebSocket | null>(null);

  // --- AUDIO SYNTHESIS INTEGRATION ---
  const playDrawSound = () => sounds.playCardDraw(profile.settings);
  const playPlaySound = (card?: Card) => {
    if (card && (card.actionType === 'house' || card.actionType === 'hotel')) {
      sounds.playHouseHotelBuild(profile.settings);
    } else {
      sounds.playPropertyPlace(profile.settings);
    }
  };
  const playCoinSound = () => sounds.playCoin(profile.settings);
  const playActionSound = (card?: Card) => {
    if (!card) {
      sounds.playActionCardPlay(profile.settings);
      return;
    }
    if (card.actionType === 'birthday') {
      sounds.playBirthday(profile.settings);
    } else if (card.actionType === 'debt-collector') {
      sounds.playDebtCollector(profile.settings);
    } else if (card.actionType === 'deal-breaker') {
      sounds.playDealBreaker(profile.settings);
    } else if (card.actionType === 'sly-deal' || card.actionType === 'forced-deal') {
      sounds.playSlyForcedDeal(profile.settings);
    } else if (card.actionType === 'pass-go') {
      sounds.playPassGo(profile.settings);
    } else if (card.actionType === 'house' || card.actionType === 'hotel') {
      sounds.playHouseHotelBuild(profile.settings);
    } else {
      sounds.playActionCardPlay(profile.settings);
    }
  };
  const playStealSound = () => sounds.playSteal(profile.settings);
  const playJsnSound = () => sounds.playJustSayNo(profile.settings);
  const playAlertSound = () => sounds.playAlert(profile.settings);
  const playCardDrawSound = () => sounds.playCardDraw(profile.settings);
  const playCardDiscardSound = () => sounds.playCardDiscard(profile.settings);
  const playPropertyPlaceSound = () => sounds.playPropertyPlace(profile.settings);
  const playActionCardPlaySound = () => sounds.playActionCardPlay(profile.settings);

  // --- BACKGROUND MUSIC ENGINE CONTROLLER ---
  React.useEffect(() => {
    if (isMusicPlaying) {
      sounds.startMusic(profile.settings);
    } else {
      sounds.stopMusic();
    }
    return () => {
      sounds.stopMusic();
    };
  }, [isMusicPlaying, profile.settings.soundVolume]);

  // Initialize Offline Practice Match or Connect WebSocket
  React.useEffect(() => {
    if (isOffline) {
      // Setup Offline State
      const initialMatch: MatchState = {
        roomId,
        status: 'lobby',
        players: [
          {
            id: profile.id,
            username: profile.username,
            avatarId: profile.avatarId,
            profileFrame: profile.settings.profileFrame || 'frame_none',
            isBot: false,
            hand: [],
            bank: [],
            properties: {},
          },
          {
            id: 'bot-1',
            username: 'Bot Can (Yapay Zeka)',
            avatarId: 'avatar_skater',
            profileFrame: 'frame_neon',
            isBot: true,
            hand: [],
            bank: [],
            properties: {},
          },
        ],
        deckCount: 106,
        discardPile: [],
        turnIndex: 0,
        actionsPlayedThisTurn: 0,
        logs: [
          { id: 'log-1', message: 'Çevrimdışı Pratik Odası Kuruldu. Bot Can maça hazır!', timestamp: Date.now() },
        ],
        isOffline: true,
      };
      setMatch(initialMatch);
    } else {
      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        // Register client
        ws.send(JSON.stringify({ type: 'register', userId: profile.id }));
        // Join room
        ws.send(JSON.stringify({ type: 'join_room', userId: profile.id, roomId }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'room_update') {
            setMatch(data.matchState);
            if (data.matchState.settings) {
              setLocalSettings(data.matchState.settings);
            }
            if (data.matchState.actionTimeLeft !== undefined) {
              setActionTimeLeft(data.matchState.actionTimeLeft);
            }
            if (data.matchState.turnTimeLeft !== undefined) {
              setTimeLeft(data.matchState.turnTimeLeft ?? 30);
            }

            // Checksum Verification (State Desync Check)
            if (data.checksum) {
              const localSum = calculateLocalChecksum(data.matchState);
              if (localSum !== data.checksum) {
                console.warn('[Sync] Desync detected! Local:', localSum, 'Server:', data.checksum);
                if (!isOffline && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'request_sync', userId: profile.id, roomId }));
                }
              }
            }

            // Play corresponding trigger sound effects based on last log messages
            const logs = data.matchState.logs as GameLog[];
            if (logs.length > 0) {
              const lastLog = logs[logs.length - 1].message;
              const lowercaseLastLog = lastLog.toLowerCase();
              const isBankLog = lowercaseLastLog.includes('banka') || lowercaseLastLog.includes('kasasına') || lowercaseLastLog.includes('bankaya') || lowercaseLastLog.includes('para ekledi');

              if (isBankLog) {
                playCoinSound();
              } else if (lastLog.includes('çekti')) {
                playCardDrawSound();
              } else if (lastLog.includes('attı')) {
                playCardDiscardSound();
              } else if (lastLog.includes('yerleştirdi')) {
                if (lastLog.includes('Ev') || lastLog.includes('Otel') || lastLog.includes('ev') || lastLog.includes('otel')) {
                  sounds.playHouseHotelBuild(profile.settings);
                  triggerBuildSmoke();
                } else {
                  playPropertyPlaceSound();
                }
              } else if (lastLog.includes('Doğum Günü') || lastLog.includes('doğum günü')) {
                sounds.playBirthday(profile.settings);
              } else if (lastLog.includes('Borç Tahsilatı') || lastLog.includes('borç tahsilatı') || lastLog.includes('Haciz')) {
                sounds.playDebtCollector(profile.settings);
              } else if (lastLog.includes('Anlaşma Bozan') || lastLog.includes('anlaşma bozan') || lastLog.includes('Set Çaldı') || lastLog.includes('set çaldı')) {
                sounds.playDealBreaker(profile.settings);
              } else if (lastLog.includes('Sinsi Anlaşma') || lastLog.includes('sinsi anlaşma') || lastLog.includes('Zorunlu Anlaşma') || lastLog.includes('zorunlu anlaşma')) {
                sounds.playSlyForcedDeal(profile.settings);
              } else if (lastLog.includes('Başlangıç Noktası') || lastLog.includes('Başlangıç noktasından') || lastLog.includes('pass-go')) {
                sounds.playPassGo(profile.settings);
              } else if (lastLog.includes('aksiyon') || lastLog.includes('başladı') || lastLog.includes('oynadı') || lastLog.includes('talep etti') || lastLog.includes('talep ediyor') || lastLog.includes('çalmak istiyor') || lastLog.includes('değiştirmek istiyor')) {
                playActionCardPlaySound();
              } else if (lastLog.includes('çaldı')) {
                playStealSound();
              } else if (lastLog.includes('Hayır Teşekkürler') || lastLog.includes('Hayır Deme Hakkı') || lastLog.includes('Reddet')) {
                playJsnSound();
                // Trigger Mirror Shield VFX (online)
                if (profile.settings.actionVfx === 'vfx_mirror_shield') {
                  setShowShieldDefenseFor(profile.id);
                  setTimeout(() => setShowShieldDefenseFor(null), 2500);
                }
              }

              // Trigger Meteor Strike VFX for Deal Breaker (online)
              if ((lastLog.includes('Anlaşma Bozan') || lastLog.includes('Set Çaldı')) && profile.settings.actionVfx === 'vfx_meteor') {
                setShowDealBreakerAnimation({ source: '', target: '', color: 'brown' });
                setTimeout(() => setShowDealBreakerAnimation(null), 2200);
              }

              // Detect rent/payment logs to trigger Coin Flying
              if (
                lowercaseLastLog.includes('ödeme yaptı') ||
                lowercaseLastLog.includes('ödedi') ||
                lowercaseLastLog.includes('ödüyor')
              ) {
                triggerCoinFlyingEffect();
              }
            }
          } else if (data.type === 'emoji_broadcast') {
            triggerFloatingEmoji(data.emoji, data.username);
          } else if (data.type === 'voice_update') {
            const speaking = data.players.filter((p: any) => p.isSpeaking).map((p: any) => p.id);
            setSpeakingList(speaking);
          } else if (data.type === 'kicked') {
            alert('Lobiden Atıldınız!');
            onLeaveRoom();
          } else if (data.type === 'alert') {
            alert(data.message);
          }
        } catch (e) {
          console.error(e);
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [roomId, isOffline]);

  // Simulated speaking wave generator for Voice Chat
  React.useEffect(() => {
    if (!voiceMuted) {
      const interval = setInterval(() => {
        // Randomly make self speak in UI to show the dynamic voice waves
        if (Math.random() < 0.25) {
          setSpeakingList((prev) => [...new Set([...prev, profile.id])]);
          if (!isOffline && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({ type: 'voice_state', userId: profile.id, roomId, isSpeaking: true })
            );
          }
        } else {
          setSpeakingList((prev) => prev.filter((id) => id !== profile.id));
          if (!isOffline && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({ type: 'voice_state', userId: profile.id, roomId, isSpeaking: false })
            );
          }
        }
      }, 3500);

      return () => clearInterval(interval);
    } else {
      setSpeakingList((prev) => prev.filter((id) => id !== profile.id));
    }
  }, [voiceMuted]);

  const handleLeaveLobby = () => {
    if (!isOffline) {
      socketRef.current?.send(JSON.stringify({ type: 'leave_room', userId: profile.id, roomId }));
    }
    onLeaveRoom();
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    if (isOffline) {
      setMatch((prev) => {
        if (!prev) return null;
        const updatedPlayers = prev.players.filter((p) => p.id !== targetPlayerId);
        return {
          ...prev,
          players: updatedPlayers,
          logs: [
            ...prev.logs,
            { id: `kick-${Date.now()}`, message: `Bot odadan çıkarıldı.`, timestamp: Date.now() },
          ],
        };
      });
    } else {
      socketRef.current?.send(JSON.stringify({
        type: 'kick_player',
        userId: profile.id,
        roomId,
        targetPlayerId
      }));
    }
  };

  const changeMatchSettings = (updated: Partial<typeof localSettings>) => {
    const fullSettings = { ...localSettings, ...updated };

    // Automatically apply rules for presets
    if (updated.gameMode === 'chaos') {
      fullSettings.targetSets = 4;
      fullSettings.turnLimit = 'unlimited';
      fullSettings.autoEndTurn = false;
    } else if (updated.gameMode === 'speed') {
      fullSettings.targetSets = 2;
      fullSettings.turnLimit = '15s';
      fullSettings.autoEndTurn = true;
    }

    setLocalSettings(fullSettings);

    if (isOffline) {
      setMatch(prev => prev ? { ...prev, settings: fullSettings } : null);
    } else {
      socketRef.current?.send(JSON.stringify({
        type: 'update_match_settings',
        userId: profile.id,
        roomId,
        settings: fullSettings
      }));
    }
  };

  // --- OFFLINE PRACTICE MODE ENGINE ACTIONS ---
  const handleStartOfflineGame = () => {
    if (!match) return;

    let fullDeck = shuffleDeck(generateDeck());

    // Deal 5 cards
    const updatedPlayers = match.players.map((p) => ({
      ...p,
      hand: fullDeck.splice(0, 5),
    }));

    const nextState: MatchState = {
      ...match,
      status: 'playing',
      players: updatedPlayers,
      deckCount: fullDeck.length,
      discardPile: [],
      turnIndex: 0,
      actionsPlayedThisTurn: 0,
      settings: localSettings,
      logs: [
        ...match.logs,
        { id: `start-${Date.now()}`, message: 'Oyun başladı! İlk 5 kartınız dağıtıldı.', timestamp: Date.now() },
      ],
    };

    // Store deck count
    (nextState as any).serverDeck = fullDeck;

    // Trigger draw for player 1
    triggerOfflineDraw(nextState);
  };

  const triggerOfflineDraw = (currentState: MatchState) => {
    const activePlayer = currentState.players[currentState.turnIndex];
    const serverDeck: Card[] = (currentState as any).serverDeck || [];

    if (serverDeck.length < 5) {
      const disc = [...currentState.discardPile];
      currentState.discardPile = [];
      serverDeck.push(...shuffleDeck(disc));
    }

    const drawCount = activePlayer.hand.length === 0 ? 5 : 2;
    const drawn = serverDeck.splice(0, drawCount);
    activePlayer.hand.push(...drawn);

    currentState.deckCount = serverDeck.length;
    (currentState as any).serverDeck = serverDeck;

    currentState.logs.push({
      id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: `${activePlayer.username} desteden ${drawCount} kart çekti.`,
      timestamp: Date.now(),
    });

    if (activePlayer.id === profile.id) {
      // Trigger visual cards draw gliding animation
      const cardsToAnimate = Array.from({ length: drawCount }).map((_, idx) => ({
        id: Date.now() + idx,
        delay: idx * 0.15,
      }));
      setAnimatingDrawCards(cardsToAnimate);
      setTimeout(() => {
        setAnimatingDrawCards([]);
      }, 1500);
    }

    playDrawSound();
    setMatch({ ...currentState });
  };

  const executeSlyDealOffline = (matchState: MatchState, sourceId: string, payload: any) => {
    const sourcePlayer = matchState.players.find((p) => p.id === sourceId);
    const targetPlayer = matchState.players.find((p) => p.id === payload.targetPlayerId);
    if (sourcePlayer && targetPlayer && payload.targetCardId) {
      let stolenCard: Card | null = null;
      let stolenColor: CardColor | null = null;
      for (const colKey in targetPlayer.properties) {
        const col = colKey as CardColor;
        const propSet = targetPlayer.properties[col];
        if (propSet) {
          const idx = propSet.cards.findIndex((c) => c.id === payload.targetCardId);
          if (idx !== -1) {
            stolenCard = propSet.cards.splice(idx, 1)[0];
            stolenColor = col;
            if (propSet.cards.length === 0) {
              delete targetPlayer.properties[col];
            }
            break;
          }
        }
      }
      if (stolenCard) {
        const col = stolenCard.color || stolenColor || 'brown';
        if (!sourcePlayer.properties[col]) {
          sourcePlayer.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
        }
        sourcePlayer.properties[col]!.cards.push(stolenCard);
        triggerCardEffect(stolenCard.id, 'steal');
        matchState.logs.push({
          id: `sly-resolved-${Date.now()}`,
          message: `${sourcePlayer.username}, ${targetPlayer.username} adlı oyuncudan ${stolenCard.name} mülkünü sinsi anlaşma ile çaldı!`,
          timestamp: Date.now(),
        });
        enforceBuildingRules(targetPlayer, matchState.discardPile);
        showActionToast(
          'sly-deal',
          '🥷 Sinsi Anlaşma Gerçekleşti!',
          `${sourcePlayer.username}, ${targetPlayer.username} adlı oyuncudan "${stolenCard.name}" mülkünü aldı.`,
          targetPlayer
        );
      }
    }
  };

  const executeDealBreakerOffline = (matchState: MatchState, sourceId: string, payload: any) => {
    const sourcePlayer = matchState.players.find((p) => p.id === sourceId);
    const targetPlayer = matchState.players.find((p) => p.id === payload.targetPlayerId);
    const targetColor = payload.targetColor as CardColor;
    if (sourcePlayer && targetPlayer && targetColor) {
      const propSet = targetPlayer.properties[targetColor];
      if (propSet) {
        sourcePlayer.properties[targetColor] = { ...propSet };
        delete targetPlayer.properties[targetColor];
        propSet.cards.forEach((c) => triggerCardEffect(c.id, 'steal'));
        matchState.logs.push({
          id: `db-resolved-${Date.now()}`,
          message: `${sourcePlayer.username}, ${targetPlayer.username} adlı oyuncunun tamamlanmış ${COLOR_LABELS[targetColor]} setini çaldı!`,
          timestamp: Date.now(),
        });
        showActionToast(
          'deal-breaker',
          '⚡ Anlaşma Bozan Gerçekleşti!',
          `${sourcePlayer.username}, ${targetPlayer.username} adlı oyuncunun tamamlanmış "${COLOR_LABELS[targetColor]}" setini aldı.`,
          targetPlayer
        );
      }
    }
  };

  const executeForcedDealOffline = (matchState: MatchState, sourceId: string, payload: any) => {
    const sourcePlayer = matchState.players.find((p) => p.id === sourceId);
    const targetPlayer = matchState.players.find((p) => p.id === payload.targetPlayerId);
    if (sourcePlayer && targetPlayer && payload.targetCardId && payload.myCardId) {
      let stolenCard: Card | null = null;
      let givenCard: Card | null = null;
      let stolenColor: CardColor | null = null;
      let givenColor: CardColor | null = null;

      for (const colKey in targetPlayer.properties) {
        const col = colKey as CardColor;
        const propSet = targetPlayer.properties[col];
        if (propSet) {
          const idx = propSet.cards.findIndex((c) => c.id === payload.targetCardId);
          if (idx !== -1) {
            stolenCard = propSet.cards.splice(idx, 1)[0];
            stolenColor = col;
            if (propSet.cards.length === 0) {
              delete targetPlayer.properties[col];
            }
            break;
          }
        }
      }

      for (const colKey in sourcePlayer.properties) {
        const col = colKey as CardColor;
        const propSet = sourcePlayer.properties[col];
        if (propSet) {
          const idx = propSet.cards.findIndex((c) => c.id === payload.myCardId);
          if (idx !== -1) {
            givenCard = propSet.cards.splice(idx, 1)[0];
            givenColor = col;
            if (propSet.cards.length === 0) {
              delete sourcePlayer.properties[col];
            }
            break;
          }
        }
      }

      if (stolenCard && givenCard) {
        const colS = stolenCard.color || stolenColor || 'brown';
        if (!sourcePlayer.properties[colS]) {
          sourcePlayer.properties[colS] = { cards: [], hasHouse: false, hasHotel: false };
        }
        sourcePlayer.properties[colS]!.cards.push(stolenCard);

        const colG = givenCard.color || givenColor || 'brown';
        if (!targetPlayer.properties[colG]) {
          targetPlayer.properties[colG] = { cards: [], hasHouse: false, hasHotel: false };
        }
        targetPlayer.properties[colG]!.cards.push(givenCard);

        triggerCardEffect(stolenCard.id, 'steal');
        triggerCardEffect(givenCard.id, 'steal');

        matchState.logs.push({
          id: `fd-resolved-${Date.now()}`,
          message: `${sourcePlayer.username}, ${targetPlayer.username} ile Zoraki Takas yaptı! ${givenCard.name} verdi ve ${stolenCard.name} aldı.`,
          timestamp: Date.now(),
        });

        enforceBuildingRules(targetPlayer, matchState.discardPile);
        enforceBuildingRules(sourcePlayer, matchState.discardPile);

        showActionToast(
          'forced-deal',
          '🤝 Zoraki Takas Gerçekleşti!',
          `${sourcePlayer.username} Zoraki Takas ile "${stolenCard.name}" mülkünü aldı, karşılığında "${givenCard.name}" mülkünü verdi.`,
          targetPlayer
        );
      }
    }
  };

  const handleOfflinePlayCard = (cardId: string, zone: 'bank' | 'property' | 'action', extraColor?: CardColor, payload?: any) => {
    if (!match) return;
    triggerHaptic('medium');

    let actionsCost = 1;
    if (zone === 'action' && payload?.isDoubleRent) {
      actionsCost = 2;
    }

    if (match.actionsPlayedThisTurn + actionsCost > 3) {
      playAlertSound();
      alert("Bu turda en fazla 3 hamle yapabilirsiniz! Lütfen turunuzu sonlandırın.");
      return;
    }

    const activePlayer = match.players[match.turnIndex];
    const cardIdx = activePlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIdx === -1) return;

    const card = activePlayer.hand[cardIdx];
    const updatedPlayers = [...match.players];
    const updatedPlayer = { ...activePlayer };
    updatedPlayers[match.turnIndex] = updatedPlayer;

    let updatedDiscard = [...match.discardPile];

    if (zone === 'bank') {
      if (card.type === 'property' || card.type === 'wildcard') {
        return; // Arazi Kartları ve Joker Arazi kartları Bankaya Konulmaz.
      }
      updatedPlayer.hand.splice(cardIdx, 1);
      updatedPlayer.bank.push(card);
      match.logs.push({
        id: `play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: `Banka kasasına ${card.value}M para (${card.name}) yerleştirildi.`,
        timestamp: Date.now(),
      });
      playCoinSound();
    } else if (zone === 'property') {
      updatedPlayer.hand.splice(cardIdx, 1);
      const colorToUse = (card.isWildcard && extraColor) ? extraColor : (card.color || extraColor || 'brown');

      if (!updatedPlayer.properties[colorToUse]) {
        updatedPlayer.properties[colorToUse] = { cards: [], hasHouse: false, hasHotel: false };
      }

      if (card.type === 'house-hotel') {
        if (card.actionType === 'house') updatedPlayer.properties[colorToUse]!.hasHouse = true;
        else updatedPlayer.properties[colorToUse]!.hasHotel = true;
      } else {
        const updatedCard = { ...card };
        if (updatedCard.isWildcard && updatedCard.secondaryColor && colorToUse === updatedCard.secondaryColor) {
          const temp = updatedCard.color;
          updatedCard.color = colorToUse;
          updatedCard.secondaryColor = temp;
        } else {
          updatedCard.color = colorToUse;
        }
        updatedPlayer.properties[colorToUse]!.cards.push(updatedCard);
      }

      match.logs.push({
        id: `play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: `${COLOR_LABELS[colorToUse]} renk grubuna ${card.name} eklendi.`,
        timestamp: Date.now(),
      });
      playPlaySound(card);

      // Check win
      if (checkWinnerWithSettings(updatedPlayer.properties)) {
        handleOfflineWinner(updatedPlayer.id);
        return;
      }
    } else if (zone === 'action') {
      updatedPlayer.hand.splice(cardIdx, 1);
      updatedDiscard.push(card);

      if (payload?.isDoubleRent) {
        const drIdx = updatedPlayer.hand.findIndex((c) => c.actionType === 'double-rent');
        if (drIdx !== -1) {
          const drCard = updatedPlayer.hand.splice(drIdx, 1)[0];
          updatedDiscard.push(drCard);
          actionsCost += 1;
        }
      }

      match.logs.push({
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: `${activePlayer.username}, ${card.name} aksiyonunu masaya sürdü!`,
        timestamp: Date.now(),
      });
      playActionSound(card);

      // Implement specific offline action results
      if (card.actionType === 'pass-go') {
        const serverDeck: Card[] = (match as any).serverDeck || [];
        const drawn = serverDeck.splice(0, 2);
        updatedPlayer.hand.push(...drawn);
        match.deckCount = serverDeck.length;
        (match as any).serverDeck = serverDeck;
        match.logs.push({
          id: `passgo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: `${activePlayer.username} Başlangıç Noktasından Geçti ve 2 kart çekti!`,
          timestamp: Date.now(),
        });
        playDrawSound();
      } else if (card.actionType === 'birthday') {
        // Collect 2M from all other players (bots)
        const targets = match.players.filter((p) => p.id !== activePlayer.id);
        targets.forEach((tp) => {
          if (tp.isBot) {
            const payments = BotEngine.selectPayment(tp, 2);
            transferOfflinePayment(tp.id, activePlayer.id, payments);
            payments.forEach((cardId) => triggerCardEffect(cardId, 'gold'));
            match.logs.push({
              id: `bday-offline-${Date.now()}-${Math.random()}`,
              message: `🎂 ${tp.username}, Doğum Günü Kutlaması için ${activePlayer.username} oyuncusuna 2M ödedi.`,
              timestamp: Date.now()
            });
          }
        });
        showActionToast(
          'info',
          '🎂 Doğum Günü Kutlaması!',
          `${activePlayer.username} bir doğum günü partisi verdi ve herkesten 2M topladı!`,
          activePlayer
        );
      } else if (card.actionType === 'debt-collector') {
        const targetId = payload?.targetPlayerId || match.players.find((p) => p.id !== activePlayer.id)?.id;
        const targetPlayer = match.players.find((p) => p.id === targetId);
        if (targetPlayer) {
          if (targetPlayer.isBot) {
            const jsnIdx = targetPlayer.hand.findIndex((c) => c.actionType === 'just-say-no');
            if (jsnIdx !== -1) {
              const jsnCard = targetPlayer.hand.splice(jsnIdx, 1)[0];
              updatedDiscard.push(jsnCard);
              match.logs.push({
                id: `bot-jsn-${Date.now()}`,
                message: `🛡️ ${targetPlayer.username} 'Hayır Deme Hakkı' (Reddet) kartını kullanarak senin Borç Tahsilatı hamleni engelledi!`,
                timestamp: Date.now(),
              });
              playJsnSound();

              match.activeActionRequest = {
                id: `req-${Date.now()}`,
                type: 'just-say-no',
                sourcePlayerId: targetPlayer.id,
                targetPlayerId: activePlayer.id,
                actionCard: card,
                amountDue: 5,
                originalAction: {
                  type: 'debt-collector',
                  payload: { targetPlayerId: targetId }
                },
                jsnCount: 1
              };
            } else {
              // Debt collector is 5M!
              const payments = BotEngine.selectPayment(targetPlayer, 5);
              transferOfflinePayment(targetPlayer.id, activePlayer.id, payments);
              payments.forEach((cardId) => triggerCardEffect(cardId, 'gold'));
              showActionToast(
                'debt-collector',
                '💼 Haciz / Borç Tahsilatı!',
                `${activePlayer.username}, ${targetPlayer.username} adlı oyuncudan 5M borç tahsil etti!`,
                targetPlayer
              );
            }
          }
        }
      } else if (card.type === 'rent') {
        const chosenColor = extraColor || 'brown';
        const set = updatedPlayer.properties[chosenColor];
        if (set && set.cards.length > 0) {
          const baseCount = Math.min(set.cards.length, MAX_IN_SET[chosenColor]);
          let rentVal = set.cards[0].rentValues?.[baseCount - 1] || 1;
          if (set.hasHouse) rentVal += 3;
          if (set.hasHotel) rentVal += 4;

          if (payload?.isDoubleRent) {
            rentVal *= 2;
          }

          const isWildRent = card.name === 'Her Renk Kira Kartı' || !card.color;
          if (isWildRent) {
            // Collect from ONLY one player
            const targetId = payload?.targetPlayerId || match.players.find((p) => p.id !== activePlayer.id)?.id;
            const targetPlayer = match.players.find((p) => p.id === targetId);
            if (targetPlayer) {
              if (targetPlayer.isBot) {
                const payments = BotEngine.selectPayment(targetPlayer, rentVal);
                transferOfflinePayment(targetPlayer.id, activePlayer.id, payments);
                payments.forEach((cardId) => triggerCardEffect(cardId, 'gold'));
                match.logs.push({
                  id: `rent-offline-${Date.now()}-${Math.random()}`,
                  message: `💰 ${targetPlayer.username}, ${COLOR_LABELS[chosenColor]} mülkleri için ${rentVal}M kira ödedi.`,
                  timestamp: Date.now()
                });
                showActionToast(
                  'rent',
                  '💰 Kira Tahsilatı!',
                  `${activePlayer.username}, ${targetPlayer.username} adlı oyuncudan ${COLOR_LABELS[chosenColor]} mülkleri için ${rentVal}M kira aldı!`,
                  targetPlayer
                );
              }
            }
          } else {
            // Collect from EVERYONE (standard dual-color rent)
            const targets = match.players.filter((p) => p.id !== activePlayer.id);
            targets.forEach((targetPlayer) => {
              if (targetPlayer.isBot) {
                const payments = BotEngine.selectPayment(targetPlayer, rentVal);
                transferOfflinePayment(targetPlayer.id, activePlayer.id, payments);
                payments.forEach((cardId) => triggerCardEffect(cardId, 'gold'));
                match.logs.push({
                  id: `rent-offline-${Date.now()}-${Math.random()}`,
                  message: `💰 ${targetPlayer.username}, ${COLOR_LABELS[chosenColor]} mülkleri için ${rentVal}M kira ödedi.`,
                  timestamp: Date.now()
                });
              }
            });
            showActionToast(
              'rent',
              '💰 Kira Tahsilatı!',
              `${activePlayer.username} herkesten ${COLOR_LABELS[chosenColor]} mülkleri için ${rentVal}M kira aldı!`,
              activePlayer
            );
          }
        }
      } else if (card.actionType === 'sly-deal') {
        const targetId = payload?.targetPlayerId;
        const cardIdToSteal = payload?.targetCardId;
        if (targetId && cardIdToSteal) {
          const targetPlayer = match.players.find((p) => p.id === targetId);
          if (targetPlayer) {
            const jsnIdx = targetPlayer.hand.findIndex((c) => c.actionType === 'just-say-no');
            if (jsnIdx !== -1) {
              const jsnCard = targetPlayer.hand.splice(jsnIdx, 1)[0];
              updatedDiscard.push(jsnCard);
              match.logs.push({
                id: `bot-jsn-${Date.now()}`,
                message: `🛡️ ${targetPlayer.username} 'Hayır Deme Hakkı' (Reddet) kartını kullanarak senin Sinsi Anlaşma hamleni engelledi!`,
                timestamp: Date.now(),
              });
              playJsnSound();

              match.activeActionRequest = {
                id: `req-${Date.now()}`,
                type: 'just-say-no',
                sourcePlayerId: targetPlayer.id,
                targetPlayerId: activePlayer.id,
                actionCard: card,
                targetCardId: cardIdToSteal,
                originalAction: {
                  type: 'sly-deal',
                  payload: { targetPlayerId: targetId, targetCardId: cardIdToSteal }
                },
                jsnCount: 1
              };
            } else {
              let stolenCard: Card | null = null;
              let stolenColor: CardColor | null = null;
              for (const colKey in targetPlayer.properties) {
                const col = colKey as CardColor;
                const propSet = targetPlayer.properties[col];
                if (propSet) {
                  const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
                  if (idx !== -1) {
                    stolenCard = propSet.cards.splice(idx, 1)[0];
                    stolenColor = col;
                    if (propSet.cards.length === 0) {
                      delete targetPlayer.properties[col];
                    }
                    break;
                  }
                }
              }
              if (stolenCard) {
                const col = stolenCard.color || stolenColor || 'brown';
                if (!updatedPlayer.properties[col]) {
                  updatedPlayer.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
                }
                updatedPlayer.properties[col]!.cards.push(stolenCard);
                triggerCardEffect(stolenCard.id, 'steal');
                match.logs.push({
                  id: `sly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `${activePlayer.username}, ${targetPlayer.username} adlı oyuncudan ${stolenCard.name} mülkünü sinsi anlaşma ile çaldı!`,
                  timestamp: Date.now(),
                });
                // Enforce building rules because stealing might have broken target player's set
                enforceBuildingRules(targetPlayer, match.discardPile);
                showActionToast(
                  'sly-deal',
                  '🥷 Sinsi Anlaşma Oynandı!',
                  `${activePlayer.username}, ${targetPlayer.username} adlı oyuncudan "${stolenCard.name}" mülkünü çaldı!`,
                  targetPlayer
                );
              }
            }
          }
        }
      } else if (card.actionType === 'deal-breaker') {
        const targetId = payload?.targetPlayerId;
        const targetColor = payload?.targetColor as CardColor;
        if (targetId && targetColor) {
          const targetPlayer = match.players.find((p) => p.id === targetId);
          if (targetPlayer) {
            const jsnIdx = targetPlayer.hand.findIndex((c) => c.actionType === 'just-say-no');
            if (jsnIdx !== -1) {
              const jsnCard = targetPlayer.hand.splice(jsnIdx, 1)[0];
              updatedDiscard.push(jsnCard);
              match.logs.push({
                id: `bot-jsn-${Date.now()}`,
                message: `🛡️ ${targetPlayer.username} 'Hayır Deme Hakkı' (Reddet) kartını kullanarak senin Anlaşma Bozan hamleni engelledi!`,
                timestamp: Date.now(),
              });
              playJsnSound();

              match.activeActionRequest = {
                id: `req-${Date.now()}`,
                type: 'just-say-no',
                sourcePlayerId: targetPlayer.id,
                targetPlayerId: activePlayer.id,
                actionCard: card,
                targetColor: targetColor,
                originalAction: {
                  type: 'deal-breaker',
                  payload: { targetPlayerId: targetId, targetColor: targetColor }
                },
                jsnCount: 1
              };
            } else {
              const propSet = targetPlayer?.properties[targetColor];
              if (propSet) {
                updatedPlayer.properties[targetColor] = { ...propSet };
                delete targetPlayer.properties[targetColor];
                propSet.cards.forEach((c) => triggerCardEffect(c.id, 'steal'));
                match.logs.push({
                  id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `${activePlayer.username}, ${targetPlayer.username} adlı oyuncunun tamamlanmış ${COLOR_LABELS[targetColor]} setini Anlaşma Bozan kartı ile çaldı!`,
                  timestamp: Date.now(),
                });
                showActionToast(
                  'deal-breaker',
                  '⚡ Anlaşma Bozan Oynandı!',
                  `${activePlayer.username}, ${targetPlayer.username} adlı oyuncunun tamamlanmış "${COLOR_LABELS[targetColor]}" setini çaldı!`,
                  targetPlayer
                );
              }
            }
          }
        }
      } else if (card.actionType === 'forced-deal') {
        const targetId = payload?.targetPlayerId;
        const cardIdToSteal = payload?.targetCardId;
        const myCardIdToGive = payload?.myCardId;
        if (targetId && cardIdToSteal && myCardIdToGive) {
          const targetPlayer = match.players.find((p) => p.id === targetId);
          if (targetPlayer) {
            const jsnIdx = targetPlayer.hand.findIndex((c) => c.actionType === 'just-say-no');
            if (jsnIdx !== -1) {
              const jsnCard = targetPlayer.hand.splice(jsnIdx, 1)[0];
              updatedDiscard.push(jsnCard);
              match.logs.push({
                id: `bot-jsn-${Date.now()}`,
                message: `🛡️ ${targetPlayer.username} 'Hayır Deme Hakkı' (Reddet) kartını kullanarak senin Zoraki Takas hamleni engelledi!`,
                timestamp: Date.now(),
              });
              playJsnSound();

              match.activeActionRequest = {
                id: `req-${Date.now()}`,
                type: 'just-say-no',
                sourcePlayerId: targetPlayer.id,
                targetPlayerId: activePlayer.id,
                actionCard: card,
                targetCardId: cardIdToSteal,
                myCardId: myCardIdToGive,
                originalAction: {
                  type: 'forced-deal',
                  payload: { targetPlayerId: targetId, targetCardId: cardIdToSteal, myCardId: myCardIdToGive }
                },
                jsnCount: 1
              };
            } else {
              let stolenCard: Card | null = null;
              let givenCard: Card | null = null;
              let stolenColor: CardColor | null = null;
              let givenColor: CardColor | null = null;

              for (const colKey in targetPlayer.properties) {
                const col = colKey as CardColor;
                const propSet = targetPlayer.properties[col];
                if (propSet) {
                  const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
                  if (idx !== -1) {
                    stolenCard = propSet.cards.splice(idx, 1)[0];
                    stolenColor = col;
                    if (propSet.cards.length === 0) {
                      delete targetPlayer.properties[col];
                    }
                    break;
                  }
                }
              }

              for (const colKey in updatedPlayer.properties) {
                const col = colKey as CardColor;
                const propSet = updatedPlayer.properties[col];
                if (propSet) {
                  const idx = propSet.cards.findIndex((c) => c.id === myCardIdToGive);
                  if (idx !== -1) {
                    givenCard = propSet.cards.splice(idx, 1)[0];
                    givenColor = col;
                    if (propSet.cards.length === 0) {
                      delete updatedPlayer.properties[col];
                    }
                    break;
                  }
                }
              }

              if (stolenCard && givenCard) {
                const colS = stolenCard.color || stolenColor || 'brown';
                if (!updatedPlayer.properties[colS]) {
                  updatedPlayer.properties[colS] = { cards: [], hasHouse: false, hasHotel: false };
                }
                updatedPlayer.properties[colS]!.cards.push(stolenCard);

                const colG = givenCard.color || givenColor || 'brown';
                if (!targetPlayer.properties[colG]) {
                  targetPlayer.properties[colG] = { cards: [], hasHouse: false, hasHotel: false };
                }
                targetPlayer.properties[colG]!.cards.push(givenCard);

                triggerCardEffect(stolenCard.id, 'steal');
                triggerCardEffect(givenCard.id, 'steal');

                match.logs.push({
                  id: `fd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `${activePlayer.username}, ${targetPlayer.username} ile Zoraki Takas yaptı! ${givenCard.name} verdi ve ${stolenCard.name} aldı.`,
                  timestamp: Date.now(),
                });
                // Enforce building rules on both players because swaps could break sets for either of them
                enforceBuildingRules(updatedPlayer, match.discardPile);
                enforceBuildingRules(targetPlayer, match.discardPile);
                showActionToast(
                  'forced-deal',
                  '⇄ Zorunlu Anlaşma Oynandı!',
                  `${activePlayer.username}, ${targetPlayer.username} adlı oyuncu ile takas yaptı: "${givenCard.name}" mülkünü verdi, karşılığında "${stolenCard.name}" mülkünü aldı!`,
                  targetPlayer
                );
              }
            }
          }
        }
      }
    }

    const nextActionsCount = match.actionsPlayedThisTurn + actionsCost;

    setMatch({
      ...match,
      players: updatedPlayers,
      discardPile: updatedDiscard,
      actionsPlayedThisTurn: nextActionsCount,
    });

    setSelectedCard(null);
    setShowCardMenu(false);
  };

  const enforceBuildingRules = (player: GamePlayer, discardPile: Card[]) => {
    Object.keys(player.properties).forEach((colorKey) => {
      const col = colorKey as CardColor;
      const set = player.properties[col];
      if (!set) return;

      const maxRequired = MAX_IN_SET[col];
      const actualCount = set.cards.length;

      // If set is broken, strip any built houses or hotels and return to discard
      if (actualCount < maxRequired) {
        if (set.hasHotel) {
          discardPile.push({
            id: `hotel-disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'house-hotel',
            name: 'Otel',
            value: 4,
            actionType: 'hotel',
            description: 'Evi olan tamamlanmış bir sete eklenir ve kira bedelini +4M artırır. Set başına maksimum 1 otel.',
          });
          set.hasHotel = false;
          match?.logs.push({
            id: `building-loss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: `Sayı yetersizliğinden dolayı ${player.username} adlı oyuncunun ${COLOR_LABELS[col]} setindeki Otel yıkıldı ve ıskartaya gitti.`,
            timestamp: Date.now(),
          });
        }
        if (set.hasHouse) {
          discardPile.push({
            id: `house-disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'house-hotel',
            name: 'Ev',
            value: 3,
            actionType: 'house',
            description: 'Tamamlanmış bir sete eklenir ve kira bedelini +3M artırır. Set başına maksimum 1 ev.',
          });
          set.hasHouse = false;
          match?.logs.push({
            id: `building-loss-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: `Sayı yetersizliğinden dolayı ${player.username} adlı oyuncunun ${COLOR_LABELS[col]} setindeki Ev yıkıldı ve ıskartaya gitti.`,
            timestamp: Date.now(),
          });
        }
      }
    });
  };

  const transferOfflinePayment = (fromId: string, toId: string, cardIds: string[]) => {
    if (!match) return;

    const giver = match.players.find((p) => p.id === fromId);
    const receiver = match.players.find((p) => p.id === toId);
    if (!giver || !receiver) return;

    let valueTransferred = 0;

    cardIds.forEach((cid) => {
      // check bank
      const bIdx = giver.bank.findIndex((c) => c.id === cid);
      if (bIdx !== -1) {
        const card = giver.bank.splice(bIdx, 1)[0];
        receiver.bank.push(card);
        valueTransferred += card.value;
      } else {
        // check properties
        for (const colKey in giver.properties) {
          const col = colKey as CardColor;
          const set = giver.properties[col];
          if (set) {
            const pIdx = set.cards.findIndex((c) => c.id === cid);
            if (pIdx !== -1) {
              const card = set.cards.splice(pIdx, 1)[0];
              if (!receiver.properties[col]) {
                receiver.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
              }
              receiver.properties[col]!.cards.push(card);
              valueTransferred += card.value;
              break;
            }
          }
        }
      }
    });

    // Enforce building rules for the giver because their sets might have been broken by paying with properties
    enforceBuildingRules(giver, match.discardPile);

    match.logs.push({
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: `${giver.username}, ${receiver.username} adlı oyuncuya ${valueTransferred}M değerinde ödeme transferi yaptı.`,
      timestamp: Date.now(),
    });
    playCoinSound();

    // Track Career Stats & show beautiful action toast
    if (receiver.id === profile.id) {
      addCareerRent(valueTransferred);
    }

    // Check if receiver (we) bankrupted this player
    const giverBankTotal = giver.bank.reduce((sum, c) => sum + c.value, 0);
    const giverPropsTotal = Object.values(giver.properties).reduce((sum, set: any) => sum + (set?.cards?.length || 0), 0);
    if (giverBankTotal === 0 && giverPropsTotal === 0) {
      if (receiver.id === profile.id) {
        incrementCareerStat('bankruptcies');
        match.logs.push({
          id: `bankrupt-${Date.now()}`,
          message: `💥 ${giver.username} adlı oyuncu iflas etti! Tüm varlıkları ${receiver.username} adlı oyuncuya devredildi.`,
          timestamp: Date.now()
        });
      }
    }

    // Show toast with details
    showActionToast(
      'rent',
      '💰 Kira / Borç Ödemesi',
      `${giver.username}, ${receiver.username} adlı oyuncuya toplam ${valueTransferred}M değerinde ödeme transfer etti.`,
      giver
    );
  };

  const handleOfflineEndTurn = () => {
    if (!match) return;

    const player = match.players[match.turnIndex];
    if (player.hand.length > 7) {
      playAlertSound();
      alert('Elinizde 7\'den fazla kart var! Fazla kartları atmalısınız.');
      return;
    }

    // Move turn to Bot
    const nextTurnIdx = (match.turnIndex + 1) % match.players.length;
    match.turnIndex = nextTurnIdx;
    match.actionsPlayedThisTurn = 0;

    const nextPlayer = match.players[nextTurnIdx];
    match.logs.push({
      id: `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: `Sıra ${nextPlayer.username} adlı yapay zekaya geçti.`,
      timestamp: Date.now(),
    });

    triggerOfflineDraw(match);

    // Auto Bot Turn
    if (nextPlayer.isBot) {
      setTimeout(() => executeBotTurnOffline(), 1500);
    }
  };

  const resumeBotTurnOffline = () => {
    const currentMatch = matchRef.current;
    if (!currentMatch) return;
    const bot = currentMatch.players[currentMatch.turnIndex];
    if (bot && bot.isBot) {
      executeBotTurnOffline(botActionsPlayedRef.current);
    }
  };

  const executeBotTurnOffline = (initialActionsCount = 0) => {
    const currentMatch = matchRef.current;
    if (!currentMatch) return;

    const bot = currentMatch.players[currentMatch.turnIndex];
    if (!bot || !bot.isBot) return;

    setBotIsThinking(true);

    const human = currentMatch.players.find((p) => !p.isBot);
    botActionsPlayedRef.current = initialActionsCount;

    const playNextBotAction = () => {
      const activeMatch = matchRef.current;
      if (!activeMatch) return;
      if (activeMatch.activeActionRequest) {
        // Pause bot actions while human has a pending payment request
        return;
      }
      // Re-verify it is still playing and it is this bot's turn
      const currentBot = activeMatch.players[activeMatch.turnIndex];
      if (!currentBot || !currentBot.isBot) return;
      if (activeMatch.status !== 'playing' || currentBot.id !== bot.id) return;

      if (botActionsPlayedRef.current >= 3) {
        endBotTurn();
        return;
      }

      const decision = BotEngine.selectPlayAction(currentBot, activeMatch, botDifficulty);
      if (!decision) {
        endBotTurn();
        return;
      }

      const cardIdx = currentBot.hand.findIndex((c) => c.id === decision.cardId);
      if (cardIdx === -1) {
        endBotTurn();
        return;
      }

      const card = currentBot.hand[cardIdx];
      const activeHuman = activeMatch.players.find((p) => !p.isBot);

      if (decision.targetZone === 'bank') {
        currentBot.hand.splice(cardIdx, 1);
        currentBot.bank.push(card);
        activeMatch.logs.push({
          id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: `${currentBot.username}, bankaya ${card.value}M para ekledi.`,
          timestamp: Date.now(),
        });

        updateMatchState({ ...activeMatch });
        botActionsPlayedRef.current++;
        setTimeout(playNextBotAction, botDelay);

      } else if (decision.targetZone === 'property') {
        currentBot.hand.splice(cardIdx, 1);
        const col = decision.extraColor || card.color || 'brown';

        if (!currentBot.properties[col]) {
          currentBot.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
        }

        if (card.type === 'house-hotel') {
          if (card.actionType === 'house') currentBot.properties[col]!.hasHouse = true;
          else currentBot.properties[col]!.hasHotel = true;
          activeMatch.logs.push({
            id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: `${currentBot.username}, ${COLOR_LABELS[col]} grubuna ${card.name} dikti.`,
            timestamp: Date.now(),
          });
        } else {
          currentBot.properties[col]!.cards.push({ ...card, color: col });
          activeMatch.logs.push({
            id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: `${currentBot.username}, ${COLOR_LABELS[col]} grubuna mülk yerleştirdi.`,
            timestamp: Date.now(),
          });
        }

        if (checkWinnerWithSettings(currentBot.properties)) {
          handleOfflineWinner(currentBot.id);
          return;
        }

        updateMatchState({ ...activeMatch });
        botActionsPlayedRef.current++;
        setTimeout(playNextBotAction, botDelay);

      } else if (decision.targetZone === 'action') {
        currentBot.hand.splice(cardIdx, 1);
        activeMatch.discardPile.push(card);
        activeMatch.logs.push({
          id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: `${currentBot.username} aksiyon kartı oynadı: ${card.name}`,
          timestamp: Date.now(),
        });

        if (card.actionType === 'pass-go') {
          const serverDeck: Card[] = (activeMatch as any).serverDeck || [];
          const drawn = serverDeck.splice(0, 2);
          currentBot.hand.push(...drawn);
          activeMatch.deckCount = serverDeck.length;
          (activeMatch as any).serverDeck = serverDeck;
          activeMatch.logs.push({
            id: `bot-passgo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: `${currentBot.username} Başlangıç Noktasından Geçti ve 2 kart çekti!`,
            timestamp: Date.now(),
          });
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;
          setTimeout(playNextBotAction, botDelay);

        } else if (card.actionType === 'birthday' && activeHuman) {
          // Pause and request payment from the human player interactively!
          activeMatch.activeActionRequest = {
            id: `req-${Date.now()}`,
            type: 'make-payment',
            sourcePlayerId: currentBot.id,
            targetPlayerId: activeHuman.id,
            actionCard: card,
            amountDue: 2,
          };
          activeMatch.logs.push({
            id: `bot-bday-req-${Date.now()}`,
            message: `📣 ${currentBot.username} doğum günü kartı oynadı ve herkesten 2M talep ediyor!`,
            timestamp: Date.now(),
          });
          showActionToast(
            'info',
            '🎂 Doğum Günü Kutlaması!',
            `${currentBot.username} bir doğum günü partisi düzenledi! Senden 2M hediye talep ediyor!`,
            activeHuman
          );
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;

        } else if (card.actionType === 'debt-collector' && activeHuman) {
          const humanHasJsn = activeHuman.hand.some((c) => c.actionType === 'just-say-no');
          if (humanHasJsn) {
            activeMatch.activeActionRequest = {
              id: `req-${Date.now()}`,
              type: 'just-say-no',
              sourcePlayerId: currentBot.id,
              targetPlayerId: activeHuman.id,
              actionCard: card,
              amountDue: 5,
              originalAction: {
                type: 'debt-collector',
                payload: { targetPlayerId: activeHuman.id }
              },
              jsnCount: 0
            };
            activeMatch.logs.push({
              id: `bot-debt-jsn-${Date.now()}`,
              message: `📣 ${currentBot.username} Borç Tahsildarı kartı oynadı! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
              timestamp: Date.now(),
            });
            showActionToast(
              'debt-collector',
              '💼 Borç Tahsilatı Engeli!',
              `${currentBot.username} Borç Tahsildarı kartı oynadı! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
              activeHuman
            );
          } else {
            // Pause and request payment from the human player interactively!
            activeMatch.activeActionRequest = {
              id: `req-${Date.now()}`,
              type: 'make-payment',
              sourcePlayerId: currentBot.id,
              targetPlayerId: activeHuman.id,
              actionCard: card,
              amountDue: 5,
            };
            activeMatch.logs.push({
              id: `bot-debt-req-${Date.now()}`,
              message: `📣 ${currentBot.username} Borç Tahsildarı kartı oynadı ve senden 5M talep ediyor!`,
              timestamp: Date.now(),
            });
            showActionToast(
              'debt-collector',
              '💼 Haciz / Borç Tahsilatı!',
              `${currentBot.username} Tahsilat (Haciz) kartı oynadı! Senden 5M borç ödemeni istiyor!`,
              activeHuman
            );
          }
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;

        } else if (card.type === 'rent' && activeHuman) {
          const chosenColor = decision.extraColor || 'brown';
          const isDouble = decision.payload?.isDoubleRent || false;
          const set = currentBot.properties[chosenColor];
          if (set && set.cards.length > 0) {
            const baseCount = Math.min(set.cards.length, MAX_IN_SET[chosenColor]);
            let rentVal = set.cards[0].rentValues?.[baseCount - 1] || 1;
            if (set.hasHouse) rentVal += 3;
            if (set.hasHotel) rentVal += 4;
            if (isDouble) {
              rentVal *= 2;
              const drIdx = currentBot.hand.findIndex((c) => c.actionType === 'double-rent');
              if (drIdx !== -1) {
                const drCard = currentBot.hand.splice(drIdx, 1)[0];
                activeMatch.discardPile.push(drCard);
                activeMatch.logs.push({
                  id: `bot-play-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `${currentBot.username} Kirayı İkiye Katla kartını oynadı!`,
                  timestamp: Date.now(),
                });
              }
            }
            // Pause and request rent from the human player interactively!
            activeMatch.activeActionRequest = {
              id: `req-${Date.now()}`,
              type: 'make-payment',
              sourcePlayerId: currentBot.id,
              targetPlayerId: activeHuman.id,
              actionCard: card,
              amountDue: rentVal,
            };
            activeMatch.logs.push({
              id: `bot-rent-req-${Date.now()}`,
              message: `📣 ${currentBot.username}, ${COLOR_LABELS[chosenColor]} mülkleri için senden ${rentVal}M kira talep ediyor!`,
              timestamp: Date.now(),
            });
            showActionToast(
              'rent',
              '💰 Kira Tahsilat Talebi!',
              `${currentBot.username}, ${COLOR_LABELS[chosenColor]} mülkleri için senden ${rentVal}M kira talep ediyor!`,
              activeHuman
            );
          }
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;

        } else if (card.actionType === 'sly-deal' && activeHuman) {
          const cardIdToSteal = decision.payload?.targetCardId;
          if (cardIdToSteal) {
            const humanHasJsn = activeHuman.hand.some((c) => c.actionType === 'just-say-no');
            if (humanHasJsn) {
              activeMatch.activeActionRequest = {
                id: `req-${Date.now()}`,
                type: 'just-say-no',
                sourcePlayerId: currentBot.id,
                targetPlayerId: activeHuman.id,
                actionCard: card,
                targetCardId: cardIdToSteal,
                originalAction: {
                  type: 'sly-deal',
                  payload: { targetPlayerId: activeHuman.id, targetCardId: cardIdToSteal }
                },
                jsnCount: 0
              };
              activeMatch.logs.push({
                id: `bot-sly-jsn-${Date.now()}`,
                message: `📣 ${currentBot.username} Sinsi Anlaşma oynadı! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
                timestamp: Date.now(),
              });
              showActionToast(
                'sly-deal',
                '🥷 Sinsi Anlaşma Engeli!',
                `${currentBot.username} senden bir mülk çalmaya çalışıyor! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
                activeHuman
              );
            } else {
              let stolenCard: Card | null = null;
              let stolenColor: CardColor | null = null;
              for (const colKey in activeHuman.properties) {
                const col = colKey as CardColor;
                const propSet = activeHuman.properties[col];
                if (propSet) {
                  const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
                  if (idx !== -1) {
                    stolenCard = propSet.cards.splice(idx, 1)[0];
                    stolenColor = col;
                    if (propSet.cards.length === 0) {
                      delete activeHuman.properties[col];
                    }
                    break;
                  }
                }
              }
              if (stolenCard) {
                const col = stolenCard.color || stolenColor || 'brown';
                if (!currentBot.properties[col]) {
                  currentBot.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
                }
                currentBot.properties[col]!.cards.push(stolenCard);
                triggerCardEffect(stolenCard.id, 'steal');
                activeMatch.logs.push({
                  id: `bot-sly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `${currentBot.username}, senden ${stolenCard.name} mülkünü sinsi anlaşma ile çaldı!`,
                  timestamp: Date.now(),
                });
                enforceBuildingRules(activeHuman, activeMatch.discardPile);

                showActionToast(
                  'sly-deal',
                  '🥷 Sinsi Anlaşma Oynandı!',
                  `${currentBot.username} senden "${stolenCard.name}" mülkünü çaldı!`,
                  activeHuman
                );
              }
              setTimeout(playNextBotAction, botPaymentDelay);
            }
          }
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;

        } else if (card.actionType === 'deal-breaker' && activeHuman) {
          const targetColor = decision.payload?.targetColor as CardColor;
          if (targetColor) {
            const humanHasJsn = activeHuman.hand.some((c) => c.actionType === 'just-say-no');
            if (humanHasJsn) {
              activeMatch.activeActionRequest = {
                id: `req-${Date.now()}`,
                type: 'just-say-no',
                sourcePlayerId: currentBot.id,
                targetPlayerId: activeHuman.id,
                actionCard: card,
                targetColor: targetColor,
                originalAction: {
                  type: 'deal-breaker',
                  payload: { targetPlayerId: activeHuman.id, targetColor: targetColor }
                },
                jsnCount: 0
              };
              activeMatch.logs.push({
                id: `bot-db-jsn-${Date.now()}`,
                message: `📣 ${currentBot.username} Anlaşma Bozan oynadı! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
                timestamp: Date.now(),
              });
              showActionToast(
                'deal-breaker',
                '⚡ Anlaşma Bozan Engeli!',
                `${currentBot.username} tamamlanmış setini çalmaya çalışıyor! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
                activeHuman
              );
            } else {
              const propSet = activeHuman.properties[targetColor];
              if (propSet) {
                currentBot.properties[targetColor] = { ...propSet };
                delete activeHuman.properties[targetColor];
                propSet.cards.forEach((c) => triggerCardEffect(c.id, 'steal'));
                activeMatch.logs.push({
                  id: `bot-db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `${currentBot.username}, tamamlanmış ${COLOR_LABELS[targetColor]} setini Anlaşma Bozan kartı ile çaldı!`,
                  timestamp: Date.now(),
                });

                showActionToast(
                  'deal-breaker',
                  '⚡ Anlaşma Bozan Oynandı!',
                  `${currentBot.username} senin tamamlanmış "${COLOR_LABELS[targetColor]}" setini çaldı!`,
                  activeHuman
                );
              }
              setTimeout(playNextBotAction, botPaymentDelay);
            }
          }
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;

        } else if (card.actionType === 'forced-deal' && activeHuman) {
          const cardIdToSteal = decision.payload?.targetCardId;
          const myCardIdToGive = decision.payload?.myCardId;
          if (cardIdToSteal && myCardIdToGive) {
            const humanHasJsn = activeHuman.hand.some((c) => c.actionType === 'just-say-no');
            if (humanHasJsn) {
              activeMatch.activeActionRequest = {
                id: `req-${Date.now()}`,
                type: 'just-say-no',
                sourcePlayerId: currentBot.id,
                targetPlayerId: activeHuman.id,
                actionCard: card,
                targetCardId: cardIdToSteal,
                myCardId: myCardIdToGive,
                originalAction: {
                  type: 'forced-deal',
                  payload: { targetPlayerId: activeHuman.id, targetCardId: cardIdToSteal, myCardId: myCardIdToGive }
                },
                jsnCount: 0
              };
              activeMatch.logs.push({
                id: `bot-fd-jsn-${Date.now()}`,
                message: `📣 ${currentBot.username} Zoraki Takas oynadı! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
                timestamp: Date.now(),
              });
              showActionToast(
                'forced-deal',
                '⇄ Zoraki Takas Engeli!',
                `${currentBot.username} seninle zoraki takas yapmaya çalışıyor! Elinde 'Hayır Teşekkürler' kartı olduğu için savunma yapabilirsin!`,
                activeHuman
              );
            } else {
              let stolenCard: Card | null = null;
              let givenCard: Card | null = null;
              let stolenColor: CardColor | null = null;
              let givenColor: CardColor | null = null;

              for (const colKey in activeHuman.properties) {
                const col = colKey as CardColor;
                const propSet = activeHuman.properties[col];
                if (propSet) {
                  const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
                  if (idx !== -1) {
                    stolenCard = propSet.cards.splice(idx, 1)[0];
                    stolenColor = col;
                    if (propSet.cards.length === 0) {
                      delete activeHuman.properties[col];
                    }
                    break;
                  }
                }
              }

              for (const colKey in currentBot.properties) {
                const col = colKey as CardColor;
                const propSet = currentBot.properties[col];
                if (propSet) {
                  const idx = propSet.cards.findIndex((c) => c.id === myCardIdToGive);
                  if (idx !== -1) {
                    givenCard = propSet.cards.splice(idx, 1)[0];
                    givenColor = col;
                    if (propSet.cards.length === 0) {
                      delete currentBot.properties[col];
                    }
                    break;
                  }
                }
              }

              if (stolenCard && givenCard) {
                const colS = stolenCard.color || stolenColor || 'brown';
                if (!currentBot.properties[colS]) {
                  currentBot.properties[colS] = { cards: [], hasHouse: false, hasHotel: false };
                }
                currentBot.properties[colS]!.cards.push(stolenCard);

                const colG = givenCard.color || givenColor || 'brown';
                if (!activeHuman.properties[colG]) {
                  activeHuman.properties[colG] = { cards: [], hasHouse: false, hasHotel: false };
                }
                activeHuman.properties[colG]!.cards.push(givenCard);

                triggerCardEffect(stolenCard.id, 'steal');
                triggerCardEffect(givenCard.id, 'steal');

                activeMatch.logs.push({
                  id: `bot-fd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  message: `${currentBot.username}, seninle Zoraki Takas yaptı! ${givenCard.name} verdi ve ${stolenCard.name} aldı.`,
                  timestamp: Date.now(),
                });

                enforceBuildingRules(activeHuman, activeMatch.discardPile);
                enforceBuildingRules(currentBot, activeMatch.discardPile);

                showActionToast(
                  'forced-deal',
                  '⇄ Zorunlu Anlaşma Oynandı!',
                  `${currentBot.username} seninle takas yaptı: Sana "${givenCard.name}" mülkünü verdi, karşılığında "${stolenCard.name}" mülkünü aldı!`,
                  activeHuman
                );
              }
              setTimeout(playNextBotAction, botPaymentDelay);
            }
          }
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;
        } else {
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;
          setTimeout(playNextBotAction, botFinishDelay);
        }
      }
    };

    const endBotTurn = () => {
      setBotIsThinking(false);
      const activeMatch = matchRef.current;
      if (!activeMatch) return;

      const currentBot = activeMatch.players[activeMatch.turnIndex];
      if (!currentBot) return;

      // Bot discard excess
      while (currentBot.hand.length > 7) {
        const discId = BotEngine.selectDiscardCard(currentBot);
        if (discId) {
          const idx = currentBot.hand.findIndex((c) => c.id === discId);
          if (idx !== -1) {
            const card = currentBot.hand.splice(idx, 1)[0];
            activeMatch.discardPile.push(card);
            activeMatch.logs.push({
              id: `bot-disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              message: `${currentBot.username} elinden fazla olan ${card.name} kartını attı.`,
              timestamp: Date.now(),
            });
          }
        }
      }

      // End Bot Turn & Move to Next Player
      const nextTurnIdx = (activeMatch.turnIndex + 1) % activeMatch.players.length;
      activeMatch.turnIndex = nextTurnIdx;
      activeMatch.actionsPlayedThisTurn = 0;

      const nextPlayer = activeMatch.players[nextTurnIdx];
      if (nextPlayer.isBot) {
        activeMatch.logs.push({
          id: `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: `Sıra ${nextPlayer.username} adlı yapay zekaya geçti.`,
          timestamp: Date.now(),
        });
        triggerOfflineDraw(activeMatch);
        updateMatchState({ ...activeMatch });
        setTimeout(() => executeBotTurnOffline(), 1500);
      } else {
        activeMatch.logs.push({
          id: `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message: `Sıra tekrar senin! Başarılar.`,
          timestamp: Date.now(),
        });
        triggerOfflineDraw(activeMatch);
        updateMatchState({ ...activeMatch });
      }
    };

    playNextBotAction();
  };

  const handleOfflineWinner = (winnerId: string) => {
    if (!match) return;

    const winner = match.players.find((p) => p.id === winnerId);
    setMatch({
      ...match,
      status: 'finished',
      winnerId,
      logs: [
        ...match.logs,
        { id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, message: `Maçı ${winner?.username} kazandı! Oyun bitti.`, timestamp: Date.now() },
      ],
    });

    // Award XP/Coins to the profile
    if (winnerId === profile.id) {
      sounds.playCelebration(profile.settings.celebrationSound, profile.settings);
      const updatedProfile = {
        ...profile,
        coins: profile.coins + 150,
        xp: profile.xp + 100,
      };
      updatedProfile.stats.gamesPlayed++;
      updatedProfile.stats.gamesWon++;
      updatedProfile.stats.totalSetsCompleted += 3;
      // Complete daily quest
      updatedProfile.dailyQuests.forEach((q) => {
        if (q.description.includes('bot') || q.description.includes('Pratik')) {
          q.currentValue = Math.min(q.targetValue, q.currentValue + 1);
          if (q.currentValue >= q.targetValue) q.completed = true;
        }
      });

      if (!updatedProfile.gamesHistory) updatedProfile.gamesHistory = [];
      const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      updatedProfile.gamesHistory.unshift({
        id: `match-offline-${Date.now()}`,
        date: dateStr,
        opponent: 'Bot Memo, Bot Can',
        result: 'won',
        coinsEarned: 150,
        xpEarned: 100,
      });

      onUpdateProfile(updatedProfile);
    } else {
      sounds.playDefeat(profile.settings);
      const updatedProfile = {
        ...profile,
        coins: profile.coins + 30,
        xp: profile.xp + 30,
      };
      updatedProfile.stats.gamesPlayed++;
      updatedProfile.stats.gamesLost++;

      if (!updatedProfile.gamesHistory) updatedProfile.gamesHistory = [];
      const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      updatedProfile.gamesHistory.unshift({
        id: `match-offline-${Date.now()}`,
        date: dateStr,
        opponent: 'Bot Memo, Bot Can',
        result: 'lost',
        coinsEarned: 30,
        xpEarned: 30,
      });

      onUpdateProfile(updatedProfile);
    }
  };

  const handleOfflineDiscard = (cardId: string) => {
    if (!match) return;
    const player = match.players[0];
    const idx = player.hand.findIndex((c) => c.id === cardId);
    if (idx !== -1) {
      const card = player.hand.splice(idx, 1)[0];
      match.discardPile.push(card);
      match.logs.push({
        id: `disc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: `${player.username} elinden ${card.name} kartını attı.`,
        timestamp: Date.now(),
      });
      playCardDiscardSound();
      setMatch({ ...match });
    }
  };

  const handleOfflineChangeWildcardColor = (cardId: string, newColor: CardColor) => {
    if (!match) return;

    const activePlayer = match.players[match.turnIndex];
    const updatedPlayers = [...match.players];
    const updatedPlayer = { ...activePlayer };
    updatedPlayers[match.turnIndex] = updatedPlayer;

    let foundCard: Card | null = null;

    for (const colKey in updatedPlayer.properties) {
      const col = colKey as CardColor;
      const propSet = updatedPlayer.properties[col];
      if (propSet) {
        const idx = propSet.cards.findIndex((c) => c.id === cardId);
        if (idx !== -1) {
          foundCard = propSet.cards.splice(idx, 1)[0];
          if (propSet.cards.length === 0) {
            delete updatedPlayer.properties[col];
          }
          break;
        }
      }
    }

    if (foundCard) {
      if (foundCard.isWildcard && foundCard.secondaryColor && newColor === foundCard.secondaryColor) {
        const temp = foundCard.color;
        foundCard.color = newColor;
        foundCard.secondaryColor = temp;
      } else {
        foundCard.color = newColor;
      }
      if (!updatedPlayer.properties[newColor]) {
        updatedPlayer.properties[newColor] = { cards: [], hasHouse: false, hasHotel: false };
      }
      updatedPlayer.properties[newColor]!.cards.push(foundCard);

      match.logs.push({
        id: `change-col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: `${activePlayer.username}, ${foundCard.name} kartının rengini ${COLOR_LABELS[newColor]} olarak değiştirdi.`,
        timestamp: Date.now(),
      });
      playPlaySound();

      if (checkWinnerWithSettings(updatedPlayer.properties)) {
        handleOfflineWinner(updatedPlayer.id);
        return;
      }
    }

    setMatch({
      ...match,
      players: updatedPlayers,
    });
  };

  // --- MULTIPLAYER ACTIONS VIA WEBSOCKET ---
  const handleAddBotMultiplayer = () => {
    socketRef.current?.send(JSON.stringify({ type: 'add_bot', userId: profile.id, roomId }));
  };

  const handleStartGameMultiplayer = () => {
    socketRef.current?.send(JSON.stringify({ type: 'start_game', userId: profile.id, roomId }));
  };

  const resetServerAfkTimer = () => {
    if (!isOffline && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'reset_afk', userId: profile.id, roomId }));
    }
  };

  const handlePlayCardMultiplayer = (cardId: string, zone: 'bank' | 'property' | 'action', extraColor?: CardColor, payload?: any) => {
    if (!match) return;

    if (match.activeActionRequest) {
      playAlertSound();
      alert("Şu an aktif bir ödeme veya hamle talebi var. Bu talep çözülene kadar yeni kart oynayamazsınız!");
      return;
    }

    let actionsCost = 1;
    if (zone === 'action' && payload?.isDoubleRent) {
      actionsCost = 2;
    }

    if (match.actionsPlayedThisTurn + actionsCost > 3) {
      playAlertSound();
      alert("Bu turda en fazla 3 hamle yapabilirsiniz! Lütfen turunuzu sonlandırın.");
      return;
    }

    socketRef.current?.send(
      JSON.stringify({ type: 'play_card', userId: profile.id, roomId, cardId, targetZone: zone, extraColor, ...payload })
    );
    setSelectedCard(null);
    setShowCardMenu(false);
  };

  const handleChangeWildcardColorMultiplayer = (cardId: string, newColor: CardColor) => {
    socketRef.current?.send(
      JSON.stringify({ type: 'change_wildcard_color', userId: profile.id, roomId, cardId, newColor })
    );
  };

  const handleEndTurnMultiplayer = () => {
    if (match?.activeActionRequest) {
      playAlertSound();
      alert("Aktif bir ödeme veya hamle talebi varken turunuzu sonlandıramazsınız!");
      return;
    }
    socketRef.current?.send(JSON.stringify({ type: 'end_turn', userId: profile.id, roomId }));
  };

  const handleDiscardMultiplayer = (cardId: string) => {
    socketRef.current?.send(JSON.stringify({ type: 'discard_card', userId: profile.id, roomId, cardId }));
  };

  const handleRespondActionRequest = (decision: 'just-say-no' | 'pay' | 'decline') => {
    if (decision === 'pay' && myActiveRequest) {
      const amountDue = myActiveRequest.amountDue;

      let totalBankValue = 0;
      localPlayer.bank.forEach((c) => totalBankValue += c.value);

      let totalPropertiesValue = 0;
      let totalPropertiesCount = 0;
      Object.values(localPlayer.properties).forEach((set: any) => {
        if (set && set.cards) {
          set.cards.forEach((c: any) => {
            totalPropertiesValue += c.value;
            totalPropertiesCount++;
          });
        }
      });

      const totalAssetsValue = totalBankValue + totalPropertiesValue;
      const totalCardsCount = localPlayer.bank.length + totalPropertiesCount;

      if (totalAssetsValue > 0) {
        let selectedBankValue = 0;
        let selectedPropertiesValue = 0;
        let selectedCount = 0;

        paymentSelection.forEach((id) => {
          const bc = localPlayer.bank.find((card) => card.id === id);
          if (bc) {
            selectedBankValue += bc.value;
            selectedCount++;
          } else {
            for (const col in localPlayer.properties) {
              const pc = (localPlayer.properties[col as CardColor] as any)?.cards.find((card: any) => card.id === id);
              if (pc) {
                selectedPropertiesValue += pc.value;
                selectedCount++;
              }
            }
          }
        });

        const selectedTotalValue = selectedBankValue + selectedPropertiesValue;
        const targetAmount = Math.min(amountDue, totalAssetsValue);

        // Relaxed validation: Just make sure selected total is at least targetAmount (which is min of amountDue and total assets)
        if (selectedTotalValue < targetAmount) {
          playAlertSound();
          alert(`Yetersiz ödeme miktarı! En az ${targetAmount}M değerinde varlık seçmelisiniz. (Şu an seçilen: ${selectedTotalValue}M)`);
          return;
        }

        if (totalAssetsValue < amountDue && selectedCount < totalCardsCount) {
          playAlertSound();
          alert(`Borcu ödeyecek yeterli varlığınız yok! Bu durumda önünüzdeki ve bankanızdaki TÜM kartları seçmelisiniz (Borç: ${amountDue}M, Toplam Varlığınız: ${totalAssetsValue}M).`);
          return;
        }
      }
    }

    if (isOffline) {
      const activeMatch = matchRef.current;
      if (!activeMatch || !activeMatch.activeActionRequest) return;
      const activeReq = activeMatch.activeActionRequest;
      const targetPlayer = activeMatch.players.find((p) => p.id === activeReq.targetPlayerId);
      const sourcePlayer = activeMatch.players.find((p) => p.id === activeReq.sourcePlayerId);
      if (!targetPlayer || !sourcePlayer) return;

      const executeOriginalActionOffline = (req: any, selectedCards: string[]) => {
        const activeMatch2 = matchRef.current;
        if (!activeMatch2) return;
        const sPlayer = activeMatch2.players.find((p) => p.id === req.sourcePlayerId);
        const tPlayer = activeMatch2.players.find((p) => p.id === req.targetPlayerId);
        if (!sPlayer || !tPlayer) return;

        const type = req.originalAction?.type || req.actionCard?.actionType || req.actionCard?.type;

        if (type === 'sly-deal') {
          const cardIdToSteal = req.targetCardId;
          let stolenCard: Card | null = null;
          let stolenColor: CardColor | null = null;

          for (const colKey in tPlayer.properties) {
            const col = colKey as CardColor;
            const propSet = tPlayer.properties[col];
            if (propSet) {
              const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
              if (idx !== -1) {
                stolenCard = propSet.cards.splice(idx, 1)[0];
                stolenColor = col;
                if (propSet.cards.length === 0) {
                  delete tPlayer.properties[col];
                }
                break;
              }
            }
          }

          if (stolenCard) {
            const col = stolenCard.color || stolenColor || 'brown';
            if (!sPlayer.properties[col]) {
              sPlayer.properties[col] = { cards: [], hasHouse: false, hasHotel: false };
            }
            sPlayer.properties[col]!.cards.push(stolenCard);
            triggerCardEffect(stolenCard.id, 'steal');
            activeMatch2.logs.push({
              id: `sly-resolve-${Date.now()}`,
              message: `🎯 ${sPlayer.username}, ${tPlayer.username} adlı oyuncudan ${stolenCard.name} mülkünü çaldı!`,
              timestamp: Date.now(),
            });
            enforceBuildingRules(tPlayer, activeMatch2.discardPile);
          }

        } else if (type === 'deal-breaker') {
          const targetColor = req.targetColor;
          if (targetColor) {
            const propSet = tPlayer.properties[targetColor];
            if (propSet) {
              sPlayer.properties[targetColor] = { ...propSet };
              delete tPlayer.properties[targetColor];
              propSet.cards.forEach((c) => triggerCardEffect(c.id, 'steal'));
              activeMatch2.logs.push({
                id: `db-resolve-${Date.now()}`,
                message: `🎯 ${sPlayer.username}, ${tPlayer.username} adlı oyuncunun tamamlanmış ${COLOR_LABELS[targetColor]} setini çaldı!`,
                timestamp: Date.now(),
              });
              setShowDealBreakerAnimation({
                source: sPlayer.username,
                target: tPlayer.username,
                color: targetColor,
              });
              setTimeout(() => setShowDealBreakerAnimation(null), 4000);
            }
          }

        } else if (type === 'forced-deal') {
          const cardIdToSteal = req.targetCardId;
          const myCardIdToGive = req.myCardId;

          let stolenCard: Card | null = null;
          let givenCard: Card | null = null;
          let stolenColor: CardColor | null = null;
          let givenColor: CardColor | null = null;

          for (const colKey in tPlayer.properties) {
            const col = colKey as CardColor;
            const propSet = tPlayer.properties[col];
            if (propSet) {
              const idx = propSet.cards.findIndex((c) => c.id === cardIdToSteal);
              if (idx !== -1) {
                stolenCard = propSet.cards.splice(idx, 1)[0];
                stolenColor = col;
                if (propSet.cards.length === 0) {
                  delete tPlayer.properties[col];
                }
                break;
              }
            }
          }

          for (const colKey in sPlayer.properties) {
            const col = colKey as CardColor;
            const propSet = sPlayer.properties[col];
            if (propSet) {
              const idx = propSet.cards.findIndex((c) => c.id === myCardIdToGive);
              if (idx !== -1) {
                givenCard = propSet.cards.splice(idx, 1)[0];
                givenColor = col;
                if (propSet.cards.length === 0) {
                  delete sPlayer.properties[col];
                }
                break;
              }
            }
          }

          if (stolenCard && givenCard) {
            const colS = stolenCard.color || stolenColor || 'brown';
            if (!sPlayer.properties[colS]) {
              sPlayer.properties[colS] = { cards: [], hasHouse: false, hasHotel: false };
            }
            sPlayer.properties[colS]!.cards.push(stolenCard);

            const colG = givenCard.color || givenColor || 'brown';
            if (!tPlayer.properties[colG]) {
              tPlayer.properties[colG] = { cards: [], hasHouse: false, hasHotel: false };
            }
            tPlayer.properties[colG]!.cards.push(givenCard);

            triggerCardEffect(stolenCard.id, 'steal');
            triggerCardEffect(givenCard.id, 'steal');

            activeMatch2.logs.push({
              id: `forced-resolve-${Date.now()}`,
              message: `🎯 ${sPlayer.username}, ${tPlayer.username} ile ${stolenCard.name} karşılığında ${givenCard.name} mülkünü takas etti!`,
              timestamp: Date.now(),
            });

            enforceBuildingRules(tPlayer, activeMatch2.discardPile);
            enforceBuildingRules(sPlayer, activeMatch2.discardPile);
          }

        } else {
          // Payment requests (rent, debt-collector, birthday)
          transferOfflinePayment(tPlayer.id, sPlayer.id, selectedCards);
          selectedCards.forEach((cardId) => triggerCardEffect(cardId, 'gold'));
          activeMatch2.logs.push({
            id: `payment-resolve-${Date.now()}`,
            message: `🎯 ${tPlayer.username}, ${sPlayer.username} adlı oyuncuya ödemesini yaptı!`,
            timestamp: Date.now(),
          });
        }

        // Check winner
        if (checkWinnerWithSettings(sPlayer.properties)) {
          handleOfflineWinner(sPlayer.id);
        } else if (checkWinnerWithSettings(tPlayer.properties)) {
          handleOfflineWinner(tPlayer.id);
        }
      };

      if (decision === 'just-say-no') {
        const jsnIdx = targetPlayer.hand.findIndex((c) => c.actionType === 'just-say-no');
        if (jsnIdx !== -1) {
          const jsnCard = targetPlayer.hand.splice(jsnIdx, 1)[0];
          activeMatch.discardPile.push(jsnCard);
          activeMatch.logs.push({
            id: `jsn-${Date.now()}`,
            message: `${targetPlayer.username}, 'Hayır Deme Hakkı' kullanarak ${sourcePlayer.username}'in hamlesine karşı koydu!`,
            timestamp: Date.now(),
          });
          playJsnSound();
          setShowShieldDefenseFor(targetPlayer.username);
          setTimeout(() => setShowShieldDefenseFor(null), 3500);

          // Increment JSN count and swap roles
          activeReq.jsnCount = (activeReq.jsnCount || 0) + 1;
          const prevSource = activeReq.sourcePlayerId;
          activeReq.sourcePlayerId = activeReq.targetPlayerId;
          activeReq.targetPlayerId = prevSource;

          // If the new target is a BOT, the bot decides to counter-defend!
          const newTargetPlayer = activeMatch.players.find((p) => p.id === activeReq.targetPlayerId);
          if (newTargetPlayer && newTargetPlayer.isBot) {
            const botHasJsn = newTargetPlayer.hand.some((c) => c.actionType === 'just-say-no');
            if (botHasJsn) {
              const botJsnIdx = newTargetPlayer.hand.findIndex((c) => c.actionType === 'just-say-no');
              const botJsnCard = newTargetPlayer.hand.splice(botJsnIdx, 1)[0];
              activeMatch.discardPile.push(botJsnCard);
              activeMatch.logs.push({
                id: `jsn-bot-counter-${Date.now()}`,
                message: `🛡️ ${newTargetPlayer.username} 'Hayır Teşekkürler' diyerek senin 'Hayır' savunmanı iptal etti! (Reddete Redet!)`,
                timestamp: Date.now(),
              });
              playJsnSound();
              setShowShieldDefenseFor(newTargetPlayer.username);
              setTimeout(() => setShowShieldDefenseFor(null), 3500);

              // Increment JSN count and swap roles back to human
              activeReq.jsnCount = (activeReq.jsnCount || 0) + 1;
              const prevSource2 = activeReq.sourcePlayerId;
              activeReq.sourcePlayerId = activeReq.targetPlayerId;
              activeReq.targetPlayerId = prevSource2;

              setRecoveryAlert({
                message: `🛡️ ${newTargetPlayer.username} 'Hayır Teşekkürler' diyerek senin savunmanı engelledi!`,
                type: 'warning',
              });
              setTimeout(() => setRecoveryAlert(null), 4000);

              updateMatchState({ ...activeMatch });
              return;
            } else {
              // Bot has no JSN! Check if original action should execute (even count of JSNs means defense was canceled)
              const finalJsnCount = activeReq.jsnCount || 0;
              if (finalJsnCount % 2 === 0) {
                // Sender successfully countered target's defense! Execute the action.
                executeOriginalActionOffline(activeReq, paymentSelection);

                activeMatch.logs.push({
                  id: `jsn-win-human-${Date.now()}`,
                  message: `🎯 Savunma iptal edildi! Hamle başarıyla uygulandı.`,
                  timestamp: Date.now(),
                });

                setRecoveryAlert({
                  message: `🎯 Savunma engellendi! Hamlen başarıyla uygulandı.`,
                  type: 'success',
                });
                setTimeout(() => setRecoveryAlert(null), 4000);
              } else {
                // Defense succeeds, action is blocked
                activeMatch.logs.push({
                  id: `jsn-win-bot-${Date.now()}`,
                  message: `🛡️ Savunma başarılı oldu! ${targetPlayer.username}'in hamlesi engellendi.`,
                  timestamp: Date.now(),
                });

                setRecoveryAlert({
                  message: `✅ Savunma başarılı oldu! Senden istenen hamle başarıyla engellendi.`,
                  type: 'success',
                });
                setTimeout(() => setRecoveryAlert(null), 4000);
              }

              const updatedMatch = { ...activeMatch };
              delete updatedMatch.activeActionRequest;
              updateMatchState(updatedMatch);
              setPaymentSelection([]);
              setTimeout(() => {
                resumeBotTurnOffline();
              }, 1000);
              return;
            }
          } else {
            // Target human player to respond to counter JSN
            setRecoveryAlert({
              message: `🛡️ "Hayır Deme Hakkı" (Reddet) kartı kullanıldı! Savunma sırası rakipte.`,
              type: 'info',
            });
            setTimeout(() => setRecoveryAlert(null), 4000);

            updateMatchState({ ...activeMatch });
            return;
          }
        }
      } else if (decision === 'decline') {
        const jsnCount = activeReq.jsnCount || 0;
        if (jsnCount % 2 === 1) {
          activeMatch.logs.push({
            id: `jsn-win-decline-${Date.now()}`,
            message: `🛡️ Savunma başarılı oldu! Hamle engellendi.`,
            timestamp: Date.now(),
          });

          setRecoveryAlert({
            message: `🛡️ Savunma başarılı oldu! Hamle engellendi.`,
            type: 'success',
          });
          setTimeout(() => setRecoveryAlert(null), 4000);

          const updatedMatch = { ...activeMatch };
          delete updatedMatch.activeActionRequest;
          updateMatchState(updatedMatch);
        } else {
          executeOriginalActionOffline(activeReq, paymentSelection);

          setRecoveryAlert({
            message: `🛑 Hamle kabul edildi ve sonuçları uygulandı.`,
            type: 'info',
          });
          setTimeout(() => setRecoveryAlert(null), 4000);

          const updatedMatch = { ...activeMatch };
          delete updatedMatch.activeActionRequest;
          updateMatchState(updatedMatch);
        }
      } else if (decision === 'pay') {
        executeOriginalActionOffline(activeReq, paymentSelection);

        setRecoveryAlert({
          message: `💵 Ödeme başarıyla yapıldı ve varlıklar teslim edildi!`,
          type: 'success',
        });
        setTimeout(() => setRecoveryAlert(null), 4000);

        const updatedMatch = { ...activeMatch };
        delete updatedMatch.activeActionRequest;
        updateMatchState(updatedMatch);
      }

      setPaymentSelection([]);

      // Trigger bot resume
      setTimeout(() => {
        resumeBotTurnOffline();
      }, 1000);
      return;
    }

    socketRef.current?.send(
      JSON.stringify({
        type: 'action_response',
        userId: profile.id,
        roomId,
        actionRequestId: myActiveRequest?.id,
        decision,
        paymentCardIds: decision === 'pay' ? paymentSelection : [],
      })
    );
    setPaymentSelection([]);
  };

  const myActiveRequest = React.useMemo(() => {
    if (!match) return null;
    if (match.activeActionRequests && match.activeActionRequests.length > 0) {
      return match.activeActionRequests.find((r) => r.targetPlayerId === profile.id) || null;
    }
    if (match.activeActionRequest && match.activeActionRequest.targetPlayerId === profile.id) {
      return match.activeActionRequest;
    }
    return null;
  }, [match?.activeActionRequests, match?.activeActionRequest, profile.id]);

  // Chat message send
  const [chatText, setChatText] = React.useState('');
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatText.trim() === '') return;

    if (isOffline) {
      setMatch((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          logs: [
            ...prev.logs,
            { id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, playerName: profile.username, message: chatText, timestamp: Date.now() },
          ],
        };
      });
    } else {
      socketRef.current?.send(JSON.stringify({ type: 'send_chat', userId: profile.id, roomId, text: chatText }));
    }
    setChatText('');
  };

  if (!match) return <div className="text-center py-20 text-white font-bold">Oda yükleniyor...</div>;

  const localPlayer = match.players.find((p) => p.id === profile.id) || match.players[0];
  const otherPlayers = match.players.filter((p) => p.id !== localPlayer.id);
  const isMyTurn = match.players[match.turnIndex]?.id === localPlayer.id;

  const hasActiveRequest = !!match.activeActionRequest || (!!match.activeActionRequests && match.activeActionRequests.length > 0);

  const checkActionPlayability = (card: Card): { playable: boolean; reason?: string } => {
    if (card.actionType === 'just-say-no') {
      return { playable: false, reason: 'Hayır Teşekkürler kartı sadece rakibin size karşı oynadığı hamlelerde savunma olarak kullanılabilir.' };
    }
    if (card.actionType === 'double-rent') {
      return { playable: false, reason: 'Kirayı İkiye Katla kartı kendi başına oynanamaz, sadece bir kira kartı oynarken birlikte kullanılabilir.' };
    }

    if (card.type === 'rent') {
      const isMultiRent = card.name.includes('Her Renk') || !card.color;
      if (isMultiRent) {
        const ownsAny = Object.values(localPlayer.properties).some((set: any) => set && set.cards.length > 0);
        if (!ownsAny) {
          return { playable: false, reason: 'Kira talep edebilmek için önünüzde en az bir mülk bulunmalıdır!' };
        }
      } else {
        const allowed: CardColor[] = [];
        if (card.color) allowed.push(card.color);
        if (card.secondaryColor) allowed.push(card.secondaryColor);
        if (card.allowedColors) {
          card.allowedColors.forEach((col) => allowed.push(col as CardColor));
        }

        const ownsAnyAllowed = allowed.some((col) => {
          const set = localPlayer.properties[col];
          return set && set.cards.length > 0;
        });

        if (!ownsAnyAllowed) {
          const colorNames = allowed.map((col) => COLOR_LABELS[col]).join(' veya ');
          return { playable: false, reason: `Bu kira kartını oynamak için ${colorNames} renklerinden en az bir mülke sahip olmalısınız!` };
        }
      }
    }

    if (card.actionType === 'deal-breaker') {
      const hasCompletedSet = otherPlayers.some((op) =>
        Object.keys(op.properties).some((col) => {
          const set = op.properties[col as CardColor];
          return set && set.cards.length >= MAX_IN_SET[col as CardColor];
        })
      );
      if (!hasCompletedSet) {
        return { playable: false, reason: 'Rakiplerinizin çalınabilecek tamamlanmış bir mülk seti bulunmuyor!' };
      }
    }

    if (card.actionType === 'sly-deal') {
      const hasIncompleteProp = otherPlayers.some((op) =>
        Object.keys(op.properties).some((col) => {
          const set = op.properties[col as CardColor];
          return set && set.cards.length > 0 && set.cards.length < MAX_IN_SET[col as CardColor];
        })
      );
      if (!hasIncompleteProp) {
        return { playable: false, reason: 'Rakiplerinizin çalınabilecek tamamlanmamış bir mülkü bulunmuyor!' };
      }
    }

    if (card.actionType === 'forced-deal') {
      const myIncompleteProp = Object.keys(localPlayer.properties).some((col) => {
        const set = localPlayer.properties[col as CardColor];
        return set && set.cards.length > 0 && set.cards.length < MAX_IN_SET[col as CardColor];
      });
      if (!myIncompleteProp) {
        return { playable: false, reason: 'Zoraki takas yapabilmek için önünüzde tamamlanmamış en az bir mülk bulunmalıdır!' };
      }

      const oppIncompleteProp = otherPlayers.some((op) =>
        Object.keys(op.properties).some((col) => {
          const set = op.properties[col as CardColor];
          return set && set.cards.length > 0 && set.cards.length < MAX_IN_SET[col as CardColor];
        })
      );
      if (!oppIncompleteProp) {
        return { playable: false, reason: 'Rakiplerinizin takas edilebilecek tamamlanmamış bir mülkü bulunmuyor!' };
      }
    }

    return { playable: true };
  };

  const checkHouseHotelPlayability = (card: Card): { playable: boolean; reason?: string } => {
    if (card.actionType === 'house') {
      const hasEligibleSet = Object.keys(localPlayer.properties).some((colorKey) => {
        const col = colorKey as CardColor;
        if (col === 'railroad' || col === 'utility') return false;
        const set = localPlayer.properties[col];
        return set && set.cards.length >= MAX_IN_SET[col] && !set.hasHouse;
      });
      if (!hasEligibleSet) {
        return { playable: false, reason: 'Ev yerleştirmek için ev bulunmayan tamamlanmış renkli bir setiniz (Kahve, Kırmızı vb.) olmalıdır!' };
      }
    }

    if (card.actionType === 'hotel') {
      const hasEligibleSet = Object.keys(localPlayer.properties).some((colorKey) => {
        const col = colorKey as CardColor;
        if (col === 'railroad' || col === 'utility') return false;
        const set = localPlayer.properties[col];
        return set && set.cards.length >= MAX_IN_SET[col] && set.hasHouse && !set.hasHotel;
      });
      if (!hasEligibleSet) {
        return { playable: false, reason: 'Otel yerleştirmek için zaten evi olan tamamlanmış bir setiniz olmalıdır!' };
      }
    }

    return { playable: true };
  };

  // Dynamic board background
  // Dynamic board background
  const themeHexMap: Record<string, string> = {
    theme_slate: '#0F172A',
    theme_green: '#064E3B',
    theme_purple: '#3B0764',
    theme_cyberpunk: '#050B14',
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
  };
  const themeHex = themeHexMap[profile.settings.boardTheme] || '#0F172A';

  const cardBackBgMap: Record<string, string> = {
    back_classic: 'linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)',
    back_cosmic: 'linear-gradient(135deg, #020617 0%, #1E1B4B 100%)',
    back_gold: 'linear-gradient(135deg, #78350F 0%, #F59E0B 100%)',
    back_neon: 'linear-gradient(135deg, #4C0519 0%, #DB2777 100%)',
    back_fire: 'linear-gradient(135deg, #7F1D1D 0%, #F97316 100%)',
    back_ice: 'linear-gradient(135deg, #0891B2 0%, #06b6d4 100%)',
    back_void: 'linear-gradient(135deg, #2e1065 0%, #030712 100%)',
    back_matrix: 'linear-gradient(135deg, #064e3b 0%, #020617 100%)',
    back_rainbow: 'linear-gradient(90deg, #ef4444 0%, #eab308 25%, #22c55e 50%, #3b82f6 75%, #a855f7 100%)',
    back_bubble: 'linear-gradient(135deg, #0ea5e9 0%, #f472b6 100%)',
    back_steampunk: 'linear-gradient(135deg, #7c2d12 0%, #4b5563 100%)',
    back_laser: 'linear-gradient(135deg, #4c1d95 0%, #86198f 100%)',
    back_galaxy: 'linear-gradient(135deg, #312e81 0%, #4c1d95 100%)',
    back_darkness: 'linear-gradient(135deg, #030712 0%, #111827 100%)',
  };
  const cardBackBg = cardBackBgMap[profile.settings.cardBack] || 'linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)';

  const cardBackPatternMap: Record<string, string> = {
    back_classic: '◆',
    back_cosmic: '★',
    back_gold: '♛',
    back_neon: '▲',
    back_fire: '🔥',
    back_ice: '❄️',
    back_void: '🌀',
    back_matrix: '💾',
    back_rainbow: '🌈',
    back_bubble: '🫧',
    back_steampunk: '⚙️',
    back_laser: '⚡',
    back_galaxy: '🌌',
    back_darkness: '👁️',
  };
  const cardBackPattern = cardBackPatternMap[profile.settings.cardBack] || '◆';

  return (
    <div
      id="game-room"
      onClick={resetServerAfkTimer}
      onPointerDown={resetServerAfkTimer}
      onMouseMove={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
      }}
      className={`h-[100dvh] w-screen overflow-hidden text-white font-sans flex flex-col justify-between select-none relative${showDealBreakerAnimation ? ' vfx-meteor-shake' : ''}`}
    >
      {/* 1. Dynamic Canvas Particle Background */}
      <CanvasBackground theme={profile.settings.boardTheme || 'theme_classic'} />

      {/* Coin Flying Overlay */}
      <AnimatePresence>
        {flyingCoins.map((fc) => (
          <motion.div
            key={fc.id}
            initial={{ y: '-5%', x: `${fc.x}%`, opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{
              y: ['-5%', '90%'],
              x: [`${fc.x}%`, `${fc.x + (Math.random() * 15 - 7.5)}%`],
              opacity: [0, 1, 1, 0],
              rotate: [0, 720],
              scale: [0.5, 1.2, 0.8]
            }}
            transition={{ duration: 1.8, delay: fc.delay, ease: 'easeIn' }}
            className="absolute text-xl z-50 pointer-events-none"
          >
            🟡
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ☄️ Meteor Strike VFX Overlay (vfx_meteor) */}
      <AnimatePresence>
        {showDealBreakerAnimation && (
          <motion.div
            key="vfx-meteor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="vfx-meteor-container"
          >
            <div className="vfx-meteor-rock" />
            <div className="vfx-meteor-shockwave" />
            {/* Particle burst */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-400"
                style={{ top: '50%', left: '50%' }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((i / 8) * Math.PI * 2) * (60 + Math.random() * 80),
                  y: Math.sin((i / 8) * Math.PI * 2) * (60 + Math.random() * 80),
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🛡️ Mirror Shield VFX Overlay (vfx_mirror_shield) */}
      <AnimatePresence>
        {showShieldDefenseFor && (
          <motion.div
            key="vfx-shield"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className="vfx-shield-container"
          >
            <div className="vfx-shield-hex-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="vfx-shield-hex" style={{ animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
            <div className="vfx-shield-shockwave" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Emojis Layer */}
      <div className="fixed inset-x-0 bottom-10 z-50 pointer-events-none overflow-hidden h-[300px]">
        <AnimatePresence>
          {floatingEmojis.map((fe) => (
            <motion.div
              key={fe.id}
              initial={{ y: 250, x: `${fe.x}vw`, opacity: 0, scale: 0.6 }}
              animate={{
                y: [250, 0],
                x: [`${fe.x}vw`, `${fe.x + (Math.random() * 10 - 5)}vw`],
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1.4, 1.0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              className="absolute flex flex-col items-center gap-1"
            >
              <span className="text-3xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">{fe.emoji}</span>
              <span className="text-[7.5px] bg-slate-950/80 text-slate-300 border border-white/10 px-1 py-0.5 rounded-full font-bold">
                {fe.username}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Build Smoke Overlay */}
      {buildSmoke.map((bs) => (
        <div key={bs.id} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          {Array.from({ length: 15 }).map((_, idx) => {
            const angle = (idx / 15) * Math.PI * 2;
            const distance = Math.random() * 100 + 40;
            return (
              <motion.div
                key={idx}
                initial={{ x: 0, y: 0, opacity: 0.8, scale: 0.5 }}
                animate={{
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: 0,
                  scale: [0.5, 2.5, 1.5],
                  rotate: Math.random() * 360
                }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="absolute w-8 h-8 rounded-full bg-slate-400/30 blur-md mix-blend-screen"
              />
            );
          })}
        </div>
      ))}
      {/* Decorative board circle backgrounds matching Image 4 */}
      <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[450px] h-[450px] rounded-full border border-white/[0.03] pointer-events-none z-0" />
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full border border-white/[0.02] pointer-events-none z-0" />

      {/* Floating Header Show Button */}
      {isHeaderHidden && (
        <button
          onClick={() => {
            playPlaySound();
            setIsHeaderHidden(false);
          }}
          className="absolute top-2 left-2 z-50 bg-slate-950/80 hover:bg-slate-900 border border-white/10 p-1.5 rounded-lg text-[10px] font-bold text-amber-400 shadow-md transition-all flex items-center gap-1 cursor-pointer animate-fade-in"
          title={t('show_menu', profile)}
        >
          👁️ <span className="hidden sm:inline">{t('show_menu', profile)}</span>
          <span className="sm:hidden">{t('lobby', profile)}</span>
        </button>
      )}

      {/* Table Top Header - Compact for Mobile space saving */}
      {!isHeaderHidden && (
        <header className="border-b border-white/5 bg-black/45 backdrop-blur-md px-2 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between z-40 flex-shrink-0 animate-fade-in gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                playPlaySound();
                onLeaveRoom();
              }}
              className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg transition-all font-bold"
              title={t('exit', profile)}
            >
              ← <span className="hidden sm:inline">{t('exit', profile)}</span>
            </button>

            <button
              onClick={() => {
                playPlaySound();
                setShowCareerPanel(true);
              }}
              className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg transition-all font-bold flex items-center gap-0.5"
              title={t('career', profile)}
            >
              📊 <span className="hidden sm:inline">{t('career', profile)}</span>
            </button>

            <div>
              <span className="text-[7px] sm:text-[8px] uppercase font-black tracking-widest text-amber-400 block leading-none">
                {isOffline ? 'PRATİK' : 'ONLINE'}
              </span>
              <h2 className="font-extrabold text-[9px] sm:text-[11px] text-slate-300 leading-tight">#{roomId}</h2>
            </div>
          </div>

          {/* Real-time Voice Chat System Status */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Troubleshooting Cancel Button to resolve any game freezes */}
            <button
              onClick={() => handleForceCancelActiveAction('Kullanıcı talebiyle işlem iptal edildi ve oyun kurtarıldı.')}
              className="p-1 px-1.5 sm:p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
              title={profile.settings.language === 'en' ? "Unstick Game" : "Takılmayı Gider: Herhangi bir takılma durumunda oyunu kurtarır ve sırayı devam ettirir"}
            >
              🛠️ <span className="hidden md:inline">{profile.settings.language === 'en' ? 'Unstick' : 'Gider'}</span>
            </button>

            {/* Compact Layout Toggle Button */}
            <button
              onClick={() => {
                playPlaySound();
                setIsCompactLayout(!isCompactLayout);
              }}
              className={`p-1 px-1.5 sm:p-1.5 rounded-lg border text-[10px] font-black transition-all flex items-center gap-1 ${isCompactLayout
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                : 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
                }`}
              title={profile.settings.language === 'en' ? "Compact Layout Toggle" : "Sıkışık Düzen: Mobil ekranlar için kartları küçültür ve boşluk ayarlar"}
            >
              📱 <span className="hidden md:inline">{isCompactLayout ? t('layout_compact', profile) : t('layout_standard', profile)}</span>
            </button>

            {/* Live Feed & Chat Toggle button */}
            <button
              onClick={() => {
                playPlaySound();
                setShowChatPanel(!showChatPanel);
                // Also toggle showChatOverlay for mobile if screen is small
                if (window.innerWidth < 1024) {
                  setShowChatOverlay(!showChatOverlay);
                }
              }}
              className={`p-1 px-1.5 sm:p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${showChatPanel
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                : 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
                }`}
              title={profile.settings.language === 'en' ? "Chat Panel Toggle" : "Sohbet ve Akışı Aç/Kapat"}
            >
              💬 <span className="hidden md:inline">{showChatPanel ? t('chat', profile) : (profile.settings.language === 'en' ? 'Open' : 'Aç')}</span>
            </button>

            <div className="hidden sm:flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-[9px] font-bold text-slate-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>{profile.settings.language === 'en' ? 'Voice Active' : 'Ses Aktif'}</span>
            </div>

            {/* Background Music Player Toggle Button */}
            <button
              onClick={() => {
                playPlaySound();
                const newVal = !isMusicPlaying;
                setIsMusicPlaying(newVal);
                localStorage.setItem('bgm_enabled', String(newVal));
              }}
              className={`p-1 sm:p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 cursor-pointer select-none ${isMusicPlaying
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              title={isMusicPlaying ? (profile.settings.language === 'en' ? 'Music Off' : 'Müziği Kapat') : (profile.settings.language === 'en' ? 'Music On' : 'Müziği Aç')}
            >
              <span>{isMusicPlaying ? '🎵' : '🔇'}</span>
              <span className="hidden md:inline font-black text-[9px]">
                {isMusicPlaying ? t('music_on', profile) : t('music_off', profile)}
              </span>
            </button>

            <button
              onClick={() => {
                playPlaySound();
                setVoiceMuted(!voiceMuted);
              }}
              className={`p-1 sm:p-1.5 rounded-lg border text-xs transition-all ${voiceMuted
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              title={voiceMuted ? (profile.settings.language === 'en' ? "Unmute Voice" : "Sesi Aç") : (profile.settings.language === 'en' ? "Mute Voice" : "Sesi Kapat")}
            >
              {voiceMuted ? '🔇' : '🎙️'}
            </button>

            {/* Header Hide Button */}
            <button
              onClick={() => {
                playPlaySound();
                setIsHeaderHidden(true);
              }}
              className="p-1 sm:p-1.5 rounded-lg border border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
              title={profile.settings.language === 'en' ? "Hide Header Bar" : "Başlığı Gizle: Oyun alanını genişletmek için üst menüyü gizler"}
            >
              👁️ <span className="hidden sm:inline">{t('hide', profile)}</span>
            </button>
          </div>
        </header>
      )}

      {/* Dynamic Animated Warning/Recovery Toast Alert */}
      <AnimatePresence>
        {recoveryAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-2xl backdrop-blur-md ${recoveryAlert.type === 'warning'
              ? 'bg-amber-950/90 border-amber-500/40 text-amber-200 shadow-amber-950/50'
              : recoveryAlert.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-950/50'
                : 'bg-blue-950/90 border-blue-500/40 text-blue-200 shadow-blue-950/50'
              }`}>
              <div className="text-lg flex-shrink-0 mt-0.5">
                {recoveryAlert.type === 'warning' ? '⚠️' : recoveryAlert.type === 'success' ? '✅' : '🛡️'}
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">
                  {recoveryAlert.type === 'warning'
                    ? (profile.settings.language === 'en' ? 'System Notification' : 'Sistem Bildirimi')
                    : recoveryAlert.type === 'success'
                      ? (profile.settings.language === 'en' ? 'Action Success' : 'Başarılı Hamle')
                      : (profile.settings.language === 'en' ? 'Game Info' : 'Oyun Bilgisi')
                  }
                </h4>
                <p className="text-[10px] text-slate-300 leading-normal">
                  {translateRecoveryMessage(recoveryAlert.message, profile)}
                </p>
              </div>
              <button
                onClick={() => setRecoveryAlert(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOBBY STATE / PRE-START SCREEN */}
      {match.status === 'lobby' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center z-10 relative">
          <div className="bg-slate-900/95 border border-white/10 backdrop-blur-lg rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-6 text-left">

            {/* Lobby Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between border-b border-white/10 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🎲</span>
                <div>
                  <h3 className="text-xl font-black text-white">{t('lobby_title', profile)}</h3>
                  <p className="text-xs text-slate-400">{t('room_code_lbl', profile)} <span className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-amber-400 select-all font-bold">{roomId}</span></p>
                </div>
              </div>
              <button
                onClick={handleLeaveLobby}
                className="px-4 py-1.5 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/20 text-slate-300 hover:text-red-400 font-bold rounded-xl text-xs transition-all active:scale-95"
              >
                🚪 {t('leave_lobby', profile)}
              </button>
            </div>

            {/* Lobby Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left Column: Players List & Waiting Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <span>👥</span> {t('players_list', profile)} ({match.players.length}/4)
                  </h4>
                  {isOffline && (
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {t('lobby_practise_mode', profile)}
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {match.players.map((p, index) => {
                    const isRoomHost = index === 0;
                    const canKickThisPlayer = (isOffline || match.players[0]?.id === profile.id) && p.id !== profile.id;

                    return (
                      <div key={p.id} className="flex items-center justify-between p-2.5 bg-black/40 border border-white/5 rounded-xl transition-all hover:bg-black/50">
                        <div className="flex items-center gap-2">
                          <AvatarWithFrame
                            avatarId={p.avatarId || 'avatar_classic'}
                            avatarUrl={p.avatarUrl}
                            frameId={p.profileFrame || 'frame_none'}
                            sizeClassName="w-7 h-7 text-[10px]"
                          />
                          <span className="font-bold text-xs text-slate-200">{p.username}</span>
                          {p.id === profile.id && (
                            <span className="text-[8px] font-extrabold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 py-0.2 rounded uppercase">
                              {profile.settings.language === 'en' ? 'YOU' : 'SEN'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isRoomHost ? (
                            <span className="text-[8px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                              {t('lobby_role_host', profile)}
                            </span>
                          ) : p.isBot ? (
                            <span className="text-[8px] font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                              {t('lobby_role_bot', profile)}
                            </span>
                          ) : (
                            <span className="text-[8px] font-extrabold text-slate-400 bg-slate-500/10 border border-slate-500/20 px-1.5 py-0.5 rounded">
                              {t('lobby_role_player', profile)}
                            </span>
                          )}

                          {/* KICK Button */}
                          {canKickThisPlayer && (
                            <button
                              onClick={() => handleKickPlayer(p.id)}
                              title={t('lobby_kick_tooltip', profile)}
                              className="p-1 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 rounded-lg transition-all"
                            >
                              <span className="text-xs font-black">✕</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status Notice Banner */}
                {(!isOffline && match.players[0]?.id !== profile.id) ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[10px] flex items-center gap-2 animate-pulse">
                    <span>⌛</span> {t('lobby_waiting_host', profile)}
                  </div>
                ) : (
                  match.players.length < 2 && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-[10px]">
                      {t('min_players_notice', profile)}
                    </div>
                  )
                )}

                {/* Host Control Buttons */}
                {(isOffline || match.players[0]?.id === profile.id) && (
                  <div className="flex flex-col gap-2 pt-2">
                    {isOffline ? (
                      <button
                        onClick={handleStartOfflineGame}
                        className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black rounded-xl text-xs transition-all shadow-lg active:scale-95"
                      >
                        {t('lobby_start_practise', profile)}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleAddBotMultiplayer}
                          disabled={match.players.length >= 4}
                          className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all"
                        >
                          {t('add_bot', profile)}
                        </button>
                        <button
                          onClick={handleStartGameMultiplayer}
                          disabled={match.players.length < 2}
                          className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-40 text-white font-black rounded-xl text-xs transition-all shadow-lg active:scale-95"
                        >
                          {t('start_game', profile)}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Admin Settings & Game Modes */}
              <div className="space-y-4 bg-black/20 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
                    <span>⚙️</span> {t('room_settings_rules', profile)}
                  </h4>

                  {/* Preset Game Modes */}
                  <div className="space-y-2 mb-4">
                    <span className="text-[10px] font-bold text-slate-400 block">{t('game_mode_selection', profile)}</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'classic', label: profile.settings.language === 'en' ? '🎲 Classic' : '🎲 Klasik', desc: profile.settings.language === 'en' ? 'Classic rules.' : 'Klasik Deal Master PRO kuralları.' },
                        { id: 'chaos', label: profile.settings.language === 'en' ? '🌀 Chaos' : '🌀 Kaos', desc: profile.settings.language === 'en' ? 'Draw 4 cards, unlimited moves.' : '4 Kart çekilir, sınırsız hamle.' },
                        { id: 'speed', label: profile.settings.language === 'en' ? '⚡ Speed' : '⚡ Hızlı', desc: profile.settings.language === 'en' ? '15s turn limit.' : '15sn tur süresi.' },
                      ].map((m) => {
                        const isSelected = localSettings.gameMode === m.id;
                        const disabled = !(isOffline || match.players[0]?.id === profile.id);
                        return (
                          <button
                            key={m.id}
                            disabled={disabled}
                            onClick={() => changeMatchSettings({ gameMode: m.id as any })}
                            title={m.desc}
                            className={`p-2 rounded-xl text-center border transition-all text-xs flex flex-col items-center justify-center gap-1 ${isSelected
                              ? 'bg-red-500/15 border-red-500/50 text-red-400 font-extrabold shadow-md'
                              : 'bg-black/30 border-white/5 text-slate-400 hover:bg-black/40 disabled:hover:bg-black/30'
                              }`}
                          >
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Settings Fields */}
                  <div className="space-y-3">

                    {/* Set Target Selection */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400">{t('set_target', profile)}</span>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                          {profile.settings.language === 'en' ? 'Complete ' + localSettings.targetSets + ' Sets' : localSettings.targetSets + ' Set Tamamla'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[2, 3, 4].map((s) => {
                          const isSelected = localSettings.targetSets === s;
                          const disabled = !(isOffline || match.players[0]?.id === profile.id) || localSettings.gameMode !== 'classic';
                          return (
                            <button
                              key={s}
                              disabled={disabled}
                              onClick={() => changeMatchSettings({ targetSets: s })}
                              className={`py-1 rounded-lg text-center border transition-all text-xs ${isSelected
                                ? 'bg-red-500/10 border-red-500/30 text-red-400 font-bold'
                                : 'bg-black/20 border-white/5 text-slate-400 hover:bg-black/30 disabled:opacity-40'
                                }`}
                            >
                              {s} Set
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Turn Time Limit Selection */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-400">{t('lobby_turn_limit', profile)}</span>
                        <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                          {localSettings.turnLimit === 'unlimited' ? t('turn_duration_unlimited', profile) : localSettings.turnLimit === '15s' ? t('turn_duration_seconds', profile, 15) : localSettings.turnLimit === '30s' ? t('turn_duration_seconds', profile, 30) : t('turn_duration_minute', profile)}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: '15s', label: profile.settings.language === 'en' ? '15s' : '15sn' },
                          { id: '30s', label: profile.settings.language === 'en' ? '30s' : '30sn' },
                          { id: '1m', label: profile.settings.language === 'en' ? '1m' : '1dk' },
                          { id: 'unlimited', label: t('turn_duration_unlimited', profile) },
                        ].map((tField) => {
                          const isSelected = localSettings.turnLimit === tField.id;
                          const disabled = !(isOffline || match.players[0]?.id === profile.id) || localSettings.gameMode !== 'classic';
                          return (
                            <button
                              key={tField.id}
                              disabled={disabled}
                              onClick={() => changeMatchSettings({ turnLimit: tField.id as any })}
                              className={`py-1 rounded-lg text-center border transition-all text-[10px] ${isSelected
                                ? 'bg-red-500/10 border-red-500/30 text-red-400 font-bold'
                                : 'bg-black/20 border-white/5 text-slate-400 hover:bg-black/30 disabled:opacity-40'
                                }`}
                            >
                              {tField.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Auto End Turn Toggle */}
                    <div className="flex items-center justify-between p-2 bg-black/20 border border-white/5 rounded-xl mt-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-300 block">{t('auto_end_turn', profile)}</span>
                        <span className="text-[8px] text-slate-400">{t('auto_end_turn_desc', profile)}</span>
                      </div>
                      <button
                        disabled={!(isOffline || match.players[0]?.id === profile.id) || localSettings.gameMode !== 'classic'}
                        onClick={() => changeMatchSettings({ autoEndTurn: !localSettings.autoEndTurn })}
                        className={`px-3 py-1 text-[9px] font-extrabold rounded-lg border transition-all ${localSettings.autoEndTurn
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'bg-black/40 border-white/10 text-slate-400'
                          }`}
                      >
                        {localSettings.autoEndTurn ? t('option_on', profile) : t('option_off', profile)}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Footer mode summary */}
                <div className="border-t border-white/5 pt-3 mt-4 text-[9px] text-slate-500">
                  <span className="font-semibold text-slate-400 block uppercase mb-1">{t('rules_summary_title', profile)}</span>
                  {localSettings.gameMode === 'chaos' && t('rules_summary_chaos', profile)}
                  {localSettings.gameMode === 'speed' && t('rules_summary_speed', profile)}
                  {localSettings.gameMode === 'classic' && t('rules_summary_classic', profile, localSettings.targetSets, localSettings.turnLimit === 'unlimited' ? t('turn_duration_unlimited', profile) : (localSettings.turnLimit === '15s' ? t('turn_duration_seconds', profile, 15) : (localSettings.turnLimit === '30s' ? t('turn_duration_seconds', profile, 30) : t('turn_duration_minute', profile))), localSettings.autoEndTurn ? t('option_on', profile) : t('option_off', profile))}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ACTIVE PLAYING STATE */}
      {match.status === 'playing' && (
        <div className={`flex-1 flex flex-col justify-between min-h-0 relative z-10 transition-all duration-300 ${showChatPanel ? 'lg:pr-80' : ''}`}>

          {/* 1. Opponents & My Profile Carousel Row at the top (matches Image 4) */}
          <div className="px-3 pt-2.5 flex-shrink-0">
            <div className="flex justify-between items-center mb-1 text-[8.5px] font-bold text-slate-400">
              <span className="uppercase tracking-wide">{profile.settings.language === 'en' ? 'Players & Boards' : 'Oyuncular & Masalar'}</span>
              <button
                onClick={() => {
                  playPlaySound();
                  setIsOpponentsGrid(!isOpponentsGrid);
                }}
                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-[8px] cursor-pointer transition-all flex items-center gap-1 active:scale-95"
              >
                {isOpponentsGrid 
                  ? (profile.settings.language === 'en' ? '↔️ Scroll View' : '↔️ Yatay Kaydır') 
                  : (profile.settings.language === 'en' ? '🔢 Grid View' : '🔢 Izgara Görünümü')
                }
              </button>
            </div>

            <div className={isOpponentsGrid 
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-1"
              : "flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
            }>
              {match.players.map((p) => {
                const isMe = p.id === profile.id;
                const isCurrentTurn = match.players[match.turnIndex].id === p.id;
                const bankTotal = p.bank.reduce((sum, c) => sum + c.value, 0);

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      playPlaySound();
                      if (isMe) {
                        setShowBankVaultModal(true);
                      } else {
                        setAssetsOpponentId(p.id);
                        setShowOpponentAssetsModal(true);
                      }
                    }}
                    className={`flex-shrink-0 w-[155px] p-2 rounded-xl bg-slate-900/80 border backdrop-blur-sm transition-all cursor-pointer hover:border-purple-500/50 hover:bg-slate-850/90 ${isCurrentTurn
                      ? 'border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.65)] ring-2 ring-amber-400 animate-pulse-gentle'
                      : 'border-white/5'
                      }`}
                  >
                    {/* Player Info Line */}
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Avatar container with ripples, bot bubbles and speech indicators */}
                        <div className="relative flex-shrink-0 select-none">
                          {/* Pulsing speak halo ripple (Improvement #10) */}
                          {(speakingList.includes(p.id) || (p as any).isSpeaking) && (
                            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60 z-0 pointer-events-none" />
                          )}
                          <AvatarWithFrame
                            avatarId={p.avatarId || 'avatar_classic'}
                            avatarUrl={p.avatarUrl}
                            frameId={p.profileFrame || 'frame_none'}
                            sizeClassName={`w-8 h-8 text-[11px] flex-shrink-0 relative z-10 ${(speakingList.includes(p.id) || (p as any).isSpeaking) ? 'ring-2 ring-emerald-400' : ''
                              }`}
                          />
                          {/* Audio wavebars animation (Improvement #10) */}
                          {(speakingList.includes(p.id) || (p as any).isSpeaking) && (
                            <div className="absolute -bottom-1 -right-1 flex gap-[1px] items-end bg-slate-950/90 border border-emerald-400/40 rounded px-0.5 py-0.2 z-20 pointer-events-none scale-90">
                              <span className="w-[1.5px] bg-emerald-400 rounded-full animate-bounce" style={{ height: '5px', animationDuration: '0.4s' }} />
                              <span className="w-[1.5px] bg-emerald-400 rounded-full animate-bounce" style={{ height: '8px', animationDuration: '0.6s' }} />
                              <span className="w-[1.5px] bg-emerald-400 rounded-full animate-bounce" style={{ height: '4px', animationDuration: '0.3s' }} />
                            </div>
                          )}
                          {/* Bot thinking indicator (Improvement #9) */}
                          {p.isBot && isCurrentTurn && botIsThinking && (
                            <div className="absolute -top-3.5 -left-3.5 bg-blue-600 border border-blue-400/50 text-[6.5px] text-white font-extrabold px-1 py-0.5 rounded-md animate-bounce flex items-center gap-0.5 shadow-md shadow-blue-500/20 z-20">
                              <span>{profile.settings.language === 'en' ? '💬 Thinking' : '💬 Düşünüyor'}</span>
                              <span className="animate-pulse">...</span>
                            </div>
                          )}
                        </div>
                        <div className="truncate leading-none">
                          <span className="font-extrabold text-[10px] text-slate-100 truncate block flex items-center gap-1">
                            {p.username.split(' ')[0]}
                            {(p as any).isDisconnected && <span className="text-[7px] bg-red-500/20 text-red-400 px-1 py-0.2 rounded font-black uppercase animate-pulse">AFK</span>}
                          </span>
                          {isCurrentTurn ? (
                            <div className="mt-1 flex flex-col space-y-1">
                              {/* Visual bullet/energy dots for moves */}
                              <div className="flex gap-1">
                                {[1, 2, 3].map((num) => {
                                  const isSpent = match.actionsPlayedThisTurn >= num;
                                  const rem = 3 - match.actionsPlayedThisTurn;
                                  let dotClass = "w-2.5 h-2.5 rounded-full border transition-all duration-300 ";
                                  if (isSpent) {
                                    dotClass += "bg-purple-500 border-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.7)]";
                                  } else {
                                    if (rem === 1) {
                                      dotClass += "bg-amber-500/20 border-amber-500/40 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]";
                                    } else {
                                      dotClass += "bg-emerald-500/30 border-emerald-500/50 shadow-[0_0_6px_rgba(16,185,129,0.4)]";
                                    }
                                  }
                                  return (
                                    <div
                                      key={num}
                                      className={dotClass}
                                      title={isSpent ? "Hamle Kullanıldı" : `${rem} Hamle Kaldı`}
                                    />
                                  );
                                })}
                              </div>
                              {/* Descriptive Warning Text */}
                              {(() => {
                                const rem = 3 - match.actionsPlayedThisTurn;
                                if (rem === 0) {
                                  return (
                                    <span className="text-[7px] text-red-400 font-black tracking-wider uppercase animate-bounce block bg-red-950/40 border border-red-500/20 px-1 py-0.5 rounded text-center">
                                      🚨 TURU BİTİR
                                    </span>
                                  );
                                }
                                if (rem === 1) {
                                  return (
                                    <span className="text-[7px] text-orange-400 font-black tracking-wider uppercase animate-pulse block bg-orange-950/40 border border-orange-500/20 px-1 py-0.5 rounded text-center">
                                      ⚠️ SON HAMLE!
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[6.5px] text-slate-400 font-extrabold tracking-wider uppercase block">
                                    {rem} HAMLE KALDI
                                  </span>
                                );
                              })()}
                            </div>
                          ) : isMe ? (
                            <span className="text-[7px] text-amber-400 font-black tracking-widest uppercase block mt-0.5">SEN</span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400">{bankTotal}M</span>
                    </div>

                    {/* Stats & Mini Badge Info */}
                    <div className="flex flex-col mt-1 pt-1 border-t border-white/[0.04] gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-slate-400 font-bold flex items-center gap-0.5">
                          🃏 {profile.settings.language === 'en' ? 'Hand:' : 'Eldeki:'} x{p.hand.length}
                        </span>
                      </div>

                      {/* Display mini active set cards (Wrapping Layout, no scrollbar!) */}
                      <div className="flex flex-wrap gap-1 justify-start py-0.5">
                        {Object.keys(p.properties).map((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = p.properties[col];
                          if (!set || set.cards.length === 0) return null;
                          const isCompleted = set.cards.length >= MAX_IN_SET[col];
                          return (
                            <div
                              key={col}
                              className={`flex-shrink-0 w-[24px] h-[34px] bg-white rounded flex flex-col justify-between p-0.5 relative overflow-hidden shadow-sm border ${isCompleted ? 'border-amber-400 ring-1 ring-amber-400/30 shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'border-slate-300'
                                }`}
                              title={`${COLOR_LABELS[col]}: ${set.cards.length}/${MAX_IN_SET[col]}`}
                            >
                              <div className="h-1.5 w-full rounded-t-sm flex-shrink-0" style={{ backgroundColor: COLOR_HEX[col] }} />
                              <div className="flex-1 flex items-center justify-center leading-none">
                                <span className={`text-[6px] font-black leading-none ${isCompleted ? 'text-amber-500 scale-105 animate-pulse' : 'text-slate-800'}`}>
                                  {isCompleted ? '👑' : `${set.cards.length}/${MAX_IN_SET[col]}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Middle area: Piles, turn indicator timer and properties collection */}
          <div className={`flex-1 min-h-0 flex flex-col justify-around px-2 sm:px-3 transition-all ${isCompactLayout ? 'py-0.5 space-y-1' : 'py-1.5 space-y-2'
            }`}>

            {/* Horizontal Arena Grid */}
            <div className={`grid grid-cols-3 gap-1.5 sm:gap-2 items-center bg-black/15 border border-white/[0.04] rounded-xl transition-all ${isCompactLayout ? 'p-1.5' : 'p-2.5'
              }`}>

              {/* Draw Pile (DESTE) */}
              <div className="text-center space-y-0.5">
                <span className="text-[7.5px] text-slate-400 uppercase tracking-widest block font-bold">DESTE</span>
                <div
                  className={`w-10 h-14 rounded-lg flex flex-col justify-between p-1 cursor-pointer select-none active:scale-95 transition-all relative overflow-hidden mx-auto ${profile.settings.cardBack === 'back_cosmic'
                    ? 'border border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]'
                    : profile.settings.cardBack === 'back_gold'
                      ? 'border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.75)] shadow-yellow-500/30'
                      : profile.settings.cardBack === 'back_neon'
                        ? 'border border-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.75)] animate-bounce-subtle'
                        : 'border border-red-500/50 shadow-[0_4px_8px_rgba(239,68,68,0.25)]'
                    }`}
                  style={{
                    background: cardBackBg,
                  }}
                  onClick={() => {
                    playPlaySound();
                  }}
                >
                  {/* Internal floating particles for custom cards */}
                  {profile.settings.cardBack !== 'back_classic' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {[...Array(4)].map((_, idx) => (
                        <span
                          key={idx}
                          className="absolute rounded-full animate-float"
                          style={{
                            left: `${15 + Math.random() * 70}%`,
                            bottom: '0px',
                            width: '2px',
                            height: '2px',
                            backgroundColor: profile.settings.cardBack === 'back_cosmic' ? '#818CF8' : profile.settings.cardBack === 'back_gold' ? '#FBBF24' : '#F472B6',
                            boxShadow: `0 0 6px ${profile.settings.cardBack === 'back_cosmic' ? '#818CF8' : '#FBBF24'}`,
                            animationDelay: `${idx * 0.3}s`,
                            animationDuration: '1.5s',
                          }}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-white/20 text-left text-[4px] font-black leading-none tracking-widest">Deal Master PRO</span>
                  <span className="text-white text-xs font-black self-center drop-shadow-md">
                    {profile.settings.cardBack === 'back_cosmic' ? '★' : profile.settings.cardBack === 'back_gold' ? '♛' : '◆'}
                  </span>
                  <span className="text-white/20 text-right text-[4px] font-black leading-none tracking-widest">DEAL</span>
                </div>
                <span className="text-[7px] text-amber-300 font-black block bg-amber-500/10 px-1 py-0.5 rounded-full inline-block">
                  {match.deckCount} Kart
                </span>
              </div>

              {/* Timer & Turn status block (SÜRE) */}
              <div className="text-center space-y-0.5 flex flex-col items-center">
                <span className="text-[7.5px] text-slate-400 uppercase tracking-widest block font-bold">SÜRE</span>

                {/* Visual Timer ring */}
                <div className="relative w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-950 shadow-inner">
                  {(match.activeActionRequest || (match.activeActionRequests && match.activeActionRequests.length > 0)) ? (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-red-500/40 animate-pulse" />
                      <span className="text-red-400 text-[10px] font-black">
                        {actionTimeLeft !== null ? `${actionTimeLeft}s` : '⏳'}
                      </span>
                    </>
                  ) : (
                    <>
                      {match?.settings?.turnLimit !== 'unlimited' && (
                        <div className="absolute inset-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin opacity-50" />
                      )}
                      <span className="text-amber-400 text-[10px] font-black">
                        {match?.settings?.turnLimit === 'unlimited' ? '∞' : `${timeLeft}s`}
                      </span>
                    </>
                  )}
                </div>

                <span className="text-[7.5px] font-black uppercase text-slate-300 truncate max-w-[85px]">
                  {(match.activeActionRequest || activeActionCard)
                    ? 'BEKLENİYOR'
                    : (match.players[match.turnIndex].id === profile.id ? 'SIRA SENDE' : match.players[match.turnIndex].username.split(' ')[0])}
                </span>
                <div className="flex flex-col items-center gap-0.5 mt-0.5">
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3].map((num) => {
                      const isPlayed = match.actionsPlayedThisTurn >= num;
                      const rem = 3 - match.actionsPlayedThisTurn;
                      return (
                        <div
                          key={num}
                          className={`w-1.5 h-1.5 rounded-full border transition-all duration-300 ${isPlayed
                            ? 'bg-red-500/80 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                            : rem === 1
                              ? 'bg-amber-500/20 border-amber-400 animate-pulse'
                              : 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.2)]'
                            }`}
                          title={isPlayed ? 'Hamle Yapıldı' : 'Kalan Hamle'}
                        />
                      );
                    })}
                  </div>
                  <span className={`text-[6.5px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wider leading-none border transition-all ${(3 - match.actionsPlayedThisTurn) === 0
                    ? 'text-red-400 bg-red-950/60 border-red-500/30 animate-pulse'
                    : (3 - match.actionsPlayedThisTurn) === 1
                      ? 'text-amber-400 bg-amber-950/60 border-amber-500/30 animate-pulse font-black'
                      : 'text-emerald-400 bg-emerald-950/60 border-emerald-500/20'
                    }`}>
                    {3 - match.actionsPlayedThisTurn} HAMLE
                  </span>
                </div>
              </div>

              {/* Last Action Played (SON HAMLE) */}
              <div className="text-center space-y-0.5">
                <span className="text-[7.5px] text-slate-400 uppercase tracking-widest block font-bold">{t('last_move', profile)}</span>
                {match.discardPile.length > 0 ? (
                  (() => {
                    const topDiscard = match.discardPile[match.discardPile.length - 1];
                    return (
                      <div
                        className="flex justify-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => {
                          playPlaySound();
                          setFocusedCard(topDiscard);
                          setFocusedCardZoom(1.8);
                        }}
                        title={profile.settings.language === 'en' ? "Inspect Last Move" : "Son Hamle Detayını İncele"}
                      >
                        <GameCard card={topDiscard} size="mini" activeEffect={cardEffects[topDiscard.id] || null} disable3D={disable3D} cardBack={profile.settings.cardBack} cardSkin={profile.settings.cardSkin || 'skin_none'} />
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-10 h-14 rounded-lg border border-dashed border-white/10 mx-auto flex items-center justify-center text-slate-600 text-[7.5px] font-bold">
                    {profile.settings.language === 'en' ? 'NONE' : 'YOK'}
                  </div>
                )}
                <span className="text-[7px] text-slate-500 block font-bold">{t('action_label', profile)}</span>
              </div>

            </div>

            {/* BENİM VARLIKLARIM (My Assets - Bank & Properties Side-by-Side) */}
            <div className="flex gap-2 items-stretch flex-1 min-h-0">

              {/* BENİM BANKAM (My Bank - Dedicated Left Side Column with no elements above or below) */}
              <div className={`bg-[#090C12]/40 border border-white/5 rounded-xl flex flex-col justify-between transition-all shrink-0 ${isCompactLayout ? 'p-1 sm:p-1.5 space-y-1 w-[68px] sm:w-[84px] md:w-[96px]' : 'p-2 space-y-1.5 w-[84px] sm:w-[104px] md:w-[118px]'
                }`}>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold text-center select-none truncate">
                  {t('bank', profile)}
                </span>

                {(() => {
                  const bankTotal = localPlayer.bank.reduce((sum, c) => sum + c.value, 0);
                  const isDraggingActive = draggingCard !== null;

                  return (
                    <div
                      id="bank-drop-zone"
                      onClick={() => {
                        if (bankTotal > 0) {
                          playPlaySound();
                          setShowBankVaultModal(true);
                        }
                      }}
                      onDragOver={(e) => {
                        if (isMyTurn && draggingCard) {
                          e.preventDefault();
                          setIsDragOverBank(true);
                        }
                      }}
                      onDragLeave={() => setIsDragOverBank(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOverBank(false);
                        if (isMyTurn && draggingCard) {
                          if (draggingCard.type === 'property' || draggingCard.type === 'wildcard') {
                            playAlertSound();
                            alert(profile.settings.language === 'en' ? "Property cards cannot be deposited to the bank! Only money and action cards are allowed." : "Arsa mülk kartları bankaya koyulamaz! Sadece aksiyon ve para kartları bankaya konabilir.");
                            return;
                          }
                          playPlaySound();
                          if (isOffline) {
                            handleOfflinePlayCard(draggingCard.id, 'bank');
                          } else {
                            handlePlayCardMultiplayer(draggingCard.id, 'bank');
                          }
                          setDraggingCard(null);
                        }
                      }}
                      className={`flex-1 flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer ${isDragOverBank
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 scale-[1.03] shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse'
                        : isDraggingActive && draggingCard.type !== 'property' && draggingCard.type !== 'wildcard'
                          ? 'bg-emerald-500/5 border border-dashed border-emerald-500/40 animate-pulse'
                          : 'bg-slate-900/10 border border-emerald-500/10 shadow-[0_4px_12px_rgba(16,185,129,0.05)] hover:border-emerald-400 hover:scale-[1.02]'
                        }`}
                    >
                      <span className={`text-[7px] font-black bg-emerald-950/60 border border-emerald-500/20 px-1.5 py-0.5 rounded-full leading-none mb-1.5 ${bankTotal > 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                        🏦 {bankTotal}M
                      </span>
                      <div className={`w-full aspect-[2/3] h-auto rounded-lg border flex flex-col justify-between p-1 sm:p-1.5 relative overflow-hidden transition-all ${bankTotal > 0
                        ? 'bg-gradient-to-b from-emerald-900 to-emerald-950 border-emerald-500/50 shadow-xl'
                        : 'bg-slate-950/40 border-dashed border-slate-700'
                        }`}>
                        <div className="absolute -right-2 -bottom-2 text-emerald-900/10 text-3xl font-black">💵</div>
                        <span className="text-[5px] font-black text-emerald-400 tracking-wider leading-none">{t('bank', profile).toUpperCase()}</span>
                        <span className={`text-sm my-auto text-center font-black drop-shadow ${bankTotal > 0 ? 'text-emerald-300' : 'text-slate-600'
                          }`}>{bankTotal}M</span>
                        <span className={`text-[4px] font-extrabold text-center uppercase tracking-wider leading-none ${bankTotal > 0 ? 'text-emerald-500' : 'text-slate-600'
                          }`}>{profile.settings.language === 'en' ? 'VAULT' : 'KASA'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* BENİM ARAZİLERİM (My Property sets - matches Image 4) */}
              <div className={`bg-[#090C12]/40 border border-white/5 rounded-xl flex-1 flex flex-col justify-center min-h-0 transition-all ${isCompactLayout ? 'p-1 sm:p-1.5 space-y-1' : 'p-2 space-y-1.5'
                }`}>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">
                  {t('my_lands', profile)} ({countCompletedSets(localPlayer.properties)}/3 SET)
                </span>

                {/* Grid of properties or empty state (matches Image 1 - medium-scale stacked layout with bank on left) */}
                <div
                  id="properties-drop-zone"
                  onDragOver={(e) => {
                    if (isMyTurn && draggingCard) {
                      e.preventDefault();
                      setIsDragOverProperties(true);
                    }
                  }}
                  onDragLeave={() => setIsDragOverProperties(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverProperties(false);
                    if (isMyTurn && draggingCard) {
                      // 1. If it's a money card: Send directly to the bank.
                      if (draggingCard.type === 'money') {
                        playPlaySound();
                        if (isOffline) {
                          handleOfflinePlayCard(draggingCard.id, 'bank');
                        } else {
                          handlePlayCardMultiplayer(draggingCard.id, 'bank');
                        }
                        setDraggingCard(null);
                        return;
                      }

                      // 2. If it's a property, property wildcard or house-hotel card:
                      if (draggingCard.type === 'property' || draggingCard.type === 'wildcard' || draggingCard.type === 'house-hotel') {
                        playPlaySound();
                        if (draggingCard.type === 'house-hotel') {
                          const res = checkHouseHotelPlayability(draggingCard);
                          if (!res.playable) {
                            alert(res.reason);
                          } else {
                            setHouseHotelColorPick(draggingCard);
                          }
                        } else if (draggingCard.isWildcard || draggingCard.type === 'wildcard') {
                          setWildcardColorPick(draggingCard);
                        } else {
                          if (isOffline) {
                            handleOfflinePlayCard(draggingCard.id, 'property');
                          } else {
                            handlePlayCardMultiplayer(draggingCard.id, 'property');
                          }
                        }
                        setDraggingCard(null);
                        return;
                      }

                      // 3. For Action / Rent cards, play them as action!
                      const res = checkActionPlayability(draggingCard);
                      if (!res.playable) {
                        alert(res.reason);
                        setDraggingCard(null);
                        return;
                      }

                      playPlaySound();
                      if (draggingCard.type === 'rent') {
                        setRentColorPick(draggingCard);
                      } else if (['sly-deal', 'deal-breaker', 'forced-deal', 'debt-collector'].includes(draggingCard.actionType || '')) {
                        setActiveActionCard(draggingCard);
                        setSelectedOpponentId(null);
                        setSelectedStolenCardId(null);
                        setSelectedStolenColor(null);
                        setSelectedMyCardId(null);
                      } else {
                        if (isOffline) handleOfflinePlayCard(draggingCard.id, 'action');
                        else handlePlayCardMultiplayer(draggingCard.id, 'action');
                      }
                      setDraggingCard(null);
                    }
                  }}
                  className={(() => {
                    // mb-auto ile en üste itildi
                    // h-full ve flex-1 ile aşağıya kadar uzaması sağlandı
                    // max-h-... sınıfları kaldırıldı
                    return `flex-1 h-full mb-auto w-full rounded-xl transition-all flex flex-wrap overflow-auto items-start content-start ${isCompactLayout
                      ? 'gap-1.5 sm:gap-2 p-1.5'
                      : 'gap-2.5 sm:gap-3 p-2'
                      } ${isDragOverProperties
                        ? 'bg-amber-500/10 border-2 border-dashed border-amber-400 shadow-[inset_0_0_15px_rgba(245,158,11,0.2)] animate-pulse'
                        : draggingCard
                          ? 'bg-amber-500/[0.02] border border-dashed border-amber-500/30'
                          : ''
                      }`;
                  })()}
                >

                  {Object.keys(localPlayer.properties).map((colorKey) => {
                    const col = colorKey as CardColor;
                    const set = localPlayer.properties[col];
                    if (!set || set.cards.length === 0) return null;
                    const isCompleted = set.cards.length >= MAX_IN_SET[col];
                    const isExpanded = expandedPropertyColor === col;

                    const hasCompletedSet = Object.keys(localPlayer.properties).some((c) => {
                      const s = localPlayer.properties[c as CardColor];
                      return s && s.cards.length >= (MAX_IN_SET[c as CardColor] || 0);
                    });

                    // Calculate accordion minimum heights
                    const cardsWrapperHeight = isExpanded
                      ? (isCompactLayout ? 'min-h-[140px] sm:min-h-[175px]' : 'min-h-[175px] sm:min-h-[210px]')
                      : (isCompactLayout ? 'min-h-[46px] sm:min-h-[58px]' : 'min-h-[58px] sm:min-h-[78px]');

                    const rentVal = calculateSetRent(set.cards, col, set.hasHouse, set.hasHotel);

                    // Neon pulse styles for rent badge
                    const neonColor = COLOR_HEX[col] || '#34d399';
                    const badgePulseStyle = isCompleted ? {
                      boxShadow: `0 0 12px ${neonColor}, inset 0 0 3px ${neonColor}`,
                      borderColor: neonColor,
                      textShadow: `0 0 4px ${neonColor}`,
                    } : {};

                    return (
                      <div
                        key={col}
                        onClick={() => {
                          playPlaySound();
                          setExpandedPropertyColor(isExpanded ? null : col);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleStartPress(col, localPlayer.username, set);
                        }}
                        onMouseUp={handleEndPress}
                        onMouseLeave={() => {
                          handleEndPress();
                          setAnalyzedProperty(null);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          handleStartPress(col, localPlayer.username, set);
                        }}
                        onTouchEnd={handleEndPress}
                        onMouseEnter={() => setAnalyzedProperty({
                          color: col,
                          ownerName: localPlayer.username,
                          cardsCount: set.cards.length,
                          hasHouse: set.hasHouse,
                          hasHotel: set.hasHotel,
                          currentRent: rentVal
                        })}
                        className={`flex flex-col items-center rounded-xl transition-all duration-300 w-[48px] sm:w-[60px] md:w-[72px] shrink-0 relative cursor-pointer select-none property-set-card-trigger ${isExpanded
                          ? 'ring-2 ring-amber-400 bg-slate-950/80 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                          : isCompleted
                            ? 'border border-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                            : 'border border-white/5 bg-slate-900/40 hover:bg-slate-900/60'
                          } ${isCompactLayout ? 'p-1' : 'p-1.5'}`}
                      >
                        {/* Stack of actual medium property cards (with overlap) */}
                        <div className={`relative flex flex-col items-center w-full transition-all duration-300 ease-out ${cardsWrapperHeight}`}>
                          {set.cards.map((card, idx) => {
                            const isWild = card.isWildcard || card.type === 'wildcard';
                            // Calculate accordion spacing
                            const cardSpacingClass = idx > 0
                              ? (isExpanded
                                ? ''
                                : (isCompactLayout ? '-mt-[162%]' : '-mt-[162%]')
                              )
                              : '';

                            // Fan out accordion style (yelpaze)
                            const fanStyle = isExpanded ? {
                              transform: `translateY(${idx * 16}px) rotate(${(idx - (set.cards.length - 1) / 2) * 6}deg) translateX(${(idx - (set.cards.length - 1) / 2) * 8}px)`,
                              zIndex: 10 + idx,
                            } : {};

                            return (
                              <div
                                key={card.id}
                                onClick={(e) => {
                                  // Prevent double-triggering parent toggle if clicking card
                                  e.stopPropagation();
                                  playPlaySound();
                                  // Odak Modu (Zoom) tamamen kaldırıldı. Kart tıklaması sadece set detayını açar/kapatır.
                                  setExpandedPropertyColor(isExpanded ? null : col);
                                }}
                                onMouseEnter={() => setHoveredCard(card)}
                                onMouseLeave={() => setHoveredCard(null)}
                                className={`${cardSpacingClass} w-full transition-all duration-300 hover:z-30 relative cursor-pointer hover:scale-105 animate-play-card`}
                                style={fanStyle}
                                title="Kartı Odakla / Genişlet"
                              >
                                <GameCard card={card} size="medium" activeEffect={cardEffects[card.id] || null} disable3D={disable3D} cardBack={profile.settings.cardBack} cardSkin={profile.settings.cardSkin || 'skin_none'} />
                                {isWild && isMyTurn && (
                                  <div className="absolute top-1 right-1 bg-yellow-500 text-slate-950 text-[6px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow z-10" title="Grup Değiştirebilir">
                                    🔄
                                  </div>
                                )}
                              </div>
                            );
                          })}


                        </div>

                        {/* Unified Neon Glowing Rent Badge */}
                        <div
                          className={`mt-1.5 px-2 w-full rounded-full flex items-center justify-between text-[8px] font-black border transition-all duration-300 select-none ${isCompleted
                            ? 'bg-slate-950/95 border-emerald-400/50 text-white animate-pulse'
                            : 'bg-slate-950/80 border-white/5 text-emerald-400'
                            }`}
                          style={{ height: '18px', ...badgePulseStyle }}
                        >
                          <span className="shrink-0 font-extrabold">{isCompleted ? '👑' : `${set.cards.length}/${MAX_IN_SET[col]}`}</span>
                          <div className="h-2 w-[1px] bg-white/20 shrink-0" />
                          <span className="font-mono text-[8.5px] font-black shrink-0">{rentVal}M</span>
                        </div>
                      </div>
                    );
                  })}

                  {Object.keys(localPlayer.properties).filter(k => localPlayer.properties[k as CardColor]!.cards.length > 0).length === 0 && (
                    <div className="col-span-full flex-1 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl py-4 text-slate-500 min-h-[130px] w-full">
                      <div className="w-10 h-14 border border-dashed border-white/10 rounded-md flex items-center justify-center text-xs text-slate-600">
                        BOŞ
                      </div>
                      <span className="text-[9px] font-bold mt-1 uppercase tracking-wide">henüz arazi yok</span>
                    </div>
                  )}
                </div>

                {/* Mobile Bottom-Sheet Console Dock */}
                <AnimatePresence>
                  {expandedPropertyColor && (() => {
                    const activeCol = expandedPropertyColor;
                    const activeSet = localPlayer.properties[activeCol];
                    if (!activeSet || activeSet.cards.length === 0) return null;
                    const isSetComp = activeSet.cards.length >= MAX_IN_SET[activeCol];
                    const activeRent = calculateSetRent(activeSet.cards, activeCol, activeSet.hasHouse, activeSet.hasHotel);
                    const colorLabel = COLOR_LABELS[activeCol] || activeCol;
                    const colorHex = COLOR_HEX[activeCol] || '#ffffff';

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 w-full bg-slate-950/95 border border-white/10 rounded-xl p-2.5 flex flex-col gap-2 shadow-[0_4px_24px_rgba(0,0,0,0.8)] relative overflow-hidden backdrop-blur-md z-30 property-details-sheet"
                      >
                        {/* Subtle Color Accent Line */}
                        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: colorHex }} />

                        {/* Bottom Sheet Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: colorHex }} />
                            <span className="text-[9px] font-black text-white tracking-wide uppercase">
                              {colorLabel} SETİ DETAYI
                            </span>
                          </div>

                          {/* Close / Collapse button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playPlaySound();
                              setExpandedPropertyColor(null);
                            }}
                            className="text-slate-400 hover:text-white text-[9px] bg-white/5 hover:bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Grid Layout of stats */}
                        <div className="grid grid-cols-3 gap-1.5 items-center">
                          {/* Card Count Block */}
                          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-1 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] leading-none mb-0.5">🎴</span>
                            <span className="text-[6.5px] text-slate-400 uppercase font-black tracking-tight leading-none mb-0.5">KARTLAR</span>
                            <span className={`text-[9px] font-black leading-none ${isSetComp ? 'text-amber-400' : 'text-slate-200'}`}>
                              {activeSet.cards.length}/{MAX_IN_SET[activeCol]} {isSetComp && '👑'}
                            </span>
                          </div>

                          {/* Rent Value Block */}
                          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-1 flex flex-col items-center justify-center text-center relative overflow-hidden">
                            <span className="text-[10px] leading-none mb-0.5 animate-pulse">💰</span>
                            <span className="text-[6.5px] text-slate-400 uppercase font-black tracking-tight leading-none mb-0.5">KİRA GÜCÜ</span>
                            <motion.span
                              key={activeRent}
                              initial={{ scale: 1.3, y: -2 }}
                              animate={{ scale: 1, y: 0 }}
                              className="text-[10px] font-black text-emerald-400 leading-none font-mono drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                            >
                              {activeRent}M
                            </motion.span>
                          </div>

                          {/* House/Hotel count Block */}
                          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-1 flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] leading-none mb-0.5">🏠</span>
                            <span className="text-[6.5px] text-slate-400 uppercase font-black tracking-tight leading-none mb-0.5">BİNALAR</span>
                            <span className="text-[8.5px] font-black text-amber-300 leading-none truncate w-full">
                              {activeSet.hasHotel ? '🏨 Otel' : activeSet.hasHouse ? '🏠 Ev' : 'Yok'}
                            </span>
                          </div>
                        </div>

                        {/* Integrated Rent Scales Grid */}
                        <div className="bg-white/[0.02] border border-white/5 p-1.5 rounded-lg flex flex-col gap-1.5">
                          <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wide block text-left">
                            {profile.settings.language === 'en' ? 'Rent Scales' : 'Kira Baremleri'}
                          </span>
                          <div className="flex gap-1.5 justify-around">
                            {(RENT_VALUES[activeCol] || []).map((r, idx) => {
                              const isActive = activeSet.cards.length === (idx + 1);
                              return (
                                <div
                                  key={idx}
                                  className={`flex-1 p-1 rounded-lg text-center transition-all border ${isActive
                                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-extrabold shadow-[inset_0_1px_3px_rgba(16,185,129,0.1)]'
                                    : 'bg-black/10 border-transparent text-slate-500 text-[8px]'
                                    }`}
                                >
                                  <div className="text-[6.5px] uppercase font-extrabold leading-none mb-0.5">{idx + 1}K</div>
                                  <div className="text-[8px] font-black font-mono leading-none">{r}M</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Large Action Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playPlaySound();
                            setManagedSetColor(activeCol);
                          }}
                          className={`w-full py-1.5 rounded-lg font-black text-[9px] flex items-center justify-center gap-1 transition-all border uppercase tracking-wider select-none ${isMyTurn
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.2)] active:scale-95 cursor-pointer'
                            : 'bg-slate-900 text-slate-500 border-white/5 cursor-not-allowed opacity-50'
                            }`}
                        >
                          <span>⚙️ SETİ DÜZENLE / BİNA YAP</span>
                        </button>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </div>

          </div>

          {/* Dynamic Spacer/Gap between properties and hand cards in Compact Mode to prevent overlaps on mobile */}
          {isCompactLayout && (
            <div
              className="w-full bg-transparent flex-shrink-0 transition-all pointer-events-none"
              style={{
                height: isHandExpanded
                  ? `${Math.max(4, 16 - (localPlayer.hand.length * 1.2))}px`
                  : '4px'
              }}
            />
          )}

          {(() => {
            const hasActiveAction = match.activeActionRequest || (match.activeActionRequests && match.activeActionRequests.length > 0);
            const waitingForOthers = hasActiveAction && !myActiveRequest;
            if (!waitingForOthers) return null;

            return (
              <div className="mx-auto my-2 max-w-md w-[92%] bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col space-y-2 z-20">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                  <span className="text-[9px] font-black text-amber-400 tracking-wider uppercase flex items-center gap-1">
                    ⏳ {profile.settings.language === 'en' ? "WAITING FOR OTHERS' DECISION" : 'BAŞKASININ KARARI BEKLENİYOR'}
                  </span>
                  {actionTimeLeft !== null && (
                    <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                      ⏱️ {actionTimeLeft}s
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-300 space-y-1">
                  {(() => {
                    // Single request
                    if (match.activeActionRequest) {
                      const req = match.activeActionRequest;
                      const sPlayer = match.players.find(p => p.id === req.sourcePlayerId);
                      const tPlayer = match.players.find(p => p.id === req.targetPlayerId);
                      const actName = req.actionCard?.name || "Aksiyon";

                      return (
                        <p>
                          {profile.settings.language === 'en' ? (
                            <span><strong>{sPlayer?.username}</strong> played <strong>{getTranslatedCardName(req.actionCard, profile)}</strong> against <strong>{tPlayer?.username}</strong>.</span>
                          ) : (
                            <span><strong>{sPlayer?.username}</strong> oyuncusu, <strong>{tPlayer?.username}</strong> oyuncusuna karşı <strong>{actName}</strong> oynadı.</span>
                          )}
                        </p>
                      );
                    }

                    // Multi request (rent or birthday)
                    if (match.activeActionRequests && match.activeActionRequests.length > 0) {
                      const reqs = match.activeActionRequests;
                      const sPlayer = match.players.find(p => p.id === reqs[0].sourcePlayerId);
                      const actName = reqs[0].actionCard?.name || "Kira Talebi";

                      return (
                        <div className="space-y-1.5">
                          <p>
                            {profile.settings.language === 'en' ? (
                              <span><strong>{sPlayer?.username}</strong> requested <strong>{getTranslatedCardName(reqs[0].actionCard, profile)} ({reqs[0].amountDue}M)</strong> from everyone.</span>
                            ) : (
                              <span><strong>{sPlayer?.username}</strong>, herkesten <strong>{actName} ({reqs[0].amountDue}M)</strong> talep etti.</span>
                            )}
                          </p>
                          <div className="grid grid-cols-2 gap-1 bg-black/30 p-1.5 rounded-lg border border-white/5">
                            {match.players.filter(p => p.id !== sPlayer?.id).map(p => {
                              const isPending = reqs.some(r => r.targetPlayerId === p.id);
                              return (
                                <div key={p.id} className="flex items-center justify-between text-[9px] px-1">
                                  <span className="text-slate-400 truncate">{p.username}</span>
                                  {isPending ? (
                                    <span className="text-amber-400 font-extrabold flex items-center gap-0.5">{profile.settings.language === 'en' ? 'Thinking ⏳' : 'Düşünüyor ⏳'}</span>
                                  ) : (
                                    <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">{profile.settings.language === 'en' ? 'Paid/Defended ✅' : 'Ödedi/Savundu ✅'}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>
            );
          })()}

          {/* 3. Bottom Cards Drawer (KARTLARIM - Collapsible & matches Image 4) */}
          <div className="bg-slate-900/90 border-t border-white/10 flex-shrink-0 relative z-30">

            {/* Drawer Header Toolbar */}
            <div className="px-3 py-1.5 bg-black/40 flex items-center justify-between border-b border-white/[0.04]">

              {/* Hand Toggler */}
              <button
                onClick={() => {
                  playPlaySound();
                  setIsHandExpanded(!isHandExpanded);
                }}
                className="flex items-center gap-1 text-[10px] font-extrabold text-slate-300 hover:text-white"
              >
                <span>🎴 {t('cards_count', profile)} ({localPlayer.hand.length})</span>
                <span className="text-[8px]">{isHandExpanded ? '▼' : '▲'}</span>
              </button>

              {/* Active Action Controls */}
              <div className="flex items-center gap-1.5">
                {/* İpucu Lightbulb Button */}
                <button
                  onClick={() => {
                    playPlaySound();
                    setShowHint(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2 py-1 rounded-lg text-[9px] flex items-center gap-0.5 shadow-sm"
                >
                  💡 {t('btn_hint', profile)}
                </button>

                {match.players[match.turnIndex].id === localPlayer.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      {t('moves_played', profile, 3 - match.actionsPlayedThisTurn)}
                    </span>
                    <button
                      onClick={isOffline ? handleOfflineEndTurn : handleEndTurnMultiplayer}
                      disabled={!!match.activeActionRequest}
                      className={`font-black px-3 py-1 rounded-lg text-[9px] shadow-lg flex items-center gap-0.5 ${match.activeActionRequest
                        ? 'bg-purple-900/50 text-purple-300 border border-purple-800/30 cursor-not-allowed opacity-50'
                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                    >
                      {t('btn_end_turn', profile)}
                    </button>
                  </div>
                ) : (
                  <span className="text-[8px] text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded font-bold uppercase">
                    {t('wait_opponent', profile)}
                  </span>
                )}
              </div>

            </div>

            {/* Hand Cards Carousel Content */}
            {isHandExpanded && (
              <div className="p-2.5">
                {match.players[match.turnIndex].id === localPlayer.id && match.actionsPlayedThisTurn === 3 && (
                  <div className="mb-2.5 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-[10px] font-extrabold text-red-400 animate-pulse flex items-center justify-center gap-1.5 shadow-sm">
                    ⚠️ {t('moves_exhausted_warning', profile)}
                  </div>
                )}

                <div className={`flex overflow-x-auto pb-1.5 justify-start scrollbar-thin transition-all ${isCompactLayout ? 'gap-1' : 'gap-2'}`}>
                  {(() => {
                    const sortedHand = [...localPlayer.hand].sort((a, b) => {
                      const getSortOrder = (card: Card) => {
                        if (card.type === 'property' || card.type === 'wildcard') {
                          return 1;
                        }
                        if (card.type === 'action' || card.type === 'rent' || card.type === 'house-hotel') {
                          return 2;
                        }
                        if (card.type === 'money') {
                          return 3;
                        }
                        return 4;
                      };
                      const orderA = getSortOrder(a);
                      const orderB = getSortOrder(b);
                      if (orderA !== orderB) {
                        return orderA - orderB;
                      }
                      return a.name.localeCompare(b.name);
                    });

                    return sortedHand.map((card) => {
                      const isSelected = selectedCard?.id === card.id;

                      return (
                        <motion.div
                          key={card.id}
                          initial={{ scale: 0.85, y: 30, opacity: 0 }}
                          animate={{ scale: 1, y: 0, opacity: 1 }}
                          exit={{ scale: 0.85, y: 30, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          draggable={isMyTurn && !match.activeActionRequest}
                          onDragStart={() => {
                            if (match.activeActionRequest) return;
                            setDraggingCard(card);
                            playPlaySound();
                          }}
                          onDragEnd={() => {
                            setDraggingCard(null);
                          }}
                          onTouchStart={(e) => {
                            if (match.activeActionRequest) return;
                            handleTouchStart(e, card);
                          }}
                          onTouchMove={(e) => {
                            if (match.activeActionRequest) return;
                            handleTouchMove(e);
                          }}
                          onTouchEnd={(e) => {
                            if (match.activeActionRequest) return;
                            handleTouchEnd(e);
                          }}
                          onMouseEnter={() => setHoveredCard(card)}
                          onMouseLeave={() => setHoveredCard(null)}
                          className={`cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-2 select-none flex-shrink-0 ${draggingCard?.id === card.id ? 'opacity-40 scale-95' : ''
                            }`}
                        >
                          <GameCard
                            card={card}
                            size={isCompactLayout ? "medium" : "normal"}
                            isSelected={isSelected}
                            activeEffect={cardEffects[card.id] || null}
                            disable3D={disable3D}
                            cardBack={profile.settings.cardBack} cardSkin={profile.settings.cardSkin || 'skin_none'}
                            onClick={() => {
                              if (match.activeActionRequest) return;
                              triggerHaptic('light');
                              setSelectedCard(card);
                              setShowCardMenu(true);
                              playPlaySound();
                            }}
                          />
                        </motion.div>
                      );
                    });
                  })()}

                  {localPlayer.hand.length === 0 && (
                    <p className="text-[9px] text-slate-500 italic py-4 text-center w-full">Elinizde hiç kart bulunmuyor.</p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Live Feed Panel Drawer/Collapsible sidebar on desktop */}
          {showChatPanel && (
            <div className="hidden lg:flex flex-col w-80 bg-slate-950 border-l border-white/10 h-full absolute right-0 top-0 bottom-0 z-40 p-4 justify-between shadow-2xl">
              <div className="border-b border-white/5 pb-2 mb-2 flex items-center justify-between flex-shrink-0">
                <h3 className="font-bold text-xs text-white">{t('live_feed_chat_title', profile)}</h3>
                <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded">
                  MD-FEED
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
                {match.logs.map((log) => (
                  <div key={log.id} className="bg-black/20 p-1.5 rounded-lg border border-white/5 leading-normal">
                    {log.playerName ? (
                      <p>
                        <strong className="text-amber-400 font-bold">{log.playerName}:</strong>{' '}
                        <span className="text-slate-200">{translateLogMessage(log.message, profile)}</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 font-medium">{translateLogMessage(log.message, profile)}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Emojis Grid */}
              <div className="grid grid-cols-6 gap-1.5 py-1.5 mt-2 border-t border-white/5 flex-shrink-0">
                {['😂', '😭', '😠', '👍', '🎉', '😮', '💩', '❤️', '🔥', '💸', '🎲', '👑'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      playPlaySound();
                      if (!isOffline && socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(JSON.stringify({ type: 'trigger_emoji', userId: profile.id, roomId, emoji }));
                      } else {
                        triggerFloatingEmoji(emoji, profile.username);
                      }
                    }}
                    className="h-8 text-base bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/5 rounded-lg flex items-center justify-center transition-all transform active:scale-90 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="mt-1 flex gap-1.5 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Mesaj gönder..."
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all transform active:scale-95"
                >
                  Gönder
                </button>
              </form>
            </div>
          )}

          {/* Floating Chat Trigger Button - toggles overlay drawer on mobile (matches Image 4) */}
          <button
            onClick={() => setShowChatOverlay(true)}
            className="lg:hidden fixed bottom-16 right-4 w-10 h-10 rounded-full bg-slate-800 border border-white/15 shadow-2xl flex items-center justify-center text-lg hover:scale-105 active:scale-95 transition-transform z-40"
          >
            💬
          </button>

        </div>
      )}

      {/* GAME OVER STATE - Premium Maç Özeti Kartı */}
      {match.status === 'finished' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col justify-center items-center p-4 z-50 overflow-y-auto">
          <FireworksCelebration />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 text-center space-y-5 max-w-md w-full shadow-2xl relative overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-3xl opacity-25 ${match.winnerId === profile.id ? 'bg-amber-400' : 'bg-red-500'
              }`} />
            <div className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-25 ${match.winnerId === profile.id ? 'bg-emerald-400' : 'bg-indigo-500'
              }`} />

            {/* Crown or Defeat Icon */}
            <div className="relative">
              {match.winnerId === profile.id ? (
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 border border-white/20 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-bounce">
                  <span className="text-4xl">👑</span>
                </div>
              ) : (
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-4xl">💔</span>
                </div>
              )}
            </div>

            {/* Header Title */}
            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">Deal Master PRO</span>
              <h3 className="text-2xl font-black text-white mt-1 uppercase tracking-tight">Maç Özeti</h3>
            </div>

            {/* Result Tag */}
            <div className={`py-1.5 px-4 rounded-full mx-auto w-fit text-[11px] font-black tracking-widest uppercase border shadow ${match.winnerId === profile.id
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/15 text-red-400 border-red-500/30'
              }`}>
              {match.winnerId === profile.id ? 'MAÇI KAZANDINIZ! 🎉' : 'MAÇI KAYBETTİNİZ! 🥺'}
            </div>

            {/* Winner Details */}
            <div className="bg-slate-950/60 border border-white/5 p-3.5 rounded-2xl space-y-1 select-none">
              <span className="text-slate-500 text-[8px] block uppercase tracking-wider font-extrabold">Şampiyon</span>
              <span className="font-black text-lg text-white">
                {match.players.find((p) => p.id === match.winnerId)?.username}
              </span>
            </div>

            {/* Stats & Progression Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {/* Gold Coins Gained */}
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center space-y-1">
                <span className="text-[20px] animate-pulse">🪙</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Kazanılan Altın</span>
                <span className="font-extrabold text-sm text-amber-400">+{match.winnerId === profile.id ? '150' : '30'} Altın</span>
              </div>

              {/* XP Gained */}
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center space-y-1">
                <span className="text-[20px] animate-pulse">💎</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Kazanılan XP</span>
                <span className="font-extrabold text-sm text-indigo-400">+{match.winnerId === profile.id ? '100' : '30'} XP</span>
              </div>
            </div>

            {/* Level & Progression Progress Bar */}
            <div className="bg-slate-950/30 border border-white/5 p-4 rounded-2xl space-y-2 select-none text-left">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[9px] font-extrabold uppercase">Seviye İlerlemesi</span>
                  <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-400 rounded text-[8px] font-black uppercase">
                    Seviye {Math.floor(profile.xp / 100) + 1}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{profile.xp % 100} / 100 XP</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profile.xp % 100}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                />
              </div>
            </div>

            {/* Daily Quest Indicator */}
            <div className="bg-slate-950/20 border border-white/5 p-3.5 rounded-2xl space-y-1.5 text-left select-none">
              <span className="text-slate-500 text-[8px] font-extrabold uppercase tracking-wider block">Günlük Görev Güncellemesi</span>
              <div className="flex items-center justify-between text-[9px] font-medium text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Bot Karşılaşması Tamamla</span>
                </div>
                <span className="font-mono text-emerald-400 font-extrabold">Başarılı</span>
              </div>
            </div>

            {/* Exit Action Button */}
            <button
              onClick={() => {
                playPlaySound();
                onLeaveRoom();
              }}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-red-600/30 active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              Ana Menüye Dön
            </button>
          </motion.div>
        </div>
      )}

      {/* --- OVERLAYS & MODALS PANEL (Styled precisely matching Images 2, 3, 5, 7, 8) --- */}

      {/* 0. Odak Modu (Focus Mode) overlay modal */}
      {focusedCard && (
        <div 
          onClick={() => setFocusedCard(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 z-[60] animate-fade-in select-none"
        >
          {/* Main Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg flex flex-col items-center space-y-4 relative"
          >

            {/* Dynamic Slider and Zoom Info Panel */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 w-full flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
              <div className="text-center sm:text-left">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">ODAK MODU / ZOOM</span>
                <h4 className="text-sm font-bold text-white uppercase tracking-tight">{TURKISH_NAMES[focusedCard.name] || focusedCard.name}</h4>
              </div>

              {/* Zoom slider controls */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setFocusedCardZoom(prev => Math.max(0.8, prev - 0.2))}
                  className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-white font-extrabold hover:bg-slate-700 active:scale-90 transition-all text-xs cursor-pointer"
                  title="Uzaklaştır (-)"
                >
                  ➖
                </button>
                <div className="flex-1 sm:w-28 flex flex-col">
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.1"
                    value={focusedCardZoom}
                    onChange={(e) => setFocusedCardZoom(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[8.5px] font-mono text-center text-slate-400 mt-1 font-bold">
                    Ölçek: %{Math.round(focusedCardZoom * 100)}
                  </span>
                </div>
                <button
                  onClick={() => setFocusedCardZoom(prev => Math.min(2.5, prev + 0.2))}
                  className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-white font-extrabold hover:bg-slate-700 active:scale-90 transition-all text-xs cursor-pointer"
                  title="Yakınlaştır (+)"
                >
                  ➕
                </button>
              </div>
            </div>

            {/* Centered Large Card Canvas */}
            <div className="flex-1 flex items-center justify-center overflow-auto py-8 w-full min-h-[300px]">
              <div
                style={{
                  transform: `scale(${focusedCardZoom})`,
                  transition: 'transform 100ms cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="origin-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xl"
              >
                <GameCard card={focusedCard} size="normal" activeEffect={cardEffects[focusedCard.id] || null} disable3D={disable3D} cardBack={profile.settings.cardBack} cardSkin={profile.settings.cardSkin || 'skin_none'} />
              </div>
            </div>

            {/* Action buttons and dismiss */}
            <div className="w-full flex flex-col gap-2">
              {/* If wild and is my turn, integrate color changer directly */}
              {(focusedCard.isWildcard || focusedCard.type === 'wildcard') && isMyTurn && (
                <button
                  onClick={() => {
                    playPlaySound();
                    setPropertyWildcardColorPick(focusedCard);
                    setFocusedCard(null);
                  }}
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer"
                >
                  🔄 KARTIN RENGİNİ / GRUBUNU DEĞİŞTİR
                </button>
              )}

              <button
                onClick={() => {
                  playPlaySound();
                  setFocusedCard(null);
                }}
                className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-white font-black rounded-xl text-xs border border-white/10 shadow transition-all uppercase tracking-wider cursor-pointer"
              >
                ✕ İncelemeyi Kapat
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 1. Play Card Menu overlay modal */}
      {showCardMenu && selectedCard && (
        <div 
          onClick={() => {
            setSelectedCard(null);
            setShowCardMenu(false);
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col sm:flex-row gap-6 items-center"
          >
            {/* Visual Card Preview */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="scale-105 sm:scale-115 origin-center my-2 transition-transform">
                <GameCard card={selectedCard} size="normal" activeEffect={cardEffects[selectedCard.id] || null} disable3D={disable3D} cardBack={profile.settings.cardBack} cardSkin={profile.settings.cardSkin || 'skin_none'} />
              </div>
              <button
                onClick={() => {
                  setFocusedCard(selectedCard);
                  setFocusedCardZoom(window.innerWidth < 640 ? 1.4 : 1.8);
                }}
                className="text-[9px] font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-400/20 transition-all flex items-center gap-1 shadow cursor-pointer uppercase"
              >
                🔍 {t('inspect', profile)} (ZOOM)
              </button>
            </div>

            {/* Actions & Details */}
            <div className="flex-1 w-full space-y-4">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">{t('KART SEÇENEKLERİ', profile)}</span>
                <h3 className="text-lg font-black text-amber-300 uppercase tracking-tight">{getTranslatedCardName(selectedCard, profile)}</h3>
                <p className="text-[11px] text-slate-300 leading-normal">{renderColorizedText(getTranslatedCardDesc(selectedCard, profile), profile.settings.language)}</p>
              </div>

              <div className="space-y-2">
                {/* Option 1: Add to Bank */}
                {(selectedCard.type !== 'property' && selectedCard.type !== 'wildcard') && (
                  <button
                    onClick={() => {
                      if (isOffline) handleOfflinePlayCard(selectedCard.id, 'bank');
                      else handlePlayCardMultiplayer(selectedCard.id, 'bank');
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl text-xs border border-white/5 transition-all flex items-center justify-center gap-1.5"
                  >
                    💵 {t('bank_deposit', profile)} ({selectedCard.value}M)
                  </button>
                )}

                {/* Option 2: Place in Collection as property */}
                {(selectedCard.type === 'property' || selectedCard.type === 'wildcard' || selectedCard.type === 'house-hotel') && (
                  <button
                    onClick={() => {
                      if (selectedCard.type === 'house-hotel') {
                        const res = checkHouseHotelPlayability(selectedCard);
                        if (!res.playable) {
                          alert(res.reason);
                        } else {
                          setHouseHotelColorPick(selectedCard);
                          setShowCardMenu(false);
                        }
                      } else if (selectedCard.isWildcard) {
                        setWildcardColorPick(selectedCard);
                        setShowCardMenu(false);
                      } else {
                        if (isOffline) handleOfflinePlayCard(selectedCard.id, 'property');
                        else handlePlayCardMultiplayer(selectedCard.id, 'property');
                      }
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    🏠 Mülk Olarak Masaya Koy
                  </button>
                )}

                {/* Option 3: Play Action card */}
                {(selectedCard.type === 'action' || selectedCard.type === 'rent') && (
                  <button
                    onClick={() => {
                      const res = checkActionPlayability(selectedCard);
                      if (!res.playable) {
                        alert(res.reason);
                        return;
                      }

                      if (selectedCard.type === 'rent') {
                        setRentColorPick(selectedCard);
                        setShowCardMenu(false);
                      } else if (['sly-deal', 'deal-breaker', 'forced-deal', 'debt-collector'].includes(selectedCard.actionType || '')) {
                        // Reset targets and open target selection modal
                        setActiveActionCard(selectedCard);
                        setSelectedOpponentId(null);
                        setSelectedStolenCardId(null);
                        setSelectedStolenColor(null);
                        setSelectedMyCardId(null);
                        setShowCardMenu(false);
                      } else {
                        if (isOffline) handleOfflinePlayCard(selectedCard.id, 'action');
                        else handlePlayCardMultiplayer(selectedCard.id, 'action');
                      }
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs shadow transition-all flex items-center justify-center gap-1.5"
                  >
                    🚀 Aksiyon Olarak Oyna
                  </button>
                )}

                {/* Option 4: Discard Card (if hand size exceeds 7) */}
                {localPlayer.hand.length > 7 && (
                  <button
                    onClick={() => {
                      if (isOffline) handleOfflineDiscard(selectedCard.id);
                      else handleDiscardMultiplayer(selectedCard.id);
                      setSelectedCard(null);
                      setShowCardMenu(false);
                    }}
                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs border border-red-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    🗑 {profile.settings.language === 'en' ? 'Discard as Excess Card' : 'Elinden Fazla Kart Olarak At'}
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedCard(null);
                    setShowCardMenu(false);
                  }}
                  className="w-full py-2 bg-transparent hover:bg-white/5 text-slate-400 font-bold rounded-xl text-xs transition-all"
                >
                  {t('cancel', profile)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Wildcard Color selector prompt (matches Image 5) */}
      {wildcardColorPick && (
        <div 
          onClick={() => setWildcardColorPick(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">{t('color_select', profile)}</span>
              <h3 className="text-xs text-slate-400 mt-1">{t('select_color_prompt', profile)}</h3>
            </div>

            {match?.settings?.turnLimit !== 'unlimited' && (
              <div className="text-center bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-xs text-amber-400 font-extrabold flex items-center justify-center gap-1.5 animate-pulse">
                ⏱️ {profile.settings.language === 'en' ? 'Remaining Choice Time:' : 'Kalan Seçim Süresi:'} <span className="text-sm font-black text-amber-300">{timeLeft}s</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const possibleColors: CardColor[] = [];
                if (wildcardColorPick.allowedColors && wildcardColorPick.allowedColors.length > 0) {
                  possibleColors.push(...wildcardColorPick.allowedColors);
                } else {
                  if (wildcardColorPick.color) {
                    possibleColors.push(wildcardColorPick.color);
                  }
                  if (wildcardColorPick.secondaryColor && wildcardColorPick.secondaryColor !== wildcardColorPick.color) {
                    possibleColors.push(wildcardColorPick.secondaryColor);
                  }
                  if (possibleColors.length === 0) {
                    possibleColors.push('brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue', 'railroad', 'utility');
                  }
                }

                const isAlreadyPlayed = !localPlayer.hand.some((c) => c.id === wildcardColorPick.id);

                return possibleColors.map((col) => {
                  const count = localPlayer.properties[col]?.cards.length || 0;
                  const max = MAX_IN_SET[col] || 0;
                  const isComplete = count === max && max > 0;

                  return (
                    <button
                      key={col}
                      onClick={() => {
                        if (isAlreadyPlayed) {
                          if (isOffline) handleOfflineChangeWildcardColor(wildcardColorPick.id, col);
                          else handleChangeWildcardColorMultiplayer(wildcardColorPick.id, col);
                        } else {
                          if (isOffline) handleOfflinePlayCard(wildcardColorPick.id, 'property', col);
                          else handlePlayCardMultiplayer(wildcardColorPick.id, 'property', col);
                        }
                        setWildcardColorPick(null);
                      }}
                      className={`p-2 rounded-xl border text-[9px] font-extrabold flex flex-col items-center gap-1.5 transition-all bg-slate-950 hover:bg-slate-900 ${isComplete
                        ? 'border-emerald-500/40 hover:border-emerald-500/70'
                        : count > 0
                          ? 'border-amber-500/40 hover:border-amber-500/70'
                          : 'border-white/10 hover:border-white/30'
                        }`}
                    >
                      <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLOR_HEX[col] }} />
                      <span className="text-white">{getTranslatedColorLabel(col, profile)}</span>
                      <span className={`text-[7.5px] px-1 py-0.2 rounded font-black ${isComplete
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : count > 0
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-slate-800 text-slate-500'
                        }`}>
                        {count > 0 ? `${count}/${max} ${t('cards_count', profile).toLowerCase()}` : t('no_property', profile)}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>

            <button
              onClick={() => setWildcardColorPick(null)}
              className="w-full py-1.5 bg-transparent hover:bg-white/5 text-slate-500 font-bold rounded-xl text-[10px] transition-all"
            >
              {t('cancel', profile)}
            </button>
          </div>
        </div>
      )}

      {/* Rent Color selector prompt */}
      {rentColorPick && (
        <div 
          onClick={() => setRentColorPick(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">{profile.settings.language === 'en' ? 'Collect Rent' : 'Kira Bedeli Al'}</span>
              <h3 className="text-xs text-slate-400 mt-1">{profile.settings.language === 'en' ? 'Which property set would you like to collect rent for?' : 'Hangi mülk grubunuz için kira toplamak istersiniz?'}</h3>
              <p className="text-[9px] text-slate-500 mt-1">{profile.settings.language === 'en' ? 'You can only demand rent on properties you own.' : 'Sadece sahip olduğunuz mülklerden kira talep edebilirsiniz.'}</p>
            </div>

            {localPlayer.hand.some((c) => c.actionType === 'double-rent') && match.actionsPlayedThisTurn < 2 && (
              <button
                type="button"
                onClick={() => setUseDoubleRent(!useDoubleRent)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none text-left ${useDoubleRent
                    ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] animate-pulse'
                    : 'bg-slate-950/80 border-white/5 hover:border-amber-500/30'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base ${useDoubleRent ? 'bg-amber-500 text-slate-950 scale-110' : 'bg-slate-800 text-slate-400'
                    } transition-all duration-300`}>
                    ⚡
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black tracking-wide uppercase ${useDoubleRent ? 'text-amber-400' : 'text-slate-200'}`}>
                      {t('double_rent', profile)} {useDoubleRent ? '(AKTİF)' : '(PASİF)'}
                    </span>
                    <span className="text-[7.5px] text-slate-400 font-bold">
                      {profile.settings.language === 'en'
                        ? 'Double the rent amount (+1 action used)'
                        : 'Kira bedelini iki katına çıkarır (+1 hamle)'}
                    </span>
                  </div>
                </div>
                {/* Visual Switch Indicator */}
                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${useDoubleRent ? 'bg-amber-500' : 'bg-slate-800'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${useDoubleRent ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const possibleColors: CardColor[] = [];
                if (rentColorPick.color) {
                  possibleColors.push(rentColorPick.color);
                }
                if (rentColorPick.secondaryColor && rentColorPick.secondaryColor !== rentColorPick.color) {
                  possibleColors.push(rentColorPick.secondaryColor);
                }
                if (possibleColors.length === 0) {
                  possibleColors.push('brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue', 'railroad', 'utility');
                }

                return possibleColors.map((col) => {
                  const set = localPlayer.properties[col];
                  const hasProp = (set?.cards.length || 0) > 0;
                  const currentRent = hasProp ? calculateSetRent(set.cards, col, set.hasHouse, set.hasHotel) : 0;
                  const doubledRent = currentRent * 2;

                  return (
                    <button
                      key={col}
                      disabled={!hasProp}
                      onClick={() => {
                        const payload = useDoubleRent ? { isDoubleRent: true } : undefined;
                        const isWildRent = rentColorPick.name === 'Her Renk Kira Kartı' || !rentColorPick.color;
                        if (isWildRent) {
                          setRentTargetSelect({ card: rentColorPick, color: col, payload });
                        } else {
                          if (isOffline) handleOfflinePlayCard(rentColorPick.id, 'action', col, payload);
                          else handlePlayCardMultiplayer(rentColorPick.id, 'action', col, payload);
                        }
                        setRentColorPick(null);
                        setUseDoubleRent(false);
                      }}
                      className={`p-2.5 rounded-xl border text-[9px] font-extrabold flex flex-col items-center gap-1.5 transition-all text-center ${hasProp
                        ? 'border-white/10 hover:border-amber-500 bg-slate-950 text-white cursor-pointer shadow-lg hover:bg-slate-900/60'
                        : 'border-white/5 bg-slate-950/40 text-slate-600 cursor-not-allowed opacity-50'
                        }`}
                    >
                      <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLOR_HEX[col], filter: hasProp ? 'none' : 'grayscale(1)' }} />
                      <div className="flex flex-col items-center">
                        <span className="text-white font-extrabold">{getTranslatedColorLabel(col, profile)}</span>
                        {hasProp ? (
                          <div className="flex flex-col items-center mt-1 space-y-0.5">
                            <span className="text-[8px] text-slate-400 font-bold">
                              {set.cards.length} {profile.settings.language === 'en' ? (set.cards.length === 1 ? 'Property' : 'Properties') : 'Adet Mülk'}
                            </span>
                            <span className="text-[9px] font-black text-emerald-400">
                              {profile.settings.language === 'en' ? 'Rent: ' : 'Kira: '}{currentRent}M
                            </span>
                            {useDoubleRent && (
                              <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 animate-pulse mt-0.5">
                                💥 {profile.settings.language === 'en' ? 'Double:' : '2 Katı:'} {doubledRent}M
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] text-slate-500 block mt-0.5">{t('no_property', profile)}</span>
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>

            <button
              onClick={() => setRentColorPick(null)}
              className="w-full py-1.5 bg-transparent hover:bg-white/5 text-slate-500 font-bold rounded-xl text-[10px] transition-all"
            >
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* Rent Target selector prompt (for Her Renk Kira Kartı) */}
      {rentTargetSelect && (
        <div 
          onClick={() => setRentTargetSelect(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-500 block uppercase tracking-wider">Kira Hedefi Seç</span>
              <h3 className="text-xs text-slate-400 mt-1">Hangi rakipten kira tahsil etmek istersiniz?</h3>
              <p className="text-[9px] text-slate-500 mt-1">Her Renk Kira Kartı sadece seçtiğiniz 1 oyuncudan kira tahsil eder.</p>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
              {otherPlayers.map((op) => {
                const bankTotal = op.bank.reduce((sum, c) => sum + c.value, 0);
                const totalProperties = Object.values(op.properties).reduce((acc: number, set: any) => acc + (set?.cards?.length || 0), 0);
                const completedSets = countCompletedSets(op.properties);

                return (
                  <button
                    key={op.id}
                    onClick={() => {
                      const finalPayload = { ...rentTargetSelect.payload, targetPlayerId: op.id };
                      if (isOffline) handleOfflinePlayCard(rentTargetSelect.card.id, 'action', rentTargetSelect.color, finalPayload);
                      else handlePlayCardMultiplayer(rentTargetSelect.card.id, 'action', rentTargetSelect.color, finalPayload);
                      setRentTargetSelect(null);
                    }}
                    className="w-full p-3.5 rounded-2xl border border-white/5 hover:border-amber-500 bg-slate-950/80 hover:bg-slate-900 text-white transition-all text-left flex flex-col space-y-2.5 shadow-lg"
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm shadow">
                          {op.isBot ? '🤖' : '👤'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black tracking-tight">{op.username}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                            {op.isBot ? 'Yapay Zeka' : 'Oyuncu'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                        💵 {bankTotal}M
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setRentTargetSelect(null)}
              className="w-full py-1.5 bg-transparent hover:bg-white/5 text-slate-500 font-bold rounded-xl text-[10px] transition-all"
            >
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* House/Hotel Color selector prompt */}
      {houseHotelColorPick && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">Mülk Geliştir</span>
              <h3 className="text-xs text-slate-400 mt-1">
                {houseHotelColorPick.actionType === 'house' ? 'Evi hangi sete yerleştirmek istersiniz?' : 'Oteli hangi sete yerleştirmek istersiniz?'}
              </h3>
            </div>

            <div className="space-y-2">
              {(() => {
                const eligibleColors: CardColor[] = [];
                Object.keys(localPlayer.properties).forEach((colorKey) => {
                  const col = colorKey as CardColor;
                  if (col === 'railroad' || col === 'utility') return;
                  const set = localPlayer.properties[col];
                  if (!set) return;

                  if (houseHotelColorPick.actionType === 'house') {
                    if (set.cards.length >= MAX_IN_SET[col] && !set.hasHouse) {
                      eligibleColors.push(col);
                    }
                  } else {
                    if (set.cards.length >= MAX_IN_SET[col] && set.hasHouse && !set.hasHotel) {
                      eligibleColors.push(col);
                    }
                  }
                });

                return eligibleColors.map((col) => {
                  return (
                    <button
                      key={col}
                      onClick={() => {
                        if (isOffline) handleOfflinePlayCard(houseHotelColorPick.id, 'property', col);
                        else handlePlayCardMultiplayer(houseHotelColorPick.id, 'property', col);
                        setHouseHotelColorPick(null);
                      }}
                      className="w-full p-3 rounded-xl border border-white/10 hover:border-emerald-500 bg-slate-950 text-white font-bold flex items-center justify-between transition-all hover:bg-slate-900"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                        <span className="text-xs">{COLOR_LABELS[col]} Seti</span>
                      </div>
                      <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded">Set Tamamlandı</span>
                    </button>
                  );
                });
              })()}
            </div>

            <button
              onClick={() => setHouseHotelColorPick(null)}
              className="w-full py-1.5 bg-transparent hover:bg-white/5 text-slate-500 font-bold rounded-xl text-[10px] transition-all"
            >
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* Step-by-Step Action Target Selection Modal */}
      {activeActionCard && (
        <div 
          onClick={() => setActiveActionCard(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
          >
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-500 block uppercase tracking-wider">{getTranslatedCardName(activeActionCard, profile)}</span>
              <h3 className="text-xs text-slate-400 mt-1">{profile.settings.language === 'en' ? 'Select Card Targets' : 'Kart Hedeflerini Seçin'}</h3>
            </div>

            {match?.settings?.turnLimit !== 'unlimited' && (
              <div className="text-center bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-xs text-amber-400 font-extrabold flex items-center justify-center gap-1.5 animate-pulse">
                ⏱️ {profile.settings.language === 'en' ? 'Remaining Choice Time:' : 'Kalan Seçim Süresi:'} <span className="text-sm font-black text-amber-300">{timeLeft}s</span>
              </div>
            )}

            {/* STEP 1: Select Opponent (Debt Collector, Sly Deal, Deal Breaker, Forced Deal) */}
            {!selectedOpponentId && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">{profile.settings.language === 'en' ? 'Which opponent would you like to target?' : 'Hangi rakibi hedef almak istersiniz?'}</p>
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {otherPlayers.map((op) => {
                    const bankTotal = op.bank.reduce((sum, c) => sum + c.value, 0);
                    const totalProperties = Object.values(op.properties).reduce((acc: number, set: any) => acc + (set?.cards?.length || 0), 0);
                    const completedSets = countCompletedSets(op.properties);

                    return (
                      <button
                        key={op.id}
                        onClick={() => setSelectedOpponentId(op.id)}
                        className="w-full p-3.5 rounded-2xl border border-white/5 hover:border-amber-500 bg-slate-950/80 hover:bg-slate-900 text-white transition-all text-left flex flex-col space-y-2.5 shadow-lg"
                      >
                        {/* Player Header */}
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm shadow">
                              {op.isBot ? '🤖' : '👤'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-black text-xs text-slate-100 flex items-center gap-1.5">
                                {op.username}
                                {op.isBot && (
                                  <span className="text-[7.5px] font-extrabold bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1 py-0.5 rounded">
                                    BOT
                                  </span>
                                )}
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                {completedSets > 0 ? t('completed_sets_count', profile, completedSets) : t('no_sets', profile)}
                              </span>
                            </div>
                          </div>

                          {/* Bank Badge */}
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black">
                            <span>🏦 {t('bank', profile)}:</span>
                            <span className="text-white">{bankTotal}M</span>
                          </div>
                        </div>

                        {/* Player Properties Summary */}
                        <div className="w-full space-y-1.5 pt-1.5 border-t border-white/5">
                          <div className="flex justify-between text-[8px] font-bold text-slate-400">
                            <span>{t('properties_count', profile, totalProperties)}</span>
                            <span>{t('set_status', profile)}</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {Object.keys(op.properties).map((colorKey) => {
                              const col = colorKey as CardColor;
                              const set = op.properties[col];
                              if (!set || set.cards.length === 0) return null;

                              const count = set.cards.length;
                              const max = MAX_IN_SET[col];
                              const colorHex = COLOR_HEX[col];
                              const isComplete = count === max;

                              return (
                                <div
                                  key={col}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8.5px] font-black border shadow-sm"
                                  style={{
                                    backgroundColor: isComplete ? `${colorHex}25` : `${colorHex}10`,
                                    borderColor: isComplete ? `${colorHex}70` : `${colorHex}30`,
                                    color: colorHex
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorHex }} />
                                  <span className="text-white font-extrabold">{count}/{max}</span>
                                </div>
                              );
                            })}
                            {totalProperties === 0 && (
                              <span className="text-[8.5px] text-slate-500 font-bold italic">{t('no_properties', profile)}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Selected Opponent details and next steps */}
            {selectedOpponentId && (() => {
              const op = otherPlayers.find((p) => p.id === selectedOpponentId);
              if (!op) return null;

              const renderSideBySideComparison = () => {
                const myBank = localPlayer.bank.reduce((sum, c) => sum + c.value, 0);
                const opBank = op.bank.reduce((sum, c) => sum + c.value, 0);
                const myPropsCount = Object.values(localPlayer.properties).reduce((acc: number, set: any) => acc + (set?.cards?.length || 0), 0);
                const opPropsCount = Object.values(op.properties).reduce((acc: number, set: any) => acc + (set?.cards?.length || 0), 0);

                return (
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-white/5 text-[9px] mb-3">
                    {/* My Assets */}
                    <div className="space-y-1.5 border-r border-white/5 pr-2 text-left">
                      <span className="font-bold text-[8px] text-slate-400 uppercase tracking-wider block">
                        {profile.settings.language === 'en' ? 'My Assets' : 'Kendi Varlıklarım'}
                      </span>
                      <div className="text-[10px] font-black text-emerald-400">
                        🏦 {myBank}M
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(localPlayer.properties).map((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = localPlayer.properties[col];
                          if (!set || set.cards.length === 0) return null;
                          const isComp = set.cards.length >= MAX_IN_SET[col];
                          return (
                            <div
                              key={col}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black border"
                              style={{
                                backgroundColor: `${COLOR_HEX[col]}15`,
                                borderColor: isComp ? `${COLOR_HEX[col]}70` : `${COLOR_HEX[col]}30`,
                                color: COLOR_HEX[col]
                              }}
                            >
                              <span>{isComp ? '👑' : `${set.cards.length}/${MAX_IN_SET[col]}`}</span>
                            </div>
                          );
                        })}
                        {myPropsCount === 0 && (
                          <span className="text-slate-500 italic text-[7.5px]">{t('no_properties', profile)}</span>
                        )}
                      </div>
                    </div>

                    {/* Opponent Assets */}
                    <div className="space-y-1.5 pl-2 text-left">
                      <span className="font-bold text-[8px] text-slate-400 uppercase tracking-wider block">
                        {op.username}
                      </span>
                      <div className="text-[10px] font-black text-amber-400">
                        🏦 {opBank}M
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(op.properties).map((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = op.properties[col];
                          if (!set || set.cards.length === 0) return null;
                          const isComp = set.cards.length >= MAX_IN_SET[col];
                          return (
                            <div
                              key={col}
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black border"
                              style={{
                                backgroundColor: `${COLOR_HEX[col]}15`,
                                borderColor: isComp ? `${COLOR_HEX[col]}70` : `${COLOR_HEX[col]}30`,
                                color: COLOR_HEX[col]
                              }}
                            >
                              <span>{isComp ? '👑' : `${set.cards.length}/${MAX_IN_SET[col]}`}</span>
                            </div>
                          );
                        })}
                        {opPropsCount === 0 && (
                          <span className="text-slate-500 italic text-[7.5px]">{t('no_properties', profile)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              // Strategic advice helper for taking a card (Sly Deal or Forced Deal)
              const getTakeCardRecommendation = (col: CardColor, card: Card) => {
                const mySet = localPlayer.properties[col];
                const myCount = mySet?.cards?.length || 0;
                const maxInSet = MAX_IN_SET[col];

                if (myCount > 0 && myCount + 1 === maxInSet) {
                  return {
                    label: profile.settings.language === 'en' ? '🏆 Completes Set (Critical!)' : '🏆 Set Tamamlar (Kritik!)',
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    desc: profile.settings.language === 'en' ? 'Taking this completes your set and boosts the rent!' : 'Bu mülkü alarak seti tamamlayabilir ve kira değerini zirveye taşıyabilirsin!'
                  };
                }
                if (myCount > 0) {
                  return {
                    label: profile.settings.language === 'en' ? '📈 Expands Set' : '📈 Setini Büyütür',
                    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                    desc: profile.settings.language === 'en' ? 'Add this to your set to increase your rent.' : 'Bu mülkü alarak mevcut setine ekleyebilir ve kirayı arttırabilirsin.'
                  };
                }
                const opSet = op.properties[col];
                const opCount = opSet?.cards?.length || 0;
                if (opCount > 1 && opCount === maxInSet - 1) {
                  return {
                    label: profile.settings.language === 'en' ? '🛡️ Blocks Opponent!' : '🛡️ Rakibi Engeller!',
                    bg: 'bg-red-500/10 border-red-500/30 text-red-400',
                    desc: profile.settings.language === 'en' ? 'Opponent is close to completing this set! Block them by stealing this.' : 'Rakip bu rengi tamamlamak üzere! Bunu alarak rakibini engellersin.'
                  };
                }
                return {
                  label: profile.settings.language === 'en' ? '🏢 New Color Set' : '🏢 Yeni Renk Grubu',
                  bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                  desc: profile.settings.language === 'en' ? 'A great opportunity to start a new property set.' : 'Yeni bir renk grubu kurmak için harika bir fırsat.'
                };
              };

              // Strategic advice helper for giving a card (Forced Deal)
              const getGiveCardRecommendation = (col: CardColor, card: Card) => {
                const mySet = localPlayer.properties[col];
                const myCount = mySet?.cards?.length || 0;

                if (myCount === 1 && card.value <= 2) {
                  return {
                    label: profile.settings.language === 'en' ? '✅ Best Choice to Give' : '✅ Vermek İçin En Avantajlı',
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    desc: profile.settings.language === 'en' ? 'A low-value single property. Giving it will not break a set.' : 'Tek olan ve değeri düşük mülklerinizden biri. Vermek seti bozmaz.'
                  };
                }
                if (myCount > 1 && myCount < MAX_IN_SET[col]) {
                  return {
                    label: profile.settings.language === 'en' ? '⚠️ Caution: Reduces Set' : '⚠️ Dikkat: Setini Küçültür',
                    bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                    desc: profile.settings.language === 'en' ? 'Giving away a card from a set you are collecting will shrink it.' : 'Biriktirmekte olduğunuz bir setin kartını vermek setinizi küçültür.'
                  };
                }
                return {
                  label: profile.settings.language === 'en' ? '⚖️ Tradeable' : '⚖️ Verilebilir',
                  bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
                  desc: profile.settings.language === 'en' ? 'A trade that does not harm your active sets.' : 'Stratejik setlerinize doğrudan zarar vermeyen bir takas.'
                };
              };

              // Strategic advice helper for Deal Breaker (stealing complete sets)
              const getDealBreakerRecommendation = (col: CardColor) => {
                const mySet = localPlayer.properties[col];
                const myCount = mySet?.cards?.length || 0;

                if (myCount > 0) {
                  return {
                    label: profile.settings.language === 'en' ? '🔥 Double Set Advantage!' : '🔥 Çift Set Avantajı!',
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    desc: profile.settings.language === 'en' ? 'Stealing this set will grant huge rent advantage or immediate victory!' : 'Bu seti alarak devasa kira avantajı veya doğrudan galibiyet sağlayabilirsin!'
                  };
                }
                return {
                  label: profile.settings.language === 'en' ? '🏆 Instant Full Set!' : '🏆 Doğrudan Yeni Tam Set!',
                  bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                  desc: profile.settings.language === 'en' ? 'Stealing an opponent completed set greatly increases your chance of winning!' : 'Rakibin tamamlanmış setini çalmak oyunu kazanma şansını çok arttırır!'
                };
              };

              // Sly Deal
              if (activeActionCard.actionType === 'sly-deal') {
                return (
                  <div className="space-y-3">
                    {renderSideBySideComparison()}
                    <p className="text-xs text-slate-300">
                      {profile.settings.language === 'en' ? (
                        <span>Select a property of <strong>{op.username}</strong> to steal (completed sets excluded):</span>
                      ) : (
                        <span><strong>{op.username}</strong> adlı oyuncunun çalmak istediğiniz mülkünü seçin (Tamamlanmış setler hariç):</span>
                      )}
                    </p>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {Object.keys(op.properties).flatMap((colorKey) => {
                        const col = colorKey as CardColor;
                        const set = op.properties[col];
                        if (!set || set.cards.length === 0 || set.cards.length >= MAX_IN_SET[col]) return [];

                        return set.cards.map((c) => {
                          const advice = getTakeCardRecommendation(col, c);
                          const mySet = localPlayer.properties[col];
                          const myCount = mySet?.cards?.length || 0;
                          const opCount = set.cards.length;

                          return (
                            <button
                              key={c.id}
                              onClick={() => {
                                const payload = { targetPlayerId: op.id, targetCardId: c.id };
                                if (isOffline) handleOfflinePlayCard(activeActionCard.id, 'action', undefined, payload);
                                else handlePlayCardMultiplayer(activeActionCard.id, 'action', undefined, payload);
                                setActiveActionCard(null);
                              }}
                              className="w-full p-3 rounded-2xl border border-white/5 hover:border-amber-500 bg-slate-950/80 hover:bg-slate-900 text-white transition-all text-left flex flex-col space-y-1.5 shadow-lg"
                              style={{
                                borderLeft: `4px solid ${COLOR_HEX[col]}`,
                              }}
                            >
                              <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                                  <span className="font-bold text-xs">{getTranslatedCardName(c, profile)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {myCount > 0 && (
                                    <span className="text-[7px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      🎯 {profile.settings.language === 'en' ? 'Fits You' : 'Sana Uyumlu'}
                                    </span>
                                  )}
                                  {opCount > 1 && (
                                    <span className="text-[7px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                      ⚡ {profile.settings.language === 'en' ? 'Hurts Opponent' : 'Rakibe Zararlı'}
                                    </span>
                                  )}
                                  <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/40" style={{ color: COLOR_HEX[col] }}>
                                    {getTranslatedColorLabel(col, profile)}
                                  </span>
                                </div>
                              </div>
                              <div className={`text-[8.5px] font-bold px-2 py-1 rounded border ${advice.bg} flex flex-col space-y-0.5`}>
                                <span className="uppercase font-black tracking-wide">{advice.label}</span>
                                <span className="text-[7.5px] font-normal text-slate-400">{advice.desc}</span>
                              </div>
                            </button>
                          );
                        });
                      })}
                    </div>
                  </div>
                );
              }

              // Deal Breaker
              if (activeActionCard.actionType === 'deal-breaker') {
                return (
                  <div className="space-y-3">
                    {renderSideBySideComparison()}
                    <p className="text-xs text-slate-300">
                      {profile.settings.language === 'en' ? (
                        <span>Select a completed property set of <strong>{op.username}</strong> to steal:</span>
                      ) : (
                        <span><strong>{op.username}</strong> adlı oyuncunun çalmak istediğiniz tamamlanmış mülk setini seçin:</span>
                      )}
                    </p>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {Object.keys(op.properties).map((colorKey) => {
                        const col = colorKey as CardColor;
                        const set = op.properties[col];
                        if (!set || set.cards.length === 0 || set.cards.length < MAX_IN_SET[col]) return null;

                        const advice = getDealBreakerRecommendation(col);
                        return (
                          <button
                            key={col}
                            onClick={() => {
                              const payload = { targetPlayerId: op.id, targetColor: col };
                              if (isOffline) handleOfflinePlayCard(activeActionCard.id, 'action', undefined, payload);
                              else handlePlayCardMultiplayer(activeActionCard.id, 'action', undefined, payload);
                              setActiveActionCard(null);
                            }}
                            className="w-full p-3 rounded-2xl border border-white/5 hover:border-amber-500 bg-slate-950/80 hover:bg-slate-900 text-white transition-all text-left flex flex-col space-y-1.5 shadow-lg"
                            style={{
                              borderLeft: `4px solid ${COLOR_HEX[col]}`,
                            }}
                          >
                            <div className="flex justify-between items-center w-full">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                                <span className="font-bold text-xs">{getTranslatedColorLabel(col, profile)} {profile.settings.language === 'en' ? 'Set' : 'Seti'}</span>
                              </div>
                              <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                {set.cards.length} {profile.settings.language === 'en' ? (set.cards.length === 1 ? 'Property' : 'Properties') : 'Mülk'}
                              </span>
                            </div>
                            <div className={`text-[8.5px] font-bold px-2 py-1 rounded border ${advice.bg} flex flex-col space-y-0.5`}>
                              <span className="uppercase font-black tracking-wide">{advice.label}</span>
                              <span className="text-[7.5px] font-normal text-slate-400">{advice.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Forced Deal
              if (activeActionCard.actionType === 'forced-deal') {
                if (!selectedStolenCardId) {
                  return (
                    <div className="space-y-3">
                      {renderSideBySideComparison()}
                      <p className="text-xs text-slate-300">
                        {profile.settings.language === 'en' ? (
                          <span>Select a property of <strong>{op.username}</strong> to take (incomplete sets only):</span>
                        ) : (
                          <span><strong>{op.username}</strong> adlı oyuncudan almak istediğiniz mülkü seçin (Sadece tamamlanmamış setler):</span>
                        )}
                      </p>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {Object.keys(op.properties).flatMap((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = op.properties[col];
                          if (!set || set.cards.length === 0 || set.cards.length >= MAX_IN_SET[col]) return [];

                          return set.cards.map((c) => {
                            const advice = getTakeCardRecommendation(col, c);
                            const mySet = localPlayer.properties[col];
                            const myCount = mySet?.cards?.length || 0;
                            const opCount = set.cards.length;

                            return (
                              <button
                                key={c.id}
                                onClick={() => setSelectedStolenCardId(c.id)}
                                className="w-full p-3 rounded-2xl border border-white/5 hover:border-amber-500 bg-slate-950/80 hover:bg-slate-900 text-white transition-all text-left flex flex-col space-y-1.5 shadow-lg"
                                style={{
                                  borderLeft: `4px solid ${COLOR_HEX[col]}`,
                                }}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                                    <span className="font-bold text-xs">{getTranslatedCardName(c, profile)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {myCount > 0 && (
                                      <span className="text-[7px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        🎯 {profile.settings.language === 'en' ? 'Fits You' : 'Sana Uyumlu'}
                                      </span>
                                    )}
                                    {opCount > 1 && (
                                      <span className="text-[7px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        ⚡ {profile.settings.language === 'en' ? 'Hurts Opponent' : 'Rakibe Zararlı'}
                                      </span>
                                    )}
                                    <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/40" style={{ color: COLOR_HEX[col] }}>
                                      {getTranslatedColorLabel(col, profile)}
                                    </span>
                                  </div>
                                </div>
                                <div className={`text-[8.5px] font-bold px-2 py-1 rounded border ${advice.bg} flex flex-col space-y-0.5`}>
                                  <span className="uppercase font-black tracking-wide">{advice.label}</span>
                                  <span className="text-[7.5px] font-normal text-slate-400">{advice.desc}</span>
                                </div>
                              </button>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="space-y-3">
                      {renderSideBySideComparison()}
                      <p className="text-xs text-slate-300">
                        {profile.settings.language === 'en' ? (
                          <span>Select your own property to give in return (incomplete sets only):</span>
                        ) : (
                          <span>Karşılığında vermek istediğiniz kendi mülkünüzü seçin (Sadece tamamlanmamış setleriniz):</span>
                        )}
                      </p>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {Object.keys(localPlayer.properties).flatMap((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = localPlayer.properties[col];
                          if (!set || set.cards.length === 0 || set.cards.length >= MAX_IN_SET[col]) return [];

                          return set.cards.map((c) => {
                            const advice = getGiveCardRecommendation(col, c);
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  const payload = { targetPlayerId: op.id, targetCardId: selectedStolenCardId, myCardId: c.id };
                                  if (isOffline) handleOfflinePlayCard(activeActionCard.id, 'action', undefined, payload);
                                  else handlePlayCardMultiplayer(activeActionCard.id, 'action', undefined, payload);
                                  setActiveActionCard(null);
                                }}
                                className="w-full p-3 rounded-2xl border border-white/5 hover:border-amber-500 bg-slate-950/80 hover:bg-slate-900 text-white transition-all text-left flex flex-col space-y-1.5 shadow-lg"
                                style={{
                                  borderLeft: `4px solid ${COLOR_HEX[col]}`,
                                }}
                              >
                                <div className="flex justify-between items-center w-full">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                                    <span className="font-bold text-xs">{getTranslatedCardName(c, profile)}</span>
                                  </div>
                                  <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/40" style={{ color: COLOR_HEX[col] }}>
                                    {getTranslatedColorLabel(col, profile)}
                                  </span>
                                </div>
                                <div className={`text-[8.5px] font-bold px-2 py-1 rounded border ${advice.bg} flex flex-col space-y-0.5`}>
                                  <span className="uppercase font-black tracking-wide">{advice.label}</span>
                                  <span className="text-[7.5px] font-normal text-slate-400">{advice.desc}</span>
                                </div>
                              </button>
                            );
                          });
                        })}
                      </div>
                    </div>
                  );
                }
              }

              // Debt Collector
              if (activeActionCard.actionType === 'debt-collector') {
                return (
                  <div className="space-y-3 text-center">
                    {renderSideBySideComparison()}
                    <p className="text-xs text-slate-300">
                      {profile.settings.language === 'en' ? (
                        <span>5M debt will be collected from player <strong>{op.username}</strong>. Do you confirm?</span>
                      ) : (
                        <span><strong>{op.username}</strong> oyuncusundan 5M borç tahsil edilecek. Onaylıyor musunuz?</span>
                      )}
                    </p>
                    <button
                      onClick={() => {
                        const payload = { targetPlayerId: op.id };
                        if (isOffline) handleOfflinePlayCard(activeActionCard.id, 'action', undefined, payload);
                        else handlePlayCardMultiplayer(activeActionCard.id, 'action', undefined, payload);
                        setActiveActionCard(null);
                      }}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-all"
                    >
                      {profile.settings.language === 'en' ? 'Confirm and Ask Debt' : 'Onayla ve Borç İste'}
                    </button>
                  </div>
                );
              }

              return null;
            })()}

            <button
              onClick={() => setActiveActionCard(null)}
              className="w-full py-1.5 bg-transparent hover:bg-white/5 text-slate-500 font-bold rounded-xl text-[10px] transition-all"
            >
              {t('cancel', profile)}
            </button>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert && (
        <div 
          onClick={() => setCustomAlert(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative overflow-hidden"
          >
            {/* Top accent light */}
            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-red-500 via-amber-500 to-red-500"></div>

            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500 text-xl animate-pulse">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-slate-100 tracking-tight uppercase">
                  {customAlert.title}
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  {customAlert.message}
                </p>
              </div>
            </div>

            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-98 tracking-wide uppercase"
            >
              Tamam
            </button>
          </div>
        </div>
      )}

      {/* 3. Multiplayer Payment Select interface overlay (matches Image 2, 3) */}
      {myActiveRequest && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">

            {myActiveRequest.type === 'just-say-no' ? (
              // JSN DEFENSE INTERFACE
              <div className="space-y-4">
                <div className="text-center space-y-1 border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-bold text-red-500 block uppercase tracking-wider animate-pulse">🛡️ {profile.settings.language === 'en' ? 'DEFENSE CHAIN (JSN)' : 'SAVUNMA ZİNCİRİ (JSN)'}</span>
                  <h3 className="text-sm font-bold text-slate-200">
                    {profile.settings.language === 'en' ? 'An action was played against you!' : 'Sana karşı bir hamle yapıldı!'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2">
                    {(() => {
                      const req = myActiveRequest;
                      const jsnCount = req.jsnCount || 0;
                      const sPlayer = match.players.find((p: any) => p.id === req.sourcePlayerId);
                      const actName = req.actionCard?.name || "Önemli Aksiyon";

                      if (jsnCount === 0) {
                        return (
                          <span>
                            {profile.settings.language === 'en' ? (
                              <span><strong>{sPlayer?.username}</strong> played <strong>{getTranslatedCardName(req.actionCard, profile)}</strong> against you and wants to resolve their action.</span>
                            ) : (
                              <span><strong>{sPlayer?.username}</strong>, sana karşı <strong>{actName}</strong> kartını oynadı ve hamlesini gerçekleştirmek istiyor.</span>
                            )}
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-amber-400">
                            {profile.settings.language === 'en' ? (
                              <span>🔥 <strong>{sPlayer?.username}</strong> countered with Just Say No! (Counter-Counter!) Chain count: <strong>{jsnCount}</strong></span>
                            ) : (
                              <span>🔥 <strong>{sPlayer?.username}</strong> senin savunmana karşı 'Hayır Teşekkürler' kartı kullandı! (Reddete Redet!) Zincirdeki JSN sayısı: <strong>{jsnCount}</strong></span>
                            )}
                          </span>
                        );
                      }
                    })()}
                  </p>
                </div>

                <div className="bg-black/35 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1.5 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">{profile.settings.language === 'en' ? 'Action Details:' : 'Hamle Detayı:'}</span>
                  {(() => {
                    const req = myActiveRequest;
                    const type = req.originalAction?.type || req.actionCard?.actionType || req.actionCard?.type;

                    const stolenCard = (() => {
                      if (!req.targetCardId) return null;
                      for (const p of match.players) {
                        for (const col in p.properties) {
                          const card = p.properties[col as CardColor]?.cards.find(c => c.id === req.targetCardId);
                          if (card) return card;
                        }
                      }
                      return null;
                    })();

                    const givenCard = (() => {
                      if (!req.myCardId) return null;
                      for (const p of match.players) {
                        for (const col in p.properties) {
                          const card = p.properties[col as CardColor]?.cards.find(c => c.id === req.myCardId);
                          if (card) return card;
                        }
                      }
                      return null;
                    })();

                    if (type === 'sly-deal') {
                      return (
                        <div className="text-[10px] space-y-1 text-center">
                          <p className="font-bold text-white">
                            {profile.settings.language === 'en' ? (
                              <span>🎯 Sly Deal: Wants to steal your property!</span>
                            ) : (
                              <span>🎯 Sinsi Anlaşma: Senden mülk çalmak istiyor!</span>
                            )}
                          </p>
                          <div className="bg-rose-950/20 border border-rose-500/20 p-2 rounded-lg text-slate-300 inline-block">
                            <span className="font-bold text-slate-100">{stolenCard ? getTranslatedCardName(stolenCard, profile) : 'Property'}</span>
                            {stolenCard && (
                              <span className="ml-1 text-[8.5px] font-bold" style={{ color: COLOR_HEX[stolenCard.color || 'brown'] }}>
                                ({getTranslatedColorLabel(stolenCard.color || 'brown', profile)} - {stolenCard.value}M)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    if (type === 'deal-breaker') {
                      const color = req.targetColor || 'brown';
                      const targetPlayerProps = match.players.find(p => p.id === req.targetPlayerId)?.properties[color];
                      const setSize = targetPlayerProps?.cards.length || 0;
                      return (
                        <div className="text-[10px] space-y-1 text-center">
                          <p className="font-bold text-white">
                            {profile.settings.language === 'en' ? (
                              <span>⚡ Deal Breaker: Wants to steal your completed set!</span>
                            ) : (
                              <span>⚡ Anlaşma Bozan: Senden tamamlanmış setini çalmak istiyor!</span>
                            )}
                          </p>
                          <div className="bg-rose-950/20 border border-rose-500/20 p-2 rounded-lg text-slate-300 inline-block">
                            <span className="font-extrabold uppercase tracking-wide" style={{ color: COLOR_HEX[color] }}>
                              {getTranslatedColorLabel(color, profile)} {profile.settings.language === 'en' ? 'Set' : 'Seti'}
                            </span>
                            <span className="text-slate-400 ml-1">({setSize} {profile.settings.language === 'en' ? 'Cards' : 'Kart'})</span>
                          </div>
                        </div>
                      );
                    }
                    if (type === 'forced-deal') {
                      return (
                        <div className="text-[10px] space-y-2 text-center">
                          <p className="font-bold text-white">
                            {profile.settings.language === 'en' ? '🔄 Offers a Forced Deal:' : '🔄 Zoraki Takas teklif ediyor:'}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-rose-950/20 border border-rose-500/25 p-2 rounded-lg text-left">
                              <span className="text-[8px] text-rose-400 block uppercase font-bold">{profile.settings.language === 'en' ? 'Wants to take:' : 'Senden alınacak:'}</span>
                              <span className="font-black text-slate-100 text-[9.5px] block truncate">{stolenCard ? getTranslatedCardName(stolenCard, profile) : 'Property'}</span>
                              {stolenCard && (
                                <span className="text-[8px] font-bold" style={{ color: COLOR_HEX[stolenCard.color || 'brown'] }}>
                                  {getTranslatedColorLabel(stolenCard.color || 'brown', profile)} ({stolenCard.value}M)
                                </span>
                              )}
                            </div>
                            <div className="bg-emerald-950/20 border border-emerald-500/25 p-2 rounded-lg text-left">
                              <span className="text-[8px] text-emerald-400 block uppercase font-bold">{profile.settings.language === 'en' ? 'Gives you:' : 'Sana verilecek:'}</span>
                              <span className="font-black text-slate-100 text-[9.5px] block truncate">{givenCard ? getTranslatedCardName(givenCard, profile) : 'Property'}</span>
                              {givenCard && (
                                <span className="text-[8px] font-bold" style={{ color: COLOR_HEX[givenCard.color || 'brown'] }}>
                                  {getTranslatedColorLabel(givenCard.color || 'brown', profile)} ({givenCard.value}M)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return profile.settings.language === 'en' ? 'Action / Move request.' : 'Aksiyon / Hamle talebi.';
                  })()}
                </div>

                {actionTimeLeft !== null && (
                  <div className="text-center bg-red-950/25 border border-red-500/25 p-2 rounded-xl text-xs text-red-400 font-extrabold flex items-center justify-center gap-1.5 animate-pulse">
                    ⏱️ {profile.settings.language === 'en' ? 'Time left for auto bot decision:' : 'Otomatik bot kararına kalan süre:'} <span className="text-sm font-black text-red-500">{actionTimeLeft}s</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {localPlayer.hand.some((c) => c.actionType === 'just-say-no') ? (
                    <button
                      onClick={() => handleRespondActionRequest('just-say-no')}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-red-900/50"
                    >
                      🛑 {profile.settings.language === 'en' ? "PLAY 'JUST SAY NO'!" : "'HAYIR TEŞEKKÜRLER' KARTINI OYNA!"}
                    </button>
                  ) : (
                    <div className="text-center text-[10px] text-red-400 bg-red-950/20 py-2 rounded-lg border border-red-900/30">
                      {profile.settings.language === 'en' ? "You do not have a 'Just Say No' card in hand." : "Elinizde 'Hayır Teşekkürler' kartı bulunmuyor."}
                    </div>
                  )}

                  <button
                    onClick={() => handleRespondActionRequest('decline')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
                  >
                    {profile.settings.language === 'en' ? 'Accept and Resolve' : 'Kabul Et ve Sonucu Uygula'}
                  </button>

                  <button
                    onClick={() => handleForceCancelActiveAction('Savunma zinciri sonlandırıldı ve hamle iptal edildi.')}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 text-red-400 font-extrabold rounded-xl text-xs transition-all border border-red-500/20 cursor-pointer"
                  >
                    ❌ {profile.settings.language === 'en' ? 'CANCEL ACTION (Unstick)' : 'HAMLEYİ İPTAL ET (Takılma Giderici)'}
                  </button>
                </div>
              </div>
            ) : (
              // STANDARD PAYMENT INTERFACE (rents, birthdays, debt collectors)
              <>
                <div className="text-center space-y-1.5 border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-bold text-red-400 block uppercase animate-pulse">⚠️ {profile.settings.language === 'en' ? 'DEBT COLLECTION' : 'BORÇ TAHSİLATI'}</span>
                  <h3 className="text-sm font-bold text-slate-200">
                    {profile.settings.language === 'en' ? (
                      <span><strong>{myActiveRequest.actionCard ? getTranslatedCardName(myActiveRequest.actionCard, profile) : 'Action'}</strong> was played against you!</span>
                    ) : (
                      <span>Sana karşı <strong>{myActiveRequest.actionCard ? (TURKISH_NAMES[myActiveRequest.actionCard.name] || myActiveRequest.actionCard.name) : 'Aksiyon'}</strong> oynandı!</span>
                    )}
                  </h3>
                  <div className="text-[10px] text-slate-400 space-y-0.5 mt-1 bg-black/25 p-2 rounded-lg border border-slate-800">
                    <p>{profile.settings.language === 'en' ? 'Total Amount Due:' : 'İstenen Toplam Miktar:'} <strong className="text-red-400 text-xs">{myActiveRequest.amountDue}M</strong></p>
                    {myActiveRequest.chosenColor && (
                      <p>
                        {profile.settings.language === 'en' ? (
                          <span>Rent Detail: For properties in the <span style={{ color: COLOR_HEX[myActiveRequest.chosenColor] }} className="font-extrabold">{getTranslatedColorLabel(myActiveRequest.chosenColor, profile)}</span> color set.</span>
                        ) : (
                          <span>Kira Detayı: <span style={{ color: COLOR_HEX[myActiveRequest.chosenColor] }} className="font-extrabold">{COLOR_LABELS[myActiveRequest.chosenColor]}</span> renk grubundaki mülkler için.</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {(() => {
                  const demandingPlayer = match.players.find((p) => p.id === myActiveRequest?.sourcePlayerId);
                  if (!demandingPlayer) return null;
                  return (
                    <div className="bg-slate-950/60 p-2.5 text-left rounded-xl border border-red-500/20 text-[9.5px] space-y-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[8px] text-slate-400 uppercase tracking-wider">
                          {profile.settings.language === 'en' ? `Creditor: ${demandingPlayer.username}'s Board` : `Alacaklı: ${demandingPlayer.username} Masası`}
                        </span>
                        <span className="text-[9px] font-black text-amber-400">🏦 {demandingPlayer.bank.reduce((sum, c) => sum + c.value, 0)}M</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(demandingPlayer.properties).map((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = demandingPlayer.properties[col];
                          if (!set || set.cards.length === 0) return null;
                          const isComp = set.cards.length >= MAX_IN_SET[col];
                          return (
                            <div
                              key={col}
                              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[7.5px] font-black border"
                              style={{
                                backgroundColor: `${COLOR_HEX[col]}15`,
                                borderColor: isComp ? `${COLOR_HEX[col]}70` : `${COLOR_HEX[col]}30`,
                                color: COLOR_HEX[col]
                              }}
                            >
                              <span>{isComp ? '👑' : `${set.cards.length}/${MAX_IN_SET[col]}`}</span>
                            </div>
                          );
                        })}
                        {Object.values(demandingPlayer.properties).reduce((acc: number, set: any) => acc + (set?.cards?.length || 0), 0) === 0 && (
                          <span className="text-slate-500 italic text-[7px]">{t('no_properties', profile)}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {actionTimeLeft !== null && (
                  <div className="text-center bg-red-950/25 border border-red-500/25 p-2 rounded-xl text-xs text-red-400 font-extrabold flex items-center justify-center gap-1.5 animate-pulse">
                    ⏱️ {profile.settings.language === 'en' ? 'Time left for auto bot decision:' : 'Otomatik bot kararına kalan süre:'} <span className="text-sm font-black text-red-500">{actionTimeLeft}s</span>
                  </div>
                )}

                {/* Selection instructions */}
                <div className="space-y-3">
                  <div className="flex gap-1.5 justify-between">
                    <button
                      onClick={() => {
                        const due = myActiveRequest?.amountDue || 0;

                        const bankCards = localPlayer.bank.map((c) => ({ id: c.id, value: c.value }));
                        const propertyCards: { id: string; value: number }[] = [];
                        Object.values(localPlayer.properties).forEach((set: any) => {
                          if (set) {
                            set.cards.forEach((c: any) => propertyCards.push({ id: c.id, value: c.value }));
                          }
                        });

                        // Helper to find the subset of cards whose sum is >= target with the minimum possible sum.
                        // If sums are equal, it prefers the one with fewer cards to preserve assets.
                        const findBestSubset = (cards: { id: string; value: number }[], target: number): string[] => {
                          if (cards.length === 0) return [];
                          const n = cards.length;

                          // For small sizes (<= 16), find exact optimal solution
                          if (n <= 16) {
                            let bestSubset: string[] = [];
                            let bestSum = Infinity;

                            const search = (index: number, currentIds: string[], currentSum: number) => {
                              if (currentSum >= target) {
                                if (currentSum < bestSum) {
                                  bestSum = currentSum;
                                  bestSubset = [...currentIds];
                                } else if (currentSum === bestSum) {
                                  if (currentIds.length < bestSubset.length) {
                                    bestSubset = [...currentIds];
                                  }
                                }
                                return;
                              }
                              if (index === n) return;

                              // Include card
                              search(index + 1, [...currentIds, cards[index].id], currentSum + cards[index].value);
                              // Exclude card
                              search(index + 1, currentIds, currentSum);
                            };

                            search(0, [], 0);
                            if (bestSubset.length > 0) return bestSubset;
                          }

                          // Fallback: Greedy algorithm (sort ascending to try hitting target closely with small cards first)
                          const sorted = [...cards].sort((a, b) => a.value - b.value);
                          const selection: string[] = [];
                          let sum = 0;
                          for (const card of sorted) {
                            if (sum < target) {
                              selection.push(card.id);
                              sum += card.value;
                            }
                          }
                          return selection;
                        };

                        const totalBank = bankCards.reduce((s, c) => s + c.value, 0);
                        let finalSelection: string[] = [];

                        if (totalBank >= due) {
                          // We can pay entirely using bank cards! Never touch properties.
                          finalSelection = findBestSubset(bankCards, due);
                        } else {
                          // Bank cards are not enough. We must select ALL bank cards, and cover the remaining with properties.
                          const remainingDue = due - totalBank;
                          const selectedProperties = findBestSubset(propertyCards, remainingDue);
                          finalSelection = [...bankCards.map(c => c.id), ...selectedProperties];
                        }

                        setPaymentSelection(finalSelection);
                        playCoinSound();
                      }}
                      className="flex-1 py-1 px-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-[9px] font-extrabold transition-all text-center"
                      title={profile.settings.language === 'en' ? 'Automatically selects cards to cover debt efficiently' : 'Borcu en uygun şekilde kapatmak için kartları otomatik seçer'}
                    >
                      ⚡ {profile.settings.language === 'en' ? 'Auto Select' : 'Otomatik Seç'}
                    </button>

                    <button
                      onClick={() => {
                        const all: string[] = [];
                        localPlayer.bank.forEach((c) => all.push(c.id));
                        Object.values(localPlayer.properties).forEach((set: any) => {
                          if (set) set.cards.forEach((c: any) => all.push(c.id));
                        });
                        setPaymentSelection(all);
                        playCoinSound();
                      }}
                      className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-bold transition-all text-center"
                    >
                      ☑ {profile.settings.language === 'en' ? 'Select All' : 'Tümünü Seç'}
                    </button>

                    <button
                      onClick={() => {
                        setPaymentSelection([]);
                      }}
                      className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-bold transition-all text-center"
                    >
                      ☒ {profile.settings.language === 'en' ? 'Clear' : 'Temizle'}
                    </button>
                  </div>

                  {/* Separated sections for Money and Properties */}
                  <div className="space-y-3">
                    {/* 1. BANK/MONEY CARDS (NAKİT) */}
                    <div>
                      <span className="text-[9px] text-amber-400 font-black tracking-wider block mb-1.5 uppercase">💰 {profile.settings.language === 'en' ? 'CASH ASSETS' : 'NAKİT VARLIKLAR'}</span>
                      {localPlayer.bank.length === 0 ? (
                        <span className="text-[8px] text-slate-500 italic block py-1.5 px-2 bg-black/10 rounded-lg">{profile.settings.language === 'en' ? 'You do not have any cash cards in your vault.' : 'Kasanızda hiç nakit kartı bulunmuyor.'}</span>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto p-1 bg-black/30 rounded-lg border border-white/5">
                          {localPlayer.bank.map((c) => {
                            const selIdx = paymentSelection.indexOf(c.id);
                            const isSelected = selIdx !== -1;
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setPaymentSelection((prev) => prev.filter((id) => id !== c.id));
                                  } else {
                                    setPaymentSelection((prev) => [...prev, c.id]);
                                  }
                                }}
                                className={`p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between ${isSelected
                                  ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                  : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                                  }`}
                              >
                                <span className="font-extrabold text-[8px] block text-slate-200 truncate">{getTranslatedCardName(c, profile)}</span>
                                <span className="text-[8px] text-amber-300 block font-black mt-0.5">{c.value}M</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. PROPERTY CARDS (MÜLK) */}
                    <div>
                      <span className="text-[9px] text-emerald-400 font-black tracking-wider block mb-1.5 uppercase">🏢 {profile.settings.language === 'en' ? 'PROPERTY ASSETS' : 'MÜLK VARLIKLAR'}</span>
                      {Object.values(localPlayer.properties).every((set: any) => !set || set.cards.length === 0) ? (
                        <span className="text-[8px] text-slate-500 italic block py-1.5 px-2 bg-black/10 rounded-lg">{profile.settings.language === 'en' ? 'You do not have any property cards on your board.' : 'Sahada hiç mülk kartınız bulunmuyor.'}</span>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1 bg-black/30 rounded-lg border border-white/5">
                          {Object.keys(localPlayer.properties).flatMap((colorKey) => {
                            const col = colorKey as CardColor;
                            const set = localPlayer.properties[col];
                            if (!set) return [];

                            return set.cards.map((c) => {
                              const selIdx = paymentSelection.indexOf(c.id);
                              const isSelected = selIdx !== -1;
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setPaymentSelection((prev) => prev.filter((id) => id !== c.id));
                                    } else {
                                      setPaymentSelection((prev) => [...prev, c.id]);
                                    }
                                  }}
                                  className={`p-1.5 rounded-lg border text-left transition-all ${isSelected
                                    ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                                    : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                                    }`}
                                >
                                  <span className="font-extrabold text-[8px] block text-slate-200 flex items-center gap-1 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                                    {getTranslatedCardName(c, profile)}
                                  </span>
                                  <span className="text-[8px] text-slate-400 block font-black mt-0.5">{c.value}M</span>
                                </button>
                              );
                            });
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Calculated current selected amount */}
                  {(() => {
                    let total = 0;
                    paymentSelection.forEach((id) => {
                      const bc = localPlayer.bank.find((card) => card.id === id);
                      if (bc) total += bc.value;
                      else {
                        for (const col in localPlayer.properties) {
                          const pc = localPlayer.properties[col as CardColor]?.cards.find((card) => card.id === id);
                          if (pc) total += pc.value;
                        }
                      }
                    });

                    return (
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 bg-white/5 p-2 rounded-lg">
                        <span>{profile.settings.language === 'en' ? 'Selected Total:' : 'Seçilen Toplam:'}</span>
                        <span className={total >= (myActiveRequest?.amountDue || 0) ? 'text-emerald-400 font-black' : 'text-amber-400'}>
                          {total}M / {myActiveRequest?.amountDue}M
                        </span>
                      </div>
                    );
                  })()}

                </div>

                <div className="flex flex-col gap-2">
                  {/* If they have Just Say No in hand, offer playing it */}
                  {localPlayer.hand.some((c) => c.actionType === 'just-say-no') && (
                    <button
                      onClick={() => handleRespondActionRequest('just-say-no')}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs transition-all"
                    >
                      🛑 {profile.settings.language === 'en' ? 'DEFENSE CARD AVAILABLE! (Play)' : 'ELİNİZDE SAVUNMA KARTI VAR! (Kullan)'}
                    </button>
                  )}

                  <button
                    onClick={() => handleRespondActionRequest('pay')}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition-all"
                  >
                    {profile.settings.language === 'en' ? 'ACCEPT & PAY / HAND OVER CARDS' : 'KABUL ET VE ÖDE / KARTI DEVRET'}
                  </button>

                  <button
                    onClick={() => handleForceCancelActiveAction('Ödeme/Tahsilat talebi iptal edildi.')}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 text-red-400 font-extrabold rounded-xl text-xs transition-all border border-red-500/20 cursor-pointer"
                  >
                    ❌ {profile.settings.language === 'en' ? 'CANCEL PAYMENT (Unstick)' : 'ÖDEMEYİ İPTAL ET (Takılma Giderici)'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 4. Set Management Modal (matches Image 11) */}
      {managedSetColor && (
        <div 
          onClick={() => setManagedSetColor(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative overflow-hidden"
          >
            {/* Top color glow band */}
            <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: COLOR_HEX[managedSetColor] }} />
            
            <div className="flex justify-between items-center border-b border-white/5 pb-2 pt-1">
              <h3 className="font-black text-xs text-white uppercase flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: COLOR_HEX[managedSetColor] }} />
                {profile.settings.language === 'en' ? 'Set Management' : 'Set Yönetimi'} - <span style={{ color: COLOR_HEX[managedSetColor] }} className="font-black">{getTranslatedColorLabel(managedSetColor, profile)}</span>
              </h3>
              <button
                onClick={() => setManagedSetColor(null)}
                className="text-slate-400 hover:text-white font-black text-xs p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-[9.5px] text-slate-400 leading-normal">
              {profile.settings.language === 'en' 
                ? 'Rearrange your wildcards or change colors using the action buttons.' 
                : 'Joker kartlarınızın rengini değiştirebilir ve setinizi düzenleyebilirsiniz.'}
            </p>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {localPlayer.properties[managedSetColor]?.cards.map((c) => {
                const isMultiColorWildcard = c.isWildcard && (!c.secondaryColor || c.secondaryColor === 'any');
                return (
                  <div key={c.id} className="p-3 rounded-2xl bg-slate-950 border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color indicator strip */}
                      <div 
                        className="w-3 h-10 rounded-lg shrink-0 shadow-md border border-white/10"
                        style={{
                          background: c.isWildcard
                            ? (isMultiColorWildcard
                                ? 'linear-gradient(180deg, #ef4444 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #a855f7 100%)' // Rainbow
                                : `linear-gradient(180deg, ${COLOR_HEX[c.color || 'brown']} 50%, ${COLOR_HEX[c.secondaryColor || 'brown']} 50%)` // Dual
                              )
                            : COLOR_HEX[c.color || 'brown'] // Single
                        }}
                      />
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="font-black text-xs text-slate-100 truncate block">{getTranslatedCardName(c, profile)}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {c.isWildcard && (
                            <span className="text-[8.5px] font-black tracking-wide uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {profile.settings.language === 'en' ? 'Joker' : 'Joker'}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400 font-bold">
                            {profile.settings.language === 'en' ? 'Value: ' : 'Değer: '}{c.value}M
                          </span>
                        </div>
                      </div>
                    </div>

                    {c.isWildcard && (
                      <button
                        onClick={() => {
                          playPlaySound();
                          setWildcardColorPick(c);
                          setManagedSetColor(null);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black rounded-xl uppercase transition-all transform active:scale-95 cursor-pointer shadow-md shrink-0 flex items-center gap-1"
                      >
                        🔄 {profile.settings.language === 'en' ? 'Switch' : 'Değiştir'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setManagedSetColor(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-extrabold rounded-xl text-xs transition-all shadow-md cursor-pointer border border-white/5"
            >
              {profile.settings.language === 'en' ? 'Close' : 'Kapat'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Quick Rules Hint Modal */}
      {showHint && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-black text-xs text-white uppercase flex items-center gap-1.5">
                💡 NASIL OYNANIR? (İPUÇLARI)
              </h3>
              <button
                onClick={() => setShowHint(false)}
                className="text-slate-400 hover:text-white font-black text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-[10px] leading-relaxed text-slate-300">
              <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                <strong className="text-amber-400 block mb-0.5">🏆 KAZANMA ŞARTI</strong>
                Farklı renk gruplarında 3 TAM MÜLK SETİ tamamlayan ilk oyuncu maçı anında kazanır.
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                <strong className="text-amber-400 block mb-0.5">🃏 HAMLE HAKKI (3 AKSİYON)</strong>
                Her turda desteden otomatik olarak 2 kart çekilir. En fazla 3 kart oynama/aksiyon hakkınız vardır.
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                <strong className="text-amber-400 block mb-0.5">🏦 BANKA & PARA</strong>
                Aksiyon kartlarını ve para kartlarını bankaya yerleştirebilirsiniz. Unutmayın, bankadan elinize geri alamazsınız!
              </div>
              <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                <strong className="text-amber-400 block mb-0.5">🛡️ SAVUNMA KARTI</strong>
                Elindeki "Hayır Teşekkürler" (Just Say No) kartları ile rakiplerin sinsi taleplerini anında engelle!
              </div>
            </div>

            <button
              onClick={() => setShowHint(false)}
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-black rounded-xl text-xs transition-all shadow-md"
            >
              Anladım, Maça Dön!
            </button>
          </div>
        </div>
      )}

      {/* BANK VAULT MODAL (Banka Kasası - Örnek resim.png gibi) */}
      {showBankVaultModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0b0e14] border-2 border-yellow-500/30 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => {
                playPlaySound();
                setShowBankVaultModal(false);
              }}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg p-1.5 font-bold text-xs"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="text-xl">🏦</span>
              <div>
                <h3 className="font-black text-sm text-yellow-500 uppercase tracking-wider">
                  {t('bank_vault', profile)} ({localPlayer.bank.reduce((sum, c) => sum + c.value, 0)}M)
                </h3>
                <p className="text-[8px] text-slate-400 mt-0.5 leading-normal">
                  {t('bank_vault_desc', profile)}
                </p>
              </div>
            </div>

            {/* List of cards */}
            <div className="py-2">
              {localPlayer.bank.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-[10px] italic bg-black/20 rounded-xl border border-dashed border-white/5">
                  {t('bank_vault_empty', profile)}
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 justify-start scrollbar-thin">
                  {localPlayer.bank.map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      onClick={() => {
                        playPlaySound();
                        setFocusedCard(card);
                        setFocusedCardZoom(window.innerWidth < 640 ? 1.4 : 1.8);
                      }}
                      onMouseEnter={() => setHoveredCard(card)}
                      onMouseLeave={() => setHoveredCard(null)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform animate-play-card"
                      title={t('view_details', profile)}
                    >
                      <GameCard card={card} size="medium" activeEffect={cardEffects[card.id] || null} disable3D={disable3D} cardBack={profile.settings.cardBack} cardSkin={profile.settings.cardSkin || 'skin_none'} />
                      <span className="text-[8px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/20 px-2 py-0.5 rounded-full leading-none flex items-center gap-0.5">
                        {card.value}M <span className="text-[6.5px] opacity-75">🔍</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Total Value display matching Image 1 */}
            <div className="bg-slate-950/60 border border-white/5 rounded-xl p-3 flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider">{t('total_bank_value', profile)}</span>
              <span className="text-yellow-500 font-black text-xs">
                {localPlayer.bank.reduce((sum, c) => sum + c.value, 0)}M
              </span>
            </div>
          </div>
        </div>
      )}

      {/* OPPONENT ASSETS MODAL (Rakiplere Tıkladığımda Tüm Varlıkları çıksın - Örnek 2 ci resimdeki gibi) */}
      {showOpponentAssetsModal && assetsOpponentId && (
        (() => {
          const opponent = match.players.find((p) => p.id === assetsOpponentId);
          if (!opponent) return null;
          const bankTotal = opponent.bank.reduce((sum, c) => sum + c.value, 0);
          const bankBreakdown = getBankBreakdown(opponent.bank);

          return (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-[#0b0e14] border-2 border-purple-500/30 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto scrollbar-thin">
                <button
                  onClick={() => {
                    playPlaySound();
                    setShowOpponentAssetsModal(false);
                    setAssetsOpponentId(null);
                  }}
                  className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg p-1.5 font-bold text-xs"
                >
                  ✕
                </button>

                {/* Header */}
                <div className="border-b border-white/5 pb-2">
                  <h3 className="font-black text-sm text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
                    🤖 {opponent.username.split(' ')[0]} - {profile.settings.language === 'en' ? 'All Assets' : 'Tüm Varlıkları'}
                  </h3>
                </div>



                {/* Bank vault status */}
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 space-y-2">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block">
                    💼 {profile.settings.language === 'en' ? 'BANK VAULT' : 'BANKA KASASI'} ({bankTotal}M)
                  </span>
                  {bankBreakdown.length === 0 ? (
                    <span className="text-[8px] text-slate-500 italic block">{t('bank_vault_empty', profile)}</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {bankBreakdown.map((item) => (
                        <span
                          key={item.value}
                          className="text-[9px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2.5 py-1 rounded-lg leading-none"
                        >
                          {item.value}M <span className="text-slate-500 font-extrabold text-[7.5px]">x{item.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Properties list styled exactly like Image 2 */}
                <div className="space-y-2">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block">
                    🏡 {profile.settings.language === 'en' ? 'PROPERTIES & SETS' : 'ARSALAR VE SETLER'}
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(opponent.properties).map((colorKey) => {
                      const col = colorKey as CardColor;
                      const set = opponent.properties[col];
                      if (!set || set.cards.length === 0) return null;
                      const isCompleted = set.cards.length >= MAX_IN_SET[col];
                      const rentVal = calculateSetRent(set.cards, col, set.hasHouse, set.hasHotel);

                      return (
                        <div
                          key={col}
                          className="bg-slate-950/40 border border-white/5 rounded-xl p-2.5 space-y-1.5 flex flex-col justify-between"
                        >
                          {/* Color bar & ratio */}
                          <div className="flex justify-between items-center text-[8.5px] font-black text-white">
                            <span className="truncate flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                              {getTranslatedColorLabel(col, profile)}
                            </span>
                            {isCompleted ? (
                              <span className="bg-yellow-500 text-slate-950 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                ★ SET
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                {set.cards.length}/{MAX_IN_SET[col]}
                              </span>
                            )}
                          </div>

                          {/* List of property names inside set */}
                          <div className="space-y-1 border-t border-white/[0.03] pt-1">
                            {set.cards.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  playPlaySound();
                                  setFocusedCard(c);
                                  setFocusedCardZoom(window.innerWidth < 640 ? 1.4 : 1.8);
                                }}
                                className="text-[8px] font-extrabold text-slate-300 hover:text-amber-400 block w-full text-left truncate leading-tight uppercase cursor-pointer transition-colors flex items-center justify-between"
                              >
                                <span>{getTranslatedCardName(c, profile)}</span>
                                <span className="text-[7px] text-amber-500/80">🔍 {t('inspect', profile)}</span>
                              </button>
                            ))}
                          </div>

                          {/* Rent */}
                          <div className="text-[8px] font-black text-emerald-400 bg-emerald-950/30 border border-emerald-500/10 px-1.5 py-0.5 rounded text-center leading-none">
                            {profile.settings.language === 'en' ? 'Rent: ' : 'Kira: '}{rentVal}M
                          </div>
                        </div>
                      );
                    })}

                    {Object.keys(opponent.properties).filter(
                      (col) => opponent.properties[col as CardColor]!.cards.length > 0
                    ).length === 0 && (
                        <span className="col-span-2 text-center py-6 text-[9px] text-slate-500 italic bg-black/15 rounded-xl border border-dashed border-white/5">
                          Sahada mülkü bulunmuyor.
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* 6. Live Chat & Logs Slide-Over Overlay Drawer for Mobile (matches Image 4) */}
      {showChatOverlay && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-l border-white/10 h-full p-4 flex flex-col justify-between shadow-2xl relative animate-slide-left">

            <div className="border-b border-white/5 pb-2 mb-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">💬</span>
                <h3 className="font-bold text-xs text-white">Canlı Akış & Sohbet</h3>
              </div>
              <button
                onClick={() => setShowChatOverlay(false)}
                className="text-slate-400 hover:text-white font-black text-sm p-1"
              >
                ✕ {t('close_btn', profile)}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
              {match.logs.map((log) => (
                <div key={log.id} className="bg-black/20 p-2 rounded-lg border border-white/5 leading-normal">
                  {log.playerName ? (
                    <p>
                      <strong className="text-amber-400 font-bold">{log.playerName}:</strong>{' '}
                      <span className="text-slate-200">{translateLogMessage(log.message, profile)}</span>
                    </p>
                  ) : (
                    <p className="text-slate-400 font-medium">{translateLogMessage(log.message, profile)}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Emojis Grid */}
            <div className="grid grid-cols-6 gap-2 py-2 mt-2 border-t border-white/5 flex-shrink-0">
              {['😂', '😭', '😠', '👍', '🎉', '😮', '💩', '❤️', '🔥', '💸', '🎲', '👑'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    playPlaySound();
                    if (!isOffline && socketRef.current?.readyState === WebSocket.OPEN) {
                      socketRef.current.send(JSON.stringify({ type: 'trigger_emoji', userId: profile.id, roomId, emoji }));
                    } else {
                      triggerFloatingEmoji(emoji, profile.username);
                    }
                  }}
                  className="h-10 text-xl bg-white/5 active:bg-white/10 border border-white/5 rounded-xl flex items-center justify-center transition-all transform active:scale-90 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="mt-1 flex gap-1.5 flex-shrink-0">
              <input
                type="text"
                placeholder={t('chat_placeholder', profile)}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all transform active:scale-95"
              >
                {t('send_btn', profile)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. Card Draw Animation Overlay */}
      <AnimatePresence>
        {animatingDrawCards.map((draw) => (
          <motion.div
            key={draw.id}
            initial={{ x: '0vw', y: '0vh', scale: 0.3, rotate: 0, opacity: 0 }}
            animate={{
              x: '0vw', // glides from center deck area
              y: '40vh', // down to the player's hand area
              scale: 1,
              rotate: 360,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 0.8,
              delay: draw.delay,
              ease: 'easeInOut',
            }}
            onAnimationComplete={() => {
              // remove card after completion
              setAnimatingDrawCards((prev) => prev.filter((d) => d.id !== draw.id));
            }}
            className="fixed inset-0 m-auto w-20 h-32 rounded-xl shadow-2xl border-2 border-amber-400 pointer-events-none z-50 flex items-center justify-center font-bold text-lg select-none"
            style={{
              background: cardBackBg,
              color: '#fff',
            }}
          >
            <div className="text-center">
              <span className="block text-2xl mb-1">{cardBackPattern}</span>
              <span className="text-[10px] tracking-wider uppercase font-black">Kart</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 8. Action Toast Notification Overlay */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm bg-slate-950/80 border backdrop-blur-lg rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 pointer-events-auto flex flex-col gap-3 transition-colors duration-300 ${actionToast.type === 'rent'
              ? 'border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
              : actionToast.type === 'info'
                ? 'border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                : 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
              }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 select-none ${actionToast.type === 'rent'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : actionToast.type === 'info'
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                  {actionToast.type === 'rent' ? '💰' : actionToast.type === 'info' ? 'ℹ️' : '⚡'}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">{actionToast.title}</h4>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{actionToast.message}</p>
                </div>
              </div>
              <button
                onClick={() => setActionToast(null)}
                className="text-slate-400 hover:text-white font-black text-xs p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {actionToast.victimName && (
              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between text-[10px] select-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">👤</span>
                  <span className="font-extrabold text-slate-300">
                    {actionToast.victimName} {profile.settings.language === 'en' ? 'Remaining Status:' : 'Kalan Durum:'}
                  </span>
                </div>
                <div className="flex gap-3 text-[9px] font-mono font-bold">
                  <span className="text-amber-400">
                    💵 {profile.settings.language === 'en' ? 'Cash:' : 'Para:'} {actionToast.remainingCash}M
                  </span>
                  <span className="text-emerald-400">
                    🏢 {profile.settings.language === 'en' ? 'Props:' : 'Mülk:'} {actionToast.remainingPropsCount}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 9. Career Statistics Overlay Modal */}
      {showCareerPanel && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/30 rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => {
                playPlaySound();
                setShowCareerPanel(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-black text-sm p-1"
            >
              ✕ Kapat
            </button>

            <div className="text-center space-y-1">
              <span className="text-2xl block animate-bounce">🏆</span>
              <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider">Kariyer İstatistikleri</h3>
              <p className="text-[10px] text-slate-400">Mono Deal Genel İlerleme Geçmişiniz</p>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Kazanılan Maçlar</span>
                  <span className="text-xl font-black text-emerald-400">{careerStats.wins} Maç</span>
                </div>
                <span className="text-2xl">🥇</span>
              </div>

              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">İflas Ettirilen Rakipler</span>
                  <span className="text-xl font-black text-rose-400">{careerStats.bankruptcies} Oyuncu</span>
                </div>
                <span className="text-2xl">💀</span>
              </div>

              <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Toplanan Toplam Kira</span>
                  <span className="text-xl font-black text-amber-400">{careerStats.rentCollected}M</span>
                </div>
                <span className="text-2xl">💵</span>
              </div>
            </div>

            <button
              onClick={() => {
                playPlaySound();
                setShowCareerPanel(false);
              }}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:opacity-90 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg"
            >
              Masa Başına Dön!
            </button>
          </div>
        </div>
      )}

      {/* 10. PROPERTY WILDCARD COLOR SWITCH MODAL (Mülk Rengini Değiştir) */}
      {propertyWildcardColorPick && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#0b0e14] border-2 border-yellow-500/30 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => {
                playPlaySound();
                setPropertyWildcardColorPick(null);
              }}
              className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg w-7 h-7 flex items-center justify-center font-bold text-xs shadow transition-all border border-white/5"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <span className="text-xl">🔄</span>
              <div>
                <h3 className="font-black text-sm text-yellow-500 uppercase tracking-wider">
                  Mülk Rengini Değiştir
                </h3>
              </div>
            </div>

            {/* Card preview in the middle */}
            <div className="flex justify-center py-1">
              <div className="shadow-[0_0_20px_rgba(234,179,8,0.25)] rounded-2xl overflow-hidden">
                <GameCard card={propertyWildcardColorPick} size="normal" activeEffect={cardEffects[propertyWildcardColorPick.id] || null} disable3D={disable3D} cardBack={profile.settings.cardBack} cardSkin={profile.settings.cardSkin || 'skin_none'} />
              </div>
            </div>

            <div className="text-[10px] text-slate-300 leading-normal text-center">
              Bu kart şu anda <span className="underline font-black text-blue-400">{COLOR_LABELS[propertyWildcardColorPick.color || 'brown']}</span> grubunda. Çevirmek istediğiniz yeni rengi seçin:
            </div>

            {/* List of allowed colors */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {(() => {
                const possibleColors: CardColor[] = [];
                if (propertyWildcardColorPick.allowedColors && propertyWildcardColorPick.allowedColors.length > 0) {
                  possibleColors.push(...propertyWildcardColorPick.allowedColors);
                } else {
                  if (propertyWildcardColorPick.color) {
                    possibleColors.push(propertyWildcardColorPick.color);
                  }
                  if (propertyWildcardColorPick.secondaryColor && propertyWildcardColorPick.secondaryColor !== propertyWildcardColorPick.color) {
                    possibleColors.push(propertyWildcardColorPick.secondaryColor);
                  }
                }

                return possibleColors.map((col) => {
                  const isCurrent = propertyWildcardColorPick.color === col;
                  const rents = RENT_VALUES[col] || [];

                  return (
                    <div
                      key={col}
                      onClick={() => {
                        if (isCurrent) return;
                        playPlaySound();
                        if (isOffline) {
                          handleOfflineChangeWildcardColor(propertyWildcardColorPick.id, col);
                        } else {
                          handleChangeWildcardColorMultiplayer(propertyWildcardColorPick.id, col);
                        }
                        setPropertyWildcardColorPick(null);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-1.5 ${isCurrent
                        ? 'border-yellow-500 bg-yellow-500/[0.04] shadow-[0_0_12px_rgba(234,179,8,0.15)] animate-pulse'
                        : 'border-white/5 bg-slate-950/40 hover:border-white/20 hover:bg-slate-900/60'
                        }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isCurrent ? 'border-yellow-500' : 'border-slate-600'
                            }`}>
                            {isCurrent && (
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                            )}
                          </div>
                          <span className="font-bold text-[10px] text-white flex items-center gap-1.5 flex-wrap">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                            {COLOR_LABELS[col]}
                            {(() => {
                              const count = localPlayer.properties[col]?.cards.length || 0;
                              const max = MAX_IN_SET[col] || 0;
                              return (
                                <span className={`text-[7.5px] px-1 py-0.2 rounded font-black ${count === max && max > 0
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : count > 0
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-slate-850 text-slate-500'
                                  }`}>
                                  {count > 0 ? `${count}/${max} Kartınız Var` : 'Sizde Yok'}
                                </span>
                              );
                            })()}
                          </span>
                        </div>

                        {isCurrent && (
                          <span className="bg-yellow-500 text-slate-950 text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                            AKTİF GRUP
                          </span>
                        )}
                      </div>

                      {/* Rent details */}
                      <div className="bg-black/30 px-2 py-1 rounded-lg flex flex-wrap gap-x-2 gap-y-0.5 text-[7.5px] font-bold text-slate-400">
                        {rents.map((rentVal, idx) => (
                          <span key={idx}>
                            {idx + 1} Kart: <strong className="text-white">{rentVal}M</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Touch Drag Card Floating Preview */}
      {isTouchDragging && touchPosition && touchDragCard && (
        <div
          id={`touch-drag-preview-${touchDragCard.id}`}
          className="fixed pointer-events-none z-[9999] opacity-90 scale-105 shadow-2xl"
          style={{
            left: touchPosition.x - 57,
            top: touchPosition.y - 85,
          }}
        >
          <GameCard card={touchDragCard} size="normal" />
        </div>
      )}

      {/* Just Say No / Shield Defense Energy Dome Animation Overlay (Improvement #9) */}
      {showShieldDefenseFor && (
        <div className="fixed inset-0 bg-indigo-950/40 backdrop-blur-[2px] z-[9999] flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <div className="relative flex flex-col items-center justify-center">
            {/* Glowing outer rotating energy rings */}
            <div className="absolute w-44 h-44 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 border-b-cyan-400 animate-spin" />
            <div className="absolute w-36 h-36 rounded-full border-2 border-dashed border-purple-500/30 border-l-pink-400 border-r-indigo-400 animate-spin-reverse" />

            {/* Safe Shield Core Icon */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-b from-indigo-600 to-indigo-900 border-2 border-indigo-400/80 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.8)] animate-pulse z-10">
              <span className="text-4xl">🛡️</span>
            </div>

            {/* Glowing shield wall aura */}
            <div className="absolute w-52 h-52 rounded-full bg-radial from-indigo-500/10 via-indigo-500/5 to-transparent animate-ping" />

            <div className="mt-8 text-center z-10 bg-slate-950/90 border border-indigo-500/30 px-5 py-2.5 rounded-2xl shadow-xl backdrop-blur-md">
              <span className="text-[10px] font-black tracking-widest text-indigo-400 block uppercase">HAYIR TEŞEKKÜRLER!</span>
              <h4 className="text-sm font-bold text-white mt-1">
                <span className="text-indigo-300">{showShieldDefenseFor}</span> Saldırıyı Engelledi!
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* Deal Breaker Lightning Bolt Special Animation Overlay (Improvement #19) */}
      {showDealBreakerAnimation && (
        <div className="fixed inset-0 bg-yellow-500/10 backdrop-blur-[1px] z-[9999] flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <div className="relative flex flex-col items-center justify-center w-full h-full overflow-hidden">
            {/* Split Screen Flash effect */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-yellow-500/[0.05] animate-pulse" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-indigo-500/[0.05] animate-pulse" />

            {/* Lightning bolt vectors */}
            <div className="absolute top-0 bottom-0 w-2 bg-gradient-to-b from-yellow-400 via-amber-300 to-indigo-500 blur-sm shadow-[0_0_50px_#f59e0b] animate-bounce-subtle" />
            <div className="absolute top-0 bottom-0 w-1 bg-white animate-pulse" />

            {/* Crackling sparks around center */}
            <div className="absolute w-64 h-64 rounded-full border border-yellow-500/30 scale-110 animate-ping" />
            <div className="absolute w-48 h-48 rounded-full border-2 border-indigo-400/20 scale-75 animate-ping" style={{ animationDelay: '0.4s' }} />

            {/* Dramatic banner */}
            <div className="z-10 bg-slate-950/95 border-2 border-yellow-500/50 p-6 rounded-3xl shadow-[0_15px_45px_rgba(245,158,11,0.4)] text-center max-w-sm backdrop-blur-md animate-scale-up">
              <span className="text-[10px] font-black tracking-widest text-yellow-400 block uppercase animate-pulse">⚡ {profile.settings.language === 'en' ? 'DEAL BREAKER' : 'ANLAŞMA BOZAN'} ⚡</span>
              <h4 className="text-lg font-black text-white mt-3 leading-tight">
                {showDealBreakerAnimation.source}
              </h4>
              <p className="text-xs text-slate-400 mt-1">{profile.settings.language === 'en' ? 'unleashed a deal breaker!' : 'adlı oyuncu dehşet saçtı!'}</p>

              <div className="my-4 p-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: COLOR_HEX[showDealBreakerAnimation.color] }} />
                <span className="text-xs font-black text-white uppercase" style={{ color: COLOR_HEX[showDealBreakerAnimation.color] }}>
                  {getTranslatedColorLabel(showDealBreakerAnimation.color, profile).toUpperCase()} {profile.settings.language === 'en' ? 'SET STOLEN!' : 'SETİ ÇALINDI!'}
                </span>
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                {profile.settings.language === 'en' ? (
                  <span>Completed property set was forcefully taken from player <strong>{showDealBreakerAnimation.target}</strong>!</span>
                ) : (
                  <span>{showDealBreakerAnimation.target} adlı oyuncunun tamamlanmış mülk seti elinden zorla söküldü!</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Floating Rent Analysis Panel (Kira Analiz Penceresi - Follows Mouse) */}
      <AnimatePresence>
        {analyzedProperty && !expandedPropertyColor && (() => {
          const { color, ownerName, cardsCount, hasHouse, hasHotel, currentRent } = analyzedProperty;
          const rents = RENT_VALUES[color] || [];
          const maxInSet = MAX_IN_SET[color] || 0;
          const hexColor = COLOR_HEX[color] || '#34d399';

          // Calculate max potential rent for this set
          const maxStandardRent = rents[rents.length - 1] || 0;
          const potentialMaxRent = maxStandardRent + (hasHotel ? 4 : (hasHouse ? 3 : 0));

          // Calculate responsive bounding box position
          let leftPos = mousePos.x + 15;
          let topPos = mousePos.y + 15;
          const panelWidth = 256;
          const panelHeight = 220;

          if (leftPos + panelWidth > window.innerWidth) {
            leftPos = mousePos.x - panelWidth - 15;
          }
          if (topPos + panelHeight > window.innerHeight) {
            topPos = mousePos.y - panelHeight - 15;
          }

          leftPos = Math.max(10, Math.min(window.innerWidth - panelWidth - 10, leftPos));
          topPos = Math.max(10, Math.min(window.innerHeight - panelHeight - 10, topPos));

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[9999] w-64 bg-slate-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white select-none pointer-events-none"
              style={{
                left: `${leftPos}px`,
                top: `${topPos}px`,
              }}
            >
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 mb-2.5">
                <span className="text-[10px]">📊</span>
                <h4 className="font-extrabold text-[10px] tracking-wider uppercase text-slate-300">{profile.settings.language === 'en' ? 'Rent Analysis Panel' : 'Kira Analiz Paneli'}</h4>
              </div>

              <div className="space-y-3">
                {/* Title and Color Tag */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-xs text-white block leading-tight">{getTranslatedColorLabel(color, profile)} {profile.settings.language === 'en' ? 'Set' : 'Seti'}</span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">{profile.settings.language === 'en' ? `On player ${ownerName}'s board` : `${ownerName} adlı oyuncunun masasında`}</span>
                  </div>
                  <span className="w-5 h-5 rounded-full border border-white/20 shadow" style={{ backgroundColor: hexColor }} />
                </div>

                {/* Progress Mini Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-bold text-slate-400">
                    <span>{profile.settings.language === 'en' ? 'Card Progress:' : 'Kart İlerlemesi:'}</span>
                    <span className="text-white">{cardsCount}/{maxInSet}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (cardsCount / maxInSet) * 100)}%`,
                        backgroundColor: hexColor,
                      }}
                    />
                  </div>
                </div>

                {/* Rent values steps */}
                <div className="space-y-1 bg-black/30 p-2 rounded-lg">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wide block">{profile.settings.language === 'en' ? 'Rent Scales' : 'Kira Baremleri'}</span>
                  <div className="space-y-1">
                    {rents.map((r, idx) => {
                      const isActive = cardsCount === (idx + 1);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between text-[8.5px] px-1.5 py-0.5 rounded transition-all ${isActive
                            ? 'bg-emerald-500/15 text-emerald-300 font-extrabold border border-emerald-500/20'
                            : 'text-slate-400 font-medium'
                            }`}
                        >
                          <span className="flex items-center gap-1">
                            {isActive && <span className="text-[8px]">👉</span>}
                            {idx + 1} {t('cards_count', profile)}
                          </span>
                          <span>{r}M</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Houses and Hotels */}
                <div className="flex justify-between items-center text-[8.5px] px-1">
                  <span className="text-slate-400 font-bold">{profile.settings.language === 'en' ? 'House / Hotel Bonus:' : 'Ev / Otel İlavesi:'}</span>
                  <div className="flex gap-1.5 font-extrabold">
                    <span className={hasHouse ? 'text-amber-400' : 'text-slate-600'}>🏡 {profile.settings.language === 'en' ? 'House' : 'Ev'} {hasHouse ? '(+3M)' : ''}</span>
                    <span className={hasHotel ? 'text-amber-400' : 'text-slate-600'}>🏨 {profile.settings.language === 'en' ? 'Hotel' : 'Otel'} {hasHotel ? '(+4M)' : ''}</span>
                  </div>
                </div>

                {/* Rent Summary Box */}
                <div className="bg-slate-900 border border-white/5 p-2 rounded-xl flex items-center justify-between shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                  <div>
                    <span className="text-[7px] text-slate-500 block font-extrabold uppercase leading-none">{profile.settings.language === 'en' ? 'Current Rent' : 'Mevcut Kira'}</span>
                    <span className="text-emerald-400 font-black text-sm font-mono block mt-0.5">{currentRent}M</span>
                  </div>
                  <div className="h-6 w-[1px] bg-white/10" />
                  <div className="text-right">
                    <span className="text-[7px] text-slate-500 block font-extrabold uppercase leading-none">{profile.settings.language === 'en' ? 'Potential Max' : 'Potansiyel Maks'}</span>
                    <span className="text-amber-400 font-black text-sm font-mono block mt-0.5">{rents[rents.length - 1] + (hasHotel ? 4 : (hasHouse ? 3 : 0))}M</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      {/* Turn Alert (Sıra Sende) Splash Overlay */}
      <AnimatePresence>
        {showYourTurnSplash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 15 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-[10000] p-4"
          >
            <div className="bg-gradient-to-r from-amber-500/95 via-yellow-500/95 to-amber-600/95 border-2 border-yellow-300 backdrop-blur-md px-6 py-4 md:px-10 md:py-6 rounded-2xl md:rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.6)] text-slate-950 flex flex-col items-center space-y-1.5 md:space-y-2 select-none max-w-[85vw] text-center">
              <span className="text-3xl md:text-5xl animate-bounce">🎲</span>
              <h2 className="text-xl md:text-3xl font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{t('your_turn_title', profile)}</h2>
              <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-900/80">{t('your_turn_desc', profile)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Log Toast Banner (Hamle Bildirim Banner) */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 16, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: -30, scale: 0.9, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 max-w-sm w-[92%] z-[9999] px-4"
          >
            <div className="bg-slate-950/95 border border-amber-500/35 backdrop-blur-md p-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-slate-200 flex items-start gap-3 relative overflow-hidden">
              {/* Premium Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent pointer-events-none" />

              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs shrink-0 select-none">
                📢
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="font-extrabold text-[9px] uppercase tracking-wider text-amber-400">
                  {profile.settings.language === 'en' ? 'GAME LOG' : 'OYUN GEÇMİŞİ'}
                </h4>
                <p className="text-[10px] font-black text-slate-100 leading-normal">
                  {activeToast}
                </p>
              </div>
              <button
                onClick={() => setActiveToast(null)}
                className="text-slate-400 hover:text-white text-[10px] font-bold p-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
