# SDK של אוצריא — מה התוסף לא מנצל (הכנה ל-2.0)

נבדק מול `Otzaria/otzaria` (ענף ברירת המחדל, commit `2ae7fde`, 28.10.2026; `pubspec.yaml` = `0.9.98+99802`).
המקורות: `docs/plugin-sdk/API_REFERENCE.md` (התיעוד), `lib/plugins/models/plugin_api_catalog.dart`
(הרשימה המחייבת: 178 מתודות, הרשאה וגרסה מינימלית לכל אחת) ו-`lib/plugins/bridge/plugin_bridge_adapter.dart`
(המימוש). כל שם API ופרמטר כאן מופיע בקוד או בתיעוד; מה שלא נמצא — כתוב במפורש "אין".

> ⚠️ `minAppVersion` שלנו הוא `0.9.98`, וכלי האריזה של אוצריא **חוסם אריזה** של תוסף שקורא ל-API חדש
> מ-`minAppVersion`. יכולות שמסומנות 0.9.98.1 / 0.9.99 מחייבות העלאת `minAppVersion` (ואולי אינן עדיין בגרסה
> שיצאה — ה-pubspec עדיין 0.9.98).

## מה התוסף משתמש בו היום

`app.getTheme`, `app.getConnectivity`, `app.openUrl`, `library.findBooks`, `library.setProviderBooks`,
`reader.openBook`, `reader.openSearchTab`, `reader.getSelection`, `search.query`, `search.fullText`,
`network.fetchStream`, `storage.get/set`, `ui.showMessage`, `ui.print`, `ui.exportPdf`, `feedback.report`,
`plugin.openSelf`, `plugin.openOther`; אירועים: `plugin.boot`, `plugin.page_opened`, `theme.changed`,
`reader.selection_changed`, `reader.context_menu_item_clicked`, `reader.toolbar_item_clicked`, `app.command`,
`search.requested`, `ui.messageClicked`, `library.providerBook.openRequested`. במניפסט: `toolTab`, `background`,
`startup.contextMenuItems/toolbarItems/shortcuts/libraryBooks/searchDialogItems`, `activationEvents`, `keepAlive`.

הערה: ב-`library.setProviderBooks` התוסף שולח גם `tags` — השדה **מתעלמים ממנו** (`PluginLibraryBookEntry.parseList`
קורא רק `id`, `title`, `author`, `categoryPath`). לא מזיק, אבל גם לא משפיע על החיפוש.

## 1. האם `reader.openBook` מקבל הפניה לפסוק? — לא

הפרמטרים המדויקים (`plugin_bridge_adapter.dart`, `case 'openBook'`, והערת ה-spec שם):

| פרמטר | משמעות |
|---|---|
| `id` / `bookId` (או `title` הישן) / `bookUid` | זהות הספר — חובה אחד מהם (`_requireBookIdentity`). `bookUid` גובר על השאר. |
| `type`, `source` | אימות זהות (`"text"`/`"pdf"`…, `"library"`/`"user"`…); אי-התאמה → `false`. |
| `index` | אינדקס **שורה** 0-based (ב-PDF: עמוד). ברירת מחדל 0. |
| `searchQuery` | מחרוזת להדגשה/לתיבת החיפוש של הקורא. |
| `navigateToPositionIfReused` | אם הספר כבר פתוח בכרטיסייה — לנווט בה למיקום. |
| `openInSidePane` | לפתוח כחלונית לצד הספר הנוכחי (לא כרטיסייה חדשה). |
| `matchPages`, `matchedTerms` | ל-PDF / חיפוש חיצוני בלבד. |
| `external`, `reader` | ספר חיצוני / קורא טקסט משובץ — לא רלוונטי לנו. |

**אין** `ref`, `tocRef` או `heRef` ב-`openBook`. כדי לפתוח פסוק לפי הפניה יש שתי דרכים:

**א. `reader.openBookAtRef`** (הרשאה `reader.open`, מ-0.9.89; רמת פסוק מ-0.9.96) —
פרמטרים (`case 'openBookAtRef'`): `id?` / `bookId?` / `bookUid?`, `type?`, `source?`, **`ref`**, `index?` (גיבוי),
`highlight?` (ברירת מחדל `false` — רקע צהוב ליעד). אין בה `searchQuery` ואין `openInSidePane`.
סדר הפתירה במימוש:
1. `PluginRefLineResolver` — אינדקס `line_ref` לפי ה-heRef של כל שורה (רמת פסוק/סעיף). דורש לפחות שני רכיבים
   (`'לג:ה'`, `'לג, ה'`, `'פרק לג פסוק ה'`); רכיב אחד (`'לג'`) הוא רמת TOC בלבד.
2. מנוע `find_ref` (כמו "איתור מקורות") על `"<שם הספר> <ref>"`.
3. התאמה מקומית לתוכן העניינים.
4. לא נמצא — נפתח ב-`index`, וה-`ref` מועבר לתיבת החיפוש של הקורא.

```javascript
await call("reader.openBookAtRef", { bookId: "במדבר", ref: "לג:ה", highlight: true }); // → true
```

**ב. `library.resolveRef`** (הרשאה `library.books.read` — כבר יש לנו, מ-0.9.97) — `{ ref, limit? }`, בלי לפתוח.
מחזיר `[{ id, bookId, bookUid, type, title, reference, index, isPdf, isSourceLine, isUserBook, bookPath }]`
(`isSourceLine: true` = נפתר לשורת פסוק מדויקת). אחר כך `reader.openBook({ bookUid, index, searchQuery, openInSidePane })`
— כך אפשר לשלב פסוק מדויק **וגם** הדגשת המילה **וגם** חלונית צד, מה ש-`openBookAtRef` לבדה לא נותנת.

**ג. קישור `otzaria://` בדף התוסף** (בלי הרשאה, מ-0.9.97, רק בלחיצת משתמש):
`otzaria://open/book/<id>?index=<n>&mark` (רקע לסעיף) או `&m=<טקסט>` (הדגשת מילה בסעיף) או `&q=<טקסט>`;
ולהפניה טקסטואלית: `otzaria://open/detection?q=<הפניה>`. `Otzaria.linkify(el)` / `contributes.autoLinkify: true`
הופכים כתובות כאלה שבטקסט ללחיצות.

## 2. האם תוסף יכול לספק "קישורים"/"מפרש" לפסוק (שיופיע בחלונית המפרשים/הקישורים)? — לא ישירות

- **אין API כתיבה לקישורים.** כל ה-API של מפרשים וקישורים הוא קריאה בלבד (`library.links.read`):
  `library.getCommentators`, `library.getLinks`, `library.getRawLinks`, `library.getLinkTargetsSummary`,
  `library.getLinkContent`. בקטלוג (`plugin_api_catalog.dart`) אין מתודה שמוסיפה קישור או מפרש, ואין
  `contributes` מסוג "commentary"/"links provider".
- **`publishedData.upsert` עם `type: 'reference.link'`** (הרשאה `published_data.write`, `scope: 'book:<bookUid>'`)
  מתקבל ונשמר, אבל **שום רכיב באפליקציה לא קורא אותו**: הסוג היחיד שנצרך הוא `calendar.event`
  (`plugin_bridge_adapter.dart` ב-`_handlePublishedData`, ו-`plugin_calendar_adapter.dart`). לא יופיע בחלונית.
- **`library.setProviderBooks` / `startup.libraryBooks`** — ספרי התוסף מופיעים **רק באיתור הספרים של מסך הספרייה**.
  לפי התיעוד והמימוש הם "אינם נפתרים דרך `library.resolveBooks` או `reader.openBook`", ולכן גם אינם יכולים
  להיות יעד של קישור. לחיצה עליהם → האירוע `library.providerBook.openRequested` עם `{ provider, id, title, author }`
  (נמסר עם `preferBackground`: למנוע הרקע אם יש `app.run_on_startup`, אחרת נפתח דף התוסף), או `openAction`
  (פעולת host בלי מנוע: `reader.openBook`, `reader.openBookInSidePane`, `storage.set/remove`, `localService.post`,
  עם `$book.id/title/author/provider`). אין אירוע שמגיע מחלונית המפרשים.
- **הקרוב ביותר — פריט תפריט הקשר על מפרש:** מ-0.9.98.1 `contexts` של `reader.addContextMenuItem` /
  `startup.contextMenuItems` מקבל `reader-commentary` ו-`reader-commentary-selection` (לחיצה ימנית על מפרש בתצוגה
  הרגילה, בצורת הדף ובחלונית מפרשי PDF — **לא בלשונית הקישורים**). האירוע: `reader.context_menu_item_clicked`
  (או `openPlugin: true` / `action`); ב-payload המפרש הוא הספר הנוכחי (`currentBook`, `bookId`, `id`,
  `sectionIndex`, `currentRef`) והספר הנקרא ב-`selection.mainBook`. זה פריט תפריט, לא קישור ברשימה.
- **דרך עוקפת (לא נוסתה, כבדה):** קישורי-משתמש. אוצריא קולטת קובצי `<שם ספר>.links.csv` / `.links.json` /
  `<ספר>_links.json` מתיקיית ספרים אישית בכל סריקה (`UserSidecarSync`, `user_content_importer.dart`; עמודות CSV:
  `מקור, ספר_יעד, [מיקום_יעד], סוג, [יעד_אישי], [ספר_מקור], …`), ומציגה אותם גם בכיוון ההפוך בספר הרשמי
  (`user_links_loader.dart`: "כך מפרש-משתמש מופיע גם בספר הרשמי"). כלומר: לייצא את ספר הדקדוק כ**ספר אישי**
  (קובץ טקסט) לתיקייה שהמשתמשת אישרה (`fs.pickUserFolder` + `fs.beginBinaryWrite`/`fs.commitUserFileWrite`),
  לכתוב לידו קובץ קישורים לפסוקים, ולקרוא ל-`library.refreshUserBooks` (הרשאה `library.refresh`). הלחיצה תפתח
  את הספר האישי בקורא של אוצריא — **לא** את התוסף, ואין אירוע לתוסף. מחייב גם שהתיקייה מוגדרת כתיקיית ספרים אישיים.

## 3. יכולות רלוונטיות שלא מנוצלות

| יכולת | הרשאה / גרסה | מה עושה | איך הייתה משמשת בתוסף |
|---|---|---|---|
| `reader.openBookAtRef` | `reader.open` · 0.9.89 (פסוק 0.9.96) | פתיחה לפי הפניה, `highlight` | פתיחת פסוק מדויק מעינים למקרא / ממובאות במילון במקום חיפוש טקסט |
| `library.resolveRef` | `library.books.read` · 0.9.97 | הפניה → `bookUid`+`index` | אותו דבר עם `searchQuery` ו-`openInSidePane`; אימות הפניות לפני הצגתן |
| `reader.openBook` + `openInSidePane` | `reader.open` | פתיחה כחלונית צד | רד"ק / ספר הבחור / פסוק מהקונקורדנציה לצד הטקסט, בלי לעזוב אותו |
| `otzaria://` + `Otzaria.linkify` / `autoLinkify` | — · 0.9.97 | קישורים לחיצים בדף התוסף | מראי מקום בתוך ערכי המילון והדקדוק כקישורים ישירים |
| `tools.dictionary` | `tools.read` · 0.9.97 (`dictionaries` מ-0.9.99) | ראשי תיבות + מילוני ארמית מצורפים (פשיטא, שיח ישראל, אונקלוס, מושגים ואישים) | השלמה לר"ת שאינם במילון שלנו ולמילים ארמיות בתרגום |
| `reader.findTextOccurrences` + `reader.setHighlight` | `reader.open` · 0.9.95 / `reader.highlight` | איתור מופעים בסעיף והדגשה זמנית | הדגשת כל מופעי המילה/השורש בפסוק הפתוח |
| `library.getBookToc` | `library.content.read` · 0.9.89 | תוכן עניינים עם `index` | קפיצה ישירה לערך השורש בספר השרשים לרד"ק לפי TOC במקום חיפוש |
| `library.getBookContent` | `library.content.read` · 0.9.89 | עד 5000 תווים מספר | תצוגה מקדימה של ערך רד"ק בתוך התוסף (בכפוף ל-`library.getBookProtections`) |
| `library.getLinks` / `getCommentators` | `library.links.read` · 0.9.97 | קישורים ומפרשים לטווח שורות | "מה אומרים המפרשים" על הפסוק שבתוצאת הקונקורדנציה |
| `reader.getCurrentRef` + אירוע `reader.current_ref_changed` | `reader.open` / `events.subscribe:reader.current_ref_changed` | מיקום הקריאה | הקשר: הפסוק הנוכחי, סינון קונקורדנציה לספר הנקרא |
| `reader.registerExternalSearchProvider` + `searchDialogItems.resultsProvider` | `reader.open` · 0.9.97 | מדור תוצאות מהתוסף בתוך טאב החיפוש | תוצאות המילון/הדקדוק בתוך החיפוש של אוצריא במקום פתיחת דף התוסף |
| `searchDialogItems.resultsAction` | 0.9.99 | כפתור בטאב החיפוש שפותח את התוסף | "פתח בלשון הקודש" אחרי כל חיפוש, בלי לסמן מראש |
| `contexts: reader-commentary-selection` | `reader.context_menu` · 0.9.98.1 | פריט תפריט בבחירה בתוך מפרש | חיפוש מילה מתוך רש"י/רד"ק, לא רק מהטקסט הראשי |
| `contextMenuItems[].action` / `showWhen` | 0.9.97 | פעולת host בלי להעיר מנוע; פריט תלוי-תוכן | פעולות מהירות (שמירה למועדפים) בלי לטעון את התוסף |
| `events.setOptions` / `Otzaria.on(..., { rawDivineNames: true })` | 0.9.98.1 | טקסט הבחירה כפי שנשמר | זיהוי נכון של מילים כשהמשתמשת בחרה תצוגת "אלקים"/"ה'" (רק להשוואה, לא להצגה) |
| `plugin.setRestoreState` | 0.9.98.1 | מצב לשחזור אחרי טעינה מחדש | חזרה למילה/לשונית האחרונה אחרי פינוי הדף |
| `fs.writeFile` / `fs.readFile` (מרחב פרטי) | בלי הרשאה · 0.9.97 | קבצים פרטיים לתוסף | ספרי דקדוק מיובאים גדולים מחוץ ל-`storage` |
| `library.refreshUserBooks` + `fs.*` בתיקייה אישית | `library.refresh` · 0.9.97 | הוספת ספר אישי לספרייה | הדרך היחידה לקישורים בחלונית המפרשים (סעיף 2) |
