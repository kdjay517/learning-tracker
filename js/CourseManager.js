class CourseManager {
  static PALETTE = [
    '#6c63ff','#ff6b9d','#00e5b5','#f5a623','#ff4d6d',
    '#22c55e','#3b82f6','#a855f7','#f97316','#14b8a6'
  ];

  constructor(courses) {
    this.courses  = courses || [];
    this._deleted = new Set();
  }

  getColor(name) {
    const found = this.courses.find(c => c.name === name);
    if (found) return found.color;
    const idx = Math.abs(CourseManager._hash(name)) % CourseManager.PALETTE.length;
    return CourseManager.PALETTE[idx];
  }

  getCourse(name) {
    return this.courses.find(c => c.name === name) || null;
  }

  add(name, color) {
    if (!name || this.courses.find(c => c.name === name)) return;
    const col = color || CourseManager.PALETTE[this.courses.length % CourseManager.PALETTE.length];
    this.courses.push({ name: name.trim(), color: col, durationMins: 0, completion: 'Not Started' });
    this._deleted.delete(name.trim());
    this._persist();
  }

  updateColor(name, color) {
    const c = this.courses.find(c => c.name === name);
    if (c) { c.color = color; this._persist(); }
    else   { this.add(name, color); }
  }

  updateDuration(name, totalMins) {
    const c = this.courses.find(c => c.name === name);
    if (c) { c.durationMins = parseInt(totalMins)||0; this._persist(); }
  }

  getDurationLabel(name) {
    const c = this.courses.find(c => c.name === name);
    const total = (c && c.durationMins) ? parseInt(c.durationMins)||0 : 0;
    if (!total) return '';
    const h = Math.floor(total/60), m = total%60;
    if (h && m) return h+'h '+m+'m';
    if (h) return h+'h';
    return m+'m';
  }

  updateCompletion(name, status) {
    const c = this.courses.find(c => c.name === name);
    if (c) { c.completion = status; this._persist(); }
  }

  rename(oldName, newName) {
    const c = this.courses.find(c => c.name === oldName);
    if (c) { c.name = newName.trim(); this._persist(); }
  }

  delete(name) {
    this.courses = this.courses.filter(c => c.name !== name);
    this._deleted.add(name);
    this._persist();
  }

  syncFromAssignments(assignments) {
    assignments.forEach(a => {
      if (a.courseName && !this._deleted.has(a.courseName) && !this.courses.find(c => c.name === a.courseName)) {
        this.add(a.courseName);
      }
    });
  }

  _persist() { Store.saveCourses(this.courses); }

  static _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return h;
  }
}
