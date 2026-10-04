/**
 * DueNow Homework Manager - Main App Logic
 * Handles routing, rendering, homework CRUD, search, notifications, import/export
 */

(function () {
  'use strict';

  let currentPage = 'today';
  let listFilter = 'all';
  let selectedDate = formatDate(new Date());
  let editingId = null;
  let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let listSort = 'due';

  // ===== Routing =====
  function navigate(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-item, .bb-item').forEach(n => {
      n.classList.toggle('active', n.getAttribute('data-page') === page);
    });
    document.getElementById('route-label').textContent = ({today:'Today',list:'Homework',timetable:'Schedule',calendar:'Calendar',clubs:'Clubs',stats:'Stats',settings:'Settings'})[page] || 'Today';
    closePops();
    document.getElementById('more-menu').hidden = true;
    document.getElementById('btn-more').setAttribute('aria-expanded','false');
    document.getElementById('btn-more').classList.toggle('active',['clubs','stats','settings'].includes(page));
    render();
    window.scrollTo({top:0, behavior:'instant'});
  }

  // ===== Main Render Entry =====
  function render() {
    renderNotifications();
    document.dispatchEvent(new Event('duenow:render'));
    switch (currentPage) {
      case 'today': renderToday(); break;
      case 'list': renderList(); break;
      case 'timetable': renderTimetable(); break;
      case 'calendar': renderCalendar(); break;
      case 'stats': renderStats(); break;
      case 'clubs': renderClubs(); break;
      case 'settings': renderSettings(); break;
    }
  }

  // ===== Today Page =====
  function renderToday() {
    const now = new Date();
    const dayIdx = getTodayDayIndex();
    const todayStr = formatDate(now);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayFull = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    document.getElementById('today-date').textContent = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} · ${dayFull[now.getDay()]}`;

    // Today's courses
    const coursesEl = document.getElementById('today-courses');
    if (dayIdx === -1) {
      // Weekend: check for extra class arrangement
      const extra = getExtraClassByDate(todayStr);
      if (extra) {
        const courses = getDayCourses(extra.weekday);
        coursesEl.innerHTML = courses.map(c => {
          const s = SUBJECTS[c.subject];
          return `<div class="course" data-subject="${c.subject}">
            <div class="top"><span class="nm"><i style="background:${s.color}"></i>${escapeHtml(s.name)}</span><span class="badge" style="background:var(--amber-soft);color:var(--amber);">${DAY_NAMES[extra.weekday]} schedule</span></div>
            <div class="time">${c.start} – ${c.end}</div>
            <div class="room">${s.teacher ? s.teacher + ' · ' : ''}${s.room || ''}</div>
          </div>`;
        }).join('') + `<div style="grid-column:1/-1;padding:12px 16px;background:var(--amber-soft);border:1px solid rgba(251,191,36,.3);border-radius:14px;font-size:13px;color:var(--amber);margin-top:4px;">
          ⚠ Weekend special: following ${DAY_NAMES[extra.weekday]}'s schedule today${extra.note ? ' — ' + escapeHtml(extra.note) : ''}
        </div>`;
        coursesEl.querySelectorAll('.course').forEach(el => {
          el.addEventListener('click', () => openAddModal(el.getAttribute('data-subject')));
        });
      } else {
        coursesEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No classes scheduled today.</div>';
      }
    } else {
      const courses = getDayCourses(dayIdx);
      coursesEl.innerHTML = courses.map(c => {
        const s = SUBJECTS[c.subject];
        return `<div class="course" data-subject="${c.subject}">
          <div class="top"><span class="nm"><i style="background:${s.color}"></i>${escapeHtml(s.name)}</span><span class="badge">${c.isDouble ? c.periods.length + ' periods' : '1 period'}</span></div>
          <div class="time">${c.start} – ${c.end}</div>
          <div class="room">${s.teacher ? s.teacher + ' · ' : ''}${s.room || ''}</div>
        </div>`;
      }).join('');
      coursesEl.querySelectorAll('.course').forEach(el => {
        el.addEventListener('click', () => openAddModal(el.getAttribute('data-subject')));
      });
    }

    // Today's club activities
    const clubsLabel = document.getElementById('clubs-section-label');
    const clubsEl = document.getElementById('today-clubs');
    const todayClubs = getClubActivitiesByDate(todayStr);
    clubsLabel.style.display = '';
    if (todayClubs.length > 0) {
      clubsEl.style.display = '';
      clubsEl.innerHTML = todayClubs.map(c => {
        const club = CLUBS[c.club];
        const slot = CLUB_SLOTS[c.slot];
        return `<div class="club-card" style="border-left:3px solid ${club.color};">
          <div class="top"><span class="nm"><i style="background:${club.color}"></i>${club.name}</span><span class="badge" style="background:rgba(167,139,250,.15);color:#A78BFA;">${slot.label}</span></div>
          <div class="time">${slot.time}</div>
          ${c.note ? `<div class="room">${escapeHtml(c.note)}</div>` : ''}
          <span class="club-del" data-id="${escapeHtml(c.id)}" title="Remove">✕</span>
        </div>`;
      }).join('');
      clubsEl.querySelectorAll('.club-del').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          const id = el.getAttribute('data-id');
          if (confirm('Remove this club activity?')) {
            deleteClubActivity(id);
            toast('Removed');
            renderToday();
          }
        });
      });
    } else {
      clubsLabel.style.display = 'none';
      clubsEl.style.display = 'none';
      clubsEl.innerHTML = '';
    }

    // Today's due homework
    const todayHw = getTodayHomework();
    const pending = todayHw.filter(h => !h.completed);
    const overdue = getOverdueHomework();
    const dueEl = document.getElementById('today-due');
    const allToday = [...overdue.filter(h => h.dueDate < todayStr), ...pending].sort((a,b) => (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime));
    if (allToday.length === 0) {
      dueEl.innerHTML = `<div class="clear-day">
        
        <div><span class="clear-day-label">A LITTLE ROOM TO BREATHE</span><h3>All clear for today.</h3><p>No unfinished homework due today.<br>Your upcoming deadlines are below.</p></div>
      </div>`;
    } else {
      dueEl.innerHTML = allToday.map(h => renderHwItem(h)).join('');
      bindHwItemEvents(dueEl);
    }

    // Upcoming
    const upcoming = getUpcomingHomework(3);
    const upEl = document.getElementById('today-upcoming');
    if (upcoming.length === 0) {
      upEl.innerHTML = '<div class="empty-state">No upcoming deadlines in the next 3 days.</div>';
    } else {
      upEl.innerHTML = upcoming.map(h => renderHwItem(h)).join('');
      bindHwItemEvents(upEl);
    }

    // Top chip
    const chipEl = document.getElementById('today-chip');
    if (overdue.length > 0) {
      chipEl.textContent = `${pending.length} due today · ${overdue.length} overdue`;
    } else if (pending.length > 0) {
      chipEl.textContent = `${pending.length} due today`;
    } else {
      chipEl.textContent = 'Nothing due today';
    }
  }

  // ===== Homework List Page =====
  function renderList() {
    const groups = getHomeworkBySubject();
    const allHw = loadHomework();
    const modulesEl = document.getElementById('list-modules');

    let filteredGroups = { ...groups };
    if (listFilter === 'today') {
      const todayStr = formatDate(new Date());
      Object.keys(filteredGroups).forEach(k => {
        filteredGroups[k] = filteredGroups[k].filter(h => h.dueDate === todayStr);
      });
    } else if (listFilter === 'week') {
      const now = new Date();
      const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay()+6)%7));
      const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
      const ids = new Set(allHw.filter(h => h.dueDate >= formatDate(monday) && h.dueDate <= formatDate(sunday)).map(h => h.id));
      Object.keys(filteredGroups).forEach(k => {
        filteredGroups[k] = filteredGroups[k].filter(h => ids.has(h.id));
      });
    } else if (listFilter === 'overdue') {
      const overdue = getOverdueHomework();
      const ids = new Set(overdue.map(h => h.id));
      Object.keys(filteredGroups).forEach(k => {
        filteredGroups[k] = filteredGroups[k].filter(h => ids.has(h.id));
      });
    }
    const order = (a,b) => {
      if (listSort === 'priority') { const p = {High:0,Medium:1,Low:2}; const diff = (p[a.priority] ?? 1)-(p[b.priority] ?? 1); if(diff) return diff; }
      if (listSort === 'effort') { const diff = (Number(a.estimatedMinutes)||0)-(Number(b.estimatedMinutes)||0); if(diff) return diff; }
      return ((a.dueDate||'9999')+(a.dueTime||'23:59')).localeCompare((b.dueDate||'9999')+(b.dueTime||'23:59'));
    };
    if(listFilter === 'done') filteredGroups = {};
    Object.keys(filteredGroups).forEach(k => {
      filteredGroups[k] = filteredGroups[k].sort(order);
      if (filteredGroups[k].length === 0) delete filteredGroups[k];
    });

    const completedHw = allHw.filter(h => h.completed).sort(order);

    if (Object.keys(filteredGroups).length === 0 && (!['all','done'].includes(listFilter) || completedHw.length === 0)) {
      modulesEl.innerHTML = '<div class="empty-state"><div class="icon">📝</div>No homework in this view. Try another filter or add a new task.</div>';
    } else {
      const subjectOrder = Object.keys(SUBJECTS);
      const sortedKeys = Object.keys(filteredGroups).sort((a, b) => {
        const ia = subjectOrder.indexOf(a);
        const ib = subjectOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      modulesEl.innerHTML = sortedKeys.map(key => {
        const s = SUBJECTS[key] || { name: key, color: '#94A3B8', fullName: '', teacher: '' };
        const items = filteredGroups[key];
        return `<div class="module" data-subject="${escapeHtml(key)}">
          <div class="mhead">
            <span class="c" style="background:${s.color}"></span>
            <span class="mn">${escapeHtml(s.name)}</span>
            <span class="mt">${s.fullName}${s.teacher ? ' · ' + s.teacher : ''}</span>
            <span class="cnt">${items.length}</span>
            <span class="chev">▾</span>
          </div>
          <div class="mbody">${items.map(h => renderHwItem(h)).join('')}</div>
        </div>`;
      }).join('');

      if (listFilter === 'all' || listFilter === 'done') {
        if (completedHw.length > 0) {
          modulesEl.innerHTML += `<div class="module" style="margin-top:12px;">
            <div class="mhead">
              <span class="c" style="background:var(--green)"></span>
              <span class="mn">Completed</span>
              <span class="mt">${completedHw.length} item(s)</span>
              <span class="cnt" style="background:var(--green-soft);color:var(--green);">${completedHw.length}</span>
              <span class="chev">▾</span>
            </div>
            <div class="mbody">${completedHw.map(h => renderHwItem(h)).join('')}</div>
          </div>`;
        }
      }

      modulesEl.querySelectorAll('.module .mhead').forEach(h => {
        h.addEventListener('click', () => h.parentNode.classList.toggle('collapsed'));
      });
      bindHwItemEvents(modulesEl);
    }

    document.querySelectorAll('#page-list .tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-filter') === listFilter);
    });
  }

  // ===== Render Single Homework Item =====
  function renderHwItem(hw) {
    const s = SUBJECTS[hw.subject] || { color: '#94A3B8', name: hw.subject };
    const due = getDueLabel(hw);
    const prioCls = hw.priority === 'High' ? 'high' : hw.priority === 'Low' ? 'low' : 'mid';
    const isOverdue = !hw.completed && due.text === 'Overdue';
    return `<div class="hw-item ${hw.completed ? 'completed' : ''}" data-id="${escapeHtml(hw.id)}" ${isOverdue ? 'style="background:var(--red-soft);border-radius:10px;padding:9px 10px;"' : ''}>
      <span class="color-bar" style="background:${s.color}"></span>
      <span class="hw-check ${hw.completed ? 'checked' : ''}" data-id="${escapeHtml(hw.id)}">${hw.completed ? '✓' : ''}</span>
      <div class="mid">
        <div class="title">${escapeHtml(hw.title)}</div>
        <div class="sub">${escapeHtml(s.name)} · ${hw.dueDate ? formatDateEN(hw.dueDate) + ' ' + (hw.dueTime || '') : 'No due date'}${hw.estimatedMinutes ? ' · ~' + hw.estimatedMinutes + ' min' : ''}</div>
      </div>
      <div class="hw-right">
        ${hw.completed ? '<span class="tag done">✔</span>' : isOverdue ? '<span class="tag over">OVERDUE</span>' : `<span class="tag ${prioCls}">${escapeHtml(hw.priority)}</span>`}
        <div class="due ${due.cls}">${due.text}</div>
      </div>
      <span class="hw-del" data-id="${escapeHtml(hw.id)}" title="Delete">✕</span>
    </div>`;
  }

  function bindHwItemEvents(container) {
    container.querySelectorAll('.hw-check').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = el.getAttribute('data-id');
        if (!toggleComplete(id)) { toast('Could not save. Please export a backup and check browser storage.'); return; }
        toast('Updated');
        render();
      });
    });
    container.querySelectorAll('.hw-del').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = el.getAttribute('data-id');
        const hw = loadHomework().find(h => h.id === id);
        if (hw && confirm(`Delete "${hw.title}"?`)) {
          if (!deleteHomework(id)) { toast('Could not delete homework.'); return; }
          toast('Deleted');
          render();
        }
      });
    });
    container.querySelectorAll('.hw-item[data-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        openEditModal(id);
      });
    });
  }

  // ===== Timetable Page =====
  function renderTimetable() {
    const todayDate = formatDate(new Date());
    const regularIdx = getTodayDayIndex();
    const extra = regularIdx === -1 ? getExtraClassByDate(todayDate) : null;
    const todayIdx = extra ? extra.weekday : regularIdx;
    const days = ['Mon','Tue','Wed','Thu','Fri'];
    const status = document.getElementById('schedule-today');
    status.textContent = todayIdx < 0
      ? `Today is ${getDayOfWeek(todayDate)} · No regular classes today`
      : extra ? `Today follows the ${days[todayIdx]} schedule` : `Today · ${days[todayIdx]} ${formatDateEN(todayDate)}`;
    const tbody = document.getElementById('tt-body');
    let html = '';
    for (let p = 0; p < PERIODS.length; p++) {
      html += `<tr><td class="tcol">${PERIODS[p].start}<br>${PERIODS[p].end}</td>`;
      for (let d = 0; d < 5; d++) {
        const subjKey = TIMETABLE[d][p];
        const isToday = d === todayIdx;
        if (!subjKey) {
          html += `<td class="tt-free-cell ${isToday ? 'today-slot' : ''}"><div class="free-cell ${isToday ? 'today-free' : ''}"><span>Free</span></div></td>`;
        } else {
          const s = SUBJECTS[subjKey];
          html += `<td class="tt-subject-cell ${isToday ? 'today-slot' : ''}" style="--subject-color:${s.color}"><span class="tt-cell ${isToday ? 'today-col' : ''}" data-subject="${subjKey}">
            <span class="cn">${escapeHtml(s.name)}</span>
            <span class="cr">${s.teacher ? s.teacher + ' · ' : ''}${s.room || ''}</span>
          </span></td>`;
        }
      }
      html += '</tr>';
    }
    tbody.innerHTML = html;

    document.querySelectorAll('.tt-grid th').forEach((th, i) => {
      if (i >= 1 && i <= 5) {
        th.classList.toggle('today', i - 1 === todayIdx);
        th.innerHTML = days[i-1] + (i - 1 === todayIdx ? '<span class="today-column-label">TODAY</span>' : '');
        if (i - 1 === todayIdx) th.setAttribute('aria-current','date');
        else th.removeAttribute('aria-current');
      }
    });

    tbody.querySelectorAll('.tt-cell').forEach(el => {
      el.addEventListener('click', () => openAddModal(el.getAttribute('data-subject')));
    });

    const legendEl = document.getElementById('tt-legend');
    if (legendEl) {
      legendEl.innerHTML = Object.entries(SUBJECTS).map(([key, s]) =>
        `<span class="lg"><i style="background:${s.color}"></i>${escapeHtml(s.name)}</span>`
      ).join('');
    }
  }

  // ===== Calendar Page =====
  function renderCalendar() {
    const now = new Date();
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    document.getElementById('calendar-month').textContent = calendarMonth.toLocaleDateString('en-US', {month:'long',year:'numeric'});
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const todayStr = formatDate(now);

    const hwByDate = {};
    loadHomework().forEach(h => {
      if (h.dueDate) {
        if (!hwByDate[h.dueDate]) hwByDate[h.dueDate] = [];
        hwByDate[h.dueDate].push(h);
      }
    });

    const extraByDate = {};
    loadExtraClasses().forEach(e => { extraByDate[e.date] = e; });

    const clubsByDate = {};
    loadClubActivities().forEach(c => {
      if (!clubsByDate[c.date]) clubsByDate[c.date] = [];
      clubsByDate[c.date].push(c);
    });

    let html = '';
    for (let i = 0; i < startWeekday; i++) {
      html += `<div class="cal-cell" style="border:none;background:transparent;cursor:default;"></div>`;
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const items = hwByDate[dateStr] || [];
      const pending = items.filter(h => !h.completed);
      const extra = extraByDate[dateStr];
      const clubs = clubsByDate[dateStr] || [];
      const holiday = getHolidayName(dateStr);
      const isHol = isHoliday(dateStr);
      const isAdj = isAdjustedWorkday(dateStr);
      const dots = pending.slice(0, 3).map(h => {
        const s = SUBJECTS[h.subject] || { color: '#94A3B8' };
        return `<i style="background:${s.color}"></i>`;
      }).join('');
      const clubDots = clubs.slice(0, 2).map(c => {
        const club = CLUBS[c.club] || { color: '#A78BFA' };
        return `<i style="background:${club.color};border:1px solid var(--bg);"></i>`;
      }).join('');
      const cellCls = [
        isToday ? 'today' : '',
        isSelected ? 'selected' : '',
        extra ? 'extra' : '',
        isHol ? 'holiday' : '',
        isAdj ? 'adj-workday' : ''
      ].filter(Boolean).join(' ');
      html += `<div class="cal-cell ${cellCls}" data-date="${dateStr}">
        <span class="d">${d}</span>
        ${pending.length > 3 ? `<span class="cnt">${pending.length}</span>` : ''}
        <div class="dots">${dots}${clubDots}</div>
        ${extra ? `<div class="extra-badge">★ ${DAY_NAMES[extra.weekday]}</div>` : ''}
        ${isHol ? `<div class="holiday-badge" title="${escapeHtml(holiday)}">🎉</div>` : ''}
        ${isAdj ? `<div class="adj-badge" title="${escapeHtml(holiday)}">💼</div>` : ''}
      </div>`;
    }
    document.getElementById('cal-grid').innerHTML = html;

    document.querySelectorAll('.cal-cell[data-date]').forEach(el => {
      el.addEventListener('click', () => {
        selectedDate = el.getAttribute('data-date');
        renderCalendar();
        renderCalendarPanel();
      });
    });

    renderCalendarPanel();
  }

  function renderCalendarPanel() {
    const items = getHomeworkByDate(selectedDate).sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (a.dueTime || '').localeCompare(b.dueTime || '');
    });
    const dayName = getDayOfWeek(selectedDate);
    let titleStr = `${formatDateEN(selectedDate)} · ${dayName}`;
    const holiday = getHolidayName(selectedDate);
    if (holiday) titleStr += ` · ${holiday}`;
    document.getElementById('cal-day-title').textContent = titleStr;

    const panel = document.getElementById('cal-day-items');
    let html = '';

    // Holiday banner
    if (isHoliday(selectedDate)) {
      html += `<div style="padding:10px 14px;background:var(--primary-soft);border:1px solid var(--border);border-radius:12px;font-size:13px;color:var(--blue);margin-bottom:10px;">
        🎉 Public Holiday: ${escapeHtml(holiday)}
      </div>`;
    } else if (isAdjustedWorkday(selectedDate)) {
      html += `<div style="padding:10px 14px;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);border-radius:12px;font-size:13px;color:var(--amber);margin-bottom:10px;">
        💼 Adjusted Workday: ${escapeHtml(holiday)}
      </div>`;
    }

    // Club activities
    const dayClubs = getClubActivitiesByDate(selectedDate);
    if (dayClubs.length > 0) {
      html += `<div style="font-size:11px;color:var(--text3);margin:8px 0 6px;letter-spacing:.5px;">EXTRACURRICULAR</div>`;
      html += dayClubs.map(c => {
        const club = CLUBS[c.club];
        const slot = CLUB_SLOTS[c.slot];
        return `<div class="hw-item" style="border-left:3px solid ${club.color};">
          <div class="hw-main">
            <div class="hw-title"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${club.color};margin-right:8px;"></i>${club.name} <span style="color:var(--text3);font-weight:400;font-size:12px;">· ${slot.label} (${slot.time})</span></div>
            ${c.note ? `<div class="hw-note">${escapeHtml(c.note)}</div>` : ''}
          </div>
          <span class="hw-status club-del" data-id="${escapeHtml(c.id)}" style="cursor:pointer;color:var(--text3);" title="Remove">✕</span>
        </div>`;
      }).join('');
    }

    // Homework items
    if (items.length > 0) {
      html += `<div style="font-size:11px;color:var(--text3);margin:8px 0 6px;letter-spacing:.5px;">HOMEWORK</div>`;
      html += items.map(h => renderHwItem(h)).join('');
    } else if (dayClubs.length === 0 && !holiday) {
      html = '<div class="empty-state">No homework or activities on this day</div>';
    }

    panel.innerHTML = html;
    bindHwItemEvents(panel);
    panel.querySelectorAll('.club-del').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = el.getAttribute('data-id');
        if (confirm('Remove this club activity?')) {
          deleteClubActivity(id);
          toast('Removed');
          renderCalendar();
          renderCalendarPanel();
        }
      });
    });
  }

  // ===== Stats Page =====
  function renderStats() {
    const stats = getWeekStats();
    const ring = document.getElementById('stat-ring');
    ring.style.background = `conic-gradient(var(--blue) 0% ${stats.rate}%, rgba(148,163,184,.15) ${stats.rate}% 100%)`;
    ring.querySelector('b').textContent = stats.rate + '%';
    document.getElementById('stat-big-num').textContent = stats.rate + '%';
    document.getElementById('stat-big-label').textContent = `Weekly completion rate · ${stats.completed} / ${stats.total} items`;
    document.getElementById('stat-ontime').innerHTML = `${stats.onTimeRate}<small>%</small>`;
    document.getElementById('stat-done').innerHTML = `${stats.completed}<small> / ${stats.total}</small>`;
    document.getElementById('stat-total').textContent = loadHomework().length;

    const subjEntries = Object.entries(stats.bySubject).sort((a, b) => b[1] - a[1]);
    const maxVal = subjEntries.length > 0 ? subjEntries[0][1] : 1;
    document.getElementById('stat-subj-bars').innerHTML = subjEntries.map(([key, val]) => {
      const s = SUBJECTS[key] || { name: key, color: '#94A3B8' };
      const pct = Math.round(val / maxVal * 100);
      return `<div class="row"><div class="k">${escapeHtml(s.name)}</div><div class="tr"><div class="fl" style="width:${pct}%;background:linear-gradient(90deg,${s.color},${s.color}cc);"></div></div><div class="val">${val}</div></div>`;
    }).join('') || '<div class="empty-state">No homework data this week</div>';

    const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const dayVals = Object.values(stats.byDay);
    const maxDay = Math.max(...dayVals, 1);
    document.getElementById('stat-day-bars').innerHTML = dayVals.map((v, i) => {
      const h = Math.round(v / maxDay * 100);
      const color = i < 5 ? 'var(--blue)' : 'var(--text3)';
      return `<div class="bar-col"><div class="v">${v}</div><div class="b" style="height:${h}%;background:${color};"></div><div class="l">${dayLabels[i]}</div></div>`;
    }).join('');
  }

  // ===== Clubs Page =====
  const CLUB_DESCS = {
    engineering: 'Build & design',
    physics: 'Experiments & demos',
    circuit: 'Hand-solder & circuits',
    cs: 'Code & projects',
    photography: 'Shoot & edit'
  };
  const CLUB_INITIALS = { engineering: 'E', physics: 'P', circuit: 'C', cs: 'CS', photography: '📷' };
  const CLUB_NAMES = {
    engineering: 'Engineering Club', physics: 'Physics Club',
    circuit: 'CircuitXplorer', cs: 'CS Interest Group',
    photography: 'Photography Club'
  };

  function renderClubs() {
    const all = loadClubActivities();
    const now = new Date();
    const todayStr = formatDate(now);

    // This week (Mon-Sun) count per club
    const dow = now.getDay() || 7; // Mon=1..Sun=7
    const monday = new Date(now); monday.setDate(now.getDate() - dow + 1);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const monStr = formatDate(monday), sunStr = formatDate(sunday);
    const weekCount = {};
    Object.keys(CLUBS).forEach(k => weekCount[k] = 0);
    all.forEach(a => {
      if (a.date >= monStr && a.date <= sunStr && weekCount[a.club] !== undefined) weekCount[a.club]++;
    });

    // Club cards
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const cardsEl = document.getElementById('clubs-cards');
    cardsEl.innerHTML = Object.entries(CLUBS).map(([key, c]) => `
      <div class="club" style="--cc:${c.color};" data-club="${key}">
        <div class="head">
          <span class="badge">${CLUB_INITIALS[key] || '?'}</span>
          <div><div class="cname">${c.name}</div><div class="cdesc">${CLUB_DESCS[key] || ''}</div></div>
        </div>
        <div class="freq"><span class="num">${weekCount[key]}</span><span class="lbl">this week</span></div>
      </div>
    `).join('');
    cardsEl.querySelectorAll('.club').forEach(el => {
      el.addEventListener('click', () => openClubModal(todayStr, el.getAttribute('data-club')));
    });

    // Timeline: upcoming (>= today), next 30 days, sorted by date+slot
    const future = new Date(now); future.setDate(now.getDate() + 30);
    const endStr = formatDate(future);
    const upcoming = all
      .filter(a => a.date >= todayStr && a.date <= endStr)
      .sort((a, b) => (a.date + (a.slot === 'noon' ? '0' : '1')).localeCompare(b.date + (b.slot === 'noon' ? '0' : '1')));

    const tlEl = document.getElementById('clubs-timeline');
    if (upcoming.length === 0) {
      tlEl.innerHTML = `
        <div class="club-empty">
          <div class="big">No upcoming club activities</div>
          <div class="sub">Choose a club below to add an activity.</div>
          <div class="pick">
            ${Object.entries(CLUBS).map(([k, c]) =>
              `<button data-club="${k}"><i style="background:${c.color}"></i>${c.name}</button>`).join('')}
          </div>
        </div>`;
      tlEl.querySelectorAll('.pick button').forEach(btn => {
        btn.addEventListener('click', () => openClubModal(todayStr, btn.getAttribute('data-club')));
      });
    } else {
      const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      tlEl.innerHTML = `<div class="tl">` + upcoming.map(a => {
        const club = CLUBS[a.club];
        const slot = CLUB_SLOTS[a.slot];
        const dd = new Date(a.date + 'T00:00:00');
        return `
        <div class="tl-item">
          <div class="tl-date"><div class="d">${dd.getDate()}</div><div class="m">${wd[dd.getDay()]} · ${months[dd.getMonth()]}</div></div>
          <div class="tl-info">
            <div class="tclub"><i style="background:${club.color}"></i>${club.name}</div>
            <div class="note">${a.note ? escapeHtml(a.note) : slot.time}</div>
          </div>
          <div class="tl-slot ${a.slot === 'noon' ? 'noon' : 'after'}">${a.slot === 'noon' ? 'Lunch' : 'After'}</div>
          <span class="tl-del" data-id="${escapeHtml(a.id)}" title="Remove">✕</span>
        </div>`;
      }).join('') + `</div>`;
      tlEl.querySelectorAll('.tl-del').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-id');
          if (confirm('Remove this club activity?')) {
            deleteClubActivity(id);
            toast('Removed');
            renderClubs();
          }
        });
      });
    }
  }

  // ===== Settings Page =====
  function renderSettings() {
    const settings = loadSettings();
    document.getElementById('set-remind24h').className = 'switch' + (settings.remind24h ? '' : ' off');
    document.getElementById('set-remind3h').className = 'switch' + (settings.remind3h ? '' : ' off');
    document.getElementById('set-dailyReview').className = 'switch' + (settings.dailyReview ? '' : ' off');
    document.getElementById('set-overdueNudge').className = 'switch' + (settings.overdueNudge ? '' : ' off');

    document.getElementById('app-version').textContent = 'v' + APP_VERSION;

    const subjList = document.getElementById('set-subjects');
    subjList.innerHTML = Object.entries(SUBJECTS).map(([key, s]) => {
      const count = TIMETABLE.flat().filter(x => x === key).length;
      return `<div class="subj-item"><span class="c" style="background:${s.color}"></span><span class="n">${s.fullName || s.name}</span><span class="m">${s.teacher || ''}${count ? ' · ' + count + '/wk' : ''}</span></div>`;
    }).join('');

    // Extra classes (weekend special arrangements)
    const extraList = document.getElementById('set-extra-list');
    const extras = loadExtraClasses();
    const futureExtras = extras.filter(e => e.date >= formatDate(new Date())).sort((a, b) => a.date.localeCompare(b.date));
    if (futureExtras.length === 0) {
      extraList.innerHTML = '<div style="font-size:12.5px;color:var(--text3);padding:8px 0;">No special arrangements scheduled. If a weekend school day is added, add it here.</div>';
    } else {
      extraList.innerHTML = futureExtras.map(e => `
        <div class="extra-item">
          <span class="date">${formatDateEN(e.date)}</span>
          <span class="badge2">${DAY_NAMES[e.weekday]} schedule</span>
          <span class="note">${e.note ? escapeHtml(e.note) : 'Weekend school day'}</span>
          <span class="del" data-id="${escapeHtml(e.id)}" title="Remove">✕</span>
        </div>
      `).join('');
      extraList.querySelectorAll('.del').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-id');
          if (confirm('Remove this special arrangement?')) {
            deleteExtraClass(id);
            toast('Removed');
            renderSettings();
          }
        });
      });
    }
  }
  // Mini week schedule shown in the add-homework modal
  function updateDueSchedulePreview() {
    const dateStr = document.getElementById('f-dueDate').value;
    const content = document.getElementById('due-schedule-content');
    if (!dateStr) { content.innerHTML = ''; return; }
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay(); // 0=Sun..6=Sat
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    const wdNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let html = '';
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dayStr = formatDate(day);
      const isSel = dayStr === dateStr;
      let dayIdx = i;
      const extra = getExtraClassByDate(dayStr);
      if (extra) dayIdx = extra.weekday;
      const courses = getDayCourses(dayIdx);
      const rows = courses.map(c => {
        const s = SUBJECTS[c.subject];
        return `<div class="wd-c"><i style="background:${s.color}"></i><span>${escapeHtml(s.name)}</span><small>${c.start}</small></div>`;
      }).join('');
      html += `<div class="wd-col ${isSel ? 'sel' : ''}">
        <div class="wd-h">${wdNames[i]}<span>${months[day.getMonth()]} ${day.getDate()}</span></div>
        <div class="wd-cs">${rows || '<div class="wd-none">—</div>'}</div>
      </div>`;
    }
    content.innerHTML = html;
  }

  function openAddModal(subjectKey) {
    editingId = null;
    document.getElementById('modal-title').textContent = 'Add Homework';
    document.getElementById('modal-sub').textContent = 'Enter a title, choose a subject, and set the deadline. Then select Save.';
    document.getElementById('f-title').value = '';
    document.getElementById('f-dueDate').value = currentPage === 'calendar' ? selectedDate : formatDate(new Date());
    document.getElementById('f-dueTime').value = '23:59';
    document.getElementById('f-estimated').value = '60';
    document.getElementById('f-notes').value = '';
    const sel = document.getElementById('f-subject');
    sel.innerHTML = Object.entries(SUBJECTS).map(([key, s]) =>
      `<option value="${key}" ${key === subjectKey ? 'selected' : ''}>${escapeHtml(s.name)}${s.teacher ? ' (' + s.teacher + ')' : ''}</option>`
    ).join('');
    setSegActive('f-type', 'Daily Practice');
    setSegActive('f-priority', 'Medium');
    setSegActive('f-source', 'In-Class');
    document.getElementById('modal').classList.add('show');
    updateDueSchedulePreview();
    setTimeout(() => document.getElementById('f-title').focus(), 100);
  }

  function openEditModal(id) {
    const hw = loadHomework().find(h => h.id === id);
    if (!hw) return;
    editingId = id;
    document.getElementById('modal-title').textContent = 'Edit Homework';
    document.getElementById('modal-sub').textContent = 'Change the fields you need, then select Save. Cancel keeps the original task.';
    document.getElementById('f-title').value = hw.title;
    document.getElementById('f-dueDate').value = hw.dueDate || formatDate(new Date());
    document.getElementById('f-dueTime').value = hw.dueTime || '23:59';
    document.getElementById('f-estimated').value = hw.estimatedMinutes || '';
    document.getElementById('f-notes').value = hw.notes || '';
    const sel = document.getElementById('f-subject');
    sel.innerHTML = Object.entries(SUBJECTS).map(([key, s]) =>
      `<option value="${key}" ${key === hw.subject ? 'selected' : ''}>${escapeHtml(s.name)}${s.teacher ? ' (' + s.teacher + ')' : ''}</option>`
    ).join('');
    if (!Object.hasOwn(SUBJECTS, hw.subject)) sel.add(new Option(hw.subject, hw.subject, true, true));
    setSegActive('f-type', hw.type || 'Daily Practice');
    setSegActive('f-priority', hw.priority || 'Medium');
    setSegActive('f-source', hw.source || 'In-Class');
    document.getElementById('modal').classList.add('show');
    updateDueSchedulePreview();
  }

  function closeModal() {
    document.getElementById('modal').classList.remove('show');
    editingId = null;
  }

  function saveModal() {
    const title = document.getElementById('f-title').value.trim();
    if (!title) {
      toast('Please enter a title');
      document.getElementById('f-title').focus();
      return;
    }
    const dueDate = document.getElementById('f-dueDate').value;
    if (!dueDate) {
      toast('Please pick a due date');
      document.getElementById('f-dueDate').focus();
      return;
    }
    const data = {
      title,
      subject: document.getElementById('f-subject').value,
      type: getSegValue('f-type'),
      dueDate,
      dueTime: document.getElementById('f-dueTime').value,
      priority: getSegValue('f-priority'),
      estimatedMinutes: Math.max(0, parseInt(document.getElementById('f-estimated').value) || 0),
      source: getSegValue('f-source'),
      notes: document.getElementById('f-notes').value.trim()
    };
    if (editingId) {
      if (!updateHomework(editingId, data)) { toast('Could not save changes. Your original homework is unchanged.'); return; }
      toast('Changes saved');
    } else {
      if (!addHomework(data)) { toast('Could not save homework. Check browser storage.'); return; }
      toast('Homework added');
    }
    closeModal();
    render();
  }

  function setSegActive(containerId, value) {
    const container = document.getElementById(containerId);
    container.querySelectorAll('.legacy-option').forEach(o => o.remove());
    if (value && ![...container.querySelectorAll('.opt')].some(o => o.textContent === value)) {
      const option = document.createElement('div');
      option.className = 'opt legacy-option';
      option.textContent = value;
      container.appendChild(option);
    }
    container.querySelectorAll('.opt').forEach(o => {
      o.classList.toggle('active', o.textContent === value);
    });
  }
  function getSegValue(containerId) {
    const active = document.querySelector('#' + containerId + ' .opt.active');
    return active ? active.textContent : '';
  }

  // ===== Search =====
  function doSearch(query) {
    const resultEl = document.getElementById('search-results');
    if (!query.trim()) {
      resultEl.innerHTML = '<div class="hint">Search by title, subject, or teacher</div>';
      return;
    }
    const q = query.toLowerCase();
    const results = loadHomework().filter(h => {
      const s = SUBJECTS[h.subject] || { name: '', teacher: '', fullName: '' };
      return h.title.toLowerCase().includes(q) ||
             s.name.toLowerCase().includes(q) ||
             (s.teacher && s.teacher.toLowerCase().includes(q)) ||
             (s.fullName && s.fullName.toLowerCase().includes(q));
    }).slice(0, 10);
    if (results.length === 0) {
      resultEl.innerHTML = '<div class="hint">No matching homework found</div>';
    } else {
      resultEl.innerHTML = results.map(h => {
        const s = SUBJECTS[h.subject] || { color: '#94A3B8', name: h.subject };
        return `<div class="ntf" data-id="${escapeHtml(h.id)}" style="cursor:pointer;">
          <i style="background:${s.color}"></i>
          <div><div class="nt">${escapeHtml(h.title)}</div><div class="ns">${escapeHtml(s.name)} · ${h.dueDate || 'No date'}</div></div>
        </div>`;
      }).join('');
      resultEl.querySelectorAll('.ntf').forEach(el => {
        el.addEventListener('click', () => {
          closePops();
          openEditModal(el.getAttribute('data-id'));
        });
      });
    }
  }

  // ===== Notifications =====
  function renderNotifications() {
    const settings = loadSettings();
    const now = new Date();
    const reviewTime = settings.dailyReviewTime || '21:00';
    const review = settings.dailyReview && now.toTimeString().slice(0,5) >= reviewTime;
    const items = [];
    loadHomework().filter(h => !h.completed && h.dueDate).sort((a,b) => (a.dueDate+a.dueTime).localeCompare(b.dueDate+b.dueTime)).forEach(h => {
      const hours = (new Date(h.dueDate + 'T' + (h.dueTime || '23:59')) - now) / 3600000;
      if (hours <= 0 && (settings.overdueNudge || review)) items.push({color:'var(--red)',title:h.title+' is overdue',sub:formatDateEN(h.dueDate)+' · '+(h.dueTime||'23:59')});
      else if (hours > 0 && ((hours <= 3 && settings.remind3h) || (hours <= 24 && settings.remind24h) || (review && hours <= 27))) items.push({color:'var(--amber)',title:h.title,sub:'Due '+formatDateEN(h.dueDate)+' · '+(h.dueTime||'23:59')});
    });
    const el = document.getElementById('notif-list');
    if (items.length === 0) {
      el.innerHTML = '<div class="hint">No notifications</div>';
    } else {
      el.innerHTML = items.slice(0, 5).map(n =>
        `<div class="ntf"><i style="background:${n.color}"></i><div><div class="nt">${escapeHtml(n.title)}</div><div class="ns">${n.sub}</div></div></div>`
      ).join('');
    }
    const badge = document.querySelector('.pill-glass .pi .badge');
    const count = items.length;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }

  function closePops() {
    document.getElementById('pop-search').classList.remove('show');
    document.getElementById('pop-notif').classList.remove('show');
  }

  // ===== Import/Export =====
  function exportJSON() {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duenow-backup-${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exported');
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (!confirm('Import this backup? Included data will replace current data. A recovery copy will be saved first.')) return;
        if (importData(ev.target.result)) {
          toast('Import successful');
          render();
        } else {
          toast('Import failed: invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function clearData() {
    if (confirm('Clear homework, settings, club activities, and special arrangements? You can recover this copy using Restore previous data.')) {
      try { clearAllData(); } catch (_) { toast('Could not create a recovery copy. Data was not cleared.'); return; }
      toast('All data cleared');
      render();
    }
  }

  // ===== Extra Class Modal =====
  function openExtraModal() {
    document.getElementById('extra-date').value = formatDate(new Date(Date.now() + 86400000));
    setSegActive('extra-weekday', 'Friday');
    document.getElementById('extra-note').value = '';
    document.getElementById('extra-modal').classList.add('show');
    setTimeout(() => document.getElementById('extra-date').focus(), 100);
  }

  function closeExtraModal() {
    document.getElementById('extra-modal').classList.remove('show');
  }

  function saveExtraModal() {
    const date = document.getElementById('extra-date').value;
    const weekdayStr = getSegValue('extra-weekday');
    const weekdayMap = { 'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4 };
    const weekday = weekdayMap[weekdayStr];
    const note = document.getElementById('extra-note').value.trim();
    if (!date) {
      toast('Please pick a date');
      return;
    }
    if (weekday === undefined) {
      toast('Please choose which weekday schedule to follow');
      return;
    }
    // Check if already exists
    const existing = getExtraClassByDate(date);
    if (existing) {
      if (!confirm(`An arrangement already exists for ${formatDateEN(date)}. Replace it?`)) return;
      const list = loadExtraClasses().map(item => item.id === existing.id ? {...item, date, weekday, note} : item);
      if (!saveExtraClasses(list)) { toast('Could not save arrangement. The previous one is unchanged.'); return; }
    } else {
      if (!addExtraClass(date, weekday, note)) { toast('Could not save arrangement. Check browser storage.'); return; }
    }
    toast('Special arrangement added');
    closeExtraModal();
    render();
  }

  // ===== Club Activity Modal =====
  function openClubModal(dateStr, clubKey) {
    document.getElementById('club-date').value = dateStr || formatDate(new Date());
    setSegActive('club-slot', 'Lunch Break');
    const clubName = CLUB_NAMES[clubKey] || 'Engineering Club';
    setSegActive('club-name', clubName);
    document.getElementById('club-note').value = '';
    document.getElementById('club-modal').classList.add('show');
    setTimeout(() => document.getElementById('club-date').focus(), 100);
  }

  function closeClubModal() {
    document.getElementById('club-modal').classList.remove('show');
  }

  function saveClubModal() {
    const date = document.getElementById('club-date').value;
    const slotStr = getSegValue('club-slot');
    const clubStr = getSegValue('club-name');
    const note = document.getElementById('club-note').value.trim();
    if (!date) {
      toast('Please pick a date');
      return;
    }
    const slotMap = { 'Lunch Break': 'noon', 'After School': 'afterschool' };
    const clubMap = {
      'Engineering Club': 'engineering',
      'Physics Club': 'physics',
      'CircuitXplorer': 'circuit',
      'CS Interest Group': 'cs',
      'Photography Club': 'photography'
    };
    const slot = slotMap[slotStr];
    const club = clubMap[clubStr];
    if (!slot || !club) {
      toast('Please choose time slot and club');
      return;
    }
    if (!addClubActivity(date, slot, club, note)) { toast('Could not save activity. Check browser storage.'); return; }
    toast('Club activity added');
    closeClubModal();
    render();
  }

  // ===== Toast =====
  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  // ===== Utility =====
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  // ===== Event Binding =====
  function bindEvents() {
    document.getElementById('list-sort').addEventListener('change', e => { listSort=e.target.value; renderList(); });
    document.getElementById('calendar-prev').addEventListener('click', () => { calendarMonth.setMonth(calendarMonth.getMonth()-1); renderCalendar(); });
    document.getElementById('calendar-next').addEventListener('click', () => { calendarMonth.setMonth(calendarMonth.getMonth()+1); renderCalendar(); });
    document.getElementById('calendar-now').addEventListener('click', () => { const now=new Date(); calendarMonth=new Date(now.getFullYear(),now.getMonth(),1); selectedDate=formatDate(now); renderCalendar(); });
    window.addEventListener('storage', () => render());
    setInterval(() => { if(!document.querySelector('.mask.show')) render(); },60000);

    document.querySelectorAll('[data-page]').forEach(n => {
      n.addEventListener('click', () => navigate(n.getAttribute('data-page')));
    });

    document.querySelectorAll('#page-list .tab').forEach(t => {
      t.addEventListener('click', () => {
        listFilter = t.getAttribute('data-filter');
        renderList();
      });
    });

    document.getElementById('btn-add').addEventListener('click', () => openAddModal());

    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-save').addEventListener('click', saveModal);
    document.getElementById('f-dueDate').addEventListener('input', updateDueSchedulePreview);
    document.getElementById('f-dueDate').addEventListener('change', updateDueSchedulePreview);
    document.getElementById('modal').addEventListener('click', e => {
      if (e.target.id === 'modal') closeModal();
    });

    document.querySelectorAll('.seg').forEach(seg => {
      seg.addEventListener('click', e => {
        if (e.target.classList.contains('opt')) {
          seg.querySelectorAll('.opt').forEach(o => o.classList.remove('active'));
          e.target.classList.add('active');
        }
      });
    });

    document.getElementById('btn-search').addEventListener('click', e => {
      e.stopPropagation();
      const isShow = document.getElementById('pop-search').classList.contains('show');
      closePops();
      if (!isShow) {
        document.getElementById('pop-search').classList.add('show');
        document.getElementById('search-input').value = '';
        document.getElementById('search-results').innerHTML = '<div class="hint">Search by title, subject, or teacher</div>';
        setTimeout(() => document.getElementById('search-input').focus(), 100);
      }
    });
    document.getElementById('search-input').addEventListener('input', e => doSearch(e.target.value));

    document.getElementById('btn-notif').addEventListener('click', e => {
      e.stopPropagation();
      const isShow = document.getElementById('pop-notif').classList.contains('show');
      closePops();
      if (!isShow) {
        renderNotifications();
        document.getElementById('pop-notif').classList.add('show');
      }
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.pill') && !e.target.closest('.pop')) closePops();
    });

    ['set-remind24h', 'set-remind3h', 'set-dailyReview', 'set-overdueNudge'].forEach(id => {
      document.getElementById(id).addEventListener('click', () => {
        const settings = loadSettings();
        const key = id.replace('set-', '');
        settings[key] = !settings[key];
        if (!saveSettings(settings)) { toast('Could not save settings.'); return; }
        renderSettings();
        renderNotifications();
        toast('Settings updated');
      });
    });

    document.getElementById('btn-export').addEventListener('click', exportJSON);
    document.getElementById('btn-import').addEventListener('click', importJSON);
    document.getElementById('btn-clear').addEventListener('click', clearData);
    document.getElementById('btn-add-extra').addEventListener('click', openExtraModal);
    document.getElementById('extra-cancel').addEventListener('click', closeExtraModal);
    document.getElementById('extra-save').addEventListener('click', saveExtraModal);
    document.getElementById('extra-modal').addEventListener('click', e => {
      if (e.target.id === 'extra-modal') closeExtraModal();
    });
    document.getElementById('clubs-add-btn').addEventListener('click', () => openClubModal());
    document.getElementById('club-cancel').addEventListener('click', closeClubModal);
    document.getElementById('club-save').addEventListener('click', saveClubModal);
    document.getElementById('club-modal').addEventListener('click', e => {
      if (e.target.id === 'club-modal') closeClubModal();
    });
    document.getElementById('clubs-add-link').addEventListener('click', () => openClubModal());

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('btn-search').click(); }
      if (e.key === 'Escape') {
        closeExtraModal(); closeClubModal();
        if (document.getElementById('modal').classList.contains('show')) closeModal();
        closePops();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openAddModal();
      }
      if (e.key === 'Enter' && document.getElementById('modal').classList.contains('show')) {
        if (e.target.tagName === 'INPUT') {
          e.preventDefault();
          saveModal();
        }
      }
    });
  }

  // ===== Init =====
  function init() {
    bindEvents();
    const packResult = installHomeworkPack();
    if (!packResult.ok) toast('Could not add the requested homework. Existing data was kept; reload to retry.');
    renderNotifications();
    navigate('today');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
