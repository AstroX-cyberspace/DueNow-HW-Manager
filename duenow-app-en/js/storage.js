/**
 * DueNow Homework Manager - Storage Layer (localStorage)
 * Handles homework CRUD, status toggle, statistics
 */

const STORAGE_KEY = 'duenow_homework_v1';
const SETTINGS_KEY = 'duenow_settings_v1';
const EXTRA_CLASSES_KEY = 'duenow_extra_classes_v1';

// Default settings
const DEFAULT_SETTINGS = {
  remind24h: true,
  remind3h: true,
  dailyReview: true,
  overdueNudge: false,
  dailyReviewTime: '21:00'
};

/** Load all homework */
function loadHomework() {
  try {
    const raw = DUENOW_STORE.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to load homework', e);
    return [];
  }
}

/** Save all homework */
function saveHomework(list) {
  try {
    DUENOW_STORE.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error('Failed to save homework', e);
    return false;
  }
}

/** Generate unique ID */
function genId() {
  return 'hw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/** Add homework */
function addHomework(item) {
  const list = loadHomework();
  const now = new Date().toISOString();
  const hw = {
    id: genId(),
    title: (item.title || '').trim(),
    subject: item.subject || '',
    type: item.type || 'Daily Practice',
    dueDate: item.dueDate || '',
    dueTime: item.dueTime || '23:59',
    priority: item.priority || 'Medium',
    estimatedMinutes: parseInt(item.estimatedMinutes) || 0,
    source: item.source || 'In-Class',
    notes: item.notes || '',
    completed: false,
    completedAt: null,
    createdAt: now
  };
  if (!hw.title) return null;
  list.push(hw);
  return saveHomework(list) ? hw : null;
}

/** Update homework */
function updateHomework(id, patch) {
  const list = loadHomework();
  const idx = list.findIndex(h => h.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  return saveHomework(list) ? list[idx] : null;
}

/** Delete homework */
function deleteHomework(id) {
  const list = loadHomework();
  const filtered = list.filter(h => h.id !== id);
  if (filtered.length === list.length) return false;
  return saveHomework(filtered);
}

/** Toggle complete status */
function toggleComplete(id) {
  const list = loadHomework();
  const hw = list.find(h => h.id === id);
  if (!hw) return null;
  hw.completed = !hw.completed;
  hw.completedAt = hw.completed ? new Date().toISOString() : null;
  return saveHomework(list) ? hw : null;
}

/** Filter homework by date */
function getHomeworkByDate(dateStr) {
  return loadHomework().filter(h => h.dueDate === dateStr);
}

/** Get today's homework (pending + completed) */
function getTodayHomework() {
  const today = formatDate(new Date());
  return getHomeworkByDate(today);
}

/** Get overdue homework (due date < today AND not completed) */
function getOverdueHomework() {
  const now = new Date();
  return loadHomework().filter(h => !h.completed && h.dueDate && new Date(h.dueDate + 'T' + (h.dueTime || '23:59')) <= now);
}

/** Get upcoming (within N days, not completed) */
function getUpcomingHomework(days = 3) {
  const today = new Date();
  const todayStr = formatDate(today);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  const limitStr = formatDate(limit);
  return loadHomework().filter(h =>
    !h.completed && h.dueDate && h.dueDate > todayStr && h.dueDate <= limitStr
  ).sort((a, b) => (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime));
}

/** Group pending homework by subject */
function getHomeworkBySubject() {
  const list = loadHomework().filter(h => !h.completed);
  const groups = {};
  list.forEach(h => {
    if (!groups[h.subject]) groups[h.subject] = [];
    groups[h.subject].push(h);
  });
  Object.keys(groups).forEach(k => {
    groups[k].sort((a, b) => (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime));
  });
  return groups;
}

/** Statistics: weekly completion rate */
function getWeekStats() {
  const list = loadHomework();
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekItems = list.filter(h => {
    if (!h.dueDate) return false;
    const d = new Date(h.dueDate + 'T' + (h.dueTime || '23:59'));
    return d >= monday && d <= sunday;
  });

  const completed = weekItems.filter(h => h.completed).length;
  const total = weekItems.length;
  const onTime = weekItems.filter(h => {
    if (!h.completed || !h.completedAt) return false;
    const due = new Date(h.dueDate + 'T' + (h.dueTime || '23:59'));
    return new Date(h.completedAt) <= due;
  }).length;

  const bySubject = {};
  weekItems.forEach(h => {
    bySubject[h.subject] = (bySubject[h.subject] || 0) + 1;
  });

  const byDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    byDay[formatDate(d)] = 0;
  }
  list.filter(h => h.completed && h.completedAt).forEach(h => {
    const d = formatDate(new Date(h.completedAt));
    if (byDay[d] !== undefined) byDay[d]++;
  });

  return {
    total,
    completed,
    rate: total > 0 ? Math.round(completed / total * 100) : 0,
    onTimeRate: completed > 0 ? Math.round(onTime / completed * 100) : 0,
    bySubject,
    byDay
  };
}

/** Load settings */
function loadSettings() {
  try {
    const raw = DUENOW_STORE.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Save settings */
function saveSettings(settings) {
  try {
    DUENOW_STORE.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
}

/** Export all data as JSON */
function exportData() {
  return JSON.stringify({
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    homework: loadHomework(),
    settings: loadSettings(),
    extraClasses: loadExtraClasses(),
    clubs: loadClubActivities()
  }, null, 2);
}

/** Import data */
function importData(jsonStr) {
  const keys = [STORAGE_KEY, SETTINGS_KEY, EXTRA_CLASSES_KEY, CLUBS_KEY];
  let before;
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object' || !Array.isArray(data.homework)) return false;
    const text = value => typeof value === 'string';
    const validDate = value => text(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && formatDate(new Date(value + 'T00:00:00')) === value;
    const validTime = value => text(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    const ids = new Set();
    if (!data.homework.every(h => {
      if (!h || !text(h.id) || !h.id || ids.has(h.id) || !text(h.title) || !text(h.subject)) return false;
      ids.add(h.id);
      return (!h.dueDate || validDate(h.dueDate)) && (!h.dueTime || validTime(h.dueTime)) &&
        ['type','priority','source','notes','createdAt','completedAt'].every(k => h[k] == null || text(h[k])) &&
        (h.completed == null || typeof h.completed === 'boolean') &&
        (h.estimatedMinutes == null || (Number.isFinite(h.estimatedMinutes) && h.estimatedMinutes >= 0));
    })) return false;
    if (data.settings != null && (typeof data.settings !== 'object' || Array.isArray(data.settings))) return false;
    if (data.extraClasses != null && (!Array.isArray(data.extraClasses) || !data.extraClasses.every(e => e && text(e.id) && validDate(e.date) && Number.isInteger(e.weekday) && e.weekday >= 0 && e.weekday < 5 && (e.note == null || text(e.note))))) return false;
    if (data.clubs != null && (!Array.isArray(data.clubs) || !data.clubs.every(c => c && text(c.id) && validDate(c.date) && Object.hasOwn(CLUBS,c.club) && Object.hasOwn(CLUB_SLOTS,c.slot) && (c.note == null || text(c.note))))) return false;
    before = keys.map(key => DUENOW_STORE.getItem(key));
    DUENOW_STORE.setItem('duenow_recovery_v1', JSON.stringify({keys, values:before}));
    DUENOW_STORE.setItem(STORAGE_KEY, JSON.stringify(data.homework));
    if (data.settings != null) DUENOW_STORE.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    if (data.extraClasses != null) DUENOW_STORE.setItem(EXTRA_CLASSES_KEY, JSON.stringify(data.extraClasses));
    if (data.clubs != null) DUENOW_STORE.setItem(CLUBS_KEY, JSON.stringify(data.clubs));
    return true;
  } catch (e) {
    if (before) keys.forEach((key,i) => { try { if(before[i] === null) DUENOW_STORE.removeItem(key); else DUENOW_STORE.setItem(key,before[i]); } catch (_) {} });
    console.error('Import failed', e);
    return false;
  }
}

/** Clear all data */
function clearAllData() {
  const keys = [STORAGE_KEY, SETTINGS_KEY, EXTRA_CLASSES_KEY, CLUBS_KEY];
  DUENOW_STORE.setItem('duenow_recovery_v1', JSON.stringify({keys, values:keys.map(key => DUENOW_STORE.getItem(key))}));
  keys.forEach(key => DUENOW_STORE.removeItem(key));
}

// ===== Utility Functions =====

/** Format date as YYYY-MM-DD */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format date for display (EN) */
function formatDateEN(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/** Get day of week name */
function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] || '';
}

/** Calculate due label */
function getDueLabel(hw) {
  if (hw.completed) return { text: 'Done', cls: 'gray' };
  if (!hw.dueDate) return { text: 'No deadline', cls: 'gray' };
  const today = formatDate(new Date());
  if (hw.dueDate < today) return { text: 'Overdue', cls: 'red' };
  if (hw.dueDate === today) {
    const now = new Date();
    const due = new Date(hw.dueDate + 'T' + (hw.dueTime || '23:59'));
    const diffMs = due - now;
    if (diffMs <= 0) return { text: 'Overdue', cls: 'red' };
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 1) return { text: '<1h left', cls: 'red' };
    return { text: `${hours}h left`, cls: 'red' };
  }
  const dueDate = new Date(hw.dueDate + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const diffDays = Math.round((dueDate - todayDate) / 86400000);
  if (diffDays === 1) return { text: 'Tomorrow', cls: 'amber' };
  if (diffDays === 2) return { text: 'In 2 days', cls: 'amber' };
  if (diffDays <= 7) return { text: `In ${diffDays} days`, cls: 'gray' };
  return { text: formatDateEN(hw.dueDate), cls: 'gray' };
}

// ===== Extra Classes (weekend special arrangements) =====

/** Load all extra classes */
function loadExtraClasses() {
  try {
    const raw = DUENOW_STORE.getItem(EXTRA_CLASSES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/** Save extra classes */
function saveExtraClasses(list) {
  try {
    DUENOW_STORE.setItem(EXTRA_CLASSES_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

/** Add an extra class */
function addExtraClass(date, weekday, note) {
  const list = loadExtraClasses();
  const item = {
    id: genId(),
    date: date,
    weekday: weekday, // 0=Mon ... 4=Fri
    note: note || ''
  };
  list.push(item);
  list.sort((a, b) => a.date.localeCompare(b.date));
  return saveExtraClasses(list) ? item : null;
}

/** Delete an extra class */
function deleteExtraClass(id) {
  const list = loadExtraClasses();
  const filtered = list.filter(e => e.id !== id);
  if (filtered.length === list.length) return false;
  return saveExtraClasses(filtered);
}

/** Get extra class for a specific date (if any) */
function getExtraClassByDate(dateStr) {
  return loadExtraClasses().find(e => e.date === dateStr) || null;
}

// ===== Club Activities (Extracurricular) =====

const CLUBS_KEY = 'duenow_clubs_v1';

/** Load all club activities */
function loadClubActivities() {
  try {
    const raw = DUENOW_STORE.getItem(CLUBS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

/** Save club activities */
function saveClubActivities(list) {
  try {
    DUENOW_STORE.setItem(CLUBS_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

/** Add a club activity */
function addClubActivity(date, slot, club, note) {
  const list = loadClubActivities();
  const item = {
    id: genId(),
    date: date,
    slot: slot,       // 'noon' or 'afterschool'
    club: club,       // key from CLUBS
    note: note || ''
  };
  list.push(item);
  list.sort((a, b) => (a.date + (a.slot === 'noon' ? '0' : '1')).localeCompare(b.date + (b.slot === 'noon' ? '0' : '1')));
  return saveClubActivities(list) ? item : null;
}

/** Delete a club activity */
function deleteClubActivity(id) {
  const list = loadClubActivities();
  const filtered = list.filter(e => e.id !== id);
  if (filtered.length === list.length) return false;
  return saveClubActivities(filtered);
}

/** Get club activities for a specific date */
function getClubActivitiesByDate(dateStr) {
  return loadClubActivities().filter(e => e.date === dateStr);
}

/** Get upcoming club activities (from today onwards) */
function getUpcomingClubActivities(days) {
  const today = formatDate(new Date());
  const future = new Date();
  future.setDate(future.getDate() + (days || 30));
  const endDate = formatDate(future);
  return loadClubActivities()
    .filter(e => e.date >= today && e.date <= endDate)
    .sort((a, b) => (a.date + (a.slot === 'noon' ? '0' : '1')).localeCompare(b.date + (b.slot === 'noon' ? '0' : '1')));
}
