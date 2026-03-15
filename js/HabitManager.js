// ============================================================
// HabitManager.js — Controller for habit tracker tab
// ============================================================

class HabitManager {
  constructor(habits) {
    this.habits = habits;
    this.viewYear = new Date().getFullYear();
    this.viewMonth = new Date().getMonth() + 1; // 1-12
  }

  addHabit(name) {
    const h = new Habit({ id: Date.now(), name });
    this.habits.push(h);
    this._persist();
    return h;
  }

  deleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    this._persist();
  }

  renameHabit(id, newName) {
    const h = this.habits.find(h => h.id === id);
    if (h) { h.name = newName; this._persist(); }
  }

  toggle(habitId, dateStr) {
    const h = this.habits.find(h => h.id === habitId);
    if (h) { h.toggle(dateStr); this._persist(); }
  }

  get daysInView() {
    return new Date(this.viewYear, this.viewMonth, 0).getDate();
  }

  getDayStats(dateStr) {
    const done = this.habits.filter(h => h.isCompleted(dateStr)).length;
    return { done, total: this.habits.length };
  }

  getMonthOverview() {
    // returns array of { date, done, total, pct } for each day this month
    const days = this.daysInView;
    const result = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = `${this.viewYear}-${String(this.viewMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const { done } = this.getDayStats(dateStr);
      result.push({ date: d, dateStr, done, total: this.habits.length, pct: this.habits.length ? done / this.habits.length : 0 });
    }
    return result;
  }

  getTopHabits() {
    return [...this.habits]
      .map(h => ({ habit: h, rate: h.getMonthCompletions(this.viewYear, this.viewMonth).rate }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);
  }

  get overallStats() {
    const days = this.daysInView;
    let completed = 0, total = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${this.viewYear}-${String(this.viewMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const s = this.getDayStats(dateStr);
      completed += s.done;
      total += s.total;
    }
    return { completed, total, left: total - completed };
  }

  prevMonth() {
    if (this.viewMonth === 1) { this.viewMonth = 12; this.viewYear--; }
    else this.viewMonth--;
  }

  nextMonth() {
    if (this.viewMonth === 12) { this.viewMonth = 1; this.viewYear++; }
    else this.viewMonth++;
  }

  _persist() {
    Store.saveHabits(this.habits);
  }
}
