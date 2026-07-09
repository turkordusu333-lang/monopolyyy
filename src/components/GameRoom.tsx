import React from 'react';
import { Card, GamePlayer, MatchState, CardColor, UserProfile, GameLog } from '../types';
import { generateDeck, shuffleDeck, checkWinner, COLOR_LABELS, COLOR_HEX, MAX_IN_SET, RENT_VALUES } from '../lib/deck';
import { BotEngine } from '../lib/BotEngine';
import { sounds } from '../lib/SoundSystem';
import { GameCard, TURKISH_NAMES } from './GameCard';
import { motion, AnimatePresence } from 'motion/react';
import { AvatarWithFrame } from './AvatarWithFrame';

interface Props {
  roomId: string;
  isOffline: boolean;
  profile: UserProfile;
  onLeaveRoom: () => void;
  onUpdateProfile: (updated: UserProfile) => void;
}

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

export const GameRoom: React.FC<Props> = ({ roomId, isOffline, profile, onLeaveRoom, onUpdateProfile }) => {
  const [match, setMatch] = React.useState<MatchState | null>(null);
  const matchRef = React.useRef<MatchState | null>(null);
  React.useEffect(() => {
    matchRef.current = match;
  }, [match]);

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
  const [paymentSelection, setPaymentSelection] = React.useState<string[]>([]);
  const [voiceMuted, setVoiceMuted] = React.useState(false);
  const [speakingList, setSpeakingList] = React.useState<string[]>([]);
  
  // Interaction targets
  const [pendingSlyDeal, setPendingSlyDeal] = React.useState<Card | null>(null);
  
  // Step-by-step Action target selector states
  const [activeActionCard, setActiveActionCard] = React.useState<Card | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = React.useState<string | null>(null);
  const [selectedStolenCardId, setSelectedStolenCardId] = React.useState<string | null>(null);
  const [selectedStolenColor, setSelectedStolenColor] = React.useState<CardColor | null>(null);
  const [selectedMyCardId, setSelectedMyCardId] = React.useState<string | null>(null);
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

  // Layout & Adaptive Mobile States
  const [isHandExpanded, setIsHandExpanded] = React.useState(true);
  const [showChatPanel, setShowChatPanel] = React.useState(true);
  const [showChatOverlay, setShowChatOverlay] = React.useState(false);
  const [isCompactLayout, setIsCompactLayout] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : true);
  const [timeLeft, setTimeLeft] = React.useState(30);
  const [managedSetColor, setManagedSetColor] = React.useState<CardColor | null>(null);
  const [showHint, setShowHint] = React.useState(false);
  const [showBankVaultModal, setShowBankVaultModal] = React.useState(false);
  const [showOpponentAssetsModal, setShowOpponentAssetsModal] = React.useState(false);
  const [assetsOpponentId, setAssetsOpponentId] = React.useState<string | null>(null);
  const [focusedCard, setFocusedCard] = React.useState<Card | null>(null);
  const [focusedCardZoom, setFocusedCardZoom] = React.useState<number>(1.5);

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
      title,
      message,
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

  // Turn Timer Countdown Effect
  React.useEffect(() => {
    if (match && match.status === 'playing') {
      setTimeLeft(30);
    }
  }, [match?.turnIndex, match?.status]);

  React.useEffect(() => {
    if (match && match.status === 'playing') {
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
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [match?.turnIndex, match?.status, match?.activeActionRequest, activeActionCard]);

  // Log-monitoring Effect to show Toasts/Banners and trigger 3D custom particle animations
  React.useEffect(() => {
    if (!match || !match.logs) return;

    const newLogs = match.logs.filter((log: any) => !processedLogsRef.current.has(log.id));
    if (newLogs.length === 0) return;

    newLogs.forEach((log: any) => {
      processedLogsRef.current.add(log.id);
      const text = log.message;

      // Add a dynamic slide-in notification
      let notifType: 'action' | 'property' | 'rent' | 'money' | 'other' = 'other';
      const lowercaseMsg = text.toLowerCase();
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
      if (text.includes('Bugün Benim Doğum Günüm') || text.includes('doğum günü')) {
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
      else if (text.includes('borç tahsilatı') || text.includes('Borç Tahsildarı') || text.includes('tahsilat')) {
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
      else if (text.includes('sinsi anlaşma') || text.includes('Sinsi Anlaşma')) {
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
      else if (text.includes('Anlaşma Bozan') || text.includes('bozan')) {
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
      }
      // Detect "Zoraki Takas" play
      else if (text.includes('Zoraki Takas') || text.includes('forced-deal')) {
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
      else if (text.includes('Hayır Teşekkürler') || text.includes('savunma') || text.includes('Savunma') || text.includes('JSN') || text.includes('jsn')) {
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
      }
    });
  }, [match?.logs?.length, match?.players]);

  // Clear payment selection when active action request changes
  React.useEffect(() => {
    setPaymentSelection([]);
  }, [match?.activeActionRequest?.id]);

  const socketRef = React.useRef<WebSocket | null>(null);

  // --- AUDIO SYNTHESIS INTEGRATION ---
  const playDrawSound = () => sounds.playDraw(profile.settings);
  const playPlaySound = () => sounds.playPlay(profile.settings);
  const playCoinSound = () => sounds.playCoin(profile.settings);
  const playActionSound = () => sounds.playAction(profile.settings);
  const playStealSound = () => sounds.playSteal(profile.settings);
  const playJsnSound = () => sounds.playJustSayNo(profile.settings);
  const playAlertSound = () => sounds.playAlert(profile.settings);

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
            // Play corresponding trigger sound effects based on last log messages
            const logs = data.matchState.logs as GameLog[];
            if (logs.length > 0) {
              const lastLog = logs[logs.length - 1].message;
              if (lastLog.includes('çekti')) playDrawSound();
              else if (lastLog.includes('bankaya')) playCoinSound();
              else if (lastLog.includes('yerleştirdi')) playPlaySound();
              else if (lastLog.includes('aksiyon') || lastLog.includes('başladı')) playActionSound();
              else if (lastLog.includes('çaldı')) playStealSound();
              else if (lastLog.includes('Hayır Teşekkürler')) playJsnSound();
            }
          } else if (data.type === 'voice_update') {
            const speaking = data.players.filter((p: any) => p.isSpeaking).map((p: any) => p.id);
            setSpeakingList(speaking);
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
      const colorToUse = card.color || extraColor || 'brown';

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
      playPlaySound();

      // Check win
      if (checkWinner(updatedPlayer.properties)) {
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
      playActionSound();

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
        // Collect 2M from bot
        const bot = match.players.find((p) => p.isBot);
        if (bot) {
          const payments = BotEngine.selectPayment(bot, 2);
          transferOfflinePayment(bot.id, activePlayer.id, payments);
          payments.forEach((cardId) => triggerCardEffect(cardId, 'gold'));
          showActionToast(
            'info',
            '🎂 Doğum Günü Kutlaması!',
            `${activePlayer.username} bir doğum günü partisi verdi! ${bot.username} ona 2M ödedi!`,
            bot
          );
        }
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
        const bot = match.players.find((p) => p.isBot);
        const set = updatedPlayer.properties[chosenColor];
        if (set && set.cards.length > 0 && bot) {
          const baseCount = Math.min(set.cards.length, MAX_IN_SET[chosenColor]);
          let rentVal = set.cards[0].rentValues?.[baseCount - 1] || 1;
          if (set.hasHouse) rentVal += 3;
          if (set.hasHotel) rentVal += 4;

          if (payload?.isDoubleRent) {
            rentVal *= 2;
          }

          const payments = BotEngine.selectPayment(bot, rentVal);
          transferOfflinePayment(bot.id, activePlayer.id, payments);
          payments.forEach((cardId) => triggerCardEffect(cardId, 'gold'));
          showActionToast(
            'rent',
            '💰 Kira Tahsilatı!',
            `${activePlayer.username}, ${bot.username} adlı oyuncudan ${COLOR_LABELS[chosenColor]} mülkleri için ${rentVal}M kira aldı!`,
            bot
          );
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

      const decision = BotEngine.selectPlayAction(currentBot, activeMatch);
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
        setTimeout(playNextBotAction, 1800);

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

        if (checkWinner(currentBot.properties)) {
          handleOfflineWinner(currentBot.id);
          return;
        }

        updateMatchState({ ...activeMatch });
        botActionsPlayedRef.current++;
        setTimeout(playNextBotAction, 1800);

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
          setTimeout(playNextBotAction, 1800);

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
              setTimeout(playNextBotAction, 2000);
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
              setTimeout(playNextBotAction, 2000);
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
              setTimeout(playNextBotAction, 2000);
            }
          }
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;
        } else {
          updateMatchState({ ...activeMatch });
          botActionsPlayedRef.current++;
          setTimeout(playNextBotAction, 1500);
        }
      }
    };

    const endBotTurn = () => {
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

      // End Bot Turn & Return to Human
      activeMatch.turnIndex = 0;
      activeMatch.actionsPlayedThisTurn = 0;
      activeMatch.logs.push({
        id: `turn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: `Sıra tekrar senin! Başarılar.`,
        timestamp: Date.now(),
      });

      triggerOfflineDraw(activeMatch);
      updateMatchState({ ...activeMatch });
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
      sounds.playVictory(profile.settings);
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

      if (checkWinner(updatedPlayer.properties)) {
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
    if (decision === 'pay' && match?.activeActionRequest) {
      const amountDue = match.activeActionRequest.amountDue;
      
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
        if (checkWinner(sPlayer.properties)) {
          handleOfflineWinner(sPlayer.id);
        } else if (checkWinner(tPlayer.properties)) {
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
                  message: `🛡️ Savunma başarılı oldu! Hamle engellendi.`,
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
        actionRequestId: match?.activeActionRequest?.id,
        decision,
        paymentCardIds: decision === 'pay' ? paymentSelection : [],
      })
    );
    setPaymentSelection([]);
  };

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
          return set && set.cards.length === MAX_IN_SET[col as CardColor];
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
        return set && set.cards.length === MAX_IN_SET[col] && !set.hasHouse;
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
        return set && set.cards.length === MAX_IN_SET[col] && set.hasHouse && !set.hasHotel;
      });
      if (!hasEligibleSet) {
        return { playable: false, reason: 'Otel yerleştirmek için zaten evi olan tamamlanmış bir setiniz olmalıdır!' };
      }
    }

    return { playable: true };
  };

  // Dynamic board background
  const themeHex =
    profile.settings.boardTheme === 'theme_green'
      ? '#064E3B'
      : profile.settings.boardTheme === 'theme_purple'
        ? '#3B0764'
        : profile.settings.boardTheme === 'theme_cyberpunk'
          ? '#050B14'
          : '#0F172A'; // Slate

  const cardBackBg =
    profile.settings.cardBack === 'back_cosmic'
      ? 'linear-gradient(135deg, #020617 0%, #1E1B4B 100%)'
      : profile.settings.cardBack === 'back_gold'
        ? 'linear-gradient(135deg, #78350F 0%, #F59E0B 100%)'
        : profile.settings.cardBack === 'back_neon'
          ? 'linear-gradient(135deg, #4C0519 0%, #DB2777 100%)'
          : 'linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)'; // classic red

  const cardBackPattern =
    profile.settings.cardBack === 'back_cosmic' ? '★' : profile.settings.cardBack === 'back_gold' ? '♛' : '◆';

  return (
    <div
      id="game-room"
      className="h-[100dvh] w-screen overflow-hidden text-white font-sans flex flex-col justify-between select-none relative"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #171E31 0%, #07090F 100%)',
      }}
    >
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
          title="Menüyü Göster"
        >
          👁️ <span className="hidden sm:inline">Menüyü Göster</span>
          <span className="sm:hidden">Menü</span>
        </button>
      )}

      {/* Table Top Header - Compact for Mobile space saving */}
      {!isHeaderHidden && (
        <header className="border-b border-white/5 bg-black/45 backdrop-blur-md px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between z-40 flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                playPlaySound();
                onLeaveRoom();
              }}
              className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 px-1.5 sm:px-2 py-1 rounded-lg transition-all font-bold"
            >
              ← <span className="hidden sm:inline">Çık</span>
            </button>

            <button
              onClick={() => {
                playPlaySound();
                setShowCareerPanel(true);
              }}
              className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 sm:px-2 py-1 rounded-lg transition-all font-bold flex items-center gap-1"
              title="Kariyer İstatistiklerini Gör"
            >
              📊 <span className="hidden sm:inline">Kariyer</span>
            </button>

            <div>
              <span className="text-[8px] uppercase font-black tracking-widest text-amber-400 block leading-none">
                {isOffline ? 'YAPAY ZEKA PRATİK' : 'ÇOK OYUNCULU ODA'}
              </span>
              <h2 className="font-extrabold text-[11px] text-slate-300 leading-tight">Oda: #{roomId}</h2>
            </div>
          </div>

          {/* Real-time Voice Chat System Status */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Troubleshooting Cancel Button to resolve any game freezes */}
            <button
              onClick={() => handleForceCancelActiveAction('Kullanıcı talebiyle işlem iptal edildi ve oyun kurtarıldı.')}
              className="p-1 sm:p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer"
              title="Takılmayı Gider: Herhangi bir takılma durumunda oyunu kurtarır ve sırayı devam ettirir"
            >
              🛠️ <span className="hidden sm:inline">Takılmayı Gider (İptal)</span>
            </button>

            {/* Compact Layout Toggle Button */}
            <button
              onClick={() => {
                playPlaySound();
                setIsCompactLayout(!isCompactLayout);
              }}
              className={`p-1 sm:p-1.5 rounded-lg border text-[10px] font-black transition-all flex items-center gap-1 ${
                isCompactLayout
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
              }`}
              title="Sıkışık Düzen: Mobil ekranlar için kartları küçültür ve boşluk ayarlar"
            >
              📱 <span className="hidden sm:inline">{isCompactLayout ? 'Sıkışık Düzen' : 'Standart Düzen'}</span>
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
              className={`p-1 sm:p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                showChatPanel
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                  : 'bg-slate-500/10 border-slate-500/30 text-slate-400 hover:bg-slate-500/20'
              }`}
              title="Sohbet ve Akışı Aç/Kapat"
            >
              💬 <span className="hidden sm:inline">{showChatPanel ? 'Sohbet' : 'Sohbet Aç'}</span>
            </button>

            <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg px-1.5 py-1 text-[9px] font-bold text-slate-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="hidden sm:inline">Ses Aktif</span>
            </div>
            <button
              onClick={() => {
                playPlaySound();
                setVoiceMuted(!voiceMuted);
              }}
              className={`p-1 sm:p-1.5 rounded-lg border text-xs transition-all ${
                voiceMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
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
              title="Başlığı Gizle: Oyun alanını genişletmek için üst menüyü gizler"
            >
              👁️ <span className="hidden sm:inline">Gizle</span>
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
            <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-2xl backdrop-blur-md ${
              recoveryAlert.type === 'warning'
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
                  {recoveryAlert.type === 'warning' ? 'Sistem Bildirimi' : recoveryAlert.type === 'success' ? 'Başarılı Hamle' : 'Oyun Bilgisi'}
                </h4>
                <p className="text-[10px] text-slate-300 leading-normal">
                  {recoveryAlert.message}
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
          <div className="bg-slate-900/80 border border-white/10 backdrop-blur-lg rounded-2xl p-6 text-center space-y-4 max-w-sm w-full shadow-2xl">
            <span className="text-4xl">🃏</span>
            <h3 className="text-xl font-black text-white">Monopoly Lobi Bekleme</h3>
            <p className="text-[11px] text-slate-400">
              Oyunun başlaması için en az 2 oyuncunun katılması gerekir. Aşağıdan bir yapay zeka bot ekleyebilir veya doğrudan oyunu başlatabilirsiniz!
            </p>

            <div className="flex items-center gap-2 py-2 bg-black/40 border border-white/5 rounded-xl px-4 justify-around text-[10px]">
              <div>
                <span className="text-slate-500 block">Kurucu:</span>
                <span className="font-bold text-red-400">{localPlayer.username}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-slate-500 block">Oyuncular:</span>
                <span className="font-bold text-red-400">{match.players.length} / 4</span>
              </div>
            </div>

            {/* Player list in lobby */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {match.players.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-black/30 border border-white/5 rounded-lg">
                  <span className="font-bold text-xs text-slate-300">{p.username}</span>
                  <span className="text-[8px] uppercase tracking-wider text-red-400 font-bold px-1.5 py-0.5 bg-red-500/10 rounded">
                    {p.isBot ? 'BOT' : 'OYUNCU'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {isOffline ? (
                <button
                  onClick={handleStartOfflineGame}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-xl text-xs transition-all shadow-lg active:scale-95"
                >
                  Pratik Maçını Başlat
                </button>
              ) : (
                <>
                  <button
                    onClick={handleAddBotMultiplayer}
                    className="w-full py-2 bg-white/5 border border-white/10 text-white font-bold rounded-xl text-xs transition-all hover:bg-white/10"
                  >
                    🤖 Bot Ekle
                  </button>
                  <button
                    onClick={handleStartGameMultiplayer}
                    className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-xl text-xs transition-all shadow-lg active:scale-95"
                  >
                    Oyunu Başlat 🚀
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PLAYING STATE */}
      {match.status === 'playing' && (
        <div className={`flex-1 flex flex-col justify-between min-h-0 relative z-10 transition-all duration-300 ${showChatPanel ? 'lg:pr-80' : ''}`}>
          
          {/* 1. Opponents & My Profile Carousel Row at the top (matches Image 4) */}
          <div className="px-3 pt-2.5 flex-shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
                    className={`flex-shrink-0 w-[155px] p-2 rounded-xl bg-slate-900/80 border backdrop-blur-sm transition-all cursor-pointer hover:border-purple-500/50 hover:bg-slate-850/90 ${
                      isCurrentTurn
                        ? 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] ring-1 ring-amber-400/30'
                        : 'border-white/5'
                    }`}
                  >
                    {/* Player Info Line */}
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AvatarWithFrame
                          avatarId={p.avatarId || 'avatar_classic'}
                          frameId={p.profileFrame || 'frame_none'}
                          sizeClassName="w-8 h-8 text-[11px] flex-shrink-0"
                        />
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
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/[0.04]">
                      <span className="text-[8px] text-slate-400 font-bold flex items-center gap-0.5">
                        🃏 x{p.hand.length}
                      </span>

                      {/* Display mini active set cards (matches Image 1 - opponents mini cards) */}
                      <div className="flex gap-1 overflow-x-auto max-w-[95px] no-scrollbar py-0.5">
                        {Object.keys(p.properties).map((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = p.properties[col];
                          if (!set || set.cards.length === 0) return null;
                          const isCompleted = set.cards.length >= MAX_IN_SET[col];
                          return (
                            <div
                              key={col}
                              className={`flex-shrink-0 w-[24px] h-[34px] bg-white rounded flex flex-col justify-between p-0.5 relative overflow-hidden shadow-sm border ${
                                isCompleted ? 'border-amber-400 ring-1 ring-amber-400/30 shadow-[0_0_4px_rgba(251,191,36,0.5)]' : 'border-slate-300'
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
          <div className={`flex-1 min-h-0 flex flex-col justify-around px-2 sm:px-3 transition-all ${
            isCompactLayout ? 'py-0.5 space-y-1' : 'py-1.5 space-y-2'
          }`}>
            
            {/* Horizontal Arena Grid */}
            <div className={`grid grid-cols-3 gap-1.5 sm:gap-2 items-center bg-black/15 border border-white/[0.04] rounded-xl transition-all ${
              isCompactLayout ? 'p-1.5' : 'p-2.5'
            }`}>
              
              {/* Draw Pile (DESTE) */}
              <div className="text-center space-y-0.5">
                <span className="text-[7.5px] text-slate-400 uppercase tracking-widest block font-bold">DESTE</span>
                <div
                  className="w-10 h-14 rounded-lg border border-amber-500/30 flex flex-col justify-between p-1 cursor-pointer select-none active:scale-95 transition-transform shadow-[0_4px_10px_rgba(245,158,11,0.15)] mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, #78350F 0%, #D97706 100%)',
                  }}
                >
                  <span className="text-white/30 text-left text-[5px] font-black leading-none">DEAL</span>
                  <span className="text-white text-xs font-black self-center">🎲</span>
                  <span className="text-white/30 text-right text-[5px] font-black leading-none">DEAL</span>
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
                  {(match.activeActionRequest || activeActionCard) ? (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-pulse" />
                      <span className="text-emerald-400 text-[10px] font-black animate-pulse">⏸️</span>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin opacity-50" />
                      <span className="text-amber-400 text-[10px] font-black">{timeLeft}s</span>
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
                          className={`w-1.5 h-1.5 rounded-full border transition-all duration-300 ${
                            isPlayed
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
                  <span className={`text-[6.5px] font-extrabold px-1.5 py-0.5 rounded-full tracking-wider leading-none border transition-all ${
                    (3 - match.actionsPlayedThisTurn) === 0
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
                <span className="text-[7.5px] text-slate-400 uppercase tracking-widest block font-bold">SON HAMLE</span>
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
                        title="Son Hamle Detayını İncele"
                      >
                        <GameCard card={topDiscard} size="mini" activeEffect={cardEffects[topDiscard.id] || null} />
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-10 h-14 rounded-lg border border-dashed border-white/10 mx-auto flex items-center justify-center text-slate-600 text-[7.5px] font-bold">
                    YOK
                  </div>
                )}
                <span className="text-[7px] text-slate-500 block font-bold">Aksiyon</span>
              </div>

            </div>

            {/* BENİM VARLIKLARIM (My Assets - Bank & Properties Side-by-Side) */}
            <div className="flex gap-2 items-stretch flex-1 min-h-0">
              
              {/* BENİM BANKAM (My Bank - Dedicated Left Side Column with no elements above or below) */}
              <div className={`bg-[#090C12]/40 border border-white/5 rounded-xl flex flex-col justify-between transition-all shrink-0 ${
                isCompactLayout ? 'p-1 sm:p-1.5 space-y-1 w-[68px] sm:w-[84px] md:w-[96px]' : 'p-2 space-y-1.5 w-[84px] sm:w-[104px] md:w-[118px]'
              }`}>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold text-center select-none truncate">
                  BANKA
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
                            alert("Arsa mülk kartları bankaya koyulamaz! Sadece aksiyon ve para kartları bankaya konabilir.");
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
                      className={`flex-1 flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer ${
                        isDragOverBank 
                          ? 'bg-emerald-500/20 border-2 border-emerald-400 scale-[1.03] shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse' 
                          : isDraggingActive && draggingCard.type !== 'property' && draggingCard.type !== 'wildcard'
                            ? 'bg-emerald-500/5 border border-dashed border-emerald-500/40 animate-pulse'
                            : 'bg-slate-900/10 border border-emerald-500/10 shadow-[0_4px_12px_rgba(16,185,129,0.05)] hover:border-emerald-400 hover:scale-[1.02]'
                      }`}
                    >
                      <span className={`text-[7px] font-black bg-emerald-950/60 border border-emerald-500/20 px-1.5 py-0.5 rounded-full leading-none mb-1.5 ${
                        bankTotal > 0 ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        🏦 {bankTotal}M
                      </span>
                      <div className={`w-full aspect-[2/3] h-auto rounded-lg border flex flex-col justify-between p-1 sm:p-1.5 relative overflow-hidden transition-all ${
                        bankTotal > 0 
                          ? 'bg-gradient-to-b from-emerald-900 to-emerald-950 border-emerald-500/50 shadow-xl'
                          : 'bg-slate-950/40 border-dashed border-slate-700'
                      }`}>
                        <div className="absolute -right-2 -bottom-2 text-emerald-900/10 text-3xl font-black">💵</div>
                        <span className="text-[5px] font-black text-emerald-400 tracking-wider leading-none">BANKA</span>
                        <span className={`text-sm my-auto text-center font-black drop-shadow ${
                          bankTotal > 0 ? 'text-emerald-300' : 'text-slate-600'
                        }`}>{bankTotal}M</span>
                        <span className={`text-[4px] font-extrabold text-center uppercase tracking-wider leading-none ${
                          bankTotal > 0 ? 'text-emerald-500' : 'text-slate-600'
                        }`}>KASA</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* BENİM ARAZİLERİM (My Property sets - matches Image 4) */}
              <div className={`bg-[#090C12]/40 border border-white/5 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden transition-all ${
                isCompactLayout ? 'p-1 sm:p-1.5 space-y-1' : 'p-2 space-y-1.5'
              }`}>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold px-1">
                  BENİM ARAZİLERİM ({countCompletedSets(localPlayer.properties)}/3 SET)
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
                    return `flex-1 rounded-xl transition-all flex flex-wrap overflow-y-auto items-start content-start min-h-0 ${
                      isCompactLayout 
                        ? 'gap-1.5 sm:gap-2 p-1' 
                        : 'gap-2 sm:gap-3 p-1.5'
                    } ${
                      isDragOverProperties 
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

                  const hasCompletedSet = Object.keys(localPlayer.properties).some((c) => {
                    const s = localPlayer.properties[c as CardColor];
                    return s && s.cards.length >= (MAX_IN_SET[c as CardColor] || 0);
                  });

                  return (
                    <div
                      key={col}
                      className={`flex flex-col items-center rounded-xl transition-all w-[36px] sm:w-[48px] md:w-[56px] shrink-0 ${
                        isCompactLayout ? 'p-0.5 space-y-0.5' : 'p-1 space-y-1'
                      } ${
                        isCompleted
                          ? 'border-2 border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(251,191,36,0.85)] animate-pulse'
                          : 'border-2 border-white/5 bg-slate-900/40'
                      }`}
                    >
                      {/* Stack of actual medium property cards (with overlap) */}
                      <div className={`relative flex flex-col items-center w-full transition-all ${
                        isCompactLayout ? 'min-h-[46px] sm:min-h-[62px]' : 'min-h-[56px] sm:min-h-[74px]'
                      }`}>
                        {set.cards.map((card, idx) => {
                          const isWild = card.isWildcard || card.type === 'wildcard';
                          return (
                            <div
                              key={card.id}
                              onClick={() => {
                                playPlaySound();
                                setFocusedCard(card);
                                setFocusedCardZoom(window.innerWidth < 640 ? 1.4 : 1.8);
                              }}
                              className={`${idx > 0 ? (isCompactLayout ? '-mt-[125%]' : '-mt-[115%]') : ''} w-full transition-all hover:z-30 relative cursor-pointer hover:scale-105 animate-play-card`}
                              title="Kartı Odakla"
                            >
                              <GameCard card={card} size="medium" activeEffect={cardEffects[card.id] || null} />
                              {isWild && isMyTurn && (
                                <div className="absolute top-1 right-1 bg-yellow-500 text-slate-950 text-[6px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow z-10" title="Grup Değiştirebilir">
                                  🔄
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Info badges and Action Button underneath */}
                      <div className={`flex flex-col items-center w-full ${isCompactLayout ? 'space-y-0.5' : 'space-y-1'}`}>
                        <div className={`flex items-center justify-center w-full gap-1 ${isCompactLayout ? 'flex-row' : 'flex-col gap-0.5'}`}>
                          <span className={`font-black px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5 fluid-card-rent-badge ${
                            isCompactLayout ? 'text-[5.5px]' : 'text-[6.5px]'
                          } ${
                            isCompleted ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isCompleted && '👑'} {set.cards.length}/{MAX_IN_SET[col]}
                          </span>
                          <span className="font-black text-white bg-emerald-600 border border-emerald-400/40 px-1.5 py-0.5 rounded-full shadow-sm text-center leading-none block fluid-card-rent-badge" style={{ fontSize: isCompactLayout ? '5.5px' : '6.5px', minWidth: isCompactLayout ? '32px' : '42px' }} title="Alabileceğiniz Kira Değeri">
                            {isCompactLayout ? `${calculateSetRent(set.cards, col, set.hasHouse, set.hasHotel)}M` : `Kira: ${calculateSetRent(set.cards, col, set.hasHouse, set.hasHotel)}M`}
                          </span>
                        </div>

                        <button
                          onClick={() => setManagedSetColor(col)}
                          className={`w-full py-0.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black rounded uppercase tracking-wider shadow-sm fluid-card-btn ${
                            isCompactLayout ? 'text-[6px]' : 'text-[7px]'
                          }`}
                        >
                          {isCompactLayout ? '⚙️' : '⚙️ YÖNET'}
                        </button>
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
                <span>🎴 KARTLARIM ({localPlayer.hand.length})</span>
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
                  💡 İpucu
                </button>

                {match.players[match.turnIndex].id === localPlayer.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      Hamle: {3 - match.actionsPlayedThisTurn}/3
                    </span>
                    <button
                      onClick={isOffline ? handleOfflineEndTurn : handleEndTurnMultiplayer}
                      disabled={!!match.activeActionRequest}
                      className={`font-black px-3 py-1 rounded-lg text-[9px] shadow-lg flex items-center gap-0.5 ${
                        match.activeActionRequest 
                          ? 'bg-purple-900/50 text-purple-300 border border-purple-800/30 cursor-not-allowed opacity-50' 
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      🏁 Turu Bitir
                    </button>
                  </div>
                ) : (
                  <span className="text-[8px] text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded font-bold uppercase">
                    SIRA RAKİPTE
                  </span>
                )}
              </div>

            </div>

            {/* Hand Cards Carousel Content */}
            {isHandExpanded && (
              <div className="p-2.5">
                {match.players[match.turnIndex].id === localPlayer.id && match.actionsPlayedThisTurn === 3 && (
                  <div className="mb-2.5 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-[10px] font-extrabold text-red-400 animate-pulse flex items-center justify-center gap-1.5 shadow-sm">
                    ⚠️ Bu turdaki 3 hamlenizin tamamını kullandınız! Yeni kart oynamak için "Turu Bitir" butonuna basarak turunuzu tamamlayın.
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
                      <div
                        key={card.id}
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
                        className={`cursor-grab active:cursor-grabbing transition-transform hover:-translate-y-2 select-none flex-shrink-0 ${
                          draggingCard?.id === card.id ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        <GameCard
                          card={card}
                          size={isCompactLayout ? "medium" : "normal"}
                          isSelected={isSelected}
                          activeEffect={cardEffects[card.id] || null}
                          onClick={() => {
                            if (match.activeActionRequest) return;
                            setSelectedCard(card);
                            setShowCardMenu(true);
                            playPlaySound();
                          }}
                        />
                      </div>
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
                <h3 className="font-bold text-xs text-white">Canlı Akış & Sohbet</h3>
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
                        <span className="text-slate-200">{log.message}</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 font-medium">{log.message}</p>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="mt-2.5 flex gap-1.5 flex-shrink-0">
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

      {/* GAME OVER STATE */}
      {match.status === 'finished' && (
        <div className="flex-1 p-4 flex flex-col justify-center items-center z-10 relative">
          <div className="bg-slate-900/90 border border-white/10 backdrop-blur-lg rounded-2xl p-6 text-center space-y-4 max-w-sm w-full shadow-2xl">
            <span className="text-5xl animate-bounce block">👑</span>
            <h3 className="text-2xl font-black text-red-500">OYUN BİTTİ!</h3>
            
            {(() => {
              const winner = match.players.find((p) => p.id === match.winnerId);
              return (
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl">
                  <span className="text-slate-400 text-[10px] block mb-1 uppercase tracking-wider font-bold">Kazanan Şampiyon:</span>
                  <span className="font-extrabold text-xl text-white">{winner?.username}</span>
                </div>
              );
            })()}

            <button
              onClick={() => {
                playPlaySound();
                onLeaveRoom();
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition-all shadow-lg shadow-red-600/20 active:scale-95"
            >
              Ana Menüye Dön
            </button>
          </div>
        </div>
      )}

      {/* --- OVERLAYS & MODALS PANEL (Styled precisely matching Images 2, 3, 5, 7, 8) --- */}

      {/* 0. Odak Modu (Focus Mode) overlay modal */}
      {focusedCard && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 z-[60] animate-fade-in select-none">
          {/* Main Container */}
          <div className="w-full max-w-lg flex flex-col items-center space-y-4 relative">
            
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
                <GameCard card={focusedCard} size="normal" activeEffect={cardEffects[focusedCard.id] || null} />
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col sm:flex-row gap-6 items-center">
            {/* Visual Card Preview */}
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <div className="scale-105 sm:scale-115 origin-center my-2 transition-transform">
                <GameCard card={selectedCard} size="normal" activeEffect={cardEffects[selectedCard.id] || null} />
              </div>
              <button
                onClick={() => {
                  setFocusedCard(selectedCard);
                  setFocusedCardZoom(window.innerWidth < 640 ? 1.4 : 1.8);
                }}
                className="text-[9px] font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-400/20 transition-all flex items-center gap-1 shadow cursor-pointer uppercase"
              >
                🔍 DETAYLI İNCELE (ZOOM)
              </button>
            </div>

            {/* Actions & Details */}
            <div className="flex-1 w-full space-y-4">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">KART SEÇENEKLERİ</span>
                <h3 className="text-lg font-black text-amber-300 uppercase tracking-tight">{TURKISH_NAMES[selectedCard.name] || selectedCard.name}</h3>
                <p className="text-[11px] text-slate-300 leading-normal">{selectedCard.description}</p>
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
                    💵 Bankaya Koy ({selectedCard.value}M)
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
                    🗑 Elinden Fazla Kart Olarak At
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedCard(null);
                    setShowCardMenu(false);
                  }}
                  className="w-full py-2 bg-transparent hover:bg-white/5 text-slate-400 font-bold rounded-xl text-xs transition-all"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Wildcard Color selector prompt (matches Image 5) */}
      {wildcardColorPick && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">Renk Seç</span>
              <h3 className="text-xs text-slate-400 mt-1">Bu joker mülk kartını hangi renk grubu için kullanmak istersiniz?</h3>
            </div>

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
                      className={`p-2 rounded-xl border text-[9px] font-extrabold flex flex-col items-center gap-1.5 transition-all bg-slate-950 hover:bg-slate-900 ${
                        isComplete
                          ? 'border-emerald-500/40 hover:border-emerald-500/70'
                          : count > 0
                            ? 'border-amber-500/40 hover:border-amber-500/70'
                            : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLOR_HEX[col] }} />
                      <span className="text-white">{COLOR_LABELS[col]}</span>
                      <span className={`text-[7.5px] px-1 py-0.2 rounded font-black ${
                        isComplete 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : count > 0 
                            ? 'bg-amber-500/10 text-amber-400' 
                            : 'bg-slate-800 text-slate-500'
                      }`}>
                        {count > 0 ? `${count}/${max} Kart` : 'Mülk Yok'}
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
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* Rent Color selector prompt */}
      {rentColorPick && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wider">Kira Bedeli Al</span>
              <h3 className="text-xs text-slate-400 mt-1">Hangi mülk grubunuz için kira toplamak istersiniz?</h3>
              <p className="text-[9px] text-slate-500 mt-1">Sadece sahip olduğunuz mülklerden kira talep edebilirsiniz.</p>
            </div>

            {localPlayer.hand.some((c) => c.actionType === 'double-rent') && match.actionsPlayedThisTurn < 2 && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-extrabold text-amber-400">⚡ Kirayı İkiye Katla!</span>
                  <span className="text-[8px] text-slate-400">Elinizdeki kartı oynayarak kirayı 2 katına çıkarır (+1 Hamle).</span>
                </div>
                <input
                  type="checkbox"
                  checked={useDoubleRent}
                  onChange={(e) => setUseDoubleRent(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
              </div>
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
                        if (isOffline) handleOfflinePlayCard(rentColorPick.id, 'action', col, payload);
                        else handlePlayCardMultiplayer(rentColorPick.id, 'action', col, payload);
                        setRentColorPick(null);
                        setUseDoubleRent(false);
                      }}
                      className={`p-2.5 rounded-xl border text-[9px] font-extrabold flex flex-col items-center gap-1.5 transition-all text-center ${
                        hasProp
                          ? 'border-white/10 hover:border-amber-500 bg-slate-950 text-white cursor-pointer shadow-lg hover:bg-slate-900/60'
                          : 'border-white/5 bg-slate-950/40 text-slate-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLOR_HEX[col], filter: hasProp ? 'none' : 'grayscale(1)' }} />
                      <div className="flex flex-col items-center">
                        <span className="text-white font-extrabold">{COLOR_LABELS[col]}</span>
                        {hasProp ? (
                          <div className="flex flex-col items-center mt-1 space-y-0.5">
                            <span className="text-[8px] text-slate-400 font-bold">
                              {set.cards.length} Adet Mülk
                            </span>
                            <span className="text-[9px] font-black text-emerald-400">
                              Kira: {currentRent}M
                            </span>
                            {useDoubleRent && (
                              <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 animate-pulse mt-0.5">
                                💥 2 Katı: {doubledRent}M
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] text-slate-500 block mt-0.5">Mülk Yok</span>
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
                    if (set.cards.length === MAX_IN_SET[col] && !set.hasHouse) {
                      eligibleColors.push(col);
                    }
                  } else {
                    if (set.cards.length === MAX_IN_SET[col] && set.hasHouse && !set.hasHotel) {
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="text-center border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold text-amber-500 block uppercase tracking-wider">{activeActionCard.name}</span>
              <h3 className="text-xs text-slate-400 mt-1">Kart Hedeflerini Seçin</h3>
            </div>

            {/* STEP 1: Select Opponent (Debt Collector, Sly Deal, Deal Breaker, Forced Deal) */}
            {!selectedOpponentId && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">Hangi rakibi hedef almak istersiniz?</p>
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
                                {completedSets > 0 ? `🏆 ${completedSets} TAMAMLANMIŞ SET` : 'SET YOK'}
                              </span>
                            </div>
                          </div>

                          {/* Bank Badge */}
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black">
                            <span>🏦 Banka:</span>
                            <span className="text-white">{bankTotal}M</span>
                          </div>
                        </div>

                        {/* Player Properties Summary */}
                        <div className="w-full space-y-1.5 pt-1.5 border-t border-white/5">
                          <div className="flex justify-between text-[8px] font-bold text-slate-400">
                            <span>MÜLK KARTLARI ({totalProperties} ADET)</span>
                            <span>SET DURUMU</span>
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
                              <span className="text-[8.5px] text-slate-500 font-bold italic">Hiç mülk kartı yok</span>
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

              // Strategic advice helper for taking a card (Sly Deal or Forced Deal)
              const getTakeCardRecommendation = (col: CardColor, card: Card) => {
                const mySet = localPlayer.properties[col];
                const myCount = mySet?.cards?.length || 0;
                const maxInSet = MAX_IN_SET[col];

                if (myCount > 0 && myCount + 1 === maxInSet) {
                  return {
                    label: '🏆 Set Tamamlar (Kritik!)',
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    desc: 'Bu mülkü alarak seti tamamlayabilir ve kira değerini zirveye taşıyabilirsin!'
                  };
                }
                if (myCount > 0) {
                  return {
                    label: '📈 Setini Büyütür',
                    bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                    desc: 'Bu mülkü alarak mevcut setine ekleyebilir ve kirayı arttırabilirsin.'
                  };
                }
                const opSet = op.properties[col];
                const opCount = opSet?.cards?.length || 0;
                if (opCount > 1 && opCount === maxInSet - 1) {
                  return {
                    label: '🛡️ Rakibi Engeller!',
                    bg: 'bg-red-500/10 border-red-500/30 text-red-400',
                    desc: 'Rakip bu rengi tamamlamak üzere! Bunu alarak rakibini engellersin.'
                  };
                }
                return {
                  label: '🏢 Yeni Renk Grubu',
                  bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                  desc: 'Yeni bir renk grubu kurmak için harika bir fırsat.'
                };
              };

              // Strategic advice helper for giving a card (Forced Deal)
              const getGiveCardRecommendation = (col: CardColor, card: Card) => {
                const mySet = localPlayer.properties[col];
                const myCount = mySet?.cards?.length || 0;

                if (myCount === 1 && card.value <= 2) {
                  return {
                    label: '✅ Vermek İçin En Avantajlı',
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    desc: 'Tek olan ve değeri düşük mülklerinizden biri. Vermek seti bozmaz.'
                  };
                }
                if (myCount > 1 && myCount < MAX_IN_SET[col]) {
                  return {
                    label: '⚠️ Dikkat: Setini Küçültür',
                    bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                    desc: 'Biriktirmekte olduğunuz bir setin kartını vermek setinizi küçültür.'
                  };
                }
                return {
                  label: '⚖️ Verilebilir',
                  bg: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
                  desc: 'Stratejik setlerinize doğrudan zarar vermeyen bir takas.'
                };
              };

              // Strategic advice helper for Deal Breaker (stealing complete sets)
              const getDealBreakerRecommendation = (col: CardColor) => {
                const mySet = localPlayer.properties[col];
                const myCount = mySet?.cards?.length || 0;

                if (myCount > 0) {
                  return {
                    label: '🔥 Çift Set Avantajı!',
                    bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                    desc: 'Bu seti alarak devasa kira avantajı veya doğrudan galibiyet sağlayabilirsin!'
                  };
                }
                return {
                  label: '🏆 Doğrudan Yeni Tam Set!',
                  bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                  desc: 'Rakibin tamamlanmış setini çalmak oyunu kazanma şansını çok arttırır!'
                };
              };

              // Sly Deal
              if (activeActionCard.actionType === 'sly-deal') {
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      <strong>{op.username}</strong> adlı oyuncunun çalmak istediğiniz mülkünü seçin (Tamamlanmış setler hariç):
                    </p>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {Object.keys(op.properties).flatMap((colorKey) => {
                        const col = colorKey as CardColor;
                        const set = op.properties[col];
                        if (!set || set.cards.length === 0 || set.cards.length === MAX_IN_SET[col]) return [];

                        return set.cards.map((c) => {
                          const advice = getTakeCardRecommendation(col, c);
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
                                  <span className="font-bold text-xs">{c.name}</span>
                                </div>
                                <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/40" style={{ color: COLOR_HEX[col] }}>
                                  {COLOR_LABELS[col]}
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

              // Deal Breaker
              if (activeActionCard.actionType === 'deal-breaker') {
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300">
                      <strong>{op.username}</strong> adlı oyuncunun çalmak istediğiniz tamamlanmış mülk setini seçin:
                    </p>
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                      {Object.keys(op.properties).map((colorKey) => {
                        const col = colorKey as CardColor;
                        const set = op.properties[col];
                        if (!set || set.cards.length === 0 || set.cards.length !== MAX_IN_SET[col]) return null;

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
                                <span className="font-bold text-xs">{COLOR_LABELS[col]} Seti</span>
                              </div>
                              <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                {set.cards.length} Mülk
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
                      <p className="text-xs text-slate-300">
                        <strong>{op.username}</strong> adlı oyuncudan almak istediğiniz mülkü seçin (Sadece tamamlanmamış setler):
                      </p>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {Object.keys(op.properties).flatMap((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = op.properties[col];
                          if (!set || set.cards.length === 0 || set.cards.length === MAX_IN_SET[col]) return [];

                          return set.cards.map((c) => {
                            const advice = getTakeCardRecommendation(col, c);
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
                                    <span className="font-bold text-xs">{c.name}</span>
                                  </div>
                                  <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/40" style={{ color: COLOR_HEX[col] }}>
                                    {COLOR_LABELS[col]}
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
                } else {
                  return (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300">
                        Karşılığında vermek istediğiniz kendi mülkünüzü seçin (Sadece tamamlanmamış setleriniz):
                      </p>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                        {Object.keys(localPlayer.properties).flatMap((colorKey) => {
                          const col = colorKey as CardColor;
                          const set = localPlayer.properties[col];
                          if (!set || set.cards.length === 0 || set.cards.length === MAX_IN_SET[col]) return [];

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
                                    <span className="font-bold text-xs">{c.name}</span>
                                  </div>
                                  <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-black/40" style={{ color: COLOR_HEX[col] }}>
                                    {COLOR_LABELS[col]}
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
                    <p className="text-xs text-slate-300">
                      <strong>{op.username}</strong> oyuncusundan 5M borç tahsil edilecek. Onaylıyor musunuz?
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
                      Onayla ve Borç İste
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
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* 3. Multiplayer Payment Select interface overlay (matches Image 2, 3) */}
      {match.activeActionRequest && match.activeActionRequest.targetPlayerId === profile.id && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            
            {match.activeActionRequest.type === 'just-say-no' ? (
              // JSN DEFENSE INTERFACE
              <div className="space-y-4">
                <div className="text-center space-y-1 border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-bold text-red-500 block uppercase tracking-wider animate-pulse">🛡️ SAVUNMA ZİNCİRİ (JSN)</span>
                  <h3 className="text-sm font-bold text-slate-200">
                    Sana karşı bir hamle yapıldı!
                  </h3>
                  <p className="text-xs text-slate-400 mt-2">
                    {(() => {
                      const req = match.activeActionRequest;
                      const jsnCount = req.jsnCount || 0;
                      const sPlayer = match.players.find((p: any) => p.id === req.sourcePlayerId);
                      const actName = req.actionCard?.name || "Önemli Aksiyon";
                      
                      if (jsnCount === 0) {
                        return (
                          <span>
                            <strong>{sPlayer?.username}</strong>, sana karşı <strong>{actName}</strong> kartını oynadı ve hamlesini gerçekleştirmek istiyor.
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-amber-400">
                            🔥 <strong>{sPlayer?.username}</strong> senin savunmana karşı 'Hayır Teşekkürler' kartı kullandı! (Reddete Redet!) Zincirdeki JSN sayısı: <strong>{jsnCount}</strong>
                          </span>
                        );
                      }
                    })()}
                  </p>
                </div>

                <div className="bg-black/35 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Hamle Detayı:</span>
                  {(() => {
                    const req = match.activeActionRequest;
                    const type = req.originalAction?.type || req.actionCard?.actionType || req.actionCard?.type;
                    if (type === 'sly-deal') return "Sinsi Anlaşma: Seçtiğin bir mülk çalınacak.";
                    if (type === 'deal-breaker') return "Anlaşma Bozan: Tamamlanmış bir setin çalınacak.";
                    if (type === 'forced-deal') return "Zoraki Takas: Bir mülk karşılıklı olarak takas edilecek.";
                    return "Kira / Borç tahsilatı.";
                  })()}
                </div>

                <div className="flex flex-col gap-2">
                  {localPlayer.hand.some((c) => c.actionType === 'just-say-no') ? (
                    <button
                      onClick={() => handleRespondActionRequest('just-say-no')}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg shadow-red-900/50"
                    >
                      🛑 'HAYIR TEŞEKKÜRLER' KARTINI OYNA!
                    </button>
                  ) : (
                    <div className="text-center text-[10px] text-red-400 bg-red-950/20 py-2 rounded-lg border border-red-900/30">
                      Elinizde 'Hayır Teşekkürler' kartı bulunmuyor.
                    </div>
                  )}

                  <button
                    onClick={() => handleRespondActionRequest('decline')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
                  >
                    Kabul Et ve Sonucu Uygula
                  </button>

                  <button
                    onClick={() => handleForceCancelActiveAction('Savunma zinciri sonlandırıldı ve hamle iptal edildi.')}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 text-red-400 font-extrabold rounded-xl text-xs transition-all border border-red-500/20 cursor-pointer"
                  >
                    ❌ HAMLEYİ İPTAL ET (Takılma Giderici)
                  </button>
                </div>
              </div>
            ) : (
              // STANDARD PAYMENT INTERFACE (rents, birthdays, debt collectors)
              <>
                <div className="text-center space-y-1 border-b border-slate-800 pb-3">
                  <span className="text-[10px] font-bold text-red-400 block uppercase animate-pulse">⚠️ BORÇ TAHSİLATI</span>
                  <h3 className="text-sm font-bold text-slate-200">
                    Sana karşı {match.activeActionRequest.actionCard.name} oynandı!
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    İstenen Toplam Miktar: <strong className="text-red-400">{match.activeActionRequest.amountDue}M</strong>
                  </p>
                </div>

                {/* Selection instructions */}
                <div className="space-y-3">
                  <div className="flex gap-1.5 justify-between">
                    <button
                      onClick={() => {
                        const due = match.activeActionRequest?.amountDue || 0;
                        
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
                      title="Borcu en uygun şekilde kapatmak için kartları otomatik seçer"
                    >
                      ⚡ Otomatik Seç
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
                      ☑ Tümünü Seç
                    </button>

                    <button
                      onClick={() => {
                        setPaymentSelection([]);
                      }}
                      className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-bold transition-all text-center"
                    >
                      ☒ Temizle
                    </button>
                  </div>

                  {/* Separated sections for Money and Properties */}
                  <div className="space-y-3">
                    {/* 1. BANK/MONEY CARDS (NAKİT) */}
                    <div>
                      <span className="text-[9px] text-amber-400 font-black tracking-wider block mb-1.5 uppercase">💰 NAKİT VARLIKLAR</span>
                      {localPlayer.bank.length === 0 ? (
                        <span className="text-[8px] text-slate-500 italic block py-1.5 px-2 bg-black/10 rounded-lg">Kasanızda hiç nakit kartı bulunmuyor.</span>
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
                                className={`p-1.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                    : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                                }`}
                              >
                                <span className="font-extrabold text-[8px] block text-slate-200 truncate">{c.name}</span>
                                <span className="text-[8px] text-amber-300 block font-black mt-0.5">{c.value}M</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. PROPERTY CARDS (MÜLK) */}
                    <div>
                      <span className="text-[9px] text-emerald-400 font-black tracking-wider block mb-1.5 uppercase">🏢 MÜLK VARLIKLAR</span>
                      {Object.values(localPlayer.properties).every((set: any) => !set || set.cards.length === 0) ? (
                        <span className="text-[8px] text-slate-500 italic block py-1.5 px-2 bg-black/10 rounded-lg">Sahada hiç mülk kartınız bulunmuyor.</span>
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
                                  className={`p-1.5 rounded-lg border text-left transition-all ${
                                    isSelected
                                      ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                                      : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                                  }`}
                                >
                                  <span className="font-extrabold text-[8px] block text-slate-200 flex items-center gap-1 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLOR_HEX[col] }} />
                                    {c.name}
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
                        <span>Seçilen Toplam:</span>
                        <span className={total >= (match.activeActionRequest?.amountDue || 0) ? 'text-emerald-400 font-black' : 'text-amber-400'}>
                          {total}M / {match.activeActionRequest?.amountDue}M
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
                      🛑 ELİNİZDE SAVUNMA KARTI VAR! (Kullan)
                    </button>
                  )}

                  <button
                    onClick={() => handleRespondActionRequest('pay')}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition-all"
                  >
                    KABUL ET VE ÖDE / KARTI DEVRET
                  </button>

                  <button
                    onClick={() => handleForceCancelActiveAction('Ödeme/Tahsilat talebi iptal edildi.')}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-950/60 text-red-400 font-extrabold rounded-xl text-xs transition-all border border-red-500/20 cursor-pointer"
                  >
                    ❌ ÖDEMEYİ İPTAL ET (Takılma Giderici)
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 4. Set Management Modal (matches Image 11) */}
      {managedSetColor && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-black text-xs text-white uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_HEX[managedSetColor] }} />
                Set Yönetimi - {COLOR_LABELS[managedSetColor]}
              </h3>
              <button
                onClick={() => setManagedSetColor(null)}
                className="text-slate-400 hover:text-white font-black text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              Detayları görmek veya renk değiştirmek için kartların altındaki butonları kullanabilirsiniz.
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {localPlayer.properties[managedSetColor]?.cards.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[10px] text-white block">{c.name}</span>
                    <span className="text-[8px] text-slate-500 block">Değer: {c.value}M</span>
                  </div>

                  <div className="flex gap-1">
                    {c.isWildcard && (
                      <button
                        onClick={() => {
                          setWildcardColorPick(c);
                          setManagedSetColor(null);
                        }}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[8px] font-black rounded uppercase"
                      >
                        Renk Değiştir
                      </button>
                    )}
                    <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[8px] font-black rounded uppercase">
                      İNCELE
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setManagedSetColor(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl text-xs transition-all"
            >
              Kapat
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
                  Banka Kasası ({localPlayer.bank.reduce((sum, c) => sum + c.value, 0)}M)
                </h3>
                <p className="text-[8px] text-slate-400 mt-0.5 leading-normal">
                  Bankandaki tüm kartlar aşağıda listeleniyor. Para kartları ve bankaya yatırdığın aksiyon kartları burada görünür.
                </p>
              </div>
            </div>

            {/* List of cards */}
            <div className="py-2">
              {localPlayer.bank.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-[10px] italic bg-black/20 rounded-xl border border-dashed border-white/5">
                  Banka kasanızda henüz hiç para kartı yok.
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
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform animate-play-card"
                      title="Detayları İncele"
                    >
                      <GameCard card={card} size="medium" activeEffect={cardEffects[card.id] || null} />
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
              <span className="text-slate-400 font-bold uppercase tracking-wider">Toplam Banka Değeri:</span>
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
                    🤖 {opponent.username.split(' ')[0]} - Tüm Varlıkları
                  </h3>
                </div>

                {/* Emojis Interaction Block */}
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 space-y-2">
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block text-center">İFADE GÖNDER</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { emoji: '😂', name: 'Komik' },
                      { emoji: '😡', name: 'Kızgın' },
                      { emoji: '😭', name: 'Ağlayan' },
                      { emoji: '😱', name: 'Şaşkın' },
                      { emoji: '👏', name: 'Alkış' },
                      { emoji: '🔥', name: 'Alev' },
                      { emoji: '💸', name: 'Zengin' },
                      { emoji: '🤝', name: 'Anlaşma' },
                    ].map((item) => (
                      <button
                        key={item.emoji}
                        onClick={() => {
                          playAlertSound();
                          // Add log
                          const newLog: GameLog = {
                            id: `emoji-log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            playerName: localPlayer.username,
                            message: `Rakibe "${item.emoji}" ifadesini gönderdi!`,
                            timestamp: Date.now(),
                          };
                          match.logs.push(newLog);
                          
                          // Bot response if offline
                          if (isOffline) {
                            setTimeout(() => {
                              let botReply = 'Sakin ol şampiyon, sadece bir oyun!';
                              if (item.emoji === '😂') botReply = 'Hahaha, çok eğlenceli!';
                              else if (item.emoji === '😭') botReply = 'Ağlama bebeğim, şansın dönecektir!';
                              else if (item.emoji === '🔥') botReply = 'Masa yanıyor! 🔥';
                              else if (item.emoji === '🤝') botReply = 'Güzel bir anlaşmaya her zaman varım!';
                              else if (item.emoji === '💸') botReply = 'Buralarda paranın sözü geçmez!';
                              
                              match.logs.push({
                                id: `emoji-bot-reply-${Date.now()}`,
                                playerName: opponent.username,
                                message: botReply,
                                timestamp: Date.now(),
                              });
                              setMatch({ ...match });
                            }, 1200);
                          }
                          setMatch({ ...match });
                        }}
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-yellow-500/50 rounded-xl text-lg flex items-center justify-center transition-all transform active:scale-95"
                        title={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bank vault status */}
                <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-3 space-y-2">
                  <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider block">
                    💼 BANKA KASASI ({bankTotal}M)
                  </span>
                  {bankBreakdown.length === 0 ? (
                    <span className="text-[8px] text-slate-500 italic block">Banka kasası boş.</span>
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
                    🏡 ARSALAR VE SETLER
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
                              {COLOR_LABELS[col]}
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
                                <span>{TURKISH_NAMES[c.name] || c.name}</span>
                                <span className="text-[7px] text-amber-500/80">🔍 İncele</span>
                              </button>
                            ))}
                          </div>

                          {/* Rent */}
                          <div className="text-[8px] font-black text-emerald-400 bg-emerald-950/30 border border-emerald-500/10 px-1.5 py-0.5 rounded text-center leading-none">
                            Kira: {rentVal}M
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
                ✕ Kapat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
              {match.logs.map((log) => (
                <div key={log.id} className="bg-black/20 p-2 rounded-lg border border-white/5 leading-normal">
                  {log.playerName ? (
                    <p>
                      <strong className="text-amber-400 font-bold">{log.playerName}:</strong>{' '}
                      <span className="text-slate-200">{log.message}</span>
                    </p>
                  ) : (
                    <p className="text-slate-400 font-medium">{log.message}</p>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="mt-2.5 flex gap-1.5 flex-shrink-0">
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
            className="fixed top-16 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm bg-slate-900/95 border-2 border-amber-500/50 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-50 pointer-events-auto flex flex-col gap-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {actionToast.type === 'rent' ? '💰' : actionToast.type === 'info' ? 'ℹ️' : '⚡'}
                </span>
                <div>
                  <h4 className="font-extrabold text-xs text-amber-300 uppercase tracking-wider">{actionToast.title}</h4>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{actionToast.message}</p>
                </div>
              </div>
              <button
                onClick={() => setActionToast(null)}
                className="text-slate-400 hover:text-white font-black text-xs p-1"
              >
                ✕
              </button>
            </div>

            {actionToast.victimName && (
              <div className="bg-black/30 border border-white/5 rounded-xl p-2 flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">👤</span>
                  <span className="font-bold text-slate-200">{actionToast.victimName} Kalan Durum:</span>
                </div>
                <div className="flex gap-3 text-[9px] font-mono">
                  <span className="text-amber-400">💵 Para: {actionToast.remainingCash}M</span>
                  <span className="text-emerald-400">🏢 Mülk: {actionToast.remainingPropsCount} adet</span>
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
                <GameCard card={propertyWildcardColorPick} size="normal" activeEffect={cardEffects[propertyWildcardColorPick.id] || null} />
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
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-1.5 ${
                        isCurrent
                          ? 'border-yellow-500 bg-yellow-500/[0.04] shadow-[0_0_12px_rgba(234,179,8,0.15)] animate-pulse'
                          : 'border-white/5 bg-slate-950/40 hover:border-white/20 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isCurrent ? 'border-yellow-500' : 'border-slate-600'
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
                                <span className={`text-[7.5px] px-1 py-0.2 rounded font-black ${
                                  count === max && max > 0 
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

    </div>
  );
};
