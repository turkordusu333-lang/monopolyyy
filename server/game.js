const { createDeck, shuffle, COLOR_INFO } = require('./cards');

let _pid = 1;
const nextPendingId = () => `pend_${_pid++}`;

class MonopolyDealGame {
  constructor(roomId, settings = {}) {
    this.roomId = roomId;
    this.autoEndTurn = settings.autoEndTurn ?? true;
    this.turnTimer = settings.turnTimer ?? 0; // saniye cinsinden, 0 = sınırsız
    this.winSets = parseInt(settings.winSets) || 3; // Kazanma hedefi
    this.startCards = parseInt(settings.startCards) || 5; // Başlangıç kartı
    this.handLimit = parseInt(settings.handLimit) || 7; // El limiti
    this.allowCounterJustSayNo = settings.allowCounterJustSayNo ?? true; // Çifte Reddet ayarı
    this.openHands = settings.openHands ?? false; // Açık El (Antrenman)
    this.lockWildcards = settings.lockWildcards ?? false; // Joker Kilidi
    this.fastChallenge = settings.fastChallenge ?? false; // 15 Sn Hızlı Reddet
    this.allowTrades = settings.allowTrades ?? false; // Barışçıl Takas
    this.streetThugs = settings.streetThugs ?? false; // Sokak Haydutları
    this.gambleZari = settings.gambleZari ?? false; // Kumarbazın Zarı
    this.extraDealBreakers = parseInt(settings.extraDealBreakers) || 0; // Özel Deste (+ Anlaşma Bozucu)
    this.players = []; // { id, name, avatar, hand, bank, properties, buildings, connected }
    this.deck = [];
    this.discard = [];
    this.currentPlayerIndex = 0;
    this.actionsLeft = 3;
    this.phase = 'waiting'; // waiting, playing, ended
    this.winner = null;
    this.log = [];
    this.scavengeMarket = []; // Karaborsa (Sokak Haydutları)

    this.turnStartTime = null; // Turun başladığı zaman damgası
    this.turnPausedRemaining = null; // Durdurulan süreden kalan miktar
    this.challengeStartTime = null; // İtiraz sayacı (Hızlı reddet için)
    // Bekleyen "Reddet!" pencereleri (Hamle kartına itiraz)
    this.pendingChallenges = []; // { id, action, data, sourceId, targetId, cancelled, responderId }
    // Bekleyen ödemeler (oyuncu manuel seçim yapar)
    this.pendingPayments = []; // { id, payerId, collectorId, amount, reason }
    this.pendingTrades = []; // Barışçıl Takas İstekleri
    this.theme = 'default';
  }

  addPlayer(id, name, avatar = 'avataaars') {
    // Yeniden bağlanma kontrolü: Eğer bu ID'ye sahip oyuncu zaten varsa (sayfa yenilendiğinde)
    const existing = this.players.find(p => p.id === id);
    if (existing) {
      existing.avatar = avatar; // Yeniden bağlanırken avatarı güncelle
      existing.connected = true;
      return true;
    }

    if (this.players.length >= 5 || this.phase !== 'waiting') return false;
    this.players.push({
      id, name, avatar,
      hand: [],
      bank: [],
      properties: {}, // color -> [cards]
      buildings: {},  // color -> { houses: n, hotel: bool }
      connected: true,
      isAFK: false, // Otomatik geçen/uyuyan oyuncu bayrağı
      hasGambledThisTurn: false,
      stats: { rentCollected: 0, cardsDrawn: 0, stealsPerformed: 0, totalMoneyBanked: 0, actionsPlayed: 0 }
    });
    return true;
  }

  removePlayer(id) {
    const player = this.players.find(p => p.id === id);
    if (!player) return;

    if (this.phase === 'waiting') {
      // Oyun başlamadıysa tamamen sil
      this.players = this.players.filter(p => p.id !== id);
    } else {
      // Oyun başladıysa kartları ve durumu silme, sadece bağlantı koptu olarak işaretle
      player.connected = false;
    }
  }

  start(theme, settings = {}) {
    if (this.players.length < 2) return false;
    if (theme && typeof theme === 'string') this.theme = theme;
    if (settings.winSets) this.winSets = parseInt(settings.winSets);
    if (settings.startCards) this.startCards = parseInt(settings.startCards);
    if (settings.handLimit) this.handLimit = parseInt(settings.handLimit);
    if (settings.allowCounterJustSayNo !== undefined) this.allowCounterJustSayNo = settings.allowCounterJustSayNo;
    if (settings.openHands !== undefined) this.openHands = settings.openHands;
    if (settings.lockWildcards !== undefined) this.lockWildcards = settings.lockWildcards;
    if (settings.fastChallenge !== undefined) this.fastChallenge = settings.fastChallenge;
    if (settings.allowTrades !== undefined) this.allowTrades = settings.allowTrades;
    if (settings.streetThugs !== undefined) this.streetThugs = settings.streetThugs;
    if (settings.gambleZari !== undefined) this.gambleZari = settings.gambleZari;
    if (settings.extraDealBreakers !== undefined) this.extraDealBreakers = parseInt(settings.extraDealBreakers);

    let newDeck = createDeck();
    // ÖZEL DESTE: Ekstra Anlaşma Bozucu Ekleme
    for(let i = 0; i < this.extraDealBreakers; i++) {
      newDeck.push({ id: `custom_db_${i}`, type: 'action', action: 'dealbreaker', name: 'Anlaşma Bozucu (ÖZEL)', value: 5, key: 'action_dealbreaker', colors: [] });
    }
    this.deck = shuffle(newDeck);
    this.discard = [];
    this.phase = 'playing';
    this.winner = null;
    this.log = [];
    this.pendingChallenges = [];
    this.pendingPayments = [];
    this.pendingTrades = [];
    this.scavengeMarket = [];
    this.players.forEach(p => {
      p.hand = [];
      p.bank = [];
      p.properties = {};
      p.buildings = {};
      p.stats = { // İstatistikleri sıfırla
        rentCollected: 0, cardsDrawn: 0, stealsPerformed: 0, totalMoneyBanked: 0, actionsPlayed: 0
      };
      p.hasGambledThisTurn = false;
      p.hand = this.drawCards(this.startCards);
      p.stats.cardsDrawn = this.startCards; // İlk çekilen kartları say
    });
    this.currentPlayerIndex = 0;
    this.actionsLeft = 3;
    this.addLog(`Oyun başladı! 🚀 İlk oyuncu: ${this.currentPlayer.name}`, 'system');
    this.drawForTurn();
    this.resetTurnTimer();
    return true;
  }

  // Tur zamanlayıcısını başlat/sıfırla
  resetTurnTimer() {
    this.turnStartTime = this.turnTimer > 0 ? Date.now() : null;
    this.turnPausedRemaining = null;
  }

  // Süreyi dondur ve bonus saniye ekle
  pauseTurnTimer(addSecs = 0) {
    if (this.turnTimer > 0 && this.turnStartTime && this.turnPausedRemaining === null) {
      const elapsed = (Date.now() - this.turnStartTime) / 1000;
      this.turnPausedRemaining = Math.max(0, this.turnTimer - elapsed) + addSecs;
      this.turnStartTime = null; // Sürenin donduğunu belirtir
    }
  }

  // Dondurulan süreyi devam ettir
  resumeTurnTimer() {
    if (!this.hasBlockingState && this.turnTimer > 0 && this.turnPausedRemaining !== null) {
      this.turnStartTime = Date.now() - (this.turnTimer - this.turnPausedRemaining) * 1000;
      this.turnPausedRemaining = null;
    }
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  get hasBlockingState() {
    return this.pendingChallenges.length > 0 || this.pendingPayments.length > 0 || this.pendingTrades.length > 0;
  }

  drawCards(n) {
    const drawn = [];
    for (let i = 0; i < n; i++) {
      if (this.deck.length === 0) {
        if (this.discard.length === 0) break;
        this.deck = shuffle(this.discard);
        this.discard = [];
      }
      drawn.push(this.deck.pop());
    }
    return drawn;
  }

  drawForTurn() {
    const player = this.currentPlayer;
    const need = player.hand.length === 0 ? 5 : 2;
    const drawn = this.drawCards(need);
    player.hand.push(...drawn);
    player.stats.cardsDrawn += drawn.length;
    this.addLog(`${player.name} desteden ${drawn.length} yeni kart çekti. (Deste: ${this.deck.length})`, 'draw');
    
    if (this.deck.length <= 10 && this.deck.length > 0) {
      this.addLog(`⚠️ DİKKAT: Destede sadece ${this.deck.length} kart kaldı!`, 'system');
    }
  }

  // ──────────────────────────────────────────────────────────
  // KART OYNAMA
  // ──────────────────────────────────────────────────────────
  playCard(playerId, cardId, options = {}) {
    if (this.phase !== 'playing') return { ok: false, error: 'Oyun devam etmiyor' };
    if (this.hasBlockingState) return { ok: false, error: 'Önce bekleyen ödeme/itirazları çöz' };
    if (this.currentPlayer.id !== playerId) return { ok: false, error: 'Sıra sende değil' };
    if (this.actionsLeft <= 0) return { ok: false, error: 'Aksiyon hakkın bitti' };

    const player = this.currentPlayer;
    player.isAFK = false; // Oyuncu hamle yaptı, AFK'dan çıkar
    
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { ok: false, error: 'Kart elde yok' };
    const card = player.hand[cardIdx];

    let result = { ok: false, error: 'Geçersiz aksiyon' };
    let actionsUsed = 1;

    if (options.asBankMoney) {
      result = this.playToBank(player, card, cardIdx);
    } else if (card.type === 'money') {
      result = this.playToBank(player, card, cardIdx);
    } else if (card.type === 'property') {
      result = this.playProperty(player, card, cardIdx, options);
    } else if (card.type === 'action') {
      const r = this.playAction(player, card, cardIdx, options);
      result = r;
      if (r.ok && r.actionsUsed) actionsUsed = r.actionsUsed;
    }

    if (result.ok) {
      if (!options.asBankMoney && card.type === 'action') {
        player.stats.actionsPlayed += 1;
      }
      this.actionsLeft -= actionsUsed;
      if (this.actionsLeft < 0) this.actionsLeft = 0;
      const moveText = this.actionsLeft > 0 ? `${this.actionsLeft} hamle kaldı` : "Hamle bitti";
      this.log[this.log.length - 1].msg += ` (${moveText})`;
      this.checkWin();
      // Hamle hakkı bittiyse ve otomatik tur bitirme açıksa
      if (this.actionsLeft === 0 && this.autoEndTurn) {
        this.endTurn(playerId); // Otomatik tur bitir
      } else if (this.actionsLeft > 0) {
        // Eğer hamle hakkı kaldıysa ve tur zamanlayıcısı varsa, sıfırla
        // Bu, oyuncunun bir hamle yaptığında zamanlayıcının sıfırlanmasını sağlar
        this.resetTurnTimer();
      }
    }
    return result;
  }

  playToBank(player, card, idx) {
    if (card.type === 'property') {
      return { ok: false, error: 'Tapu Senedi kartları Bankaya konamaz' };
    }
    const typeDesc = card.type === 'action' ? `"${card.name}" aksiyon kartını` : `"${card.value}M" nakit kartını`;
    player.hand.splice(idx, 1);
    player.bank.push(card);
    const totalBank = player.bank.reduce((s, c) => s + (c.value || 0), 0);
    this.addLog(`${player.name} elindeki ${typeDesc} ${card.value}M olarak kasaya koydu. (Güncel Kasa: ${totalBank}M)`, 'money');
    return { ok: true };
  }

  playProperty(player, card, idx, options) {
    const color = options.color || (card.colors && card.colors[0]);
    if (!color) return { ok: false, error: 'Renk seçilmedi' };
    if (!card.colors.includes(color)) return { ok: false, error: 'Geçersiz renk' };

    player.hand.splice(idx, 1);
    if (!player.properties[color]) player.properties[color] = [];
    player.properties[color].push({ ...card, activeColor: color });
    this.addLog(`${player.name}, ${COLOR_INFO[color]?.name || color} grubuna "${card.name}" arazisini ekledi.`, 'property');
    return { ok: true };
  }

  // Çift renkli / joker araziyi farklı renge taşı (aksiyon harcamaz, sıra sende olmalı)
  flipProperty(playerId, cardId, newColor) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { ok: false, error: 'Oyuncu bulunamadı' };
    player.isAFK = false; // Aktif olduğunu belirt
    
    if (this.currentPlayer.id !== playerId) return { ok: false, error: 'Sıra sende değil' };
    if (this.hasBlockingState) return { ok: false, error: 'Önce bekleyen ödeme/itirazları çöz' };

    if (this.lockWildcards) return { ok: false, error: 'Bu odada "Joker Kilidi" açık. Yere inmiş jokerlerin rengi bir daha değiştirilemez!' };

    let foundCard = null, foundColor = null;
    for (const [color, cards] of Object.entries(player.properties)) {
      const idx = cards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        foundCard = cards[idx];
        foundColor = color;
        cards.splice(idx, 1);
        if (cards.length === 0) delete player.properties[color];
        break;
      }
    }
    if (!foundCard) return { ok: false, error: 'Arazi bulunamadı' };
    if (!foundCard.isDual && !foundCard.isWild) return { ok: false, error: 'Sadece çift renkli/joker araziler değiştirilebilir' };
    if (!foundCard.colors.includes(newColor)) return { ok: false, error: 'Geçersiz renk' };
    if (newColor === foundColor) return { ok: false, error: 'Zaten bu renkte' };

    if (!player.properties[newColor]) player.properties[newColor] = [];
    player.properties[newColor].push({ ...foundCard, activeColor: newColor });
    this.addLog(`${player.name} "${foundCard.name}" arazisini ${COLOR_INFO[newColor]?.name || newColor} rengine taşıdı`);
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────
  // AKSİYON KARTLARI
  // ──────────────────────────────────────────────────────────
  playAction(player, card, idx, options) {
    switch (card.action) {
      case 'passgo':         return this.actionPassGo(player, card, idx);
      case 'birthday':       return this.actionBirthday(player, card, idx);
      case 'debtcollector':  return this.actionDebtCollector(player, card, idx, options);
      case 'rent':           return this.actionRent(player, card, idx, options);
      case 'slydeal':        return this.actionSlyDeal(player, card, idx, options);
      case 'forceddeal':     return this.actionForcedDeal(player, card, idx, options);
      case 'dealbreaker':    return this.actionDealBreaker(player, card, idx, options);
      case 'house':
      case 'hotel':          return this.actionBuilding(player, card, idx, options);
      case 'doublerent':     return { ok: false, error: 'Bu kart Kira kartıyla birlikte oynanmalı (Kira kartını seçip "2x" seçeneğini işaretle)' };
      case 'justsayno':      return { ok: false, error: 'Reddet! kartı sadece sana karşı oynanan bir karta yanıt olarak kullanılabilir' };
      default:
        return { ok: false, error: 'Bilinmeyen aksiyon' };
    }
  }

  actionPassGo(player, card, idx) {
    player.hand.splice(idx, 1);
    this.discard.push(card);
    const drawn = this.drawCards(2);
    player.hand.push(...drawn);
    this.addLog(`${player.name} "Geç Go!" oynadı, 2 kart çekti`, 'action');
    return { ok: true };
  }

  // Doğum Günüm — herkese ayrı ayrı "Reddet!" penceresi açılır
  actionBirthday(player, card, idx) {
    player.hand.splice(idx, 1);
    this.discard.push(card);
    const targets = this.players.filter(p => p.id !== player.id);
    targets.forEach(target => {
      this.openChallenge({
        action: 'birthday',
        sourceId: player.id,
        targetId: target.id,
        data: { amount: 2, reason: `${player.name}'in Doğum Günü hediyesi` },
      });
    });
    this.addLog(`${player.name} "Doğum Günüm!" oynadı! Herkes 2M ödeyecek (itiraz süresi)`, 'action');
    return { ok: true };
  }

  actionDebtCollector(player, card, idx, options) {
    const { targetId } = options;
    if (!targetId) return { ok: false, error: 'Hedef oyuncu seç' };
    const target = this.players.find(p => p.id === targetId);
    if (!target || target.id === player.id) return { ok: false, error: 'Geçersiz hedef' };
    player.hand.splice(idx, 1);
    this.discard.push(card);
    this.openChallenge({
      action: 'debtcollector',
      sourceId: player.id,
      targetId: target.id,
      data: { amount: 5, reason: `${player.name}'in Borç Tahsildarı` },
    });
    this.addLog(`${player.name} "Borç Tahsildarı" oynadı, ${target.name}'dan 5M istiyor (itiraz süresi)`, 'action');
    return { ok: true };
  }

  // Kira — opsiyonel İki Kat Kira kartıyla birlikte oynanabilir (options.doubleRentCardId)
  actionRent(player, card, idx, options) {
    const { color, targetId, doubleRentCardId } = options;
    if (!color) return { ok: false, error: 'Renk seçilmedi' };

    const props = player.properties[color] || [];
    if (props.length === 0) return { ok: false, error: 'O renkte arazin yok' };

    const validColors = Array.isArray(card.colors) ? card.colors : [];
    if (card.colors !== 'all' && !validColors.includes(color)) {
      return { ok: false, error: 'Bu kira kartı o renge uygun değil' };
    }
    if (card.colors === 'all' && !targetId) {
      return { ok: false, error: 'Herhangi Kira için bir hedef oyuncu seç' };
    }

    let multiplier = 1;
    let doubleCard = null, doubleIdx = -1;
    if (doubleRentCardId) {
      doubleIdx = player.hand.findIndex(c => c.id === doubleRentCardId && c.action === 'doublerent');
      if (doubleIdx === -1) return { ok: false, error: 'İki Kat Kira kartı bulunamadı' };
      doubleCard = player.hand[doubleIdx];
      multiplier = 2;
    }

    let rentAmount = this.calculateRent(player, color) * multiplier;

    // Önce kira kartını ele al, sonra (varsa) double rent
    player.hand.splice(idx, 1);
    this.discard.push(card);
    if (doubleCard) {
      // idx kaymış olabilir, yeniden bul
      const dIdx = player.hand.findIndex(c => c.id === doubleRentCardId);
      if (dIdx !== -1) player.hand.splice(dIdx, 1);
      this.discard.push(doubleCard);
    }

    if (card.colors === 'all') {
      const target = this.players.find(p => p.id === targetId);
      if (!target) return { ok: false, error: 'Hedef bulunamadı' };
      this.openChallenge({
        action: 'rent',
        sourceId: player.id,
        targetId: target.id,
        data: { amount: rentAmount, reason: `${player.name}'in ${COLOR_INFO[color]?.name} kirası${multiplier > 1 ? ' (2x)' : ''}` },
      });
      this.addLog(`${player.name} "Joker Kira" oynadı! ${target.name} hedef seçildi ve ${rentAmount}M ödemesi istendi.`, 'action');
    } else {
      const targets = this.players.filter(p => p.id !== player.id);
      const targetNames = targets.map(t => t.name).join(', ');
      targets.forEach(target => {
        this.openChallenge({
          action: 'rent',
          sourceId: player.id,
          targetId: target.id,
          data: { amount: rentAmount, reason: `${player.name}'in ${COLOR_INFO[color]?.name} kirası${multiplier > 1 ? ' (2x)' : ''}` },
        });
      });
      this.addLog(`${player.name}, ${COLOR_INFO[color]?.name} kirası topluyor${multiplier > 1 ? ' (2X)' : ''}! ${targetNames} için ${rentAmount}M borç çıkartıldı.`, 'action');
    }

    return { ok: true, actionsUsed: doubleCard ? 2 : 1 };
  }

  actionSlyDeal(player, card, idx, options) {
    const { targetId, targetColor, targetCardId } = options;
    if (!targetId || !targetColor || !targetCardId) return { ok: false, error: 'Hedef ve kart seç' };
    const target = this.players.find(p => p.id === targetId);
    if (!target) return { ok: false, error: 'Hedef bulunamadı' };

    const targetProps = target.properties[targetColor] || [];
    if (this.isSetComplete(targetProps, targetColor)) {
      return { ok: false, error: 'Tam setten arazi çalınamaz' };
    }
    const propIdx = targetProps.findIndex(c => c.id === targetCardId);
    if (propIdx === -1) return { ok: false, error: 'Arazi bulunamadı' };
    const stolenCardPreview = targetProps[propIdx];

    player.hand.splice(idx, 1);
    this.discard.push(card);

    this.openChallenge({
      action: 'slydeal',
      sourceId: player.id,
      targetId: target.id,
      data: { targetColor, targetCardId, cardName: stolenCardPreview.name },
    });
    this.addLog(`${player.name} "Sinsi Anlaşma" kullandı! ${target.name}'ın "${stolenCardPreview.name}" arazisini çalmak için hamle yaptı.`, 'action');
    return { ok: true };
  }

  actionForcedDeal(player, card, idx, options) {
    const { targetId, targetColor, targetCardId, myColor, myCardId } = options;
    if (!targetId || !targetColor || !targetCardId || !myColor || !myCardId) {
      return { ok: false, error: 'Takas için her iki kart da seçilmeli' };
    }
    const target = this.players.find(p => p.id === targetId);
    if (!target) return { ok: false, error: 'Hedef bulunamadı' };

    const targetProps = target.properties[targetColor] || [];
    if (this.isSetComplete(targetProps, targetColor)) return { ok: false, error: 'Tam setten takas yapılamaz' };

    const myProps = player.properties[myColor] || [];
    if (this.isSetComplete(myProps, myColor)) return { ok: false, error: 'Tam setini takas edemezsin' };

    const tIdx = targetProps.findIndex(c => c.id === targetCardId);
    const mIdx = myProps.findIndex(c => c.id === myCardId);
    if (tIdx === -1 || mIdx === -1) return { ok: false, error: 'Kartlar bulunamadı' };

    player.hand.splice(idx, 1);
    this.discard.push(card);

    this.openChallenge({
      action: 'forceddeal',
      sourceId: player.id,
      targetId: target.id,
      data: { targetColor, targetCardId, myColor, myCardId, theirCardName: targetProps[tIdx].name, myCardName: myProps[mIdx].name },
    });
    this.addLog(`${player.name} zorunlu takas başlattı! ${target.name} ile arazi değiş-tokuşu istiyor.`, 'action');
    return { ok: true };
  }

  actionDealBreaker(player, card, idx, options) {
    const { targetId, targetColor } = options;
    if (!targetId || !targetColor) return { ok: false, error: 'Hedef ve renk seç' };
    const target = this.players.find(p => p.id === targetId);
    if (!target) return { ok: false, error: 'Hedef bulunamadı' };

    const targetProps = target.properties[targetColor] || [];
    if (!this.isSetComplete(targetProps, targetColor)) return { ok: false, error: 'Sadece tam setler çalınabilir' };

    player.hand.splice(idx, 1);
    this.discard.push(card);

    this.openChallenge({
      action: 'dealbreaker',
      sourceId: player.id,
      targetId: target.id,
      data: { targetColor },
    });
    this.addLog(`${player.name} "Anlaşma Bozucu" oynadı! ${target.name}'ın tamamlanmış ${COLOR_INFO[targetColor]?.name || targetColor} setinin tamamını ele geçirmeye çalışıyor!`, 'action');
    return { ok: true };
  }

  actionBuilding(player, card, idx, options) {
    const { color } = options;
    if (!color) return { ok: false, error: 'Renk seçilmedi' };
    if (color === 'railroad' || color === 'utility') {
      return { ok: false, error: 'Demiryolu/Kamu Hizmeti setlerine Ev/Otel konamaz' };
    }
    const props = player.properties[color] || [];
    if (!this.isSetComplete(props, color)) return { ok: false, error: 'Sadece tam setlere bina eklenebilir' };

    if (!player.buildings[color]) player.buildings[color] = { houses: 0, hotel: false };
    const b = player.buildings[color];

    if (card.action === 'hotel') {
      if (b.houses < 1) return { ok: false, error: 'Otel için önce bu sete Ev koymalısın' };
      if (b.hotel) return { ok: false, error: 'Bu sette zaten otel var' };
      b.hotel = true;
    } else {
      if (b.houses >= 1) return { ok: false, error: 'Bu sette zaten Ev var (her settte sadece 1 Ev olabilir)' };
      b.houses = 1;
    }

    player.hand.splice(idx, 1);
    this.discard.push(card);
    this.addLog(`${player.name} muazzam bir yatırım yaptı! ${COLOR_INFO[color]?.name || color} setine bir ${card.action === 'hotel' ? '🏨 Otel' : '🏠 Ev'} inşa etti.`, 'property');
    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────
  // SET TAMAMLAMA KONTROLÜ (10 renkli joker tek başına set tamamlayamaz)
  // ──────────────────────────────────────────────────────────
  isSetComplete(cards, color) {
    const colorInfo = COLOR_INFO[color];
    if (!colorInfo) return false;
    if (cards.length < colorInfo.setSize) return false;
    // En az bir kart "her renk joker" (isWild) olmamalı
    const nonMultiWild = cards.filter(c => !c.isWild);
    return nonMultiWild.length >= 1;
  }

  // ──────────────────────────────────────────────────────────
  // REDDET! (JUST SAY NO) ZİNCİRİ
  // ──────────────────────────────────────────────────────────
  openChallenge({ action, sourceId, targetId, data }) {
    this.pauseTurnTimer(3); // Araya girildi! Süreyi dondur ve +3 saniye hediye et
    this.challengeStartTime = Date.now(); // Hızlı reddet için itiraz başlangıcı
    
    this.pendingChallenges.push({
      id: nextPendingId(),
      action,
      sourceId,
      targetId,
      data,
      cancelled: false,
      responderId: targetId, // sırada kimin yanıt vermesi gerekiyor
    });
  }

  hasJustSayNo(player) {
    return player.hand.some(c => c.action === 'justsayno');
  }

  // playerId: yanıt veren oyuncu. useJustSayNo: true/false
  respondToChallenge(playerId, challengeId, useJustSayNo) {
    const ch = this.pendingChallenges.find(c => c.id === challengeId);
    if (!ch) return { ok: false, error: 'İtiraz bulunamadı' };
    
    const player = this.players.find(p => p.id === playerId);
    if (player) player.isAFK = false;
    
    if (ch.responderId !== playerId) return { ok: false, error: 'Sırada sen değilsin' };

    if (useJustSayNo) {
      if (!this.allowCounterJustSayNo && ch.cancelled) {
        return { ok: false, error: 'Bu odada Çifte Reddet (İtiraza itiraz) kuralı kapalıdır.' };
      }
      
      const cardIdx = player.hand.findIndex(c => c.action === 'justsayno');
      if (cardIdx === -1) return { ok: false, error: 'Reddet! kartın yok' };
      const jCard = player.hand.splice(cardIdx, 1)[0];
      this.discard.push(jCard);
      ch.cancelled = !ch.cancelled;
      // Sıra diğer tarafa geçer (zincir)
      ch.responderId = ch.responderId === ch.targetId ? ch.sourceId : ch.targetId;
      const playerName = player.name;
      this.addLog(`${playerName} "Reddet!" oynadı! ${ch.cancelled ? 'Hamle geçersiz' : 'Hamle yine geçerli'} (karşı tarafa söz hakkı)`, 'action');

      // Karşı tarafın elinde Reddet! yoksa otomatik sonlandır
      const otherId = ch.responderId;
      const otherPlayer = this.players.find(p => p.id === otherId);
      if (!this.hasJustSayNo(otherPlayer)) {
        return this.finalizeChallenge(ch);
      }
      return { ok: true };
    } else {
      // Kabul etti / pas geçti → bekleyen tarafın söz hakkı yoksa sonlandır
      // Eğer şu an sıradaki "sourceId" ise ve henüz hiç Reddet! oynanmadıysa (cancelled=false) bu ilk pas anlamına gelir
      return this.finalizeChallenge(ch);
    }
  }

  finalizeChallenge(ch) {
    this.pendingChallenges = this.pendingChallenges.filter(c => c.id !== ch.id);
    const source = this.players.find(p => p.id === ch.sourceId);
    const target = this.players.find(p => p.id === ch.targetId);

    if (ch.cancelled) {
      this.addLog(`${target.name} "${ch.action}" hamlesini Reddet! ile durdurdu`, 'action');
      this.checkTurnDrawIfNeeded();
      this.resumeTurnTimer();
      return { ok: true, cancelled: true };
    }

    // Hamleyi gerçekleştir
    switch (ch.action) {
      case 'birthday':
      case 'debtcollector':
      case 'rent':
        this.createPaymentRequest(ch.targetId, ch.sourceId, ch.data.amount, ch.data.reason);
        break;
      case 'slydeal': {
        const targetProps = target.properties[ch.data.targetColor] || [];
        const propIdx = targetProps.findIndex(c => c.id === ch.data.targetCardId);
        if (propIdx !== -1) {
          const stolen = targetProps.splice(propIdx, 1)[0];
          if (targetProps.length === 0) delete target.properties[ch.data.targetColor];
          if (!source.properties[ch.data.targetColor]) source.properties[ch.data.targetColor] = [];
          source.properties[ch.data.targetColor].push(stolen);
          this.addLog(`${source.name} "${stolen.name}" arazisini ${target.name}'dan aldı!`, 'property');
        }
        break;
      }
      case 'forceddeal': {
        const { targetColor, targetCardId, myColor, myCardId } = ch.data;
        const targetProps = target.properties[targetColor] || [];
        const myProps = source.properties[myColor] || [];
        const tIdx = targetProps.findIndex(c => c.id === targetCardId);
        const mIdx = myProps.findIndex(c => c.id === myCardId);
        if (tIdx !== -1 && mIdx !== -1) {
          const theirCard = targetProps.splice(tIdx, 1)[0];
          const myCard = myProps.splice(mIdx, 1)[0];
          if (targetProps.length === 0) delete target.properties[targetColor];
          if (myProps.length === 0) delete source.properties[myColor];
          if (!source.properties[targetColor]) source.properties[targetColor] = [];
          source.properties[targetColor].push({ ...theirCard, activeColor: targetColor });
          if (!target.properties[myColor]) target.properties[myColor] = [];
          target.properties[myColor].push({ ...myCard, activeColor: myColor });
          this.addLog(`${source.name} ile ${target.name} arazi takası tamamlandı!`, 'property');
        }
        break;
      }
      case 'dealbreaker': {
        const { targetColor } = ch.data;
        const stolenSet = target.properties[targetColor];
        if (stolenSet) {
          delete target.properties[targetColor];
          if (!source.properties[targetColor]) source.properties[targetColor] = [];
          source.properties[targetColor].push(...stolenSet);
          if (target.buildings[targetColor]) {
            source.buildings[targetColor] = target.buildings[targetColor];
            delete target.buildings[targetColor];
          }
          this.addLog(`${source.name} ${target.name}'ın ${COLOR_INFO[targetColor]?.name} setini çaldı!`, 'property');
        }
        break;
      }
    }
    this.checkWin();
    this.checkTurnDrawIfNeeded();
    this.resumeTurnTimer();
    return { ok: true, cancelled: false };
  }

  // ──────────────────────────────────────────────────────────
  // ÖDEME SİSTEMİ (oyuncu manuel seçer)
  // ──────────────────────────────────────────────────────────
  createPaymentRequest(payerId, collectorId, amount, reason) {
    if (amount <= 0) return;
    const payer = this.players.find(p => p.id === payerId);
    const hasAnything = payer.bank.length > 0 || Object.values(payer.properties).some(arr => arr.length > 0);
    if (!hasAnything) {
      const collector = this.players.find(p => p.id === collectorId);
      this.addLog(`${payer.name} ödeyecek hiçbir şeyi yok, ${collector?.name} bu sefer boş döndü`, 'system');
      return;
    }
    
    this.pauseTurnTimer(3); // Ödeme zorunluluğu çıktı, süreyi dondur +6 saniye ekle
    this.pendingPayments.push({
      id: nextPendingId(),
      payerId, collectorId, amount, reason,
    });

    // YENİ: Eğer ödeme yapacak oyuncu bağlı değilse, bot ödemeyi yapsın.
    if (!payer.connected) {
      this.handleBotPayment(payer, amount);
    }
  }

  // AFK/Bot ödeme mantığı
  handleBotPayment(payer, amount) {
    console.log(`[BOT] Disconnected player ${payer.name} için ${amount}M tutarında ödeme yapılıyor.`);
    const bankCards = [...payer.bank].sort((a, b) => a.value - b.value);
    const propertyCards = Object.values(payer.properties).flat().sort((a, b) => a.value - b.value);

    let paidAmount = 0;
    const bankToPay = [];
    const propsToPay = [];

    // Önce en değersiz banka kartlarını kullan
    for (const card of bankCards) {
      if (paidAmount >= amount) break;
      bankToPay.push(card.id);
      paidAmount += card.value;
    }

    // Hala yetmezse, en değersiz arazileri kullan
    if (paidAmount < amount) {
      for (const card of propertyCards) {
        if (paidAmount >= amount) break;
        propsToPay.push(card.id);
        paidAmount += card.value;
      }
    }
    
    const totalAssets = payer.bank.reduce((s, c) => s + c.value, 0) + Object.values(payer.properties).flat().reduce((s, c) => s + c.value, 0);
    // Eğer oyuncunun varlıkları borcu karşılamıyorsa, her şeyini vermek zorunda.
    if (paidAmount < amount && totalAssets > 0 && totalAssets < amount) {
        const allBankIds = payer.bank.map(c => c.id);
        const allPropIds = Object.values(payer.properties).flat().map(c => c.id);
        this.addLog(`[BOT] ${payer.name} borcunu ödeyemedi, tüm varlıklarına el konuldu!`, 'system');
        this.submitPayment(payer.id, allBankIds, allPropIds);
    } else {
        this.addLog(`[BOT] ${payer.name} otomatik olarak ${paidAmount}M ödedi.`, 'system');
        this.submitPayment(payer.id, bankToPay, propsToPay);
    }
  }

  // payerId öder: bankCardIds (para kartı id'leri) + propertyCardIds (arazi kartı id'leri, herhangi renkten)
  submitPayment(playerId, bankCardIds = [], propertyCardIds = []) {
    const payment = this.pendingPayments.find(p => p.payerId === playerId);
    if (!payment) return { ok: false, error: 'Bekleyen ödeme yok' };

    const payer = this.players.find(p => p.id === playerId);
    if (payer) payer.isAFK = false;
    const collector = this.players.find(p => p.id === payment.collectorId);

    // Bankadan seçilen kartlar
    const bankCards = [];
    for (const cid of bankCardIds) {
      const c = payer.bank.find(x => x.id === cid);
      if (!c) return { ok: false, error: 'Banka kartı bulunamadı' };
      bankCards.push(c);
    }

    // Arazilerden seçilen kartlar (herhangi renkten - tam setten de olabilir, çünkü ödeme zorunlu)
    const propCards = [];
    const propLocations = []; // { color, card }
    for (const cid of propertyCardIds) {
      let found = null, foundColor = null;
      for (const [color, cards] of Object.entries(payer.properties)) {
        const c = cards.find(x => x.id === cid);
        if (c) { found = c; foundColor = color; break; }
      }
      if (!found) return { ok: false, error: 'Arazi kartı bulunamadı' };
      propCards.push(found);
      propLocations.push({ color: foundColor, card: found });
    }

    const selectedTotal = bankCards.reduce((s, c) => s + c.value, 0) + propCards.reduce((s, c) => s + c.value, 0);

    // Toplam varlık
    const totalBank = payer.bank.reduce((s, c) => s + c.value, 0);
    const totalProps = Object.values(payer.properties).flat().reduce((s, c) => s + c.value, 0);
    const totalAssets = totalBank + totalProps;

    if (selectedTotal < payment.amount && selectedTotal < totalAssets) {
      return { ok: false, error: `Seçtiğin kartlar yetersiz (${selectedTotal}M / ${payment.amount}M gerekli). Borcu kapatamıyorsan TÜM kartlarını seçmelisin.` };
    }
    if (selectedTotal === 0) {
      return { ok: false, error: 'En az bir kart seçmelisin (eğer hiç kartın yoksa bu ödeme otomatik geçilir)' };
    }

    // Transfer: banka kartları → collector bankası
    bankCards.forEach(c => {
      payer.bank.splice(payer.bank.indexOf(c), 1);
      collector.bank.push(c);
    });
    // Transfer: arazi kartları → collector'ın araziler arasına (asla bankaya değil)
    propLocations.forEach(({ color, card }) => {
      const arr = payer.properties[color];
      const i = arr.indexOf(card);
      arr.splice(i, 1);
      if (arr.length === 0) delete payer.properties[color];
      if (!collector.properties[color]) collector.properties[color] = [];
      collector.properties[color].push({ ...card, activeColor: color });
    });

    this.pendingPayments = this.pendingPayments.filter(p => p.id !== payment.id);

    // Detaylı ödeme içeriği oluştur
    const bankItems = bankCards.map(c => `${c.value}M Nakit`);
    const propItems = propCards.map(c => `"${c.name}" arazisi`);
    const paymentDetail = [...bankItems, ...propItems].join(', ');
    
    const payerBank = payer.bank.reduce((s, c) => s + (c.value || 0), 0);
    const collectorBank = collector.bank.reduce((s, c) => s + (c.value || 0), 0);

    this.addLog(`${payer.name}, ${collector.name}'a ${selectedTotal}M ödedi. (Kalan Kasası: ${payerBank}M | Alıcının Kasası: ${collectorBank}M)`, 'payment');
    this.checkWin();
    this.checkTurnDrawIfNeeded();
    this.resumeTurnTimer();
    return { ok: true };
  }

  // Eğer tüm bekleyen işler bittiyse ve sıradaki oyuncunun eli boşsa otomatik bir şey yapmaya gerek yok;
  // bu fonksiyon sadece win-check sonrası temizlik amaçlı, şu an no-op bırakıldı.
  checkTurnDrawIfNeeded() {}

  calculateRent(player, color) {
    const props = player.properties[color] || [];
    const colorInfo = COLOR_INFO[color];
    if (!colorInfo) return 0;
    const count = Math.min(props.length, colorInfo.rents.length);
    let rent = colorInfo.rents[count - 1] || 0;

    const buildings = player.buildings[color];
    if (buildings && this.isSetComplete(props, color)) {
      if (buildings.houses > 0) rent += 3;
      if (buildings.hotel) rent += 4;
    }
    return rent;
  }

  // ──────────────────────────────────────────────────────────
  // BARIŞÇIL TAKAS SİSTEMİ
  // ──────────────────────────────────────────────────────────
  proposeTrade(sourceId, targetId, offerBankIds, offerPropIds, requestBankIds, requestPropIds) {
    if (!this.allowTrades) return { ok: false, error: 'Bu odada Barışçıl Takas kapalı.' };
    if (this.currentPlayer.id !== sourceId) return { ok: false, error: 'Sıra sende değil' };
    if (this.hasBlockingState) return { ok: false, error: 'Önce bekleyen eylemleri çöz' };
    if (this.actionsLeft <= 0) return { ok: false, error: 'Aksiyon hakkın bitti' };

    const target = this.players.find(p => p.id === targetId);
    if (!target) return { ok: false, error: 'Hedef bulunamadı' };

    this.pendingTrades.push({ id: nextPendingId(), sourceId, targetId, offerBankIds, offerPropIds, requestBankIds, requestPropIds });
    this.pauseTurnTimer(15);
    this.addLog(`${this.currentPlayer.name}, ${target.name} ile barışçıl bir takas yapmak istiyor! 🤝`, 'action');
    return { ok: true };
  }

  respondToTrade(playerId, tradeId, accepted) {
    const tradeIndex = this.pendingTrades.findIndex(t => t.id === tradeId);
    if (tradeIndex === -1) return { ok: false, error: 'Takas bulunamadı' };
    const trade = this.pendingTrades[tradeIndex];
    if (trade.targetId !== playerId) return { ok: false, error: 'Bu takas sana gelmedi' };

    this.pendingTrades.splice(tradeIndex, 1);
    this.resumeTurnTimer();
    const source = this.players.find(p => p.id === trade.sourceId);
    const target = this.players.find(p => p.id === trade.targetId);

    if (!accepted) {
      this.addLog(`${target.name}, takas teklifini reddetti. ❌`, 'system');
      return { ok: true };
    }

    this.actionsLeft -= 1; // Takas 1 aksiyon puanı yer
    if (this.actionsLeft < 0) this.actionsLeft = 0;

    const extractCards = (player, bankIds, propIds) => {
      const bank = [], props = [];
      bankIds.forEach(id => { const idx = player.bank.findIndex(c => c.id === id); if(idx !== -1) bank.push(player.bank.splice(idx,1)[0]); });
      propIds.forEach(id => {
        for (const col in player.properties) {
          const idx = player.properties[col].findIndex(c => c.id === id);
          if(idx !== -1) { props.push(player.properties[col].splice(idx,1)[0]); if(player.properties[col].length === 0) delete player.properties[col]; break; }
        }
      });
      return { bank, props };
    };

    const offerCards = extractCards(source, trade.offerBankIds, trade.offerPropIds);
    const requestCards = extractCards(target, trade.requestBankIds, trade.requestPropIds);

    target.bank.push(...offerCards.bank);
    offerCards.props.forEach(c => { const col = c.activeColor || c.color || 'wild'; if(!target.properties[col]) target.properties[col] = []; target.properties[col].push({...c, activeColor: col}); });
    source.bank.push(...requestCards.bank);
    requestCards.props.forEach(c => { const col = c.activeColor || c.color || 'wild'; if(!source.properties[col]) source.properties[col] = []; source.properties[col].push({...c, activeColor: col}); });

    this.addLog(`${source.name} ve ${target.name} takas yaptı! 🤝`, 'property');
    this.checkWin();
    return { ok: true };
  }

  buyScavengeCard(playerId, cardId) {
    if (!this.streetThugs) return { ok: false, error: 'Sokak Haydutları kapalı' };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { ok: false };
    
    const cardIdx = this.scavengeMarket.findIndex(c => c.id === cardId);
    if (cardIdx === -1) return { ok: false, error: 'Kart karaborsada yok' };
    
    const totalBank = player.bank.reduce((s, c) => s + c.value, 0);
    if (totalBank < 2) return { ok: false, error: 'Bankanda en az 2M olmalı (sadece nakit geçerlidir)' };
    
    let paid = 0;
    const bankCards = [...player.bank].sort((a,b) => a.value - b.value);
    const cardsToPay = [];
    for (const c of bankCards) {
        paid += c.value;
        cardsToPay.push(c);
        if (paid >= 2) break;
    }
    
    cardsToPay.forEach(c => {
        const idx = player.bank.findIndex(x => x.id === c.id);
        if (idx !== -1) this.discard.push(player.bank.splice(idx, 1)[0]);
    });
    
    const card = this.scavengeMarket.splice(cardIdx, 1)[0];
    player.hand.push(card);
    this.addLog(`${player.name}, Karaborsa'dan 2M ödeyerek çöpten kart aldı! 🕵️`, 'draw');
    return { ok: true };
  }

  rollGambleDice(playerId) {
    if (!this.gambleZari) return { ok: false, error: 'Kumarbazın Zarı kapalı' };
    if (this.currentPlayer.id !== playerId) return { ok: false, error: 'Sıra sende değil' };
    const player = this.currentPlayer;
    if (player.hasGambledThisTurn) return { ok: false, error: 'Bu tur zaten zar attın' };
    if (this.actionsLeft <= 0) return { ok: false, error: 'Aksiyon hakkın bitti' };
    if (this.hasBlockingState) return { ok: false, error: 'Önce bekleyen eylemleri çöz' };

    player.hasGambledThisTurn = true;
    this.actionsLeft -= 1;
    const roll = Math.floor(Math.random() * 6) + 1;
    
    if (roll <= 3) {
        if (player.hand.length > 0) {
            const randIdx = Math.floor(Math.random() * player.hand.length);
            const lost = player.hand.splice(randIdx, 1)[0];
            this.discard.push(lost);
            this.addLog(`${player.name} zar attı: 🎲 ${roll}. Kötü şans! Elinden rastgele "${lost.name}" uçup gitti.`, 'system');
        } else {
            this.addLog(`${player.name} zar attı: 🎲 ${roll}. Şanslı! Eli boş olduğu için bir şey kaybetmedi.`, 'system');
        }
    } else {
        const drawn = this.drawCards(2);
        player.hand.push(...drawn);
        this.addLog(`${player.name} zar attı: 🎲 ${roll}. Jackpot! Desteden 2 kart çekti.`, 'system');
    }
    
    if (this.actionsLeft === 0 && this.autoEndTurn) this.endTurn(playerId);
    else this.resetTurnTimer();
    
    return { ok: true, roll };
  }

  discardDown(playerId, cardIds) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { ok: false };
    player.isAFK = false;
    
    if (this.hasBlockingState) return { ok: false, error: 'Önce bekleyen ödeme/itirazları çöz' };
    const over = player.hand.length - this.handLimit;
    if (over <= 0) return { ok: true };
    if (cardIds.length !== over) return { ok: false, error: `${over} kart atmalısın` };

    cardIds.forEach(cid => {
      const idx = player.hand.findIndex(c => c.id === cid);
      if (idx !== -1) {
        const c = player.hand.splice(idx, 1)[0];
        if (this.streetThugs) this.scavengeMarket.push(c);
        else this.discard.push(c);
      }
    });
    this.addLog(`${player.name} ${over} kart attı`, 'draw');
    return { ok: true };
  }

  endTurn(playerId, data = {}) {
    if (this.currentPlayer.id !== playerId) return { ok: false, error: 'Sıra sende değil' };
    if (this.hasBlockingState) return { ok: false, error: 'Önce bekleyen ödeme/itirazları çöz' };
    const player = this.currentPlayer;

    if (player.hand.length > this.handLimit) {
      return { ok: false, error: `El limitini aşıyorsun (${player.hand.length}/${this.handLimit}). Kart at.`, needsDiscard: true };
    }

    if (data.isTimeout) {
      player.isAFK = true;
      this.addLog(`${player.name} süresi bittiği için turu otomatik geçti. 💤 (AFK)`, 'system');
    } else {
      player.isAFK = false;
    }

    player.hasGambledThisTurn = false;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.actionsLeft = 3;
    this.addLog(`--- Sıra ${this.currentPlayer.name} oyuncusuna geçti (Elde ${this.currentPlayer.hand.length} kart kaldı) ---`, 'system');
    this.resetTurnTimer(); // Yeni turda zamanlayıcıyı sıfırla
    this.drawForTurn();
    return { ok: true };
  }

  checkWin() {
    for (const player of this.players) {
      let completeSets = 0;
      Object.entries(player.properties).forEach(([color, cards]) => {
        if (this.isSetComplete(cards, color)) completeSets++;
      });
      if (completeSets >= this.winSets) {
        this.phase = 'ended';
        this.winner = player;
        this.addLog(`🏆 ${player.name} KAZANDI! 3 tam set tamamladı!`);
        return true;
      }
    }
    return false;
  }

  addLog(msg, type = 'info') {
    this.log.push({ msg, type, time: Date.now() });
    if (this.log.length > 80) this.log.shift(); // Maç Özeti için log limiti yükseltildi
  }

  getState(forPlayerId) {
    return {
      phase: this.phase,
      theme: this.theme,
      currentPlayerId: this.currentPlayer?.id,
      turnStartTime: this.turnStartTime,
      turnPausedRemaining: this.turnPausedRemaining,
      turnTimer: this.turnTimer,
      fastChallenge: this.fastChallenge,
      allowTrades: this.allowTrades,
      streetThugs: this.streetThugs,
      gambleZari: this.gambleZari,
      challengeStartTime: this.challengeStartTime,
      winSets: this.winSets,
      handLimit: this.handLimit,
      actionsLeft: this.actionsLeft,
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        handCount: p.hand.length,
        hand: (p.id === forPlayerId || this.openHands) ? p.hand : [],
        bank: p.bank,
        bankTotal: p.bank.reduce((s, c) => s + (c.value || 0), 0),
        properties: p.properties,
        buildings: p.buildings,
        connected: p.connected,
        isAFK: p.isAFK,
        hasGambledThisTurn: p.hasGambledThisTurn,
        hasJustSayNo: p.hand.some(c => c.action === 'justsayno'),
        stats: p.stats, // İstatistikleri istemciye gönder
      })),
      deckCount: this.deck.length,
      discard: this.discard.slice(-5), // Son 5 iskarta kartını gönder
      log: this.log, // Tümü (max 80) gönderilir
      scavengeMarket: this.scavengeMarket, // Karaborsa kartları
      // Bana ait bekleyen ödeme (varsa)
      myPendingPayment: this.pendingPayments.find(p => p.payerId === forPlayerId) || null,
      // Tüm bekleyen ödemeler (gözlem için - kimden kime)
      pendingPayments: this.pendingPayments.map(p => ({
        id: p.id,
        payerId: p.payerId,
        payerName: this.players.find(x => x.id === p.payerId)?.name,
        collectorId: p.collectorId,
        collectorName: this.players.find(x => x.id === p.collectorId)?.name,
        amount: p.amount,
        reason: p.reason,
      })),
      // Bana ait bekleyen itiraz (yanıt verme sırası bende olan)
      myPendingChallenge: this.pendingChallenges.find(c => c.responderId === forPlayerId) || null,
      pendingChallenges: this.pendingChallenges.map(c => ({
        id: c.id,
        action: c.action,
        sourceId: c.sourceId,
        sourceName: this.players.find(x => x.id === c.sourceId)?.name,
        targetId: c.targetId,
        targetName: this.players.find(x => x.id === c.targetId)?.name,
        responderId: c.responderId,
        responderName: this.players.find(x => x.id === c.responderId)?.name,
        cancelled: c.cancelled,
        data: c.data,
      })),
      // Takas İstekleri
      pendingTrades: this.pendingTrades.map(t => ({
        id: t.id,
        sourceId: t.sourceId,
        sourceName: this.players.find(x => x.id === t.sourceId)?.name,
        targetId: t.targetId,
        targetName: this.players.find(x => x.id === t.targetId)?.name,
        offerBankIds: t.offerBankIds,
        offerPropIds: t.offerPropIds,
        requestBankIds: t.requestBankIds,
        requestPropIds: t.requestPropIds
      }))
    };
  }
}

module.exports = MonopolyDealGame;
