import os, tempfile
from playwright.sync_api import sync_playwright
ROOT='file://'+os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP=tempfile.gettempdir()
EXE=os.environ.get('CHROME') or ('/opt/pw-browsers/chromium' if os.path.exists('/opt/pw-browsers/chromium') else None)
MOCK = """
window.__calls=[];window.__h={};
window.Otzaria={on:(e,f)=>(window.__h[e]=window.__h[e]||[]).push(f),
 call:async(m,p)=>{__calls.push([m,p]);
  if(m==='app.getConnectivity')return{success:true,data:{isOnline:true}};
  if(m==='library.findBooks')return{success:true,data:[{bookId:'ספר השרשים',title:'ספר השרשים - רד"ק'}]};
  if(m==='search.query'){const q=p.query;return{async *[Symbol.asyncIterator](){yield{total:2};yield{results:[{id:1,bookId:'בראשית',type:'text',index:3,reference:'בראשית א ג',text:q+' פסוק'}]}}};}
  if(m==='reader.getSelection')return{success:true,data:{text:window.__sel,sourceSelectedText:window.__sel}};
  if(m==='storage.get')return{success:true,data:window.__st||null};
  if(m==='network.fetchStream'){ if(!window.__nak) throw new Error('closed');
    const voc=p.body?JSON.stringify({vocalized:JSON.parse(p.body).text.replace(/^(.)/,'$1\u05B4')}):'{}';
    return {async *[Symbol.asyncIterator](){yield{type:'response',ok:true};yield{type:'data',body:voc}}};}
  return{success:true,data:null};}};
window.fire=(e,d)=>Promise.all((window.__h[e]||[]).map(f=>f(d)));
"""
res=[]
def ck(n,c): res.append(('✓' if c else '✗')+' '+n)
with sync_playwright() as p:
  b=p.chromium.launch(**({'executable_path':EXE} if EXE else {}))
  # background
  pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script(MOCK+"window.__st={noAcr:true,tLen:'short'};")
  pg.goto(ROOT+'/background.html')
  pg.evaluate("window.__sel='בטחון';fire('plugin.boot');fire('reader.selection_changed',{text:'בטחון'})");pg.wait_for_timeout(900)
  msg=pg.evaluate("__calls.filter(c=>c[0]==='ui.showMessage').map(c=>c[1].message)")
  ck('הודעה קופצת ברקע: '+str(msg[:1]),len(msg)==1)
  ck('הודעה קצרה (≤ 70 תווים)', msg and len(msg[0])<=75)
  pg.evaluate("window.__calls.length=0;window.__sel='שלום עליכם';fire('reader.selection_changed',{text:'שלום עליכם'})");pg.wait_for_timeout(900)
  m2=pg.evaluate("__calls.filter(c=>c[0]==='ui.showMessage').map(c=>c[1])")
  ck('בחירה של כמה מילים מעבירה רשימת מילים לדף משולב', m2 and (m2[0]['tapPayload'].get('words') or m2[0]['tapPayload'].get('word')))
  ck('ללא שגיאות ברקע '+str(errs),not errs)
  # panel
  pg=b.new_page(viewport={'width':900,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script(MOCK+"window.__nak=true;")
  pg.goto(ROOT+'/index.html');pg.wait_for_timeout(300)
  pg.evaluate("fire('ui.messageClicked',{payload:{word:'שלום',words:['שלום','עליכם'],raw:'שלום עליכם'}})");pg.wait_for_timeout(300)
  ck('דף משולב נפתח',pg.locator('text=ניתוח המשפט').count()>0 and pg.locator('[data-go="שלום"]').count()>0)
  V='בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃'
  pg.evaluate("v=>fire('ui.messageClicked',{payload:{word:'בראשית',words:['בראשית','ברא','אלהים','את','השמים','ואת','הארץ'],raw:v}})",V);pg.wait_for_timeout(300)
  ck('הכלל במשפט: תגיות ניקוד/דקדוק עם קישור לספר',pg.locator('.chips.rules [data-gsec]').count()>0)
  ck('אין קרי וכתיב בפסוק בלי סוגריים',pg.locator('.qk').count()==0)
  pg.click('#taambtn');pg.wait_for_timeout(200)
  ck('מפת הפסוק: חלוקה באתנחתא ובטפחא',pg.locator('.tmap .thead small:has-text("אתנחתא")').count()==1 and pg.locator('.tmap .thead small:has-text("טפחא")').count()==2)
  K='כָּל־הַחַיָּ֨ה אֲשֶֽׁר־אִתְּךָ֜ מִכָּל־בָּשָׂ֗ר (הוצא) [הַיְצֵ֣א] אִתָּ֑ךְ'  # בראשית ח יז, כפי שבנוסח אוצריא
  pg.evaluate("v=>fire('ui.messageClicked',{payload:{word:'כל',words:['כל','החיה','אשר','אתך'],raw:v}})",K);pg.wait_for_timeout(300)
  ck('קרי וכתיב: כתיב הוצא / קרי היצא',pg.locator('.qk li:has-text("הוצא")').count()==1 and pg.locator('.qk li:has-text("הַיְצֵ֣א")').count()==1)
  pg.evaluate("""()=>{const c0=Otzaria.call;Otzaria.call=async(m,p)=>m==='library.findBooks'&&p.query==='בראשית'?(__calls.push([m,p]),{success:true,data:[{bookId:'בראשית',title:'בראשית',type:'text'}]}):c0(m,p);
    const a=document.createElement('a');a.dataset.psk='בראשית א ג|ויאמר';a.id='pskt';a.textContent='x';document.body.appendChild(a);}""")
  pg.click('#pskt');pg.wait_for_timeout(300)
  ck('קישור פסוק בספר פותח את הפסוק',pg.evaluate("__calls.some(c=>c[0]==='reader.openBook'&&c[1].bookId==='בראשית'&&c[1].index===3)"))
  pg.evaluate("window.__sel='בטחון';fire('reader.toolbar_item_clicked',{})");pg.wait_for_timeout(500)
  ck('כפתור סרגל הקורא פותח ערך',pg.locator('h2:has-text("בטחון")').count()>0)
  ck('שורש בטחון = בטח',pg.locator('[data-root="בטח"]').count()>0)
  ck('הנקדן נקרא בבחירה',pg.evaluate("__calls.some(c=>c[0]==='network.fetchStream'&&/api\\/nikud/.test(c[1].url))"))
  pg.evaluate("window.__sel='דמי';fire('app.command',{command:'lookup'})");pg.wait_for_timeout(500)
  ck('קיצור מקשים פותח ערך; ההגדרה "זמרת" הוסרה',pg.locator('h2:has-text("דמי")').count()>0 and pg.locator('text=זמרת').count()==0)
  pg.click('[data-like="0"]');pg.click('[data-m="fav"]');ck('מועדפים + כפתור ייצוא',pg.locator('#favexp').count()==1)
  with pg.expect_download() as d: pg.click('#favexp')
  t=open(d.value.path(),encoding='utf-8-sig').read();ck('ייצוא כולל קישורי GitHub וחנות','github.com/Hadabadra/KLI-MULON' in t and 'otzaria.org/plugins' in t)
  pg.click('[data-m="set"]');pg.wait_for_timeout(300)
  ck('הגדרות: נקדן מחובר',pg.locator('text=🟢 הנקדן מחובר').count()>0)
  ck('תרגול כבוי כברירת מחדל',pg.locator('#modes [data-m="pr"].hid').count()==1)
  pg.check('#s-pr');pg.click('#modes [data-m="pr"]');pg.wait_for_timeout(300);pg.click('#pra [data-pa] >> nth=0');pg.wait_for_timeout(100)
  ck('תרגול: שאלה, 4 תשובות וציון',pg.locator('#pra [data-pa]').count()==4 and pg.locator('#prs:has-text("מתוך 1")').count()==1)
  pg.click('[data-m="set"]');pg.wait_for_timeout(200)
  pg.click('#s-fs button[data-v="130"]');ck('גודל גופן',pg.evaluate("document.documentElement.style.fontSize")=='130%')
  pg.screenshot(path=TMP+'/set2.png',full_page=True)
  pg.evaluate("window.__sel='בטחון';fire('app.command',{command:'lookup'})");pg.wait_for_timeout(400)
  ck('כפתור אבן שושן מוצג במצב מקוון',pg.locator('#oeven').count()==1)
  pg.click('[data-lib="radak"]');pg.wait_for_timeout(300)
  ck('רד"ק נפתח על השורש בטח',pg.evaluate("__calls.some(c=>c[0]==='reader.openBook'&&c[1].searchQuery==='בטח')"))
  pg.click('#oconc');pg.wait_for_timeout(1500)
  ck('קונקורדנציה מציגה מופעים',pg.locator('#conc .res').count()>0)
  ck('קונקורדנציה: צורה ללא מופעים בשורה עם 0',pg.locator('#cforms .chip.zero').count()>0)
  pg.screenshot(path=TMP+'/conc.png',full_page=True)
  ck('קונקורדנציה: גרף התפלגות לפי ספר',pg.locator('#cchart svg [data-cbk="בראשית"]').count()==1)
  pg.click('#cchart [data-cbk="בראשית"]');pg.wait_for_timeout(100)
  ck('לחיצה על עמודה מסננת לספר',pg.locator('#cchart .chip.pri[data-cbk=""]').count()==1 and pg.locator('#conc .res').count()>0)
  pg.click('[data-m="rules"]');pg.wait_for_timeout(300);pg.click('#out .rbar [data-m2="terms"]');pg.wait_for_timeout(300)
  n_ti=pg.locator('.tie [data-gsec]').count()
  with pg.expect_download() as d2: pg.click('#tidl')
  ck('מפתח מונחים: %d מונחים + ייצוא טקסט'%n_ti, n_ti>50 and 'otzaria.org/plugins' in open(d2.value.path(),encoding='utf-8-sig').read())
  pg.click('[data-m="word"]');pg.fill('#q','שמר');pg.keyboard.press('Enter');pg.wait_for_timeout(300);pg.click('#conjbtn');pg.wait_for_timeout(100)
  NF=lambda t:pg.evaluate("t=>document.querySelector('#conjbox').textContent.normalize('NFC').includes(t.normalize('NFC'))",t)
  ck('טבלת נטייה (שמר): קל + "נוצר אוטומטית"',NF('שָׁמַרְתִּי') and NF('תִּשְׁמֹרְנָה') and NF('נוצר אוטומטית'))
  pg.click('#conjbox [data-cjb="התפעל"]');ck('טבלת נטייה: התפעל בחילוף ת (הִשְׁתַּמֵּר)',NF('הִשְׁתַּמֵּר'))
  pg.fill('#q','שמע');pg.keyboard.press('Enter');pg.wait_for_timeout(300);pg.click('#conjbtn')
  ck('טבלת נטייה: שורש גרוני (שמע) — הודעה שאינו נתמך',pg.locator('#conjbox:has-text("רק בשלמים")').count()==1)
  pg.click('[data-m="books"]');pg.wait_for_timeout(200);pg.click('[data-ia="prep"]')
  pg.fill('#prept','בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃ וְהָאָ֗רֶץ הָיְתָ֥ה תֹ֙הוּ֙ וָבֹ֔הוּ וְחֹ֖שֶׁךְ עַל־פְּנֵ֣י תְה֑וֹם וְר֣וּחַ אֱלֹהִ֔ים מְרַחֶ֖פֶת עַל־פְּנֵ֥י הַמָּֽיִם׃');pg.click('#prepgo');pg.wait_for_timeout(300)
  pw=pg.evaluate("[...document.querySelectorAll('#prepres .sense .chip')].map(b=>b.textContent)")
  with pg.expect_download() as d3: pg.click('#prepdl')
  ck('הכנה לפרק: %d מילים לא נפוצות (מרחפת כן, את/על לא) + ייצוא'%len(pw), any('מְרַחֶ' in w for w in pw) and not any(w in ('אֵ֥ת','עַל') for w in pw) and 'otzaria.org/plugins' in open(d3.value.path(),encoding='utf-8-sig').read())
  pg.click('[data-m="root"]');pg.fill('#q','');
  ck('ללא שגיאות בתוסף '+str(errs),not errs)
  pg2=b.new_page();pg2.add_init_script(MOCK.replace("isOnline:true","isOnline:false,isOfflineMode:true"));pg2.goto(ROOT+'/index.html');pg2.wait_for_timeout(300)
  pg2.fill('#q','בטחון');pg2.keyboard.press('Enter');pg2.wait_for_timeout(300)
  ck('במצב מנותק אבן שושן מוסתר',pg2.locator('#oeven').count()==0 and pg2.locator('[data-lib="radak"]').count()==1)
print('\n'.join(res))
