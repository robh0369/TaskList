/**
 * Home Tasks: Google Sheets backend.
 *
 * Paste this into Extensions → Apps Script in your Google Sheet, then follow the
 * README's "Connect your Google Sheet" steps. The web app accepts POST requests from
 * the Home Tasks site, checks the household passcode, and reads and writes the tabs below.
 */

var SCHEMA = {
  tasks: ['id', 'title', 'notes', 'assigneeId', 'categoryId', 'projectId', 'parentId', 'dueDate', 'priority', 'effort', 'status', 'recurrence', 'createdBy', 'createdAt', 'updatedAt', 'completedAt', 'completedBy', 'deleted', '_rev'],
  completions: ['id', 'taskId', 'title', 'completedBy', 'completedAt', 'dueDate', 'effort', 'categoryId', 'updatedAt', 'deleted', '_rev'],
  projects: ['id', 'name', 'description', 'ownerId', 'targetDate', 'color', 'status', 'createdAt', 'updatedAt', 'deleted', '_rev'],
  comments: ['id', 'taskId', 'authorId', 'body', 'photoFileId', 'createdAt', 'updatedAt', 'deleted', '_rev'],
  members: ['id', 'name', 'color', 'updatedAt', 'deleted', '_rev'],
  categories: ['id', 'name', 'icon', 'sortOrder', 'updatedAt', 'deleted', '_rev'],
};

var TAB_NAMES = {
  tasks: 'Tasks',
  completions: 'Completions',
  projects: 'Projects',
  comments: 'Comments',
  members: 'Members',
  categories: 'Categories',
};

var NUMBER_FIELDS = { effort: 1, sortOrder: 1, _rev: 1 };
var BOOL_FIELDS = { deleted: 1 };
var JSON_FIELDS = { recurrence: 1 };
var DATE_FIELDS = { dueDate: 1, targetDate: 1 };

var PHOTO_FOLDER = 'Home Tasks Photos';

// ---------------------------------------------------------------------------
// Entry points

function doGet() {
  return json({ ok: true, app: 'hometasks', message: 'Home Tasks backend is running. Paste this URL into the app\'s Settings.' });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad request' });
  }
  try {
    return json(handle(req));
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function handle(req) {
  var expected = PropertiesService.getScriptProperties().getProperty('PASSCODE');
  if (!expected) return { ok: false, error: 'Set a PASSCODE script property first (see README).' };
  if (String(req.passcode || '') !== expected) return { ok: false, error: 'unauthorized' };

  ensureSchema();
  switch (req.action) {
    case 'ping':
      return { ok: true };
    case 'pull':
      return pull(Number(req.since) || 0);
    case 'push':
      return push(req.mutations || []);
    case 'uploadPhoto':
      return uploadPhoto(req.dataUrl, req.name);
    default:
      return { ok: false, error: 'unknown action' };
  }
}

/** Run once from the editor: creates the tabs and asks for Drive/Sheets permission. */
function setup() {
  ensureSchema();
  getPhotoFolder();
  if (!PropertiesService.getScriptProperties().getProperty('PASSCODE')) {
    Logger.log('Now add a script property named PASSCODE (Project Settings → Script properties).');
  }
}

// ---------------------------------------------------------------------------
// Sync

function currentRev() {
  return Number(PropertiesService.getScriptProperties().getProperty('REV') || 0);
}

function pull(since) {
  var rev = currentRev();
  var changes = {};
  if (since >= rev) return { ok: true, rev: rev, changes: changes };
  Object.keys(SCHEMA).forEach(function (name) {
    var rows = readAll(name).filter(function (r) {
      return (r._rev || 0) > since;
    });
    if (rows.length) changes[name] = rows;
  });
  return { ok: true, rev: rev, changes: changes };
}

function push(mutations) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties();
    var rev = currentRev();
    var byCollection = {};
    mutations.forEach(function (m) {
      if (!SCHEMA[m.collection] || !m.record || !m.record.id) return;
      (byCollection[m.collection] = byCollection[m.collection] || []).push(m.record);
    });

    Object.keys(byCollection).forEach(function (name) {
      var sheet = getSheet(name);
      var fields = SCHEMA[name];
      var last = sheet.getLastRow();
      var ids = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues() : [];
      var index = {};
      for (var i = 0; i < ids.length; i++) index[String(ids[i][0])] = i + 2;
      var updatedCol = fields.indexOf('updatedAt') + 1;

      byCollection[name].forEach(function (record) {
        var rowNum = index[record.id];
        if (rowNum) {
          // Last write wins: ignore a change older than what's stored.
          var stored = String(sheet.getRange(rowNum, updatedCol).getValue() || '');
          if (stored && stored > String(record.updatedAt || '')) return;
        }
        rev += 1;
        record._rev = rev;
        var values = [fields.map(function (f) { return toCell(f, record[f]); })];
        if (rowNum) {
          sheet.getRange(rowNum, 1, 1, fields.length).setValues(values);
        } else {
          rowNum = sheet.getLastRow() + 1;
          sheet.getRange(rowNum, 1, 1, fields.length).setValues(values);
          index[record.id] = rowNum;
        }
      });
    });

    props.setProperty('REV', String(rev));
    return { ok: true, rev: rev, changes: {} };
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Photos

function getPhotoFolder() {
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

function uploadPhoto(dataUrl, name) {
  var match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) return { ok: false, error: 'not an image' };
  var bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 5 * 1024 * 1024) return { ok: false, error: 'photo too large' };
  var blob = Utilities.newBlob(bytes, match[1], String(name || 'photo.jpg').slice(0, 120));
  var file = getPhotoFolder().createFile(blob);
  // Viewable by link so the app can show it; the ID is long and unguessable.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, fileId: file.getId(), url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' };
}

// ---------------------------------------------------------------------------
// Sheet helpers

function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name) {
  return ss().getSheetByName(TAB_NAMES[name]);
}

function ensureSchema() {
  var cache = CacheService.getScriptCache();
  if (cache.get('schema-ok')) return;
  var book = ss();
  Object.keys(SCHEMA).forEach(function (name) {
    var fields = SCHEMA[name];
    var sheet = book.getSheetByName(TAB_NAMES[name]);
    if (!sheet) {
      sheet = book.insertSheet(TAB_NAMES[name]);
      // Plain text everywhere so Sheets doesn't turn dates and IDs into other types.
      sheet.getRange(1, 1, sheet.getMaxRows(), fields.length).setNumberFormat('@');
      sheet.getRange(1, 1, 1, fields.length).setValues([fields]).setFontWeight('bold');
      sheet.setFrozenRows(1);
      seed(name, sheet);
    } else {
      var header = sheet.getRange(1, 1, 1, fields.length).getValues()[0];
      if (header.join('|') !== fields.join('|')) {
        throw new Error('The header row of the "' + TAB_NAMES[name] + '" tab was changed. Restore it to: ' + fields.join(', '));
      }
    }
  });
  cache.put('schema-ok', '1', 600);
}

function seed(name, sheet) {
  var epoch = '2000-01-01T00:00:00.000Z';
  var rows = [];
  if (name === 'members') {
    rows = [
      { id: 'm1', name: 'Partner A', color: '#2a78d6', updatedAt: epoch, deleted: false },
      { id: 'm2', name: 'Partner B', color: '#eb6834', updatedAt: epoch, deleted: false },
    ];
  } else if (name === 'categories') {
    var cats = [['Kitchen', '🍳'], ['Cleaning', '🧽'], ['Laundry', '🧺'], ['Yard', '🌿'], ['Finances', '💵'], ['Errands', '🛒'], ['Home Repair', '🔧'], ['Car', '🚗'], ['Pets', '🐾']];
    rows = cats.map(function (c, i) {
      return { id: 'c' + (i + 1), name: c[0], icon: c[1], sortOrder: i, updatedAt: epoch, deleted: false };
    });
  }
  if (!rows.length) return;
  var props = PropertiesService.getScriptProperties();
  var rev = currentRev();
  var fields = SCHEMA[name];
  var values = rows.map(function (r) {
    rev += 1;
    r._rev = rev;
    return fields.map(function (f) { return toCell(f, r[f]); });
  });
  sheet.getRange(2, 1, values.length, fields.length).setValues(values);
  props.setProperty('REV', String(rev));
}

function readAll(name) {
  var sheet = getSheet(name);
  var fields = SCHEMA[name];
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, fields.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    if (!values[i][0]) continue;
    var rec = {};
    for (var j = 0; j < fields.length; j++) rec[fields[j]] = fromCell(fields[j], values[i][j]);
    out.push(rec);
  }
  return out;
}

function toCell(field, value) {
  if (value === undefined || value === null) return '';
  if (JSON_FIELDS[field]) return value ? JSON.stringify(value) : '';
  if (BOOL_FIELDS[field]) return value ? 'TRUE' : 'FALSE';
  return String(value);
}

function fromCell(field, value) {
  if (value instanceof Date) {
    // Someone edited a cell by hand and Sheets turned it into a date.
    var tz = ss().getSpreadsheetTimeZone();
    return DATE_FIELDS[field] ? Utilities.formatDate(value, tz, 'yyyy-MM-dd') : value.toISOString();
  }
  if (NUMBER_FIELDS[field]) return Number(value) || 0;
  if (BOOL_FIELDS[field]) return value === true || String(value).toUpperCase() === 'TRUE';
  if (JSON_FIELDS[field]) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }
  return value === undefined || value === null ? '' : String(value);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
