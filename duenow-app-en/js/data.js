/**
 * DueNow Homework Manager - Static Data (Subjects / Schedule / Periods)
 * Source: User-provided schedule image + notes (Thursday middle two slots = Politics)
 */

// App version
const APP_VERSION = '2.0.0';

// Subject definitions
const SUBJECTS = {
  math:      { name: 'Math',       fullName: 'PreAP Maths',           teacher: 'Zhang Yufei',  room: '211',          color: '#60A5FA' },
  english:   { name: 'English',    fullName: 'High School English',   teacher: 'Zhu Shasha',   room: '409',          color: '#F472B6' },
  sat:       { name: 'SAT',        fullName: 'SAT English R&G',       teacher: 'Cai Yuhao',    room: '407',          color: '#2DD4BF' },
  chinese:   { name: 'Chinese',    fullName: 'Chinese',                teacher: 'Zhao Changtian',room: '308',         color: '#F87171' },
  biology:   { name: 'Biology',    fullName: 'Biology',                teacher: 'Li Lina',      room: '214',          color: '#4ADE80' },
  chemistry: { name: 'Chemistry',  fullName: 'Chemistry',              teacher: 'Yun Song',     room: '610',          color: '#FBBF24' },
  physics:   { name: 'Physics',    fullName: 'Physics',                teacher: 'Guan Xiaoling',room: '311',          color: '#22D3EE' },
  geography: { name: 'Geography',  fullName: 'Geography',              teacher: 'Zhang Jingyi', room: '410',          color: '#A3E635' },
  pe:        { name: 'PE',         fullName: 'Physical Education',     teacher: 'Ai Wen',       room: 'Playground',   color: '#FB923C' },
  hic:       { name: 'Innovation', fullName: 'Harvard Innovation',     teacher: 'Zuo Shiwei',   room: '409',          color: '#FACC15' },
  politics:  { name: 'Politics',   fullName: 'Politics',               teacher: '',              room: '',             color: '#FB7185' },
  college:   { name: 'Counseling', fullName: 'College Counseling',     teacher: 'Ma Jing',      room: '3F Multi-Purpose Hall', color: '#94A3B8' }
};

// 8 periods (40 min each)
const PERIODS = [
  { start: '08:00', end: '08:40' },
  { start: '08:50', end: '09:30' },
  { start: '09:40', end: '10:20' },
  { start: '10:30', end: '11:10' },
  { start: '12:30', end: '13:10' },
  { start: '13:20', end: '14:00' },
  { start: '14:10', end: '14:50' },
  { start: '15:00', end: '15:40' }
];

// Weekly schedule [day 0=Mon .. 4=Fri][period 0..7] = subjectKey or null
const TIMETABLE = [
  ['math',     'math',     'english', 'english', 'chinese', 'chinese', 'pe',      'pe'],
  ['biology',  'biology',  'physics', 'physics', 'english', 'english', 'sat',     'sat'],
  ['chinese',  'geography','pe',      'pe',      'math',    'math',    'english', 'english'],
  ['chemistry','physics',  'hic',     'hic',     'politics','politics','college', null],
  ['english',  'english',  'chemistry','chemistry','sat',   'sat',     'pe',      'pe']
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/**
 * Get deduplicated courses for a day (merge double periods)
 * @param {number} dayIndex 0=Mon
 * @returns {Array<{subject:string, periods:number[], start:string, end:string, isDouble:boolean}>}
 */
function getDayCourses(dayIndex) {
  const day = TIMETABLE[dayIndex];
  if (!day) return [];
  const courses = [];
  let i = 0;
  while (i < day.length) {
    const subj = day[i];
    if (!subj) { i++; continue; }
    let j = i;
    while (j + 1 < day.length && day[j + 1] === subj) j++;
    const periods = [];
    for (let k = i; k <= j; k++) periods.push(k);
    courses.push({
      subject: subj,
      periods,
      start: PERIODS[periods[0]].start,
      end: PERIODS[periods[periods.length - 1]].end,
      isDouble: periods.length >= 2
    });
    i = j + 1;
  }
  return courses;
}

/** Get today's day index (0=Mon..4=Fri), returns -1 on weekends */
function getTodayDayIndex() {
  const d = new Date().getDay(); // 0=Sun
  if (d >= 1 && d <= 5) return d - 1;
  return -1;
}

// ===== Clubs / Extracurricular Activities =====
const CLUBS = {
  engineering: { name: 'Engineering Club',   short: 'Engineering', color: '#F97316' },
  physics:     { name: 'Physics Club',       short: 'Physics',     color: '#22D3EE' },
  circuit:     { name: 'CircuitXplorer',     short: 'CircuitX',   color: '#A78BFA' },
  cs:          { name: 'CS Interest Group',  short: 'CS Group',    color: '#34D399' },
  photography: { name: 'Photography Club',   short: 'Photography', color: '#F472B6' }
};

// Club time slots: noon (lunch break) or after school
const CLUB_SLOTS = {
  noon:        { label: 'Lunch Break', time: '12:30 – 13:10' },
  afterschool: { label: 'After School', time: '15:40 – 17:00' }
};

// ===== 2026 Chinese Public Holidays (from State Council notice) =====
const HOLIDAYS_2026 = {
  '2026-01-01': { name: "New Year's Day", type: 'holiday' },
  '2026-01-02': { name: "New Year's Day", type: 'holiday' },
  '2026-01-03': { name: "New Year's Day", type: 'holiday' },
  '2026-01-04': { name: 'Workday (adjusted)', type: 'workday' },
  '2026-02-14': { name: 'Workday (Spring Festival adjusted)', type: 'workday' },
  '2026-02-15': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-16': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-17': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-18': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-19': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-20': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-21': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-22': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-23': { name: 'Spring Festival', type: 'holiday' },
  '2026-02-28': { name: 'Workday (Spring Festival adjusted)', type: 'workday' },
  '2026-04-04': { name: 'Qingming Festival', type: 'holiday' },
  '2026-04-05': { name: 'Qingming Festival', type: 'holiday' },
  '2026-04-06': { name: 'Qingming Festival', type: 'holiday' },
  '2026-05-01': { name: 'Labour Day', type: 'holiday' },
  '2026-05-02': { name: 'Labour Day', type: 'holiday' },
  '2026-05-03': { name: 'Labour Day', type: 'holiday' },
  '2026-05-04': { name: 'Labour Day', type: 'holiday' },
  '2026-05-05': { name: 'Labour Day', type: 'holiday' },
  '2026-05-09': { name: 'Workday (Labour Day adjusted)', type: 'workday' },
  '2026-06-19': { name: 'Dragon Boat Festival', type: 'holiday' },
  '2026-06-20': { name: 'Dragon Boat Festival', type: 'holiday' },
  '2026-06-21': { name: 'Dragon Boat Festival', type: 'holiday' },
  '2026-09-25': { name: 'Mid-Autumn Festival', type: 'holiday' },
  '2026-09-26': { name: 'Mid-Autumn Festival', type: 'holiday' },
  '2026-09-27': { name: 'Mid-Autumn Festival', type: 'holiday' },
  '2026-10-01': { name: 'National Day', type: 'holiday' },
  '2026-10-02': { name: 'National Day', type: 'holiday' },
  '2026-10-03': { name: 'National Day', type: 'holiday' },
  '2026-10-04': { name: 'National Day', type: 'holiday' },
  '2026-10-05': { name: 'National Day', type: 'holiday' },
  '2026-10-06': { name: 'National Day', type: 'holiday' },
  '2026-10-07': { name: 'National Day', type: 'holiday' }
};

/** Check if a date is a public holiday */
function isHoliday(dateStr) {
  const h = HOLIDAYS_2026[dateStr];
  return h && h.type === 'holiday';
}

/** Check if a date is an adjusted workday (weekend but school) */
function isAdjustedWorkday(dateStr) {
  const h = HOLIDAYS_2026[dateStr];
  return h && h.type === 'workday';
}

/** Get holiday name for a date */
function getHolidayName(dateStr) {
  const h = HOLIDAYS_2026[dateStr];
  return h ? h.name : null;
}
