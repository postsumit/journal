
// === Polyfills for wider compatibility ===
(function(){
  if (typeof window.crypto === 'undefined') window.crypto = {};
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function(){
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
        const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    };
  }
  if (typeof window.structuredClone !== 'function') {
    window.structuredClone = function(obj){ return JSON.parse(JSON.stringify(obj)); };
  }
})();

// --- Utilities
const $ = (sel) => document.querySelector(sel);
const $all = (sel) => Array.from(document.querySelectorAll(sel));
const fmtDate = (d) => d.toISOString().slice(0, 10);
const parseDate = (s) => { const [y,m,d]=s.split('-').map(Number); return new Date(y, m-1, d); };
const dow = (dateStr) => parseDate(dateStr).getDay(); // 0 Sun..6 Sat
const dayKind = (dateStr) => {
  const d = dow(dateStr);
  if (d === 5) return 'fri';
  if (d === 6) return 'sat';
  if (d === 0) return 'sun';
  return 'weekday';
};
const clamp1to10 = (n) => Math.max(1, Math.min(10, Math.round(Number(n)||1)));

// --- Default data
function H(name, weights){ return { id: crypto.randomUUID(), name, weights, active:true }; }
const defaults = {
  habits: [
    H('🛌 Sleep', { weekday:25, fri:25, sat:20, sun:20 }),
    H('🤝 Build & Nurture', { weekday:15, fri:20, sat:20, sun:20 }),
    H('🍽️ Eat', { weekday:10, fri:5, sat:5, sun:5 }),
    H('💼 Work', { weekday:15, fri:15, sat:5, sun:5 }),
    H('🧘 Meditate', { weekday:20, fri:20, sat:20, sun:20 }),
    H('🏋️ Workout', { weekday:10, fri:10, sat:15, sun:15 }),
    H('📚 Learn', { weekday:5, fri:5, sat:15, sun:15 }),
  ],
  entries: {},
};

// --- Storage
function load() {
  try {
    const raw = localStorage.getItem('jh-lite');
    if (!raw) return window.structuredClone(defaults);
    const obj = JSON.parse(raw);
    // Ensure required keys
    if (!Array.isArray(obj.habits)) obj.habits = window.structuredClone(defaults.habits);
    if (!obj.entries || typeof obj.entries !== 'object') obj.entries = {};
    return obj;
  } catch {
    return window.structuredClone(defaults);
  }
}
function save() { localStorage.setItem('jh-lite', JSON.stringify(state)); }
let state = load();

// --- Tabs
$all('.tab').forEach(btn => btn.addEventListener('click', () => {
  $all('.tab').forEach(b => b.classList.remove('active'));
  $all('.tabpane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  $('#'+btn.dataset.tab).classList.add('active');
  if (btn.dataset.tab === 'analytics') renderAnalytics();
  if (btn.dataset.tab === 'manage') renderManage();
}));

// --- Date controls
const todayStr = fmtDate(new Date());
const dateInput = $('#dateInput');
dateInput.value = todayStr;
$('#todayBtn').addEventListener('click', () => { dateInput.value = todayStr; onDateChange(); });
$('#prevDay').addEventListener('click', () => { const d = parseDate(dateInput.value); d.setDate(d.getDate()-1); dateInput.value = fmtDate(d); onDateChange(); });
$('#nextDay').addEventListener('click', () => { const d = parseDate(dateInput.value); d.setDate(d.getDate()+1); dateInput.value = fmtDate(d); onDateChange(); });
dateInput.addEventListener('change', onDateChange);

// --- Export / Import
$('#exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `journal-habits-${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
});
$('#importInput').addEventListener('change', (e) => {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (obj.habits) state.habits = obj.habits;
      if (obj.entries) state.entries = obj.entries;
      save();
      renderAll();
      alert('Import complete.');
    } catch {
      alert('Invalid JSON file');
    }
  };
  reader.readAsText(file);
});

// --- TODAY: journal & habits
const feltGood = $('#feltGood');
const learnImprove = $('#learnImprove');
const otherNotes = $('#otherNotes');
const habitList = $('#habitList');
const dayKindBadge = $('#dayKindBadge');

function getEntry(dateStr) {
  return state.entries[dateStr] ?? { date: dateStr, answers:{ feltGood:'', learnImprove:'', other:'' }, habits:{} };
}
function setEntry(dateStr, entry) {
  state.entries[dateStr] = entry;
  save();
}
function normalizeWeightsFor(kind) {
  const active = state.habits.filter(h => h.active);
  const sum = active.reduce((a,h)=>a+(h.weights?.[kind]||0),0);
  if (sum <= 0) {
    const even = 100/Math.max(active.length,1);
    const out = {}; active.forEach(h => out[h.id] = even);
    return out;
  }
  const out = {}; active.forEach(h => out[h.id] = (h.weights[kind]/sum)*100);
  return out;
}
function calcDayScore(entry, dateStr) {
  const kind = dayKind(dateStr);
  const w = normalizeWeightsFor(kind);
  let total = 0;
  for (const h of state.habits.filter(h=>h.active)) {
    const s = clamp1to10(entry.habits?.[h.id] ?? 1);
    total += (s/10) * (w[h.id]||0);
  }
  return Math.round(total);
}
function weightSums() {
  const acc = { weekday:0, fri:0, sat:0, sun:0 };
  for (const h of state.habits.filter(h=>h.active)) {
    acc.weekday += Number(h.weights.weekday||0);
    acc.fri += Number(h.weights.fri||0);
    acc.sat += Number(h.weights.sat||0);
    acc.sun += Number(h.weights.sun||0);
  }
  return acc;
}

function onDateChange() {
  const s = dateInput.value;
  const entry = getEntry(s);
  feltGood.value = entry.answers.feltGood || '';
  learnImprove.value = entry.answers.learnImprove || '';
  otherNotes.value = entry.answers.other || '';
  renderHabitList();
  
  dayKindBadge.textContent = dayKind(s).toUpperCase();
  validateWeightTotals();
}
[feltGood, learnImprove, otherNotes].forEach(el => el.addEventListener('input', () => {
  const s = dateInput.value;
  const entry = getEntry(s);
  entry.answers.feltGood = feltGood.value;
  entry.answers.learnImprove = learnImprove.value;
  entry.answers.other = otherNotes.value;
  setEntry(s, entry);
}));

function renderHabitList(){
  const s = dateInput.value;
  const entry = getEntry(s);
  const weights = normalizeWeightsFor(dayKind(s));
  habitList.innerHTML = '';

  state.habits.filter(h=>h.active).forEach(h => {
    const wrap = document.createElement('div');
    wrap.className = 'habit';
    wrap.innerHTML = `
      <div class="top">
        <div class="name">${h.name}</div>
        <div>
          <span class="badge" title="Weight today">${(weights[h.id]||0).toFixed(1)}%</span>
          <span class="subtotal" title="Weighted contribution">+0.0</span>
        </div>
      </div>
      <div class="ticks"><span>0</span><span>2</span><span>6</span><span>8</span><span>10</span></div>
      <div class="range">
        <input class="slider" type="range" min="1" max="10" step="1" value="${entry.habits?.[h.id] ?? 1}" />
      </div>
    `;

    const range = wrap.querySelector('.slider');
    const subtotal = wrap.querySelector('.subtotal');

    function update(val){
      // clamp 1..10
      val = Math.max(1, Math.min(10, Math.round(Number(val)||1)));
      range.value = String(val);
      // compute contribution using NORMALIZED weight for this day
      const w = (weights[h.id]||0);
      const contrib = (val/10) * w;
      subtotal.textContent = '+' + contrib.toFixed(1);
      // save entry
      entry.habits[h.id] = val;
      setEntry(s, entry);
    }

    range.addEventListener('input', e => update(e.target.value));
    // initial set
    update(range.value);

    habitList.appendChild(wrap);
  });
}

// --- ANALYTICS
let last7Chart, perHabitChart, weekdayWeekendChart;
function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

function last7Data(anchorDateStr) {
  const out = [];
  const base = parseDate(anchorDateStr);
  for (let i=6;i>=0;i--) {
    const d = new Date(base); d.setDate(d.getDate()-i);
    const s = fmtDate(d);
    const e = getEntry(s);
    out.push({
      date: s.slice(5),
      rawDate: s,
      kind: dayKind(s),
      score: calcDayScore(e, s),
    });
  }
  return out;
}
function perHabitAverages(anchorDateStr) {
  const data = last7Data(anchorDateStr);
  const map = {};
  state.habits.filter(h=>h.active).forEach(h => map[h.id] = {name:h.name,total:0,count:0});
  data.forEach(row => {
    const e = getEntry(row.rawDate);
    state.habits.filter(h=>h.active).forEach(h => {
      const v = Number(e.habits?.[h.id] ?? 0);
      if (v) { map[h.id].total += v; map[h.id].count += 1; }
    });
  });
  return Object.values(map).map(o => ({ name:o.name, avg: o.count ? +(o.total/o.count).toFixed(1) : 0 }));
}

// Habit set selection
const habitSetDiv = $('#habitSet');
let selectedIds = new Set();
function ensureSelectedDefault() {
  if (selectedIds.size === 0) {
    state.habits.filter(h=>h.active).forEach(h=>selectedIds.add(h.id));
  }
}
function selectedWeeklyAvg(anchorDateStr) {
  const days = last7Data(anchorDateStr).map(row => {
    const e = getEntry(row.rawDate);
    const k = dayKind(row.rawDate);
    const wAll = normalizeWeightsFor(k);
    let total=0, sumW=0;
    state.habits.filter(h=>h.active).forEach(h => {
      if (!selectedIds.has(h.id)) return;
      const w = wAll[h.id]||0; sumW += w;
      const v = Number(e.habits?.[h.id] ?? 0);
      total += (v/10)*w;
    });
    if (sumW>0) total = total*(100/sumW);
    return total;
  });
  return +(avg(days).toFixed(1));
}

function renderAnalytics() {
  const anchor = dateInput.value;
  const last7 = last7Data(anchor);
  $('#weeklyAvg').textContent = avg(last7.map(x=>x.score)).toFixed(1);

  // weekday vs weekend
  const weekday = last7.filter(x=>x.kind==='weekday').map(x=>x.score);
  const weekend = last7.filter(x=>x.kind!=='weekday').map(x=>x.score);
  const wwData = [
    { name:'Weekday', avg: +(avg(weekday).toFixed(1)) },
    { name:'Weekend', avg: +(avg(weekend).toFixed(1)) },
  ];
  if (weekdayWeekendChart) weekdayWeekendChart.destroy();
  weekdayWeekendChart = new Chart($('#weekdayWeekendChart'), {
    type: 'bar',
    data: { labels: wwData.map(d=>d.name), datasets: [{ label: 'Avg score', data: wwData.map(d=>d.avg) }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // last 7 line
  if (last7Chart) last7Chart.destroy();
  last7Chart = new Chart($('#last7Chart'), {
    type: 'line',
    data: { labels: last7.map(d=>d.date), datasets: [{ label: 'Score', data: last7.map(d=>d.score) }] },
    options: { responsive: true, maintainAspectRatio: false, elements:{ line:{ tension:0.3 } } }
  });

  // per habit bar
  const ph = perHabitAverages(anchor);
  if (perHabitChart) perHabitChart.destroy();
  perHabitChart = new Chart($('#perHabitChart'), {
    type: 'bar',
    data: { labels: ph.map(d=>d.name), datasets: [{ label:'Avg (1–10)', data: ph.map(d=>d.avg) }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min:1, max:10 } } }
  });

  // habit set
  ensureSelectedDefault();
  habitSetDiv.innerHTML = '';
  state.habits.filter(h=>h.active).forEach(h => {
    const tag = document.createElement('span');
    tag.className = 'tag' + (selectedIds.has(h.id) ? ' active' : '');
    tag.textContent = h.name;
    tag.addEventListener('click', () => {
      if (selectedIds.has(h.id)) selectedIds.delete(h.id); else selectedIds.add(h.id);
      tag.classList.toggle('active');
      $('#selectedAvg').textContent = String(selectedWeeklyAvg(anchor));
    });
    habitSetDiv.appendChild(tag);
  });
  $('#selectedAvg').textContent = String(selectedWeeklyAvg(anchor));
}

// --- MANAGE
const manageList = $('#manageList');
const totalsBanner = $('#totalsBanner');
$('#addHabit').addEventListener('click', () => {
  state.habits.push(H('New Habit', { weekday:5,fri:5,sat:5,sun:5 }));
  save(); renderManage();
});
$('#normalizeBtn').addEventListener('click', () => {
  const kinds = ['weekday','fri','sat','sun'];
  const active = state.habits.filter(h=>h.active);
  const sums = kinds.map(k => active.reduce((a,h)=>a+(h.weights?.[k]||0),0));
  state.habits = state.habits.map(h => ({ ...h, weights: {...h.weights} }));
  kinds.forEach((k, i) => {
    const sum = sums[i];
    if (sum <= 0) {
      const even = 100/Math.max(active.length,1);
      state.habits.forEach(h => { if (h.active) h.weights[k] = even; });
    } else {
      state.habits.forEach(h => { if (h.active) h.weights[k] = +((h.weights[k]/sum)*100).toFixed(2); });
    }
  });
  save(); renderManage(); validateWeightTotals();
});

function renderManage() {
  // Totals banner
  const sums = weightSums();
  totalsBanner.innerHTML = '';
  [
    ['weekday','Weekday'], ['fri','Fri'], ['sat','Sat'], ['sun','Sun']
  ].forEach(([k,label]) => {
    const val = Math.round(sums[k]);
    const pill = document.createElement('span');
    pill.className = 'pill ' + (val === 100 ? 'ok' : 'bad');
    pill.textContent = `${label}: ${val}%` + (val === 100 ? ' ✓' : ' (fix)');
    totalsBanner.appendChild(pill);
  });

  // Rows
  manageList.innerHTML = '';
  state.habits.forEach((h, idx) => {
    const row = document.createElement('div');
    row.className = 'manage-row';
    row.innerHTML = `
      <input type="text" value="${h.name}"/>
      <input type="number" value="${h.weights.weekday}"/>
      <input type="number" value="${h.weights.fri}"/>
      <input type="number" value="${h.weights.sat}"/>
      <input type="number" value="${h.weights.sun}"/>
      <div class="switch">
        <label><input type="checkbox" ${h.active?'checked':''}/> Active</label>
      </div>
      <button class="danger">Delete</button>
    `;
    const [nameEl, wWeek, wFri, wSat, wSun] = row.querySelectorAll('input[type="text"], input[type="number"]');
    const activeEl = row.querySelector('input[type="checkbox"]');
    const delBtn = row.querySelector('button');

    nameEl.addEventListener('input', () => { h.name = nameEl.value; save(); renderAllLight(); });
    wWeek.addEventListener('input', () => { h.weights.weekday = Number(wWeek.value||0); save(); renderAllLight(); });
    wFri.addEventListener('input', () => { h.weights.fri = Number(wFri.value||0); save(); renderAllLight(); });
    wSat.addEventListener('input', () => { h.weights.sat = Number(wSat.value||0); save(); renderAllLight(); });
    wSun.addEventListener('input', () => { h.weights.sun = Number(wSun.value||0); save(); renderAllLight(); });
    activeEl.addEventListener('change', () => { h.active = activeEl.checked; save(); renderAll(); });
    delBtn.addEventListener('click', () => {
      if (confirm(`Delete habit "${h.name}"?`)) {
        state.habits.splice(idx,1); save(); renderManage(); renderAllLight();
      }
    });
    manageList.appendChild(row);
  });
}

function renderAllLight(){
  // lightweight refresh when editing weights/names
  validateWeightTotals();
  if ($('#today').classList.contains('active')) {
    renderHabitList(); 
  }
  if ($('#analytics').classList.contains('active')) {
    renderAnalytics();
  }
}

function validateWeightTotals(){
  const sums = weightSums();
  const ok = Math.round(sums.weekday)===100 && Math.round(sums.fri)===100 && Math.round(sums.sat)===100 && Math.round(sums.sun)===100;
  $('#weightWarning').classList.toggle('hidden', ok);
}

// --- Init
function renderAll(){
  onDateChange();
  if ($('#analytics').classList.contains('active')) renderAnalytics();
  if ($('#manage').classList.contains('active')) renderManage();
}
try{ renderAll(); }catch(e){ console.error(e); alert('Error Initializing: '+e.message); }
