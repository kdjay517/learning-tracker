// ============================================================
// Habit.js — OOP model for a single habit
// ============================================================

class Habit {
  constructor({ id, name, completions } = {}) {
    this.id = id || Date.now();
    this.name = name || '';
    // completions: { 'YYYY-MM-DD': true/false }
    this.completions = completions || {};
  }

  toggle(dateStr) {
    this.completions[dateStr] = !this.completions[dateStr];
  }

  isCompleted(dateStr) {
    return !!this.completions[dateStr];
  }

  getMonthCompletions(year, month) {
    const days = new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const key = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (this.completions[key]) count++;
    }
    return { completed: count, total: days, rate: days ? count / days : 0 };
  }

  get completionRate() {
    const keys = Object.keys(this.completions);
    if (!keys.length) return 0;
    const done = keys.filter(k => this.completions[k]).length;
    return done / keys.length;
  }

  toJSON() {
    return { id: this.id, name: this.name, completions: { ...this.completions } };
  }

  static fromJSON(data) {
    return new Habit(data);
  }
}
