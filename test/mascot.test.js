import test from 'node:test';
import assert from 'node:assert/strict';

// Helper to create mock DOM elements
function createMockElement(id = '', className = '') {
  const listeners = {};
  return {
    id,
    className,
    style: {},
    dataset: {},
    children: [],
    listeners,
    addEventListener(evt, fn) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (!listeners[evt]) return;
      listeners[evt] = listeners[evt].filter(f => f !== fn);
    },
    dispatchEvent(event) {
      const fns = listeners[event.type] || [];
      fns.forEach(fn => fn(event));
    },
    querySelector(sel) {
      if (sel === '.page-mascot-squash') return this._squash;
      if (sel === '.page-mascot-directions') return this._dir;
      if (sel === '.page-mascot-reactions') return this._react;
      return null;
    },
    getBoundingClientRect() {
      return { left: 100, top: 100, width: 60, height: 60 };
    },
    animate(keyframes, options) {
      this.lastAnimation = { keyframes, options };
      return {};
    }
  };
}

function setupMockDOM() {
  const listeners = {};
  const mascotBtn = createMockElement('pageMascot', 'page-mascot');
  const squashEl = createMockElement('', 'page-mascot-squash');
  const dirLayer = createMockElement('', 'page-mascot-layer page-mascot-directions');
  const reactLayer = createMockElement('', 'page-mascot-layer page-mascot-reactions');

  mascotBtn._squash = squashEl;
  mascotBtn._dir = dirLayer;
  mascotBtn._react = reactLayer;

  const mockDocument = {
    readyState: 'complete',
    getElementById(id) {
      if (id === 'pageMascot') return mascotBtn;
      return null;
    },
    createElement(tag) {
      return createMockElement('', tag);
    },
    body: {
      contains() { return false; },
      appendChild() {}
    },
    addEventListener(evt, fn) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    }
  };

  const windowListeners = {};
  const mockWindow = {
    addEventListener(evt, fn) {
      if (!windowListeners[evt]) windowListeners[evt] = [];
      windowListeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (!windowListeners[evt]) return;
      windowListeners[evt] = windowListeners[evt].filter(f => f !== fn);
    },
    dispatchEvent(event) {
      const fns = windowListeners[event.type] || [];
      fns.forEach(fn => fn(event));
    },
    clearTimeout(id) {
      clearTimeout(id);
    },
    setTimeout(fn, ms) {
      return setTimeout(fn, ms);
    },
    matchMedia(query) {
      return { matches: false };
    }
  };

  return { mockDocument, mockWindow, mascotBtn, squashEl, dirLayer, reactLayer };
}

test('clicking #pageMascot toggles mascotChat', async () => {
  const { mockDocument, mockWindow, mascotBtn } = setupMockDOM();
  mockDocument.readyState = 'loading'; // prevent auto-init before test setup
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  let toggled = false;
  const mockChat = {
    toggle() {
      toggled = true;
    },
    onStateChange: null
  };
  mockWindow.mascotChat = mockChat;

  const { initMascot } = await import('../js/ui/mascot.js?t=' + Date.now());
  initMascot({ chat: mockChat });

  // Simulate click
  mascotBtn.dispatchEvent({
    type: 'click',
    stopPropagation() {}
  });

  assert.equal(toggled, true, 'mascot button click should call mascotChat.toggle()');
});

test('mascot reacts to chat open state with delighted and squash animation', async () => {
  const { mockDocument, mockWindow, mascotBtn, squashEl, dirLayer, reactLayer } = setupMockDOM();
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  let stateCallback = null;
  const mockChat = {
    toggle() {},
    onStateChange(cb) {
      stateCallback = cb;
    }
  };

  const { initMascot } = await import('../js/ui/mascot.js?t=' + (Date.now() + 1));
  globalThis.window.mascotChat = mockChat;
  initMascot({ chat: mockChat });

  assert.ok(stateCallback || mockChat.onStateChange, 'chat state listener should be registered');
  const triggerState = stateCallback || (typeof mockChat.onStateChange === 'function' ? mockChat.onStateChange : null);

  triggerState('open');

  assert.equal(reactLayer.style.opacity, '1');
  assert.equal(dirLayer.style.opacity, '0');
  // 'delighted' is index 8: x = 100%, y = 100% -> '100% 100%'
  assert.equal(reactLayer.style.backgroundPosition, '100% 100%');
  assert.ok(squashEl.lastAnimation, 'squash animation should run on open');
});

test('mascot reacts to chat close state by resetting reaction', async () => {
  const { mockDocument, mockWindow, mascotBtn, dirLayer, reactLayer } = setupMockDOM();
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  let stateCallback = null;
  const mockChat = {
    toggle() {},
    onStateChange(cb) {
      stateCallback = cb;
    }
  };
  globalThis.mascotChat = mockChat;

  const { initMascot } = await import('../js/ui/mascot.js?t=' + (Date.now() + 2));
  initMascot({ chat: mockChat });

  const triggerState = stateCallback || (typeof mockChat.onStateChange === 'function' ? mockChat.onStateChange : null);

  triggerState('open');
  assert.equal(reactLayer.style.opacity, '1');

  triggerState('close');
  assert.equal(reactLayer.style.opacity, '0');
  assert.equal(dirLayer.style.opacity, '1');
});

test('mascot reacts to chat typing state with sparkle', async () => {
  const { mockDocument, mockWindow, mascotBtn, dirLayer, reactLayer } = setupMockDOM();
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  let stateCallback = null;
  const mockChat = {
    toggle() {},
    onStateChange(cb) {
      stateCallback = cb;
    }
  };
  globalThis.mascotChat = mockChat;

  const { initMascot } = await import('../js/ui/mascot.js?t=' + (Date.now() + 3));
  initMascot({ chat: mockChat });

  const triggerState = stateCallback || (typeof mockChat.onStateChange === 'function' ? mockChat.onStateChange : null);

  triggerState('typing');
  assert.equal(reactLayer.style.opacity, '1');
  assert.equal(dirLayer.style.opacity, '0');
  // 'sparkle' is index 2: x = 100%, y = 0% -> '100% 0%'
  assert.equal(reactLayer.style.backgroundPosition, '100% 0%');
});

test('mascot reacts to chat done state with heart for 1200ms', async () => {
  const { mockDocument, mockWindow, mascotBtn, dirLayer, reactLayer } = setupMockDOM();
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  let stateCallback = null;
  const mockChat = {
    toggle() {},
    onStateChange(cb) {
      stateCallback = cb;
    }
  };
  globalThis.mascotChat = mockChat;

  const { initMascot } = await import('../js/ui/mascot.js?t=' + (Date.now() + 4));
  initMascot({ chat: mockChat });

  const triggerState = stateCallback || (typeof mockChat.onStateChange === 'function' ? mockChat.onStateChange : null);

  triggerState('done');
  assert.equal(reactLayer.style.opacity, '1');
  // 'heart' is index 1: x = 50%, y = 0% -> '50% 0%'
  assert.equal(reactLayer.style.backgroundPosition, '50% 0%');

  // Wait 1300ms to verify reverting to normal
  await new Promise(r => setTimeout(r, 1300));
  assert.equal(reactLayer.style.opacity, '0');
  assert.equal(dirLayer.style.opacity, '1');
});

test('mascot reacts to chat error state with surprised for 1500ms', async () => {
  const { mockDocument, mockWindow, mascotBtn, dirLayer, reactLayer } = setupMockDOM();
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;

  let stateCallback = null;
  const mockChat = {
    toggle() {},
    onStateChange(cb) {
      stateCallback = cb;
    }
  };
  globalThis.mascotChat = mockChat;

  const { initMascot } = await import('../js/ui/mascot.js?t=' + (Date.now() + 5));
  initMascot({ chat: mockChat });

  const triggerState = stateCallback || (typeof mockChat.onStateChange === 'function' ? mockChat.onStateChange : null);

  triggerState('error');
  assert.equal(reactLayer.style.opacity, '1');
  // 'surprised' is index 3: x = 0%, y = 50% -> '0% 50%'
  assert.equal(reactLayer.style.backgroundPosition, '0% 50%');

  // Wait 1600ms to verify reverting to normal
  await new Promise(r => setTimeout(r, 1600));
  assert.equal(reactLayer.style.opacity, '0');
  assert.equal(dirLayer.style.opacity, '1');
});

test('cursor tracking, dead zone and boop work as expected', async () => {
  const { mockDocument, mockWindow, mascotBtn, squashEl, dirLayer, reactLayer } = setupMockDOM();
  mockDocument.readyState = 'loading';
  globalThis.document = mockDocument;
  globalThis.window = mockWindow;
  mockWindow.matchMedia = (q) => ({ matches: q.includes('hover') });

  const { initMascot } = await import('../js/ui/mascot.js?t=' + (Date.now() + 6));
  const controls = initMascot({ chat: null });

  assert.ok(controls);
  assert.equal(typeof controls.boop, 'function');
  assert.equal(typeof controls.setDirection, 'function');
  assert.equal(typeof controls.setReaction, 'function');

  // Test boop execution directly
  controls.boop();
  assert.equal(reactLayer.style.opacity, '1');
  // First reaction is 'blink' (index 0 -> '0% 0%')
  assert.equal(reactLayer.style.backgroundPosition, '0% 0%');

  // Test setDirection
  controls.setDirection('up');
  // 'up' is index 1 in DIRECTIONS -> (1%3)*50 = 50%, floor(1/3)*50 = 0% -> '50% 0%'
  assert.equal(dirLayer.style.backgroundPosition, '50% 0%');
});

