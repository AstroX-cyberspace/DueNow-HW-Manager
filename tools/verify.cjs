const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=__dirname+'/../';
const keys=['duenow_homework_v1','duenow_settings_v1','duenow_extra_classes_v1','duenow_clubs_v1'];
const fixture={homework:[{id:'existing-1',title:'原有作业 — Do not rename',subject:'physics',type:'Lab Report',dueDate:'2026-09-29',dueTime:'08:50',priority:'High',estimatedMinutes:40,source:'In-Class',notes:'Keep exactly',completed:false,completedAt:null,createdAt:'2026-09-28T03:00:00.000Z',customField:'preserved'}],settings:{remind24h:false,remind3h:true,dailyReview:false,overdueNudge:true,dailyReviewTime:'21:00'},extraClasses:[{id:'extra-1',date:'2026-10-10',weekday:3,note:'Thursday schedule'}],clubs:[{id:'club-1',date:'2026-09-30',slot:'noon',club:'circuit',note:'Keep this name and slot'}]};
function setup({demo=false,failKey=null}={}){
  const map=new Map(keys.map((key,i)=>[key,JSON.stringify(Object.values(fixture)[i])]));
  const session=new Map();
  let fail=false;
  const store={getItem:k=>map.get(k)??null,setItem:(k,v)=>{if(fail&&k===failKey){fail=false;throw new Error('Quota exceeded');}map.set(k,String(v));},removeItem:k=>map.delete(k)};
  const context=vm.createContext({console:{error(){}},URLSearchParams,Date,location:{search:demo?'?demo=1':''},localStorage:store,sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)}});
  for(const file of ['data.js','session.js','storage.js','homework-pack.js'])vm.runInContext(fs.readFileSync(root+'duenow-app-en/js/'+file,'utf8'),context);
  return {map,session,run:code=>vm.runInContext(code,context),fail:()=>fail=true};
}
test('static data is byte-for-byte unchanged except for the release version',()=>{
  const current=fs.readFileSync(root+'duenow-app-en/js/data.js','utf8');
  assert.ok(current.includes("const APP_VERSION = '2.1.1';"));
  assert.equal(current.replace("const APP_VERSION = '2.1.1';","const APP_VERSION = '1.3.5';"),fs.readFileSync(root+'original-v1.3.5/js/data.js','utf8'));
});
test('reading existing storage does not change a byte',()=>{
  const s=setup(),before=JSON.stringify([...s.map]);s.run('loadHomework(); loadSettings(); getWeekStats(); loadExtraClasses(); loadClubActivities();');assert.equal(JSON.stringify([...s.map]),before);
});
test('complete backup roundtrip preserves every homework field and all four collections',()=>{
  const s=setup(),backup=s.run('exportData()');assert.equal(s.run(`importData(${JSON.stringify(backup)})`),true);
  const data=JSON.parse(s.run('exportData()'));for(const k of Object.keys(fixture))assert.deepEqual(data[k],fixture[k]);
});
test('legacy backups without clubs or arrangements preserve those existing collections',()=>{
  const s=setup();assert.equal(s.run(`importData(${JSON.stringify(JSON.stringify({homework:fixture.homework,settings:fixture.settings}))})`),true);
  assert.equal(s.map.get(keys[2]),JSON.stringify(fixture.extraClasses));assert.equal(s.map.get(keys[3]),JSON.stringify(fixture.clubs));
});
test('malformed imports, invalid dates, duplicate IDs and unknown clubs leave data untouched',()=>{
  for(const bad of ['{}','broken',JSON.stringify({homework:[{...fixture.homework[0],dueDate:'2026-02-31'}]}),JSON.stringify({homework:[fixture.homework[0],fixture.homework[0]]}),JSON.stringify({...fixture,clubs:[{...fixture.clubs[0],club:'unknown'}]})]){
    const s=setup(),before=JSON.stringify([...s.map]);assert.equal(s.run(`importData(${JSON.stringify(bad)})`),false);assert.equal(JSON.stringify([...s.map]),before);
  }
});
test('partial failed import rolls all collections back',()=>{
  const s=setup({failKey:keys[2]}),before=keys.map(k=>s.map.get(k));s.fail();
  assert.equal(s.run(`importData(${JSON.stringify(JSON.stringify({...fixture,homework:[]}))})`),false);
  assert.deepEqual(keys.map(k=>s.map.get(k)),before);
});
test('clearing retains a raw recovery copy of all collections',()=>{
  const s=setup(),before=keys.map(k=>s.map.get(k));s.run('clearAllData()');assert.ok(keys.every(k=>!s.map.has(k)));assert.deepEqual(JSON.parse(s.map.get('duenow_recovery_v1')).values,before);
});
test('demo edits cannot write production homework, settings, clubs or arrangements',()=>{
  const s=setup({demo:true}),before=JSON.stringify([...s.map]);s.run(`addHomework({title:'Demo only',subject:'math',dueDate:'2026-09-30'}); saveSettings({remind24h:false}); addClubActivity('2026-09-30','noon','cs','demo'); addExtraClass('2026-10-10',1,'demo');`);
  assert.equal(JSON.stringify([...s.map]),before);assert.equal(s.session.size,4);
});
test('overdue detection includes elapsed deadlines today and excludes future deadlines',()=>{
  const s=setup();s.run(`const today=formatDate(new Date()); const tomorrow=new Date(); tomorrow.setDate(tomorrow.getDate()+1); saveHomework([{id:'late',dueDate:today,dueTime:'00:00',completed:false},{id:'future',dueDate:formatDate(tomorrow),dueTime:'23:59',completed:false},{id:'done',dueDate:'2020-01-01',dueTime:'00:00',completed:true}]);`);
  assert.equal(s.run('JSON.stringify(getOverdueHomework().map(h=>h.id))'),'["late"]');
});
test('homework CRUD changes only the selected item and reports failed writes',()=>{
  const s=setup({failKey:keys[0]});const original=s.map.get(keys[0]);s.fail();assert.equal(s.run(`addHomework({title:'Cannot save',subject:'math'})`),null);assert.equal(s.map.get(keys[0]),original);
  const id=s.run(`addHomework({title:'Temporary task',subject:'english',dueDate:'2026-09-30',dueTime:'13:20'}).id`);
  s.run(`updateHomework(${JSON.stringify(id)},{notes:'Updated note'});toggleComplete(${JSON.stringify(id)});deleteHomework(${JSON.stringify(id)});`);assert.equal(s.map.get(keys[0]),original);
});
test('weekend calendar names and undated items render correctly',()=>{
  const s=setup();assert.equal(s.run(`getDayOfWeek('2026-10-03')`),'Sat');assert.equal(s.run(`getDayOfWeek('2026-10-04')`),'Sun');assert.equal(s.run(`getDueLabel({completed:false}).text`),'No deadline');
});

test('screenshot pack adds ten exact assignments and preserves existing records and other collections',()=>{
  const s=setup(),other=keys.slice(1).map(k=>s.map.get(k));
  assert.equal(s.run('installHomeworkPack().added'),10);
  const rows=JSON.parse(s.run('JSON.stringify(loadHomework())'));
  assert.deepEqual(rows[0],fixture.homework[0]);
  assert.deepEqual(rows.slice(1).map(h=>[h.subject,h.title,h.dueDate,h.dueTime,h.priority,h.estimatedMinutes]),[
    ['english','Quiz','2026-10-09','23:59','High',60],
    ['chinese','Cooking','2026-10-03','23:59','High',60],
    ['biology','Mini ecosystem','2026-10-07','23:59','High',60],
    ['biology','样方测试','2026-10-08','04:00','High',60],
    ['biology','C13.5 - 13.6','2026-10-09','23:59','High',60],
    ['biology','Presentation','2026-11-10','23:59','Medium',60],
    ['physics','Quiz Unit 1( velocity, accelaration, free fall)','2026-10-07','23:59','High',60],
    ['physics','Preparation for 抛体运动','2026-10-07','23:59','High',60],
    ['geography','Geography question','2026-12-02','23:59','Medium',60],
    ['hic','Presentation','2026-10-08','23:59','Medium',60]
  ]);
  assert.deepEqual(keys.slice(1).map(k=>s.map.get(k)),other);
  assert.equal(s.run('importData(exportData())'),true);
});

test('pack avoids matching duplicates and never re-adds deleted assignments after installation',()=>{
  const s=setup();
  s.run(`saveHomework([...loadHomework(),{...HOMEWORK_PACK[0],id:'already-there',completed:true,notes:'Keep my note'}])`);
  assert.equal(s.run('installHomeworkPack().added'),9);
  assert.equal(s.run(`loadHomework().find(h=>h.id==='already-there').notes`),'Keep my note');
  s.run(`deleteHomework('screenshot_20261003_2'); updateHomework('screenshot_20261003_3',{dueTime:'12:00'});`);
  const before=s.map.get(keys[0]);assert.equal(s.run('installHomeworkPack().added'),0);
  assert.equal(s.map.get(keys[0]),before);
});

test('pack refuses malformed storage and retries a failed save without losing data',()=>{
  const s=setup({failKey:keys[0]}),before=s.map.get(keys[0]);s.fail();
  assert.equal(s.run('installHomeworkPack().ok'),false);assert.equal(s.map.get(keys[0]),before);
  assert.equal(s.run('installHomeworkPack().added'),10);
  const bad=setup();bad.map.set(keys[0],'broken');
  assert.equal(bad.run('installHomeworkPack().ok'),false);assert.equal(bad.map.get(keys[0]),'broken');
});

test('pack receipt write failure retries safely without duplicate additions',()=>{
  const s=setup({failKey:'duenow_homework_pack_20261003_v1'});s.fail();
  assert.equal(s.run('installHomeworkPack().ok'),false);
  assert.equal(s.run('installHomeworkPack().ok'),true);
  assert.equal(s.run('loadHomework().length'),11);
});

test('demo pack never writes real homework or its install receipt',()=>{
  const s=setup({demo:true}),before=JSON.stringify([...s.map]);
  assert.equal(s.run('installHomeworkPack().added'),10);
  assert.equal(JSON.stringify([...s.map]),before);
});

test('schedule highlights the correct weekday and all eight periods, with no false weekend column',()=>{
  const source=fs.readFileSync(root+'duenow-app-en/js/app.js','utf8');
  const renderer=source.slice(source.indexOf('  function renderTimetable()'),source.indexOf('  // ===== Calendar Page ====='));
  for(const day of [-1,0,1,2,3,4]) {
    const s=setup();
    s.run(`const elements={'tt-body':{innerHTML:'',querySelectorAll:()=>[]},'schedule-today':{textContent:''},'tt-legend':{innerHTML:''}};
      const headers=Array.from({length:6},()=>({innerHTML:'',active:false,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},classList:{toggle(){}}}));
      headers.forEach(h=>h.classList.toggle=(name,on)=>h.active=on);
      const document={getElementById:id=>elements[id],querySelectorAll:()=>headers};
      const escapeHtml=s=>String(s); getTodayDayIndex=()=>${day}; getExtraClassByDate=()=>null;`);
    s.run(renderer+';renderTimetable();');
    assert.equal(s.run('headers.filter(h=>h.active).length'),day<0?0:1);
    if(day>=0) {
      assert.equal(s.run(`headers[${day+1}].attrs['aria-current']`),'date');
      assert.equal(s.run(`(elements['tt-body'].innerHTML.match(/today-col|today-free/g)||[]).length`),8);
    } else assert.match(s.run(`elements['schedule-today'].textContent`),/No regular classes today/);
  }
});
