// ============================================================
// AssignmentUI.js — Renders the Assignment tab
// ============================================================

class AssignmentUI {
  constructor(manager) {
    this.manager = manager;
    this._bindControls();
  }

  _bindControls() {
    document.getElementById('aFilterStatus').addEventListener('change', e => {
      this.manager.filterStatus = e.target.value; this.render();
    });
    document.getElementById('aFilterPriority').addEventListener('change', e => {
      this.manager.filterPriority = e.target.value; this.render();
    });
    document.getElementById('aSortKey').addEventListener('change', e => {
      this.manager.sortKey = e.target.value; this.render();
    });
    document.getElementById('aAddBtn').addEventListener('click', () => this.openModal());
    document.getElementById('aModalForm').addEventListener('submit', e => this._handleSubmit(e));
    document.getElementById('aModalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('aModalOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeModal();
    });
  }

  render() {
    this._renderStats();
    this._renderTable();
  }

  _renderStats() {
    const s = this.manager.stats;
    document.getElementById('aStatTotal').textContent = s.total;
    document.getElementById('aStatCompleted').textContent = s.completed;
    document.getElementById('aStatProgress').textContent = s.inProgress;
    document.getElementById('aStatPending').textContent = s.pending;

    const pct = s.total ? Math.round((s.completed / s.total) * 100) : 0;
    document.getElementById('aProgressBar').style.width = pct + '%';
    document.getElementById('aProgressPct').textContent = pct + '%';

    // Priority breakdown
    document.getElementById('aPriorityHigh').textContent = s.high;
    document.getElementById('aPriorityMedium').textContent = s.medium;
    document.getElementById('aPriorityLow').textContent = s.low;

    // Course counts
    const courseContainer = document.getElementById('aCourseList');
    courseContainer.innerHTML = Object.entries(s.courseCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `
        <div class="course-tag">
          <span class="course-name">${name}</span>
          <span class="course-count">${count}</span>
        </div>`).join('');
  }

  _renderTable() {
    const tbody = document.getElementById('aTableBody');
    const items = this.manager.getFiltered();
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="empty-row">No assignments found.</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((a, i) => {
      const daysLeft = a.daysLeft;
      let daysLabel = '—';
      let daysClass = '';
      if (daysLeft !== null) {
        if (daysLeft < 0) { daysLabel = `${Math.abs(daysLeft)}d overdue`; daysClass = 'overdue'; }
        else if (daysLeft === 0) { daysLabel = 'Due today'; daysClass = 'due-today'; }
        else { daysLabel = `${daysLeft}d left`; daysClass = daysLeft <= 3 ? 'due-soon' : ''; }
      }
      return `
      <tr class="anim-row" style="animation-delay:${i * 0.04}s">
        <td><span class="row-num">${i + 1}</span></td>
        <td class="course-cell">${a.courseName || '<span class="muted">—</span>'}</td>
        <td class="title-cell">${a.title}</td>
        <td>${a.assignedDate || '—'}</td>
        <td>${a.dueDate || '—'}</td>
        <td><span class="days-badge ${daysClass}">${daysLabel}</span></td>
        <td><span class="status-badge status-${a.status.replace(' ', '-').toLowerCase()}">${a.status}</span></td>
        <td><span class="priority-badge priority-${a.priority.toLowerCase()}">${a.priority}</span></td>
        <td>
          <div class="progress-cell">
            <div class="mini-bar"><div class="mini-fill" style="width:${a.progress}%"></div></div>
            <span>${a.progress}%</span>
          </div>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon edit-btn" onclick="app.editAssignment(${a.id})" title="Edit">✏️</button>
            <button class="btn-icon del-btn" onclick="app.deleteAssignment(${a.id})" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  openModal(assignment = null) {
    const form = document.getElementById('aModalForm');
    const title = document.getElementById('aModalTitle');
    form.reset();
    if (assignment) {
      title.textContent = 'Edit Assignment';
      this.manager.editingId = assignment.id;
      form.aCourseName.value = assignment.courseName;
      form.aTitle.value = assignment.title;
      form.aAssignedDate.value = assignment.assignedDate;
      form.aDueDate.value = assignment.dueDate;
      form.aStatus.value = assignment.status;
      form.aPriority.value = assignment.priority;
      form.aProgress.value = assignment.progress;
      form.aSubmission.value = assignment.submissionType;
      form.aCompletedDate.value = assignment.completedDate;
    } else {
      title.textContent = 'Add Assignment';
      this.manager.editingId = null;
    }
    document.getElementById('aModalOverlay').classList.add('active');
  }

  closeModal() {
    document.getElementById('aModalOverlay').classList.remove('active');
    this.manager.editingId = null;
  }

  _handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      courseName: form.aCourseName.value.trim(),
      title: form.aTitle.value.trim(),
      assignedDate: form.aAssignedDate.value,
      dueDate: form.aDueDate.value,
      status: form.aStatus.value,
      priority: form.aPriority.value,
      progress: parseInt(form.aProgress.value) || 0,
      submissionType: form.aSubmission.value,
      completedDate: form.aCompletedDate.value,
    };
    if (this.manager.editingId) {
      this.manager.update(this.manager.editingId, data);
    } else {
      this.manager.add(data);
    }
    this.closeModal();
    this.render();
  }
}
