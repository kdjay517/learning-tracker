class AssignmentManager {
  constructor(assignments) {
    this.assignments = assignments;
    this.editingId    = null;
    this.filterStatus   = 'All';
    this.filterPriority = 'All';
    this.sortKey        = 'dueDate';
    this.selectedIds    = new Set();
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
    this.selectedIds.delete(id);
    this._persist();
  }

  bulkDelete(ids) {
    this.assignments = this.assignments.filter(a => !ids.includes(a.id));
    ids.forEach(id => this.selectedIds.delete(id));
    this._persist();
  }

  bulkUpdateStatus(ids, status) {
    ids.forEach(id => {
      const a = this.assignments.find(a => a.id === id);
      if (a) {
        a.status = status;
        if (status === 'Completed') a.progress = 100;
      }
    });
    this._persist();
  }

  toggleSelect(id) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  selectAll(ids) { ids.forEach(id => this.selectedIds.add(id)); }
  clearSelection() { this.selectedIds.clear(); }

  getFiltered() {
    let list = [...this.assignments];
    if (this.filterStatus === 'Active') {
      list = list.filter(a => a.status !== 'Completed');
    } else if (this.filterStatus !== 'All') {
      list = list.filter(a => a.status === this.filterStatus);
    }
    if (this.filterPriority !== 'All') list = list.filter(a => a.priority === this.filterPriority);
    return list.sort((a, b) => {
      if (this.sortKey === 'priority') return b.priorityScore - a.priorityScore;
      if (this.sortKey === 'dueDate')  return (a.dueDate||'').localeCompare(b.dueDate||'');
      if (this.sortKey === 'status')   return a.status.localeCompare(b.status);
      if (this.sortKey === 'course')   return (a.courseName||'').localeCompare(b.courseName||'');
      return 0;
    });
  }

  get stats() {
    const total      = this.assignments.length;
    const completed  = this.assignments.filter(a => a.status === 'Completed').length;
    const inProgress = this.assignments.filter(a => a.status === 'In Progress').length;
    const pending    = this.assignments.filter(a => a.status === 'Pending').length;
    const high       = this.assignments.filter(a => a.priority === 'High').length;
    const medium     = this.assignments.filter(a => a.priority === 'Medium').length;
    const low        = this.assignments.filter(a => a.priority === 'Low').length;
    const courseCounts = {};
    this.assignments.forEach(a => {
      if (a.courseName) courseCounts[a.courseName] = (courseCounts[a.courseName]||0) + 1;
    });
    // Due this week
    const today = new Date(); today.setHours(0,0,0,0);
    const week  = new Date(today); week.setDate(today.getDate() + 7);
    const dueThisWeek = this.assignments.filter(a => {
      if (!a.dueDate || a.status === 'Completed') return false;
      const d = new Date(a.dueDate);
      return d >= today && d <= week;
    }).length;
    const overdue = this.assignments.filter(a => {
      if (!a.dueDate || a.status === 'Completed') return false;
      return new Date(a.dueDate) < today;
    }).length;
    return { total, completed, inProgress, pending, high, medium, low, courseCounts, dueThisWeek, overdue };
  }

  _persist() { Store.saveAssignments(this.assignments); }
}
