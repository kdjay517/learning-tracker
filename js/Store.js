class Store {
  static db = null;

  static init(firestoreDb) {
    Store.db = firestoreDb;
    window.addEventListener('online',  () => { Store._online = true;  Store._showToast('Back online — changes synced', 'success'); });
    window.addEventListener('offline', () => { Store._online = false; Store._showToast('You are offline — changes saved locally', 'warn'); });
  }

  static _userPath(col) {
    const uid = Auth.uid;
    if (!uid) throw new Error('Not authenticated');
    return 'users/' + uid + '/tracker/' + col;
  }

  static _showToast(msg, type) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast toast-' + type + ' toast-show';
    clearTimeout(Store._toastTimer);
    Store._toastTimer = setTimeout(() => { t.classList.remove('toast-show'); }, 3500);
  }

  static async _set(col, data) {
    const { doc, setDoc } = window.FirestoreAPI;
    await setDoc(doc(Store.db, Store._userPath(col)), { data: JSON.stringify(data) });
  }

  static async _get(col) {
    const { doc, getDoc } = window.FirestoreAPI;
    const snap = await getDoc(doc(Store.db, Store._userPath(col)));
    return snap.exists() ? JSON.parse(snap.data().data) : null;
  }

  static async saveAssignments(assignments) {
    if (!Store.db || !Auth.uid) return;
    try { await Store._set('assignments', assignments.map(a => a.toJSON())); }
    catch(e) { console.warn('saveAssignments:', e.message); Store._showToast('Offline — will sync when reconnected', 'warn'); }
  }

  static async loadAssignments() {
    if (!Store.db || !Auth.uid) return Store._defaultAssignments();
    try {
      const data = await Store._get('assignments');
      if (!data) return Store._defaultAssignments();
      const parsed = data.map(Assignment.fromJSON);
      return parsed.length ? parsed : Store._defaultAssignments();
    } catch(e) { return Store._defaultAssignments(); }
  }

  static async saveHabits(habits) {
    if (!Store.db || !Auth.uid) return;
    try { await Store._set('habits', habits.map(h => h.toJSON())); }
    catch(e) { console.warn('saveHabits:', e.message); }
  }

  static async loadHabits() {
    if (!Store.db || !Auth.uid) return Store._defaultHabits();
    try {
      const data = await Store._get('habits');
      if (!data) return Store._defaultHabits();
      const parsed = data.map(Habit.fromJSON);
      return parsed.length ? parsed : Store._defaultHabits();
    } catch(e) { return Store._defaultHabits(); }
  }

  static async saveCourses(courses) {
    if (!Store.db || !Auth.uid) return;
    try { await Store._set('courses', courses); }
    catch(e) { console.warn('saveCourses:', e.message); }
  }

  static async loadCourses() {
    if (!Store.db || !Auth.uid) return [];
    try { return (await Store._get('courses')) || []; }
    catch(e) { return []; }
  }

  static _defaultAssignments() {
    return [
      new Assignment({ id:1,  courseName:'', title:'Algebra Worksheet',         assignedDate:'2025-11-01', dueDate:'2025-11-10', status:'Completed',   priority:'Low',    progress:100, submissionType:'Physical Submission', completedDate:'2025-11-06' }),
      new Assignment({ id:2,  courseName:'', title:'Quantum Theory Research',   assignedDate:'2025-11-02', dueDate:'2025-11-15', status:'Completed',   priority:'High',   progress:100, submissionType:'Google Form',         completedDate:'2025-11-17' }),
      new Assignment({ id:3,  courseName:'', title:'Literature Review Essay',   assignedDate:'2025-11-05', dueDate:'2025-11-10', status:'Completed',   priority:'Medium', progress:100, submissionType:'Email Submission',    completedDate:'' }),
      new Assignment({ id:4,  courseName:'', title:'Balance Sheet Analysis',    assignedDate:'2025-11-10', dueDate:'2025-11-15', status:'Completed',   priority:'Low',    progress:100, submissionType:'Online Upload',       completedDate:'2025-11-12' }),
      new Assignment({ id:5,  courseName:'', title:'Data Structures Project',   assignedDate:'2025-11-11', dueDate:'2025-11-14', status:'Completed',   priority:'High',   progress:100, submissionType:'Physical Submission', completedDate:'2025-11-19' }),
      new Assignment({ id:6,  courseName:'', title:'Lab Report - Acid React',   assignedDate:'2025-11-08', dueDate:'2025-11-09', status:'Completed',   priority:'Low',    progress:100, submissionType:'Physical Submission', completedDate:'' }),
      new Assignment({ id:7,  courseName:'', title:'Marketing Plan Pres.',      assignedDate:'2025-11-04', dueDate:'2025-11-06', status:'Completed',   priority:'Low',    progress:100, submissionType:'Physical Submission', completedDate:'2025-11-06' }),
      new Assignment({ id:8,  courseName:'', title:'Microeconomics Case Study', assignedDate:'2025-11-06', dueDate:'2025-11-11', status:'Completed',   priority:'High',   progress:100, submissionType:'Physical Submission', completedDate:'2025-11-09' }),
      new Assignment({ id:9,  courseName:'', title:'Website Design Audit',      assignedDate:'2025-11-07', dueDate:'2025-11-15', status:'Completed',   priority:'Medium', progress:100, submissionType:'Physical Submission', completedDate:'' }),
      new Assignment({ id:10, courseName:'', title:'Climate Change Report',     assignedDate:'2025-11-05', dueDate:'2025-11-10', status:'Completed',   priority:'High',   progress:100, submissionType:'Google Form',         completedDate:'2025-11-07' }),
      new Assignment({ id:11, courseName:'', title:'Chemical Bonding',          assignedDate:'2025-11-11', dueDate:'2025-11-20', status:'Completed',   priority:'High',   progress:100, submissionType:'Physical Submission', completedDate:'2025-11-08' }),
      new Assignment({ id:12, courseName:'', title:'Algebra Sequence',          assignedDate:'2025-11-12', dueDate:'2025-11-15', status:'In Progress', priority:'Medium', progress:50,  submissionType:'Physical Submission', completedDate:'' }),
    ];
  }

  static _defaultHabits() {
    return [
      new Habit({ id:1,  name:'Wake up before 7 AM' }),
      new Habit({ id:2,  name:'Exercise / Walk (30 min)' }),
      new Habit({ id:3,  name:'Study / Skill learning (2 hrs)' }),
      new Habit({ id:4,  name:'Attend classes / Work on time' }),
      new Habit({ id:5,  name:'Complete top 3 tasks' }),
      new Habit({ id:6,  name:'Drink 2L of water' }),
      new Habit({ id:7,  name:'No mindless social media' }),
      new Habit({ id:8,  name:'Read 10 pages' }),
      new Habit({ id:9,  name:'Plan tomorrow (5 min)' }),
      new Habit({ id:10, name:'Sleep before 11 PM' }),
    ];
  }
}
