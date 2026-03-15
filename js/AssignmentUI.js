// ============================================================
// AssignmentUI.js — Renders the Assignment tab
// Columns: Course, Title, Assigned Date, Due Date, Status, Priority
// are all inline-editable directly in the table row.
// Actions column has only Delete button.
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

    document.getElementById('aPriorityHigh').textContent = s.high;
    document.getElementById('aPriorityMedium').textContent = s.medium;
    document.getElementById('aPriorityLow').textContent = s.low;

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
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No assignments found.</td></tr>`;
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
      <tr class="anim-row" style="animation-delay:${i * 0.04}s" data-id="${a.id}">
        <td><span class="row-num">${i + 1}</span></td>

        <!-- Editable: Course Name -->
        <td>
          <input class="inline-input" type="text" value="${a.courseName || ''}"
            placeholder="Course…"
            onblur="app.assignmentUI.saveField(${a.id}, 'courseName', this.value)"
            onkeydown="if(event.key==='Enter') this.blur()" />
        </td>

        <!-- Editable: Title -->
        <td>
          <input class="inline-input title-input" type="text" value="${a.title}"
            placeholder="Title…"
            onblur="app.assignmentUI.saveField(${a.id}, 'title', this.value)"
            onkeydown="if(event.key==='Enter') this.blur()" />
        </td>

        <!-- Editable: Assigned Date -->
        <td>
          <input class="inline-input inline-date" type="date" value="${a.assignedDate || ''}"
            onchange="app.assignmentUI.saveField(${a.id}, 'assignedDate', this.value)" />
        </td>

        <!-- Editable: Due Date -->
        <td>
          <input class="inline-input inline-date" type="date" value="${a.dueDate || ''}"
            onchange="app.assignmentUI.saveField(${a.id}, 'dueDate', this.value)" />
        </td>

        <!-- Days Left (computed, read-only) -->
        <td><span class="days-badge ${daysClass}">${daysLabel}</span></td>

        <!-- Editable: Status -->
        <td>
          <select class="inline-select status-select status-${a.status.replace(' ','-').toLowerCase()}"
            onchange="app.assignmentUI.saveField(${a.id}, 'status', this.value); this.className='inline-select status-select status-'+this.value.replace(' ','-').toLowerCase();">
            <option ${a.status==='Pending'?'selected':''}>Pending</option>
            <option ${a.status==='In Progress'?'selected':''}>In Progress</option>
            <option ${a.status==='Completed'?'selected':''}>Completed</option>
          </select>
        </td>

        <!-- Editable: Priority -->
        <td>
          <select class="inline-select priority-select priority-${a.priority.toLowerCase()}"
            onchange="app.assignmentUI.saveField(${a.id}, 'priority', this.value); this.className='inline-select priority-select priority-'+this.value.toLowerCase();">
            <option ${a.priority==='High'?'selected':''}>High</option>
            <option ${a.priority==='Medium'?'selected':''}>Medium</option>
            <option ${a.priority==='Low'?'selected':''}>Low</option>
          </select>
        </td>

        <!-- Progress (read-only) -->
        <td>
          <div class="progress-cell">
            <div class="mini-bar"><div class="mini-fill" style="width:${a.progress}%"></div></div>
            <span>${a.progress}%</span>
          </div>
        </td>

        <!-- Actions: Delete only -->
        <td>
          <div class="action-btns">
            <button class="btn-icon del-btn" onclick="app.deleteAssignment(${a.id})" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // Called by inline onblur / onchange handlers to persist a single field
  saveField(id, field, value) {
    const update = {};
    update[field] = field === 'progress' ? parseInt(value) || 0 : value;
    this.manager.update(id, update);
    // Re-render stats (counts may change) but avoid full table re-render
    // so the user doesn't lose focus mid-typing
    this._renderStats();
    // Re-render days-left badge for the changed row without full table redraw
    if (field === 'dueDate' || field === 'status' || field === 'priority') {
      this._renderTable();
    }
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
