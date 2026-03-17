class Assignment {
  static STATUS     = { COMPLETED: 'Completed', IN_PROGRESS: 'In Progress', PENDING: 'Pending' };
  static PRIORITY   = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  static SUBMISSION = ['Physical Submission', 'Google Form', 'Email Submission', 'Online Upload'];

  constructor({ id, courseName, title, assignedDate, dueDate, status, priority, progress,
                submissionType, completedDate, durationMins, durationHours, notes } = {}) {
    this.id             = id || Date.now();
    this.courseName     = courseName     || '';
    this.title          = title          || '';
    this.assignedDate   = assignedDate   || '';
    this.dueDate        = dueDate        || '';
    this.status         = status         || 'Pending';
    this.priority       = priority       || 'Medium';
    this.progress       = progress       || 0;
    this.submissionType = submissionType || Assignment.SUBMISSION[0];
    this.completedDate  = completedDate  || '';
    this.notes          = notes          || '';
    // Migrate old durationHours to single durationMins field
    // durationMins = total minutes (e.g. 90 = 1h 30m)
    if (durationMins !== undefined && durationMins !== '') {
      this.durationMins = parseInt(durationMins) || 0;
    } else if (durationHours !== undefined && durationHours !== '') {
      // Migrate old separate h field to total minutes
      this.durationMins = Math.round((parseFloat(durationHours)||0) * 60);
    } else {
      this.durationMins = 0;
    }
  }

  // e.g. 90 → "1h 30m", 45 → "45m", 120 → "2h"
  get durationLabel() {
    const total = parseInt(this.durationMins) || 0;
    if (!total) return '';
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h && m) return h + 'h ' + m + 'm';
    if (h)      return h + 'h';
    return m + 'm';
  }

  get durationTotalMins() {
    return parseInt(this.durationMins) || 0;
  }

  get daysLeft() {
    if (!this.dueDate) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(this.dueDate);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }

  get priorityScore() {
    return { High: 3, Medium: 2, Low: 1 }[this.priority] || 0;
  }

  toJSON() {
    return {
      id: this.id, courseName: this.courseName, title: this.title,
      assignedDate: this.assignedDate, dueDate: this.dueDate,
      status: this.status, priority: this.priority, progress: this.progress,
      submissionType: this.submissionType, completedDate: this.completedDate,
      durationMins: this.durationMins, notes: this.notes
    };
  }

  static fromJSON(data) { return new Assignment(data); }
}
