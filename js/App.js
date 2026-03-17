class App {
  constructor() {
    this._initTheme();
    if (window.FirebaseAppAPI && window.FirestoreAPI && window.FirebaseAuthAPI) { this._init(); }
    else { window.addEventListener('firebase-ready', () => this._init(), { once: true }); }
  }

  _initTheme() {
    const saved = localStorage.getItem('lt_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.textContent = saved === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
      toggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('lt_theme', next);
        toggle.textContent = next === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
      });
    }
  }

  async _init() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
    const { initializeApp }                            = window.FirebaseAppAPI;
    const { getFirestore, enableIndexedDbPersistence } = window.FirestoreAPI;
    const firebaseConfig = window.__FIREBASE_CONFIG__;
    if (!firebaseConfig || !firebaseConfig.apiKey) { if (overlay) overlay.style.display = 'none'; return; }
    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    try { await enableIndexedDbPersistence(db); } catch(e) {}
    Store.init(db);
    const user = await Auth.init(firebaseApp);
    if (!user) { if (overlay) overlay.style.display = 'none'; this._showLoginScreen(); return; }
    await this._loadApp(overlay);
  }

  _showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContent').style.display  = 'none';
  }
  _hideLoginScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContent').style.display  = 'block';
  }

  async signIn() {
    const btn = document.getElementById('googleSignInBtn');
    try {
      btn.disabled = true; btn.textContent = 'Signing in...';
      await Auth.signIn();
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.style.display = 'flex';
      this._hideLoginScreen();
      await this._loadApp(overlay);
    } catch(e) {
      btn.disabled = false;
      btn.innerHTML = '<span class="google-icon">G</span> Sign in with Google';
      if (e.code !== 'auth/popup-closed-by-user') Store._showToast('Sign in failed: ' + e.message, 'warn');
    }
  }

  async signOut() {
    if (!confirm('Sign out?')) return;
    await Auth.signOut();
    this.assignmentManager = null; this.habitManager = null;
    this.assignmentUI = null; this.habitUI = null;
    this._showLoginScreen(); this._updateUserAvatar();
  }

  async _loadApp(overlay) {
    this._updateUserAvatar();
    this._hideLoginScreen();
    const [assignments, habits, courses] = await Promise.all([
      Store.loadAssignments(),
      Store.loadHabits(),
      Store.loadCourses()
    ]);
    this.courseManager     = new CourseManager(courses);
    this.courseManager.syncFromAssignments(assignments);
    this.assignmentManager = new AssignmentManager(assignments);
    this.habitManager      = new HabitManager(habits);
    this.assignmentUI      = new AssignmentUI(this.assignmentManager, this.courseManager);
    this.habitUI           = new HabitUI(this.habitManager);
    this._bindTabs();
    this._showTab('dashboard');
    if (overlay) { overlay.classList.add('fade-out'); setTimeout(() => { overlay.style.display='none'; overlay.classList.remove('fade-out'); }, 400); }
    setTimeout(() => this._checkNotificationPermission(), 2000);
    this._scheduleDueReminders();
  }

  _updateUserAvatar() {
    const container = document.getElementById('userAvatar');
    if (!container) return;
    if (!Auth.isLoggedIn) { container.innerHTML = ''; return; }
    const photo = Auth.photoURL;
    const name  = Auth.displayName || Auth.email || 'User';
    const initials = name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
    container.innerHTML = '<div class="user-menu" id="userMenu">'
      + (photo ? '<img src="'+photo+'" class="user-avatar-img" alt="'+name+'" onclick="document.getElementById(\'userDropdown\').classList.toggle(\'open\')" />'
               : '<div class="user-avatar-initials" onclick="document.getElementById(\'userDropdown\').classList.toggle(\'open\')">'+initials+'</div>')
      + '<div class="user-dropdown" id="userDropdown">'
      + '<div class="user-dropdown-name">'+name+'</div>'
      + '<div class="user-dropdown-email">'+(Auth.email||'')+'</div>'
      + '<button class="user-signout-btn" onclick="app.signOut()">&#128275; Sign out</button>'
      + '</div></div>';
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('userMenu');
      const drop = document.getElementById('userDropdown');
      if (menu && drop && !menu.contains(e.target)) drop.classList.remove('open');
    });
  }

  _bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._showTab(btn.dataset.tab));
    });
  }

  _showTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
    if (tabId === 'dashboard')    this._renderDashboard();
    if (tabId === 'assignments')  this.assignmentUI.render();
    if (tabId === 'habits')       this.habitUI.render();
    if (tabId === 'courses')      this._renderCourses();
  }

  _renderDashboard() {
    const s = this.assignmentManager.stats;
    const name = (Auth.displayName || 'there').split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('dashboardContent');
    if (!el) return;

    // Urgent assignments (due in ≤3 days, not completed)
    const urgent = this.assignmentManager.assignments
      .filter(a => a.status !== 'Completed' && a.daysLeft !== null && a.daysLeft <= 3 && a.daysLeft >= 0)
      .sort((a,b) => a.daysLeft - b.daysLeft);

    // Overdue
    const overdue = this.assignmentManager.assignments
      .filter(a => a.status !== 'Completed' && a.daysLeft !== null && a.daysLeft < 0)
      .sort((a,b) => a.daysLeft - b.daysLeft);

    // In progress
    const inProg = this.assignmentManager.assignments
      .filter(a => a.status === 'In Progress')
      .sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));

    // Habit stats this week
    const today = new Date(); const dayOfWeek = today.getDay()===0?6:today.getDay()-1;
    const weekStart = new Date(today); weekStart.setDate(today.getDate()-dayOfWeek); weekStart.setHours(0,0,0,0);
    let habitDone=0, habitTotal=0;
    this.habitManager.habits.forEach(h => {
      for (let d=0;d<7;d++) {
        const date = new Date(weekStart); date.setDate(weekStart.getDate()+d);
        if (date>today) continue;
        habitTotal++;
        const key = date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
        if (h.isCompleted(key)) habitDone++;
      }
    });
    const habitPct = habitTotal ? Math.round(habitDone/habitTotal*100) : 0;
    const bestStreak = Math.max(0, ...this.habitManager.habits.map(h => this._calcHabitStreak(h)));

    el.innerHTML =
      // Greeting
      '<div class="dash-greeting">'
      + '<div class="dash-hello">'+greeting+', '+name+' &#128075;</div>'
      + '<div class="dash-date">'+new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})+'</div>'
      + '</div>'

      // Summary cards
      + '<div class="dash-cards">'
      + this._dashCard('&#128198;', 'Due This Week',  s.dueThisWeek,  s.dueThisWeek > 0 ? 'warn' : 'ok')
      + this._dashCard('&#9888;&#65039;', 'Overdue', s.overdue,       s.overdue > 0 ? 'danger' : 'ok')
      + this._dashCard('&#9989;', 'Completed',        s.completed,    'ok')
      + this._dashCard('&#128293;', 'Best Streak',    bestStreak+'d', 'info')
      + this._dashCard('&#129504;', 'Habits This Week', habitPct+'%', habitPct >= 70 ? 'ok' : 'warn')
      + this._dashCard('&#128218;', 'Total Assignments', s.total,     'info')
      + '</div>'

      // Overdue section
      + (overdue.length ? '<div class="dash-section">'
        + '<div class="dash-section-title">&#128680; Overdue ('+overdue.length+')</div>'
        + overdue.slice(0,5).map(a => this._dashAssignmentRow(a)).join('')
        + '</div>' : '')

      // Urgent section
      + (urgent.length ? '<div class="dash-section">'
        + '<div class="dash-section-title">&#9200; Due Soon ('+urgent.length+')</div>'
        + urgent.map(a => this._dashAssignmentRow(a)).join('')
        + '</div>' : '')

      // In Progress section
      + (inProg.length ? '<div class="dash-section">'
        + '<div class="dash-section-title">&#9654;&#65039; In Progress ('+inProg.length+')</div>'
        + inProg.map(a => this._dashAssignmentRow(a)).join('')
        + '</div>' : '')

      // All good
      + (!overdue.length && !urgent.length && !inProg.length
        ? '<div class="dash-all-good"><div class="dash-good-icon">&#127881;</div><div class="dash-good-title">All caught up!</div><div class="dash-good-sub">No overdue or urgent assignments. Keep it up!</div></div>'
        : '');
  }

  _dashCard(icon, label, value, type) {
    return '<div class="dash-card dash-card-'+type+'">'
      + '<div class="dash-card-icon">'+icon+'</div>'
      + '<div class="dash-card-val">'+value+'</div>'
      + '<div class="dash-card-label">'+label+'</div>'
      + '</div>';
  }

  _dashAssignmentRow(a) {
    const daysLeft = a.daysLeft;
    let daysLabel = '—', daysClass = 'dok';
    if (daysLeft !== null) {
      if (daysLeft < 0)        { daysLabel = Math.abs(daysLeft)+'d overdue'; daysClass = 'overdue'; }
      else if (daysLeft === 0) { daysLabel = 'Due today'; daysClass = 'due-today'; }
      else                     { daysLeft <= 3 ? daysClass = 'due-soon' : null; daysLabel = daysLeft+'d left'; }
    }
    const color = this.courseManager ? this.courseManager.getColor(a.courseName) : '#6c63ff';
    return '<div class="dash-assignment-row" onclick="app.goToAssignment('+a.id+')">'
      + '<span class="dash-course-dot" style="background:'+color+'"></span>'
      + '<span class="dash-asgn-title">'+a.title+'</span>'
      + '<span class="dash-asgn-course">'+(a.courseName||'—')+'</span>'
      + '<span class="days-badge '+daysClass+'">'+daysLabel+'</span>'
      + '</div>';
  }

  goToAssignment(id) {
    // Clear all filters so the row is visible
    this.assignmentUI._archiveMode  = true;
    this.assignmentUI._searchQuery  = '';
    this.assignmentUI._courseFilter = null;
    const archiveBtn  = document.getElementById('aArchiveToggle');
    const searchEl    = document.getElementById('aSearch');
    const statusEl    = document.getElementById('aFilterStatus');
    const priorityEl  = document.getElementById('aFilterPriority');
    const cfBadge     = document.getElementById('aCourseFilterBadge');
    if (archiveBtn) archiveBtn.innerHTML = '&#128194; Hide Completed';
    if (searchEl)   searchEl.value = '';
    if (statusEl)   statusEl.value = 'All';
    if (priorityEl) priorityEl.value = 'All';
    if (cfBadge)    cfBadge.style.display = 'none';
    this.assignmentManager.filterStatus   = 'All';
    this.assignmentManager.filterPriority = 'All';

    // Switch to assignments tab and render
    this._showTab('assignments');

    // Wait for render to complete then scroll + highlight
    const tryHighlight = (attempts) => {
      const row  = document.querySelector('tr[data-id="'+id+'"]');
      const card = document.querySelector('.mobile-card[data-id="'+id+'"]');

      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('row-highlight');
        setTimeout(() => row.classList.remove('row-highlight'), 2500);
      } else if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('row-highlight');
        setTimeout(() => card.classList.remove('row-highlight'), 2500);
      } else if (attempts > 0) {
        // Row not found yet — retry after a short delay
        setTimeout(() => tryHighlight(attempts - 1), 100);
      }
    };
    setTimeout(() => tryHighlight(10), 200);
  }

  _calcHabitStreak(habit) {
    const today = new Date();
    let streak = 0;
    for (let i=0;i<365;i++) {
      const d = new Date(today); d.setDate(today.getDate()-i);
      const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      if (habit.isCompleted(key)) streak++; else break;
    }
    return streak;
  }

  _renderCourses() {
    const el = document.getElementById('coursesContent');
    if (!el) return;
    const counts = this.assignmentManager.stats.courseCounts;
    el.innerHTML = '<div class="courses-header">'
      + '<div class="courses-title">Manage Courses</div>'
      + '<div class="add-course-wrap">'
      + '<input type="text" id="newCourseName" class="search-input" placeholder="Course name..." style="width:180px" />'
      + '<input type="color" id="newCourseColor" value="#6c63ff" style="width:40px;height:36px;border:1px solid var(--border);border-radius:8px;background:none;cursor:pointer;padding:2px;" />'
      + '<button class="btn-primary" onclick="app.addCourse()">+ Add</button>'
      + '</div></div>'
      + '<div class="courses-grid" id="coursesGrid"></div>';

    const grid = document.getElementById('coursesGrid');
    if (!grid) return;

    // Only use courseManager.courses — do NOT re-add from assignment counts
    // (that was causing deleted courses to reappear)
    const all = [...this.courseManager.courses];

    if (!all.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128218;</div><div class="empty-title">No courses yet</div><div class="empty-sub">Add a course above or type a course name when adding assignments</div></div>';
      return;
    }
    grid.innerHTML = all.map(c => {
      const count  = counts[c.name] || 0;
      const durH   = c.durationHours || '';
      const durM   = c.durationMins  || '';
      const comp   = c.completion    || 0;
      const sn     = c.name.replace(/'/g, "\\'");
      return '<div class="course-mgmt-card">'
        + '<div class="course-card-top">'
        + '<input type="color" value="'+c.color+'" class="course-color-picker" onclick="event.stopPropagation()" onchange="app.updateCourseColor(\''+sn+'\',this.value)" />'
        + '<div class="course-mgmt-info" style="flex:1">'
        + '<div class="course-mgmt-name" contenteditable="true" onblur="app.renameCourse(\''+sn+'\',this.textContent.trim())">'+c.name+'</div>'
        + '<div class="course-mgmt-count course-mgmt-count-link" onclick="app.filterByCourse(\''+sn+'\')">'+count+' assignment'+(count!==1?'s':'')+' — view &#8594;</div>'
        + '</div>'
        + '<button class="btn-icon del-btn" onclick="app.deleteCourse(\''+sn+'\')">&#128465;&#65039;</button>'
        + '</div>'
        + '<div class="course-card-fields">'
        + '<div class="course-field-row">'
        + '<span class="course-field-label">&#9201; Duration</span>'
        + '<div class="course-dur-inputs">'
        + '<input type="number" min="0" max="999" placeholder="0" value="'+durH+'" class="course-field-input" onchange="app.updateCourseDuration(\''+sn+'\',this.value,this.closest(\'.course-dur-inputs\').querySelector(\'[data-m]\').value)" />'
        + '<span class="course-dur-sep">h</span>'
        + '<input type="number" min="0" max="59" placeholder="0" value="'+durM+'" class="course-field-input" data-m onchange="app.updateCourseDuration(\''+sn+'\',this.closest(\'.course-dur-inputs\').querySelector(\'input:first-child\').value,this.value)" />'
        + '<span class="course-dur-sep">m</span>'
        + '</div></div>'
        + '<div class="course-field-row">'
        + '<span class="course-field-label">&#9989; Completion</span>'
        + '<div class="course-comp-wrap">'
        + '<input type="range" min="0" max="100" step="5" value="'+comp+'" class="course-comp-slider" oninput="this.nextElementSibling.textContent=this.value+\'%\';app.updateCourseCompletion(\''+sn+'\',this.value)" />'
        + '<span class="course-comp-val">'+comp+'%</span>'
        + '</div>'
        + '<div class="course-comp-bar"><div class="course-comp-fill" style="width:'+comp+'%;background:'+c.color+'"></div></div>'
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  addCourse() {
    const name  = document.getElementById('newCourseName').value.trim();
    const color = document.getElementById('newCourseColor').value;
    if (!name) return;
    this.courseManager.add(name, color);
    document.getElementById('newCourseName').value = '';
    this._renderCourses();
  }

  updateCourseColor(name, color) {
    this.courseManager.updateColor(name, color);
  }

  updateCourseDuration(name, hours, mins) {
    this.courseManager.updateDuration(name, hours, mins);
  }

  updateCourseCompletion(name, pct) {
    this.courseManager.updateCompletion(name, pct);
  }

  renameCourse(oldName, newName) {
    if (!newName || newName === oldName) return;
    this.courseManager.rename(oldName, newName);
    // Update assignments too
    this.assignmentManager.assignments.forEach(a => {
      if (a.courseName === oldName) { a.courseName = newName; }
    });
    Store.saveAssignments(this.assignmentManager.assignments);
    this._renderCourses();
  }

  filterByCourse(courseName) {
    // Switch to assignments tab and filter by this course
    this._showTab('assignments');
    setTimeout(() => {
      if (this.assignmentUI) this.assignmentUI.filterByCourse(courseName);
    }, 100);
  }

  deleteCourse(name) {
    if (!confirm('Delete course "'+name+'"? Assignments with this course will keep the name.')) return;
    this.courseManager.delete(name);
    // Clear course filter if we were filtering by this course
    if (this.assignmentUI && this.assignmentUI._courseFilter === name) {
      this.assignmentUI._courseFilter = null;
      const cfBadge = document.getElementById('aCourseFilterBadge');
      if (cfBadge) cfBadge.style.display = 'none';
    }
    this._renderCourses();
    // Refresh assignment stats so counts update
    if (this.assignmentUI) this.assignmentUI._renderStats();
  }

  // ── Bulk actions (called from AssignmentUI) ──
  bulkComplete() {
    const ids = [...this.assignmentManager.selectedIds];
    if (!ids.length) return;
    this.assignmentManager.bulkUpdateStatus(ids, 'Completed');
    this.assignmentManager.clearSelection();
    this.assignmentUI.render();
    Store._showToast(ids.length+' assignments marked as completed', 'success');
    this._triggerConfetti();
  }

  bulkDelete() {
    const ids = [...this.assignmentManager.selectedIds];
    if (!ids.length) return;
    if (!confirm('Delete '+ids.length+' selected assignment'+(ids.length>1?'s':'')+'?')) return;
    this.assignmentManager.bulkDelete(ids);
    this.assignmentUI.render();
    Store._showToast(ids.length+' assignments deleted', 'warn');
  }

  // ── Export ──
  exportCSV() {
    const rows = [['#','Course','Title','Assigned','Due Date','Duration(hrs)','Status','Priority','Progress','Notes']];
    this.assignmentManager.assignments.forEach((a,i) => {
      rows.push([i+1, a.courseName, a.title, a.assignedDate, a.dueDate, a.durationHours, a.status, a.priority, a.progress+'%', a.notes]);
    });
    const csv = rows.map(r => r.map(c => '"'+(c||'').toString().replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'learning-tracker-assignments.csv'; a.click();
    URL.revokeObjectURL(url);
    Store._showToast('Exported to CSV', 'success');
  }

  exportPDF() {
    const s = this.assignmentManager.stats;
    const rows = this.assignmentManager.assignments.map((a,i) =>
      '<tr style="'+(i%2===0?'background:#f9f9f9':'')+'">'
      +'<td>'+(i+1)+'</td><td>'+(a.courseName||'—')+'</td><td>'+a.title+'</td>'
      +'<td>'+(a.dueDate||'—')+'</td><td>'+(a.durationHours||'—')+'</td>'
      +'<td>'+a.status+'</td><td>'+a.priority+'</td><td>'+a.progress+'%</td>'
      +'<td>'+(a.notes||'—')+'</td></tr>'
    ).join('');
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Learning Tracker Export</title>'
      +'<style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a}h1{color:#6c63ff}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#6c63ff;color:#fff;padding:8px;text-align:left}td{padding:7px 8px;border-bottom:1px solid #e5e7eb}.stats{display:flex;gap:20px;margin:16px 0}.stat{background:#f3f4f6;padding:12px;border-radius:8px;text-align:center}.stat-val{font-size:24px;font-weight:700;color:#6c63ff}.stat-label{font-size:12px;color:#6b7280}</style>'
      +'</head><body>'
      +'<h1>Learning Tracker — Assignment Report</h1>'
      +'<p>Generated: '+new Date().toLocaleDateString()+'</p>'
      +'<div class="stats">'
      +'<div class="stat"><div class="stat-val">'+s.total+'</div><div class="stat-label">Total</div></div>'
      +'<div class="stat"><div class="stat-val">'+s.completed+'</div><div class="stat-label">Completed</div></div>'
      +'<div class="stat"><div class="stat-val">'+s.inProgress+'</div><div class="stat-label">In Progress</div></div>'
      +'<div class="stat"><div class="stat-val">'+s.pending+'</div><div class="stat-label">Pending</div></div>'
      +'</div>'
      +'<table><tr><th>#</th><th>Course</th><th>Title</th><th>Due</th><th>Hrs</th><th>Status</th><th>Priority</th><th>Progress</th><th>Notes</th></tr>'
      + rows + '</table></body></html>';
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
    Store._showToast('PDF ready — use browser print dialog', 'success');
  }

  // ── Confetti ──
  _triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({length:120}, () => ({
      x: Math.random()*canvas.width, y: -10,
      vx: (Math.random()-0.5)*4, vy: Math.random()*4+2,
      color: ['#6c63ff','#ff6b9d','#00e5b5','#f5a623','#22c55e'][Math.floor(Math.random()*5)],
      size: Math.random()*8+4, rotation: Math.random()*360,
      rotationSpeed: (Math.random()-0.5)*6
    }));
    let frame = 0;
    const animate = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rotation*Math.PI/180);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);
        ctx.restore();
      });
      frame++;
      if (frame < 120) requestAnimationFrame(animate);
      else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display='none'; }
    };
    animate();
  }

  deleteAssignment(id) {
    const a = this.assignmentManager.assignments.find(a => a.id === id);
    if (!a) return;
    if (!confirm('Delete "'+a.title+'"?')) return;
    this.assignmentManager.delete(id);
    this.assignmentUI.render();
    Store._showToast('Assignment deleted', 'warn');
  }

  toggleHabit(habitId, dateStr) { this.habitManager.toggle(habitId, dateStr); this.habitUI.render(); }

  deleteHabit(id) {
    const h = this.habitManager.habits.find(h => h.id === id);
    if (!h) return;
    if (!confirm('Delete habit "'+h.name+'"?')) return;
    this.habitManager.deleteHabit(id); this.habitUI.render();
  }

  renameHabit(id) {
    const h = this.habitManager.habits.find(h => h.id === id);
    if (!h) return;
    const n = prompt('Rename habit:', h.name);
    if (n && n.trim()) { this.habitManager.renameHabit(id, n.trim()); this.habitUI.render(); }
  }

  _checkNotificationPermission() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    const b = document.getElementById('reminderBanner'); if (b) b.style.display='flex';
  }

  enableNotifications() {
    const b = document.getElementById('reminderBanner'); if (b) b.style.display='none';
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(p => { if(p==='granted'){Store._showToast('Notifications enabled!','success');this._scheduleDueReminders();} });
  }

  _scheduleDueReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !this.assignmentManager) return;
    this.assignmentManager.assignments.forEach(a => {
      if (!a.dueDate || a.status==='Completed') return;
      const dl = a.daysLeft;
      if (dl===1) setTimeout(()=>new Notification('Due tomorrow: '+a.title,{body:(a.courseName||'Assignment')+' is due tomorrow!'}),500);
      if (dl===0) setTimeout(()=>new Notification('Due TODAY: '+a.title,{body:(a.courseName||'Assignment')+' is due today!'}),500);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
