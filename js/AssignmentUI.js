// ============================================================
// AssignmentUI.js — Renders the Assignment tab
// Course column uses a custom autocomplete dropdown.
// If a course isn't in the list the user can type and add it.
// Actions column has only Delete button.
// ============================================================

class AssignmentUI {
  constructor(manager) {
    this.manager = manager;
    this._activeDropdown = null; // tracks open dropdown DOM node
    this._bindControls();
    // Close any open dropdown when clicking outside
    document.addEventListener('click', e => {
      if (this._activeDropdown && !this._activeDropdown.contains(e.target)) {
        this._closeDropdown(this._activeDropdown);
      }
    });
  }

  // ── Returns deduplicated, sorted list of all course names in use ──
  _getCourseList() {
    const names = this.manager.assignments
      .map(a => a.courseName && a.courseName.trim())
      .filter(Boolean);
    return [...new Set(names)].sort();
  }

  // ── Build the custom course autocomplete widget HTML ──
  _courseCell(assignmentId, currentValue) {
    const safe = (currentValue || '').replace(/"/g, '&quot;');
    return `
    <div class="course-ac-wrap" id="ac-wrap-${assignmentId}">
      <input
        class="inline-input course-ac-input"
        type="text"
        value="${safe}"
        placeholder="Type course…"
        autocomplete="off"
        oninput="app.assignmentUI.onCourseInput(${assignmentId}, this)"
        onfocus="app.assignmentUI.onCourseFocus(${assignmentId}, this)"
        onkeydown="app.assignmentUI.onCourseKey(event, ${assignmentId}, this)"
        onblur="app.assignmentUI._onCourseBlur(${assignmentId}, this)"
      />
      <div class="course-dropdown" id="ac-drop-${assignmentId}" style="display:none;"></div>
    </div>`;
  }

  // ── Show dropdown with filtered + "Add new" option ──
  _showDropdown(assignmentId, inputEl, query) {
    const wrap = document.getElementById(`ac-wrap-${assignmentId}`);
    const drop = document.getElementById(`ac-drop-${assignmentId}`);
    if (!drop) return;

    const courses = this._getCourseList();
    const q = (query || '').trim().toLowerCase();
    const filtered = q ? courses.filter(c => c.toLowerCase().includes(q)) : courses;
    const exactMatch = courses.some(c => c.toLowerCase() === q);

    let html = filtered.map((c, idx) => `
      <div class="ac-item" data-idx="${idx}" data-value="${c.replace(/"/g,'&quot;')}"
        onmousedown="app.assignmentUI.selectCourse(${assignmentId}, '${c.replace(/'/g,"\\'")}')">
        ${c}
      </div>`).join('');

    // "Add new" row — show only if typed something not already in list
    if (q && !exactMatch) {
      html += `
        <div class="ac-item ac-add-new"
          onmousedown="app.assignmentUI.addNewCourse(${assignmentId}, '${query.replace(/'/g,"\\'")}')">
          <span class="ac-add-icon">+</span> Add "<strong>${query}</strong>"
        </div>`;
    }

    if (!html) { drop.style.display = 'none'; return; }

    drop.innerHTML = html;
    drop.style.display = 'block';
    this._activeDropdown = wrap;
  }

  _closeDropdown(wrap) {
    if (!wrap) return;
    const drop = wrap.querySelector('.course-dropdown');
    if (drop) drop.style.display = 'none';
    this._activeDropdown = null;
  }

  // ── Event handlers called from inline HTML ──
  onCourseFocus(id, input) {
    this._showDropdown(id, input, input.value);
  }

  onCourseInput(id, input) {
    this._showDropdown(id, input, input.value);
  }

  onCourseKey(e, id, input) {
    const drop = document.getElementById(`ac-drop-${id}`);
    const items = drop ? [...drop.querySelectorAll('.ac-item')] : [];
    const active = drop ? drop.querySelector('.ac-item.ac-active') : null;
    const idx = active ? items.indexOf(active) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items.forEach(i => i.classList.remove('ac-active'));
      const next = items[idx + 1] || items[0];
      if (next) { next.classList.add('ac-active'); next.scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items.forEach(i => i.classList.remove('ac-active'));
      const prev = items[idx - 1] || items[items.length - 1];
      if (prev) { prev.classList.add('ac-active'); prev.scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active) {
        active.dispatchEvent(new MouseEvent('mousedown'));
      } else {
        // Commit whatever is typed
        this.saveField(id, 'courseName', input.value.trim());
        this._closeDropdown(document.getElementById(`ac-wrap-${id}`));
        input.blur();
      }
    } else if (e.key === 'Escape') {
      this._closeDropdown(document.getElementById(`ac-wrap-${id}`));
      input.blur();
    }
  }

  // Mousedown fires before blur so the value is committed before field loses focus
  selectCourse(id, value) {
    const input = document.querySelector(`#ac-wrap-${id} .course-ac-input`);
    if (input) input.value = value;
    this.saveField(id, 'courseName', value);
    this._closeDropdown(document.getElementById(`ac-wrap-${id}`));
  }

  addNewCourse(id, value) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const input = document.querySelector(`#ac-wrap-${id} .course-ac-input`);
    if (input) input.value = trimmed;
    this.saveField(id, 'courseName', trimmed);
    this._closeDropdown(document.getElementById(`ac-wrap-${id}`));
  }

  // Blur fires after mousedown on dropdown items, so we delay to let mousedown win
  _onCourseBlur(id, input) {
    setTimeout(() => {
      this.saveField(id, 'courseName', input.value.trim());
      this._closeDropdown(document.getElementById(`ac-wrap-${id}`));
    }, 150);
  }

  // ── Also used in the modal's course field ──
  bindModalCourseAutocomplete() {
    const input = document.getElementById('aModalCourseInput');
    const drop  = document.getElementById('aModalCourseDrop');
    if (!input || !drop) return;

    const show = (q) => {
      const courses = this._getCourseList();
      const filtered = q ? courses.filter(c => c.toLowerCase().includes(q.toLowerCase())) : courses;
      const exactMatch = courses.some(c => c.toLowerCase() === q.toLowerCase());
      let html = filtered.map(c => `
        <div class="ac-item" onmousedown="
          document.getElementById('aModalCourseInput').value='${c.replace(/'/g,"\\'")}';
          document.getElementById('aModalCourseDrop').style.display='none';">
          ${c}
        </div>`).join('');
      if (q && !exactMatch) {
        html += `<div class="ac-item ac-add-new" onmousedown="
          document.getElementById('aModalCourseInput').value='${q.replace(/'/g,"\\'")}';
          document.getElementById('aModalCourseDrop').style.display='none';">
          <span class='ac-add-icon'>+</span> Add "<strong>${q}</strong>"
        </div>`;
      }
      drop.innerHTML = html || '';
      drop.style.display = html ? 'block' : 'none';
    };

    input.addEventListener('focus', () => show(input.value));
    input.addEventListener('input', () => show(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { drop.style.display = 'none'; }, 150));
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') drop.style.display = 'none';
      if (e.key === 'Enter') { e.preventDefault(); drop.style.display = 'none'; }
    });
  }

  // ─────────────────────────────────────────
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

        <!-- Editable: Course (autocomplete) -->
        <td>${this._courseCell(a.id, a.courseName)}</td>

        <!-- Editable: Title -->
        <td>
          <input class="inline-input title-input" type="text" value="${a.title.replace(/"/g,'&quot;')}"
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

  // Called by inline handlers to persist a single field
  saveField(id, field, value) {
    const update = {};
    update[field] = field === 'progress' ? parseInt(value) || 0 : value;
    this.manager.update(id, update);
    this._renderStats();
    if (field === 'dueDate' || field === 'status' || field === 'priority' || field === 'courseName') {
      this._renderTable();
    }
  }

  openModal(assignment = null) {
    const form  = document.getElementById('aModalForm');
    const title = document.getElementById('aModalTitle');
    form.reset();
    if (assignment) {
      title.textContent = 'Edit Assignment';
      this.manager.editingId = assignment.id;
      document.getElementById('aModalCourseInput').value = assignment.courseName;
      form.aTitle.value         = assignment.title;
      form.aAssignedDate.value  = assignment.assignedDate;
      form.aDueDate.value       = assignment.dueDate;
      form.aStatus.value        = assignment.status;
      form.aPriority.value      = assignment.priority;
      form.aProgress.value      = assignment.progress;
      form.aSubmission.value    = assignment.submissionType;
      form.aCompletedDate.value = assignment.completedDate;
    } else {
      title.textContent = 'Add Assignment';
      this.manager.editingId = null;
    }
    document.getElementById('aModalOverlay').classList.add('active');
    this.bindModalCourseAutocomplete();
  }

  closeModal() {
    document.getElementById('aModalOverlay').classList.remove('active');
    this.manager.editingId = null;
  }

  _handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      courseName:     document.getElementById('aModalCourseInput').value.trim(),
      title:          form.aTitle.value.trim(),
      assignedDate:   form.aAssignedDate.value,
      dueDate:        form.aDueDate.value,
      status:         form.aStatus.value,
      priority:       form.aPriority.value,
      progress:       parseInt(form.aProgress.value) || 0,
      submissionType: form.aSubmission.value,
      completedDate:  form.aCompletedDate.value,
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
