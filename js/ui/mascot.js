/**
 * js/ui/mascot.js - Interactive Snake Page Mascot
 * Inspired by nilbuild/page-mascot (Kamran Ahmed)
 * Tracks user cursor with 9 directional head angles, falls back to tracking snake head when idle,
 * and shows a JivoChat-style greeting teaser bubble.
 */

import { mascotChat } from './mascotChat.js';

const DIRECTIONS = [
  'up-left',
  'up',
  'up-right',
  'left',
  'center',
  'right',
  'down-left',
  'down',
  'down-right',
];

const REACTIONS = [
  'blink',
  'heart',
  'sparkle',
  'surprised',
  'wink',
  'bashful',
  'sleepy',
  'dizzy',
  'delighted',
];

// Clockwise from right, matching Math.atan2 with Y pointing downwards
const CLOCKWISE = [
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
  'up',
  'up-right',
];

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 70;
const PAYOFFS = ['heart', 'sparkle', 'delighted'];
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;
const POINTER_IDLE_MS = 2200;

const SQUASH = [
  { transform: 'scale(1, 1)', easing: 'ease-in' },
  { transform: 'scale(1.10, 0.86)', offset: 0.18, easing: 'ease-out' },
  { transform: 'scale(0.95, 1.08)', offset: 0.45, easing: 'ease-in-out' },
  { transform: 'scale(1.03, 0.97)', offset: 0.72, easing: 'ease-in-out' },
  { transform: 'scale(1, 1)' },
];

function cellPosition(index) {
  if (index < 0) return '50% 50%';
  const x = (index % 3) * 50;
  const y = Math.floor(index / 3) * 50;
  return `${x}% ${y}%`;
}

function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function initMascot(options = {}) {
  const mascotBtn = document.getElementById('pageMascot');
  if (!mascotBtn) return;

  const squashEl = mascotBtn.querySelector('.page-mascot-squash');
  const dirLayer = mascotBtn.querySelector('.page-mascot-directions');
  const reactLayer = mascotBtn.querySelector('.page-mascot-reactions');

  if (!squashEl || !dirLayer || !reactLayer) return;

  const chat = options.chat !== undefined ? options.chat : ((typeof window !== 'undefined' && window.mascotChat) || mascotChat);

  let timers = [];
  const boopState = { count: 0, at: 0 };
  let currentDir = 'center';
  let sector = -1;
  let pointer = null;
  let lastPointerMoveAt = 0;
  let greetingEl = null;

  function clearTimers() {
    timers.forEach(t => {
      clearTimeout(t);
    });
    timers = [];
  }

  function later(ms, next) {
    timers.push(setTimeout(() => setReaction(next), ms));
  }

  function playSquash() {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (!prefersReducedMotion && squashEl.animate) {
      squashEl.animate(SQUASH, { duration: SQUASH_MS, easing: 'linear' });
    }
  }

  function setDirection(dir) {
    if (currentDir === dir) return;
    currentDir = dir;
    const idx = DIRECTIONS.indexOf(dir);
    dirLayer.style.backgroundPosition = cellPosition(idx);
  }

  function setReaction(reactionName) {
    if (reactionName) {
      const idx = REACTIONS.indexOf(reactionName);
      reactLayer.style.backgroundPosition = cellPosition(idx);
      reactLayer.style.opacity = '1';
      dirLayer.style.opacity = '0';
    } else {
      reactLayer.style.opacity = '0';
      dirLayer.style.opacity = '1';
    }
  }

  function aimAt(target) {
    if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') return;
    const box = mascotBtn.getBoundingClientRect();
    const dx = target.x - (box.left + box.width / 2);
    const dy = target.y - (box.top + box.height / 2);

    if (Math.hypot(dx, dy) < DEAD_ZONE) {
      sector = -1;
      setDirection('center');
      return;
    }

    const angle = Math.atan2(dy, dx);
    if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) {
      return;
    }
    sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
    setDirection(CLOCKWISE[sector]);
  }

  function getActiveTarget() {
    const now = Date.now();
    const isPointerRecent = pointer && (now - lastPointerMoveAt < POINTER_IDLE_MS);
    if (isPointerRecent) {
      return pointer;
    }
    if (typeof window !== 'undefined' && window.__snakeHead) {
      return window.__snakeHead;
    }
    return pointer;
  }

  function aim() {
    const target = getActiveTarget();
    if (target) {
      aimAt(target);
    }
  }

  function hideGreeting() {
    if (greetingEl && greetingEl.classList) {
      greetingEl.classList.remove('visible');
    }
  }

  function initGreetingBubble() {
    if (typeof document === 'undefined' || !document.body) return;

    let existing = document.getElementById('mascotGreetingBubble');
    if (!existing && typeof document.createElement === 'function') {
      existing = document.createElement('div');
      existing.id = 'mascotGreetingBubble';
      existing.className = 'mascot-greeting-bubble';
      existing.innerHTML = `
        <button type="button" class="mascot-greeting-close" aria-label="Скрыть подсказку" title="Закрыть">✕</button>
        <div class="mascot-greeting-header">
          <span class="mascot-greeting-dot"></span>
          <span>Snake на связи!</span>
        </div>
        <div class="mascot-greeting-text">Привет! 👋 Если появятся вопросы по Python или коду — пиши, разберём вместе!</div>
      `;
      if (typeof document.body.appendChild === 'function') {
        document.body.appendChild(existing);
      }
    }

    greetingEl = existing;
    if (!greetingEl || typeof greetingEl.addEventListener !== 'function') return;

    greetingEl.addEventListener('click', (e) => {
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('.mascot-greeting-close')) {
        e.stopPropagation();
        hideGreeting();
        return;
      }
      hideGreeting();
      const activeChat = options.chat !== undefined ? options.chat : ((typeof window !== 'undefined' && window.mascotChat) || chat);
      if (activeChat && typeof activeChat.open === 'function') {
        activeChat.open();
      } else if (activeChat && typeof activeChat.toggle === 'function') {
        activeChat.toggle();
      }
    });

    const greetingTimer = setTimeout(() => {
      const activeChat = options.chat !== undefined ? options.chat : ((typeof window !== 'undefined' && window.mascotChat) || chat);
      if (activeChat && typeof activeChat.isOpen === 'function' && activeChat.isOpen()) return;
      if (greetingEl && greetingEl.classList) {
        greetingEl.classList.add('visible');
        setReaction('wink');
        playSquash();
        later(900, null);
      }
    }, 10000);
    if (greetingTimer && typeof greetingTimer.unref === 'function') {
      greetingTimer.unref();
    }
  }

  function boop() {
    clearTimers();

    const now = Date.now();
    boopState.count = (now - boopState.at < DIZZY_WINDOW) ? boopState.count + 1 : 1;
    boopState.at = now;

    if (boopState.count >= DIZZY_AFTER) {
      boopState.count = 0;
      setReaction('dizzy');
      later(DIZZY_END, null);
    } else {
      setReaction('blink');
      later(BOOP_PAYOFF, PAYOFFS[(boopState.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }

    playSquash();
  }

  function handleChatState(state) {
    clearTimers();
    switch (state) {
      case 'open':
        hideGreeting(true);
        setReaction('delighted');
        playSquash();
        break;
      case 'close':
        setReaction(null);
        setDirection(currentDir || 'center');
        break;
      case 'typing':
        setReaction('sparkle');
        break;
      case 'done':
        setReaction('heart');
        later(1200, null);
        break;
      case 'error':
        setReaction('surprised');
        later(1500, null);
        break;
    }
  }

  // Hook into mascotChat state events (use direct callback if chat instance exists, otherwise fallback to window event)
  if (chat) {
    chat.onStateChange = handleChatState;
  } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('mascot-chat-state', (e) => {
      if (e.detail?.state) {
        handleChatState(e.detail.state);
      }
    });
  }

  mascotBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hideGreeting(true);
    const activeChat = options.chat !== undefined ? options.chat : ((typeof window !== 'undefined' && window.mascotChat) || chat);
    if (activeChat && typeof activeChat.toggle === 'function') {
      activeChat.toggle();
    } else {
      boop();
    }
  });

  // Track pointer movements
  if (typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches) {
    window.addEventListener('pointermove', (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      lastPointerMoveAt = Date.now();
      aim();
    }, { passive: true });

    window.addEventListener('scroll', aim, { passive: true });
    window.addEventListener('resize', aim, { passive: true });
  }

  // Continuously track snake head when pointer is idle
  const intervalId = setInterval(() => {
    aim();
  }, 100);
  if (intervalId && typeof intervalId.unref === 'function') {
    intervalId.unref();
  }

  initGreetingBubble();

  return { boop, setReaction, setDirection, handleChatState, aim };
}

// Auto-init on DOMContentLoaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initMascot());
  } else {
    initMascot();
  }
}
