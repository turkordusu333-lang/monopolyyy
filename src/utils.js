import { CARD_TOTAL_COUNTS, SET_SIZES } from './constants';

export function getCardTotalCount(key) {
  if (CARD_TOTAL_COUNTS[key]) return CARD_TOTAL_COUNTS[key];
  if (key.startsWith('dual_pink_orange')) return 2;
  if (key.startsWith('dual_red_yellow')) return 2;
  if (key.startsWith('wild_full')) return 2;
  return 1;
}

export function getRarity(key) {
  const total = getCardTotalCount(key);
  if (total === 1) return { stars: 5, label: 'EFSANEVİ', color: '#FF4757' };
  if (total <= 3) return { stars: 4, label: 'DESTANSI', color: '#A29BFE' };
  if (total <= 6) return { stars: 3, label: 'NADİR', color: '#54A0FF' };
  return { stars: 2, label: 'YAYGIN', color: '#777' };
}

export function getCardImageSrc(themeId, cardKey) {
  if (!themeId || themeId === 'default' || !cardKey) return null;
  return `/decks/${themeId}/${cardKey}.png`;
}

export function getCardTip(card) {
  if (card.type === 'property') return "Bu rengi topla. 3 tam set tamamlayan kazanır!";
  if (card.type === 'money') return "Bankana koyarak borçlarını ödemek için kullan.";
  if (card.type === 'action') {
    if (card.action === 'justsayno') return "Sana karşı kullanılan hamleleri durdurmak için kullan.";
    if (card.action === 'dealbreaker') return "Rakibinin tam setini (Ev/Otel dahil) çalmak için kullan!";
    if (card.action === 'rent') return "Paraya ihtiyacın olduğunda veya rakiplerinin bankasını boşaltmak için oyna.";
    return "Stratejik bir hamle olarak kullan veya para olarak bankaya yatır.";
  }
  return null;
}

export function isSetComplete(cards, color) {
  const size = SET_SIZES[color] || 1;
  if (!cards || cards.length < size) return false;
  return cards.some(c => !c.isWild);
}