class AssignmentUI {
  constructor(manager, courseManager) {
    this.manager = manager;
    this.courseManager = courseManager || null;
    this._activeDropdown = null;
    this._archiveMode = false;
    this._searchQuery = '';
    this._bindControls();
    document.addEventListener('click', (e) => {
      if (this._activeDropdown && !this._activeDropdown.contains(e.target)) {
        this._closeDropdown(this._activeDropdown);
      }
    });
  }

  _bindControls() {
    const safe = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    safe('aFilterStatus',   'change', (e) => { this.manager.filterStatus = e.target.value; this.render(); });
    safe('aFilterPriority', 'change', (e) => { this.manager.filterPriority = e.target.value; this.render(); });
    safe('aSortKey',        'change', (e) => { this.manager.sortKey = e.target.value; this.render(); });
    safe('aAddBtn',         'click',  ()  => this.openModal());
    safe('aModalForm',      'submit', (e) => this._handleSubmit(e));
    safe('aModalClose',     'click',  ()  => this.closeModal());
    safe('aSearch', 'input', (e) => { this._searchQuery = e.target.value.toLowerCase().trim(); this._renderTable(); });
    safe('aArchiveToggle', 'click', () => {
      this._archiveMode = !this._archiveMode;
      const btn = document.getElementById('aArchiveToggle');
      if (btn) btn.innerHTML = this._archiveMode ? '&#128194; Hide Completed' : '&#128194; Show All';
      this._renderTable();
    });
    safe('aBulkComplete', 'click', () => app.bulkComplete());
    safe('aBulkDelete',   'click', () => app.bulkDelete());
    safe('aExportCSV',    'click', () => app.exportCSV());
    safe('aExportPDF',    'click', () => app.exportPDF());
    const ov = document.getElementById('aModalOverlay');
    if (ov) ov.addEventListener('click', (e) => { if (e.target === e.currentTarget) this.closeModal(); });

    // Scroll hint - hide after first scroll
    const scroll = document.getElementById('aTableScroll');
    if (scroll) scroll.addEventListener('scroll', () => {
      const hint = document.getElementById('scrollHint');
      if (hint) hint.style.display = 'none';
    }, { once: true });
  }

  _getCourseList() {
    const names = this.manager.assignments.map((a) => a.courseName && a.courseName.trim()).filter(Boolean);
    return [...new Set(names)].sort();
  }

  _courseCell(assignmentId, currentValue) {
    const safe = (currentValue || '').replace(/"/g, '&quot;');
    return '<div class="course-ac-wrap" id="ac-wrap-' + assignmentId + '">'
      + '<input class="inline-input course-ac-input" type="text" value="' + safe + '" placeholder="Type course..." autocomplete="off"'
      + ' oninput="app.assignmentUI.onCourseInput(' + assignmentId + ', this)"'
      + ' onfocus="app.assignmentUI.onCourseFocus(' + assignmentId + ', this)"'
      + ' onkeydown="app.assignmentUI.onCourseKey(event, ' + assignmentId + ', this)"'
      + ' onblur="app.assignmentUI._onCourseBlur(' + assignmentId + ', this)" />'
      + '<div class="course-dropdown" id="ac-drop-' + assignmentId + '" style="display:none;"></div>'
      + '</div>';
  }

  _showDropdown(assignmentId, inputEl, query) {
    const wrap = document.getElementById('ac-wrap-' + assignmentId);
    const drop = document.getElementById('ac-drop-' + assignmentId);
    if (!drop) return;
    const courses = this._getCourseList();
    const q = (query || '').trim().toLowerCase();
    const filtered = q ? courses.filter((c) => c.toLowerCase().includes(q)) : courses;
    const exactMatch = courses.some((c) => c.toLowerCase() === q);
    let html = filtered.map((c) => '<div class="ac-item" onmousedown="app.assignmentUI.selectCourse(' + assignmentId + ', \'' + c.replace(/'/g, "\\'") + '\')">' + c + '</div>').join('');
    if (q && !exactMatch) html += '<div class="ac-item ac-add-new" onmousedown="app.assignmentUI.addNewCourse(' + assignmentId + ', \'' + query.replace(/'/g, "\\'") + '\')"><span class="ac-add-icon">+</span> Add "' + query + '"</div>';
    if (!html) { drop.style.display = 'none'; return; }
    drop.innerHTML = html; drop.style.display = 'block'; this._activeDropdown = wrap;
  }

  _closeDropdown(wrap) {
    if (!wrap) return;
    const drop = wrap.querySelector('.course-dropdown');
    if (drop) drop.style.display = 'none';
    this._activeDropdown = null;
  }

  onCourseFocus(id, input) { this._showDropdown(id, input, input.value); }
  onCourseInput(id, input) { this._showDropdown(id, input, input.value); }

  onCourseKey(e, id, input) {
    const drop = document.getElementById('ac-drop-' + id);
    const items = drop ? Array.from(drop.querySelectorAll('.ac-item')) : [];
    const active = drop ? drop.querySelector('.ac-item.ac-active') : null;
    const idx = active ? items.indexOf(active) : -1;
    if (e.key === 'ArrowDown') { e.preventDefault(); items.forEach(i => i.classList.remove('ac-active')); const next = items[idx+1]||items[0]; if(next){next.classList.add('ac-active');next.scrollIntoView({block:'nearest'});} }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items.forEach(i => i.classList.remove('ac-active')); const prev = items[idx-1]||items[items.length-1]; if(prev){prev.classList.add('ac-active');prev.scrollIntoView({block:'nearest'});} }
    else if (e.key === 'Enter') { e.preventDefault(); if(active){active.dispatchEvent(new MouseEvent('mousedown'));}else{this.saveField(id,'courseName',input.value.trim());this._closeDropdown(document.getElementById('ac-wrap-'+id));input.blur();} }
    else if (e.key === 'Escape') { this._closeDropdown(document.getElementById('ac-wrap-'+id)); input.blur(); }
  }

  selectCourse(id, value) {
    const input = document.querySelector('#ac-wrap-' + id + ' .course-ac-input');
    if (input) input.value = value;
    this.saveField(id, 'courseName', value);
    this._closeDropdown(document.getElementById('ac-wrap-' + id));
  }

  addNewCourse(id, value) {
    const trimmed = value.trim(); if (!trimmed) return;
    const input = document.querySelector('#ac-wrap-' + id + ' .course-ac-input');
    if (input) input.value = trimmed;
    this.saveField(id, 'courseName', trimmed);
    this._closeDropdown(document.getElementById('ac-wrap-' + id));
  }

  _onCourseBlur(id, input) {
    setTimeout(() => { this.saveField(id, 'courseName', input.value.trim()); this._closeDropdown(document.getElementById('ac-wrap-' + id)); }, 150);
  }

  bindModalCourseAutocomplete() {
    const input = document.getElementById('aModalCourseInput');
    const drop  = document.getElementById('aModalCourseDrop');
    if (!input || !drop) return;
    const show = (q) => {
      const courses = this._getCourseList();
      const filtered = q ? courses.filter(c => c.toLowerCase().includes(q.toLowerCase())) : courses;
      const exact = courses.some(c => c.toLowerCase() === q.toLowerCase());
      let html = filtered.map(c => '<div class="ac-item" onmousedown="document.getElementById(\'aModalCourseInput\').value=\'' + c.replace(/'/g,"\\'") + '\';document.getElementById(\'aModalCourseDrop\').style.display=\'none\';">' + c + '</div>').join('');
      if (q && !exact) html += '<div class="ac-item ac-add-new" onmousedown="document.getElementById(\'aModalCourseInput\').value=\'' + q.replace(/'/g,"\\'") + '\';document.getElementById(\'aModalCourseDrop\').style.display=\'none\';"><span class=\'ac-add-icon\'>+</span> Add "' + q + '"</div>';
      drop.innerHTML = html || ''; drop.style.display = html ? 'block' : 'none';
    };
    input.addEventListener('focus', () => show(input.value));
    input.addEventListener('input', () => show(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { drop.style.display = 'none'; }, 150));
    input.addEventListener('keydown', e => { if(e.key==='Escape') drop.style.display='none'; if(e.key==='Enter'){e.preventDefault();drop.style.display='none';} });
  }

  render() { this._renderStats(); this._renderTable(); }

  _getFilteredItems() {
    let items = this.manager.getFiltered();
    // Archive filter
    if (!this._archiveMode) items = items.filter(a => a.status !== 'Completed');
    // Course filter (from course tab click)
    if (this._courseFilter) items = items.filter(a => a.courseName === this._courseFilter);
    // Search filter
    if (this._searchQuery) items = items.filter(a =>
      (a.title||'').toLowerCase().includes(this._searchQuery) ||
      (a.courseName||'').toLowerCase().includes(this._searchQuery)
    );
    return items;
  }

  filterByCourse(courseName) {
    this._courseFilter = courseName || null;
    this._searchQuery  = '';
    const searchEl = document.getElementById('aSearch');
    if (searchEl) searchEl.value = '';
    // Update course filter badge
    const badge = document.getElementById('aCourseFilterBadge');
    if (badge) {
      badge.style.display = courseName ? 'flex' : 'none';
      badge.querySelector('.cf-name') && (badge.querySelector('.cf-name').textContent = courseName);
    }
    this._renderTable();
    this._renderStats();
  }

  _renderStats() {
    // Charts follow current filter
    const filtered = this._getFilteredItems();
    const all = this.manager.assignments;

    // Stats always show all data
    const s = this.manager.stats;
    document.getElementById('aStatTotal').textContent     = s.total;
    document.getElementById('aStatCompleted').textContent = s.completed;
    document.getElementById('aStatProgress').textContent  = s.inProgress;
    document.getElementById('aStatPending').textContent   = s.pending;
    const pct = s.total ? Math.round((s.completed/s.total)*100) : 0;
    document.getElementById('aProgressBar').style.width = pct + '%';
    document.getElementById('aProgressPct').textContent = pct + '%';
    document.getElementById('aPriorityHigh').textContent   = s.high;
    document.getElementById('aPriorityMedium').textContent = s.medium;
    document.getElementById('aPriorityLow').textContent    = s.low;
    const cc = document.getElementById('aCourseList');
    cc.innerHTML = Object.entries(s.courseCounts).sort((a,b)=>b[1]-a[1]).map(([n,c])=>'<div class="course-tag"><span class="course-name">'+n+'</span><span class="course-count">'+c+'</span></div>').join('');

    // Hours summary using filtered data
    this._renderHoursSummary(filtered);

    // Charts use filtered data
    this._renderCharts(filtered);
  }

  _renderHoursSummary(items) {
    const el = document.getElementById('aHoursSummary');
    if (!el) return;
    const withHours = items.filter(a => a.durationHours && parseFloat(a.durationHours) > 0);
    if (!withHours.length) { el.innerHTML = ''; return; }
    const total = withHours.reduce((sum, a) => sum + parseFloat(a.durationHours||0), 0);
    const done  = withHours.filter(a => a.status === 'Completed').reduce((sum,a)=>sum+parseFloat(a.durationHours||0),0);
    const remaining = total - done;
    const byCourse = {};
    withHours.forEach(a => { if(a.courseName) { byCourse[a.courseName] = (byCourse[a.courseName]||0) + parseFloat(a.durationHours||0); } });
    const topCourse = Object.entries(byCourse).sort((a,b)=>b[1]-a[1])[0];
    el.innerHTML = '<div class="hours-card">'
      + '<div class="hours-item"><span class="hours-label">Total hours</span><span class="hours-val">' + total.toFixed(1) + ' hrs</span></div>'
      + '<div class="hours-item"><span class="hours-label">Completed</span><span class="hours-val" style="color:var(--lo)">' + done.toFixed(1) + ' hrs</span></div>'
      + '<div class="hours-item"><span class="hours-label">Remaining</span><span class="hours-val" style="color:var(--accent4)">' + remaining.toFixed(1) + ' hrs</span></div>'
      + (topCourse ? '<div class="hours-item"><span class="hours-label">Most hours</span><span class="hours-val" style="color:var(--accent)">' + topCourse[0] + ' (' + topCourse[1].toFixed(1) + ' hrs)</span></div>' : '')
      + '</div>';
  }

  _renderCharts(filteredItems) {
    if (typeof Chart === 'undefined') return;

    // Build stats from filtered items
    const completed  = filteredItems.filter(a => a.status === 'Completed').length;
    const inProgress = filteredItems.filter(a => a.status === 'In Progress').length;
    const pending    = filteredItems.filter(a => a.status === 'Pending').length;
    const high   = filteredItems.filter(a => a.priority === 'High').length;
    const medium = filteredItems.filter(a => a.priority === 'Medium').length;
    const low    = filteredItems.filter(a => a.priority === 'Low').length;
    const courseCounts = {};
    filteredItems.forEach(a => { if(a.courseName) courseCounts[a.courseName] = (courseCounts[a.courseName]||0)+1; });

    const gridColor = '#2a2f45', tickColor = '#8b90b8';

    const donutCtx = document.getElementById('aDonutChart');
    if (donutCtx) {
      if (this._donutChart) this._donutChart.destroy();
      const total = completed + inProgress + pending;
      this._donutChart = new Chart(donutCtx, {
        type: 'doughnut',
        data: { labels:['Completed','In Progress','Pending'], datasets:[{data:[completed,inProgress,pending],backgroundColor:['#22c55e','#f5a623','#ff4d6d'],borderWidth:0,hoverOffset:6}] },
        options: { cutout:'65%', plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>' '+ctx.label+': '+ctx.raw+' ('+(total?Math.round(ctx.raw/total*100):0)+'%)'}}} }
      });
      const legend = document.getElementById('aDonutLegend');
      if (legend) { const colors=['#22c55e','#f5a623','#ff4d6d'],labels=['Completed','In Progress','Pending'],vals=[completed,inProgress,pending]; legend.innerHTML=labels.map((l,i)=>'<div class="chart-legend-item"><span class="legend-dot" style="background:'+colors[i]+'"></span><span class="legend-label">'+l+'</span><span class="legend-val">'+(total?Math.round(vals[i]/total*100):0)+'%</span></div>').join(''); }
    }

    const barCtx = document.getElementById('aBarChart');
    if (barCtx) {
      if (this._barChart) this._barChart.destroy();
      const courses = Object.entries(courseCounts).sort((a,b)=>b[1]-a[1]);
      this._barChart = new Chart(barCtx, {
        type: 'bar',
        data: { labels: courses.map(([n])=>n), datasets:[{label:'Assignments',data:courses.map(([,c])=>c),backgroundColor:'#6c63ff99',borderColor:'#6c63ff',borderWidth:1,borderRadius:4}] },
        options: {
          plugins:{legend:{display:false}},
          scales:{
            x:{ticks:{color:tickColor,font:{size:11},maxRotation:40,minRotation:30,autoSkip:false},grid:{color:gridColor},title:{display:true,text:'Course Name',color:tickColor,font:{size:11,weight:'600'}}},
            y:{ticks:{color:tickColor,font:{size:11},stepSize:1},grid:{color:gridColor},title:{display:true,text:'Count',color:tickColor,font:{size:11,weight:'600'}},beginAtZero:true}
          },
          layout:{padding:{bottom:10}}
        }
      });
    }

    const pieCtx = document.getElementById('aPieChart');
    if (pieCtx) {
      if (this._pieChart) this._pieChart.destroy();
      const total = high + medium + low;
      this._pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: { labels:['High','Medium','Low'], datasets:[{data:[high,medium,low],backgroundColor:['#ff4d6d','#f5a623','#22c55e'],borderWidth:0,hoverOffset:6}] },
        options: { plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>' '+ctx.label+': '+ctx.raw+' ('+(total?Math.round(ctx.raw/total*100):0)+'%)'}}} }
      });
      const legend = document.getElementById('aPieLegend');
      if (legend) { const colors=['#ff4d6d','#f5a623','#22c55e'],labels=['High','Medium','Low'],vals=[high,medium,low]; legend.innerHTML=labels.map((l,i)=>'<div class="chart-legend-item"><span class="legend-dot" style="background:'+colors[i]+'"></span><span class="legend-label">'+l+'</span><span class="legend-val">'+(total?Math.round(vals[i]/total*100):0)+'%</span></div>').join(''); }
    }
  }

  _renderTable() {
    const tbody = document.getElementById('aTableBody');
    const items = this._getFilteredItems();

    if (!items.length) {
      const msg = this._searchQuery
        ? '<div class="empty-state"><div class="empty-icon">&#128269;</div><div class="empty-title">No results found</div><div class="empty-sub">Try a different search term</div></div>'
        : (!this._archiveMode
            ? '<div class="empty-state"><div class="empty-icon">&#127881;</div><div class="empty-title">All caught up!</div><div class="empty-sub">No active assignments. Click "Show All" to see completed ones.</div></div>'
            : '<div class="empty-state"><div class="empty-icon">&#128196;</div><div class="empty-title">No assignments yet</div><div class="empty-sub">Click "+ Add Assignment" to get started</div></div>');
      tbody.innerHTML = '<tr><td colspan="12">' + msg + '</td></tr>';
      this._renderMobileCards(items);
      this._renderStats();
      return;
    }

    tbody.innerHTML = items.map((a, i) => {
      const daysLeft = a.daysLeft;
      let daysLabel = '—', daysClass = '';
      if (daysLeft !== null) {
        if (daysLeft < 0)        { daysLabel = Math.abs(daysLeft)+'d overdue'; daysClass = 'overdue'; }
        else if (daysLeft === 0) { daysLabel = 'Due today'; daysClass = 'due-today'; }
        else                     { daysLabel = daysLeft+'d left'; daysClass = daysLeft <= 3 ? 'due-soon' : ''; }
      }
      const statusCls   = 'status-'   + a.status.replace(' ','-').toLowerCase();
      const priorityCls = 'priority-' + a.priority.toLowerCase();
      const progBtns = [25,50,75,100].map(p =>
        '<button class="prog-btn'+(a.progress===p?' prog-active':'')+'" onclick="app.assignmentUI.saveField('+a.id+',\'progress\','+p+')">'+p+'%</button>'
      ).join('');
      const notesSafe = (a.notes||'').replace(/"/g,'&quot;').replace(/\n/g,' ');

      return '<tr class="anim-row'+(a.status==='Completed'?' row-completed':'')+'" style="animation-delay:'+(i*0.04)+'s" data-id="'+a.id+'">'
        +'<td><input type="checkbox" class="row-check"'+(isSelected?' checked':'')+' onchange="app.assignmentUI.toggleSelect('+a.id+', this)" /></td>'
        +'<td><div class="course-dot-wrap"><span class="course-color-dot" style="background:'+courseColor+'"></span>'+this._courseCell(a.id, a.courseName)+'</div></td>'
        +'<td><input class="inline-input title-input" type="text" value="'+a.title.replace(/"/g,'&quot;')+'" placeholder="Title..." onblur="app.assignmentUI.saveField('+a.id+',\'title\',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" /></td>'
        +'<td><input class="inline-input inline-date" type="date" value="'+(a.assignedDate||'')+'" onchange="app.assignmentUI.saveField('+a.id+',\'assignedDate\',this.value)" oninput="app.assignmentUI.saveField('+a.id+',\'assignedDate\',this.value)" /></td>'
        +'<td><input class="inline-input inline-date" type="date" value="'+(a.dueDate||'')+'" onchange="app.assignmentUI.saveField('+a.id+',\'dueDate\',this.value)" oninput="app.assignmentUI.saveField('+a.id+',\'dueDate\',this.value)" /></td>'
        +'<td><input class="inline-input dur-input" type="number" min="0" step="0.5" value="'+(a.durationHours||'')+'" placeholder="hrs" onblur="app.assignmentUI.saveField('+a.id+',\'durationHours\',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" /></td>'
        +'<td><span class="days-badge '+daysClass+'">'+daysLabel+'</span></td>'
        +'<td><select class="inline-select status-select '+statusCls+'" onchange="app.assignmentUI.saveField('+a.id+',\'status\',this.value);this.className=\'inline-select status-select status-\'+this.value.replace(\' \',\'-\').toLowerCase();">'
          +'<option'+(a.status==='Pending'?' selected':'')+'>Pending</option>'
          +'<option'+(a.status==='In Progress'?' selected':'')+'>In Progress</option>'
          +'<option'+(a.status==='Completed'?' selected':'')+'>Completed</option>'
          +'</select></td>'
        +'<td><select class="inline-select priority-select '+priorityCls+'" onchange="app.assignmentUI.saveField('+a.id+',\'priority\',this.value);this.className=\'inline-select priority-select priority-\'+this.value.toLowerCase();">'
          +'<option'+(a.priority==='High'?' selected':'')+'>High</option>'
          +'<option'+(a.priority==='Medium'?' selected':'')+'>Medium</option>'
          +'<option'+(a.priority==='Low'?' selected':'')+'>Low</option>'
          +'</select></td>'
        +'<td><div class="progress-cell"><div class="mini-bar"><div class="mini-fill" style="width:'+a.progress+'%"></div></div><span>'+a.progress+'%</span><div class="prog-btns">'+progBtns+'</div></div></td>'
        +'<td><input class="inline-input notes-input" type="text" value="'+notesSafe+'" placeholder="Notes..." onblur="app.assignmentUI.saveField('+a.id+',\'notes\',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" title="'+(a.notes||'')+'" /></td>'
        +'<td><div class="action-btns"><button class="btn-icon del-btn" onclick="app.deleteAssignment('+a.id+')" title="Delete">&#128465;&#65039;</button></div></td>'
        +'</tr>';
    }).join('');

    this._renderMobileCards(items);
    this._renderStats();
  }

  _renderMobileCards(items) {
    const container = document.getElementById('aMobileCards');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127881;</div><div class="empty-title">No assignments</div></div>';
      return;
    }
    container.innerHTML = items.map(a => {
      const daysLeft = a.daysLeft;
      let daysLabel = '—', daysClass = '';
      if (daysLeft !== null) {
        if (daysLeft < 0)        { daysLabel = Math.abs(daysLeft)+'d overdue'; daysClass = 'overdue'; }
        else if (daysLeft === 0) { daysLabel = 'Due today'; daysClass = 'due-today'; }
        else                     { daysLabel = daysLeft+'d left'; daysClass = daysLeft <= 3 ? 'due-soon' : ''; }
      }
      const statusCls   = 'status-'   + a.status.replace(' ','-').toLowerCase();
      const priorityCls = 'priority-' + a.priority.toLowerCase();
      const progBtns = [25,50,75,100].map(p =>
        '<button class="prog-btn'+(a.progress===p?' prog-active':'')+'" onclick="app.assignmentUI.saveMobileField('+a.id+',\'progress\','+p+')">'+p+'%</button>'
      ).join('');
      const titleSafe  = (a.title||'').replace(/"/g,'&quot;');
      const notesSafe  = (a.notes||'').replace(/"/g,'&quot;');
      const courseSafe = (a.courseName||'').replace(/"/g,'&quot;');

      return '<div class="mobile-card'+(a.status==='Completed'?' row-completed':'')+'" data-id="'+a.id+'">'

        // Header — title + delete
        +'<div class="mobile-card-header">'
        +'<input class="mc-input mc-title" type="text" value="'+titleSafe+'" placeholder="Assignment title..."'
        +' onblur="app.assignmentUI.saveMobileField('+a.id+',\'title\',this.value)"'
        +' onkeydown="if(event.key===\'Enter\')this.blur()" />'
        +'<button class="btn-icon del-btn" onclick="app.deleteAssignment('+a.id+')" title="Delete">&#128465;&#65039;</button>'
        +'</div>'

        // Course + duration row
        +'<div class="mc-row">'
        +'<div class="mc-field-wrap">'
        +'<div class="mc-label">Course</div>'
        +'<input class="mc-input" type="text" value="'+courseSafe+'" placeholder="Course name..."'
        +' onblur="app.assignmentUI.saveMobileField('+a.id+',\'courseName\',this.value)"'
        +' onkeydown="if(event.key===\'Enter\')this.blur()" />'
        +'</div>'
        +'<div class="mc-field-wrap mc-field-sm">'
        +'<div class="mc-label">Hrs</div>'
        +'<input class="mc-input" type="number" min="0" step="0.5" value="'+(a.durationHours||'')+'" placeholder="0"'
        +' onblur="app.assignmentUI.saveMobileField('+a.id+',\'durationHours\',this.value)"'
        +' onkeydown="if(event.key===\'Enter\')this.blur()" />'
        +'</div>'
        +'</div>'

        // Dates row
        +'<div class="mc-row">'
        +'<div class="mc-field-wrap">'
        +'<div class="mc-label">Assigned</div>'
        +'<input class="mc-input" type="date" value="'+(a.assignedDate||'')+'"'
        +' onchange="app.assignmentUI.saveMobileField('+a.id+',\'assignedDate\',this.value)" />'
        +'</div>'
        +'<div class="mc-field-wrap">'
        +'<div class="mc-label">Due Date</div>'
        +'<input class="mc-input" type="date" value="'+(a.dueDate||'')+'"'
        +' onchange="app.assignmentUI.saveMobileField('+a.id+',\'dueDate\',this.value)" />'
        +'</div>'
        +'</div>'

        // Status + Priority + Days Left row
        +'<div class="mc-row mc-badges-row">'
        +'<div class="mc-field-wrap">'
        +'<div class="mc-label">Status</div>'
        +'<select class="mc-select '+statusCls+'" onchange="app.assignmentUI.saveMobileField('+a.id+',\'status\',this.value);this.className=\'mc-select status-\'+this.value.replace(\' \',\'-\').toLowerCase();">'
        +'<option'+(a.status==='Pending'?' selected':'')+'>Pending</option>'
        +'<option'+(a.status==='In Progress'?' selected':'')+'>In Progress</option>'
        +'<option'+(a.status==='Completed'?' selected':'')+'>Completed</option>'
        +'</select>'
        +'</div>'
        +'<div class="mc-field-wrap">'
        +'<div class="mc-label">Priority</div>'
        +'<select class="mc-select '+priorityCls+'" onchange="app.assignmentUI.saveMobileField('+a.id+',\'priority\',this.value);this.className=\'mc-select priority-\'+this.value.toLowerCase();">'
        +'<option'+(a.priority==='High'?' selected':'')+'>High</option>'
        +'<option'+(a.priority==='Medium'?' selected':'')+'>Medium</option>'
        +'<option'+(a.priority==='Low'?' selected':'')+'>Low</option>'
        +'</select>'
        +'</div>'
        +'<div class="mc-field-wrap mc-field-sm">'
        +'<div class="mc-label">Days Left</div>'
        +'<span class="days-badge '+daysClass+'" style="display:inline-block;margin-top:4px">'+daysLabel+'</span>'
        +'</div>'
        +'</div>'

        // Progress
        +'<div class="mc-field-wrap" style="margin-top:10px">'
        +'<div class="mc-label">Progress — '+a.progress+'%</div>'
        +'<div class="mobile-prog-bar"><div class="mobile-prog-fill" style="width:'+a.progress+'%"></div></div>'
        +'<div class="mobile-prog-btns">'+progBtns+'</div>'
        +'</div>'

        // Notes
        +'<div class="mc-field-wrap" style="margin-top:8px">'
        +'<div class="mc-label">Notes</div>'
        +'<textarea class="mc-textarea" placeholder="Any notes or remarks..." rows="2"'
        +' onblur="app.assignmentUI.saveMobileField('+a.id+',\'notes\',this.value)">'+notesSafe+'</textarea>'
        +'</div>'

        +'</div>';
    }).join('');
  }

  // Separate save handler for mobile — updates card in place without full re-render
  saveMobileField(id, field, value) {
    const update = {};
    update[field] = field === 'progress' ? (parseInt(value)||0) : value;
    this.manager.update(id, update);

    if (field === 'status' || field === 'priority' || field === 'courseName' || field === 'progress') {
      this._renderTable(); // full re-render to keep desktop table + mobile cards in sync
    } else if (field === 'dueDate' || field === 'assignedDate') {
      // Update just the days-left badge on this mobile card
      const card = document.querySelector('.mobile-card[data-id="'+id+'"]');
      if (card) {
        const a = this.manager.assignments.find(a => a.id === id);
        if (a) {
          const daysLeft = a.daysLeft;
          let label = '—', cls = '';
          if (daysLeft !== null) {
            if (daysLeft < 0)        { label = Math.abs(daysLeft)+'d overdue'; cls = 'overdue'; }
            else if (daysLeft === 0) { label = 'Due today'; cls = 'due-today'; }
            else                     { label = daysLeft+'d left'; cls = daysLeft<=3?'due-soon':''; }
          }
          const badge = card.querySelector('.days-badge');
          if (badge) { badge.textContent = label; badge.className = 'days-badge '+cls; }
        }
      }
      this._renderStats();
    } else {
      this._renderStats();
    }
  }

  toggleSelect(id, cb) {
    this.manager.toggleSelect(id);
    this._updateBulkBar();
  }

  toggleSelectAll(cb) {
    const items = this._getFilteredItems();
    if (cb.checked) this.manager.selectAll(items.map(a=>a.id));
    else this.manager.clearSelection();
    this._renderTable();
  }

  _updateBulkBar() {
    const count = this.manager.selectedIds.size;
    const bar = document.getElementById('aBulkBar');
    const label = document.getElementById('aBulkCount');
    if (bar) bar.style.display = count > 0 ? 'flex' : 'none';
    if (label) label.textContent = count + ' selected';
  }

  saveField(id, field, value) {
    const update = {};
    update[field] = field === 'progress' ? (parseInt(value)||0) : value;
    this.manager.update(id, update);
    if (field === 'dueDate' || field === 'assignedDate') {
      this._updateDaysLeftBadge(id);
      this._renderStats();
    } else if (field === 'status' || field === 'priority' || field === 'courseName' || field === 'progress') {
      this._renderTable();
    } else {
      this._renderStats();
    }
  }

  _updateDaysLeftBadge(id) {
    const a = this.manager.assignments.find(a => a.id === id);
    if (!a) return;
    const row = document.querySelector('tr[data-id="'+id+'"]');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    const daysCell = cells[6];
    if (!daysCell) return;
    const daysLeft = a.daysLeft;
    let label = '—', cls = '';
    if (daysLeft !== null) {
      if (daysLeft < 0)        { label = Math.abs(daysLeft)+'d overdue'; cls = 'overdue'; }
      else if (daysLeft === 0) { label = 'Due today'; cls = 'due-today'; }
      else                     { label = daysLeft+'d left'; cls = daysLeft<=3?'due-soon':''; }
    }
    daysCell.innerHTML = '<span class="days-badge '+cls+'">'+label+'</span>';
  }

  openModal(assignment) {
    const form  = document.getElementById('aModalForm');
    const title = document.getElementById('aModalTitle');
    form.reset();
    if (assignment) {
      title.textContent = 'Edit Assignment';
      this.manager.editingId = assignment.id;
      document.getElementById('aModalCourseInput').value = assignment.courseName || '';
      form.aTitle.value         = assignment.title;
      form.aAssignedDate.value  = assignment.assignedDate;
      form.aDueDate.value       = assignment.dueDate;
      form.aStatus.value        = assignment.status;
      form.aPriority.value      = assignment.priority;
      form.aProgress.value      = assignment.progress;
      form.aDuration.value      = assignment.durationHours || '';
      form.aSubmission.value    = assignment.submissionType;
      form.aCompletedDate.value = assignment.completedDate;
      form.aNotes.value         = assignment.notes || '';
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
      progress:       parseInt(form.aProgress.value)||0,
      durationHours:  form.aDuration.value,
      submissionType: form.aSubmission.value,
      completedDate:  form.aCompletedDate.value,
      notes:          form.aNotes.value.trim(),
    };
    if (this.manager.editingId) { this.manager.update(this.manager.editingId, data); }
    else { this.manager.add(data); }
    this.closeModal();
    this.render();
  }
}
