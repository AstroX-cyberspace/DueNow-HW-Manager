/* Small enhancements, independent of the original homework schema. */
(function () {
  'use strict';
  const ready = () => {
    const icons = {
      today:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
      list:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="m8 9 1 1 2-2m2 1h3M8 15h2m3 0h3"/>',
      timetable:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 10h18M9 10v11m6-11v11M8 2v4m8-4v4"/>',
      calendar:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 10h18M8 2v4m8-4v4m-9 8h3m4 0h3m-10 4h3"/>',
      clubs:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
      stats:'<path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/><path d="M16 3.9a8.8 8.8 0 0 1 4.1 4.1H16V3.9Z"/>',
      settings:'<path d="m9 3-.7 2.3-2.4 1-2.1-.4-1.5 2.6L4 10.3v3.4l-1.7 1.8 1.5 2.6 2.1-.4 2.4 1L9 21h6l.7-2.3 2.4-1 2.1.4 1.5-2.6-1.7-1.8v-3.4l1.7-1.8-1.5-2.6-2.1.4-2.4-1L15 3Z"/><circle cx="12" cy="12" r="3"/>'
    };
    const svg = paths => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
    document.querySelectorAll('.nav-item,.bb-item').forEach(el=>{const icon=el.querySelector('.ic,.i');icon.innerHTML=svg(icons[el.dataset.page]);});
    document.getElementById('btn-search').innerHTML=svg('<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>');
    document.getElementById('btn-notif').insertAdjacentHTML('afterbegin',svg('<path d="M5 9a7 7 0 0 1 14 0v6l2 3H3l2-3V9ZM9 21h6"/>'));
    document.getElementById('btn-notif').childNodes.forEach(n=>{if(n.nodeType===3)n.textContent='';});
    document.getElementById('demo-banner').hidden = !IS_DEMO;
    if (IS_DEMO) document.querySelector('.local-status').textContent = 'Demo session';
    const moreButton=document.getElementById('btn-more'), moreMenu=document.getElementById('more-menu');
    moreButton.addEventListener('click',()=>{moreMenu.hidden=!moreMenu.hidden;moreButton.setAttribute('aria-expanded',String(!moreMenu.hidden));});
    document.addEventListener('click',e=>{if(!e.target.closest('#btn-more,#more-menu')){moreMenu.hidden=true;moreButton.setAttribute('aria-expanded','false');}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!moreMenu.hidden){moreMenu.hidden=true;moreButton.setAttribute('aria-expanded','false');moreButton.focus();}});

    // Add keyboard semantics to legacy interactive elements without replacing handlers.
    function enhance() {
      document.querySelectorAll('.page-title:not(h1)').forEach(el=>{el.setAttribute('role','heading');el.setAttribute('aria-level','1');});
      document.querySelectorAll('.nav-item,.bb-item,.tab,.opt,.course,.tt-cell,.cal-cell[data-date],.club,.mhead,.club-del,.tl-del,.extra-item .del,.ntf[data-id],.add-pill').forEach(el => {
        el.setAttribute('role','button');el.tabIndex=0;
        if(el.matches('.tab,.opt'))el.setAttribute('aria-pressed',el.classList.contains('active'));
        if(el.matches('.nav-item,.bb-item'))el.setAttribute('aria-current',el.classList.contains('active')?'page':'false');
        if(el.matches('.mhead'))el.setAttribute('aria-expanded',!el.parentElement.classList.contains('collapsed'));
        if(el.matches('.cal-cell'))el.setAttribute('aria-label',el.dataset.date);
      });
      document.querySelectorAll('.hw-item[data-id]').forEach(el => {
        el.tabIndex=0;el.setAttribute('role','group');el.setAttribute('aria-label','Edit '+el.querySelector('.title').textContent);
        const check=el.querySelector('.hw-check'); check.tabIndex=0;check.setAttribute('role','checkbox');check.setAttribute('aria-checked',check.classList.contains('checked'));check.setAttribute('aria-label','Complete '+el.querySelector('.title').textContent);
        const del=el.querySelector('.hw-del');del.tabIndex=0;del.setAttribute('role','button');del.setAttribute('aria-label','Delete '+el.querySelector('.title').textContent);
      });
      document.querySelectorAll('.switch').forEach(el => {el.tabIndex=0;el.setAttribute('role','switch');el.setAttribute('aria-checked',!el.classList.contains('off'));el.setAttribute('aria-label',el.parentElement.querySelector('.k').textContent);});
      document.querySelectorAll('.field').forEach(el => {const label=el.querySelector('label'),input=el.querySelector('input,textarea,select');if(label&&input)label.htmlFor=input.id;});
    }
    enhance();
    const enhancementObserver = new MutationObserver(enhance);
    enhancementObserver.observe(document.querySelector('.app'),{childList:true,subtree:true});
    enhancementObserver.observe(document.getElementById('pop-search'),{childList:true,subtree:true});
    document.addEventListener('click',() => queueMicrotask(enhance));
    document.addEventListener('keydown',e => {
      if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role="button"]:not(button),[role="checkbox"],[role="switch"],.hw-item[data-id]')) {e.preventDefault();e.target.click();}
    });

    let returnFocus=null, activeDialog=null;
    const masks=[...document.querySelectorAll('.mask')];
    masks.forEach(mask => {
      const sheet=mask.querySelector('.sheet'),title=sheet.querySelector('h3');
      if(!title.id)title.id=mask.id+'-title';
      sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby',title.id);
      new MutationObserver(() => {
        const shown=masks.find(m=>m.classList.contains('show'));
        if(shown && shown!==activeDialog){returnFocus=document.activeElement;activeDialog=shown;shown.querySelector('input,button,select')?.focus();}
        document.querySelector('.app').inert=!!shown;
        document.querySelector('.dock').inert=!!shown;
        document.querySelector('.bottombar').inert=!!shown;
        document.body.style.overflow=shown?'hidden':'';
        if(!shown&&activeDialog){activeDialog=null;if(returnFocus?.isConnected&&returnFocus.getClientRects().length)returnFocus.focus();else document.getElementById('btn-add').focus();}
      }).observe(mask,{attributes:true,attributeFilter:['class']});
    });
    document.addEventListener('keydown',e => {
      if(e.key!=='Tab'||!activeDialog)return;
      const targets=[...activeDialog.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled);
      const first=targets[0],last=targets.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });

    const restore=document.createElement('button');restore.className='btn ghost';restore.textContent='Restore previous data';restore.id='btn-restore';
    document.getElementById('btn-clear').after(restore);
    restore.addEventListener('click',()=>{
      try {
        const backup=JSON.parse(DUENOW_STORE.getItem('duenow_recovery_v1'));
        if(!backup){alert('No recovery copy yet. A copy is saved before importing or clearing data.');return;}
        if(!confirm('Restore the data from before your last import or clear? Export your current data first if you need to keep it.'))return;
        const allowed=[STORAGE_KEY,SETTINGS_KEY,EXTRA_CLASSES_KEY,CLUBS_KEY];
        if(JSON.stringify(backup.keys)!==JSON.stringify(allowed)||backup.values.length!==4)throw new Error('Invalid recovery copy');
        backup.keys.forEach((key,i)=>{if(backup.values[i]===null)DUENOW_STORE.removeItem(key);else DUENOW_STORE.setItem(key,backup.values[i]);});
        location.reload();
      } catch(_){alert('Could not restore data. Your recovery copy is still available.');}
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
