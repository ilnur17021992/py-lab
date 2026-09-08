// js/projectModal.js - Modal window for Project Management (ES Module)
import { db } from './db.js';
import { showConfirmModal, showAlertModal } from './utils/modalDialog.js';

class ProjectModalManager {
  constructor() {
    this.overlay = null;
    this.projectsListEl = null;
    this.createFormEl = null;
    this.projectNameInput = null;
    this.init();
  }

  init() {
    this.injectModalHTML();
    this.bindEvents();
  }

  injectModalHTML() {
    if (document.getElementById('sandboxModalOverlay')) return;

    const modalHTML = `
      <div id="sandboxModalOverlay" class="modal-overlay">
        <div class="sandbox-modal">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-icon">📦</span>
              <h3 class="modal-title">Изолированные песочницы Python</h3>
            </div>
            <button id="closeSandboxModalBtn" class="modal-close-btn" title="Закрыть">✕</button>
          </div>

          <div class="modal-body">
            <!-- Create Project Block -->
            <div class="create-project-card">
              <div class="create-project-label">Создать новый проект</div>
              <form id="createProjectForm" class="create-project-form">
                <input
                  type="text"
                  id="newProjectNameInput"
                  class="modal-input"
                  placeholder="Название проекта (например: Data Analyzer, Algorithm...)"
                  autocomplete="off"
                  required
                />
                <button type="submit" class="modal-btn-primary">
                  <span>＋</span> Создать и открыть
                </button>
              </form>
            </div>

            <!-- Existing Projects List -->
            <div>
              <div class="projects-section-title">Сохранённые проекты</div>
              <div id="sandboxProjectsList" class="projects-list">
                <div class="empty-projects-msg">Загрузка проектов...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.overlay = document.getElementById('sandboxModalOverlay');
    this.projectsListEl = document.getElementById('sandboxProjectsList');
    this.createFormEl = document.getElementById('createProjectForm');
    this.projectNameInput = document.getElementById('newProjectNameInput');
  }

  bindEvents() {
    const closeBtn = document.getElementById('closeSandboxModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    if (this.createFormEl) {
      this.createFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = this.projectNameInput.value.trim();
        if (!name) return;

        try {
          const newProject = await db.createProject(name);
          this.openProject(newProject.id);
        } catch (err) {
          showAlertModal({
            title: 'Ошибка',
            message: 'Ошибка при создании проекта: ' + err.message,
            type: 'error'
          });
        }
      });
    }

    // Attach to any sandbox open triggers on the page
    document.querySelectorAll('[data-open-sandbox-modal], #sandboxModalBtn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });

    // Hero Card "Открыть в IDE ↗" button
    const heroIdeBtn = document.getElementById('heroOpenFullIdeBtn');
    if (heroIdeBtn) {
      heroIdeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const currentCodeEl = document.getElementById('heroCodeSnippet');
        const currentCode = currentCodeEl ? currentCodeEl.textContent : '';

        try {
          if (currentCode && currentCode.trim()) {
            const proj = await db.createProject('Скрипт из справочника', {
              '/main.py': currentCode
            });
            this.openProject(proj.id);
          } else {
            this.open();
          }
        } catch (err) {
          this.open();
        }
      });
    }
  }

  isOpen() {
    return this.overlay && this.overlay.classList.contains('active');
  }

  async open() {
    await this.renderProjectsList();
    if (this.overlay) {
      this.overlay.classList.add('active');
    }
    setTimeout(() => {
      if (this.projectNameInput) this.projectNameInput.focus();
    }, 100);
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
  }

  async renderProjectsList() {
    try {
      const projects = await db.getProjects();

      // If no projects exist, create a starter demo project
      if (projects.length === 0) {
        const demo = await db.createProject('Первый проект (Demo)');
        projects.push(demo);
      }

      this.projectsListEl.innerHTML = '';

      projects.forEach(project => {
        const fileCount = Object.keys(project.files || {}).length;
        const dateStr = new Date(project.updatedAt || project.createdAt).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });

        const itemEl = document.createElement('div');
        itemEl.className = 'project-item';
        itemEl.innerHTML = `
          <div class="project-item-info">
            <div class="project-item-name">
              <span>🐍</span>
              <span>${this.escapeHtml(project.name)}</span>
            </div>
            <div class="project-item-meta">
              ${fileCount} ${fileCount === 1 ? 'файл' : (fileCount < 5 ? 'файла' : 'файлов')} • Изменен: ${dateStr}
            </div>
          </div>
          <div class="project-item-actions">
            <button class="project-item-btn open-btn" title="Открыть в IDE">Открыть ➔</button>
            <button class="project-item-btn delete-btn" title="Удалить проект">🗑</button>
          </div>
        `;

        itemEl.querySelector('.open-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.openProject(project.id);
        });

        itemEl.addEventListener('click', () => {
          this.openProject(project.id);
        });

        itemEl.querySelector('.delete-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          const confirmed = await showConfirmModal({
            title: 'Удаление проекта',
            message: `Удалить проект "${project.name}"? Это действие нельзя отменить.`,
            icon: '🗑️',
            confirmText: 'Удалить',
            cancelText: 'Отмена',
            isDanger: true
          });
          if (confirmed) {
            await db.deleteProject(project.id);
            await this.renderProjectsList();
          }
        });

        this.projectsListEl.appendChild(itemEl);
      });
    } catch (err) {
      this.projectsListEl.innerHTML = `<div class="empty-projects-msg">Ошибка загрузки: ${err.message}</div>`;
    }
  }

  openProject(projectId) {
    try {
      sessionStorage.setItem('learn_py_return_url', window.location.href);
    } catch (e) {}
    window.location.href = `ide.html?project=${encodeURIComponent(projectId)}`;
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
}

export const projectModal = new ProjectModalManager();
