class App {
  constructor() {
    if (window.FirebaseAppAPI && window.FirestoreAPI) {
      this._init();
    } else {
      window.addEventListener('firebase-ready', () => this._init(), { once: true });
    }
  }

  async _init() {
    document.body.style.opacity = '0.6';

    const { initializeApp } = window.FirebaseAppAPI;
    const { getFirestore }  = window.FirestoreAPI;

    // Config injected by Netlify at build time via _headers or env vars
    // Falls back to window.__FIREBASE_CONFIG__ set in index.html
    const firebaseConfig = window.__FIREBASE_CONFIG__;

    if (!firebaseConfig || !firebaseConfig.apiKey) {
      console.error('Firebase config missing. Set environment variables in Netlify.');
      document.body.style.opacity = '1';
      return;
    }

    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    Store.init(db);

    const [assignments, habits] = await Promise.all([
      Store.loadAssignments(),
      Store.loadHabits()
    ]);

    this.assignmentManager = new AssignmentManager(assignments);
    this.habitManager      = new HabitManager(habits);
    this.assignmentUI      = new AssignmentUI(this.assignmentManager);
    this.habitUI           = new HabitUI(this.habitManager);

    this._bindTabs();
    this._showTab('assignments');
    document.body.style.opacity = '1';
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
    if (tabId === 'habits') this.habitUI.render();
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

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
