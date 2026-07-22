const dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const weekdayNamesFull = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

function pad(n){ return String(n).padStart(2,'0'); }
function toKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function formatDate(d){
  return `${weekdayNamesFull[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}
function sameDay(a,b){ return a.toDateString()===b.toDateString(); }

let selectedDate = new Date();
let calView = 'woche';
let reportEntryDates = new Set(); // yyyy-mm-dd strings known to have entries (cached)
let saveTimer = null;

// ---------- Storage helpers (persisted via Electron main process) ----------
async function storeGet(key){
  try{ return await window.reportAPI.storageGet(key); }catch(e){ return null; }
}
async function storeSet(key, value){
  try{
    await window.reportAPI.storageSet(key, value);
    return true;
  }catch(e){ console.error('Speicherfehler', key, e); return false; }
}
async function storeDelete(key){
  try{ await window.reportAPI.storageDelete(key); }catch(e){}
}
async function storeList(prefix){
  try{
    const keys = await window.reportAPI.storageList(prefix);
    return keys || [];
  }catch(e){ return []; }
}

function flashSave(tagEl){
  tagEl.classList.add('show');
  clearTimeout(tagEl._t);
  tagEl._t = setTimeout(()=>tagEl.classList.remove('show'), 1500);
}

// ---------- Tagesreport ----------
const reportField = document.getElementById('reportField');
const saveReportBtn = document.getElementById('saveReportBtn');
const reportSaveTag = document.getElementById('reportSaveTag');
const calDate = document.getElementById('calDate');

async function loadReportFor(date){
  calDate.textContent = formatDate(date);
  reportField.value = '';
  reportField.placeholder = 'Lade…';
  const key = 'report:' + toKey(date);
  const val = await storeGet(key);
  reportField.value = val || '';
  reportField.placeholder = 'Heutiger Eintrag: Bautagebuch, Wetter, Besonderheiten…';
}

async function saveReport(){
  const key = 'report:' + toKey(selectedDate);
  const text = reportField.value;
  if(text.trim()===''){
    await storeDelete(key);
    reportEntryDates.delete(toKey(selectedDate));
  } else {
    await storeSet(key, text);
    reportEntryDates.add(toKey(selectedDate));
  }
  flashSave(reportSaveTag);
  renderCalendar();
  updateReminder();
}

saveReportBtn.addEventListener('click', saveReport);
reportField.addEventListener('input', ()=>{
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveReport, 900); // Autosave
});

// ---------- Kalender ----------
const weekStrip = document.getElementById('weekStrip');
const calTabs = document.getElementById('calTabs');

async function refreshEntryDatesCache(){
  const keys = await storeList('report:');
  reportEntryDates = new Set(keys.map(k=>k.replace('report:','')));
}

function renderCalendar(){
  weekStrip.innerHTML = '';
  const today = new Date();
  if(calView === 'woche'){
    weekStrip.style.gridTemplateColumns = 'repeat(7,1fr)';
    const start = new Date(selectedDate);
    const offset = (selectedDate.getDay()+6)%7;
    start.setDate(selectedDate.getDate()-offset);
    for(let i=0;i<7;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      weekStrip.appendChild(makeDayCell(d, today));
    }
  } else {
    weekStrip.style.gridTemplateColumns = 'repeat(7,1fr)';
    const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const startOffset = (first.getDay()+6)%7;
    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth()+1, 0).getDate();
    for(let i=0;i<startOffset;i++){
      const empty = document.createElement('div');
      empty.className = 'day-cell empty';
      weekStrip.appendChild(empty);
    }
    for(let d=1; d<=daysInMonth; d++){
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d);
      weekStrip.appendChild(makeDayCell(date, today, true));
    }
  }
}

function makeDayCell(d, today, monthMode){
  const cell = document.createElement('div');
  const key = toKey(d);
  let cls = 'day-cell';
  if(sameDay(d, today)) cls += ' today';
  if(sameDay(d, selectedDate)) cls += ' selected';
  if(reportEntryDates.has(key)) cls += ' has-entry';
  cell.className = cls;
  cell.style.cursor = 'pointer';
  if(monthMode){
    cell.style.fontSize = '10px';
    cell.innerHTML = `<span class="d">${d.getDate()}</span>`;
  } else {
    cell.innerHTML = `<span>${dayNames[d.getDay()]}</span><span class="d">${d.getDate()}</span>`;
  }
  cell.addEventListener('click', async ()=>{
    selectedDate = new Date(d);
    await loadReportFor(selectedDate);
    renderCalendar();
    updateReminder();
  });
  return cell;
}

calTabs.addEventListener('click', (e)=>{
  const tab = e.target.closest('.cal-tab');
  if(!tab) return;
  document.querySelectorAll('.cal-tab').forEach(t=>t.classList.remove('active'));
  tab.classList.add('active');
  calView = tab.dataset.view;
  renderCalendar();
});

document.getElementById('navPrev').addEventListener('click', async ()=>{
  const d = new Date(selectedDate);
  if(calView==='woche') d.setDate(d.getDate()-7); else d.setMonth(d.getMonth()-1);
  selectedDate = d;
  await loadReportFor(selectedDate);
  renderCalendar();
  updateReminder();
});
document.getElementById('navNext').addEventListener('click', async ()=>{
  const d = new Date(selectedDate);
  if(calView==='woche') d.setDate(d.getDate()+7); else d.setMonth(d.getMonth()+1);
  selectedDate = d;
  await loadReportFor(selectedDate);
  renderCalendar();
  updateReminder();
});
document.getElementById('navToday').addEventListener('click', async ()=>{
  selectedDate = new Date();
  await loadReportFor(selectedDate);
  renderCalendar();
  updateReminder();
});

// ---------- Status ----------
const statusTitle = document.getElementById('statusTitle');
const weekSlider = document.getElementById('weekSlider');
const monthSlider = document.getElementById('monthSlider');
const weekVal = document.getElementById('weekVal');
const monthVal = document.getElementById('monthVal');
const statusSaveTag = document.getElementById('statusSaveTag');
let statusSaveTimer = null;

async function loadStatus(){
  const val = await storeGet('status');
  let data = { title:'', week:0, month:0 };
  if(val){ try{ data = {...data, ...JSON.parse(val)}; }catch(e){} }
  statusTitle.value = data.title;
  weekSlider.value = data.week;
  monthSlider.value = data.month;
  weekVal.textContent = data.week + '%';
  monthVal.textContent = data.month + '%';
  document.getElementById('brandSub').textContent = data.title ? data.title : 'Baustelle — Status offen';
}
async function saveStatus(){
  const data = { title: statusTitle.value, week:+weekSlider.value, month:+monthSlider.value };
  await storeSet('status', JSON.stringify(data));
  document.getElementById('brandSub').textContent = data.title ? data.title : 'Baustelle — Status offen';
  flashSave(statusSaveTag);
}
function scheduleSaveStatus(){
  clearTimeout(statusSaveTimer);
  statusSaveTimer = setTimeout(saveStatus, 500);
}
statusTitle.addEventListener('input', scheduleSaveStatus);
weekSlider.addEventListener('input', ()=>{ weekVal.textContent = weekSlider.value+'%'; scheduleSaveStatus(); });
monthSlider.addEventListener('input', ()=>{ monthVal.textContent = monthSlider.value+'%'; scheduleSaveStatus(); });

// ---------- Bestellstatus ----------
const ordersList = document.getElementById('ordersList');
const ordersEmpty = document.getElementById('ordersEmpty');

async function loadOrders(){
  const val = await storeGet('orders');
  let orders = [];
  if(val){ try{ orders = JSON.parse(val); }catch(e){} }
  renderOrders(orders);
  return orders;
}
async function saveOrders(orders){
  await storeSet('orders', JSON.stringify(orders));
  renderOrders(orders);
}
function renderOrders(orders){
  ordersList.innerHTML = '';
  ordersEmpty.style.display = orders.length ? 'none' : 'block';
  orders.forEach(o=>{
    const row = document.createElement('div');
    row.className = 'order';
    const dateStr = o.date ? new Date(o.date).toLocaleDateString('de-DE') : '';
    row.innerHTML = `
      <div style="flex:1">
        <div class="order-name">${escapeHtml(o.name)}</div>
        <div class="order-sub">${dateStr}${o.note ? ' · '+escapeHtml(o.note) : ''}</div>
      </div>
      <button class="chip ${o.status}" data-id="${o.id}" data-action="toggle">${o.status==='delivered' ? 'Geliefert' : 'Ausstehend'}</button>
      <button class="order-del" data-id="${o.id}" data-action="del">✕</button>
    `;
    ordersList.appendChild(row);
  });
}
function escapeHtml(s){
  const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML;
}

ordersList.addEventListener('click', async (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  let orders = JSON.parse(await storeGet('orders') || '[]');
  if(btn.dataset.action === 'toggle'){
    orders = orders.map(o => o.id===id ? {...o, status: o.status==='delivered' ? 'pending' : 'delivered'} : o);
  } else if(btn.dataset.action === 'del'){
    orders = orders.filter(o => o.id!==id);
  }
  await saveOrders(orders);
});

document.getElementById('addOrderBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('orderName').value.trim();
  if(!name) return;
  const date = document.getElementById('orderDate').value;
  const note = document.getElementById('orderNote').value.trim();
  let orders = JSON.parse(await storeGet('orders') || '[]');
  orders.unshift({ id: 'o'+Date.now(), name, date, note, status:'pending' });
  await saveOrders(orders);
  document.getElementById('orderName').value = '';
  document.getElementById('orderDate').value = '';
  document.getElementById('orderNote').value = '';
});

// ---------- Screenshots ----------
const shotsGrid = document.getElementById('shotsGrid');
const fileInput = document.getElementById('fileInput');
const modalOverlay = document.getElementById('modalOverlay');
const modalImg = document.getElementById('modalImg');

async function loadShots(){
  const keys = await storeList('shot:');
  const shots = [];
  for(const k of keys){
    const val = await storeGet(k);
    if(val){ try{ shots.push({id:k.replace('shot:',''), ...JSON.parse(val)}); }catch(e){} }
  }
  shots.sort((a,b)=> b.ts - a.ts);
  renderShots(shots);
}
function renderShots(shots){
  shotsGrid.innerHTML = '';
  shots.forEach(s=>{
    const el = document.createElement('div');
    el.className = 'shot';
    el.innerHTML = `<img src="${s.dataUrl}" alt="${escapeHtml(s.name)}"><button class="shot-del" data-id="${s.id}">✕</button>`;
    el.querySelector('img').addEventListener('click', ()=>{
      modalImg.src = s.dataUrl;
      modalOverlay.classList.add('open');
    });
    el.querySelector('.shot-del').addEventListener('click', async (e)=>{
      e.stopPropagation();
      await storeDelete('shot:'+s.id);
      loadShots();
    });
    shotsGrid.appendChild(el);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'shot shot-add';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', ()=>fileInput.click());
  shotsGrid.appendChild(addBtn);
}

modalOverlay.addEventListener('click', ()=>modalOverlay.classList.remove('open'));

function resizeImage(file, maxDim=900, quality=0.72){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    const reader = new FileReader();
    reader.onload = ()=>{
      img.onload = ()=>{
        let {width,height} = img;
        if(width>height && width>maxDim){ height*=maxDim/width; width=maxDim; }
        else if(height>maxDim){ width*=maxDim/height; height=maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img,0,0,width,height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

fileInput.addEventListener('change', async ()=>{
  const files = Array.from(fileInput.files);
  for(const file of files){
    try{
      const dataUrl = await resizeImage(file);
      const id = 's'+Date.now()+Math.random().toString(36).slice(2,6);
      await storeSet('shot:'+id, JSON.stringify({ name:file.name, dataUrl, ts:Date.now() }));
    }catch(e){ console.error('Bildfehler', e); }
  }
  fileInput.value = '';
  loadShots();
});

// ---------- Reminder (12:00 Uhr) ----------
const reminderPill = document.getElementById('reminderPill');
const reminderText = document.getElementById('reminderText');
const reminderNote = document.getElementById('reminderNote');
let notifiedToday = false;

function clockStr(){
  const n = new Date();
  return pad(n.getHours())+':'+pad(n.getMinutes());
}

async function updateReminder(){
  const now = new Date();
  reminderText.textContent = clockStr();
  const todayKey = toKey(now);
  const todaysReport = await storeGet('report:'+todayKey);
  const dueTime = now.getHours() >= 12;
  const notFilled = !todaysReport || todaysReport.trim()==='';
  if(dueTime && notFilled){
    reminderPill.classList.add('due');
    reminderNote.textContent = 'Der heutige Tagesreport ist noch nicht ausgefüllt — bitte eintragen.';
    if(!notifiedToday){
      notifiedToday = true;
      tryNotify();
    }
  } else {
    reminderPill.classList.remove('due');
    reminderNote.textContent = 'Reminder aktiv täglich um 12:00 Uhr, solange der Tagesreport noch nicht ausgefüllt ist.';
  }
}

reminderPill.addEventListener('click', async ()=>{
  selectedDate = new Date();
  await loadReportFor(selectedDate);
  renderCalendar();
  reportField.focus();
});

function tryNotify(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'granted'){
    new Notification('Tagesreport', { body: 'Bitte den heutigen Tagesreport eintragen.' });
  } else if(Notification.permission !== 'denied'){
    Notification.requestPermission();
  }
}

setInterval(updateReminder, 30000);

// ---------- Init ----------
(async function init(){
  await refreshEntryDatesCache();
  await loadReportFor(selectedDate);
  renderCalendar();
  await loadStatus();
  await loadOrders();
  await loadShots();
  await updateReminder();
})();
