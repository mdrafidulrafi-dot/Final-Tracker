/* Maintenance Tracker — front-end (vanilla JS, no build step) */
(() => {
'use strict';

/* =============================== config / constants =============================== */
const CFG = Object.assign({ API_URL: '', APP_TITLE: 'Maintenance Tracker', DEPARTMENT: 'Mechanical Maintenance Team', REFRESH_SECONDS: 60 }, window.APP_CONFIG || {});
const DEMO = !CFG.API_URL;
const STATUSES = ['In Planning', 'In Progress', 'On Hold', 'Blocked', 'Completed'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const STATUS_COLOR = { 'In Planning': '#7c3aed', 'In Progress': '#2563eb', 'On Hold': '#d97706', 'Blocked': '#dc2626', 'Completed': '#16a34a' };
const MAX_FILE = 12 * 1024 * 1024;
const COMBINED_ID = 'COMBINED';
const COMBINED = { id: COMBINED_ID, name: 'Combined', supervisor: '', lead: '', members: '', order: 9999, virtual: true };
const normStatus = s => (s === 'Not Started' || !s) ? 'In Planning' : s;

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  gantt: '<line x1="3" y1="6" x2="14" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="17" y2="18"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  report: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'
};
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* =============================== helpers =============================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDate = iso => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—';
const fmtDT = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const slug = s => String(s).toLowerCase().replace(/\s+/g, '-');
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const initials = s => (String(s).trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();
const members = t => String((t && t.members) || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp100 = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const uDate = u => u.date || String(u.timestamp || '').slice(0, 10);

/* ---- date range: every page is filtered by the task START date ---- */
const WEEK_START = 6;   // first day of the week: 6 = Saturday (Bangladesh), 0 = Sunday, 1 = Monday
const RANGE_PRESETS = [['all', 'All time'], ['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['prev', 'Previous month'],
  ['next', 'Next month'], ['last3', 'Last 3 months'], ['year', 'This year'], ['custom', 'Custom']];
const isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthBounds = (y, m) => ({ from: isoOf(new Date(y, m, 1)), to: isoOf(new Date(y, m + 1, 0)) });
function computeRange(r) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  switch (r.preset) {
    case 'today': { const t = todayISO(); return { from: t, to: t }; }
    case 'week': { const back = (now.getDay() - WEEK_START + 7) % 7; return { from: isoOf(new Date(y, m, now.getDate() - back)), to: isoOf(new Date(y, m, now.getDate() - back + 6)) }; }
    case 'month': return monthBounds(y, m);
    case 'prev': return monthBounds(y, m - 1);
    case 'next': return monthBounds(y, m + 1);
    case 'last3': return { from: monthBounds(y, m - 2).from, to: monthBounds(y, m).to };
    case 'year': return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'ym': { const [yy, mm] = String(r.ym || '').split('-').map(Number); return yy && mm ? monthBounds(yy, mm - 1) : { from: '', to: '' }; }
    case 'custom': return { from: r.from || '', to: r.to || '' };
  }
  return { from: '', to: '' };
}
function loadRange() {
  try {
    const r = JSON.parse(localStorage.getItem('mmt_range'));
    if (r && (r.preset === 'ym' || RANGE_PRESETS.some(p => p[0] === r.preset))) return r;
  } catch (e) {}
  return { preset: 'month' };
}
/** The date a task is placed by: start date; if none, due date; if none, the day it was added. */
const taskDate = t => String(t.startDate || t.endDate || (t.createdAt ? String(t.createdAt).slice(0, 10) : '') || '').slice(0, 10);
function inRange(t) {
  const r = computeRange(state.range);
  if (!r.from && !r.to) return true;
  const d = taskDate(t); if (!d) return false;
  return (!r.from || d >= r.from) && (!r.to || d <= r.to);
}
const rangeTasks = () => state.tasks.filter(inRange);
function rangeShort() {
  const c = computeRange(state.range);
  return !c.from && !c.to ? 'all time' : `${c.from ? fmtDate(c.from) : 'any'} – ${c.to ? fmtDate(c.to) : 'any'}`;
}
const byStart = (a, c) => { const x = taskDate(a), y = taskDate(c); if (!x !== !y) return x ? -1 : 1; return x.localeCompare(y) || String(a.title).localeCompare(String(c.title)); };

/* ---- responsible people: "All" always means every member's name ---- */
function teamNames(teamId) {
  const list = String(teamId) === COMBINED_ID ? state.teams.flatMap(t => members(t)) : members(teamById(teamId));
  const seen = new Set();
  return list.filter(n => { const k = n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
function expandResp(str, teamId) {
  const out = [], seen = new Set();
  const add = n => { const k = n.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(n); } };
  const names = teamNames(teamId);
  String(str || '').split(',').map(x => x.trim()).filter(Boolean).forEach(n => {
    if (n.toLowerCase() === 'all' && names.length) names.forEach(add); else add(n);
  });
  return out.join(', ');
}
const respOf = t => expandResp(t.responsibles, t.teamId);

function toast(msg, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), type === 'err' ? 6000 : 2800);
}

/* =============================== state =============================== */
const state = {
  teams: [], tasks: [], updates: [],
  view: 'dashboard', loading: true, lastSync: null,
  filters: { q: '', team: '', status: '', overdue: false },
  range: loadRange(), rangeOpen: false, bin: [],
  sort: { key: 'startDate', dir: 1 }
};
const auth = { user: '', pw: '' };
let draft = null;      // task drawer draft  { isNew, dirty, task }
let updDraft = null;   // "post update" attachments
let refreshTimer = null;
let verifying = false, qT = null;
const hist = { layers: 0, skip: 0 };   // browser-history entries used by the open drawer / popup / preview
function pushLayer() { try { history.pushState({ layer: 1 }, ''); hist.layers++; } catch (e) {} }
function popLayer() { if (hist.layers > 0) { hist.layers--; hist.skip++; try { history.back(); } catch (e) { hist.skip--; } } }
function closeLightbox() { const r = $('#lightbox-root'); if (r.children.length) { r.innerHTML = ''; popLayer(); } pvCurrent = null; }
function authFail() { try { localStorage.removeItem('mmt_pw'); } catch (e) {} toast('Wrong or changed password - please sign in again.', 'err'); switchUser(); }
let pvCurrent = null;  // attachment shown in preview

const allTeams = () => state.teams.concat([COMBINED]);
const teamById = id => String(id) === COMBINED_ID ? COMBINED : state.teams.find(t => String(t.id) === String(id));
const taskById = id => state.tasks.find(t => String(t.id) === String(id));
const tasksOf = id => rangeTasks().filter(t => String(t.teamId) === String(id));   // respects the date range
const isOverdue = t => t.status !== 'Completed' && t.endDate && t.endDate < todayISO();
const updatesFor = id => state.updates.filter(u => String(u.taskId) === String(id))
  .sort((a, b) => (uDate(b).localeCompare(uDate(a))) || String(b.timestamp).localeCompare(String(a.timestamp)));
function stats(tasks) {
  const n = tasks.length, done = tasks.filter(t => t.status === 'Completed').length;
  const avg = n ? Math.round(tasks.reduce((s, t) => s + (Number(t.progress) || 0), 0) / n) : 0;
  return { n, done, avg, over: tasks.filter(isOverdue).length, active: tasks.filter(t => t.status === 'In Progress').length };
}
function teamsWithWork() { return state.teams.concat(tasksOf(COMBINED_ID).length ? [COMBINED] : []); }

/* =============================== data layer =============================== */
const demo = {
  get() {
    try { const d = JSON.parse(localStorage.getItem('mmt_demo')); if (d && d.tasks) return d; } catch (e) {}
    const d = { teams: clone(window.SEED.teams), tasks: clone(window.SEED.tasks).map(t => Object.assign(t, { createdAt: new Date().toISOString() })), updates: [] };
    demo.put(d); return d;
  },
  put(d) { try { localStorage.setItem('mmt_demo', JSON.stringify(d)); } catch (e) { throw new Error('Browser storage is full — remove some attachments.'); } }
};

function demoCall(action, data) {
  const d = demo.get();
  const now = new Date().toISOString();
  const norm = (t, ex) => {
    const o = Object.assign({}, ex || {}, t);
    o.status = normStatus(o.status);
    o.progress = clamp100(o.progress);
    if (o.status === 'Completed') { o.progress = 100; if (!o.actualEnd) o.actualEnd = todayISO(); }
    if (!o.createdAt) o.createdAt = now;
    o.updatedAt = now; o.updatedBy = auth.user || 'Demo user';
    return o;
  };
  switch (action) {
    case 'saveTask': {
      const i = d.tasks.findIndex(t => t.id === data.id);
      const t = norm(data, i >= 0 ? d.tasks[i] : null);
      if (i >= 0) d.tasks[i] = t; else d.tasks.push(t);
      demo.put(d); return { ok: true, task: t };
    }
    case 'deleteTask': d.tasks = d.tasks.filter(t => t.id !== data.id); d.updates = d.updates.filter(u => u.taskId !== data.id); demo.put(d); return { ok: true };
    case 'saveTeam': {
      const i = d.teams.findIndex(t => t.id === data.id);
      if (i >= 0) d.teams[i] = data; else d.teams.push(data);
      demo.put(d); return { ok: true, team: data };
    }
    case 'deleteTeam':
      if (d.tasks.some(t => t.teamId === data.id)) return { ok: false, error: 'This team still has tasks. Move or delete them first.' };
      d.teams = d.teams.filter(t => t.id !== data.id); demo.put(d); return { ok: true };
    case 'addUpdate': {
      const i = d.tasks.findIndex(t => t.id === data.taskId);
      if (i < 0) return { ok: false, error: 'Task not found' };
      const date = /^\d{4}-\d{2}-\d{2}$/.test(data.date || '') ? data.date : todayISO();
      const latest = d.updates.filter(u => u.taskId === data.taskId).reduce((m, u) => uDate(u) > m ? uDate(u) : m, '');
      const upd = { id: uid('U'), date, taskId: data.taskId, taskTitle: d.tasks[i].title, user: auth.user || 'Demo user', note: data.note || '',
                    status: data.status, progress: Number(data.progress), attachments: data.attachments || [], timestamp: now };
      d.updates.push(upd);
      if (date >= latest) d.tasks[i] = norm({ status: upd.status, progress: upd.progress }, d.tasks[i]);
      demo.put(d); return { ok: true, update: upd, task: d.tasks[i] };
    }
    case 'editUpdate': {
      const ui = d.updates.findIndex(u => u.id === data.id); if (ui < 0) return { ok: false, error: 'Update not found' };
      const old = d.updates[ui], date = /^\d{4}-\d{2}-\d{2}$/.test(data.date || '') ? data.date : uDate(old);
      const upd = Object.assign({}, old, { date, note: data.note || '', status: data.status, progress: Number(data.progress), attachments: data.attachments || [] });
      d.updates[ui] = upd;
      const ti = d.tasks.findIndex(t => t.id === old.taskId);
      const latest = d.updates.filter(u => u.taskId === old.taskId && u.id !== old.id).reduce((m, u) => uDate(u) > m ? uDate(u) : m, '');
      if (ti >= 0 && date >= latest) d.tasks[ti] = norm({ status: upd.status, progress: upd.progress }, d.tasks[ti]);
      demo.put(d); return { ok: true, update: upd, task: d.tasks[ti] };
    }
    case 'uploadFile': {
      const url = 'data:' + data.mime + ';base64,' + data.base64;
      return { ok: true, file: { id: uid('F'), name: data.name, mime: data.mime, size: Math.round(data.base64.length * 0.75), url } };
    }
    case 'bulkImport': case 'registerUser': case 'restoreTask': return { ok: true };
  }
  return { ok: false, error: 'Unknown action' };
}

/* ---------- offline support: local copy of the data + a queue of changes made while offline ---------- */
const QKEY = 'mmt_queue_v1', CKEY = 'mmt_cache_v1';
const QUEUEABLE = { saveTask: 1, deleteTask: 1, restoreTask: 1, saveTeam: 1, deleteTeam: 1, addUpdate: 1, editUpdate: 1 };
let queue = [];
try { queue = JSON.parse(localStorage.getItem(QKEY)) || []; if (!Array.isArray(queue)) queue = []; } catch (e) { queue = []; }
const writeQueue = () => { try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch (e) { toast('Phone storage is full — free some space so offline changes can be kept.', 'err'); } };
const isOffline = () => navigator.onLine === false;
const isNetErr = e => !!e && (e.name === 'AbortError' || e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e.message || ''));

function applyData(d) {
  state.teams = (d.teams || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const allT = (d.tasks || []).map(t => Object.assign({}, t, { status: normStatus(t.status), attachments: Array.isArray(t.attachments) ? t.attachments : [] }));
  state.tasks = allT.filter(t => !t.deletedAt); state.bin = allT.filter(t => t.deletedAt);
  state.updates = (d.updates || []).map(u => Object.assign({}, u, { status: normStatus(u.status), attachments: Array.isArray(u.attachments) ? u.attachments : [] }));
}
function saveCache() {
  if (DEMO) return;
  const snap = n => JSON.stringify({ teams: state.teams, tasks: state.tasks.concat(state.bin), updates: state.updates.slice(-n), at: Date.now() });
  try { localStorage.setItem(CKEY, snap(5000)); }
  catch (e) { try { localStorage.setItem(CKEY, snap(300)); } catch (x) {} }
}
function loadCache() {
  try {
    const d = JSON.parse(localStorage.getItem(CKEY));
    if (!d || !Array.isArray(d.tasks)) return false;
    applyData(d); state.loading = false; return true;
  } catch (e) { return false; }
}

async function fetchJSON(url, opts, ms) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), ms || 45000);
  try {
    const r = await fetch(url, Object.assign({}, opts, ctl ? { signal: ctl.signal } : {}));
    const txt = await r.text();
    let j;
    try { j = JSON.parse(txt); }
    catch (e) { throw new Error('The server sent an unexpected reply. Check that the web app is deployed for "Anyone".'); }
    if (j && j.auth && !verifying && auth.user) authFail();
    return j;
  } finally { if (timer) clearTimeout(timer); }
}

const api = {
  async load() {
    if (DEMO) { const d = demo.get(); return { ok: true, teams: d.teams, tasks: d.tasks, updates: d.updates }; }
    return fetchJSON(`${CFG.API_URL}?action=getAll&pw=${encodeURIComponent(auth.pw)}`, {}, 30000);
  },
  async call(action, data, user, ms) {
    if (DEMO) { try { return demoCall(action, data); } catch (e) { return { ok: false, error: e.message }; } }
    return fetchJSON(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action, user: user === undefined ? auth.user : user, password: auth.pw, data }) },
      ms || (action === 'uploadFile' ? 120000 : 45000));
  }
};

/** Works out the result of a change locally (same rules as the Apps Script) so the app keeps working offline. */
function localApply(action, data) {
  const now = new Date().toISOString();
  const norm = (t, ex) => {
    const o = Object.assign({}, ex || {}, t);
    o.id = String(o.id); o.status = normStatus(o.status);
    o.daysRequired = (o.daysRequired === '' || o.daysRequired == null) ? '' : Number(o.daysRequired);
    o.progress = clamp100(o.progress);
    if (o.status === 'Completed') { o.progress = 100; if (!o.actualEnd) o.actualEnd = todayISO(); }
    if (!o.createdAt) o.createdAt = now;
    o.updatedAt = now; o.updatedBy = auth.user || o.updatedBy || '';
    o.attachments = Array.isArray(t.attachments) ? t.attachments : ((ex && ex.attachments) || []);
    return o;
  };
  switch (action) {
    case 'saveTask':
      if (!String(data.title || '').trim()) throw new Error('Task title is required');
      return { ok: true, task: norm(data, taskById(data.id)) };
    case 'deleteTask': case 'restoreTask': return { ok: true };
    case 'saveTeam':
      if (!String(data.name || '').trim()) throw new Error('Team name is required');
      return { ok: true, team: Object.assign({}, data, { order: Number(data.order) || 0 }) };
    case 'deleteTeam':
      if (state.tasks.some(t => String(t.teamId) === String(data.id))) throw new Error('This team still has tasks. Move or delete them first.');
      return { ok: true };
    case 'addUpdate': {
      const task = taskById(data.taskId); if (!task) throw new Error('Task not found');
      const date = /^\d{4}-\d{2}-\d{2}$/.test(data.date || '') ? data.date : todayISO();
      const latest = updatesFor(data.taskId).reduce((m, u) => uDate(u) > m ? uDate(u) : m, '');
      const status = data.status || task.status, p = clamp100(data.progress);
      const upd = { id: data.id || uid('U'), date, taskId: String(data.taskId), taskTitle: task.title, user: auth.user, note: data.note || '',
                    status, progress: p, attachments: data.attachments || [], timestamp: now };
      return { ok: true, update: upd, task: date >= latest ? norm({ status, progress: p }, task) : task };
    }
    case 'editUpdate': {
      const old = state.updates.find(u => u.id === data.id); if (!old) throw new Error('Update not found');
      const task = taskById(old.taskId);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(data.date || '') ? data.date : uDate(old);
      const status = data.status || old.status, p = clamp100(data.progress);
      const upd = Object.assign({}, old, { date, note: data.note != null ? data.note : old.note, status, progress: p, attachments: data.attachments || old.attachments || [] });
      const latest = state.updates.filter(u => String(u.taskId) === String(old.taskId) && u.id !== old.id).reduce((m, u) => uDate(u) > m ? uDate(u) : m, '');
      return { ok: true, update: upd, task: task && date >= latest ? norm({ status, progress: p }, task) : task };
    }
  }
  return { ok: false, error: 'Unknown action' };
}

/** Sends the changes that were made offline, oldest first. Stops (and keeps the rest) if the connection drops. */
let flushing = false;
async function flushQueue() {
  if (DEMO || flushing || !queue.length || isOffline()) return;
  flushing = true; setSync('busy');
  let bad = false;
  try {
    while (queue.length) {
      const op = queue[0];
      let res;
      try { res = await api.call(op.action, op.data, op.user, 60000); }
      catch (e) { break; }                       // no connection / bad reply → try again later, keep the change
      if (!res.ok) bad = true;
      if (!res.ok) toast(`Could not sync "${op.data.title || op.data.name || op.action}": ${res.error || 'server error'}`, 'err');
      queue.shift(); writeQueue();
    }
  } finally { flushing = false; setSync(queue.length ? 'off' : 'ok'); updateNet(); if (bad && !queue.length) load(true).then(ok => { if (ok) renderView(true); }); }
}
async function syncNow() {
  if (!auth.user) return;
  await flushQueue();
  if (!queue.length && !isOffline() && await load(true)) renderView(true);
}

async function requestQueued(action, data) {
  const res = localApply(action, data);                    // shown at once; the server catches up in the background
  queue.push({ qid: uid('Q'), action, data: clone(data), user: auth.user, at: Date.now() });
  writeQueue(); setTimeout(saveCache, 0);
  res.queued = isOffline();
  setSync(isOffline() ? 'off' : 'busy'); updateNet();
  if (!isOffline()) setTimeout(flushQueue, 0);
  return res;
}

async function request(action, data) {
  if (!DEMO && QUEUEABLE[action]) return requestQueued(action, data);
  setSync('busy');
  try {
    const res = await api.call(action, data);
    if (!res.ok) throw new Error(res.error || 'Request failed');
    setSync('ok');
    return res;
  } catch (e) {
    const off = isNetErr(e);
    setSync(off ? 'off' : 'ok');
    throw new Error(off ? (action === 'uploadFile' ? 'No connection — files can only be attached while online. Everything else you enter is saved on this device and synced later.' : 'No connection — this needs the internet.') : e.message);
  }
}

function setSync(s) {
  const d = $('#sync-dot'), l = $('#sync-label');
  if (!d) return;
  const n = queue.length, off = s === 'off' || isOffline();
  d.className = 'dot' + (s === 'busy' ? ' busy' : off ? ' off' : n ? ' busy' : '');
  const rd = $('#rdot'); if (rd) rd.className = d.className.replace(/^dot/, 'rdot');
  if (s === 'busy') l.textContent = 'Saving…';
  else if (off) l.textContent = 'Offline' + (n ? ' · ' + n + ' pending' : '');
  else if (n) l.textContent = n + ' pending sync';
  else l.textContent = state.lastSync ? 'Synced ' + pad(state.lastSync.getHours()) + ':' + pad(state.lastSync.getMinutes()) : 'Ready';
}

function updateNet() {
  const el = $('#net-banner'); if (!el) return;
  const n = queue.length;
  if (isOffline()) { el.hidden = false; el.innerHTML = `<b>You are offline.</b> Keep working — changes are saved on this device${n ? ` (${n} waiting)` : ''} and will sync automatically when you are back online.`; }
  else if (n) { el.hidden = false; el.innerHTML = `<b>${n} change${n > 1 ? 's' : ''} waiting to sync</b> — they will upload automatically once the connection works.`; }
  else el.hidden = true;
}

async function load(silent) {
  if (!silent) setSync('busy');
  try {
    if (!DEMO && queue.length) { await flushQueue(); if (queue.length) throw new TypeError('Failed to fetch'); }   // never overwrite unsent changes
    const d = await api.load();
    if (!d.ok) throw new Error(d.error || 'Server error');
    applyData(d);
    state.lastSync = new Date(); state.loading = false;
    saveCache(); setSync('ok'); updateNet();
    return true;
  } catch (e) {
    state.loading = false; setSync('off');
    if (!silent) toast(isNetErr(e) ? 'Cannot reach the server — showing the data saved on this device.' : e.message, 'err');
    return false;
  }
}

/* =============================== name entry / boot =============================== */
function switchUser() {
  try { localStorage.removeItem('mmt_user'); localStorage.removeItem('mmt_pw'); } catch (e) {}
  auth.user = ''; auth.pw = ''; clearInterval(refreshTimer);
  closeLightbox(); closeModal(); closeDrawer(true);
  showLogin();
}

function showLogin() {
  $('#app').innerHTML = `
  <div class="login"><div class="card box">
    <div class="logo">${icon('gear')}</div>
    <h1>${esc(CFG.APP_TITLE)}</h1>
    <div class="muted">${esc(CFG.DEPARTMENT)}</div>
    <form id="login-form">
      <label class="fld">Enter your name to continue<input id="lg-name" placeholder="e.g. Rafid" autocomplete="name" required value="${esc(auth.user)}"></label>
      ${DEMO ? '' : '<label class="fld">Password<input id="lg-pw" type="password" inputmode="numeric" autocomplete="current-password" required></label>'}
      <div class="err-msg" id="lg-err"></div>
      <div class="muted" style="font-size:12.5px">Your name is shown next to the updates you post.</div>
      <button class="btn primary" style="justify-content:center">Enter</button>
    </form>
  </div></div>`;
  $('#lg-name').focus();
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#lg-name').value.trim(); if (!name) return;
    const pw = DEMO ? '' : $('#lg-pw').value.trim();
    const btn = $('#login-form button'), err = $('#lg-err');
    if (!DEMO) {
      btn.disabled = true; err.textContent = '';
      let saved = ''; try { saved = localStorage.getItem('mmt_pw') || ''; } catch (x) {}
      verifying = true;
      try {
        const r = await fetchJSON(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', user: name, password: pw, data: {} }) }, 20000);
        if (!r.ok) { err.textContent = 'Wrong password. Please try again.'; btn.disabled = false; verifying = false; return; }
      } catch (x) {
        if (!(isNetErr(x) && saved && saved === pw)) { err.textContent = isNetErr(x) ? 'No connection - cannot check the password.' : x.message; btn.disabled = false; verifying = false; return; }
      }
      verifying = false;
    }
    auth.user = name; auth.pw = pw;
    try { localStorage.setItem('mmt_user', name); localStorage.setItem('mmt_pw', pw); } catch (x) {}
    await begin();
  });
}

function registerVisit() {
  const ua = navigator.userAgent || '';
  const dev = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows PC' : /Mac/i.test(ua) ? 'Mac' : 'Other';
  api.call('registerUser', { name: auth.user, device: dev }).catch(() => {});
}

async function begin() {
  registerVisit();
  if (!DEMO && loadCache()) {            // open instantly from the copy saved on this device, then refresh in the background
    start();
    load(true).then(ok => { if (!auth.user) return; if (ok) renderView(true); else toast('Showing the data saved on this device. It will sync when the connection is back.'); });
    return;
  }
  const ok = await load(true);
  if (!auth.user) return;
  start();
  if (!ok) toast('Could not load data. Check API_URL in config.js and that the web app is deployed for "Anyone".', 'err');
}

async function boot() {
  try { auth.user = localStorage.getItem('mmt_user') || ''; auth.pw = localStorage.getItem('mmt_pw') || ''; } catch (e) {}
  if (auth.user && (DEMO || auth.pw)) return begin();
  showLogin();
}

function start() {
  buildShell();
  setView(state.view, 'replace');
  clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    if (queue.length) await flushQueue();
    if (document.hidden || $('#drawer-root').children.length || $('#modal-root').children.length || $('#lightbox-root').children.length) return;
    if (await load(true)) renderView(true);
  }, Math.max(15, CFG.REFRESH_SECONDS) * 1000);
}

/* =============================== shell / routing =============================== */
const NAV = [
  { id: 'dashboard', label: 'Dashboard', title: 'Dashboard', sub: 'Overview of all maintenance work' },
  { id: 'teams', label: 'Teams', title: 'Teams & work', sub: 'Who is doing what, and how far along' },
  { id: 'tasks', label: 'Tasks', title: 'All tasks', sub: 'Sortable list across every team' },
  { id: 'timeline', label: 'Timeline', title: 'Timeline', sub: 'Planned dates versus today' },
  { id: 'profile', label: 'Profile', title: 'Profile', sub: 'Your name and deleted tasks' }
];

function buildShell() {
  $('#app').innerHTML = `
  <div class="layout">
    <aside class="side">
      <div class="brand"><div class="logo">${icon('gear')}</div><div><b>${esc(CFG.APP_TITLE)}</b><small>${esc(CFG.DEPARTMENT)}</small></div></div>
      <nav class="nav">${NAV.map(n => `<button data-act="${n.act || 'nav'}" data-v="${n.id}" id="nav-${n.id}"><span>${n.label}</span></button>`).join('')}</nav>
      <div class="side-foot">
        <div class="who" data-act="rename" title="Click to change your name">
          <div class="avatar" id="who-av"></div><div><b id="who-name"></b><small>Signed in</small></div>
        </div>
        <div class="sync"><span class="dot" id="sync-dot"></span><span id="sync-label">Ready</span></div>
        <div class="side-btns">
          <button data-act="theme" title="Toggle dark mode">${icon('moon')}<span>Theme</span></button>
          
        </div>
      </div>
    </aside>
    <main class="main">
      <div class="top">
        <div><h1 id="v-title"></h1><div class="sub" id="v-sub"></div></div><div class="grow"></div>
        
        <div class="tbtns"><button class="btn rep-btn" data-act="report" title="Daily report for WhatsApp" aria-label="Daily report">${icon('report')}</button>
        
        <button class="btn" data-act="upd-pick">${icon('edit')}Update</button>
        <button class="btn" data-act="team-new">${icon('users')}Add team</button>
        <button class="btn primary" data-act="task-new">${icon('plus')}New task</button></div>
        <button class="btn refresh-btn" data-act="refresh" title="Refresh" aria-label="Refresh">${icon('refresh')}<span class="rdot" id="rdot"></span></button>
      </div>
      <div id="net-banner" class="banner net" hidden></div>
      ${DEMO ? `<div class="banner"><b>Demo mode</b> — data is saved only in this browser. Add your Apps Script URL in <code>config.js</code> to use the Google Sheet.</div>` : ''}
      <div id="view"></div>
    </main>
  </div>`;
  $('#who-name').textContent = auth.user || 'Guest';
  $('#who-av').textContent = initials(auth.user || 'G');
  updateNet(); setSync('ok');
}

function setView(v, how) {
  const changed = v !== state.view;
  try { if (how === 'replace') history.replaceState({ view: v }, ''); else if (how !== 'pop' && changed) history.pushState({ view: v }, ''); } catch (e) {}
  state.view = v;
  $$('.nav button').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  const n = NAV.find(x => x.id === v);
  $('#v-title').textContent = n.title; $('#v-sub').textContent = n.sub;
  renderView();
}

function renderView(keepScroll) {
  const el = $('#view'); if (!el) return;
  const y = window.scrollY;
  const bars = state.view === 'profile' ? '' : rangeBar() + (state.view === 'dashboard' ? '' : filterBar());
  el.innerHTML = bars + '<div id="vbody"></div>';
  renderBody();
  if (keepScroll) window.scrollTo(0, y);
}

function renderBody() {
  const b = $('#vbody'); if (!b) return;
  if (state.loading) { b.innerHTML = '<div class="empty">Loading…</div>'; return; }
  if (state.view === 'profile') { viewProfile(b); return; }
  if (!state.teams.length && !state.tasks.length) { b.innerHTML = emptyStart(); return; }
  ({ dashboard: viewDashboard, teams: viewTeams, tasks: viewTable, timeline: viewTimeline })[state.view](b);
}

function emptyStart() {
  return `<div class="card empty"><h3>Nothing here yet</h3>
    <p>Add your first team, or load the starter data from your Team-wise Task List.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn primary" data-act="seed">Load starter data (Teams A–F)</button>
      <button class="btn" data-act="team-new">Add a team</button></div></div>`;
}

/* =============================== date range + filters =============================== */
function setRange(r) {
  state.range = r;
  try { localStorage.setItem('mmt_range', JSON.stringify(r)); } catch (e) {}
  renderView();
}
function rangeBar() {
  const r = state.range, c = computeRange(r), n = rangeTasks().length, open = !!state.rangeOpen;
  const all = !c.from && !c.to;
  const label = r.preset === 'ym' ? r.ym : ((RANGE_PRESETS.find(p => p[0] === r.preset) || [])[1] || 'Custom');
  return `<div class="card rbar">
    <button type="button" class="rtoggle" data-act="range-toggle" aria-expanded="${open}">
      <span><b>Filter by start date</b> · ${esc(label)}</span>
      <span class="rcount"><b>${n}</b> of ${state.tasks.length} tasks <i class="car">▾</i></span></button>
    ${open ? `<div class="rbody">
      <div class="rhead"><span class="rinfo">${all ? 'Showing all tasks' : 'Tasks starting <b>' + rangeShort() + '</b>'}</span></div>
      <div class="rchips">${RANGE_PRESETS.map(([k, lb]) => `<button type="button" class="rchip ${r.preset === k ? 'on' : ''}" data-act="range" data-p="${k}">${lb}</button>`).join('')}
        <label class="rmonth">Pick month <input type="month" id="rng-ym" value="${r.preset === 'ym' ? esc(r.ym) : ''}"></label></div>
      ${r.preset === 'custom' ? `<div class="rcustom"><label class="fld">From<input type="date" id="rng-from" value="${esc(r.from || '')}"></label><label class="fld">To<input type="date" id="rng-to" value="${esc(r.to || '')}"></label></div>` : ''}
      ${all ? '' : '<div class="rnote">Tasks with no start date are placed by their due date (or the day they were added).</div>'}
    </div>` : ''}
  </div>`;
}

function filterBar() {
  const f = state.filters;
  return `<div class="fbar">
    <div class="search">${icon('search')}<input id="flt-q" placeholder="Search task, person, remark…" value="${esc(f.q)}"></div>
    <select id="flt-team"><option value="">All teams</option>${allTeams().map(t => `<option value="${esc(t.id)}" ${f.team === String(t.id) ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
    <select id="flt-status"><option value="">All statuses</option><option ${f.status === 'Started' ? 'selected' : ''}>Started</option>${STATUSES.map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <label class="chk"><input type="checkbox" id="flt-over" ${f.overdue ? 'checked' : ''}> Overdue only</label>
    <button class="btn ghost sm" data-act="clear-filters">Clear</button></div>`;
}
const filtersActive = () => { const f = state.filters; return !!(f.q || f.team || f.status || f.overdue); };
function filtered() {
  const f = state.filters, q = f.q.trim().toLowerCase();
  return state.tasks.filter(t => {
    if (!inRange(t)) return false;
    if (f.team && String(t.teamId) !== f.team) return false;
    if (f.status && !(f.status === 'Started' ? (t.status === 'In Planning' || t.status === 'In Progress') : t.status === f.status)) return false;
    if (f.overdue && !isOverdue(t)) return false;
    if (q) {
      const team = teamById(t.teamId);
      const hay = [t.title, t.description, t.drawing, respOf(t), t.remarks, team && team.name].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* =============================== views =============================== */
function progressBar(p, done) { return `<div class="bar ${done ? 'done' : ''}"><i style="width:${clamp100(p)}%"></i></div>`; }
const pill = s => `<span class="pill st-${slug(s)}">${esc(s)}</span>`;

function viewDashboard(b) {
  const all = rangeTasks(), s = stats(all), inIds = new Set(all.map(t => String(t.id)));
  const attention = all.filter(t => isOverdue(t) || t.status === 'Blocked' || t.status === 'On Hold')
    .sort((a, c) => (a.endDate || '9').localeCompare(c.endDate || '9')).slice(0, 8);
  const counts = STATUSES.map(st => all.filter(t => t.status === st).length);
  let acc = 0;
  const grad = all.length ? counts.map((c, i) => { const from = acc / all.length * 100; acc += c; return `${STATUS_COLOR[STATUSES[i]]} ${from}% ${acc / all.length * 100}%`; }).join(',') : 'var(--line) 0 100%';
  const recent = state.updates.filter(u => inIds.has(String(u.taskId))).sort((a, c) => (uDate(c).localeCompare(uDate(a))) || String(c.timestamp).localeCompare(String(a.timestamp))).slice(0, 8);

  b.innerHTML = `
  <div class="kpis">
    <div class="card kpi"><small>Total tasks</small><div class="n">${s.n}</div></div>
    <div class="card kpi"><small>In progress</small><div class="n">${s.active}</div></div>
    <div class="card kpi ok"><small>Completed</small><div class="n">${s.done}</div></div>
    <div class="card kpi ${s.over ? 'warn' : ''}"><small>Overdue</small><div class="n">${s.over}</div></div>
    <div class="card kpi"><small>Overall progress</small><div class="n">${s.avg}%</div></div>
  </div>
  <div class="dash-grid">
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
      <div class="card panel"><h3>Progress by team</h3>
        ${teamsWithWork().map(t => { const ts = stats(tasksOf(t.id)); return `
          <div class="team-prog" data-act="open-team" data-id="${esc(t.id)}">
            <b>${esc(t.name)}</b>${progressBar(ts.avg, ts.n && ts.done === ts.n)}<span class="pct">${ts.avg}%</span></div>`; }).join('') || '<div class="muted">No teams yet.</div>'}
      </div>
      <div class="card panel"><h3>Needs attention</h3>
        <div class="att-list">${attention.length ? attention.map(t => { const tm = teamById(t.teamId); return `
          <div class="att-item" data-act="task-open" data-id="${esc(t.id)}">
            <div style="flex:1;min-width:0"><div class="t">${esc(t.title)}</div>
            <small>${esc(tm ? tm.name : '')} · due ${fmtDate(t.endDate)}${t.remarks ? ' · ' + esc(t.remarks) : ''}</small></div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${pill(t.status)}${isOverdue(t) ? `<span class="tag over">${icon('alert')}Overdue</span>` : ''}</div>
          </div>`; }).join('') : '<div class="muted">Nothing overdue or blocked — nice.</div>'}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">
      <div class="card panel"><h3>Status breakdown</h3>
        <div class="donut-wrap"><div class="donut" style="background:conic-gradient(${grad})" data-center="${s.n}"></div>
        <div class="legend">${STATUSES.map((st, i) => `<span><i style="background:${STATUS_COLOR[st]}"></i>${st} <b class="mono">${counts[i]}</b></span>`).join('')}</div></div>
      </div>
      <div class="card panel"><h3>Recent updates</h3>
        <div class="att-list">${recent.length ? recent.map(u => { const t = taskById(u.taskId); return `
          <div class="att-item" data-act="task-update" data-id="${esc(u.taskId)}">
            <div class="avatar" style="background:var(--side);color:#fff;flex:none">${esc(initials(u.user))}</div>
            <div style="min-width:0"><div class="t">${esc(t ? t.title : 'Deleted task')}</div>
            <small>${esc(u.user || '')} · ${fmtDate(uDate(u))} · ${esc(u.status)} ${Number(u.progress) || 0}%</small>
            ${u.note ? `<div>${esc(u.note)}</div>` : ''}</div></div>`; }).join('') : '<div class="muted">Updates you post on tasks will show here.</div>'}</div>
      </div>
    </div>
  </div>`;
}

const taskBtns = id => `<div class="tact"><button type="button" class="btn sm" data-act="task-open" data-id="${esc(id)}">${icon('file')}View task</button><button type="button" class="btn sm primary" data-act="task-update" data-id="${esc(id)}">${icon('edit')}Update task</button></div>`;
function taskRow(t) {
  const n = (t.attachments || []).length;
  const resp = respOf(t);
  const sub = [t.description, t.drawing ? 'Dwg: ' + t.drawing : '', resp ? '👷 ' + resp : ''].filter(Boolean).join(' · ');
  return `<div class="trow">
    <div style="min-width:0"><div class="ttitle">${esc(t.title)}</div>${sub ? `<div class="tsub">${esc(sub)}</div>` : ''}</div>
    <div class="tmeta">
      <div class="row">${pill(t.status)}${t.priority === 'Urgent' || t.priority === 'High' ? `<span class="tag ${slug(t.priority)}">${esc(t.priority)}</span>` : ''}</div>
      <div class="row">${progressBar(t.progress, t.status === 'Completed')}<span class="pc">${clamp100(t.progress)}%</span></div>
      <div class="row">
        ${isOverdue(t) ? `<span class="tag over">${icon('alert')}Overdue</span>` : ''}
        ${t.endDate ? `<span class="tag">Due ${fmtDate(t.endDate)}</span>` : ''}
        ${n ? `<span class="tag">${icon('clip')}${n}</span>` : ''}
      </div>
    </div>
    ${t.remarks ? `<div class="tremark">${esc(t.remarks)}</div>` : ''}
    ${taskBtns(t.id)}
  </div>`;
}

function boardTeams() {
  const f = state.filters.team;
  const list = state.teams.filter(t => !f || String(t.id) === f);
  if (!f || f === COMBINED_ID) list.push(COMBINED);
  return list;
}

function viewTeams(b) {
  const list = filtered();
  const cards = boardTeams().map(team => {
    const mine = list.filter(t => String(t.teamId) === String(team.id)).sort(byStart);
    if (filtersActive() && !mine.length && !(state.filters.team && !state.filters.q && !state.filters.status && !state.filters.overdue)) return '';
    const s = stats(tasksOf(team.id));
    const virt = !!team.virtual;
    return `<section class="card team" id="team-${esc(team.id)}">
      <div class="team-head">
        <div class="badge">${virt ? '★' : esc(String(team.name).replace(/^team\s*/i, '').slice(0, 2).toUpperCase())}</div>
        <div class="info"><h2>${esc(team.name)}</h2>
          ${virt ? `<div class="roles">Joint work — pick people from <b>any team</b> as responsible</div>` : `
          <div class="roles">Supervisor: <b>${esc(team.supervisor || '—')}</b> · Lead: <b>${esc(team.lead || '—')}</b></div>
          <div class="members">${members(team).map(m => `<span class="member">${esc(m)}</span>`).join('')}</div>`}</div>
        ${virt ? '' : `<button class="icon-btn" data-act="team-edit" data-id="${esc(team.id)}" title="Edit team">${icon('edit')}</button>`}
      </div>
      <div class="team-sum">${progressBar(s.avg, s.n && s.done === s.n)}<span><b>${s.avg}%</b> · ${s.done}/${s.n} done${s.over ? ` · <span style="color:var(--st-blocked)">${s.over} overdue</span>` : ''}</span></div>
      ${mine.length ? mine.map(taskRow).join('') : '<div class="empty" style="padding:22px">No tasks in this period.</div>'}
      <div class="team-foot"><button class="btn sm" data-act="task-new" data-team="${esc(team.id)}">${icon('plus')}Add task</button></div>
    </section>`;
  }).join('');
  b.innerHTML = cards ? `<div class="teams">${cards}</div>` : '<div class="card empty"><h3>No matching tasks</h3>Try another date range, or clear the filters.</div>';
}

function viewProfile(b) {
  const bin = state.bin.slice().sort((x, y) => String(y.deletedAt).localeCompare(String(x.deletedAt)));
  b.innerHTML = `<div class="card panel">
      <div class="prof-head"><div class="avatar big">${esc(initials(auth.user))}</div>
        <div><h3>${esc(auth.user)}</h3><div class="muted">${esc(CFG.DEPARTMENT)}</div></div></div>
      <div class="tact"><button class="btn" data-act="rename">${icon('edit')}Change name</button>
        <button class="btn danger" data-act="logout">${icon('logout')}Sign out</button>
        <button class="btn" data-act="app-update">${icon('refresh')}Update app</button></div>
      <div class="muted" style="font-size:12.5px;margin-top:10px">Update app downloads the newest version from GitHub. Your tasks and any unsent changes stay on this device.</div>
    </div>
    <div class="card panel" style="margin-top:14px"><h3>Deleted tasks</h3>
      <div class="att-list">${bin.length ? bin.map(t => { const tm = teamById(t.teamId); return `
        <div class="att-item" style="cursor:default;align-items:center">
          <div style="flex:1;min-width:0"><div class="t">${esc(t.title)}</div>
          <small>${esc(tm ? tm.name : '')} · deleted ${esc(fmtDT(t.deletedAt))}${t.deletedBy ? ' by ' + esc(t.deletedBy) : ''}</small></div>
          <button class="btn sm" data-act="task-restore" data-id="${esc(t.id)}">Restore</button></div>`; }).join('')
        : '<div class="muted">No deleted tasks.</div>'}</div>
    </div>`;
}

function viewTable(b) {
  const { key, dir } = state.sort;
  const list = filtered().sort((a, c) => {
    const get = t => key === 'team' ? (teamById(t.teamId) || {}).name || '' : key === 'startDate' ? taskDate(t) : key === 'responsibles' ? respOf(t) : (t[key] == null ? '' : t[key]);
    const x = get(a), y = get(c);
    if (typeof x === 'number' || typeof y === 'number') return ((Number(x) || 0) - (Number(y) || 0)) * dir;
    if (!x && y) return 1; if (x && !y) return -1;
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir;
  });
  const th = (k, label, cls) => `<th data-act="sort" data-k="${k}" class="${cls || ''} ${key === k ? 'sorted ' + (dir < 0 ? 'desc' : '') : ''}">${label}</th>`;
  b.innerHTML = `<div class="card tbl-wrap"><table><thead><tr>
    ${th('team', 'Team', 'c1')}${th('title', 'Task', 'c2')}${th('description', 'Description')}${th('responsibles', 'Responsible')}${th('daysRequired', 'Days')}${th('startDate', 'Start')}${th('endDate', 'Due')}${th('actualEnd', 'Actual end')}${th('status', 'Status')}${th('progress', 'Progress')}${th('remarks', 'Remarks')}<th>Files</th><th>Actions</th></tr></thead>
    <tbody>${list.map(t => { const tm = teamById(t.teamId); return `<tr>
      <td class="c1"><b>${esc(tm ? tm.name : '—')}</b></td>
      <td class="c2"><div class="ttitle">${esc(t.title)}</div></td><td style="min-width:200px">${esc(t.description || '—')}</td>
      <td style="min-width:150px">${esc(respOf(t) || '—')}</td><td class="mono">${t.daysRequired === '' || t.daysRequired == null ? '—' : esc(t.daysRequired)}</td>
      <td class="nowrap">${fmtDate(t.startDate)}</td>
      <td class="nowrap">${fmtDate(t.endDate)} ${isOverdue(t) ? `<span class="tag over">${icon('alert')}</span>` : ''}</td>
      <td class="nowrap">${fmtDate(t.actualEnd)}</td><td>${pill(t.status)}</td>
      <td><div style="display:flex;gap:8px;align-items:center">${progressBar(t.progress, t.status === 'Completed')}<span class="mono">${clamp100(t.progress)}%</span></div></td>
      <td style="min-width:200px">${esc(t.remarks || '—')}</td><td>${(t.attachments || []).length ? `<span class="tag">${icon('clip')}${t.attachments.length}</span>` : ''}</td><td class="nowrap">${taskBtns(t.id)}</td></tr>`; }).join('')
      || '<tr><td colspan="13"><div class="empty">No matching tasks.</div></td></tr>'}</tbody></table></div>`;
}

function viewTimeline(b) {
  const list = filtered().filter(t => t.startDate || t.endDate).sort(byStart);
  if (!list.length) { b.innerHTML = '<div class="card empty"><h3>No dated tasks</h3>Add start and due dates to see tasks here.</div>'; return; }
  const D = 864e5, toD = iso => new Date(iso + 'T00:00:00').getTime();
  const today = toD(todayISO());
  let min = today, max = today;
  list.forEach(t => { min = Math.min(min, toD(t.startDate || t.endDate)); max = Math.max(max, toD(t.endDate || t.startDate)); });
  min -= D; max += 2 * D;
  const N = Math.round((max - min) / D) + 1;
  const days = Array.from({ length: N }, (_, i) => new Date(min + i * D));
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const todayPct = ((today - min) / D + 0.5) / N * 100;
  const groups = allTeams().map(tm => ({ tm, ts: list.filter(t => String(t.teamId) === String(tm.id)) })).filter(g => g.ts.length);
  b.innerHTML = `<div class="card tl-scroll"><div class="tl" style="--n:${N}">
    <div class="tl-row tl-head"><div class="tl-label">Team · Task</div><div class="tl-track">
      ${days.map((d, i) => `<div class="tl-day">${d.getDate() === 1 || i === 0 ? `<em>${MN[d.getMonth()]}</em>` : '<em>&nbsp;</em>'}${d.getDate()}</div>`).join('')}</div></div>
    ${groups.map(g => `<div class="tl-group"><span class="tl-gt">${esc(g.tm.name)}${g.tm.lead ? ' · ' + esc(g.tm.lead) : ''}</span></div>` + g.ts.map(t => {
      const s = toD(t.startDate || t.endDate), e = toD(t.endDate || t.startDate);
      const left = (s - min) / D / N * 100, width = ((e - s) / D + 1) / N * 100;
      return `<div class="tl-row"><div class="tl-label"><b data-act="task-open" data-id="${esc(t.id)}">${esc(t.title)}</b><small title="${esc(g.tm.name + ' · ' + respOf(t))}"><span class="tl-tm">${esc(g.tm.name)}</span> · ${esc(respOf(t))} · ${clamp100(t.progress)}%</small></div>
        <div class="tl-track"><div class="tl-today" style="left:${todayPct}%"></div>
        <div class="tl-bar st-${slug(t.status)} ${isOverdue(t) ? 'over' : ''}" style="left:${left}%;width:${width}%" data-act="task-open" data-id="${esc(t.id)}" title="${esc(t.title)} · ${fmtDate(t.startDate)} → ${fmtDate(t.endDate)}"><i style="width:${clamp100(t.progress)}%"></i></div></div></div>`;
    }).join('')).join('')}
  </div></div>
  <p class="muted" style="margin-top:10px">Orange line = today. Bar fill = progress. Red glow = overdue.</p>`;
}

/* =============================== attachments: preview / download =============================== */
const blobCache = new Map();
const isImg = a => /^image\//.test(a.mime || '');

/** Fetches a file (or its thumbnail) through the Apps Script backend and returns a blob URL. */
function fetchFileBlob(a, thumb) {
  if (a.url && String(a.url).startsWith('data:')) return Promise.resolve({ url: a.url, mime: a.mime });   // demo mode
  const key = (thumb ? 't:' : 'f:') + a.id;
  if (blobCache.has(key)) return blobCache.get(key);
  const p = (async () => {
    const r = await fetch(`${CFG.API_URL}?action=${thumb ? 'thumb' : 'file'}&id=${encodeURIComponent(a.id)}&pw=${encodeURIComponent(auth.pw)}`);
    const d = await r.json();
    if (!d.ok || !d.base64) throw new Error(d.error || 'File not available');
    const bin = atob(d.base64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return { url: URL.createObjectURL(new Blob([arr], { type: d.mime || a.mime || 'application/octet-stream' })), mime: d.mime || a.mime };
  })();
  blobCache.set(key, p);
  p.catch(() => blobCache.delete(key));
  return p;
}

async function previewAttachment(a) {
  if (!$('#lightbox-root').children.length) pushLayer();
  pvCurrent = a;
  $('#lightbox-root').innerHTML = `<div class="pv" data-act="pv-bg"><div class="pv-box">
    <header><b>${esc(a.name)}</b><span class="sp"></span>
      <button class="btn sm" data-act="pv-newtab">Open in new tab</button>
      <button class="btn sm primary" data-act="pv-dl">${icon('download')}Download</button>
      <button class="icon-btn" data-act="lb-close" aria-label="Close">${icon('x')}</button></header>
    <div class="pv-body" id="pv-body"><div class="empty">Loading…</div></div></div></div>`;
  try {
    const f = await fetchFileBlob(a);
    const body = $('#pv-body'); if (pvCurrent !== a || !body) return;
    const mime = f.mime || a.mime || '';
    if (/^image\//.test(mime)) body.innerHTML = `<img src="${esc(f.url)}" alt="${esc(a.name)}">`;
    else if (mime === 'application/pdf' || /^text\//.test(mime)) body.innerHTML = `<iframe src="${esc(f.url)}" title="${esc(a.name)}"></iframe>`;
    else body.innerHTML = `<div class="empty"><h3>No preview for this file type</h3><p>${esc(a.name)} can't be shown in the browser.<br>Use <b>Download</b> to open it on your device.</p></div>`;
  } catch (e) {
    const body = $('#pv-body'); if (body) body.innerHTML = `<div class="empty"><h3>Could not load the file</h3><p>${esc(e.message)}</p></div>`;
  }
}

async function downloadAttachment(a) {
  try {
    toast('Preparing download…');
    const f = await fetchFileBlob(a);
    const l = document.createElement('a'); l.href = f.url; l.download = a.name || 'file';
    document.body.appendChild(l); l.click(); l.remove();
  } catch (e) { toast(e.message, 'err'); }
}

async function openInNewTab(a) {
  try { const f = await fetchFileBlob(a); window.open(f.url, '_blank', 'noopener'); } catch (e) { toast(e.message, 'err'); }
}

/** Loads thumbnails for tiles after the drawer renders. */
function hydrate() {
  $$('#drawer-root img[data-tid]').forEach(img => {
    if (img.dataset.done) return; img.dataset.done = '1';
    fetchFileBlob({ id: img.dataset.tid }, true).then(f => { img.src = f.url; }).catch(() => img.remove());
  });
}

function attTile(a, i, scope, editable, uidAttr) {
  const hasThumb = isImg(a) || (!DEMO && a.mime === 'application/pdf');
  let img = '';
  if (hasThumb) img = DEMO && a.url ? (isImg(a) ? `<img alt="" src="${esc(a.url)}">` : '') : `<img alt="" data-tid="${esc(a.id)}">`;
  const common = `data-scope="${scope}" data-i="${i}" ${uidAttr ? `data-uid="${esc(uidAttr)}"` : ''}`;
  return `<div class="att" data-act="att-open" ${common} title="${esc(a.name)}">
    <div class="th">${icon('file')}${img}</div><div class="nm">${esc(a.name)}</div>
    <button class="dl" data-act="att-dl" ${common} title="Download">${icon('download')}</button>
    ${editable ? `<button class="rm" data-act="att-rm" ${common} title="Remove">${icon('x')}</button>` : ''}</div>`;
}
function attGrid(list, editable, scope) {
  if (!list.length) return `<div class="noatt">No files attached yet.</div>`;
  return `<div class="atts">${list.map((a, i) => attTile(a, i, scope, editable)).join('')}</div>`;
}
const uploadButtons = scope => `<div class="upl">
  <button class="btn sm" type="button" data-act="pick-file" data-scope="${scope}">${icon('clip')}Attach file / drawing</button>
  <button class="btn sm" type="button" data-act="pick-cam" data-scope="${scope}">${icon('camera')}Take photo</button>
  <input type="file" id="in-${scope}-file" data-scope="${scope}" multiple hidden accept="image/*,.pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip">
  <input type="file" id="in-${scope}-cam" data-scope="${scope}" hidden accept="image/*" capture="environment"></div>`;

const scopeList = scope => scope === 'upd' ? updDraft.attachments : draft.task.attachments;
function findAtt(d) {
  if (d.scope === 'log') { const u = state.updates.find(x => x.id === d.uid); return u && u.attachments[Number(d.i)]; }
  return draft && scopeList(d.scope)[Number(d.i)];
}
function refreshAtts(scope) {
  const el = $(scope === 'upd' ? '#upd-atts' : '#task-atts'); if (!el) return;
  el.innerHTML = attGrid(scopeList(scope), true, scope);
}

function readAsBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
}
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = DEMO ? 1000 : 1800, k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch (e) { return file; }
}

async function handleFiles(input) {
  const scope = input.dataset.scope, files = Array.from(input.files); input.value = '';
  for (let f of files) {
    if (!draft) return;
    if (f.size > MAX_FILE) { toast(`${f.name} is larger than 12 MB`, 'err'); continue; }
    if (!DEMO && isOffline()) { toast('You are offline — files can only be attached while online.', 'err'); return; }
    toast('Uploading ' + f.name + '…');
    try {
      f = await shrinkImage(f);
      const base64 = await readAsBase64(f);
      const res = await request('uploadFile', { name: f.name, mime: f.type || 'application/octet-stream', base64, taskId: draft ? draft.task.id : '' });
      if (!draft) return;
      const att = res.file;
      if (!DEMO) {   // instant preview/download of what was just uploaded
        const entry = Promise.resolve({ url: URL.createObjectURL(f), mime: f.type || att.mime });
        blobCache.set('f:' + att.id, entry);
        if (isImg(att)) blobCache.set('t:' + att.id, entry);
      }
      scopeList(scope).push(att);
      if (scope === 'task') draft.dirty = true;
      refreshAtts(scope);
      toast(scope === 'task' ? `Attached ${f.name} — click Save task to keep it` : `Attached ${f.name}`, 'ok');
    } catch (e) { toast(e.message, 'err'); }
  }
}

/* =============================== task drawer =============================== */
function blankTask(teamId) {
  return { id: uid('T-'), teamId: teamId || (state.teams[0] && state.teams[0].id) || COMBINED_ID, title: '', description: '', drawing: '', responsibles: '',
    daysRequired: '', startDate: '', endDate: '', actualEnd: '', status: 'In Planning', progress: 0, priority: 'Normal', remarks: '', attachments: [] };
}
function openTask(id, teamId, mode, reuse) {
  if (!reuse && !$('#drawer-root').children.length) pushLayer();
  const ex = id && taskById(id);
  draft = { isNew: !ex, dirty: false, mode: ex && mode === 'update' ? 'update' : 'view', task: ex ? clone(ex) : blankTask(teamId) };
  updDraft = { attachments: [] };
  $('#drawer-root').innerHTML = drawerHTML();
  if (!ex) { const t = $('#f-title'); if (t) t.focus(); }
}
function drawerHasChanges() {
  if (!draft) return false;
  const note = (($('#u-note') || {}).value || '').trim();
  const e = updDraft && updDraft.editId && state.updates.find(u => u.id === updDraft.editId);
  if (e) return draft.dirty || note !== String(e.note || '').trim() || updDraft.attachments.length !== (e.attachments || []).length;
  return draft.dirty || !!note || !!(updDraft && updDraft.attachments.length);
}
function closeDrawer(force) {
  if (!force && drawerHasChanges() && !confirm('You have unsaved changes. Close anyway?')) return;
  const had = $('#drawer-root').children.length; $('#drawer-root').innerHTML = ''; draft = null; updDraft = null; if (had) popLayer();
}

function chipBtn(name, on, isAll) {
  return `<span class="chip ${on ? 'on' : ''} ${isAll ? 'all' : ''}" data-act="chip" data-name="${esc(name)}" ${isAll ? 'data-all="1"' : ''}>${esc(name)}</span>`;
}
function respChips(teamId, currentStr) {
  const cur = String(currentStr || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const on = n => cur.includes(n.toLowerCase());
  const names = teamNames(teamId), allOn = !!names.length && names.every(on);
  const allChip = chipBtn('All members', allOn, true);     // fills the box with every member's name
  if (String(teamId) === COMBINED_ID) {
    return `<div class="chip-group"><div class="chips">${allChip}</div></div>` +
      state.teams.filter(t => members(t).length).map(t =>
        `<div class="chip-group"><small>${esc(t.name)}</small><div class="chips">${members(t).map(m => chipBtn(m, on(m))).join('')}</div></div>`).join('');
  }
  return allChip + members(teamById(teamId)).map(m => chipBtn(m, on(m))).join('');
}
const opt = (list, v) => list.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');

function activityList(taskId) {
  const list = updatesFor(taskId);
  if (!list.length) return '<div class="muted">No updates posted yet.</div>';
  return '<h4 class="prev-h">Previous updates</h4>' + list.map((u, i) => `<div class="act"><div class="avatar">${esc(initials(u.user))}</div><div style="min-width:0;flex:1">
    <div class="hd"><b>${fmtDate(uDate(u))}</b><span class="muted">by ${esc(u.user || 'Unknown')}</span>${pill(u.status)}<span class="tag">${clamp100(u.progress)}%</span>${i === 0 ? `<button type="button" class="btn sm" style="margin-left:auto" data-act="upd-edit" data-id="${esc(u.id)}">${icon('edit')}Edit last update</button>` : ''}</div>
    ${u.note ? `<p>${esc(u.note)}</p>` : ''}
    ${(u.attachments || []).length ? `<div class="atts" style="margin-top:8px">${u.attachments.map((a, i) => attTile(a, i, 'log', false, u.id)).join('')}</div>` : ''}
    </div></div>`).join('') + '<div class="muted" style="font-size:12.5px;margin-top:8px">Showing updates from the last 30 days.</div>';
}

function trendHTML(taskId) {
  const ups = updatesFor(taskId).slice().reverse();
  if (ups.length < 2) return '';
  const W = 600, H = 150, L = 34, R = 14, T = 12, B = 26;
  const ds = ups.map(u => new Date(uDate(u) + 'T00:00:00').getTime());
  const d0 = Math.min(...ds), d1 = Math.max(...ds);
  const x = i => d1 === d0 ? L + (W - L - R) * i / (ups.length - 1) : L + (W - L - R) * (ds[i] - d0) / (d1 - d0);
  const y = p => T + (H - T - B) * (1 - clamp100(p) / 100);
  const pts = ups.map((u, i) => `${x(i).toFixed(1)},${y(u.progress).toFixed(1)}`).join(' ');
  const short = u => { const [, m, d] = uDate(u).split('-'); return `${d}/${m}`; };
  return `<div class="trend-wrap"><h4>Progress trend</h4>
    <svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress by date">
      ${[0, 50, 100].map(p => `<line class="g" x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}"/><text x="${L - 6}" y="${y(p) + 4}" text-anchor="end">${p}</text>`).join('')}
      <polyline class="ln" points="${pts}"/>
      ${ups.map((u, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(u.progress).toFixed(1)}" r="4"><title>${fmtDate(uDate(u))}: ${clamp100(u.progress)}%</title></circle>`).join('')}
      <text x="${L}" y="${H - 6}" text-anchor="start">${short(ups[0])}</text>
      <text x="${W - R}" y="${H - 6}" text-anchor="end">${short(ups[ups.length - 1])}</text>
    </svg></div>`;
}

function progressControl(prefix, value) {
  return `<div class="prog"><input id="${prefix}-progress" type="range" min="0" max="100" step="5" value="${clamp100(value)}" aria-label="Progress slider">
    <span class="pn"><input id="${prefix}-progress-n" type="number" min="0" max="100" step="1" inputmode="numeric" value="${clamp100(value)}" aria-label="Progress percent">%</span></div>`;
}

function updateBodyHTML(t) {
  const e = updDraft.editId && state.updates.find(u => u.id === updDraft.editId);
  const v = e ? { date: uDate(e), status: e.status, progress: e.progress, note: e.note || '' } : { date: todayISO(), status: t.status, progress: t.progress, note: '' };
  return `<div class="sec"><h3>Task</h3><div class="ttitle">${esc(t.title)}</div>${t.description ? `<div class="tdesc">${esc(t.description)}</div>` : ''}</div>
  <div class="sec"><h3>${e ? 'Edit last update' : 'Add new update'}</h3>
    <div class="postbox" id="postbox">
      ${e ? `<div class="muted">Editing the update by <b>${esc(e.user || 'Unknown')}</b> from ${fmtDate(uDate(e))}</div>` : ''}
      <div class="grid2"><label class="fld">Update date<input id="u-date" type="date" value="${esc(v.date)}" max="${todayISO()}"></label>
        <label class="fld">Status<select id="u-status">${opt(STATUSES, v.status)}</select></label></div>
      <div class="fld">Progress (slider or type a number)${progressControl('u', v.progress)}</div>
      <label class="fld">Note<textarea id="u-note" rows="3" placeholder="What was done today? Any problem or material needed?">${esc(v.note)}</textarea></label>
      <div id="upd-atts">${updDraft.attachments.length ? attGrid(updDraft.attachments, true, 'upd') : ''}</div>${uploadButtons('upd')}
      <div class="tact"><button class="btn primary" data-act="post-update">${e ? 'Save changes' : 'Post update'}</button>${e ? '<button class="btn" data-act="upd-cancel">Cancel edit</button>' : ''}</div></div>
    <div id="trend">${trendHTML(t.id)}</div>
    <div id="act-list">${activityList(t.id)}</div></div>`;
}

function drawerHTML() {
  const t = draft.task, resp = expandResp(t.responsibles, t.teamId), upd = draft.mode === 'update';
  return `<div class="backdrop" data-act="close-drawer"></div>
  <aside class="drawer" role="dialog" aria-label="Task details">
    <header class="dr-head"><div><small>${draft.isNew ? 'NEW TASK' : (upd ? 'UPDATE TASK · ' : 'TASK · ') + esc(t.id)}</small><h2 id="dr-title">${esc(t.title || 'Untitled task')}</h2></div>
      <button class="icon-btn" data-act="close-drawer" aria-label="Close">${icon('x')}</button></header>
    <div class="dr-body" id="dr-body">
      ${upd ? updateBodyHTML(t) : `<div class="sec" id="sec-details"><h3>Details</h3><div class="grid2">
        <label class="fld span2">Task title *<input id="f-title" value="${esc(t.title)}"></label>
        <label class="fld">Team<select id="f-team">${allTeams().map(x => `<option value="${esc(x.id)}" ${String(x.id) === String(t.teamId) ? 'selected' : ''}>${esc(x.virtual ? 'Combined (people from all teams)' : x.name)}</option>`).join('')}</select></label>
        <label class="fld">Priority<select id="f-priority">${opt(PRIORITIES, t.priority)}</select></label>
        <label class="fld span2">Task description<textarea id="f-desc" rows="2">${esc(t.description)}</textarea></label>
        <label class="fld">Drawing / reference no.<input id="f-drawing" value="${esc(t.drawing)}"></label>
        <label class="fld">Responsible<input id="f-resp" value="${esc(resp)}" placeholder="Tap names below, or type"></label>
        <div class="chips span2" id="resp-chips">${respChips(t.teamId, resp)}</div>
        <label class="fld">Days required<input id="f-days" type="number" min="0" step="0.5" value="${esc(t.daysRequired)}"></label>
        <label class="fld">Status<select id="f-status">${opt(STATUSES, t.status)}</select></label>
        <label class="fld">Start date<input id="f-start" type="date" value="${esc(t.startDate)}"></label>
        <label class="fld">Due date<input id="f-end" type="date" value="${esc(t.endDate)}"></label>
        <label class="fld">Actual end date<input id="f-actual" type="date" value="${esc(t.actualEnd)}"></label>
        <div class="fld">Progress (slider or type a number)${progressControl('f', t.progress)}</div>
        <label class="fld span2">Remarks<textarea id="f-remarks" rows="2">${esc(t.remarks)}</textarea></label>
      </div></div>
      <div class="sec"><h3>Drawings &amp; attachments</h3><div id="task-atts">${attGrid(t.attachments, true, 'task')}</div>${uploadButtons('task')}
        <div class="muted" style="margin-top:8px;font-size:12px">Click a file to preview it. Use the arrow on the file to download. Press <b>Save task</b> after attaching.</div></div>
      `}
    </div>
    <footer class="dr-foot">${upd ? '<span class="sp"></span><button class="btn" data-act="close-drawer">Close</button>' : `${draft.isNew ? '' : `<button class="btn danger" data-act="task-delete">${icon('trash')}Delete</button>`}<span class="sp"></span>
      <button class="btn" data-act="close-drawer">Close</button><button class="btn primary" data-act="task-save">Save task</button>`}</footer>
  </aside>`;
}

function readTaskForm() {
  const t = draft.task;
  return Object.assign({}, t, {
    title: $('#f-title').value.trim(), teamId: $('#f-team').value, priority: $('#f-priority').value,
    description: $('#f-desc').value.trim(), drawing: $('#f-drawing').value.trim(), responsibles: $('#f-resp').value.trim(),
    daysRequired: $('#f-days').value === '' ? '' : Number($('#f-days').value), status: $('#f-status').value,
    startDate: $('#f-start').value, endDate: $('#f-end').value, actualEnd: $('#f-actual').value,
    progress: clamp100($('#f-progress').value), remarks: $('#f-remarks').value.trim()
  });
}

async function saveTask(btn) {
  const t = readTaskForm();
  if (!t.title) { toast('Please enter a task title', 'err'); $('#f-title').focus(); return; }
  if (t.startDate && t.endDate && t.endDate < t.startDate) { toast('Due date is before the start date', 'err'); return; }
  btn.disabled = true;
  try {
    const res = await request('saveTask', t);
    const i = state.tasks.findIndex(x => x.id === res.task.id);
    const saved = Object.assign({}, res.task, { status: normStatus(res.task.status), attachments: Array.isArray(res.task.attachments) ? res.task.attachments : [] });
    if (i >= 0) state.tasks[i] = saved; else state.tasks.push(saved);
    const wasNew = draft.isNew;
    draft.task = clone(saved); draft.dirty = false; draft.isNew = false;
    if (wasNew) {          // reveal the updates section, keep the panel open
      const y = ($('#dr-body') || {}).scrollTop || 0;
      $('#drawer-root').innerHTML = drawerHTML();
      const b = $('#dr-body'); if (b) b.scrollTop = y;
    } else {
      $('#dr-title').textContent = saved.title;
      $('#f-status').value = saved.status; $('#f-progress').value = saved.progress; $('#f-progress-n').value = saved.progress;
      $('#f-actual').value = saved.actualEnd || '';
    }
    renderView(true); toast(res.queued ? 'Saved on this device — will sync when online' : 'Saved', 'ok');
  } catch (e) { toast(e.message, 'err'); }
  btn.disabled = false;
}

async function deleteTask() {
  if (!confirm('Delete this task? You can restore it later from the Profile tab.')) return;
  try {
    const res = await request('deleteTask', { id: draft.task.id });
    const gone = state.tasks.find(t => t.id === draft.task.id);
    state.tasks = state.tasks.filter(t => t.id !== draft.task.id);
    if (gone) state.bin.push(Object.assign({}, gone, { deletedAt: new Date().toISOString(), deletedBy: auth.user }));
    
    closeDrawer(true); renderView(true); toast(res.queued ? 'Deleted on this device — will sync when online' : 'Task deleted');
  } catch (e) { toast(e.message, 'err'); }
}

function rerenderDrawer(keepScroll) {
  const y = ($('#dr-body') || {}).scrollTop || 0;
  $('#drawer-root').innerHTML = drawerHTML();
  const b = $('#dr-body'); if (b && keepScroll) b.scrollTop = y;
}
function startEditUpdate(id) {
  const u = state.updates.find(x => x.id === id); if (!u) return;
  updDraft = { attachments: clone(u.attachments || []), editId: id };
  rerenderDrawer(false);
  const pb = $('#postbox'); if (pb && pb.scrollIntoView) pb.scrollIntoView({ block: 'center' });
}
function stopEditUpdate() { updDraft = { attachments: [] }; rerenderDrawer(false); }

async function postUpdate(btn) {
  const note = $('#u-note').value.trim(), status = $('#u-status').value, progress = clamp100($('#u-progress').value), date = $('#u-date').value || todayISO();
  const t = draft.task, editing = updDraft.editId;
  if (!editing && !note && !updDraft.attachments.length && status === t.status && progress === clamp100(t.progress)) { toast('Write a note, attach a photo, or change progress', 'err'); return; }
  btn.disabled = true;
  try {
    const res = editing
      ? await request('editUpdate', { id: editing, date, note, status, progress, attachments: updDraft.attachments })
      : await request('addUpdate', { id: uid('U'), taskId: t.id, date, note, status, progress, attachments: updDraft.attachments });
    const u = Object.assign({}, res.update, { status: normStatus(res.update.status), attachments: res.update.attachments || [] });
    const ui = state.updates.findIndex(x => x.id === u.id);
    if (ui >= 0) state.updates[ui] = u; else state.updates.push(u);
    if (res.task) {
      const saved = Object.assign({}, res.task, { status: normStatus(res.task.status), attachments: Array.isArray(res.task.attachments) ? res.task.attachments : [] });
      const i = state.tasks.findIndex(x => x.id === t.id); if (i >= 0) state.tasks[i] = saved;
      draft.task = clone(saved);
    }
    updDraft = { attachments: [] };
    rerenderDrawer(true);
    renderView(true);
    toast(res.queued ? 'Saved on this device — will sync when online' : editing ? 'Update changed' : 'Update posted', 'ok');
  } catch (e) { toast(e.message, 'err'); }
  btn.disabled = false;
}

/* =============================== team modal =============================== */
function openModal(html, wide) {
  if (!$('#modal-root').children.length) pushLayer();
  $('#modal-root').innerHTML = `<div class="modal-wrap" data-act="modal-bg"><div class="modal ${wide ? 'wide' : ''}" role="dialog">${html}</div></div>`;
}
function closeModal() { if ($('#modal-root').children.length) { $('#modal-root').innerHTML = ''; popLayer(); } }

function openTeam(id) {
  const t = id ? teamById(id) : { id: '', name: '', supervisor: '', lead: '', members: '', order: state.teams.length + 1 };
  openModal(`<header><h2>${id ? 'Edit team' : 'Add team'}</h2><button class="icon-btn" data-act="modal-close">${icon('x')}</button></header>
    <div class="mb" data-team-id="${esc(t.id)}" data-order="${esc(t.order)}">
      <label class="fld">Team name *<input id="m-name" value="${esc(t.name)}" placeholder="Team G"></label>
      <div class="grid2"><label class="fld">Supervisor<input id="m-sup" value="${esc(t.supervisor)}"></label>
      <label class="fld">Team lead<input id="m-lead" value="${esc(t.lead)}"></label></div>
      <label class="fld">Team members (one per line)<textarea id="m-mem" rows="6">${esc(t.members)}</textarea></label></div>
    <footer>${id ? `<button class="btn danger" data-act="team-delete" data-id="${esc(id)}" style="margin-right:auto">${icon('trash')}Delete</button>` : ''}
      <button class="btn" data-act="modal-close">Cancel</button><button class="btn primary" data-act="team-save">Save team</button></footer>`);
  $('#m-name').focus();
}
async function saveTeam(btn) {
  const mb = $('#modal-root .mb'), name = $('#m-name').value.trim();
  if (!name) { toast('Team name is required', 'err'); return; }
  const team = { id: mb.dataset.teamId || uid('G'), name, supervisor: $('#m-sup').value.trim(), lead: $('#m-lead').value.trim(),
    members: $('#m-mem').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean).join('\n'), order: Number(mb.dataset.order) || state.teams.length + 1 };
  btn.disabled = true;
  try {
    const res = await request('saveTeam', team);
    const i = state.teams.findIndex(x => String(x.id) === String(team.id));
    if (i >= 0) state.teams[i] = res.team; else state.teams.push(res.team);
    state.teams.sort((a, b) => (a.order || 0) - (b.order || 0));
    closeModal(); renderView(true); toast(res.queued ? 'Team saved on this device — will sync when online' : 'Team saved', 'ok');
  } catch (e) { toast(e.message, 'err'); btn.disabled = false; }
}
async function deleteTeam(id) {
  if (!confirm('Delete this team?')) return;
  try { const res = await request('deleteTeam', { id }); state.teams = state.teams.filter(t => String(t.id) !== String(id)); closeModal(); renderView(true); toast(res.queued ? 'Deleted on this device — will sync when online' : 'Team deleted'); }
  catch (e) { toast(e.message, 'err'); }
}

/* =============================== report / export / seed =============================== */
function buildReport() {
  const d = new Date(), s = stats(rangeTasks());
  const L = [`*${CFG.DEPARTMENT} — Daily Report*`, `Date: ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, `Tasks starting: ${rangeShort()}`,
    `Overall: ${s.avg}% · ${s.done}/${s.n} tasks done${s.over ? ' · ' + s.over + ' overdue' : ''}`, ''];
  teamsWithWork().forEach(tm => {
    const ts = tasksOf(tm.id); if (!ts.length) return;
    L.push(`*${tm.name}*${tm.lead ? ` (Lead: ${tm.lead})` : ''}`);
    ts.forEach((t, i) => {
      const bits = [`${t.status} ${clamp100(t.progress)}%`];
      if (t.endDate) bits.push('due ' + fmtDate(t.endDate) + (isOverdue(t) ? ' ⚠ OVERDUE' : ''));
      const last = updatesFor(t.id)[0];
      if (last && last.note) bits.push('Latest: ' + last.note);
      else if (t.remarks) bits.push(t.remarks);
      L.push(`${i + 1}. ${t.title} — ${bits.join(' | ')}`);
    });
    L.push('');
  });
  return L.join('\n').trim();
}
function openReport() {
  openModal(`<header><h2>Daily report</h2><button class="icon-btn" data-act="modal-close">${icon('x')}</button></header>
    <div class="mb"><textarea id="rep" class="report" rows="16" readonly>${esc(buildReport())}</textarea></div>
    <footer><button class="btn" data-act="modal-close">Close</button><button class="btn primary" data-act="copy-report">${icon('copy')}Copy for WhatsApp</button></footer>`, true);
}

function pickRows(q) {
  q = String(q || '').trim().toLowerCase();
  const list = state.tasks.filter(t => {
    if (!q) return true;
    const tm = teamById(t.teamId);
    return [t.title, t.description, respOf(t), tm && tm.name].join(' ').toLowerCase().includes(q);
  }).sort((x, y) => ((x.status === 'Completed') - (y.status === 'Completed')) || byStart(x, y));
  return list.length ? list.map(t => { const tm = teamById(t.teamId); return `
    <div class="att-item pk-item" data-act="upd-pick-go" data-id="${esc(t.id)}">
      <div style="flex:1;min-width:0"><div class="t">${esc(t.title)}</div>
      <small>${esc(tm ? tm.name : '')} · ${clamp100(t.progress)}%${t.endDate ? ' · due ' + fmtDate(t.endDate) : ''}</small></div>${pill(t.status)}</div>`; }).join('')
    : '<div class="muted">No tasks found.</div>';
}
function openUpdatePicker() {
  openModal(`<header><h2>Update a task</h2><button class="icon-btn" data-act="modal-close">${icon('x')}</button></header>
    <div class="mb"><div class="pk-search">${icon('search')}<input id="pk-q" placeholder="Search task or team…" autocomplete="off"></div>
    <div class="pk-list" id="pk-list">${pickRows('')}</div></div>`, true);
}

function exportCSV() {
  const cols = ['Team', 'Task', 'Description', 'Drawing', 'Responsible', 'Days', 'Start', 'Due', 'Actual end', 'Status', 'Progress %', 'Priority', 'Remarks', 'Files'];
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = filtered().map(t => { const tm = teamById(t.teamId); return [tm ? tm.name : '', t.title, t.description, t.drawing, respOf(t), t.daysRequired,
    fmtDate(t.startDate), fmtDate(t.endDate), fmtDate(t.actualEnd), t.status, t.progress, t.priority, t.remarks, (t.attachments || []).map(a => a.name).join('; ')].map(q).join(','); });
  const blob = new Blob(['﻿' + [cols.map(q).join(',')].concat(rows).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `maintenance-tasks-${todayISO()}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function seedData() {
  if (!confirm('Load the starter teams and tasks from your task list into the sheet?')) return;
  try {
    await request('bulkImport', { teams: window.SEED.teams, tasks: window.SEED.tasks });
    await load(true); renderView(); toast('Starter data loaded', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

/* =============================== form behaviour =============================== */
function applyTaskAutoRules(src) {
  const v = id => $(id);
  const setProg = n => { v('#f-progress').value = n; v('#f-progress-n').value = n; };
  if (src === 'progress') {
    const p = clamp100(v('#f-progress').value);
    if (p === 100 && v('#f-status').value !== 'Completed') { v('#f-status').value = 'Completed'; if (!v('#f-actual').value) v('#f-actual').value = todayISO(); }
    else if (p > 0 && p < 100 && v('#f-status').value === 'In Planning') v('#f-status').value = 'In Progress';
  } else if (src === 'status') {
    const s = v('#f-status').value;
    if (s === 'Completed') { setProg(100); if (!v('#f-actual').value) v('#f-actual').value = todayISO(); }
    else if (s === 'In Planning') setProg(0);
  } else if (src === 'days' || src === 'start') {
    const days = Number(v('#f-days').value), st = v('#f-start').value;
    if (days > 0 && st) v('#f-end').value = addDays(st, Math.max(0, Math.ceil(days) - 1));
  }
}

/** Keeps slider and number box in sync. prefix: 'f' (task) or 'u' (update). */
function syncProgress(prefix, from) {
  const r = $('#' + prefix + '-progress'), n = $('#' + prefix + '-progress-n'); if (!r || !n) return;
  const raw = from === 'n' ? n.value : r.value;
  if (raw === '' && from === 'n') return;
  const v = clamp100(raw);
  r.value = v; if (from === 'r') n.value = v;
  if (prefix === 'f') applyTaskAutoRules('progress');
  else {
    const st = $('#u-status');
    if (v === 100) st.value = 'Completed';
    else if (v > 0 && st.value === 'In Planning') st.value = 'In Progress';
  }
}

document.addEventListener('input', e => {
  const id = e.target.id;
  if (draft && e.target.closest('#sec-details')) draft.dirty = true;
  if (id === 'flt-q') { state.filters.q = e.target.value; clearTimeout(qT); qT = setTimeout(renderBody, 160); }
  else if (id === 'pk-q') { const l = $('#pk-list'); if (l) l.innerHTML = pickRows(e.target.value); }
  else if (id === 'f-progress') syncProgress('f', 'r');
  else if (id === 'f-progress-n') syncProgress('f', 'n');
  else if (id === 'u-progress') syncProgress('u', 'r');
  else if (id === 'u-progress-n') syncProgress('u', 'n');
  else if (id === 'f-title') $('#dr-title').textContent = e.target.value || 'Untitled task';
  else if (id === 'f-days') applyTaskAutoRules('days');
});

document.addEventListener('change', e => {
  const id = e.target.id;
  if (draft && e.target.closest('#sec-details')) draft.dirty = true;
  if (id === 'flt-team') { state.filters.team = e.target.value; renderBody(); }
  else if (id === 'flt-status') { state.filters.status = e.target.value; renderBody(); }
  else if (id === 'flt-over') { state.filters.overdue = e.target.checked; renderBody(); }
  else if (id === 'rng-ym') { state.rangeOpen = false; setRange(e.target.value ? { preset: 'ym', ym: e.target.value } : { preset: 'month' }); }
  else if (id === 'rng-from' || id === 'rng-to') setRange({ preset: 'custom', from: $('#rng-from').value, to: $('#rng-to').value });
  else if (id === 'f-status') applyTaskAutoRules('status');
  else if (id === 'f-start') applyTaskAutoRules('start');
  else if (id === 'f-team') { const c = $('#resp-chips'), r = $('#f-resp'); if (c) { r.value = expandResp(r.value, e.target.value); c.innerHTML = respChips(e.target.value, r.value); } }
  else if (id === 'f-progress-n' || id === 'u-progress-n') { e.target.value = clamp100(e.target.value); syncProgress(id[0], 'n'); }
  else if (id === 'u-status') { const s = e.target.value; if (s === 'Completed') { $('#u-progress').value = 100; $('#u-progress-n').value = 100; } else if (s === 'In Planning') { $('#u-progress').value = 0; $('#u-progress-n').value = 0; } }
  else if (e.target.type === 'file' && e.target.dataset.scope) handleFiles(e.target);
});

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, d = el.dataset;
  switch (act) {
    case 'nav': setView(d.v); break;
    case 'theme': { const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('mmt_theme', n); } catch (x) {} break; }
    case 'logout': switchUser(); break;
    case 'rename': { const n = prompt('Your name (shown on updates you post):', auth.user); if (n && n.trim()) { auth.user = n.trim(); try { localStorage.setItem('mmt_user', auth.user); } catch (x) {} $('#who-name').textContent = auth.user; $('#who-av').textContent = initials(auth.user); registerVisit(); if (state.view === 'profile') renderView(true); } break; }
    case 'refresh': el.disabled = true; if (await load(false)) { renderView(true); toast('Reloaded', 'ok'); } el.disabled = false; break;
    case 'clear-filters': state.filters = { q: '', team: '', status: '', overdue: false }; renderView(); break;
    case 'range': { const was = state.range; state.rangeOpen = d.p === 'custom'; setRange(d.p === 'custom' ? (was.preset === 'custom' ? was : Object.assign({ preset: 'custom' }, computeRange(was))) : { preset: d.p }); break; }
    case 'range-toggle': state.rangeOpen = !state.rangeOpen; renderView(true); break;
    case 'sort': state.sort = { key: d.k, dir: state.sort.key === d.k ? -state.sort.dir : 1 }; renderBody(); break;
    case 'open-team': state.filters.team = String(d.id); setView('teams'); window.scrollTo(0, 0); break;
    case 'task-open': openTask(d.id, undefined, 'view'); break;
    case 'task-update': openTask(d.id, undefined, 'update'); break;
    case 'upd-edit': startEditUpdate(d.id); break;
    case 'upd-cancel': stopEditUpdate(); break;
    case 'task-new': openTask(null, d.team); break;
    case 'close-drawer': closeDrawer(); break;
    case 'task-save': saveTask(el); break;
    case 'task-delete': deleteTask(); break;
    case 'post-update': postUpdate(el); break;
    case 'chip': {
      const inp = $('#f-resp'), tid = $('#f-team').value;
      let list = expandResp(inp.value, tid).split(',').map(x => x.trim()).filter(Boolean);   // a typed "All" becomes real names first
      const idx = n => list.findIndex(x => x.toLowerCase() === n.toLowerCase());
      if (d.all) {                                   // "All members": put every member's name in the box (tap again to clear them)
        const names = teamNames(tid), every = names.length && names.every(n => idx(n) >= 0);
        if (every) list = list.filter(x => !names.some(n => n.toLowerCase() === x.toLowerCase()));
        else names.forEach(n => { if (idx(n) < 0) list.push(n); });
      } else { const i = idx(d.name); if (i >= 0) list.splice(i, 1); else list.push(d.name); }
      inp.value = list.join(', '); draft.dirty = true;
      $('#resp-chips').innerHTML = respChips(tid, inp.value); break;
    }
    case 'pick-file': $('#in-' + d.scope + '-file').click(); break;
    case 'pick-cam': $('#in-' + d.scope + '-cam').click(); break;
    case 'att-rm': if (draft) { scopeList(d.scope).splice(Number(d.i), 1); if (d.scope === 'task') draft.dirty = true; refreshAtts(d.scope); } break;
    case 'att-open': { const a = findAtt(d); if (a) previewAttachment(a); break; }
    case 'att-dl': { const a = findAtt(d); if (a) downloadAttachment(a); break; }
    case 'pv-dl': if (pvCurrent) downloadAttachment(pvCurrent); break;
    case 'pv-newtab': if (pvCurrent) openInNewTab(pvCurrent); break;
    case 'pv-bg': if (e.target === el) closeLightbox(); break;
    case 'lb-close': closeLightbox(); break;
    case 'team-new': openTeam(); break;
    case 'team-edit': openTeam(d.id); break;
    case 'team-save': saveTeam(el); break;
    case 'team-delete': deleteTeam(d.id); break;
    case 'modal-close': closeModal(); break;
    case 'modal-bg': if (e.target === el) closeModal(); break;
    case 'report': openReport(); break;
    case 'copy-report': { const ta = $('#rep'); try { await navigator.clipboard.writeText(ta.value); } catch (x) { ta.select(); document.execCommand('copy'); } toast('Report copied', 'ok'); break; }
    case 'csv': exportCSV(); break;
    case 'app-update': {
      if (isOffline()) { toast('Connect to the internet to update the app.', 'err'); break; }
      el.disabled = true; toast('Updating the app…');
      try {
        if (queue.length) await flushQueue();
        await Promise.all(['index.html', 'style.css', 'config.js', 'seed.js', 'app.js', 'sw.js', 'manifest.json'].map(f => fetch(f, { cache: 'reload' }).catch(() => {})));
        if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); }
        if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
      } catch (x) {}
      location.reload(); break;
    }
    case 'upd-pick': openUpdatePicker(); break;
    case 'task-restore': {
      const t = state.bin.find(x => String(x.id) === String(d.id)); if (!t) break;
      try {
        const res = await request('restoreTask', { id: t.id });
        state.bin = state.bin.filter(x => x !== t);
        state.tasks.push(Object.assign({}, t, { deletedAt: '', deletedBy: '' }));
        renderView(true); toast(res.queued ? 'Restored on this device — will sync when online' : 'Task restored', 'ok');
      } catch (err) { toast(err.message, 'err'); }
      break;
    }
    case 'upd-pick-go': $('#modal-root').innerHTML = ''; openTask(d.id, undefined, 'update', true); break;
    case 'seed': seedData(); break;
  }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('#lightbox-root').children.length) closeLightbox();
  else if ($('#modal-root').children.length) closeModal();
  else if ($('#drawer-root').children.length) closeDrawer();
});

new MutationObserver(hydrate).observe($('#drawer-root'), { childList: true, subtree: true });
window.addEventListener('popstate', e => {
  if (hist.skip > 0) { hist.skip--; return; }
  const dec = () => { hist.layers = Math.max(0, hist.layers - 1); };
  if ($('#lightbox-root').children.length) { $('#lightbox-root').innerHTML = ''; pvCurrent = null; dec(); return; }
  if ($('#modal-root').children.length) { $('#modal-root').innerHTML = ''; dec(); return; }
  if ($('#drawer-root').children.length) {
    if (drawerHasChanges() && !confirm('You have unsaved changes. Close anyway?')) { try { history.pushState({ layer: 1 }, ''); } catch (x) {} return; }
    $('#drawer-root').innerHTML = ''; draft = null; updDraft = null; dec(); return;
  }
  const v = e.state && e.state.view;
  if (v && auth.user && NAV.some(n => n.id === v) && $('#view')) setView(v, 'pop');
});
window.addEventListener('online', () => { updateNet(); syncNow(); });
window.addEventListener('offline', () => { setSync('off'); updateNet(); });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {      // lets the app itself open with no connection
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
boot();
})();
