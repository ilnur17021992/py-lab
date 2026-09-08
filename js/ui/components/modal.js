// js/ui/components/modal.js - Accessible Modal Base & Focus Trap Utility

/**
 * Traps keyboard focus inside a modal element.
 * @param {HTMLElement} element - Container element of the dialog
 * @returns {() => void} Cleanup function to restore focus and remove event listeners
 */
export function trapFocus(element) {
  const previouslyFocused = document.activeElement;
  const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusableElements() {
    return Array.from(element.querySelectorAll(focusableSelector)).filter(
      (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
    );
  }

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl || !element.contains(document.activeElement)) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (document.activeElement === lastEl || !element.contains(document.activeElement)) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }

  element.addEventListener('keydown', handleKeyDown);

  // Initial focus
  requestAnimationFrame(() => {
    const focusable = getFocusableElements();
    const initialFocus = focusable.find((el) => el.hasAttribute('autofocus')) || focusable[0];
    if (initialFocus) {
      initialFocus.focus();
    } else {
      element.setAttribute('tabindex', '-1');
      element.focus();
    }
  });

  return function cleanup() {
    element.removeEventListener('keydown', handleKeyDown);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try {
        previouslyFocused.focus();
      } catch {
        // Element might be detached
      }
    }
  };
}

/**
 * Escapes HTML strings to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
