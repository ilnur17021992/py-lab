// js/ui/components/toast.js - Unified Accessible Toast Notifications System
import { escapeHtml } from './modal.js';

class ToastManager {
  constructor() {
    this.container = null;
  }

  ensureContainer() {
    if (!this.container || !document.body.contains(this.container)) {
      this.container = document.querySelector('.toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'Уведомления');
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  /**
   * Shows a toast notification.
   * @param {string} message
   * @param {'info' | 'success' | 'warning' | 'error'} [type='info']
   * @param {number} [duration=3500]
   */
  show(message, type = 'info', duration = 3500) {
    const container = this.ensureContainer();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    const icon = icons[type] || 'ℹ';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button type="button" class="toast-close" title="Закрыть" aria-label="Закрыть">✕</button>
    `;

    container.appendChild(toast);

    // Trigger slide-in animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    let dismissTimer = null;
    const dismiss = () => {
      if (dismissTimer) clearTimeout(dismissTimer);
      toast.classList.remove('toast-visible');
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 250);
    };

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', dismiss);

    if (duration > 0) {
      dismissTimer = setTimeout(dismiss, duration);
    }

    return dismiss;
  }

  success(message, duration = 3500) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 4500) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 3500) {
    return this.show(message, 'info', duration);
  }
}

export const toast = new ToastManager();

if (typeof window !== 'undefined') {
  window.toast = toast;
}
