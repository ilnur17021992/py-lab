// js/ui/components/e2bSettingsModal.js - E2B Cloud Sandbox Settings Modal
import { state } from '../../state.js';
import { runnerManager } from '../../runner/runnerManager.js';
import { toast } from './toast.js';

export class E2BSettingsModal {
  constructor() {
    this.modalEl = null;
    this.isOpen = false;
    this.isTesting = false;
  }

  createModalElement() {
    if (this.modalEl) return this.modalEl;

    const modal = document.createElement('div');
    modal.id = 'e2bSettingsModal';
    modal.className = 'modal-backdrop e2b-settings-modal-backdrop';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="modal-card e2b-settings-card" role="dialog" aria-labelledby="e2bModalTitle" aria-modal="true">
        <div class="modal-header">
          <div class="modal-header-title-wrap">
            <span class="modal-header-badge-icon">☁️</span>
            <div>
              <h3 id="e2bModalTitle" class="modal-title">Настройки E2B Cloud Sandbox</h3>
              <p class="modal-subtitle">Изолированная Linux microVM (Firecracker) для запуска Python</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="e2bModalCloseBtn" title="Закрыть (Esc)">✕</button>
        </div>

        <div class="modal-body e2b-settings-body">
          <div class="e2b-info-banner">
            <span class="info-icon">💡</span>
            <div class="info-text">
              В облачном режиме E2B поддерживается установка <strong>любых пакетов через пакетный менеджер UV</strong>, работа с сетью, системные процессы и отсутствие ограничений браузера.
            </div>
          </div>

          <form id="e2bSettingsForm" onsubmit="return false;">
            <div class="form-group">
              <div class="form-label-row">
                <label for="e2bApiKeyInput" class="form-label">
                  API Ключ E2B
                  <span class="required-mark">*</span>
                </label>
                <a href="https://console.e2b.dev/?tab=keys" target="_blank" rel="noopener noreferrer" class="form-label-action-link" title="Открыть личный кабинет E2B для создания и копирования ключа">
                  Получить ключ -&gt;
                </a>
              </div>
              <div class="input-with-action">
                <input
                  type="password"
                  id="e2bApiKeyInput"
                  class="form-control e2b-key-input"
                  placeholder="e2b_..."
                  autocomplete="off"
                  spellcheck="false"
                >
                <button type="button" class="btn-input-action" id="e2bToggleKeyVisibilityBtn" title="Показать/скрыть ключ">
                  👁️
                </button>
              </div>
              <div class="form-hint">
                Бесплатный ключ можно получить в личном кабинете <a href="https://console.e2b.dev/?tab=keys" target="_blank" rel="noopener noreferrer">e2b.dev</a>. Ключ хранится локально в вашем браузере.
              </div>
            </div>

            <div class="form-group">
              <label for="e2bTimeoutSelect" class="form-label">
                Время жизни неактивной песочницы
              </label>
              <select id="e2bTimeoutSelect" class="form-control">
                <option value="0">Одноразовая (удалять сразу после запуска)</option>
                <option value="300000" selected>5 минут (рекомендуется)</option>
                <option value="600000">10 минут</option>
                <option value="900000">15 минут</option>
              </select>
              <div class="form-hint">
                В одноразовом режиме ВМ удаляется сразу после выполнения скрипта для максимальной экономии ресурсов.
              </div>
            </div>

            <div class="e2b-connection-test-section">
              <button type="button" id="e2bTestConnectionBtn" class="btn btn-secondary btn-test-connection">
                <span id="e2bTestBtnIcon">🔌</span>
                <span id="e2bTestBtnText">Проверить подключение</span>
              </button>
              <div id="e2bTestStatus" class="e2b-test-status" style="display: none;"></div>
            </div>
          </form>
        </div>

        <div class="ide-dialog-actions e2b-modal-actions">
          <button type="button" class="dialog-btn dialog-btn-cancel" id="e2bCancelBtn">Отмена</button>
          <button type="button" class="dialog-btn modal-btn-primary" id="e2bSaveBtn">Сохранить</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
    this.bindEvents();
    return modal;
  }

  bindEvents() {
    if (!this.modalEl) return;

    const closeBtn = this.modalEl.querySelector('#e2bModalCloseBtn');
    const cancelBtn = this.modalEl.querySelector('#e2bCancelBtn');
    const saveBtn = this.modalEl.querySelector('#e2bSaveBtn');
    const testBtn = this.modalEl.querySelector('#e2bTestConnectionBtn');
    const toggleKeyBtn = this.modalEl.querySelector('#e2bToggleKeyVisibilityBtn');
    const keyInput = this.modalEl.querySelector('#e2bApiKeyInput');

    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());
    saveBtn.addEventListener('click', () => this.save());

    toggleKeyBtn.addEventListener('click', () => {
      if (keyInput.type === 'password') {
        keyInput.type = 'text';
        toggleKeyBtn.textContent = '🔒';
      } else {
        keyInput.type = 'password';
        toggleKeyBtn.textContent = '👁️';
      }
    });

    testBtn.addEventListener('click', () => this.testConnection());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    this.modalEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  async testConnection() {
    if (this.isTesting) return;

    const keyInput = this.modalEl.querySelector('#e2bApiKeyInput');
    const statusDiv = this.modalEl.querySelector('#e2bTestStatus');
    const testBtnText = this.modalEl.querySelector('#e2bTestBtnText');
    const testBtnIcon = this.modalEl.querySelector('#e2bTestBtnIcon');
    const testBtn = this.modalEl.querySelector('#e2bTestConnectionBtn');

    const key = (keyInput.value || '').trim();
    if (!key) {
      statusDiv.style.display = 'block';
      statusDiv.className = 'e2b-test-status error';
      statusDiv.textContent = 'Введите API ключ перед проверкой';
      return;
    }

    this.isTesting = true;
    testBtn.disabled = true;
    testBtnIcon.textContent = '⏳';
    testBtnText.textContent = 'Проверка соединения...';
    statusDiv.style.display = 'block';
    statusDiv.className = 'e2b-test-status pending';
    statusDiv.textContent = 'Запуск тестовой Linux microVM на e2b.dev...';

    try {
      await runnerManager.testE2BConnection(key);
      statusDiv.className = 'e2b-test-status success';
      statusDiv.innerHTML = '✅ Подключение успешно! microVM E2B готова к работе.';
      testBtnIcon.textContent = '✅';
      testBtnText.textContent = 'Проверено';
    } catch (err) {
      statusDiv.className = 'e2b-test-status error';
      statusDiv.innerHTML = `❌ Ошибка подключения: ${err.message || err}`;
      testBtnIcon.textContent = '❌';
      testBtnText.textContent = 'Ошибка проверки';
    } finally {
      this.isTesting = false;
      testBtn.disabled = false;
    }
  }

  open() {
    this.createModalElement();

    const keyInput = this.modalEl.querySelector('#e2bApiKeyInput');
    const timeoutSelect = this.modalEl.querySelector('#e2bTimeoutSelect');
    const statusDiv = this.modalEl.querySelector('#e2bTestStatus');
    const testBtnText = this.modalEl.querySelector('#e2bTestBtnText');
    const testBtnIcon = this.modalEl.querySelector('#e2bTestBtnIcon');

    // Populate current values
    keyInput.value = state.getE2BApiKey();
    keyInput.type = 'password';
    this.modalEl.querySelector('#e2bToggleKeyVisibilityBtn').textContent = '👁️';

    const currentTimeout = state.getE2BTimeout();
    timeoutSelect.value = String(currentTimeout !== undefined && currentTimeout !== null ? currentTimeout : 300000);
    statusDiv.style.display = 'none';
    statusDiv.textContent = '';
    testBtnIcon.textContent = '🔌';
    testBtnText.textContent = 'Проверить подключение';

    this.modalEl.style.display = 'flex';
    this.isOpen = true;
    setTimeout(() => keyInput.focus(), 50);
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.style.display = 'none';
    this.isOpen = false;
  }

  save() {
    const keyInput = this.modalEl.querySelector('#e2bApiKeyInput');
    const timeoutSelect = this.modalEl.querySelector('#e2bTimeoutSelect');

    const key = (keyInput.value || '').trim();
    const rawTimeout = timeoutSelect.value;
    const timeout = rawTimeout !== '' && !isNaN(Number(rawTimeout)) ? Number(rawTimeout) : 300000;

    state.setE2BApiKey(key);
    state.setE2BTimeout(timeout);

    if (key) {
      toast.success('Настройки E2B сохранены');
    } else {
      toast.info('API ключ E2B удален');
    }

    this.close();
  }
}

export const e2bSettingsModal = new E2BSettingsModal();
