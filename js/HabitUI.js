class HabitUI {
  constructor(manager) {
    this.manager = manager;
    this._bindControls();
  }

  _bindControls() {
    document.getElementById('hPrevMonth').addEventListener('click', () => { this.manager.prevMonth(); this.render(); });
    document.getElementById('hNextMonth').addEventListener('click', () => { this.manager.nextMonth(); this.render(); });
    document.getElementById('hAddHabitBtn').addEventListener('click', () => this._addHabit());
    document.getElementById('hNewHabitInput').addEventListener('keydown', e => { if (e.key === 'Enter') this._addHabit(); });
  }

  render() {
    this._renderHeader();
    this._renderStats();
    this._renderWeeklySummary();
    this._renderGrid();
    this._renderTopHabits();
    this._renderOverviewChart();
  }

  _renderHeader() {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('hMonthLabel').textContent = months[this.manager.viewMonth-1] + ' ' + this.manager.viewYear;
  }

  _renderStats() {
    const s = this.manager.overallStats;
    document.getElementById('hStatCompleted').textContent = s.completed;
    document.getElementById('hStatLeft').textContent      = s.left;
    const pct = s.total ? Math.round((s.completed/s.total)*100) : 0;
    document.getElementById('hProgressBar').style.width   = pct + '%';
    document.getElementById('hProgressPct').textContent   = pct + '%';
  }

  _renderWeeklySummary() {
    const el = document.getElementById('hWeeklySummary');
    if (!el) return;

    // Get current week Mon-Sun
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - dayOfWeek); weekStart.setHours(0,0,0,0);
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);

    let totalPossible = 0, totalDone = 0;
    const habitStats = this.manager.habits.map(h => {
      let done = 0, possible = 0;
      for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart); date.setDate(weekStart.getDate() + d);
        if (date > today) continue;
        possible++;
        const key = date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0');
        if (h.isCompleted(key)) done++;
      }
      totalPossible += possible; totalDone += done;
      return { name: h.name, done, possible };
    });

    const pct = totalPossible ? Math.round(totalDone/totalPossible*100) : 0;
    const best = [...habitStats].sort((a,b) => (b.done/Math.max(b.possible,1)) - (a.done/Math.max(a.possible,1)))[0];
    const worst = [...habitStats].filter(h=>h.possible>0).sort((a,b) => (a.done/Math.max(a.possible,1)) - (b.done/Math.max(b.possible,1)))[0];

    el.innerHTML = '<div class="weekly-card">'
      + '<div class="weekly-title">&#128197; This Week\'s Summary</div>'
      + '<div class="weekly-stats">'
      + '<div class="weekly-stat"><div class="weekly-stat-val">' + totalDone + '/' + totalPossible + '</div><div class="weekly-stat-label">habits done</div></div>'
      + '<div class="weekly-stat"><div class="weekly-stat-val">' + pct + '%</div><div class="weekly-stat-label">completion</div></div>'
      + (best   ? '<div class="weekly-stat"><div class="weekly-stat-val best-stat">'  + best.name.split(' ').slice(0,2).join(' ')  + '</div><div class="weekly-stat-label">&#127942; best habit</div></div>'  : '')
      + (worst && worst.done < worst.possible ? '<div class="weekly-stat"><div class="weekly-stat-val worst-stat">' + worst.name.split(' ').slice(0,2).join(' ') + '</div><div class="weekly-stat-label">&#128293; needs work</div></div>' : '')
      + '</div>'
      + '<div class="weekly-bar-wrap"><div class="weekly-bar" style="width:' + pct + '%"></div></div>'
      + '</div>';
  }

  _calcStreak(habit) {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      if (habit.isCompleted(key)) { streak++; } else { break; }
    }
    return streak;
  }

  _renderGrid() {
    const container = document.getElementById('hGrid');
    const overview  = this.manager.getMonthOverview();
    const days      = this.manager.daysInView;
    const today     = new Date();
    const todayStr  = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

    let headerHtml = '<div class="hgrid-corner">Habit</div>';
    for (let d = 1; d <= days; d++) {
      const dateStr = this.manager.viewYear + '-' + String(this.manager.viewMonth).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      headerHtml += '<div class="hgrid-day-head' + (dateStr === todayStr ? ' today' : '') + '">' + d + '</div>';
    }

    let overviewHtml = '<div class="hgrid-habit-cell overview-label">Daily Score</div>';
    overview.forEach(day => {
      const pct = Math.round(day.pct * 100);
      const cls = pct===100?'ov-perfect':pct>=70?'ov-good':pct>=40?'ov-mid':'ov-low';
      overviewHtml += '<div class="hgrid-cell overview-cell ' + cls + '" title="' + day.done + '/' + day.total + '">' + pct + '%</div>';
    });

    let habitsHtml = this.manager.habits.map(h => {
      const streak = this._calcStreak(h);
      const streakBadge = streak > 0
        ? '<span class="streak-badge" title="'+streak+' day streak">'+(streak>=7?'&#128293;':'&#11088;')+' '+streak+'</span>'
        : '';
      let rowHtml = '<div class="hgrid-habit-cell">'
        + '<span class="habit-name-text">' + h.name + '</span>'
        + streakBadge
        + '<div class="habit-actions">'
        + '<button class="habit-rename-btn" onclick="app.renameHabit('+h.id+')" title="Rename">&#9999;&#65039;</button>'
        + '<button class="habit-del-btn" onclick="app.deleteHabit('+h.id+')" title="Delete">&#128465;&#65039;</button>'
        + '</div></div>';
      for (let d = 1; d <= days; d++) {
        const dateStr = this.manager.viewYear + '-' + String(this.manager.viewMonth).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        const done = h.isCompleted(dateStr);
        rowHtml += '<div class="hgrid-cell habit-cell ' + (done?'done':'undone') + '" onclick="app.toggleHabit('+h.id+',\''+dateStr+'\')" title="'+(done?'Done':'Not done')+'">' + (done?'&#10003;':'') + '</div>';
      }
      return rowHtml;
    }).join('');

    container.innerHTML = headerHtml + overviewHtml + habitsHtml;
    container.style.gridTemplateColumns = '280px repeat(' + days + ', 38px)';
  }

  _renderTopHabits() {
    const top = this.manager.getTopHabits();
    const container = document.getElementById('hTopHabits');
    container.innerHTML = top.map(({ habit, rate }) => {
      const streak = this._calcStreak(habit);
      const streakHtml = streak > 0
        ? '<span class="streak-badge-sm">' + (streak>=7?'&#128293;':'&#11088;') + ' ' + streak + 'd</span>'
        : '';
      return '<div class="top-habit-row">'
        + '<span class="top-habit-name">' + habit.name + '</span>'
        + streakHtml
        + '<div class="top-habit-bar-wrap"><div class="top-habit-bar" style="width:'+Math.round(rate*100)+'%"></div></div>'
        + '<span class="top-habit-pct">'+Math.round(rate*100)+'%</span>'
        + '</div>';
    }).join('');
  }

  _renderOverviewChart() {
    const canvas = document.getElementById('hOverviewCanvas');
    if (!canvas) return;
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,W,H);
    const overview = this.manager.getMonthOverview();
    const barW = Math.max(2, (W/overview.length)-2);
    overview.forEach((day, i) => {
      const x = i*(W/overview.length);
      const h = day.pct*(H-20);
      const color = day.pct===1?'#22c55e':day.pct>=0.7?'#84cc16':day.pct>=0.4?'#eab308':'#ef4444';
      ctx.fillStyle = color+'99'; ctx.fillRect(x, H-h-10, barW, h);
      ctx.fillStyle = color;      ctx.fillRect(x, H-h-10, barW, 3);
    });
  }

  _addHabit() {
    const input = document.getElementById('hNewHabitInput');
    const name = input.value.trim();
    if (!name) return;
    this.manager.addHabit(name);
    input.value = '';
    this.render();
  }
}
