// ============================================================
// HabitUI.js — Renders the Habit Tracker tab
// ============================================================

class HabitUI {
  constructor(manager) {
    this.manager = manager;
    this._bindControls();
  }

  _bindControls() {
    document.getElementById('hPrevMonth').addEventListener('click', () => {
      this.manager.prevMonth(); this.render();
    });
    document.getElementById('hNextMonth').addEventListener('click', () => {
      this.manager.nextMonth(); this.render();
    });
    document.getElementById('hAddHabitBtn').addEventListener('click', () => this._addHabit());
    document.getElementById('hNewHabitInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') this._addHabit();
    });
  }

  render() {
    this._renderHeader();
    this._renderStats();
    this._renderGrid();
    this._renderTopHabits();
    this._renderOverviewChart();
  }

  _renderHeader() {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('hMonthLabel').textContent =
      `${months[this.manager.viewMonth - 1]} ${this.manager.viewYear}`;
  }

  _renderStats() {
    const s = this.manager.overallStats;
    document.getElementById('hStatCompleted').textContent = s.completed;
    document.getElementById('hStatLeft').textContent = s.left;
    const pct = s.total ? Math.round((s.completed / s.total) * 100) : 0;
    document.getElementById('hProgressBar').style.width = pct + '%';
    document.getElementById('hProgressPct').textContent = pct + '%';
  }

  _renderGrid() {
    const container = document.getElementById('hGrid');
    const overview = this.manager.getMonthOverview();
    const days = this.manager.daysInView;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // Header row
    let headerHtml = `<div class="hgrid-corner">Habit</div>`;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${this.manager.viewYear}-${String(this.manager.viewMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      headerHtml += `<div class="hgrid-day-head ${isToday ? 'today' : ''}">${d}</div>`;
    }

    // Stats row (overview)
    let overviewHtml = `<div class="hgrid-habit-cell overview-label">Daily Score</div>`;
    overview.forEach(day => {
      const pct = Math.round(day.pct * 100);
      const cls = pct === 100 ? 'ov-perfect' : pct >= 70 ? 'ov-good' : pct >= 40 ? 'ov-mid' : 'ov-low';
      overviewHtml += `<div class="hgrid-cell overview-cell ${cls}" title="${day.done}/${day.total}">${pct}%</div>`;
    });

    // Habit rows
    let habitsHtml = this.manager.habits.map(h => {
      let rowHtml = `
        <div class="hgrid-habit-cell">
          <span class="habit-name-text">${h.name}</span>
          <div class="habit-actions">
            <button class="habit-rename-btn" onclick="app.renameHabit(${h.id})" title="Rename">✏️</button>
            <button class="habit-del-btn" onclick="app.deleteHabit(${h.id})" title="Delete">🗑️</button>
          </div>
        </div>`;
      for (let d = 1; d <= days; d++) {
        const dateStr = `${this.manager.viewYear}-${String(this.manager.viewMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const done = h.isCompleted(dateStr);
        rowHtml += `<div class="hgrid-cell habit-cell ${done ? 'done' : 'undone'}"
          onclick="app.toggleHabit(${h.id}, '${dateStr}')"
          title="${done ? '✅ Done' : '○ Not done'}">
          ${done ? '✓' : ''}
        </div>`;
      }
      return rowHtml;
    }).join('');

    container.innerHTML = headerHtml + overviewHtml + habitsHtml;
    container.style.gridTemplateColumns = `220px repeat(${days}, 38px)`;
  }

  _renderTopHabits() {
    const top = this.manager.getTopHabits();
    const container = document.getElementById('hTopHabits');
    container.innerHTML = top.map(({ habit, rate }) => `
      <div class="top-habit-row">
        <span class="top-habit-name">${habit.name}</span>
        <div class="top-habit-bar-wrap">
          <div class="top-habit-bar" style="width:${Math.round(rate * 100)}%"></div>
        </div>
        <span class="top-habit-pct">${Math.round(rate * 100)}%</span>
      </div>
    `).join('');
  }

  _renderOverviewChart() {
    const overview = this.manager.getMonthOverview();
    const canvas = document.getElementById('hOverviewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 120;
    ctx.clearRect(0, 0, W, H);

    const barW = Math.max(2, (W / overview.length) - 2);
    overview.forEach((day, i) => {
      const x = i * (W / overview.length);
      const h = day.pct * (H - 20);
      const pct = day.pct;
      const color = pct === 1 ? '#22c55e' : pct >= 0.7 ? '#84cc16' : pct >= 0.4 ? '#eab308' : '#ef4444';
      ctx.fillStyle = color + '99';
      ctx.fillRect(x, H - h - 10, barW, h);
      ctx.fillStyle = color;
      ctx.fillRect(x, H - h - 10, barW, 3);
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
