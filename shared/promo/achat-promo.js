/* רכיב משותף: המלצה על "אחת שאלתי" — גרסה 1.3.0
 * מקור יחיד: Hadabadra/Mikvaot shared/promo/ — כל תוסף מעתיק את שני הקבצים כמו שהם (ראו README.md).
 * אין לשנות את הקובץ בתוך תוסף; שינוי נעשה כאן, ומועתק לכל התוספים.
 * צבעים רק דרך אסימוני :root של אוצריא, מידות ב-em בלבד (achat-promo.css).
 */
(function (root) {
  "use strict";
  var VERSION = "1.3.0";
  var KEY = "achatPromo";                 /* מפתח ב-storage של התוסף */
  var WEEK = 7 * 24 * 3600 * 1000, DAY = 24 * 3600 * 1000;
  var DEF = {
    title: "אחת שאלתי",
    text: "רוצים ללמוד בלי להתפזר? 'אחת שאלתי' – הופך את המחשב לאוצריא ו-Word בלבד.",
    /* פוסט ההסבר והורדה של "אחת שאלתי" בפורום אוצריא (נושא 2777) */
    forumUrl: "https://otzaria.org/forum/topic/2777/%D7%9C%D7%94%D7%95%D7%A8%D7%93%D7%94-%D7%90%D7%97%D7%AA-%D7%A9%D7%90%D7%9C%D7%AA%D7%99-%D7%AA%D7%95%D7%9B%D7%A0%D7%AA-%D7%97%D7%A1%D7%99%D7%9E%D7%94-%D7%A7%D7%99%D7%95%D7%A1%D7%A7-%D7%9C%D7%9E%D7%97%D7%A9%D7%91-%D7%9C%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%91%D7%9C%D7%91%D7%93/41",
    downloadUrl: "https://github.com/achat-shaalti/achat-shaalti/releases",
    author: "חד בדרא ויאיר דניאל"  /* 1.3.0: כמו בפוסט הרשמי (נושא 2777) */
  };
  var cfg = null, st = { show: true, first: 0, last: 0, opens: 0 }, loaded = false, online = null, inst = null;
  /* 1.2.0: זיהוי "אחת שאלתי" מותקן — בדיקת /health של הגשר (127.0.0.1:47917-47921).
     עובד רק בתוסף עם הרשאת network.localhost ו-127.0.0.1/localhost ב-network.allowlist; אחרת "לא ידוע" ולא קורה כלום. */
  async function installed() {
    if (inst !== null) return inst;
    if (cfg.isInstalled) { try { return (inst = !!(await cfg.isInstalled())); } catch (e) { return (inst = false); } }
    var O = root.Otzaria, isIt = function (x) { return x && typeof x[Symbol.asyncIterator] === "function"; };
    if (!O || !O.call) return (inst = false);
    for (var p = 47917; p <= 47921; p++) {
      try {
        var it = O.call("network.fetchStream", { url: "http://127.0.0.1:" + p + "/health", method: "GET", headers: { "X-Otzaria-Bridge": "1" }, timeoutMs: 1200 });
        if (!isIt(it) && it && it.then) it = await it; if (!isIt(it) && it && isIt(it.data)) it = it.data; if (!isIt(it)) continue;
        var t = ""; for await (var c of it) { if (c && typeof c.body === "string" && c.type !== "response") t += c.body; }
        var j = JSON.parse(t); if (j && j.ok && j.data && j.data.name === "otzaria-bridge") return (inst = true);
      } catch (e) {}
    }
    return (inst = false);
  }
  var POST = "<h1><strong>אחת שאלתי - מחשב לימוד לאוצריא, בלי הסחות ומפריעים</strong></h1><p>ברוך ה', לאחר ש <a href=\"https://otzaria.org/forum/user/%D7%97%D7%93-%D7%91%D7%93%D7%A8%D7%90\">@חד-בדרא</a> יצר בסיס רחב ומדוייק, ולאחר עבודה מאומצת של שנינו, אנו שמחים להגיש לציבור יראי ה' את התוכנה \"אחת שאלתי\" = תוכנה לחסימת המחשב ללימוד בלבד, עם כמה רמות חסימה, מלא אפשרויות ופונקציות, ועוד ועוד.</p><p><strong>אחת שאלתי</strong> היא תוכנה ל-Windows שהופכת מחשב רגיל ל<strong>עמדת לימוד</strong> שבה אפשר להשתמש <strong>רק</strong> באוצריא ולא בשום דבר אחר - בלי גלישה, בלי משחקים ובלי תוכנות אחרות. התוכנות היחידות שהמנהל אישר מראש הם אלו שיכולות להיפתח.</p><p>מתאימה ל:</p><ul><li><p><strong>בית מדרש</strong> — עמדות לימוד פנויות לכל מי שנכנס.</p></li><li><p><strong>בית כנסת</strong> — מחשב שנועד לספרייה התורנית ולא לשום דבר אחר.</p></li><li><p><strong>בית</strong> — מחשב לילד או לתלמיד, בלי צורך לפקח עליו כל הזמן (או לעצמך... אל תביאנו לא לידי נסיון ולא לידי בזיון...)</p></li></ul><hr /><p>איך זה עובד?</p><ul><li>מורידים את התוכנה מהקישור הבא (הורדה ישירה)</li></ul><h5><strong><a href=\"https://github.com/e0548433917-gif/achat-shaalti/releases/download/v1.0.0/OtzariaBridge-Setup-1.0.0.exe\">אחת שאלתי - חסימת המחשב ללימוד בלבד</a></strong></h5><ul><li><p>מפעילים = המתקין מתקין את הגשר, מגדיר הפעלה אוטומטית עם Windows, ופותח באוצריא את התקנת שני התוספים.</p></li><li><p>בפעם הראשונה כל תוסף מבקש אישור חיבור — מאשרים.</p></li></ul><hr /><ul><li><p><strong>ההתקנה מוסיפה לאוצריא שלושה חלקים שעובדים יחד:</strong></p></li><li><p><strong>הגשר</strong> (OtzariaBridge.exe) — תוכנה קטנה שרצה ברקע, מאזינה <strong>רק למחשב המקומי</strong> ולא שולחת מידע החוצה. היא מפעילה את מצב הנעילה ונותנת לתוספים גישה לקבצים ולהגדרות.</p></li><li><p><strong>תוסף \"סייר קבצים\"</strong> — מנהל קבצים בתוך אוצריא.</p></li><li><p><strong>תוסף \"הגדרות מערכת\"</strong> — הגדרות Windows בתוך אוצריא, כולל שליטה במצב הנעילה.</p></li></ul><hr /><h2><strong>מצב נעילה</strong></h2><ul><li><p>המחשב נעול לאוצריא במסך מלא, עם שורת תוכנות שאושרו ע\"י המנהל - בסרגל בצד + שעון מרחף בצד המסך.</p></li><li><p><strong>רק</strong> תוכנות שהמנהל אישר פתוחות לשימוש (למשל וורד, אוצריא, כתבי הקודש וכדו').</p></li><li><p><strong>תזמון נעילה</strong> לפי שעות, עם כמה חלונות זמן ביום.</p></li><li><p><strong>פתיחה זמנית</strong> של המחשב בסיסמה נפרדת.</p></li><li><p><strong>נעילה רגילה</strong> חוסמת מקשים כמו Alt+Tab ומנהל המשימות, ומגבילה את סייר הקבצים לתיקיות מאושרות.</p></li><li><p><strong>נעילה מוקשחת</strong> (אופציונלית, מומלצת): רכיב שירות שרץ ברמת המערכת, שומר על ההגדרות מעריכה, מונע סגירה של הגשר ומגן גם בחשבון Windows אחר.</p></li><li><p><strong>אימות דו-שלבי עם Windows Hello</strong> לפעולות רגישות: ביטול נעילה, שינוי סיסמה, שינוי הגדרות ועוד.</p></li><li><p><strong>הקשחת BIOS/UEFI</strong>: ניסיון אוטומטי מתוך התוכנה, וכפתור הדרכה ידנית לכל היצרנים.</p></li><li><p>דיאלוגי \"פתיחת קובץ\" של Windows נאכפים באותה מדיניות תיקיות וסיומות.</p></li></ul><p><strong>איך מפעילים?</strong></p><ul><li><p>בוחרים <strong>סיסמה</strong> ושומרים <strong>קוד שחזור</strong> בהפעלה הראשונה.</p></li><li><p>שכחתם סיסמה? <strong>קוד שחזור</strong>, או <strong>קיצור חירום: Ctrl + Alt + Shift + F12</strong> (במחשבים רבים גם עם Fn).</p></li></ul><h2><strong>שומר מסך</strong></h2><p>כשהמחשב לא בשימוש, אפשר להגדיר שיהיה שומר מסך - עם  מלא אפשריות:</p><ul><li><p>פסוק</p></li><li><p>שעה ותאריך עברי</p></li><li><p>זמני היום</p></li><li><p>הקדשה לעילוי נשמה</p></li><li><p>כיתוב אישי (כמו שם בית הכנסת לדוגמא)</p></li><li><p>אפשר להשתמש בשומר המסך גם כתמונת מסך הנעילה של Windows.</p></li></ul><h2><strong>תוספים:</strong></h2><h3><strong>תוסף \"הגדרות מערכת\"</strong></h3><p>(הגדרות Windows מתוך אוצריא)</p><ul><li><p>מסך, שמע, חשמל וסוללה, שעה ותאריך;</p></li><li><p>מקלדת, עכבר, מדפסות, התקני USB, בלוטות׳;</p></li><li><p>Wi-Fi ומצב טיסה;</p></li><li><p><strong>חיפוש הגדרה</strong>, ותפריטים נפתחים (למשל זמני כיבוי מסך ושינה, ותוכנית צריכה);</p></li><li><p>לשוניות נוספות ללימוד ולנעילה: <strong>תוכנות לימוד</strong>, <strong>מצב נעילה</strong>, <strong>נעילת סייר הקבצים</strong>, <strong>שומר מסך</strong>, <strong>אודות</strong>.</p></li></ul><h3><strong>תוסף \"סייר קבצים\"</strong></h3><ul><li><p>סייר הקבצים בסגנון סייר הקבצים של ווידנוס - נותן את המראה המוכר - בתוך אוצריא</p></li><li><p>מצבי תצוגה שונים, חיפוש בקבצים ובתוכן הקבצים</p></li><li><p>צפייה ב-<strong>PDF, Word, טקסט ותמונות</strong>;</p></li><li><p>העתקה, העברה, מחיקה, שינוי שם, וסל מיחזור;</p></li><li><p>כשהנעילה (האפשרית, לא חובה) פעילה =  רק התיקיות שהמנהל אישר.</p></li></ul><h3><strong>הגשר בשורת המשימות</strong></h3><ul><li><p>אודות ועדכונים, יומן שינויים</p></li><li><p>דיווחים:אילו לוגים נשלחו מהתוכנה, עריכה והוספת תיאור ללוגים - לשליחה;</p></li><li><p><strong>צימוד תוספים</strong> — כל תוסף מבקש אישור בפעם הראשונה, ורק מה שאושר מתחבר;</p></li><li><p>התקנה/עדכון התוספים באוצריא ופתיחת תיקיית התוספים;</p></li><li><p><strong>צילום מסך</strong> (Ctrl+Shift+F11) ו<strong>צילום אזור</strong> (Ctrl+Shift+F12);</p></li><li><p>אייקון שקוף במחשב  ( - בדומה לסמל של וויפרי) סמל קטן ברקע בפינה (גודל ומיקום לבחירה);</p></li><li><p>ממשק בעברית ובאנגלית.</p></li></ul><p><strong><a href=\"https://github.com/e0548433917-gif/achat-shaalti\">מאגר הגיטאב של התוסף</a></strong></p><hr /><h4><strong>כמה דברים שחשוב לדעת:</strong></h4><p>אין הגנת תוכנה \"בלתי שבירה\". מי שיש לו גישה פיזית למחשב, הרשאות מנהל ב-Windows וידע מתקדם יכול תיאורטית לעקוף כל הגנה שמבוססת על תוכנה בלבד.</p><p>לכן מומלץ:</p><ul><li><p>להגדיר למשתמש חשבון Windows <strong>רגיל</strong> (לא מנהל);</p></li><li><p>להפעיל <strong>נעילה מוקשחת</strong>;</p></li><li><p>להקשיח גם את ה-<strong>BIOS/UEFI</strong> (סיסמה, חסימת אתחול מ-USB);</p></li><li><p>לדרוש <strong>Windows Hello</strong> לפעולות רגישות.</p></li></ul><p>הנעילה הרגילה מגינה היטב מפני שימוש אקראי, אבל משתמש טכני ונחוש יכול למצוא דרכים לעקוף אותה. התוכנה נבדקה בפועל על כמה מחשבי Windows.</p><p><strong>פרטים נוספים בספויילר:</strong></p><p><strong>רישיון:</strong> <a href=\"https://github.com/e0548433917-gif/achat-shaalti/blob/main/LICENSE\">PolyForm Noncommercial 1.0.0</a> — קוד פתוח לשימוש אישי ולא-מסחרי (גרסאות עד 3.7.0 תחת MIT).</p><p><strong>קרדיטים:</strong> חישוב זמני היום בשומר המסך משתמש בספריית <a href=\"https://www.nuget.org/packages/Zmanim\">Zmanim</a> (פורט של KosherJava) ברישיון LGPL-2.1.</p><p><strong>פרטיות:</strong> התקשורת של הגשר היא מקומית בלבד.</p><p><strong>פיתוח:</strong> חד בדרא, יאיר דניאל</p><p>תמונות יעלו עוד מעט בספויילר.</p><h2><strong><a href=\"https://otzariausercontent.serveftp.com/forum/assets/uploads/files/1792606778786-achat-shaalti-demo-forum.mp4\">לחצו כאן לסרטון קצר (מעודכן) על התוכנה</a></strong></h2><p>לעילוי נשמת הנערה הצדקנית <strong>אסתר גיטה דינר בת רבי מיכאל שלום הלוי שיבדלט\"א</strong> — תנצב\"ה.</p><p>הערות, באגים והצעות — יתקבלו בברכה כאן בשרשור</p>";
  var HAPPY = '<p class="ap-happy">אשריך! "אחת שאלתי" כבר מותקן במחשב הזה.</p>';

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  async function call(m, p) { try { var r = await cfg.call(m, p || {}); return r || { success: false }; } catch (e) { return { success: false }; } }
  async function load() {
    if (loaded) return st;
    var r = await call("storage.get", { key: KEY }), d = r && r.success ? r.data : null;
    if (typeof d === "string") try { d = JSON.parse(d); } catch (e) { d = null; }
    if (d && typeof d === "object") st = Object.assign(st, d);
    loaded = true; return st;
  }
  function save() { return call("storage.set", { key: KEY, value: st }); }
  async function isOnline() {
    if (cfg.isOnline) try { return !!(await cfg.isOnline()); } catch (e) { return false; }
    var r = await call("app.getConnectivity", {});
    return !(r.success && r.data && r.data.isOfflineMode); /* מוסתר רק במצב "ללא גישה לאינטרנט" של אוצריא */
  }
  async function openUrl(u) {
    var r = await call("app.openUrl", { url: u });
    if (!r || r.success === false) call("ui.showMessage", { message: "לא ניתן לפתוח את הקישור. הוא הועתק — אפשר להדביק בדפדפן." }), copy(u);
  }
  function copy(t) { try { navigator.clipboard.writeText(t); } catch (e) { var x = document.createElement("textarea"); x.value = t; document.body.appendChild(x); x.select(); try { document.execCommand("copy"); } catch (e2) {} x.remove(); } }

  /* 1.1.0: קובץ HTML קטן עם קישורים לחיצים והסבר מסודר, להעברה למחשב מחובר (fileText נשאר לתאימות) */
  function fileText() {
    var L = cfg.links || {}, nl = "\r\n";
    return ["אחת שאלתי – ללמוד בלי להתפזר", "", "הסבר: " + cfg.forumUrl, "הורדה: " + cfg.downloadUrl, "", "נשמר מתוך התוסף \"" + (cfg.plugin || "") + "\" לאוצריא." + (L.gh ? nl + "GitHub: " + L.gh : "") + (L.store ? nl + "חנות התוספים: " + L.store : "")].join(nl) + nl;
  }
  function fileHtml() {
    var L = cfg.links || {}, a = function (u, t) { return '<a href="' + esc(u) + '">' + esc(t) + "</a>"; };
    return '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>אחת שאלתי – הסבר והורדה</title>'
      + "<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:40em;margin:2em auto;padding:0 1em;line-height:1.7;color:#2b2622;background:#faf7f2}h1{font-size:1.6em;margin:.2em 0}"
      + ".card{background:#fff;border-radius:1em;padding:1.2em 1.4em;box-shadow:0 .2em 1em rgba(0,0,0,.08);margin:1em 0}a.btn{display:inline-block;margin:.3em 0 .3em .6em;padding:.6em 1.2em;border-radius:2em;background:#8a5a2b;color:#fff;text-decoration:none;font-weight:700}"
      + "a.btn.sec{background:#efe6da;color:#5a3d1e}ol,ul{padding-inline-start:1.3em}.card h1{font-size:1.3em}.card a{color:#8a5a2b}li{margin:.25em 0}small{color:#776c62}</style></head><body>"
      + "<h1>אחת שאלתי – ללמוד בלי להתפזר</h1><p><small>מאת " + esc(cfg.author) + "</small></p>"
      /* 1.3.0: הפוסט הרשמי של יאיר דניאל בפורום, מועתק כמו שהוא (מקור: achat-shaalti docs/FORUM_POST_YAIR.md) */
      + '<p><a class="btn" href="' + esc(cfg.downloadUrl) + '">להורדת הגרסה העדכנית ↗</a><a class="btn sec" href="' + esc(cfg.forumUrl) + '">לפוסט בפורום אוצריא ↗</a></p>'
      + '<div class="card">' + POST + '</div>'
      + '<p><small>נשמר מתוך התוסף "' + esc(cfg.plugin || "") + '" לאוצריא' + (L.gh ? " · " + a(L.gh, "הורדת התוסף מ-GitHub") : "") + (L.store ? " · " + a(L.store, "בחנות התוספים של אוצריא") : "") + "</small></p></body></html>";
  }
  function saveFile() {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([fileHtml()], { type: "text/html;charset=utf-8" }));
    a.download = "אחת שאלתי - הסבר וקישורים להורדה.html"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    call("ui.showMessage", { message: "הקובץ נשמר בתיקיית ההורדות. פתחו אותו במחשב מחובר — הקישורים לחיצים" });
  }
  var STAMP = '<svg class="ap-stamp" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="7.6" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="1.2 1.1"/><path d="M8.6 8.2h6.8M9.4 8.4l5.4 7.6M14.6 8.4c.5 2.2-.3 3.6-2 4.2M9.6 15.8c-.4-1.9.2-3.1 1.5-3.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  function actions(on, withNever) {
    return (on
      ? '<button type="button" class="ap-btn ap-pri" data-ap="dl">להורדה ↗</button><button type="button" class="ap-btn" data-ap="forum">להסבר בפורום ↗</button><button type="button" class="ap-btn" data-ap="file">שמור דף הסבר</button>'
      : '<button type="button" class="ap-btn ap-pri" data-ap="file">שמור דף הסבר וקישורים</button>')
      + (withNever ? '<button type="button" class="ap-link" data-ap="never">אל תציג שוב</button>' : "");
  }
  function wire(el, onClose) {
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-ap]"); if (!b) return; var a = b.getAttribute("data-ap");
      if (a === "dl") openUrl(cfg.downloadUrl);
      else if (a === "forum") openUrl(cfg.forumUrl);
      else if (a === "file") saveFile();
      else if (a === "never") { st.show = false; save(); if (onClose) onClose(); call("ui.showMessage", { message: "לא יוצג שוב. אפשר להחזיר בהגדרות ← \"הצג המלצות\"" }); }
      else if (a === "close" && onClose) onClose();
    });
  }

  var AchatPromo = {
    VERSION: VERSION,
    /* opts: { call, plugin, links:{gh,store}, isOnline?, forumUrl?, downloadUrl? } */
    init: function (opts) {
      cfg = Object.assign({}, DEF, opts || {});
      if (typeof cfg.call !== "function") throw new Error("AchatPromo: call חסר");
      load(); return AchatPromo;
    },
    /* לקרוא בפתיחת התוסף מתפריט הכלים (לא בכניסה מבחירת מילה). מציג לכל היותר פעם בשבוע, לא ביום הפתיחה הראשונה */
    maybeShow: async function () {
      if (!cfg) return false; await load(); var now = Date.now();
      st.opens = (st.opens || 0) + 1; if (!st.first) st.first = now;
      var due = st.show !== false && now - st.first >= DAY && st.opens >= 2 && now - (st.last || 0) >= WEEK && !document.querySelector(".ap-pop");
      if (due) st.last = now; save();
      if (due && await installed()) due = false;   /* 1.2.0: מותקן — לא מציקים בהמלצה */
      if (due) AchatPromo.show();
      return due;
    },
    show: async function () {
      if (!cfg || document.querySelector(".ap-pop")) return;
      var on = await isOnline(), has = await installed(), el = document.createElement("aside");
      el.className = "ap-pop"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", cfg.title);
      el.innerHTML = '<button type="button" class="ap-x" data-ap="close" aria-label="סגירה">✕</button>'
        + '<div class="ap-head">' + STAMP + '<b>' + esc(cfg.title) + '</b><span class="ap-tag">המלצה</span></div>'
        + (has ? HAPPY : '<p class="ap-text">' + esc(cfg.text) + '</p>') + '<p class="ap-by">מאת ' + esc(cfg.author) + '</p>'
        + (on ? "" : '<p class="ap-note">אוצריא במצב "ללא גישה לאינטרנט" — אפשר לשמור קובץ קצר עם ההסבר והקישורים ולהעבירו למחשב מחובר.</p>')
        + '<div class="ap-acts">' + actions(on, true) + '</div>';
      var close = function () { el.classList.add("ap-out"); setTimeout(function () { el.remove(); }, 220); document.removeEventListener("keydown", key); };
      var key = function (e) { if (e.key === "Escape") close(); };
      wire(el, close); document.addEventListener("keydown", key); document.body.appendChild(el);
    },
    /* שורה קבועה ב"אודות" (תמיד מוצגת, בלי תלות במתג). אחרי הצבת ה-HTML לקרוא AchatPromo.bind(container) */
    aboutHtml: function () {
      return '<section class="ap-about" data-ap-about>' + STAMP + '<div><b>' + esc(cfg ? cfg.title : DEF.title) + '</b> — ' + 'הופך את המחשב לאוצריא ו-Word בלבד, כדי ללמוד בלי להתפזר.' + '<div class="ap-acts" data-ap-acts></div></div></section>';
    },
    /* שורת מתג להגדרות: <label> עם checkbox id="ap-sw" */
    settingsHtml: function () {
      return '<label class="ap-set"><span>הצג המלצות<small>הודעה קטנה על "אחת שאלתי", לכל היותר פעם בשבוע</small></span><input type="checkbox" id="ap-sw"' + (st.show !== false ? " checked" : "") + '></label>';
    },
    bind: async function (container) {
      if (!cfg || !container) return; await load();
      var sw = container.querySelector("#ap-sw");
      if (sw) { sw.checked = st.show !== false; sw.onchange = function () { st.show = sw.checked; if (sw.checked) st.last = Date.now(); save(); }; }
      var ab = container.querySelector("[data-ap-acts]");
      if (ab && !ab.dataset.wired) { ab.dataset.wired = "1"; ab.innerHTML = (await installed() ? HAPPY : "") + actions(await isOnline(), false); wire(ab); }
    },
    isInstalled: function () { return cfg ? installed() : Promise.resolve(false); },
    isEnabled: function () { return st.show !== false; },
    fileText: function () { return cfg ? fileText() : ""; },
    fileHtml: function () { return cfg ? fileHtml() : ""; }
  };
  root.AchatPromo = AchatPromo;
})(typeof window !== "undefined" ? window : this);
