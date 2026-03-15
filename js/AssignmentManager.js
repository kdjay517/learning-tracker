// ============================================================
// AssignmentManager.js — Controller for assignment tab
// ============================================================

class AssignmentManager {
  constructor(assignments) {
    this.assignments = assignments;
    this.editingId = null;
    this.filterStatus = 'All';
    this.filterPriority = 'All';
    this.sortKey = 'dueDate';
  }

  add(data) {
    const a = new Assignment({ ...data, id: Date.now() });
    this.assignments.push(a);
    this._persist();
    return a;
  }

  update(id, data) {
    const idx = this.assignments.findIndex(a => a.id === id);
    if (idx === -1) return;
    Object.assign(this.assignments[idx], data);
    this._persist();
  }

  delete(id) {
    this.assignments = this.assignments.filter(a => a.id !== id);
    this._persist();
  }

  getFiltered() {
    return this.assignments
      .filter(a => this.filterStatus === 'All' || a.status === this.filterStatus)
      .filter(a => this.filterPriority === 'All' || a.priority === this.filterPriority)
      .sort((a, b) => {
        if (this.sortKey === 'priority') return b.priorityScore - a.priorityScore;
        if (this.sortKey === 'dueDate') return (a.dueDate || '').localeCompare(b.dueDate || '');
        if (this.sortKey === 'status') return a.status.localeCompare(b.status);
        return 0;
      });
  }

  get stats() {
    const total = this.assignments.length;
    const completed = this.assignments.filter(a => a.status === 'Completed').length;
    const inProgress = this.assignments.filter(a => a.status === 'In Progress').length;
    const pending = this.assignments.filter(a => a.status === 'Pending').length;
    const high = this.assignments.filter(a => a.priority === 'High').length;
    const medium = this.assignments.filter(a => a.priority === 'Medium').length;
    const low = this.assignments.filter(a => a.priority === 'Low').length;
    const courseCounts = {};
    this.assignments.forEach(a => {
      if (a.courseName) courseCounts[a.courseName] = (courseCounts[a.courseName] || 0) + 1;
    });
    return { total, completed, inProgress, pending, high, medium, low, courseCounts };
  }

  _persist() {
    Store.saveAssignments(this.assignments);
  }
}
