import { Card, GamePlayer, MatchState, CardColor } from '../types';
import { MAX_IN_SET, RENT_VALUES } from './deck';

/**
 * Heuristics-based AI Decision Engine for Monopoly Deal Bot
 * Expanded with difficulty settings and bot strategy personalities.
 */
export class BotEngine {
  /**
   * Helper to calculate rent value of a color set for a player
   */
  static getRentValue(player: GamePlayer, color: CardColor): number {
    const set = player.properties[color];
    if (!set || set.cards.length === 0) return 0;
    const count = Math.min(set.cards.length, MAX_IN_SET[color]);
    let val = RENT_VALUES[color]?.[count - 1] || 1;
    if (set.hasHouse) val += 3;
    if (set.hasHotel) val += 4;
    return val;
  }

  /**
   * Decide what action to take when it's the bot's turn to play.
   * Bot plays up to 3 cards. It chooses card-by-card.
   */
  static selectPlayAction(
    botPlayer: GamePlayer,
    matchState: MatchState
  ): { cardId: string; targetZone: 'bank' | 'property' | 'action'; extraColor?: CardColor; payload?: any } | null {
    if (botPlayer.hand.length === 0) return null;

    const personality = botPlayer.botPersonality || 'strategic';
    const difficulty = botPlayer.difficulty || 'medium';

    // Easy mode: 50% chance to end turn early if already played 1+ cards
    if (difficulty === 'easy' && matchState.actionsPlayedThisTurn >= 1 && Math.random() < 0.5) {
      return null;
    }

    // Easy mode: 25% chance to make a completely random legal move
    if (difficulty === 'easy' && Math.random() < 0.25) {
      const randomCard = botPlayer.hand[Math.floor(Math.random() * botPlayer.hand.length)];
      if (randomCard.type === 'property' || randomCard.type === 'wildcard') {
        const col = randomCard.color || 'brown';
        return { cardId: randomCard.id, targetZone: 'property', extraColor: col };
      } else if (randomCard.type === 'money') {
        return { cardId: randomCard.id, targetZone: 'bank' };
      } else if (randomCard.type === 'action' && randomCard.actionType === 'pass-go') {
        return { cardId: randomCard.id, targetZone: 'action' };
      }
    }

    const otherPlayers = matchState.players.filter((p) => p.id !== botPlayer.id);
    const propertiesInHand = botPlayer.hand.filter((c) => c.type === 'property' || c.type === 'wildcard');
    const houseHotels = botPlayer.hand.filter((c) => c.type === 'house-hotel');
    const actionCards = botPlayer.hand.filter((c) => c.type === 'action' || c.type === 'rent');
    const moneyCards = botPlayer.hand.filter((c) => c.type === 'money');

    if (personality === 'aggressive') {
      // 1. Actions / Steals
      const act = this.decideActionCard(botPlayer, matchState, actionCards, otherPlayers, difficulty);
      if (act) return act;

      // 2. Properties
      const prop = this.decidePropertyCard(botPlayer, propertiesInHand);
      if (prop) return prop;

      // 3. House/Hotel
      const hh = this.decideHouseHotel(botPlayer, houseHotels);
      if (hh) return hh;

      // 4. Money
      const mon = this.decideMoneyCard(moneyCards);
      if (mon) return mon;
    } else if (personality === 'banker') {
      // 1. Money
      const mon = this.decideMoneyCard(moneyCards);
      if (mon) return mon;

      // 2. Bank low-value actions as money
      if (botPlayer.hand.length > 3) {
        const lowValAction = actionCards.find((c) => c.actionType !== 'just-say-no');
        if (lowValAction) {
          return { cardId: lowValAction.id, targetZone: 'bank' };
        }
      }

      // 3. Properties
      const prop = this.decidePropertyCard(botPlayer, propertiesInHand);
      if (prop) return prop;

      // 4. Actions
      const act = this.decideActionCard(botPlayer, matchState, actionCards, otherPlayers, difficulty);
      if (act) return act;
    } else {
      // Strategic / Default
      // 1. Properties
      const prop = this.decidePropertyCard(botPlayer, propertiesInHand);
      if (prop) return prop;

      // 2. House/Hotel
      const hh = this.decideHouseHotel(botPlayer, houseHotels);
      if (hh) return hh;

      // 3. Actions
      const act = this.decideActionCard(botPlayer, matchState, actionCards, otherPlayers, difficulty);
      if (act) return act;

      // 4. Money
      const mon = this.decideMoneyCard(moneyCards);
      if (mon) return mon;
    }

    // Fallback: if hand is too full, bank an action card as money
    if (botPlayer.hand.length > 5) {
      const lowValueAction = actionCards.find((c) => c.actionType !== 'just-say-no');
      if (lowValueAction) {
        return { cardId: lowValueAction.id, targetZone: 'bank' };
      }
    }

    return null;
  }

  static decidePropertyCard(
    botPlayer: GamePlayer,
    propertiesInHand: Card[]
  ): { cardId: string; targetZone: 'bank' | 'property' | 'action'; extraColor?: CardColor } | null {
    const props = propertiesInHand.filter((c) => c.type === 'property');
    if (props.length > 0) {
      const chosenProp = props[0];
      if (chosenProp.color) {
        return { cardId: chosenProp.id, targetZone: 'property' };
      }
    }

    const wildcards = propertiesInHand.filter((c) => c.type === 'wildcard');
    if (wildcards.length > 0) {
      const wild = wildcards[0];
      let targetColor: CardColor = wild.color || 'brown';
      if (wild.secondaryColor && botPlayer.properties[wild.secondaryColor]) {
        targetColor = wild.secondaryColor;
      } else if (wild.color && botPlayer.properties[wild.color]) {
        targetColor = wild.color;
      } else {
        targetColor = wild.color || wild.secondaryColor || (wild.allowedColors && wild.allowedColors.length > 0 ? wild.allowedColors[0] as CardColor : 'brown');
      }
      return { cardId: wild.id, targetZone: 'property', extraColor: targetColor };
    }
    return null;
  }

  static decideHouseHotel(
    botPlayer: GamePlayer,
    houseHotels: Card[]
  ): { cardId: string; targetZone: 'bank' | 'property' | 'action'; extraColor?: CardColor } | null {
    if (houseHotels.length > 0) {
      const hh = houseHotels[0];
      for (const colorKey in botPlayer.properties) {
        const color = colorKey as CardColor;
        const propSet = botPlayer.properties[color];
        if (propSet && propSet.cards.length >= MAX_IN_SET[color]) {
          if (hh.actionType === 'house' && !propSet.hasHouse && !propSet.hasHotel) {
            return { cardId: hh.id, targetZone: 'property', extraColor: color };
          }
          if (hh.actionType === 'hotel' && propSet.hasHouse && !propSet.hasHotel) {
            return { cardId: hh.id, targetZone: 'property', extraColor: color };
          }
        }
      }
    }
    return null;
  }

  static decideMoneyCard(
    moneyCards: Card[]
  ): { cardId: string; targetZone: 'bank' | 'property' | 'action' } | null {
    if (moneyCards.length > 0) {
      const bestMoney = moneyCards.sort((a, b) => b.value - a.value)[0];
      return { cardId: bestMoney.id, targetZone: 'bank' };
    }
    return null;
  }

  static decideActionCard(
    botPlayer: GamePlayer,
    matchState: MatchState,
    actionCards: Card[],
    otherPlayers: GamePlayer[],
    difficulty: string
  ): { cardId: string; targetZone: 'bank' | 'property' | 'action'; extraColor?: CardColor; payload?: any } | null {
    if (actionCards.length === 0 || otherPlayers.length === 0) return null;

    // 1. Deal Breaker
    const dealBreaker = actionCards.find((c) => c.actionType === 'deal-breaker');
    if (dealBreaker) {
      let bestTargetPlayer: GamePlayer | null = null;
      let bestColor: CardColor | null = null;
      let highestVal = 0;

      otherPlayers.forEach((op) => {
        Object.keys(op.properties).forEach((colorKey) => {
          const col = colorKey as CardColor;
          const propSet = op.properties[col];
          if (propSet && propSet.cards.length === MAX_IN_SET[col]) {
            const setVal = propSet.cards.reduce((sum, c) => sum + c.value, 0);
            if (setVal > highestVal) {
              highestVal = setVal;
              bestTargetPlayer = op;
              bestColor = col;
            }
          }
        });
      });

      if (bestTargetPlayer && bestColor) {
        return {
          cardId: dealBreaker.id,
          targetZone: 'action',
          payload: { targetPlayerId: (bestTargetPlayer as GamePlayer).id, targetColor: bestColor }
        };
      }
    }

    // 2. Sly Deal
    const slyDeal = actionCards.find((c) => c.actionType === 'sly-deal');
    if (slyDeal) {
      let bestTargetPlayer: GamePlayer | null = null;
      let bestCardToSteal: Card | null = null;
      let highestCardVal = 0;

      if (difficulty === 'easy') {
        // Random selection for easy difficulty
        const randomOp = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        const opPropSets = Object.values(randomOp.properties).filter((set) => set && set.cards.length > 0);
        if (opPropSets.length > 0) {
          const randomSet = opPropSets[Math.floor(Math.random() * opPropSets.length)];
          if (randomSet && randomSet.cards.length > 0) {
            bestTargetPlayer = randomOp;
            bestCardToSteal = randomSet.cards[0];
          }
        }
      } else {
        // Smart selection for medium/hard
        otherPlayers.forEach((op) => {
          Object.keys(op.properties).forEach((colorKey) => {
            const col = colorKey as CardColor;
            const propSet = op.properties[col];
            if (propSet && propSet.cards.length > 0 && propSet.cards.length < MAX_IN_SET[col]) {
              propSet.cards.forEach((c) => {
                if (c.value > highestCardVal) {
                  highestCardVal = c.value;
                  bestTargetPlayer = op;
                  bestCardToSteal = c;
                }
              });
            }
          });
        });
      }

      if (bestTargetPlayer && bestCardToSteal) {
        return {
          cardId: slyDeal.id,
          targetZone: 'action',
          payload: { targetPlayerId: (bestTargetPlayer as GamePlayer).id, targetCardId: (bestCardToSteal as Card).id }
        };
      }
    }

    // 3. Forced Deal
    const forcedDeal = actionCards.find((c) => c.actionType === 'forced-deal');
    if (forcedDeal) {
      let myCardToGive: Card | null = null;
      let lowestMyVal = 999;

      Object.keys(botPlayer.properties).forEach((colorKey) => {
        const col = colorKey as CardColor;
        const propSet = botPlayer.properties[col];
        if (propSet && propSet.cards.length > 0 && propSet.cards.length < MAX_IN_SET[col]) {
          propSet.cards.forEach((c) => {
            if (c.value < lowestMyVal) {
              lowestMyVal = c.value;
              myCardToGive = c;
            }
          });
        }
      });

      if (myCardToGive) {
        let opTargetPlayer: GamePlayer | null = null;
        let opCardToSteal: Card | null = null;
        let highestOpVal = 0;

        if (difficulty === 'easy') {
          const randomOp = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          const opPropSets = Object.values(randomOp.properties).filter((set) => set && set.cards.length > 0);
          if (opPropSets.length > 0) {
            const randomSet = opPropSets[Math.floor(Math.random() * opPropSets.length)];
            if (randomSet && randomSet.cards.length > 0) {
              opTargetPlayer = randomOp;
              opCardToSteal = randomSet.cards[0];
            }
          }
        } else {
          otherPlayers.forEach((op) => {
            Object.keys(op.properties).forEach((colorKey) => {
              const col = colorKey as CardColor;
              const propSet = op.properties[col];
              if (propSet && propSet.cards.length > 0 && propSet.cards.length < MAX_IN_SET[col]) {
                propSet.cards.forEach((c) => {
                  if (c.value > highestOpVal) {
                    highestOpVal = c.value;
                    opTargetPlayer = op;
                    opCardToSteal = c;
                  }
                });
              }
            });
          });
        }

        if (opTargetPlayer && opCardToSteal && (difficulty === 'easy' || highestOpVal >= lowestMyVal)) {
          return {
            cardId: forcedDeal.id,
            targetZone: 'action',
            payload: {
              targetPlayerId: (opTargetPlayer as GamePlayer).id,
              targetCardId: (opCardToSteal as Card).id,
              myCardId: (myCardToGive as Card).id
            }
          };
        }
      }
    }

    // 4. Pass Go (Always draw cards)
    const passGo = actionCards.find((c) => c.actionType === 'pass-go');
    if (passGo) {
      return { cardId: passGo.id, targetZone: 'action' };
    }

    // 5. Birthday
    const birthday = actionCards.find((c) => c.actionType === 'birthday');
    if (birthday) {
      return { cardId: birthday.id, targetZone: 'action' };
    }

    // 6. Debt Collector
    const debtCollector = actionCards.find((c) => c.actionType === 'debt-collector');
    if (debtCollector) {
      let targetOp = otherPlayers[0];
      if (difficulty === 'easy') {
        targetOp = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      } else {
        targetOp = otherPlayers.reduce((best, current) => {
          const bestVal = best.bank.reduce((sum, c) => sum + c.value, 0) + Object.values(best.properties).reduce((sum: number, set: any) => sum + (set?.cards?.reduce((s: number, card: Card) => s + card.value, 0) || 0), 0);
          const currentVal = current.bank.reduce((sum, c) => sum + c.value, 0) + Object.values(current.properties).reduce((sum: number, set: any) => sum + (set?.cards?.reduce((s: number, card: Card) => s + card.value, 0) || 0), 0);
          return currentVal > bestVal ? current : best;
        }, otherPlayers[0]);
      }

      return {
        cardId: debtCollector.id,
        targetZone: 'action',
        payload: { targetPlayerId: targetOp.id }
      };
    }

    // 7. Rent Cards
    const rentCards = actionCards.filter((c) => c.type === 'rent');
    if (rentCards.length > 0) {
      for (const card of rentCards) {
        const isMultiRent = card.name.includes('Her Renk') || !card.color;
        if (isMultiRent) {
          let bestColor: CardColor | null = null;
          let highestRent = 0;

          Object.keys(botPlayer.properties).forEach((colorKey) => {
            const col = colorKey as CardColor;
            const rentVal = this.getRentValue(botPlayer, col);
            if (rentVal > highestRent) {
              highestRent = rentVal;
              bestColor = col;
            }
          });

          if (bestColor) {
            const hasDoubleRent = botPlayer.hand.some((c) => c.actionType === 'double-rent');
            return {
              cardId: card.id,
              targetZone: 'action',
              extraColor: bestColor,
              payload: hasDoubleRent ? { isDoubleRent: true } : undefined
            };
          }
        } else {
          const colorsToCheck: CardColor[] = [];
          if (card.color) colorsToCheck.push(card.color);
          if (card.secondaryColor) colorsToCheck.push(card.secondaryColor);
          if (card.allowedColors) {
            card.allowedColors.forEach((col) => colorsToCheck.push(col as CardColor));
          }

          let bestColor: CardColor | null = null;
          let highestRent = 0;

          colorsToCheck.forEach((col) => {
            const rentVal = this.getRentValue(botPlayer, col);
            if (rentVal > highestRent) {
              highestRent = rentVal;
              bestColor = col;
            }
          });

          if (bestColor) {
            const hasDoubleRent = botPlayer.hand.some((c) => c.actionType === 'double-rent');
            return {
              cardId: card.id,
              targetZone: 'action',
              extraColor: bestColor,
              payload: hasDoubleRent ? { isDoubleRent: true } : undefined
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Decide how the bot will pay a rent or demand of `amountDue` millions.
   * Returns a list of card IDs to pay with.
   */
  static selectPayment(botPlayer: GamePlayer, amountDue: number): string[] {
    const selectedIds: string[] = [];
    let accumulated = 0;

    // List of all items available to pay with (sorted by value ascending to pay with cheapest first)
    // We prefer money in the bank first
    const bankCards = [...botPlayer.bank].sort((a, b) => a.value - b.value);
    
    for (const card of bankCards) {
      if (accumulated >= amountDue) break;
      selectedIds.push(card.id);
      accumulated += card.value;
    }

    // If bank is not enough, select properties (starting with single properties, avoiding completed sets)
    if (accumulated < amountDue) {
      const singleProperties: Card[] = [];
      const completedSetProperties: Card[] = [];

      for (const colorKey in botPlayer.properties) {
        const color = colorKey as CardColor;
        const propSet = botPlayer.properties[color];
        if (!propSet) continue;

        const isCompleted = propSet.cards.length >= MAX_IN_SET[color];
        if (isCompleted) {
          completedSetProperties.push(...propSet.cards);
        } else {
          singleProperties.push(...propSet.cards);
        }
      }

      // Sort properties by value ascending
      singleProperties.sort((a, b) => a.value - b.value);
      completedSetProperties.sort((a, b) => a.value - b.value);

      // Add single properties
      for (const card of singleProperties) {
        if (accumulated >= amountDue) break;
        selectedIds.push(card.id);
        accumulated += card.value;
      }

      // Add completed set properties if still needed
      for (const card of completedSetProperties) {
        if (accumulated >= amountDue) break;
        selectedIds.push(card.id);
        accumulated += card.value;
      }
    }

    return selectedIds;
  }

  /**
   * Decide if the bot should use Just Say No to counter an action card.
   */
  static shouldPlayJustSayNo(botPlayer: GamePlayer): boolean {
    const hasJsn = botPlayer.hand.some((c) => c.actionType === 'just-say-no');
    if (!hasJsn) return false;

    const difficulty = botPlayer.difficulty || 'medium';
    const personality = botPlayer.botPersonality || 'strategic';

    let chance = 0.85; // Medium default
    if (difficulty === 'easy') chance = 0.50;
    if (difficulty === 'hard') chance = 0.95;
    if (personality === 'aggressive') chance = Math.max(chance, 0.95);
    if (personality === 'banker') chance = Math.max(chance, 0.85);

    return Math.random() < chance;
  }

  /**
   * Choose which card to discard when hand size exceeds 7.
   */
  static selectDiscardCard(botPlayer: GamePlayer): string | null {
    if (botPlayer.hand.length <= 7) return null;

    // Discard lowest value card, prioritizing simple money cards or redundant action cards
    const sorted = [...botPlayer.hand].sort((a, b) => {
      // Prioritize keeping Just Say No and high value cards
      if (a.actionType === 'just-say-no') return 1;
      if (b.actionType === 'just-say-no') return -1;
      if (a.type === 'property' && b.type !== 'property') return 1;
      if (b.type === 'property' && a.type !== 'property') return -1;
      return a.value - b.value;
    });

    return sorted[0]?.id || null;
  }
}
