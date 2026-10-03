# DueNow Homework Manager

A clean, dark-themed homework management web app for high school students. Built with pure HTML/CSS/JS — no frameworks, no build tools, no server. Just open `index.html` in your browser.

## Features

- **Today Dashboard** — Today's classes (merged double periods), due homework, upcoming deadlines, daily progress
- **Homework** — Grouped by subject, add/edit/delete/complete, priority tags, estimated time, 5 filter tabs
- **Schedule** — Weekly timetable with color-coded subjects, click any class to quickly add homework
- **Calendar** — Monthly view with due-date dots, click any date to see that day's homework
- **Stats** — Weekly completion ring, on-time rate, homework by subject, completed per day
- **Settings** — Reminder toggles, course list, JSON import/export, clear data, version display
- **Search** — Find homework by title, subject, or teacher
- **Keyboard Shortcuts** — `Ctrl/Cmd+N` add, `Esc` close, `Enter` save
- **Responsive** — Floating rounded sidebar on desktop/iPad, bottom tab bar on mobile

## Getting Started

1. Download or clone this folder
2. Double-click `index.html` to open in any modern browser (Chrome, Edge, Safari, Firefox)
3. Start adding homework — data is saved locally in your browser (localStorage)

### On iPad

1. Transfer the folder to your iPad (AirDrop recommended)
2. Open `index.html` in **Safari** (not the Files app preview)
3. Tap Share → **Add to Home Screen** for a full-screen app-like experience

## File Structure

```
duenow-app-en/
├── index.html        # Entry point, all page markup
├── css/
│   └── style.css     # Dark theme, responsive layout
├── js/
│   ├── data.js       # Subjects, schedule, periods (static data)
│   ├── storage.js    # localStorage CRUD, statistics, import/export
│   └── app.js        # Routing, rendering, interactions
├── .gitignore
└── README.md
```

## Data & Privacy

- All data is stored **locally** in your browser via `localStorage`
- Nothing is sent to any server
- Clearing browser data will erase your homework — use **Export JSON Backup** in Settings regularly
- Keys: `duenow_homework_v1` (homework), `duenow_settings_v1` (settings)

## Version

- **v1.0.0** — Initial release
- Version number is displayed in Settings → Data & Backup
- Git is initialized; use `git log` to view version history

## Tech Stack

- Pure HTML5 / CSS3 / JavaScript (ES6+)
- No external dependencies
- No build step required
- Works offline after first load

## Customization

- **Subjects / Schedule**: Edit `js/data.js` — `SUBJECTS`, `TIMETABLE`, `PERIODS`
- **Theme colors**: Edit CSS variables at the top of `css/style.css`
- **Default sample data**: Edit the `init()` function in `js/app.js`
