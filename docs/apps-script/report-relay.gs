/**
 * ממסר דיווחים: מייל "📩 דיווח חדש על התוסף" מאוצריא → Issue בריפו של התוסף בגיטהאב.
 * גרסה 2.4 (25.11.2026) — מחליף את כל הסקריפט הקודם. רץ כל 15 דקות.
 *
 * התקנה (פעם אחת):
 *  1. script.google.com → הפרויקט הקיים → מוחקים את כל הקוד ומדביקים את הקובץ הזה.
 *  2. ⚙ Project Settings → Script Properties → GH_TOKEN = הטוקן של גיטהאב (אותו טוקן שהיה בסקריפט הקודם).
 *  3. בוחרים בפונקציה setup בסרגל העליון → Run → מאשרים הרשאות. היא יוצרת טריגר של כל 15 דקות ותוויות בג'ימייל.
 *  4. בדיקה: בוחרים testOne → Run → ב-Execution log מופיע לאיזה ריפו היה הולך הדיווח האחרון (בלי ליצור Issue).
 */

// שם התוסף כפי שהוא מופיע במייל → ריפו (ותווית אופציונלית ב-Issue)
const REPOS = {
  'לשון הקודש':        { repo: 'Hadabadra/KLI-MULON' },
  'כליקודש':           { repo: 'Hadabadra/KLI-MULON' },
  'כיוון תפילה':       { repo: 'Hadabadra/Prayer-pointA' },
  'ברכת המזון':        { repo: 'Hadabadra/Prayer-pointA', label: 'ברכת-המזון' },
  'מקוואות':           { repo: 'Hadabadra/Mikvaot' },
  'גבולות עירוב':      { repo: 'Hadabadra/gvulot-eruv' },
  'טהרת כהנים':        { repo: 'Hadabadra/gvulot-eruv', label: 'טהרת-כהנים' },
  'עינים למקרא':       { repo: 'Hadabadra/madaei-hatanach' },
  'מצב קריאה':         { repo: 'Hadabadra/Reading-mode' },
  'צופה PDF+OCR':      { repo: 'Hadabadra/pdf-viewer' },
  'צופה PDF':          { repo: 'Hadabadra/pdf-viewer' },
  'ספריית PDF':        { repo: 'Hadabadra/pdf-ocr-library' },
  'סידורון':           { repo: 'Hadabadra/siduron_plugin' },
  'שומר מסך':          { repo: 'achat-shaalti/achat-shaalti', label: 'שומר-מסך' },
  'סייר קבצים':        { repo: 'achat-shaalti/achat-shaalti' },
  'הגדרות מערכת':      { repo: 'achat-shaalti/achat-shaalti' },
  'אחת שאלתי':         { repo: 'achat-shaalti/achat-shaalti' }
};
// לא in:inbox: מסנן בג'ימייל מעביר את הדיווחים לתווית "אוצריא" בלי תיבת הדואר. כפילויות נמנעות ב-DONE_IDS ובתווית הועבר-לגיט
const QUERY = 'from:community@otzaria.org subject:"דיווח חדש על התוסף" -label:הועבר-לגיט after:2026/11/15';
const DONE = 'הועבר-לגיט', UNMAPPED = 'דיווח-לא-מופה';

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('relay').timeBased().everyMinutes(15).create();
  [DONE, UNMAPPED].forEach(function (n) { if (!GmailApp.getUserLabelByName(n)) GmailApp.createLabel(n); });
  Logger.log('הוגדר: relay כל 15 דקות');
}

function token_() {
  const t = PropertiesService.getScriptProperties().getProperty('GH_TOKEN');
  if (!t) throw new Error('חסר GH_TOKEN ב-Script Properties');
  return t;
}

function field_(text, name) {
  const m = text.match(new RegExp(name + '\\s*:\\s*([^\\n]+)'));
  return m ? m[1].trim() : '';
}

function findRepo_(plugin) {
  if (REPOS[plugin]) return REPOS[plugin];
  const keys = Object.keys(REPOS).sort(function (a, b) { return b.length - a.length; });
  for (let i = 0; i < keys.length; i++) if (plugin.indexOf(keys[i]) >= 0) return REPOS[keys[i]];
  return null;
}

function parse_(msg) {
  // המייל מסמן שדות בכוכביות (*שם התוסף:* …). כתובת המדווח נשמרת ב-Issue כדי שאפשר יהיה לחזור אליו (Issue ציבורי)
  const text = msg.getPlainBody().replace(/\r/g, '').replace(/\*/g, '');
  const reporter = field_(text, 'כתובת למענה');
  const plugin = field_(text, 'שם התוסף') || msg.getSubject().replace(/^.*התוסף:\s*/, '').trim();
  const version = field_(text, 'גרסת התוסף'), kind = field_(text, 'סוג הדיווח'), otz = field_(text, 'גרסת אוצריא');
  let body = text;
  const start = body.search(/(תוכן הדיווח|פרטי הדיווח)\s*:/);
  if (start >= 0) body = body.slice(start);
  body = body.replace(/\n*(אין להשיב למייל זה|ספריית אוצריא ©|מעבר לדף התוסף|הדיווח נשלח על ידי משתמש)[\s\S]*$/, '').replace(/^(תוכן הדיווח|פרטי הדיווח)\s*:\s*/, '').replace(/\n{3,}/g, '\n\n').trim();
  return { plugin: plugin, version: version, kind: kind, otz: otz, body: body, date: msg.getDate(), reporter: reporter };
}

function createIssue_(target, r) {
  const first = (r.body.split('\n').filter(function (l) { return l.trim() && !/:\s*$/.test(l); })[0] || '').replace(/^[^:]*:\s*/, '').slice(0, 70);
  const title = '[דיווח] ' + r.plugin + (r.version ? ' ' + r.version : '') + (r.kind ? ' · ' + r.kind : '') + (first ? ': ' + first : '');
  const md = '**דיווח ממשתמש דרך אוצריא** (' + Utilities.formatDate(r.date, 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm') + ', הועבר אוטומטית מהמייל)\n' +
    '- תוסף: ' + r.plugin + (r.version ? ' ' + r.version : '') + ' · סוג: ' + (r.kind || '—') + ' · אוצריא: ' + (r.otz || '—') + '\n' +
    (r.reporter ? '- למענה: ' + r.reporter + '\n' : '') + '\n### תוכן הדיווח\n' + r.body;
  const payload = { title: title, body: md };
  if (target.label) payload.labels = [target.label];
  const res = UrlFetchApp.fetch('https://api.github.com/repos/' + target.repo + '/issues', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token_(), Accept: 'application/vnd.github+json' },
    payload: JSON.stringify(payload)
  });
  if (res.getResponseCode() >= 300) throw new Error(target.repo + ': ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText()).number;
}

function doneIds_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('DONE_IDS') || '[]'); } catch (e) { return []; } }
function saveDone_(ids) { PropertiesService.getScriptProperties().setProperty('DONE_IDS', JSON.stringify(ids.slice(-400))); }

function relay() {
  const ids = doneIds_();
  const done = GmailApp.getUserLabelByName(DONE) || GmailApp.createLabel(DONE);
  const unmapped = GmailApp.getUserLabelByName(UNMAPPED) || GmailApp.createLabel(UNMAPPED);
  const threads = GmailApp.search(QUERY, 0, 30);
  threads.forEach(function (th) {
    let ok = true, any = false;
    th.getMessages().forEach(function (m) {
      if (m.getFrom().indexOf('community@otzaria.org') < 0 || ids.indexOf(m.getId()) >= 0) return;
      const r = parse_(m), target = findRepo_(r.plugin);
      if (!target) { ok = false; return; }
      try { const n = createIssue_(target, r); any = true; ids.push(m.getId()); Logger.log(r.plugin + ' → ' + target.repo + ' #' + n); }
      catch (e) { ok = false; Logger.log('שגיאה: ' + e.message); }
    });
    if (ok && any) { th.addLabel(done); th.removeLabel(unmapped); th.moveToTrash(); /* מייל שהועבר נמחק (נשאר באשפה 30 יום) */ }
    else if (!ok) th.addLabel(unmapped);
  });
  saveDone_(ids);
}

/** בדיקה בלי ליצור Issue: מה היה קורה לדיווח האחרון */
function testOne() {
  const th = GmailApp.search('from:community@otzaria.org subject:"דיווח חדש על התוסף"', 0, 1)[0];
  if (!th) { Logger.log('אין דיווחים'); return; }
  const r = parse_(th.getMessages().pop()), t = findRepo_(r.plugin);
  Logger.log('תוסף: ' + r.plugin + ' → ' + (t ? t.repo : 'לא מופה (צריך להוסיף ל-REPOS)'));
  Logger.log(r.body.slice(0, 500));
}
