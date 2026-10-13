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
 * There is no password: anyone who opens the web app enters their name.
 */

const SCHEMA = {
  Teams: ['id', 'name', 'supervisor', 'lead', 'members', 'order'],
  Tasks: ['id', 'teamId', 'title', 'description', 'drawing', 'responsibles', 'daysRequired',
          'startDate', 'endDate', 'actualEnd', 'status', 'progress', 'priority', 'remarks',
          'attachments', 'createdAt', 'updatedAt', 'updatedBy'],
  Updates: ['id', 'date', 'taskId', 'taskTitle', 'user', 'note', 'status', 'progress', 'attachments', 'timestamp'],
  Users: ['id', 'name', 'firstSeen', 'lastSeen', 'visits', 'device']
};
const NUMERIC = { daysRequired: 1, progress: 1, order: 1, visits: 1 };
const JSON_COLS = { attachments: 1 };
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const ensured_ = {};

/* ---------- one-time setup ---------- */
function setup() {
  Object.keys(SCHEMA).forEach(sheet_);
  getFolder_();
  const msg = 'Setup complete: Teams, Tasks and Updates tabs are ready and the attachments folder exists. Now deploy as a Web app.';
  Logger.log(msg);
  try { SpreadsheetApp.getActiveSpreadsheet().toast(msg, 'Maintenance Tracker', 20); } catch (e) {}
}

/* ---------- web entry points ---------- */
function doGet(e) {
  try {
    const q = (e && e.parameter) || {};
    switch (q.action) {
      case 'ping':  return json_({ ok: true, app: 'maintenance-tracker' });
      case 'file':  return json_(fileData_(q.id, false));
      case 'thumb': return json_(fileData_(q.id, true));
    }
    return json_({
      ok: true,
      teams: readAll_('Teams'),
      tasks: readAll_('Tasks'),
      updates: readAll_('Updates').slice(-2000)
    });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const req = JSON.parse(e.postData.contents);
    const d = req.data || {};
    const user = String(req.user || '').slice(0, 60);
    switch (req.action) {
      case 'saveTask':    return json_(saveTask_(d, user));
      case 'deleteTask':  return json_(deleteTask_(d.id));
      case 'saveTeam':    return json_(saveTeam_(d));
      case 'deleteTeam':  return json_(deleteTeam_(d.id));
      case 'addUpdate':   return json_(addUpdate_(d, user));
      case 'registerUser': return json_(registerUser_(d));
      case 'uploadFile':  return json_(uploadFile_(d));
      case 'bulkImport':  return json_(bulkImport_(d, user));
      default: return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
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

function deleteTask_(id) {
  deleteRow_('Tasks', id);
  const sh = sheet_('Updates');
  const last = sh.getLastRow();
  if (last > 1) {
    const col = SCHEMA.Updates.indexOf('taskId') + 1;
    const ids = sh.getRange(2, col, last - 1, 1).getValues();
    for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) sh.deleteRow(i + 2);
  }
  return { ok: true };
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
  const has = readAll_('Tasks').some(function (t) { return String(t.teamId) === String(id); });
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

  const latest = readAll_('Updates')
    .filter(function (u) { return String(u.taskId) === String(d.taskId); })
    .reduce(function (m, u) { const x = u.date || String(u.timestamp).slice(0, 10); return x > m ? x : m; }, '');

  // The app now sends its own id, so an update that was sent twice (e.g. after a dropped connection) is stored only once.
  if (d.id) {
    const dup = findById_('Updates', d.id);
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
    const merged = normTask_({ status: status, progress: progress }, task, user);
    upsert_('Tasks', merged);
    outTask = merged;
  }
  upd.attachments = Array.isArray(d.attachments) ? d.attachments : [];
  return { ok: true, update: upd, task: outTask_(outTask) };
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

/* ---------- helpers ---------- */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function today_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

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
  const tz = Session.getScriptTimeZone();
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

function normTask_(t, existing, user) {
  const now = new Date().toISOString();
  const o = Object.assign({}, existing || {}, t);
  o.id = String(o.id);
  if (o.status === 'Not Started') o.status = 'In Planning';
  o.daysRequired = (o.daysRequired === '' || o.daysRequired == null) ? '' : Number(o.daysRequired);
  o.progress = Math.max(0, Math.min(100, Number(o.progress) || 0));
  if (o.status === 'Completed') {
    o.progress = 100;
    if (!o.actualEnd) o.actualEnd = today_();
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
