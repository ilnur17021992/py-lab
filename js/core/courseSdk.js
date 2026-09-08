// js/core/courseSdk.js - Modular Course SDK & CourseService (Markdown Content-as-Data)
import { parseTopicMarkdown } from './markdownParser.js';

const STORAGE_KEY_COMPLETED = "learn_py_completed_topics";
const STORAGE_KEY_TOPIC_CODE_PREFIX = "learn_py_code_topic_";
const STORAGE_KEY_LAST_TOPIC = "learn_py_last_topic";

export class CourseService {
  constructor(options = {}) {
    this.manifestPath = options.manifestPath || 'content/manifest.json';
    this.topicsDir = options.topicsDir || 'content/topics';
    this.manifest = null;
    this.version = '1.0.0';
    this.topicCache = new Map();
    this.loadPromise = null;
  }

  async getManifest() {
    if (this.manifest) return this.manifest;
    try {
      const response = await fetch(`${this.manifestPath}?_t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
      }
      this.manifest = await response.json();
      this.version = this.manifest?.version || '1.0.0';
      return this.manifest;
    } catch (err) {
      console.error('CourseService.getManifest error:', err);
      return { topics: [] };
    }
  }

  async getTopic(id) {
    if (this.topicCache.has(id)) {
      return this.topicCache.get(id);
    }

    try {
      if (!this.manifest) {
        await this.getManifest();
      }
      const v = this.version ? `?v=${encodeURIComponent(this.version)}` : '';
      const response = await fetch(`${this.topicsDir}/${id}.md${v}`);
      if (!response.ok) {
        throw new Error(`Failed to load topic ${id}: ${response.status}`);
      }
      const markdownText = await response.text();
      const topic = parseTopicMarkdown(markdownText);
      this.topicCache.set(id, topic);
      return topic;
    } catch (err) {
      console.error(`CourseService.getTopic(${id}) error:`, err);
      return null;
    }
  }

  async getAllTopics() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const manifest = await this.getManifest();
      const topicList = (manifest && Array.isArray(manifest.topics)) ? manifest.topics : [];

      if (topicList.length === 0) {
        return [];
      }

      const v = this.version ? `?v=${encodeURIComponent(this.version)}` : '';
      const topicPromises = topicList.map(async (id) => {
        if (this.topicCache.has(id)) {
          return this.topicCache.get(id);
        }

        try {
          const res = await fetch(`${this.topicsDir}/${id}.md${v}`);
          if (res.ok) {
            const md = await res.text();
            const topic = parseTopicMarkdown(md);
            this.topicCache.set(id, topic);
            return topic;
          }
        } catch (e) {
          console.warn(`Could not load ${id}.md:`, e);
        }
        return null;
      });

      const loaded = await Promise.all(topicPromises);
      return loaded.filter(Boolean);
    })();

    return this.loadPromise;
  }
}

export class CourseSdk {
  constructor(topics = []) {
    this.topics = Array.isArray(topics) ? topics : [];
    this.service = new CourseService();
    this.isLoaded = false;
  }

  async init() {
    if (this.isLoaded && this.topics.length > 0) return this.topics;
    const loadedTopics = await this.service.getAllTopics();
    if (loadedTopics.length > 0) {
      this.topics = loadedTopics;
      this.isLoaded = true;
    }
    return this.topics;
  }

  setTopics(topics) {
    if (Array.isArray(topics)) {
      this.topics = topics;
      this.isLoaded = true;
    }
  }

  getTopics() {
    return this.topics;
  }

  async getTopicById(id) {
    const found = this.topics.find((t) => t.id === id);
    if (found) return found;
    return await this.service.getTopic(id);
  }

  searchTopics(query = '') {
    const q = String(query).trim().toLowerCase();
    const all = this.getTopics();
    if (!q) return all;

    return all.filter((topic) => {
      const matchTitle = topic.title && topic.title.toLowerCase().includes(q);
      const matchCategory = topic.category && topic.category.toLowerCase().includes(q);
      const matchSummary = Array.isArray(topic.summary) && topic.summary.some((s) => s.toLowerCase().includes(q));
      const matchTags = Array.isArray(topic.tags) && topic.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchCategory || matchSummary || matchTags;
    });
  }

  getCompletedTopicIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMPLETED);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  isTopicCompleted(id) {
    return this.getCompletedTopicIds().includes(id);
  }

  toggleTopicCompleted(id) {
    const completed = this.getCompletedTopicIds();
    const index = completed.indexOf(id);
    let isNowCompleted = false;

    if (index >= 0) {
      completed.splice(index, 1);
      isNowCompleted = false;
    } else {
      completed.push(id);
      isNowCompleted = true;
    }

    try {
      localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(completed));
    } catch (e) {
      console.warn('Failed to save progress to localStorage:', e);
    }

    return isNowCompleted;
  }

  getProgress() {
    const all = this.getTopics();
    const total = all.length;
    if (total === 0) return { completed: 0, total: 0, percentage: 0 };

    const completedIds = this.getCompletedTopicIds();
    const completedCount = all.filter((t) => completedIds.includes(t.id)).length;
    const percentage = Math.round((completedCount / total) * 100);

    return {
      completed: completedCount,
      total,
      percentage
    };
  }

  getSavedTopicCode(id) {
    try {
      return localStorage.getItem(STORAGE_KEY_TOPIC_CODE_PREFIX + id) || null;
    } catch {
      return null;
    }
  }

  saveTopicCode(id, code) {
    try {
      localStorage.setItem(STORAGE_KEY_TOPIC_CODE_PREFIX + id, code);
    } catch (e) {
      console.warn('Failed to save topic code:', e);
    }
  }

  clearSavedTopicCode(id) {
    try {
      localStorage.removeItem(STORAGE_KEY_TOPIC_CODE_PREFIX + id);
    } catch (e) {
      console.warn('Failed to clear saved topic code:', e);
    }
  }

  getLastActiveTopicId() {
    try {
      return localStorage.getItem(STORAGE_KEY_LAST_TOPIC);
    } catch {
      return null;
    }
  }

  setLastActiveTopicId(id) {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_TOPIC, id);
    } catch (e) {
      console.warn('Failed to set last active topic:', e);
    }
  }
}

export const courseSdk = new CourseSdk();
export const courseService = courseSdk.service;

if (typeof window !== 'undefined') {
  window.courseSdk = courseSdk;
  window.courseService = courseService;
}
