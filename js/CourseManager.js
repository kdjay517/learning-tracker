// ============================================================
// CourseManager.js — Manages course colors & names
// ============================================================

class CourseManager {
  static PALETTE = [
    '#6c63ff','#ff6b9d','#00e5b5','#f5a623','#ff4d6d',
    '#22c55e','#3b82f6','#a855f7','#f97316','#14b8a6'
  ];

  constructor(courses) {
    // courses: [{ name, color }]
    this.courses = courses || [];
  }

  getColor(name) {
    const found = this.courses.find(c => c.name === name);
    if (found) return found.color;
    // Auto-assign a color based on hash
    const idx = Math.abs(CourseManager._hash(name)) % CourseManager.PALETTE.length;
    return CourseManager.PALETTE[idx];
  }

  add(name, color) {
    if (!name || this.courses.find(c => c.name === name)) return;
    const col = color || CourseManager.PALETTE[this.courses.length % CourseManager.PALETTE.length];
    this.courses.push({ name: name.trim(), color: col });
    this._persist();
  }

  updateColor(name, color) {
    const c = this.courses.find(c => c.name === name);
    if (c) { c.color = color; this._persist(); }
    else   { this.add(name, color); }
  }

  rename(oldName, newName) {
    const c = this.courses.find(c => c.name === oldName);
    if (c) { c.name = newName.trim(); this._persist(); }
  }

  delete(name) {
    this.courses = this.courses.filter(c => c.name !== name);
    this._persist();
  }

  syncFromAssignments(assignments) {
    assignments.forEach(a => {
      if (a.courseName && !this.courses.find(c => c.name === a.courseName)) {
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
