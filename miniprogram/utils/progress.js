function initialProgress() {
  return { lessonId: 'europe-01', step: 0, completed: false };
}

class ProgressStore {
  constructor(storage, learnerId) {
    if (typeof learnerId !== 'string' || !learnerId.trim()) {
      throw new TypeError('需要学习者标识');
    }
    this.storage = storage;
    this.key = `travel-mini:v1:${encodeURIComponent(learnerId)}`;
    this.warning = '';
  }

  read() {
    this.warning = '';
    try {
      const raw = this.storage.getItem(this.key);
      if (raw === null || raw === undefined || raw === '') return initialProgress();
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!value || value.version !== 1 || value.lessonId !== 'europe-01' ||
          ![0, 1].includes(value.step) || typeof value.completed !== 'boolean') {
        throw new Error('invalid progress');
      }
      return { lessonId: value.lessonId, step: value.step, completed: value.completed };
    } catch (error) {
      this.warning = '暂时读不到学习记录，你可以先看课程。';
      return initialProgress();
    }
  }

  write(value) {
    this.storage.setItem(this.key, JSON.stringify({ version: 1, ...value }));
    return value;
  }

  saveStep(step) {
    if (!Number.isInteger(step) || step < 0 || step > 1) {
      throw new RangeError('步骤超出范围');
    }
    return this.write({ ...this.read(), step });
  }

  complete() {
    return this.write({ ...this.read(), step: 1, completed: true });
  }
}

function createWxStorage(wxApi) {
  return {
    getItem(key) {
      const value = wxApi.getStorageSync(key);
      return value === '' ? null : value;
    },
    setItem(key, value) {
      wxApi.setStorageSync(key, value);
    }
  };
}

module.exports = { ProgressStore, createWxStorage, initialProgress };
