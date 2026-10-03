/* User-requested assignments transcribed from the October 3, 2026 screenshot.
 * Unshown type/source/notes are left blank, rather than inferred.
 */
const HOMEWORK_PACK_KEY = 'duenow_homework_pack_20261003_v1';
const HOMEWORK_PACK = [
  ['english', 'Quiz', '2026-10-09', '23:59', 'High'],
  ['chinese', 'Cooking', '2026-10-03', '23:59', 'High'],
  ['biology', 'Mini ecosystem', '2026-10-07', '23:59', 'High'],
  ['biology', '样方测试', '2026-10-08', '04:00', 'High'],
  ['biology', 'C13.5 - 13.6', '2026-10-09', '23:59', 'High'],
  ['biology', 'Presentation', '2026-11-10', '23:59', 'Medium'],
  ['physics', 'Quiz Unit 1( velocity, accelaration, free fall)', '2026-10-07', '23:59', 'High'],
  ['physics', 'Preparation for 抛体运动', '2026-10-07', '23:59', 'High'],
  ['geography', 'Geography question', '2026-12-02', '23:59', 'Medium'],
  ['hic', 'Presentation', '2026-10-08', '23:59', 'Medium']
].map(([subject,title,dueDate,dueTime,priority],index)=>({
  id:'screenshot_20261003_'+(index+1),subject,title,dueDate,dueTime,priority,
  estimatedMinutes:60,type:'',source:'',notes:'',completed:false,completedAt:null,
  createdAt:new Date().toISOString()
}));

function installHomeworkPack() {
  try {
    if (DUENOW_STORE.getItem(HOMEWORK_PACK_KEY) === 'installed') return {ok:true,added:0};
    // Do not let a malformed stored collection be interpreted as an empty one.
    const raw=DUENOW_STORE.getItem(STORAGE_KEY);
    const existing=raw===null?[]:JSON.parse(raw);
    if (!Array.isArray(existing) || existing.some(h=>!h || typeof h!=='object')) return {ok:false,added:0};
    const additions=HOMEWORK_PACK.filter(item=>!existing.some(h=>h.id===item.id || (
      h.subject===item.subject && typeof h.title==='string' && h.title.replace(/\s/g,'')===item.title.replace(/\s/g,'') && h.dueDate===item.dueDate && h.dueTime===item.dueTime
    )));
    if (additions.length && !saveHomework([...existing,...additions])) return {ok:false,added:0};
    // Stable IDs make retrying safe if saving this receipt fails.
    DUENOW_STORE.setItem(HOMEWORK_PACK_KEY,'installed');
    return {ok:true,added:additions.length};
  } catch(error) {
    console.error('Could not install the requested homework',error);
    return {ok:false,added:0};
  }
}
