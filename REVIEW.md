# Review and redesign

The original app has a useful foundation: offline homework storage, a full timetable, clubs, calendar, and statistics. The main problems found were incorrect filters, incomplete backups, missing calendar navigation, unbound dashboard links, and silent save failures.

The redesign retains all seven sections and the existing data schema. The October 3 revision adopts a minimal dark theme. Due homework, upcoming deadlines, and today’s classes form the main view. Direct instructions explain the controls. The focus timer, illustration, slogans, summary tiles, and dashboard progress card have been removed. Secondary tools remain accessible without crowding the main navigation.

The most consequential fixes are complete backups covering all four collections, import validation and recovery, accurate homework filters, and restricting automatic sample insertion to an isolated demo session.

See `duenow-app-en/README.md` for opening instructions and verification details. `original-v1.3.5/` contains the unmodified source. No saved homework files were present in the project: the original app stores homework in the user's browser, which was not modified during testing.
