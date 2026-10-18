/**
 * Mechanical Maintenance Task Tracker — Google Apps Script backend
 * ----------------------------------------------------------------
 * Container-bound script: open your Google Sheet → Extensions → Apps Script,
 * paste this file, run setup() once, then Deploy → New deployment → Web app.
 *
 * Sheet tabs created automatically: Teams, Tasks, Updates, Users
 *   Tasks   – one row per task (holds the CURRENT status / progress)
 *   Updates – one row per daily update (date, note, status, progress)
 *   Users   – everyone who entered their name in the app (first/last seen, visits)
 * Attachments are uploaded to the Drive folder "Maintenance Task Attachments".
 * They stay private; the app previews/downloads them through this script.
 *
 * Access: everyone enters their name plus the shared password set in APP_PASSWORD below.
 *
 * Adding rows directly in the sheet is fine: leave the "id" cell empty and a unique id
 * is filled in automatically (Tasks → T-001, T-002…, Teams → A, B, C…, Updates → U…).
 * In the Tasks tab you may type the team's name or letter ("Team B" or "B") in teamId.
 */

const SCHEMA = {
  Teams: ['id', 'name', 'supervisor', 'lead', 'members', 'order'],
  Tasks: ['id', 'teamId', 'title', 'description', 'drawing', 'responsibles', 'daysRequired',
          'startDate', 'endDate', 'actualEnd', 'status', 'progress', 'priority', 'remarks',
          'attachments', 'createdAt', 'updatedAt', 'updatedBy', 'deletedAt', 'deletedBy'],
  Updates: ['id', 'date', 'taskId', 'taskTitle', 'user', 'note', 'status', 'progress', 'attachments', 'timestamp'],
  Users: ['id', 'name', 'firstSeen', 'lastSeen', 'visits', 'device']
};
const NUMERIC = { daysRequired: 1, progress: 1, order: 1, visits: 1 };
const JSON_COLS = { attachments: 1 };
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ensured_ = {};
const TZ = 'Asia/Dhaka';   // all dates are worked out in this timezone, whatever the script's own setting is
const APP_PASSWORD = '2468';   // shared password (everyone also enters their name). Change it here, then redeploy.

/* ---------- one-time setup ---------- */
function setup() {
  Object.keys(SCHEMA).forEach(sheet_);
  getFolder_();
  installIdTrigger();
  installBackupTrigger();
  ensureIds_(20000);
  const msg = 'Setup complete: tabs are ready, the attachments folder exists and automatic IDs are switched on. Now deploy as a Web app.';
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Maintenance Tracker', 20); } catch (e) {}
}

/* ---------- web entry points ---------- */
function doGet(e) {
  try {
    const q = (e && e.parameter) || {};
    if (q.action !== 'ping' && String(q.pw || '') !== APP_PASSWORD) return json_({ ok: false, error: 'Wrong password', auth: true });
    switch (q.action) {
      case 'ping':  return json_({ ok: true, app: 'maintenance-tracker' });
      case 'file':  return json_(fileData_(q.id, false));
      case 'thumb': return json_(fileData_(q.id, true));
      case 'ver':   return json_({ ok: true, v: ver_() });
      case 'taskUpdates': return json_({ ok: true, updates: readAll_('Updates').filter(function (u) { return String(u.taskId) === String(q.id); }) });
    }
    const v = ver_();        // read first, so a change made while we read is never missed
    ensureIdsThrottled_();   // safety net: gives an id to any row typed in the sheet
    return json_({
      ok: true, v: v,
      teams: readAll_('Teams'),
      tasks: readAll_('Tasks'),
      updates: recentUpdates_(readAll_('Updates'))
    });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/** Only the last 30 days of daily updates are sent to the app (keeps it fast). */
function recentUpdates_(rows) {
  const cutoff = Utilities.formatDate(new Date(Date.now() - 30 * 864e5), TZ, 'yyyy-MM-dd');
  return rows.filter(function (u) { return String(u.date || String(u.timestamp).slice(0, 10)) >= cutoff; });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  if (String(req.password || '') !== APP_PASSWORD) return json_({ ok: false, error: 'Wrong password', auth: true });
  if (req.action === 'login') return json_({ ok: true });
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const d = req.data || {};
    const user = String(req.user || '').slice(0, 60);
    switch (req.action) {
      case 'saveTask':    return json_(saveTask_(d, user));
      case 'deleteTask':  return json_(deleteTask_(d.id, user));
      case 'restoreTask': return json_(restoreTask_(d.id, user));
      case 'saveTeam':    return json_(saveTeam_(d));
      case 'deleteTeam':  return json_(deleteTeam_(d.id));
      case 'addUpdate':   return json_(addUpdate_(d, user));
      case 'editUpdate':  return json_(editUpdate_(d, user));
      case 'registerUser': return json_(registerUser_(d));
      case 'uploadFile':  return json_(uploadFile_(d));
      case 'bulkImport':  return json_(bulkImport_(d, user));
      default: return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { if (req.action !== 'registerUser') bumpVer_(); } catch (x) {}
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- actions ---------- */
/** Records who has entered the app (first visit, last visit, number of visits). */
function registerUser_(d) {
  const name = String(d.name || '').trim().slice(0, 60);
  if (!name) throw new Error('Name is required');
  const id = name.toLowerCase().replace(/\s+/g, ' ');
  const now = new Date().toISOString();
  const ex = findById_('Users', id);
  upsert_('Users', {
    id: id, name: name,
    firstSeen: ex ? ex.firstSeen : now, lastSeen: now,
    visits: (ex ? Number(ex.visits) || 0 : 0) + 1,
    device: String(d.device || '').slice(0, 80)
  });
  return { ok: true };
}

function saveTask_(t, user) {
  if (!t.id) throw new Error('Task id missing');
  if (!String(t.title || '').trim()) throw new Error('Task title is required');
  const existing = findById_('Tasks', t.id);
  const task = normTask_(t, existing, user);
  upsert_('Tasks', task);
  return { ok: true, task: outTask_(task) };
}

/** Deleting only moves a task to the app's "Deleted tasks" list (Profile tab): the row stays in the sheet and can be restored. */
function deleteTask_(id, user) { setDeleted_(id, user, true); return { ok: true }; }
function restoreTask_(id, user) { setDeleted_(id, user, false); return { ok: true }; }
function setDeleted_(id, user, on) {
  const t = findById_('Tasks', id);
  if (!t) return;
  t.attachments = JSON.stringify(Array.isArray(t.attachments) ? t.attachments : []);
  t.deletedAt = on ? new Date().toISOString() : '';
  t.deletedBy = on ? user : '';
  upsert_('Tasks', t);
}

function saveTeam_(t) {
  if (!t.id) throw new Error('Team id missing');
  if (!String(t.name || '').trim()) throw new Error('Team name is required');
  const team = { id: String(t.id), name: t.name, supervisor: t.supervisor || '', lead: t.lead || '',
                 members: t.members || '', order: Number(t.order) || 0 };
  upsert_('Teams', team);
  return { ok: true, team: team };
}

function deleteTeam_(id) {
  const has = readAll_('Tasks').some(function (t) { return String(t.teamId) === String(id) && !t.deletedAt; });
  if (has) throw new Error('This team still has tasks. Move or delete them first.');
  deleteRow_('Teams', id);
  return { ok: true };
}

/** One row per daily update. The task row only changes if this is the newest update date. */
function addUpdate_(d, user) {
  const task = findById_('Tasks', d.taskId);
  if (!task) throw new Error('Task not found');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(d.date || '')) ? d.date : today_();
  const status = d.status || task.status;
  const p = Math.max(0, Math.min(100, Number(d.progress)));
  const progress = isNaN(p) ? task.progress : p;

  const allUpd = readAll_('Updates');
  const latest = allUpd
    .filter(function (u) { return String(u.taskId) === String(d.taskId); })
    .reduce(function (m, u) { const x = u.date || String(u.timestamp).slice(0, 10); return x > m ? x : m; }, '');

  // The app now sends its own id, so an update that was sent twice (e.g. after a dropped connection) is stored only once.
  if (d.id) {
    const dup = allUpd.filter(function (u) { return String(u.id) === String(d.id); })[0];
    if (dup) return { ok: true, update: dup, task: outTask_(task) };
  }

  const upd = {
    id: d.id ? String(d.id) : 'U' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    date: date, taskId: String(d.taskId), taskTitle: task.title, user: user, note: d.note || '',
    status: status, progress: progress,
    attachments: JSON.stringify(Array.isArray(d.attachments) ? d.attachments : []),
    timestamp: new Date().toISOString()
  };
  upsert_('Updates', upd);

  let outTask = task;
  if (date >= latest) {
    const merged = normTask_({ status: status, progress: progress }, task, user, date);
    upsert_('Tasks', merged);
    outTask = merged;
  }
  upd.attachments = Array.isArray(d.attachments) ? d.attachments : [];
  return { ok: true, update: upd, task: outTask_(outTask) };
}

/** Edits an existing update (the app only offers this for a task's latest update). The task row follows if it is still the newest. */
function editUpdate_(d, user) {
  const allUpd = readAll_('Updates');
  const old = allUpd.filter(function (u) { return String(u.id) === String(d.id); })[0];
  if (!old) throw new Error('Update not found');
  const task = findById_('Tasks', old.taskId);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(d.date || '')) ? d.date : (old.date || today_());
  const p = Math.max(0, Math.min(100, Number(d.progress)));
  const atts = Array.isArray(d.attachments) ? d.attachments : (old.attachments || []);
  const upd = {
    id: old.id, date: date, taskId: old.taskId, taskTitle: old.taskTitle, user: old.user,
    note: d.note != null ? d.note : old.note, status: d.status || old.status, progress: isNaN(p) ? old.progress : p,
    attachments: JSON.stringify(atts), timestamp: old.timestamp
  };
  upsert_('Updates', upd);
  let outTask = task;
  if (task) {
    const latest = allUpd
      .filter(function (u) { return String(u.taskId) === String(old.taskId) && String(u.id) !== String(old.id); })
      .reduce(function (m, u) { const x = u.date || String(u.timestamp).slice(0, 10); return x > m ? x : m; }, '');
    if (date >= latest) {
      outTask = normTask_({ status: upd.status, progress: upd.progress }, task, user, date);
      upsert_('Tasks', outTask);
    }
  }
  upd.attachments = atts;
  return { ok: true, update: upd, task: outTask ? outTask_(outTask) : null };
}

function uploadFile_(d) {
  if (!d.base64 || !d.name) throw new Error('No file data');
  const bytes = Utilities.base64Decode(d.base64);
  if (bytes.length > MAX_UPLOAD_BYTES) throw new Error('File is larger than 12 MB');
  const safe = String(d.name).replace(/[\\/:*?"<>|]+/g, '_');
  const mime = d.mime || 'application/octet-stream';
  const blob = Utilities.newBlob(bytes, mime, (d.taskId ? d.taskId + '_' : '') + Date.now().toString(36) + '_' + safe);
  const file = getFolder_().createFile(blob);
  return { ok: true, file: { id: file.getId(), name: safe, mime: mime, size: bytes.length } };
}

/** Returns file (or small thumbnail) as base64 so the app can preview/download without public sharing. */
function fileData_(id, thumb) {
  const f = ownedFile_(id);
  if (thumb) {
    const t = f.getThumbnail();
    if (!t) return { ok: false, error: 'No thumbnail' };
    return { ok: true, mime: t.getContentType(), base64: Utilities.base64Encode(t.getBytes()) };
  }
  const blob = f.getBlob();
  const bytes = blob.getBytes();
  return { ok: true, name: f.getName(), mime: blob.getContentType(), base64: Utilities.base64Encode(bytes) };
}

function ownedFile_(id) {
  if (!id) throw new Error('File id missing');
  const f = DriveApp.getFileById(String(id));
  const folderId = getFolder_().getId();
  const parents = f.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folderId) return f;
  throw new Error('Not an attachment file');
}

function bulkImport_(d, user) {
  const now = new Date().toISOString();
  const teams = (d.teams || []).map(function (t) {
    return SCHEMA.Teams.map(function (c) { return t[c] === undefined ? '' : t[c]; });
  });
  const tasks = (d.tasks || []).map(function (t) {
    const o = normTask_(t, null, user);
    o.createdAt = now;
    return SCHEMA.Tasks.map(function (c) { return o[c] === undefined ? '' : o[c]; });
  });
  appendRows_('Teams', teams);
  appendRows_('Tasks', tasks);
  return { ok: true, teams: teams.length, tasks: tasks.length };
}

/* ---------- change stamp: lets the app skip a full reload when nothing changed ---------- */
function ver_() { return PropertiesService.getScriptProperties().getProperty('DATA_VER') || '0'; }
function bumpVer_() { PropertiesService.getScriptProperties().setProperty('DATA_VER', String(Date.now())); }

/* ---------- monthly backup of this spreadsheet (kept in Drive, newest 12 copies) ---------- */
function monthlyBackup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const p = PropertiesService.getScriptProperties();
  let folder = null;
  const fid = p.getProperty('BACKUP_FOLDER_ID');
  if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) {} }
  if (!folder) { folder = DriveApp.createFolder('Maintenance Tracker Backups'); p.setProperty('BACKUP_FOLDER_ID', folder.getId()); }
  DriveApp.getFileById(ss.getId()).makeCopy('Backup ' + today_() + ' - ' + ss.getName(), folder);
  const files = [], it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(12).forEach(function (f) { f.setTrashed(true); });
  try { ss.toast('Backup saved in the "Maintenance Tracker Backups" Drive folder.', 'Maintenance Tracker', 8); } catch (e) {}
}
function installBackupTrigger() {
  const has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'monthlyBackup'; });
  if (!has) ScriptApp.newTrigger('monthlyBackup').timeBased().onMonthDay(1).atHour(2).create();
}

/* ---------- helpers ---------- */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

function getFolder_() {
  const p = PropertiesService.getScriptProperties();
  const id = p.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const folder = DriveApp.createFolder('Maintenance Task Attachments');
  p.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function initSheet_(sh, cols) {
  sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); // plain text → dates stay as typed
  sh.getRange(1, 1, 1, cols.length).setValues([cols])
    .setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

/** Creates the tab if missing; upgrades older column layouts without losing data. */
function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cols = SCHEMA[name];
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); initSheet_(sh, cols); ensured_[name] = true; return sh; }
  if (ensured_[name]) return sh;
  ensured_[name] = true;
  if (sh.getLastRow() === 0) { initSheet_(sh, cols); return sh; }

  const width = Math.max(sh.getLastColumn(), cols.length);
  const head = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  if (cols.every(function (c, i) { return head[i] === c; })) return sh;

  let hl = head.length;
  while (hl > 0 && head[hl - 1] === '') hl--;
  if (hl < cols.length && cols.slice(0, hl).every(function (c, i) { return head[i] === c; })) {
    if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
    sh.getRange(1, hl + 1, sh.getMaxRows(), cols.length - hl).setNumberFormat('@');
    sh.getRange(1, hl + 1, 1, cols.length - hl).setValues([cols.slice(hl)]).setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
    return sh;
  }

  head.forEach(function (h) {
    if (h && cols.indexOf(h) < 0) throw new Error('Tab "' + name + '" has an unexpected column "' + h + '". Restore the original header names.');
  });
  const n = sh.getLastRow() - 1;
  const old = [];
  if (n > 0) {
    sh.getRange(2, 1, n, head.length).getValues().forEach(function (r) {
      const o = {};
      head.forEach(function (h, i) { if (h) o[h] = r[i]; });
      old.push(o);
    });
  }
  sh.clear();
  initSheet_(sh, cols);
  if (old.length) {
    const rows = old.map(function (o) { return cols.map(function (c) { return o[c] === undefined ? '' : o[c]; }); });
    sh.getRange(2, 1, rows.length, cols.length).setValues(rows);
  }
  return sh;
}

function readAll_(name) {
  const sh = sheet_(name), cols = SCHEMA[name], n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const tz = TZ;
  const vals = sh.getRange(2, 1, n, cols.length).getValues();
  const rows = vals.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    const o = {};
    cols.forEach(function (c, i) {
      let v = r[i];
      if (v instanceof Date) {
        v = Utilities.formatDate(v, tz, c === 'timestamp' || /At$/.test(c) ? "yyyy-MM-dd'T'HH:mm:ssXXX" : 'yyyy-MM-dd');
      }
      if (NUMERIC[c]) v = (v === '' ? '' : Number(v));
      if (JSON_COLS[c]) { try { v = v ? JSON.parse(v) : []; } catch (e) { v = []; } }
      o[c] = v;
    });
    return o;
  });
  if (name === 'Teams') rows.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  return rows;
}

function findById_(name, id) {
  const all = readAll_(name);
  for (let i = 0; i < all.length; i++) if (String(all[i].id) === String(id)) return all[i];
  return null;
}

function upsert_(name, obj) {
  const sh = sheet_(name), cols = SCHEMA[name];
  const row = cols.map(function (c) { return obj[c] === undefined || obj[c] === null ? '' : obj[c]; });
  const last = sh.getLastRow();
  if (last > 1) {
    const ids = sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); });
    const i = ids.indexOf(String(obj.id));
    if (i >= 0) { sh.getRange(i + 2, 1, 1, cols.length).setValues([row]); return; }
  }
  sh.getRange(last + 1, 1, 1, cols.length).setValues([row]);
}

function appendRows_(name, rows) {
  if (!rows.length) return;
  const sh = sheet_(name), cols = SCHEMA[name];
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, cols.length).setValues(rows);
}

function deleteRow_(name, id) {
  const sh = sheet_(name), last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) { sh.deleteRow(i + 2); return; }
  }
}

function normTask_(t, existing, user, onDate) {
  const now = new Date().toISOString();
  const o = Object.assign({}, existing || {}, t);
  o.id = String(o.id);
  if (o.status === 'Not Started') o.status = 'In Planning';
  o.daysRequired = (o.daysRequired === '' || o.daysRequired == null) ? '' : Number(o.daysRequired);
  o.progress = Math.max(0, Math.min(100, Number(o.progress) || 0));
  if (o.status === 'Completed') {
    o.progress = 100;
    if (!o.actualEnd) o.actualEnd = onDate || today_();
  } else {
    o.actualEnd = '';          // a task that is not completed has no actual end date
  }
  if (!o.createdAt) o.createdAt = now;
  o.updatedAt = now;
  o.updatedBy = user || o.updatedBy || '';
  const att = Array.isArray(t.attachments) ? t.attachments : (existing && existing.attachments) || [];
  o.attachments = JSON.stringify(att);
  return o;
}

function outTask_(o) {
  const c = Object.assign({}, o);
  if (typeof c.attachments === 'string') { try { c.attachments = JSON.parse(c.attachments); } catch (e) { c.attachments = []; } }
  return c;
}


/* ---------- automatic, unique IDs for rows typed straight into the sheet ---------- */
// A row counts as a real row when this column has something in it.
const ID_KEY = { Teams: 'name', Tasks: 'title', Updates: 'taskId' };

/** Menu: Maintenance Tracker → Fill missing IDs now */
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Maintenance Tracker')
      .addItem('Fill missing IDs now', 'fillMissingIds')
      .addItem('Switch on automatic IDs', 'installIdTrigger')
      .addItem('Back up the sheet now', 'monthlyBackup')
      .addToUi();
  } catch (e) {}
}

function fillMissingIds() {
  const n = ensureIds_(30000);
  const msg = n < 0 ? 'The sheet is busy — try again in a moment.' : (n ? n + ' ID(s) added or fixed.' : 'All rows already have unique IDs.');
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Maintenance Tracker', 8); } catch (e) {}
  Logger.log(msg);
}

/** Runs the ID filler whenever someone edits or pastes into the sheet. Safe to run more than once. */
function installIdTrigger() {
  const has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'autoFillIds'; });
  if (!has) ScriptApp.newTrigger('autoFillIds').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
}

/** The edit trigger. */
function autoFillIds(e) {
  try { bumpVer_(); } catch (x) {}
  try {
    const sh = e && e.range && e.range.getSheet();
    if (sh && !ID_KEY[sh.getName()]) return;                  // ignore other tabs
    if (e && e.range && e.range.getLastRow() < 2) return;     // header only
    ensureIds_(20000);
  } catch (err) { Logger.log(err); }
}

function ensureIdsThrottled_() {
  try {
    const cache = CacheService.getScriptCache();
    if (cache.get('ids_checked')) return;
    if (ensureIds_(4000) >= 0) cache.put('ids_checked', '1', 300);
  } catch (e) {}
}

/** Fills/fixes ids on Teams, Tasks and Updates. Returns how many ids were created (−1 if the sheet was busy). */
function ensureIds_(waitMs) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(waitMs || 20000)) return -1;
  try {
    let n = 0;
    ['Teams', 'Tasks', 'Updates'].forEach(function (name) { n += fillIds_(name); });   // Teams first, so tasks can point at new teams
    return n;
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

function pad3_(n) { return n < 100 ? ('00' + n).slice(-3) : String(n); }

/** Returns a function that hands out ids nobody is using yet. */
function idGenerator_(name, taken) {
  if (name === 'Tasks') {
    let n = 0;
    Object.keys(taken).forEach(function (k) { const m = /^T-(\d+)$/.exec(k); if (m) n = Math.max(n, Number(m[1])); });
    return function () { let id; do { n++; id = 'T-' + pad3_(n); } while (taken[id]); taken[id] = true; return id; };
  }
  if (name === 'Teams') {
    let i = 0;
    return function () { let id; do { id = i < 26 ? String.fromCharCode(65 + i) : 'TM-' + (i - 25); i++; } while (taken[id]); taken[id] = true; return id; };
  }
  return function () {
    let id; do { id = 'U' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); } while (taken[id]);
    taken[id] = true; return id;
  };
}

/** "Team B", "b" or "B" → the real team id. "Combined" → COMBINED. Unknown text is left as typed. */
function teamRef_(v, teams) {
  const raw = String(v == null ? '' : v).trim();
  if (!raw) return raw;
  const low = raw.toLowerCase();
  if (low === 'combined') return 'COMBINED';
  for (let i = 0; i < teams.length; i++) if (String(teams[i].id) === raw) return raw;
  for (let i = 0; i < teams.length; i++) {
    const t = teams[i], nm = String(t.name).trim().toLowerCase();
    if (String(t.id).toLowerCase() === low || nm === low || nm === 'team ' + low) return String(t.id);
  }
  return raw;
}

function fillIds_(name) {
  const sh = sheet_(name), cols = SCHEMA[name], last = sh.getLastRow();
  if (last < 2) return 0;
  const n = last - 1, vals = sh.getRange(2, 1, n, cols.length).getValues();
  const ci = {}; cols.forEach(function (c, i) { ci[c] = i; });
  const key = ci[ID_KEY[name]];
  const now = new Date().toISOString();

  // 1) which ids are already taken; a repeated id (e.g. a copied row) must be replaced
  const taken = {}, dup = {};
  vals.forEach(function (r, i) {
    const id = String(r[0]).trim();
    if (!id) return;
    if (taken[id]) dup[i] = true; else taken[id] = true;
  });
  const next = idGenerator_(name, taken);
  const teams = name === 'Tasks' ? readAll_('Teams') : [];
  let maxOrder = 0;
  if (name === 'Teams') vals.forEach(function (r) { maxOrder = Math.max(maxOrder, Number(r[ci.order]) || 0); });

  const changed = {};          // column index → true
  const set = function (r, c, v) { r[c] = v; changed[c] = true; };
  let created = 0;

  // 2) give every real row an id; fill sensible defaults for brand-new rows
  vals.forEach(function (r, i) {
    const id = String(r[0]).trim();
    const hasData = String(r[key]).trim() !== '';
    const isNew = !id && hasData;
    if (isNew || dup[i]) {
      set(r, 0, next()); created++;
    } else if (id !== String(r[0])) {
      set(r, 0, id);                                            // trim stray spaces
    }
    if (!isNew) return;
    if (name === 'Tasks') {
      if (String(r[ci.status]) === '') set(r, ci.status, 'In Planning');
      if (String(r[ci.progress]) === '') set(r, ci.progress, 0);
      if (String(r[ci.priority]) === '') set(r, ci.priority, 'Normal');
      if (String(r[ci.createdAt]) === '') set(r, ci.createdAt, now);
      set(r, ci.updatedAt, now); set(r, ci.updatedBy, 'Typed in sheet');
    } else if (name === 'Teams') {
      if (String(r[ci.order]) === '') set(r, ci.order, ++maxOrder);
    } else {
      if (String(r[ci.date]) === '') set(r, ci.date, today_());
      if (String(r[ci.user]) === '') set(r, ci.user, 'Typed in sheet');
      set(r, ci.timestamp, now);
    }
  });

  // 3) tasks: accept a team name/letter in teamId and turn it into the team's id
  if (name === 'Tasks') {
    vals.forEach(function (r) {
      const fixed = teamRef_(r[ci.teamId], teams);
      if (fixed !== String(r[ci.teamId])) set(r, ci.teamId, fixed);
    });
  }

  // 4) write back only the columns that changed
  Object.keys(changed).forEach(function (c) {
    c = Number(c);
    sh.getRange(2, c + 1, n, 1).setValues(vals.map(function (r) { return [r[c]]; }));
  });
  return created;
}
