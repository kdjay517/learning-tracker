// ============================================================
// Assignment.js — OOP model for a single assignment
// ============================================================

class Assignment {
  static STATUS = { COMPLETED: 'Completed', IN_PROGRESS: 'In Progress', PENDING: 'Pending' };
  static PRIORITY = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
  static SUBMISSION = ['Physical Submission', 'Google Form', 'Email Submission', 'Online Upload'];

  constructor({ id, courseName, title, assignedDate, dueDate, status, priority, progress, submissionType, completedDate } = {}) {
    this.id = id || Date.now();
    this.courseName = courseName || '';
    this.title = title || '';
    this.assignedDate = assignedDate || '';
    this.dueDate = dueDate || '';
    this.status = status || Assignment.STATUS.PENDING;
    this.priority = priority || Assignment.STATUS.MEDIUM;
    this.progress = progress || 0;
    this.submissionType = submissionType || Assignment.SUBMISSION[0];
    this.completedDate = completedDate || '';
  }

  get daysLeft() {
    if (!this.dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(this.dueDate);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  get onTimeLate() {
    if (!this.completedDate || !this.dueDate) return '—';
    return new Date(this.completedDate) <= new Date(this.dueDate) ? 'On Time' : 'Late';
  }

  get priorityScore() {
    return { High: 3, Medium: 2, Low: 1 }[this.priority] || 0;
  }

  toJSON() {
    return {
      id: this.id, courseName: this.courseName, title: this.title,
      assignedDate: this.assignedDate, dueDate: this.dueDate,
      status: this.status, priority: this.priority, progress: this.progress,
      submissionType: this.submissionType, completedDate: this.completedDate
    };
  }

  static fromJSON(data) {
    return new Assignment(data);
  }
}
