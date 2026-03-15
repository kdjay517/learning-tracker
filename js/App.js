class App {
  constructor() {
    this._undoStack = [];
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
        const cur  = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
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
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      console.error('Firebase config missing.');
      if (overlay) overlay.style.display = 'none';
      return;
    }

    const firebaseApp = initializeApp(firebaseConfig);
    const db = getFirestore(firebaseApp);
    try { await enableIndexedDbPersistence(db); } catch(e) {}
    Store.init(db);

    // Initialize Auth — wait for auth state
    const user = await Auth.init(firebaseApp);

    if (!user) {
      // Not logged in — show login screen
      if (overlay) overlay.style.display = 'none';
      this._showLoginScreen();
      return;
    }

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
    const overlay = document.getElementById('loadingOverlay');
    try {
      document.getElementById('googleSignInBtn').disabled = true;
      document.getElementById('googleSignInBtn').textContent = 'Signing in...';
      await Auth.signIn();
      if (overlay) overlay.style.display = 'flex';
      this._hideLoginScreen();
      await this._loadApp(overlay);
    } catch (e) {
      document.getElementById('googleSignInBtn').disabled = false;
      document.getElementById('googleSignInBtn').innerHTML = '<span class="google-icon">G</span> Sign in with Google';
      if (e.code !== 'auth/popup-closed-by-user') {
        Store._showToast('Sign in failed: ' + e.message, 'warn');
      }
    }
  }

  async signOut() {
    if (!confirm('Sign out?')) return;
    await Auth.signOut();
    // Reset app state
    this.assignmentManager = null;
    this.habitManager = null;
    this.assignmentUI = null;
    this.habitUI = null;
    this._showLoginScreen();
    this._updateUserAvatar();
  }

  async _loadApp(overlay) {
    this._updateUserAvatar();
    this._hideLoginScreen();

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

    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => { overlay.style.display = 'none'; overlay.classList.remove('fade-out'); }, 400);
    }

    setTimeout(() => this._checkNotificationPermission(), 2000);
    this._scheduleDueReminders();
  }

  _updateUserAvatar() {
    const container = document.getElementById('userAvatar');
    if (!container) return;
    if (!Auth.isLoggedIn) { container.innerHTML = ''; return; }

    const photo = Auth.photoURL;
    const name  = Auth.displayName || Auth.email || 'User';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    container.innerHTML = '<div class="user-menu" id="userMenu">'
      + (photo
          ? '<img src="' + photo + '" class="user-avatar-img" alt="' + name + '" onclick="document.getElementById(\'userDropdown\').classList.toggle(\'open\')" />'
          : '<div class="user-avatar-initials" onclick="document.getElementById(\'userDropdown\').classList.toggle(\'open\')">' + initials + '</div>')
      + '<div class="user-dropdown" id="userDropdown">'
      + '<div class="user-dropdown-name">' + name + '</div>'
      + '<div class="user-dropdown-email">' + (Auth.email || '') + '</div>'
      + '<button class="user-signout-btn" onclick="app.signOut()">&#128275; Sign out</button>'
      + '</div></div>';

    // Close dropdown when clicking outside
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
    if (tabId === 'assignments') this.assignmentUI.render();
    if (tabId === 'habits') this.habitUI.render();
  }

  deleteAssignment(id) {
    const a = this.assignmentManager.assignments.find(a => a.id === id);
    if (!a) return;
    if (!confirm('Delete "' + a.title + '"?\nThis cannot be undone.')) return;
    this.assignmentManager.delete(id);
    this.assignmentUI.render();
    Store._showToast('Assignment deleted', 'warn');
  }

  toggleHabit(habitId, dateStr) {
    this.habitManager.toggle(habitId, dateStr);
    this.habitUI.render();
  }

  deleteHabit(id) {
    const h = this.habitManager.habits.find(h => h.id === id);
    if (!h) return;
    if (!confirm('Delete habit "' + h.name + '"?')) return;
    this.habitManager.deleteHabit(id);
    this.habitUI.render();
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

  _checkNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const banner = document.getElementById('reminderBanner');
      if (banner) banner.style.display = 'flex';
    }
  }

  enableNotifications() {
    const banner = document.getElementById('reminderBanner');
    if (banner) banner.style.display = 'none';
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        Store._showToast('Notifications enabled!', 'success');
        this._scheduleDueReminders();
      }
    });
  }

  _scheduleDueReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!this.assignmentManager) return;
    this.assignmentManager.assignments.forEach(a => {
      if (!a.dueDate || a.status === 'Completed') return;
      const daysLeft = a.daysLeft;
      if (daysLeft === 1) setTimeout(() => new Notification('Due tomorrow: ' + a.title, { body: (a.courseName||'Assignment') + ' is due tomorrow!' }), 500);
      if (daysLeft === 0) setTimeout(() => new Notification('Due TODAY: ' + a.title,    { body: (a.courseName||'Assignment') + ' is due today!' }), 500);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
