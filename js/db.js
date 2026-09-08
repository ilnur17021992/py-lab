// js/db.js - Persistent storage layer using IndexedDB (ES Module)
const DB_NAME = 'PythonWebIDE_DB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId() {
  return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

const DEFAULT_MAIN_PY = `# Добро пожаловать в Python Web IDE!
# Здесь вы можете писать многофайловые программы, импортировать модули и запускать код.

def greet(name: str) -> str:
    return f"Привет, {name}! Песочница готова к работе 🚀"

if __name__ == "__main__":
    message = greet("Разработчик")
    print(message)

    # Пример вычислений
    squares = [x**2 for x in range(1, 6)]
    print(f"Квадраты чисел 1..5: {squares}")
`;

export const db = {
  async getProjects() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_PROJECTS, 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const list = request.result || [];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async getProject(id) {
    if (!id) return null;
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_PROJECTS, 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  async saveProject(project) {
    if (!project || !project.id) throw new Error('Invalid project structure');
    project.updatedAt = Date.now();
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_PROJECTS, 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.put(project);

      request.onsuccess = () => resolve(project);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteProject(id) {
    if (!id) return;
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_PROJECTS, 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async createProject(name = 'Новый проект', initialFiles = null, customId = null) {
    const id = customId || generateId();
    const now = Date.now();
    const project = {
      id,
      name: name.trim() || 'Новый проект',
      createdAt: now,
      updatedAt: now,
      activeFile: '/main.py',
      openTabs: ['/main.py'],
      files: initialFiles || {
        '/main.py': DEFAULT_MAIN_PY
      }
    };
    await this.saveProject(project);
    return project;
  },

  async getOrCreateTopicProject(topicId, topicName, initialCode = null) {
    if (!topicId) throw new Error('topicId is required');
    const id = `topic_${topicId}`;
    let project = await this.getProject(id);
    if (!project) {
      const files = {
        '/main.py': (typeof initialCode === 'string' && initialCode.trim()) ? initialCode : DEFAULT_MAIN_PY
      };
      project = await this.createProject(topicName || `Урок: ${topicId}`, files, id);
    }
    return project;
  }
};
