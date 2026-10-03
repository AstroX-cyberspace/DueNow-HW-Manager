# DueNow 2.0.0

An offline homework manager. No installation, account, dependencies, or build step required.

## Start

1. Extract the complete ZIP into a folder.
2. Open `index.html` in your browser for the real workspace.
3. For a sample preview, open `demo.html`. Demo changes use isolated session storage.

Keep the `css` and `js` folders beside `index.html`. All assets are local, so the app works offline. Global search remains available from the magnifying-glass button and Ctrl/Cmd+K; the Homework page has filters and sorting without a search field.

## Keep your existing homework

Homework is stored in your browser profile and address, not inside this archive. There is no automatic data migration, renaming, or deadline adjustment.

- If updating at the same address in the same browser/profile, the app continues to use the four original storage keys.
- Before moving to a new folder, browser, or web address, open the old app and export a JSON backup from Settings.
- Open this release at the new location and import that backup through Settings. Verify your homework before removing the old copy.
- Keep the old app and exported backup until the transfer is complete. A different browser or localhost address cannot automatically access the old browser storage.

The release contains no personal saved homework. Import/export includes homework, settings, special class arrangements, and club activities. Legacy backups retain existing collections that are absent from the imported file. Restore previous data recovers the last import/clear snapshot.

## Design and features

- Near-black and off-white editorial layout, lightweight headings, large desktop navigation, and original class colors.
- Today view with due work, upcoming deadlines, and the day's classes.
- Homework creation, editing, deletion, completion, five filters, and sorting by deadline, priority, or duration.
- Weekly timetable with class shortcuts, month calendar, clubs, statistics, reminders, and special arrangements.
- All original class names, teachers, rooms, periods, timetable entries, clubs, slots, and holidays retained. Only the version label in `js/data.js` changed from the original 1.3.5 file.
- Focus timer and decorative dashboard modules removed.

Reminders work while the page is open; they are not background operating-system notifications. Empty real workspaces are never populated with demo homework.

## Shortcuts

Ctrl/Cmd+N adds homework (some browsers reserve it). Ctrl/Cmd+K opens global search. Escape closes dialogs/popovers. Enter in homework inputs saves; Enter in notes retains a newline. Tab and Shift+Tab move through controls.

## Release verification

Version 2.0.0 passed eleven regression checks covering unchanged class data, preserved storage, full and legacy backups, malformed imports, rollback, recovery, demo isolation, deadlines, homework operations/save failures, and weekend labels. JavaScript syntax checks passed. Release browser checks covered the Homework page without search, filtering and sorting.

See `CHANGELOG.md` for release notes. The development repository additionally includes the original source, test fixtures, and the local preview server; these are not needed to run this ZIP.
