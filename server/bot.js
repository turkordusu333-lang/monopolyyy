function handleBotAction(game) {
  if (game.phase !== 'playing') return;
  if (game.botThinking) return;

  const difficulty = game.botDifficulty || 'medium';

  // 1. Resolve pending challenges if responder is bot/AFK/offline
  if (game.pendingChallenges.length > 0) {
    const challenge = game.pendingChallenges[0];
    const responder = game.players.find(p => p.id === challenge.responderId);
    if (responder && (responder.isBot || responder.isAFK || !responder.connected)) {
      game.botThinking = true;
      setTimeout(() => {
        game.botThinking = false;
        
        // Check if responder has Just Say No
        const justSayNo = responder.hand.find(c => c.action === 'justsayno');
        let useJustSayNo = false;

        if (justSayNo) {
          if (difficulty === 'easy') {
            // Easy bot has a 30% chance of using Just Say No
            useJustSayNo = Math.random() < 0.3;
          } else if (difficulty === 'medium') {
            // Medium bot always uses it
            useJustSayNo = true;
          } else {
            // Hard bot uses it tactically
            if (challenge.action === 'dealbreaker') {
              useJustSayNo = true; // Always block deal breaker
            } else if (challenge.action === 'slydeal' || challenge.action === 'forceddeal') {
              // Block if they are stealing or swapping valuable properties
              useJustSayNo = Math.random() < 0.75;
            } else if (challenge.action === 'rent' && challenge.data && challenge.data.amount >= 4) {
              useJustSayNo = true; // Block high rents
            } else if (challenge.action === 'debtcollector' || challenge.action === 'birthday') {
              useJustSayNo = Math.random() < 0.5; // Cooldown/chance
            }
          }
        }

        game.respondToChallenge(responder.id, challenge.id, useJustSayNo);
        game.onEvent('stateChange');
        handleBotAction(game); // trigger next check
      }, 1500);
      return;
    }
    return; // Wait for human
  }

  // 2. Resolve pending payments if payer is bot/AFK/offline
  if (game.pendingPayments.length > 0) {
    const payment = game.pendingPayments[0];
    const payer = game.players.find(p => p.id === payment.payerId);
    if (payer && (payer.isBot || payer.isAFK || !payer.connected)) {
      game.botThinking = true;
      setTimeout(() => {
        game.botThinking = false;
        let amountPaid = 0;
        const bankCardIds = [];
        const propCardIds = [];
        
        // Pay from bank first (sorting by value ascending)
        const bankCards = [...payer.bank].sort((a, b) => (a.value || 0) - (b.value || 0));
        for (const card of bankCards) {
          if (amountPaid >= payment.amount) break;
          bankCardIds.push(card.id);
          amountPaid += (card.value || 0);
        }
        
        // Pay from properties if bank wasn't enough (sorting by value ascending, avoiding complete sets if possible)
        if (amountPaid < payment.amount) {
          const propSets = Object.entries(payer.properties);
          // Sort colors: incomplete sets first
          propSets.sort(([c1, cards1], [c2, cards2]) => {
            const comp1 = game.isSetComplete(cards1, c1) ? 1 : 0;
            const comp2 = game.isSetComplete(cards2, c2) ? 1 : 0;
            return comp1 - comp2;
          });

          for (const [color, cards] of propSets) {
            const sortedCards = [...cards].sort((a, b) => (a.value || 0) - (b.value || 0));
            for (const card of sortedCards) {
              if (amountPaid >= payment.amount) break;
              propCardIds.push(card.id);
              amountPaid += (card.value || 0);
            }
          }
        }
        
        game.submitPayment(payer.id, bankCardIds, propCardIds);
        game.onEvent('stateChange');
        handleBotAction(game);
      }, 2000);
      return;
    }
    return; // Wait for human
  }

  // 3. Resolve trades if target is bot/AFK/offline
  if (game.pendingTrades && game.pendingTrades.length > 0) {
    const trade = game.pendingTrades[0];
    const target = game.players.find(p => p.id === trade.targetId);
    if (target && (target.isBot || target.isAFK || !target.connected)) {
      game.botThinking = true;
      setTimeout(() => {
        game.botThinking = false;
        game.respondToTrade(target.id, trade.id, false); // bots decline trades
        game.onEvent('stateChange');
        handleBotAction(game);
      }, 1500);
      return;
    }
    return;
  }

  // 4. Play turn if it's bot/AFK/offline turn
  const player = game.currentPlayer;
  if (player && (player.isBot || player.isAFK || !player.connected)) {
    // If bot has no actions or no cards, end turn
    if (game.actionsLeft <= 0 || player.hand.length === 0) {
      game.botThinking = true;
      setTimeout(() => {
        game.botThinking = false;
        if (player.hand.length > game.handLimit) {
          // Discard lowest value cards
          const sortedHand = [...player.hand].sort((a, b) => (a.value || 0) - (b.value || 0));
          const toDiscard = player.hand.length - game.handLimit;
          const discardIds = sortedHand.slice(0, toDiscard).map(c => c.id);
          game.discardDown(player.id, discardIds);
        }
        game.endTurn(player.id);
        game.onEvent('stateChange');
        handleBotAction(game);
      }, 1500);
      return;
    }

    game.botThinking = true;
    setTimeout(() => {
      game.botThinking = false;
      let played = false;

      // EASY BOT LOGIC
      if (difficulty === 'easy') {
        // 45% chance to just pass and end turn
        if (Math.random() < 0.45) {
          game.actionsLeft = 0;
          game.onEvent('stateChange');
          handleBotAction(game);
          return;
        }

        // Pick a random playable card
        const playable = player.hand.filter(c => c.action !== 'justsayno' && c.action !== 'doublerent');
        if (playable.length > 0) {
          const card = playable[Math.floor(Math.random() * playable.length)];
          if (card.type === 'property') {
            const color = card.isWild ? (card.isFullWild ? 'blue' : card.colors[0]) : card.color;
            const res = game.playCard(player.id, card.id, { color });
            if (res.ok) played = true;
          } else if (card.type === 'money') {
            const res = game.playCard(player.id, card.id, { asBankMoney: true });
            if (res.ok) played = true;
          } else if (card.type === 'action') {
            const res = game.playCard(player.id, card.id, { asBankMoney: true }); // easy bot plays actions as money
            if (res.ok) played = true;
          }
        }
      }

      // MEDIUM BOT LOGIC
      if (difficulty === 'medium' && !played) {
        // Prioritize money and properties
        const moneyCard = player.hand.find(c => c.type === 'money');
        if (moneyCard) {
          const res = game.playCard(player.id, moneyCard.id, { asBankMoney: true });
          if (res.ok) played = true;
        }
        
        if (!played) {
          const propCard = player.hand.find(c => c.type === 'property');
          if (propCard) {
            let color = propCard.color;
            if (propCard.isWild) {
              color = propCard.isFullWild ? 'blue' : propCard.colors[0];
            }
            const res = game.playCard(player.id, propCard.id, { color });
            if (res.ok) played = true;
          }
        }

        if (!played) {
          // Try action card as money
          const actionCard = player.hand.find(c => c.type === 'action' && c.value > 0);
          if (actionCard) {
            const res = game.playCard(player.id, actionCard.id, { asBankMoney: true });
            if (res.ok) played = true;
          }
        }
      }

      // HARD BOT LOGIC (Tactical & Aggressive)
      if (difficulty === 'hard' && !played) {
        // 1. Pass & Go (Tekrar Çek)
        const passGo = player.hand.find(c => c.action === 'passgo');
        if (passGo) {
          const res = game.playCard(player.id, passGo.id);
          if (res.ok) played = true;
        }

        // 2. Deal Breaker (Haciz)
        if (!played) {
          const dealbreaker = player.hand.find(c => c.action === 'dealbreaker');
          if (dealbreaker) {
            // Find an opponent with a complete set
            let targetPlayer = null;
            let targetColor = null;
            for (const opp of game.players.filter(p => p.id !== player.id)) {
              for (const [col, cards] of Object.entries(opp.properties)) {
                if (game.isSetComplete(cards, col)) {
                  targetPlayer = opp;
                  targetColor = col;
                  break;
                }
              }
              if (targetPlayer) break;
            }

            if (targetPlayer && targetColor) {
              const res = game.playCard(player.id, dealbreaker.id, { targetId: targetPlayer.id, targetColor });
              if (res.ok) played = true;
            }
          }
        }

        // 3. Sly Deal (Tapu Devri)
        if (!played) {
          const slydeal = player.hand.find(c => c.action === 'slydeal');
          if (slydeal) {
            // Find an opponent with a single property card (not part of complete set)
            let targetPlayer = null;
            let targetColor = null;
            let targetCardId = null;
            for (const opp of game.players.filter(p => p.id !== player.id)) {
              for (const [col, cards] of Object.entries(opp.properties)) {
                if (!game.isSetComplete(cards, col) && cards.length > 0) {
                  targetPlayer = opp;
                  targetColor = col;
                  targetCardId = cards[0].id;
                  break;
                }
              }
              if (targetPlayer) break;
            }

            if (targetPlayer && targetColor && targetCardId) {
              const res = game.playCard(player.id, slydeal.id, { targetId: targetPlayer.id, targetColor, targetCardId });
              if (res.ok) played = true;
            }
          }
        }

        // 4. Building (Ev/Otel)
        if (!played) {
          const hotel = player.hand.find(c => c.action === 'hotel');
          const house = player.hand.find(c => c.action === 'house');
          
          if (hotel || house) {
            // Find a complete set of properties that we own (no railroad/utility)
            let targetColor = null;
            for (const [col, cards] of Object.entries(player.properties)) {
              if (col !== 'railroad' && col !== 'utility' && game.isSetComplete(cards, col)) {
                const b = player.buildings[col] || { houses: 0, hotel: false };
                if (hotel && b.houses >= 1 && !b.hotel) {
                  targetColor = col;
                  const res = game.playCard(player.id, hotel.id, { color: targetColor });
                  if (res.ok) { played = true; break; }
                } else if (house && b.houses === 0) {
                  targetColor = col;
                  const res = game.playCard(player.id, house.id, { color: targetColor });
                  if (res.ok) { played = true; break; }
                }
              }
            }
          }
        }

        // 5. Play properties to build sets
        if (!played) {
          const propCard = player.hand.find(c => c.type === 'property');
          if (propCard) {
            let color = propCard.color;
            if (propCard.isWild) {
              // Place wildcard where we already have cards
              const myColors = Object.keys(player.properties);
              const matchingColor = propCard.colors.find(c => myColors.includes(c));
              color = matchingColor || (propCard.isFullWild ? 'blue' : propCard.colors[0]);
            }
            const res = game.playCard(player.id, propCard.id, { color });
            if (res.ok) played = true;
          }
        }

        // 6. Play Rent (Kira)
        if (!played) {
          const rentCard = player.hand.find(c => c.action === 'rent');
          if (rentCard) {
            // Find a color that matches this rent card that we own
            let rentColor = null;
            if (rentCard.colors === 'all') {
              // Rent all: pick color with highest rent value
              let bestVal = 0;
              for (const [col, cards] of Object.entries(player.properties)) {
                if (cards.length > 0) {
                  const val = game.calculateRent(player, col);
                  if (val > bestVal) { bestVal = val; rentColor = col; }
                }
              }
            } else {
              // Dual rent card: pick color we own
              rentColor = rentCard.colors.find(col => player.properties[col]?.length > 0);
            }

            if (rentColor) {
              let options = { color: rentColor };
              if (rentCard.colors === 'all') {
                // Find opponent with highest assets
                const opps = game.players.filter(p => p.id !== player.id);
                opps.sort((a, b) => b.bankTotal - a.bankTotal);
                if (opps.length > 0) options.targetId = opps[0].id;
              }
              
              // Double rent combo if we have doublerent in hand
              const doubleRent = player.hand.find(c => c.action === 'doublerent');
              if (doubleRent && game.actionsLeft >= 2) {
                options.doubleRentCardId = doubleRent.id;
              }

              const res = game.playCard(player.id, rentCard.id, options);
              if (res.ok) played = true;
            }
          }
        }

        // 7. Play Debt Collector (Tahsilat)
        if (!played) {
          const debtcollector = player.hand.find(c => c.action === 'debtcollector');
          if (debtcollector) {
            const opps = game.players.filter(p => p.id !== player.id);
            opps.sort((a, b) => b.bankTotal - a.bankTotal);
            if (opps.length > 0) {
              const res = game.playCard(player.id, debtcollector.id, { targetId: opps[0].id });
              if (res.ok) played = true;
            }
          }
        }

        // 8. Play Birthday (Doğum Günü)
        if (!played) {
          const birthday = player.hand.find(c => c.action === 'birthday');
          if (birthday) {
            const res = game.playCard(player.id, birthday.id);
            if (res.ok) played = true;
          }
        }

        // 8.5. Play Thief Squirrel (Hırsız Sincap)
        if (!played) {
          const squirrel = player.hand.find(c => c.action === 'thief_squirrel');
          if (squirrel) {
            const opps = game.players.filter(p => p.id !== player.id && p.hand.length > 0);
            opps.sort((a, b) => b.hand.length - a.hand.length);
            if (opps.length > 0) {
              const res = game.playCard(player.id, squirrel.id, { targetId: opps[0].id });
              if (res.ok) played = true;
            }
          }
        }

        // 9. Deposit Money
        if (!played) {
          const moneyCard = player.hand.find(c => c.type === 'money');
          if (moneyCard) {
            const res = game.playCard(player.id, moneyCard.id, { asBankMoney: true });
            if (res.ok) played = true;
          }
        }

        // 10. Deposit Action as Money
        if (!played) {
          const actionCard = player.hand.find(c => c.type === 'action' && c.value > 0);
          if (actionCard) {
            const res = game.playCard(player.id, actionCard.id, { asBankMoney: true });
            if (res.ok) played = true;
          }
        }
      }

      // If no valid actions could be played, force end of turn
      if (!played) {
        game.actionsLeft = 0; // force end turn
      }

      game.onEvent('stateChange');
      handleBotAction(game);
    }, 1500);
  }
}

module.exports = { handleBotAction };
