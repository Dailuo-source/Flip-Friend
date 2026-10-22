/**
 * Flip Friend — Google Sheets backend for Refinished by Cecilia
 *
 * The Sheet is the database. Each tab is matched by its header names, so
 * columns can be moved or added in the sheet without breaking the app.
 *   Projects    — one row per furniture piece (number, prices, sale, profit)
 *   Time log    — hours per step, as they are logged
 *   Listings    — listing events: listed, price drops, relists, interest check-ins
 *   Supply use  — what each project used and what it cost
 *   Supplies    — what is on the shelf (generic names) and average prices
 *   Barcodes    — scanned barcodes and the supply each one files under
 *   Expenses    — business spending entered in the app (separate from the audit sheet)
 *   Goals       — monthly profit goal and pieces forecast
 *   Inspiration — pictures to work from, per project
 *   Settings    — hidden; step names, units and other lists
 *
 * - doPost is the JSON API the app calls (the app is hosted on Cloudflare Pages)
 * - Every request must carry the app key (menu: Flip Friend → Show app key and phone link)
 * - Pictures and receipts are saved in Drive, in folders next to this sheet.
 */

const APP_NAME = 'Flip Friend';
const APP_SITE = 'https://flip-friend.pages.dev/';

// [field, header label, type]. `key` is the field a row must have to count.
const SCHEMA = {
  projects: {
    sheet: 'Projects', key: 'name',
    cols: [
      ['no', 'No', 'pno'], ['name', 'Name', 'text'], ['status', 'Status', 'text'],
      ['started', 'Started', 'date'], ['paid', 'Price paid', 'num'], ['list', 'List price', 'num'],
      ['sold', 'Sold price', 'num'], ['fee', 'Delivery fee', 'num'], ['soldOn', 'Sold on', 'date'],
      ['profit', 'Profit', 'num'], ['tts', 'Time to sell', 'text'], ['days', 'Days worked', 'text'],
      ['notes', 'Notes', 'text'], ['picture', 'Picture', 'text'], ['inspoNotes', 'Inspiration notes', 'text'],
      ['updated', 'Updated', 'date'], ['id', 'ID', 'id'], ['soldThrough', 'Sold through', 'text'],
    ],
  },
  timelog: {
    sheet: 'Time log', key: 'step',
    cols: [['project', 'Project', 'pno'], ['step', 'Step', 'text'], ['label', 'Label', 'text'],
      ['date', 'Date', 'date'], ['hours', 'Hours', 'num'], ['notes', 'Notes', 'text'], ['id', 'ID', 'id']],
  },
  listings: {
    sheet: 'Listings', key: 'event',
    cols: [['project', 'Project', 'pno'], ['date', 'Date', 'date'], ['event', 'Event', 'text'],
      ['price', 'Price', 'num'], ['platform', 'Platform', 'text'], ['views', 'Views', 'num'],
      ['saves', 'Saves', 'num'], ['inquiries', 'Inquiries', 'num'], ['notes', 'Notes', 'text'], ['id', 'ID', 'id']],
  },
  supplyuse: {
    sheet: 'Supply use', key: 'supply',
    cols: [['project', 'Project', 'pno'], ['date', 'Date', 'date'], ['supply', 'Supply', 'text'],
      ['amount', 'Amount', 'num'], ['unit', 'Unit', 'text'], ['cost', 'Cost', 'num'],
      ['shared', 'Shared with', 'text'], ['notes', 'Notes', 'text'], ['id', 'ID', 'id'],
      ['category', 'Category', 'text']],
  },
  supplies: {
    sheet: 'Supplies', key: 'name',
    cols: [['name', 'Name', 'text'], ['category', 'Category', 'text'], ['unit', 'Unit', 'text'],
      ['onHand', 'On hand', 'num'], ['avgCost', 'Avg cost per unit', 'num'], ['reusable', 'Reusable', 'bool'],
      ['inUse', 'In use', 'num'], ['lowAt', 'Low at', 'num'], ['id', 'ID', 'id']],
  },
  barcodes: {
    sheet: 'Barcodes', key: 'barcode',
    cols: [['barcode', 'Barcode', 'code'], ['product', 'Product name', 'text'], ['supply', 'Supply', 'text'], ['id', 'ID', 'id']],
  },
  expenses: {
    sheet: 'Expenses', key: 'amount',
    cols: [['date', 'Date', 'date'], ['store', 'Store', 'text'], ['item', 'Item', 'text'],
      ['amount', 'Amount', 'num'], ['category', 'Category', 'text'], ['project', 'Project', 'pno'],
      ['receipt', 'Receipt', 'text'], ['notes', 'Notes', 'text'], ['id', 'ID', 'id']],
  },
  goals: {
    sheet: 'Goals', key: 'year',
    cols: [['year', 'Year', 'num'], ['month', 'Month', 'num'], ['goal', 'Profit goal', 'num'],
      ['min', 'Pieces min', 'num'], ['max', 'Pieces max', 'num'], ['id', 'ID', 'id']],
  },
  inspiration: {
    sheet: 'Inspiration', key: 'picture',
    cols: [['project', 'Project', 'pno'], ['picture', 'Picture', 'text'], ['caption', 'Caption', 'text'], ['id', 'ID', 'id']],
  },
  settings: {
    sheet: 'Settings', key: 'key', readOnly: true,
    cols: [['key', 'Key', 'text'], ['value', 'Value', 'text']],
  },
};

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  // Public page: never show the key here.
  return HtmlService.createHtmlOutput(
    '<div style="font:16px/1.5 system-ui,sans-serif;padding:24px;max-width:420px">' +
    '<h2 style="margin:0 0 8px">' + APP_NAME + '</h2>' +
    '<p>This link is where the app saves to your sheet. To open the app, use the phone link from your sheet: ' +
    APP_NAME + ' menu → Show app key and phone link.</p></div>')
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  const res = api(e && e.postData ? e.postData.contents : '{}');
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Request:  { key, ops: [{op, coll, id, data}], calls: [{fn, args}], noState }
 *   ops   — 'add' | 'update' | 'del' on a collection
 *   calls — 'upload' (picture), 'image' (read a picture), 'receipt' (scan), 'barcode' (look up a product)
 * Response: { ok: true, state, results: [...one per call], sheetUrl } or { ok: false, error, message }
 */
function api(body) {
  let req;
  try {
    req = typeof body === 'string' ? JSON.parse(body || '{}') : body;
  } catch (err) {
    return { ok: false, error: 'bad_request', message: 'The request could not be read.' };
  }
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('APP_KEY');
  if (!key) return { ok: false, error: 'not_setup', message: 'Run "Set up / repair sheets" from the ' + APP_NAME + ' menu first.' };
  if (!req || String(req.key || '').trim() !== key) return { ok: false, error: 'bad_key', message: 'That app key is not right.' };

  // Picture and lookup calls don't touch the sheet, so they skip the lock.
  const results = [];
  try {
    (req.calls || []).forEach(function (c) { results.push(runCall_(c)); });
  } catch (err) {
    return { ok: false, error: 'server', message: String((err && err.message) || err) };
  }
  if (req.noState && !(req.ops || []).length) return { ok: true, results: results };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'busy', message: 'The sheet is busy. Try again in a moment.' };
  try {
    (req.ops || []).forEach(applyOp_);
    SpreadsheetApp.flush();
    return { ok: true, state: readAll_(), results: results, sheetUrl: ss_().getUrl() };
  } catch (err) {
    return { ok: false, error: 'server', message: String((err && err.message) || err) };
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Reading and writing                                                 */
/* ------------------------------------------------------------------ */

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}

function label_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/\(.*?\)/g, '').trim();
}

/** Map field → 0-based column index, matched by header text so columns can be moved. */
function headerMap_(head, sch) {
  const byLabel = {};
  sch.cols.forEach(function (c) { byLabel[label_(c[1])] = c[0]; });
  const cols = {};
  head.forEach(function (h, i) {
    const k = byLabel[label_(h)];
    if (k && cols[k] == null) cols[k] = i;
  });
  return cols;
}

function table_(sh, sch) {
  const width = Math.max(sh.getLastColumn(), 1);
  const lastRow = sh.getLastRow();
  const cols = headerMap_(sh.getRange(1, 1, 1, width).getValues()[0], sch);
  const rowOf = {};
  let last = 1;
  if (lastRow >= 2) {
    const vals = sh.getRange(2, 1, lastRow - 1, width).getValues();
    vals.forEach(function (r, i) {
      const id = cols.id != null ? String(r[cols.id]).trim() : '';
      const k = cols[sch.key] != null ? String(r[cols[sch.key]]).trim() : '';
      if (id || k) last = i + 2;
      if (id && !rowOf[id]) rowOf[id] = i + 2;
    });
  }
  return { cols: cols, rowOf: rowOf, lastRow: last, width: width };
}

function fromCell_(v, type) {
  switch (type) {
    case 'num': {
      if (v === '' || v == null) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    }
    case 'date':
      if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (v === '' || v == null) return '';
      return String(v).trim();
    case 'bool':
      return v === true || /^(true|yes|y|1)$/i.test(String(v).trim());
    default:
      return String(v == null ? '' : v).trim();
  }
}

function toCell_(v, type) {
  switch (type) {
    case 'num': return v == null || v === '' ? '' : Number(v);
    case 'date': {
      if (!v) return '';
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
      return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : new Date(v);
    }
    case 'bool': return v ? true : false;
    case 'pno': {
      const s = v == null ? '' : String(v).trim();
      return /^\d+$/.test(s) ? Number(s) : s;
    }
    case 'code': {
      const s = v == null ? '' : String(v).trim();
      return s ? "'" + s : '';
    }
    default: {
      const s = v == null ? '' : String(v);
      return /^[=+\-@]/.test(s) ? "'" + s : s;   // never let typed text turn into a formula
    }
  }
}

function newId_() {
  return 'r' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

function readAll_() {
  const ss = ss_();
  const out = {};
  Object.keys(SCHEMA).forEach(function (coll) {
    const sch = SCHEMA[coll];
    out[coll] = [];
    const sh = ss.getSheetByName(sch.sheet);
    if (!sh || sh.getLastRow() < 2) return;
    const width = sh.getLastColumn();
    const vals = sh.getRange(1, 1, sh.getLastRow(), width).getValues();
    const cols = headerMap_(vals[0], sch);
    const seen = {};
    const fixes = [];
    for (let r = 1; r < vals.length; r++) {
      const obj = {};
      sch.cols.forEach(function (c) {
        const i = cols[c[0]];
        if (i != null) obj[c[0]] = fromCell_(vals[r][i], c[2]);
      });
      if (obj[sch.key] === '' || obj[sch.key] == null) continue;
      if (!sch.readOnly) {
        // Rows typed straight into the sheet (or copied) get their own ID
        if (!obj.id || seen[obj.id]) {
          obj.id = newId_();
          if (cols.id != null) fixes.push([r + 1, cols.id + 1, obj.id]);
        }
        seen[obj.id] = true;
      }
      out[coll].push(obj);
    }
    fixes.forEach(function (f) { sh.getRange(f[0], f[1]).setValue(f[2]); });
  });
  return out;
}

function applyOp_(op) {
  if (op.coll === 'settings' && op.op === 'set') return setSetting_(op.id, op.data && op.data.value);
  const sch = SCHEMA[op.coll];
  if (!sch || sch.readOnly) throw new Error('Unknown list "' + op.coll + '".');
  const ss = ss_();
  const sh = ss.getSheetByName(sch.sheet) || buildTab_(ss, sch);
  let t = table_(sh, sch);
  // A field the sheet has no column for yet (e.g. a newly added one): add the column first
  const data0 = op.data || {};
  if (sch.cols.some(function (c) { return c[0] in data0 && t.cols[c[0]] == null; })) {
    buildTab_(ss, sch);
    t = table_(sh, sch);
  }
  const row = op.id ? t.rowOf[op.id] : null;

  if (op.op === 'del') {
    if (row) sh.deleteRow(row);
    return;
  }

  const data = Object.assign({}, op.data || {});
  if (t.cols.updated != null) data.updated = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  if (op.op === 'add' && !row) {
    if (op.coll === 'projects') data.no = nextProjectNo_(sh, t, data.no);
    data.id = op.id || newId_();
    const vals = [];
    for (let i = 0; i < t.width; i++) vals.push('');
    sch.cols.forEach(function (c) {
      const i = t.cols[c[0]];
      if (i != null && c[0] in data) vals[i] = toCell_(data[c[0]], c[2]);
    });
    sh.getRange(t.lastRow + 1, 1, 1, t.width).setValues([vals]);
    return;
  }

  if (!row) return; // the row was removed in the sheet; nothing to update
  sch.cols.forEach(function (c) {
    if (c[0] === 'id' || !(c[0] in data)) return;
    if (op.coll === 'projects' && c[0] === 'no') return; // project numbers never change from the app
    const i = t.cols[c[0]];
    if (i != null) sh.getRange(row, i + 1).setValue(toCell_(data[c[0]], c[2]));
  });
}

/** Settings is read-only to the app except for this: set one Key's Value (adds the row if it's missing). */
function setSetting_(key, value) {
  key = String(key || '').trim();
  if (!/^(Cost categories)$/i.test(key)) throw new Error('That setting can only be changed in the sheet.');
  const ss = ss_();
  const sch = SCHEMA.settings;
  const sh = ss.getSheetByName(sch.sheet) || buildTab_(ss, sch);
  const width = Math.max(sh.getLastColumn(), 2);
  const vals = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), width).getValues();
  const cols = headerMap_(vals[0], sch);
  const kc = cols.key != null ? cols.key : 0, vc = cols.value != null ? cols.value : 1;
  for (let r = 1; r < vals.length; r++) {
    if (label_(vals[r][kc]) === label_(key)) { sh.getRange(r + 1, vc + 1).setValue(String(value == null ? '' : value)); return; }
  }
  const row = [];
  for (let i = 0; i < width; i++) row.push('');
  row[kc] = key; row[vc] = String(value == null ? '' : value);
  sh.getRange(sh.getLastRow() + 1, 1, 1, width).setValues([row]);
}

/** New projects always get the next number after the highest one in the sheet. */
function nextProjectNo_(sh, t, asked) {
  let max = 0;
  if (t.cols.no != null && sh.getLastRow() >= 2) {
    sh.getRange(2, t.cols.no + 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r) {
      const n = parseInt(String(r[0]), 10);
      if (!isNaN(n) && n > max) max = n;
    });
  }
  const want = parseInt(String(asked), 10);
  return !isNaN(want) && want > max ? want : max + 1;
}

/* ------------------------------------------------------------------ */
/* Pictures, receipts and barcode lookups                              */
/* ------------------------------------------------------------------ */

function runCall_(c) {
  const a = c.args || {};
  switch (c.fn) {
    case 'upload': return uploadPicture_(a);
    case 'image': return readPicture_(a);
    case 'receipt': return scanReceipt_(a);
    case 'barcode': return lookupBarcode_(a);
    default: throw new Error('Unknown request "' + c.fn + '".');
  }
}

/** The Drive folder this sheet lives in, then a subfolder by name (made if missing). */
function folder_(path) {
  const file = DriveApp.getFileById(ss_().getId());
  const parents = file.getParents();
  let dir = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  path.forEach(function (name) {
    const it = dir.getFoldersByName(name);
    dir = it.hasNext() ? it.next() : dir.createFolder(name);
  });
  return dir;
}

function blobFrom_(a, name) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(String(a.data || ''));
  if (!m) throw new Error('The picture could not be read.');
  return Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
}

function uploadPicture_(a) {
  const kind = a.kind === 'inspiration' ? 'Inspiration' : 'Project photos';
  const name = (a.name || 'photo') + '.jpg';
  const f = folder_([kind]).createFile(blobFrom_(a, name));
  return { id: f.getId() };
}

function readPicture_(a) {
  const f = DriveApp.getFileById(String(a.id));
  const b = f.getBlob();
  return { id: a.id, data: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}

/**
 * Saves the receipt photo to Drive right away (Receipts/yyyy-MM), then reads the text with
 * Google's free text recognition (the photo is copied into a temporary Google Doc and deleted after).
 */
function scanReceipt_(a) {
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  const month = Utilities.formatDate(now, tz, 'yyyy-MM');
  const name = 'Receipt ' + Utilities.formatDate(now, tz, 'yyyy-MM-dd HHmmss') + '.jpg';
  const blob = blobFrom_(a, name);
  const saved = folder_(['Receipts', month]).createFile(blob);

  let text = '';
  try {
    const token = ScriptApp.getOAuthToken();
    const boundary = 'ffb' + Utilities.getUuid().replace(/-/g, '');
    const meta = JSON.stringify({ name: 'Flip Friend OCR (temporary)', mimeType: 'application/vnd.google-apps.document' });
    const head = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta +
      '\r\n--' + boundary + '\r\nContent-Type: ' + blob.getContentType() + '\r\n\r\n';
    const tail = '\r\n--' + boundary + '--';
    const payload = Utilities.newBlob(head).getBytes().concat(blob.getBytes()).concat(Utilities.newBlob(tail).getBytes());
    const up = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&ocrLanguage=en', {
      method: 'post', contentType: 'multipart/related; boundary=' + boundary, payload: payload,
      headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
    });
    const doc = JSON.parse(up.getContentText());
    if (doc.id) {
      text = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + doc.id + '/export?mimeType=text/plain', {
        headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true,
      }).getContentText();
      DriveApp.getFileById(doc.id).setTrashed(true);
    }
  } catch (err) {
    console.log('OCR failed: ' + err);
  }
  const parsed = parseReceipt_(text);
  parsed.receipt = saved.getUrl();
  parsed.receiptId = saved.getId();
  parsed.text = text;
  return parsed;
}

/** Best guess at store, date, total, tax and item lines. The app shows it for checking before saving. */
function parseReceipt_(text) {
  const lines = String(text || '').split(/\r?\n/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(String);
  const money = /(-?\$?\s?\d{1,4}(?:,\d{3})*\.\d{2})\s*[A-Z]{0,2}$/;
  const num = function (s) { return Number(String(s).replace(/[$,\s]/g, '')); };
  const out = { store: '', date: '', total: null, tax: null, items: [] };

  const known = ['Home Depot', 'Lowe', 'Canadian Tire', 'Walmart', 'Dollarama', 'Rona', 'Lee Valley', 'Michaels', 'IKEA', 'Costco', 'Amazon', 'Princess Auto', 'Home Hardware', 'Sherwin', 'Benjamin Moore', 'Giant Tiger', 'Value Village'];
  const blob = lines.slice(0, 8).join(' ');
  known.some(function (k) { if (new RegExp(k, 'i').test(blob)) { out.store = k === 'Lowe' ? "Lowe's" : k; return true; } return false; });
  if (!out.store && lines.length) out.store = lines[0].slice(0, 40);

  const dm = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})|(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/.exec(lines.join(' '));
  if (dm) {
    if (dm[1]) out.date = dm[1] + '-' + ('0' + dm[2]).slice(-2) + '-' + ('0' + dm[3]).slice(-2);
    else {
      let y = Number(dm[6]); if (y < 100) y += 2000;
      out.date = y + '-' + ('0' + dm[4]).slice(-2) + '-' + ('0' + dm[5]).slice(-2);   // most Canadian till slips are MM/DD
    }
  }

  lines.forEach(function (l) {
    const m = money.exec(l);
    if (!m) return;
    const amt = num(m[1]);
    const label = l.slice(0, m.index).replace(/[\s.:]+$/, '').trim();
    if (/sub\s*-?total/i.test(label)) return;
    if (/\b(total|amount due|balance)\b/i.test(label)) { if (out.total == null || amt > out.total) out.total = amt; return; }
    if (/\b(hst|gst|pst|tax)\b/i.test(label)) { out.tax = (out.tax || 0) + amt; return; }
    if (/(change|cash|visa|master|debit|tend|card|auth|points|saved|discount)/i.test(label)) return;
    if (!label || /^\d+$/.test(label)) return;
    out.items.push({ text: label.replace(/^\d{6,}\s*/, '').slice(0, 60), amount: amt });
  });
  return out;
}

/** Looks a barcode up in a free product database. Returns '' when it isn't found. */
function lookupBarcode_(a) {
  const code = String(a.code || '').replace(/\D/g, '');
  if (!code) return { code: code, product: '' };
  try {
    const r = UrlFetchApp.fetch('https://api.upcitemdb.com/prod/trial/lookup?upc=' + code, { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      const j = JSON.parse(r.getContentText());
      const it = j.items && j.items[0];
      if (it) return { code: code, product: String(it.title || '').trim(), brand: String(it.brand || '').trim() };
    }
  } catch (err) {
    console.log('Barcode lookup failed: ' + err);
  }
  return { code: code, product: '' };
}

/* ------------------------------------------------------------------ */
/* Setup, menu and key                                                 */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP_NAME)
    .addItem('Show app key and phone link', 'showKey')
    .addItem('Set web app link…', 'setWebAppUrl')
    .addItem('Set up / repair sheets', 'setup')
    .addSeparator()
    .addItem('Make a new app key', 'resetKey')
    .addToUi();
}

/** Safe to run more than once: adds missing tabs and columns, never removes data. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', ss.getId());
  Object.keys(SCHEMA).forEach(function (coll) { buildTab_(ss, SCHEMA[coll]); });
  const settings = ss.getSheetByName(SCHEMA.settings.sheet);
  if (settings && !settings.isSheetHidden()) settings.hideSheet();

  let key = props.getProperty('APP_KEY');
  if (!key) {
    key = newKey_();
    props.setProperty('APP_KEY', key);
  }
  folder_(['Receipts']); folder_(['Project photos']); folder_(['Inspiration']);
  readAll_(); // gives every existing row its ID

  const msg = APP_NAME + ' is set up.\n\nYour app key: ' + key +
    '\n\nNext: Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone). ' +
    'Then choose ' + APP_NAME + ' → Set web app link… and paste the link it gives you.';
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* run from the editor: see the log */ }
}

function showKey() {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('APP_KEY');
  const ui = SpreadsheetApp.getUi();
  if (!key) { ui.alert('Run "Set up / repair sheets" first.'); return; }
  const url = props.getProperty('WEB_APP_URL');
  if (!url) {
    ui.alert(APP_NAME,
      'App key: ' + key +
      '\n\nYour web app link isn\'t saved yet. Choose ' + APP_NAME + ' → Set web app link… and paste the ' +
      'Web app URL from Deploy → Manage deployments (it ends in /exec).',
      ui.ButtonSet.OK);
    return;
  }
  const phone = APP_SITE + '#api=' + encodeURIComponent(url) + '&key=' + key;
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px/1.5 Arial,sans-serif">' +
    '<p style="margin:0 0 6px"><b>App key:</b> <code>' + key + '</code></p>' +
    '<p style="margin:12px 0 6px">Open this link once on each phone. It connects the app to this sheet and remembers it.</p>' +
    '<input readonly style="width:100%;padding:6px;font:12px monospace" value="' + phone + '" onclick="this.select()">' +
    '<p style="margin:12px 0"><a href="' + phone + '" target="_blank">Open Flip Friend ↗</a></p>' +
    '<p style="margin:12px 0 4px;color:#555">Web app link (for typing in by hand):</p>' +
    '<input readonly style="width:100%;padding:6px;font:12px monospace" value="' + url + '" onclick="this.select()">' +
    '</div>').setWidth(480).setHeight(290);
  ui.showModalDialog(html, APP_NAME);
}

function setWebAppUrl() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const r = ui.prompt('Set web app link',
    'In Apps Script open Deploy → Manage deployments, copy the Web app URL (ends in /exec) and paste it here.',
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  saveWebAppUrl_(r.getResponseText());
  showKey();
}

function saveWebAppUrl_(text) {
  const url = String(text || '').trim().split(/[?#]/)[0];
  if (!/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/.test(url)) {
    throw new Error('That doesn\'t look like a web app link (it should end in /exec).');
  }
  PropertiesService.getScriptProperties().setProperty('WEB_APP_URL', url);
  return url;
}

function resetKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Make a new app key?', 'Phones using the old key will ask to reconnect.', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().setProperty('APP_KEY', newKey_());
  showKey();
}

function newKey_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function buildTab_(ss, sch) {
  const sh = ss.getSheetByName(sch.sheet) || ss.insertSheet(sch.sheet);
  const existing = sh.getLastColumn() > 0 ? headerMap_(sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], sch) : {};
  if (Object.keys(existing).length === 0) {
    sh.getRange(1, 1, 1, sch.cols.length).setValues([sch.cols.map(function (c) { return c[1]; })]);
  } else {
    sch.cols.forEach(function (c) {
      if (existing[c[0]] == null) sh.getRange(1, sh.getLastColumn() + 1).setValue(c[1]);
    });
  }
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold');
  return sh;
}
