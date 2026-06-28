export const THEMES = [
  { id: 'default', name: '🎲 Klasik' },
  { id: 'naruto', name: '🍥 Naruto' },
  { id: 'onepiece', name: '🏴‍☠️ One Piece' },
  { id: 'lotm', name: '🌙 Lord of the Mystery' },
  { id: 'cyberpunk', name: '⚡ Cyberpunk' },
  { id: 'retro', name: '👾 Retro 8-Bit' },
  { id: 'wood', name: '🪵 Ahşap Masa' },
];

export const CARD_TOTAL_COUNTS = {
  'action_passgo': 10, 'action_dealbreaker': 2, 'action_justsayno': 3,
  'action_slydeal': 3, 'action_forceddeal': 3, 'action_debtcollector': 3,
  'action_birthday': 3, 'action_house': 3, 'action_hotel': 2, 'action_doublerent': 2,
  'action_thief_squirrel': 3,
  'rent_lightblue_brown': 2, 'rent_pink_orange': 2, 'rent_red_yellow': 2,
  'rent_blue_green': 2, 'rent_railroad_utility': 2, 'rent_all': 3,
  'money_1': 6, 'money_2': 5, 'money_3': 3, 'money_4': 3, 'money_5': 2, 'money_10': 1,
};

export const COLOR_INFO = {
  brown:     { name: 'Kahverengi', hex: '#8B4513', light: '#D2691E', rents: [1, 2] },
  lightblue: { name: 'Açık Mavi',  hex: '#4FA8D5', light: '#87CEEB', rents: [1, 2, 3] },
  pink:      { name: 'Pembe',      hex: '#E91E8C', light: '#FF69B4', rents: [1, 2, 4] },
  orange:    { name: 'Turuncu',    hex: '#E67E22', light: '#FFA500', rents: [1, 3, 5] },
  red:       { name: 'Kırmızı',    hex: '#C0392B', light: '#FF6666', rents: [2, 3, 6] },
  yellow:    { name: 'Sarı',       hex: '#D4AC0D', light: '#FFD700', rents: [2, 4, 6] },
  green:     { name: 'Yeşil',      hex: '#1E8449', light: '#52BE80', rents: [2, 4, 7] },
  blue:      { name: 'Lacivert',   hex: '#1A5276', light: '#2E86C1', rents: [3, 8] },
  railroad:  { name: 'Demir Yolları', hex: '#444444', light: '#777777', rents: [1, 2, 3, 4] },
  utility:   { name: 'Kamu Hizmetleri', hex: '#6C757D', light: '#ADB5BD', rents: [1, 2] },
};

export const PLAYER_COLORS = ['#FFD700', '#4FC3F7', '#FF8A65', '#BA68C8', '#AED581'];

export const SET_SIZES = {
  brown: 2, lightblue: 3, pink: 3, orange: 3, red: 3,
  yellow: 3, green: 3, blue: 2, railroad: 4, utility: 2,
};

export const ACTION_STYLE = {
  passgo: { icon: '🎲', bg: 'linear-gradient(135deg, #3498DB, #2980B9)' }, dealbreaker: { icon: '💣', bg: 'linear-gradient(135deg, #8E44AD, #5B2C6F)' },
  justsayno: { icon: '🛡️', bg: 'linear-gradient(135deg, #E74C3C, #A93226)' }, birthday: { icon: '🎂', bg: 'linear-gradient(135deg, #E91E8C, #AD1457)' },
  rent: { icon: '🧾', bg: 'linear-gradient(135deg, #16A085, #0E6655)' }, doublerent: { icon: '✖️2', bg: 'linear-gradient(135deg, #D35400, #A04000)' },
  slydeal: { icon: '🤏', bg: 'linear-gradient(135deg, #F39C12, #B9770E)' }, forceddeal: { icon: '🔁', bg: 'linear-gradient(135deg, #F39C12, #B9770E)' },
  debtcollector: { icon: '💸', bg: 'linear-gradient(135deg, #F39C12, #B9770E)' }, house: { icon: '🏠', bg: 'linear-gradient(135deg, #229954, #196F3D)' },
  hotel: { icon: '🏨', bg: 'linear-gradient(135deg, #229954, #145A32)' },
  thief_squirrel: { icon: '🐿️', bg: 'linear-gradient(135deg, #8B4513, #A0522D)' }
};