# Learning Tracker

A web application to track assignments and daily habits — built with vanilla JS using OOP principles.

## File Structure

```
learning-tracker/
├── index.html               # Main entry point
├── css/
│   └── style.css            # Full dark-theme stylesheet
└── js/
    ├── Assignment.js        # Model — Assignment class
    ├── Habit.js             # Model — Habit class
    ├── Store.js             # Persistence — localStorage wrapper
    ├── AssignmentManager.js # Controller — CRUD, filter, sort
    ├── HabitManager.js      # Controller — month nav, toggles
    ├── AssignmentUI.js      # View — assignment tab renderer
    ├── HabitUI.js           # View — habit tracker renderer
    └── App.js               # Entry point — wires all classes
```

## How to Run

Just open `index.html` in any browser — no server or build step needed.

## Features

- Add, edit, delete assignments with course name, due date, priority, progress
- Filter by status/priority, sort by due date/priority/status
- Habit tracker with daily toggle grid (click a cell to mark done)
- Monthly navigation with overview chart
- All data persists in localStorage

## Deploy to GitHub Pages

1. Push to GitHub
2. Go to Settings → Pages → select `main` branch
3. Your app is live at `https://YOUR_USERNAME.github.io/learning-tracker/`
