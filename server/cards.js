// Monopoly Deal - Resmi Kural Kartları (110 kart)
// Her karta sabit bir "key" atanır → tema/PNG sistemi bu key'leri kullanır
// (bkz: client/public/decks/README.md)

const COLOR_INFO = {
  brown: { name: 'Kahverengi', setSize: 2, rents: [1, 2], hex: '#8B4513' },
  lightblue: { name: 'Açık Mavi', setSize: 3, rents: [1, 2, 3], hex: '#4FA8D5' },
  pink: { name: 'Pembe', setSize: 3, rents: [1, 2, 4], hex: '#E91E8C' },
  orange: { name: 'Turuncu', setSize: 3, rents: [1, 3, 5], hex: '#E67E22' },
  red: { name: 'Kırmızı', setSize: 3, rents: [2, 3, 6], hex: '#C0392B' },
  yellow: { name: 'Sarı', setSize: 3, rents: [2, 4, 6], hex: '#D4AC0D' },
  green: { name: 'Yeşil', setSize: 3, rents: [2, 4, 7], hex: '#1E8449' },
  blue: { name: 'Lacivert', setSize: 2, rents: [3, 8], hex: '#1A5276' },
  railroad: { name: 'Demir Yolları', setSize: 4, rents: [1, 2, 3, 4], hex: '#444444' },
  utility: { name: 'Kamu Hizmetleri', setSize: 2, rents: [1, 2], hex: '#6C757D' },
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function createDeck(thiefSquirrelEnabled = false) {
  const deck = [];
  let id = 1;
  const add = (card) => deck.push({ ...card, id: id++ });

  // ── PARA KARTLARI (20 adet) ── key: money_{value}
  [[1, 6], [2, 5], [3, 3], [4, 3], [5, 2], [10, 1]].forEach(([value, count]) => {
    for (let i = 0; i < count; i++) add({ type: 'money', value, name: `${value}M`, key: `money_${value}` });
  });

  // ── MÜLKİYET KARTLARI (28 adet) ── key: prop_{color}_{slug}
  const properties = [
    { color: 'brown', name: 'KASIMPAŞA', value: 1 },
    { color: 'brown', name: 'DOLAPDERE', value: 1 },
    { color: 'lightblue', name: 'SULTANAHMET', value: 1 },
    { color: 'lightblue', name: 'KARAKÖY', value: 1 },
    { color: 'lightblue', name: 'SİRKECİ', value: 1 },
    { color: 'pink', name: 'BEY OĞLU', value: 2 },
    { color: 'pink', name: 'TAKSİM', value: 2 },
    { color: 'pink', name: 'BEŞİKTAŞ', value: 2 },
    { color: 'orange', name: 'HARBİYE', value: 2 },
    { color: 'orange', name: 'MECİDİYEKÖY', value: 2 },
    { color: 'orange', name: 'ŞİŞLİ', value: 2 },
    { color: 'red', name: 'ERENKÖY', value: 3 },
    { color: 'red', name: 'CADDEBOSTAN', value: 3 },
    { color: 'red', name: 'BOSTANCI', value: 3 },
    { color: 'yellow', name: 'TEŞVİKİYE', value: 3 },
    { color: 'yellow', name: 'MAÇKA', value: 3 },
    { color: 'yellow', name: 'NİŞANTAŞI', value: 3 },
    { color: 'green', name: 'BEBEK', value: 4 },
    { color: 'green', name: 'LEVENT', value: 4 },
    { color: 'green', name: 'ETİLER', value: 4 },
    { color: 'blue', name: 'YENİKÖY', value: 4 },
    { color: 'blue', name: 'TARABYA', value: 4 },
    { color: 'railroad', name: 'KADIKÖY VAPUR İSKELESİ', value: 2 },
    { color: 'railroad', name: 'KABATAŞ VAPUR İSKELESİ', value: 2 },
    { color: 'railroad', name: 'HAYDARPAŞA TREN İSTASYONU', value: 2 },
    { color: 'railroad', name: 'SİRKECİ TREN İSTASYONU', value: 2 },
    { color: 'utility', name: 'ELEKTRİK İDARESİ', value: 2 },
    { color: 'utility', name: 'SU İDARESİ', value: 2 },
  ];
  properties.forEach(p => {
    add({ type: 'property', color: p.color, name: p.name, value: p.value, colors: [p.color], key: `prop_${p.color}_${slugify(p.name)}` });
  });

  // ── JOKER MÜLKİYET KARTLARI (11 adet) ── key: dual_{c1}_{c2}_{n} / wild_full_{n}
  const dualCount = {};
  const addDual = (colors, name, value) => {
    const base = `dual_${colors[0]}_${colors[1]}`;
    dualCount[base] = (dualCount[base] || 0) + 1;
    add({ type: 'property', name, value, colors, isDual: true, color: colors[0], key: `${base}_${dualCount[base]}` });
  };
  addDual(['lightblue', 'brown'], 'Açık Mavi/Kahverengi', 1);
  addDual(['lightblue', 'railroad'], 'Açık Mavi/Demiryolu', 4);
  addDual(['pink', 'orange'], 'Pembe/Turuncu', 2);
  addDual(['pink', 'orange'], 'Pembe/Turuncu', 2);
  addDual(['red', 'yellow'], 'Kırmızı/Sarı', 3);
  addDual(['red', 'yellow'], 'Kırmızı/Sarı', 3);
  addDual(['blue', 'green'], 'Lacivert/Yeşil', 4);
  addDual(['green', 'railroad'], 'Yeşil/Demiryolu', 4);
  addDual(['railroad', 'utility'], 'Dem./Kamu Hizm.', 2);
  // Joker (Her renk grubu içinde kullanılabilir)
  add({ type: 'property', name: 'JOKER', value: 0, colors: Object.keys(COLOR_INFO), isWild: true, color: null, noBankAllowed: true, key: 'wild_full_1' });
  add({ type: 'property', name: 'JOKER', value: 0, colors: Object.keys(COLOR_INFO), isWild: true, color: null, noBankAllowed: true, key: 'wild_full_2' });

  // ── AKSİYON KARTLARI (34 adet) ── key: action_{action}
  for (let i = 0; i < 10; i++) add({ type: 'action', action: 'passgo', name: 'TEKRAR ÇEK', value: 1, description: '2 kart çek', key: 'action_passgo' });
  for (let i = 0; i < 2; i++)  add({ type: 'action', action: 'dealbreaker', name: 'HACİZ', value: 5, description: 'İstediğin bir oyuncunun bir tam arsa setine el koy. Varsa üzerindeki ev ve otelle birlikte el koyarsın', key: 'action_dealbreaker' });
  for (let i = 0; i < 3; i++)  add({ type: 'action', action: 'justsayno', name: 'REDDET', value: 4, description: 'Sana karşı kullanılan bir Hamle Kartında yazılanları yapma. Birden fazla oyuncuyu etkiliyorsa hamle kartı sana işlemez', key: 'action_justsayno' });
  for (let i = 0; i < 3; i++)  add({ type: 'action', action: 'slydeal', name: 'TAPU DEVRİ', value: 3, description: 'İstediğin bir oyuncunun bir Tapu Senedi kartına el koy. Tam setin bir parçası olan Tapu Senedi kartlarına el koyamazsın.', key: 'action_slydeal' });
  for (let i = 0; i < 3; i++)  add({ type: 'action', action: 'forceddeal', name: 'DEĞİŞ TOKUŞ', value: 3, description: 'Bir oyuncunun Tapu Senedi kartını alıp ona bir kart ver. Tam setin bir parçası olan kartı değiş tokuş yapamazsın.', key: 'action_forceddeal' });
  for (let i = 0; i < 3; i++)  add({ type: 'action', action: 'debtcollector', name: 'TASİLAT', value: 3, description: 'İstediğin bir oyuncudan 5M al', key: 'action_debtcollector' });
  for (let i = 0; i < 3; i++)  add({ type: 'action', action: 'birthday', name: 'DOĞUM GÜNÜN !', value: 2, description: 'Her Oyuncudan 2M al', key: 'action_birthday' });
  for (let i = 0; i < 3; i++)  add({ type: 'action', action: 'house', name: 'EV', value: 3, description: 'Kira gelirine 3M eklemek için bir tam arsa setinde kullanılır. Demir Yolu ve Kamu Hizmetlerinde kullanılamaz.', key: 'action_house' });
  for (let i = 0; i < 2; i++)  add({ type: 'action', action: 'hotel', name: 'OTEL', value: 4, description: 'Kira gelirine 4M eklemek için üzerinde Ev kartı olan bir tam arsa setinde kullanılır. Ev kartı yerinde kalır.', key: 'action_hotel' });
  for (let i = 0; i < 2; i++)  add({ type: 'action', action: 'doublerent', name: 'iKİ KAT KİRA', value: 1, description: 'Oyunculardan iki kat kira al! Kira kartı ile birlikte kullanılır.', key: 'action_doublerent' });

  if (thiefSquirrelEnabled) {
    for (let i = 0; i < 3; i++) {
      add({ type: 'action', action: 'thief_squirrel', name: 'HIRSIZ SİNCAP', value: 3, description: 'Seçtiğin bir rakibin elinden rastgele bir kart çal.', key: 'action_thief_squirrel' });
    }
  }

  // ── KİRA KARTLARI (13 adet) ── key: rent_{c1}_{c2} / rent_all
  [['lightblue', 'brown'], ['pink', 'orange'], ['red', 'yellow'], ['blue', 'green'], ['railroad', 'utility']].forEach(colors => {
    for (let i = 0; i < 2; i++) add({
      type: 'action', action: 'rent', name: 'Kira',
      value: 1, colors,
      description: `${COLOR_INFO[colors[0]]?.name}/${COLOR_INFO[colors[1]]?.name} kirası. Tüm Oyunculardan `,
      key: `rent_${colors[0]}_${colors[1]}`,
    });
  });
  for (let i = 0; i < 3; i++) add({ type: 'action', action: 'rent', name: 'Herhangi Kira', value: 3, colors: 'all', description: 'Seçtiğin renteki Tapu Senedi kartların için istediğin bir oyuncudan kira al.', key: 'rent_all' });

  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { createDeck, shuffle, COLOR_INFO, slugify };
