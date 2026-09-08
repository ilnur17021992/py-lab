// js/ui/components/dialogs.js - Theme-Styled Accessible Modal Dialogs
import { trapFocus, escapeHtml } from './modal.js';

let dialogCount = 0;

/**
 * Shows an accessible confirmation modal dialog.
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export function showConfirmDialog({
  title = 'Подтверждение',
  message = 'Вы уверены, что хотите продолжить?',
  icon = '⚠️',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  isDanger = true
} = {}) {
  return new Promise((resolve) => {
    const dialogId = `dialog-title-${++dialogCount}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.setAttribute('role', 'presentation');

    const btnClass = isDanger ? 'modal-btn-danger' : 'modal-btn-primary';

    overlay.innerHTML = `
      <div class="ide-dialog-card" role="dialog" aria-modal="true" aria-labelledby="${dialogId}">
        <div class="ide-dialog-header">
          <h4 class="ide-dialog-title" id="${dialogId}">
            <span aria-hidden="true">${icon}</span>
            <span>${escapeHtml(title)}</span>
          </h4>
          <button type="button" class="modal-close-btn close-dialog-btn" title="Закрыть (Esc)" aria-label="Закрыть">✕</button>
        </div>
        <div class="ide-dialog-body">
          <div class="ide-dialog-message">${message}</div>
          <div class="ide-dialog-actions">
            <button type="button" class="modal-btn modal-btn-secondary dialog-btn-cancel">${escapeHtml(cancelText)}</button>
            <button type="button" class="modal-btn ${btnClass} confirm-btn" autofocus>${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const dialogCard = overlay.querySelector('.ide-dialog-card');
    const closeBtn = overlay.querySelector('.close-dialog-btn');
    const cancelBtn = overlay.querySelector('.dialog-btn-cancel');
    const confirmBtn = overlay.querySelector('.confirm-btn');

    const cleanupTrap = trapFocus(dialogCard);

    let isDone = false;
    const cleanup = (confirmed) => {
      if (isDone) return;
      isDone = true;
      document.removeEventListener('keydown', onKeyDown);
      cleanupTrap();
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
      resolve(confirmed);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Enter' && document.activeElement !== cancelBtn && document.activeElement !== closeBtn) {
        e.preventDefault();
        cleanup(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    closeBtn.addEventListener('click', () => cleanup(false));
    cancelBtn.addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/**
 * Shows an accessible alert modal dialog.
 * @param {Object} options
 * @returns {Promise<void>}
 */
export function showAlertDialog({
  title = 'Внимание',
  message = '',
  icon = 'ℹ️',
  okText = 'Понятно',
  type = 'info'
} = {}) {
  return new Promise((resolve) => {
    const dialogId = `dialog-title-${++dialogCount}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.setAttribute('role', 'presentation');

    const defaultIcon = icon || (type === 'error' ? '❌' : 'ℹ️');
    const btnClass = type === 'error' ? 'modal-btn-danger' : 'modal-btn-primary';

    overlay.innerHTML = `
      <div class="ide-dialog-card" role="dialog" aria-modal="true" aria-labelledby="${dialogId}">
        <div class="ide-dialog-header">
          <h4 class="ide-dialog-title" id="${dialogId}">
            <span aria-hidden="true">${defaultIcon}</span>
            <span>${escapeHtml(title)}</span>
          </h4>
          <button type="button" class="modal-close-btn close-dialog-btn" title="Закрыть (Esc)" aria-label="Закрыть">✕</button>
        </div>
        <div class="ide-dialog-body">
          <div class="ide-dialog-message">${message}</div>
          <div class="ide-dialog-actions">
            <button type="button" class="modal-btn ${btnClass} alert-ok-btn" autofocus>${escapeHtml(okText)}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const dialogCard = overlay.querySelector('.ide-dialog-card');
    const okBtn = overlay.querySelector('.alert-ok-btn');
    const closeBtn = overlay.querySelector('.close-dialog-btn');

    const cleanupTrap = trapFocus(dialogCard);

    let isDone = false;
    const cleanup = () => {
      if (isDone) return;
      isDone = true;
      document.removeEventListener('keydown', onKeyDown);
      cleanupTrap();
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
      resolve();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        cleanup();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    okBtn.addEventListener('click', cleanup);
    closeBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup();
    });
  });
}

/**
 * Shows an accessible prompt/input modal dialog.
 * @param {Object} options
 * @returns {Promise<string|null>}
 */
export function showPromptDialog({
  title = 'Ввод данных',
  icon = '📄',
  message = '',
  placeholder = '',
  defaultValue = '',
  submitText = 'Подтвердить',
  cancelText = 'Отмена'
} = {}) {
  return new Promise((resolve) => {
    const dialogId = `dialog-title-${++dialogCount}`;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.setAttribute('role', 'presentation');

    overlay.innerHTML = `
      <div class="ide-dialog-card" role="dialog" aria-modal="true" aria-labelledby="${dialogId}">
        <div class="ide-dialog-header">
          <h4 class="ide-dialog-title" id="${dialogId}">
            <span aria-hidden="true">${icon}</span>
            <span>${escapeHtml(title)}</span>
          </h4>
          <button type="button" class="modal-close-btn close-dialog-btn" title="Закрыть (Esc)" aria-label="Закрыть">✕</button>
        </div>
        <form class="ide-dialog-form">
          <div class="ide-dialog-body">
            ${message ? `<div class="ide-dialog-message">${message}</div>` : ''}
            <input type="text" class="ide-dialog-input" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" autofocus required>
            <div class="ide-dialog-actions">
              <button type="button" class="modal-btn modal-btn-secondary dialog-btn-cancel">${escapeHtml(cancelText)}</button>
              <button type="submit" class="modal-btn modal-btn-primary">${escapeHtml(submitText)}</button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const dialogCard = overlay.querySelector('.ide-dialog-card');
    const input = overlay.querySelector('.ide-dialog-input');
    const form = overlay.querySelector('.ide-dialog-form');
    const closeBtn = overlay.querySelector('.close-dialog-btn');
    const cancelBtn = overlay.querySelector('.dialog-btn-cancel');

    const cleanupTrap = trapFocus(dialogCard);

    let isDone = false;
    const cleanup = (val) => {
      if (isDone) return;
      isDone = true;
      document.removeEventListener('keydown', onKeyDown);
      cleanupTrap();
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
      resolve(val);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      cleanup(input.value.trim());
    });

    closeBtn.addEventListener('click', () => cleanup(null));
    cancelBtn.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });

    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  });
}

// Aliases for 100% backward compatibility with modalDialog.js
export const showConfirmModal = showConfirmDialog;
export const showAlertModal = showAlertDialog;
export const showPromptModal = showPromptDialog;

// Global fallback for any non-module callers
if (typeof window !== 'undefined') {
  window.showConfirmDialog = showConfirmDialog;
  window.showAlertDialog = showAlertDialog;
  window.showPromptDialog = showPromptDialog;
  window.showConfirmModal = showConfirmDialog;
  window.showAlertModal = showAlertDialog;
  window.showPromptModal = showPromptDialog;
}
