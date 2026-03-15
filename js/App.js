// ============================================================
// App.js — Entry point, wires all classes together
// ============================================================

class App {
  constructor() {
    this.assignmentManager = new AssignmentManager(Store.loadAssignments());
    this.habitManager = new HabitManager(Store.loadHabits());
    this.assignmentUI = new AssignmentUI(this.assignmentManager);
    this.habitUI = new HabitUI(this.habitManager);
    this._bindTabs();
    this._showTab('assignments');
  }

  _bindTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this._showTab(btn.dataset.tab));
    });
  }

  _showTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
    if (tabId === 'assignments') this.assignmentUI.render();
    if (tabId === 'habits') { this.habitUI.render(); }
  }

  // Exposed to inline onclick handlers
  editAssignment(id) {
    const a = this.assignmentManager.assignments.find(a => a.id === id);
    if (a) this.assignmentUI.openModal(a);
  }

  deleteAssignment(id) {
    if (confirm('Delete this assignment?')) {
      this.assignmentManager.delete(id);
      this.assignmentUI.render();
    }
  }

  toggleHabit(habitId, dateStr) {
    this.habitManager.toggle(habitId, dateStr);
    this.habitUI.render();
  }

  deleteHabit(id) {
    if (confirm('Delete this habit?')) {
      this.habitManager.deleteHabit(id);
      this.habitUI.render();
    }
  }

  renameHabit(id) {
    const h = this.habitManager.habits.find(h => h.id === id);
    if (!h) return;
    const newName = prompt('Rename habit:', h.name);
    if (newName && newName.trim()) {
      this.habitManager.renameHabit(id, newName.trim());
      this.habitUI.render();
    }
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
