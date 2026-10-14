import test from 'node:test';
import assert from 'node:assert/strict';

// Mock DOM environment before importing
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.className = '';
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = {};
    this.innerHTML = '';
    this.eventListeners = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  classList = {
    add: (cls) => {
      const parts = new Set(this.className.split(' ').filter(Boolean));
      parts.add(cls);
      this.className = Array.from(parts).join(' ');
    },
    remove: (cls) => {
      const parts = new Set(this.className.split(' ').filter(Boolean));
      parts.delete(cls);
      this.className = Array.from(parts).join(' ');
    },
    contains: (cls) => {
      return this.className.split(' ').includes(cls);
    }
  };

  contains(child) {
    if (!child) return false;
    if (this.children.includes(child)) return true;
    return this.children.some(c => c.contains?.(child));
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  querySelector(selector) {
    if (selector === '.toast-close') {
      return {
        addEventListener: (event, fn) => {
          this.eventListeners[event] = fn;
        }
      };
    }
    return null;
  }

  querySelectorAll(selector) {
    if (selector === '.toast') {
      return this.children.filter(c => c.classList?.contains('toast'));
    }
    return [];
  }
}

class MockDocument {
  constructor() {
    this.body = new MockElement('body');
  }

  createElement(tagName) {
    return new MockElement(tagName);
  }

  querySelector(selector) {
    if (selector === '.toast-container') {
      return this.body.children.find(c => c.classList?.contains('toast-container')) || null;
    }
    return null;
  }
}

const originalDoc = globalThis.document;
const originalWin = globalThis.window;
const originalRAF = globalThis.requestAnimationFrame;

globalThis.document = new MockDocument();
globalThis.window = {
  innerWidth: 1024
};
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { toast } = await import('../js/ui/components/toast.js');

test('toast.show appends toast to container', () => {
  toast.show('Тестовое сообщение 1', 'info', 0);
  const container = document.querySelector('.toast-container');
  assert.ok(container, 'Container should exist');
  const toasts = container.querySelectorAll('.toast');
  assert.ok(toasts.length >= 1, 'Should have at least 1 toast');
});

test('toast.show on mobile (innerWidth <= 600) keeps only 1 toast at a time', () => {
  globalThis.window.innerWidth = 375; // mobile screen
  const container = document.querySelector('.toast-container');
  container.children = []; // reset container

  toast.show('Сообщение 1', 'info', 0);
  assert.equal(container.querySelectorAll('.toast').length, 1);

  toast.show('Сообщение 2', 'success', 0);
  assert.equal(container.querySelectorAll('.toast').length, 1, 'Should remove previous toast and have only 1 on mobile');

  toast.show('Сообщение 3', 'warning', 0);
  assert.equal(container.querySelectorAll('.toast').length, 1, 'Should still have only 1 toast on mobile');
  assert.ok(container.children[0].innerHTML.includes('Сообщение 3'));

  globalThis.window.innerWidth = 1024; // restore
});
