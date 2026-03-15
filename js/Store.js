// ============================================================
// Store.js — Persistence layer (localStorage wrapper)
// ============================================================

class Store {
  static KEYS = { ASSIGNMENTS: 'lt_assignments', HABITS: 'lt_habits' };

  static saveAssignments(assignments) {
    localStorage.setItem(Store.KEYS.ASSIGNMENTS, JSON.stringify(assignments.map(a => a.toJSON())));
  }

  static loadAssignments() {
    try {
      const raw = localStorage.getItem(Store.KEYS.ASSIGNMENTS);
      if (!raw) return Store._defaultAssignments();
      const parsed = JSON.parse(raw).map(Assignment.fromJSON);
      return parsed.length ? parsed : Store._defaultAssignments();
    } catch { return Store._defaultAssignments(); }
  }

  static saveHabits(habits) {
    localStorage.setItem(Store.KEYS.HABITS, JSON.stringify(habits.map(h => h.toJSON())));
  }

  static loadHabits() {
    try {
      const raw = localStorage.getItem(Store.KEYS.HABITS);
      if (!raw) return Store._defaultHabits();
      const parsed = JSON.parse(raw).map(Habit.fromJSON);
      return parsed.length ? parsed : Store._defaultHabits();
    } catch { return Store._defaultHabits(); }
  }

  static _defaultAssignments() {
    return [
      new Assignment({ id:1, courseName:'', title:'Algebra Worksheet – 2 Marks', assignedDate:'2025-11-01', dueDate:'2025-11-10', status:'Completed', priority:'Low', progress:100, submissionType:'Physical Submission', completedDate:'2025-11-06' }),
      new Assignment({ id:2, courseName:'', title:'Quantum Theory Research', assignedDate:'2025-11-02', dueDate:'2025-11-15', status:'Completed', priority:'High', progress:100, submissionType:'Google Form', completedDate:'2025-11-17' }),
      new Assignment({ id:3, courseName:'', title:'Literature Review Essay', assignedDate:'2025-11-05', dueDate:'2025-11-10', status:'Completed', priority:'Medium', progress:100, submissionType:'Email Submission', completedDate:'' }),
      new Assignment({ id:4, courseName:'', title:'Balance Sheet Analysis', assignedDate:'2025-11-10', dueDate:'2025-11-15', status:'Completed', priority:'Low', progress:100, submissionType:'Online Upload', completedDate:'2025-11-12' }),
      new Assignment({ id:5, courseName:'', title:'Data Structures Project', assignedDate:'2025-11-11', dueDate:'2025-11-14', status:'Completed', priority:'High', progress:100, submissionType:'Physical Submission', completedDate:'2025-11-19' }),
      new Assignment({ id:6, courseName:'', title:'Lab Report – Acid Reactions', assignedDate:'2025-11-08', dueDate:'2025-11-09', status:'Completed', priority:'Low', progress:100, submissionType:'Physical Submission', completedDate:'' }),
      new Assignment({ id:7, courseName:'', title:'Marketing Plan Presentation', assignedDate:'2025-11-04', dueDate:'2025-11-06', status:'Completed', priority:'Low', progress:100, submissionType:'Physical Submission', completedDate:'2025-11-06' }),
      new Assignment({ id:8, courseName:'', title:'Microeconomics Case Study', assignedDate:'2025-11-06', dueDate:'2025-11-11', status:'Completed', priority:'High', progress:100, submissionType:'Physical Submission', completedDate:'2025-11-09' }),
      new Assignment({ id:9, courseName:'', title:'Website Design Audit', assignedDate:'2025-11-07', dueDate:'2025-11-15', status:'Completed', priority:'Medium', progress:100, submissionType:'Physical Submission', completedDate:'' }),
      new Assignment({ id:10, courseName:'', title:'Climate Change Report', assignedDate:'2025-11-05', dueDate:'2025-11-10', status:'Completed', priority:'High', progress:100, submissionType:'Google Form', completedDate:'2025-11-07' }),
      new Assignment({ id:11, courseName:'', title:'Chemical Bonding', assignedDate:'2025-11-11', dueDate:'2025-11-20', status:'Completed', priority:'High', progress:100, submissionType:'Physical Submission', completedDate:'2025-11-08' }),
      new Assignment({ id:12, courseName:'', title:'Algebra Sequence', assignedDate:'2025-11-12', dueDate:'2025-11-15', status:'In Progress', priority:'Medium', progress:50, submissionType:'Physical Submission', completedDate:'' }),
    ];
  }

  static _defaultHabits() {
    return [
      new Habit({ id:1, name:'⏰ Wake up before 7 AM' }),
      new Habit({ id:2, name:'🏃‍♂️ Exercise / Walk (30 min)' }),
      new Habit({ id:3, name:'📚 Study / Skill learning (2 hrs)' }),
      new Habit({ id:4, name:'🕘 Attend classes / Work on time' }),
      new Habit({ id:5, name:'🎯 Complete top 3 tasks' }),
      new Habit({ id:6, name:'💧 Drink 2L of water' }),
      new Habit({ id:7, name:'📵 No mindless social media' }),
      new Habit({ id:8, name:'📖 Read 10 pages' }),
      new Habit({ id:9, name:'📝 Plan tomorrow (5 min)' }),
      new Habit({ id:10, name:'😴 Sleep before 11 PM' }),
    ];
  }
}
