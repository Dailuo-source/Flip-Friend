/* =====================================================================
   Flip Friend — Refinished by Cecilia
   One-file phone app. The Google Sheet (business account) is the database;
   the Apps Script web app in Code.gs is the API.
   ===================================================================== */
const API_URL = "";

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const eqi=(a,b)=>String(a==null?"":a).trim().toLowerCase()===String(b==null?"":b).trim().toLowerCase();
const LS={get(k,d){try{const v=localStorage.getItem("ff."+k);return v==null?d:v;}catch(e){return d;}},set(k,v){try{localStorage.setItem("ff."+k,v);}catch(e){}},del(k){try{localStorage.removeItem("ff."+k);}catch(e){}}};
const N=v=>v==null||v===""||isNaN(+v)?null:+v;
const r2=n=>Math.round((+n||0)*100)/100;
const r4=n=>Math.round((+n||0)*10000)/10000;
function money(n,d){if(n==null||isNaN(n))return"–";d=d==null?2:d;const s=Math.abs(n).toLocaleString("en-CA",{minimumFractionDigits:d,maximumFractionDigits:d});return(n<0?"−$":"$")+s;}
const money0=n=>money(n,0);
const pct=x=>x==null||isNaN(x)?"–":Math.round(x*100)+"%";
const hrs=h=>{h=r2(h);return(h%1===0?h.toFixed(0):String(h))+" h";};

const I={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  projects:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="14" rx="2"/><path d="M5 11h14M10 7.5h4M10 14.5h4M7 18v2M17 18v2"/></svg>',
  listings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  supplies:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M5 8c0-2.2 3.1-3.5 7-3.5S19 5.8 19 8"/><path d="M10 12v4"/></svg>',
  money:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  pencil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  barcode:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8v8M10 8v8M13.5 8v8M17 8v8"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  left:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  right:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  dots:'<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  search:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  warn:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>',
  dresser:'<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="14" rx="2"/><path d="M4 9h16M4 13.5h16M10.5 6.5h3M10.5 11h3M10.5 15.5h3M6 18v2M18 18v2"/></svg>',
  photo:'<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 9"/></svg>'
};
const LOGO='<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true"><rect width="44" height="44" rx="12" fill="#FFD9E4"/><rect x="10" y="10" width="24" height="23" rx="4" fill="#fff" stroke="#2A2438" stroke-width="2"/><line x1="10" y1="22" x2="34" y2="22" stroke="#2A2438" stroke-width="2"/><circle cx="17.5" cy="15.5" r="1.5" fill="#2A2438"/><circle cx="26.5" cy="15.5" r="1.5" fill="#2A2438"/><path d="M20 17.5q2 1.8 4 0" stroke="#2A2438" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="14.5" cy="18.5" r="1.7" fill="#FF9DB5"/><circle cx="29.5" cy="18.5" r="1.7" fill="#FF9DB5"/><line x1="19" y1="27.5" x2="25" y2="27.5" stroke="#2A2438" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="33" x2="14" y2="37" stroke="#2A2438" stroke-width="2" stroke-linecap="round"/><line x1="30" y1="33" x2="30" y2="37" stroke="#2A2438" stroke-width="2" stroke-linecap="round"/></svg>';

/* ---------- dates ('YYYY-MM-DD' strings everywhere) ---------- */
const pad=n=>String(n).padStart(2,"0");
const dayKey=ms=>{const d=new Date(ms);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());};
const today=()=>dayKey(Date.now());
const keyDate=k=>{const p=String(k).split("-").map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1,12);};
const fmtShort=k=>k?keyDate(k).toLocaleDateString("en-CA",{month:"short",day:"numeric"}):"";
const fmtLong=k=>k?keyDate(k).toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"}):"";
const daysBetween=(a,b)=>Math.round((keyDate(b)-keyDate(a))/864e5);
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthKey=k=>String(k||"").slice(0,7);
const shiftMonth=(m,n)=>{const d=keyDate(m+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+pad(d.getMonth()+1);};
const monthName=m=>MONTHS[+m.slice(5,7)-1]+" "+m.slice(0,4);

/* =====================================================================
   SYNC — the Google Sheet is the source of truth.
   Changes show on screen right away, then go to the sheet in batches.
   ===================================================================== */
const COLLS=["projects","timelog","listings","supplyuse","supplies","barcodes","expenses","goals","inspiration","settings"];
let S={};COLLS.forEach(c=>S[c]=[]);
let ready=false,auth="ok",KEY=LS.get("key",""),API=API_URL||LS.get("api",""),sheetUrl=LS.get("sheet",""),lastSync=0;
let queue=[],inflight=false,flushT=null,retryT=null;
function readLinkParams(){
  try{
    const h=new URLSearchParams((location.hash||"").replace(/^#/,""));const q=new URLSearchParams(location.search);
    const api=h.get("api")||q.get("api"),key=h.get("key")||q.get("key");
    if(api&&/^https:\/\/script\.google\.com\//.test(api)){API=api;LS.set("api",api);}
    if(key){KEY=key.trim();LS.set("key",KEY);}
    if(api||key)history.replaceState(null,"",location.pathname);
  }catch(e){}
}
function callApi(payload){return fetch(API,{method:"POST",body:JSON.stringify(payload),redirect:"follow"}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();});}
/** One-off server work (pictures, receipts, barcodes). Doesn't wait for the save queue. */
async function call(fn,args){
  const res=await callApi({key:KEY,calls:[{fn,args}],noState:true});
  if(!res||!res.ok)throw new Error((res&&res.message)||"Couldn't reach your sheet.");
  return res.results[0];
}
const uid=()=>("x"+Date.now().toString(36)+Math.random().toString(36).slice(2,9));
function applyLocal(o){const arr=S[o.coll];if(o.op==="add"){const rec=Object.assign({id:o.id},o.data);const i=arr.findIndex(d=>d.id===o.id);if(i>=0)arr[i]=rec;else arr.push(rec);}else if(o.op==="update"){const x=arr.find(d=>d.id===o.id);if(x)Object.assign(x,o.data);}else S[o.coll]=arr.filter(d=>d.id!==o.id);}
function enqueue(o){queue.push(o);applyLocal(o);LS.set("queue",JSON.stringify(queue));onData();clearTimeout(flushT);flushT=setTimeout(flush,350);}
const store={
  add(c,data){const id=uid();enqueue({op:"add",coll:c,id,data});return id;},
  update(c,id,data){enqueue({op:"update",coll:c,id,data});},
  del(c,id){enqueue({op:"del",coll:c,id});}
};
function normalize(st){
  const out={};st=st||{};
  COLLS.forEach(c=>{out[c]=(st[c]||[]).map(r=>Object.assign({},r));});
  const nums={projects:["paid","list","sold","fee","profit"],timelog:["hours"],listings:["price","views","saves","inquiries"],supplyuse:["amount","cost"],supplies:["onHand","avgCost","inUse","lowAt"],expenses:["amount"],goals:["year","month","goal","min","max"]};
  Object.keys(nums).forEach(c=>out[c].forEach(r=>nums[c].forEach(k=>{r[k]=N(r[k]);})));
  out.projects.forEach(p=>{p.no=String(p.no==null?"":p.no).trim();p.status=normStatus(p.status);});
  ["timelog","listings","supplyuse","expenses","inspiration"].forEach(c=>out[c].forEach(r=>{r.project=String(r.project==null?"":r.project).trim();}));
  out.supplies.forEach(s=>{s.reusable=s.reusable===true||/^(true|yes|1)$/i.test(String(s.reusable));});
  return out;
}
function normStatus(s){s=String(s||"").trim().toLowerCase();if(/pending/.test(s))return"Pending";if(/^sold|^complete/.test(s))return"Sold";if(/^list|in stock/.test(s))return"Listed";if(/^dispos|^discard/.test(s))return"Disposed";if(/progress/.test(s))return"In progress";return"Not started";}
async function flush(){
  if(auth!=="ok"||!API||!KEY)return;
  if(inflight){clearTimeout(flushT);flushT=setTimeout(flush,400);return;}
  clearTimeout(retryT);
  const ops=queue.slice();inflight=true;setSync(ops.length?"saving":ready?"loading":"connecting");
  let res;
  try{res=await callApi({key:KEY,ops});}catch(e){res={ok:false,error:"network"};}
  inflight=false;
  if(res&&res.ok){
    queue=queue.slice(ops.length);LS.set("queue",JSON.stringify(queue));
    if(res.sheetUrl){sheetUrl=res.sheetUrl;LS.set("sheet",sheetUrl);}
    S=normalize(res.state);queue.forEach(applyLocal);
    try{LS.set("cache",JSON.stringify(S));}catch(e){}
    const first=!ready;ready=true;lastSync=Date.now();setSync("ok");
    if(first)render();else onData();
    if(queue.length){clearTimeout(flushT);flushT=setTimeout(flush,350);}
    return;
  }
  if(res&&res.error==="bad_key"){auth="need";setSync("off");render();return;}
  setSync("error");
  if(res&&res.message&&res.error!=="network")toast(res.message);
  else if(ops.length)toast("Can't reach your sheet. Changes will save when you're back online.");
  retryT=setTimeout(flush,15000);
}
function setSync(s){const el=$("#sync");if(!el)return;
  const t={connecting:"Connecting…",loading:"Refreshing…",saving:"Saving…",ok:"Synced "+new Date(lastSync).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}),error:"Offline · tap to retry",off:"Not connected"}[s];
  el.textContent=t;el.className="sync"+(s==="ok"?" on":s==="error"||s==="off"?" bad":"");el.dataset.state=s;}
document.addEventListener("visibilitychange",()=>{if(document.hidden||auth!=="ok")return;if(Date.now()-lastSync>15000)flush();});
setInterval(()=>{if(!document.hidden&&auth==="ok"&&!queue.length&&!inflight&&Date.now()-lastSync>60000)flush();},20000);
window.addEventListener("beforeunload",e=>{if(queue.length){e.preventDefault();e.returnValue="";}});

/* ---------- settings lists (hidden Settings tab) ---------- */
function setting(k){const r=S.settings.find(x=>eqi(x.key,k));return r?String(r.value||""):"";}
const splitList=v=>String(v||"").split(",").map(s=>s.trim()).filter(Boolean);
const STEPS=()=>{const l=splitList(setting("Steps"));return l.length?l:["Pick-up","Prep","Prime","Paint","Poly","Finish & list"];};
function stepDetail(name){const m={};String(setting("Step details")||"").split("|").forEach(p=>{const i=p.indexOf(":");if(i>0)m[p.slice(0,i).trim().toLowerCase()]=p.slice(i+1).trim();});
  const d=m[String(name).toLowerCase()];if(d)return d.charAt(0).toUpperCase()+d.slice(1);
  return{"pick-up":"Bringing it home","prep":"Clean, sand, tape, fill","prime":"Primer or pre-stain","paint":"Paint, stain, touch-up","poly":"Poly top-coat","finish & list":"Liners, beeswax, hardware, photos, listing"}[String(name).toLowerCase()]||"";}
const UNITS=()=>{const l=splitList(setting("Units"));return l.length?l:["each","sheet","pack","roll","can","bottle","qt","L","mL","oz"];};
const SUPCATS=()=>{const l=splitList(setting("Supply categories"));return l.length?l:["Strip & sand","Paint & finish","Hardware","Upholstery","Other"];};
const EXPCATS=()=>{const l=splitList(setting("Expense categories"));return l.length?l:["Pieces bought","Supplies","Hardware","Gas & fees","Other"];};
const PLATFORMS=()=>{const l=splitList(setting("Platforms"));return l.length?l:["Marketplace","Kijiji","Instagram","In person","Other"];};
const STATUSES=["Not started","In progress","Listed","Pending","Sold","Disposed"];

/* ---------- projects ---------- */
const same=(a,b)=>String(a==null?"":a).trim()===String(b==null?"":b).trim();
const pById=id=>S.projects.find(p=>p.id===id);
const pByNo=no=>S.projects.find(p=>same(p.no,no));
const noNum=no=>{const n=parseInt(no,10);return isNaN(n)?0:n+(/[a-z]/i.test(no)?.5:0);};
function nextNo(){let m=0;S.projects.forEach(p=>{const n=parseInt(p.no,10);if(!isNaN(n)&&n>m)m=n;});return m+1;}
const pTitle=p=>"#"+p.no+" "+p.name;
const usesOf=p=>S.supplyuse.filter(u=>same(u.project,p.no));
const costsOf=p=>r2(usesOf(p).reduce((s,u)=>s+(u.cost||0),0));
const timesOf=p=>S.timelog.filter(t=>same(t.project,p.no));
const hoursOf=p=>r2(timesOf(p).reduce((s,t)=>s+(t.hours||0),0));
const isOpen=p=>p.status==="Not started"||p.status==="In progress"||p.status==="Listed"||p.status==="Pending";
function calcProfit(p,sold,fee){return r2((+sold||0)+(+fee||0)-(p.paid||0)-costsOf(p));}
function profitOf(p){if(p.status==="Sold")return p.profit!=null?p.profit:calcProfit(p,p.sold,p.fee);if(p.status==="Disposed")return p.profit!=null?p.profit:-r2((p.paid||0)+costsOf(p));return null;}
function eventsOf(p){return S.listings.filter(l=>same(l.project,p.no)).map((l,i)=>Object.assign({_i:i},l)).sort((a,b)=>(a.date||"0").localeCompare(b.date||"0")||a._i-b._i);}
function listInfo(p){
  const ev=eventsOf(p);
  const listed=ev.filter(e=>/^(listed|relisted)$/i.test(e.event));
  const first=listed[0]||null;
  const priced=ev.filter(e=>e.price!=null&&!/^sold$/i.test(e.event));
  const now=priced.length?priced[priced.length-1].price:p.list;
  const firstPrice=first&&first.price!=null?first.price:(priced[0]?priced[0].price:p.list);
  const drops=ev.filter(e=>/drop/i.test(e.event)).length;
  const relists=ev.filter(e=>/^relisted$/i.test(e.event)).length;
  let views=null,saves=null,inq=null,checked=null;
  ev.forEach(e=>{if(e.views!=null)views=e.views;if(e.saves!=null)saves=e.saves;if(e.inquiries!=null)inq=e.inquiries;if(e.views!=null||e.saves!=null||e.inquiries!=null)checked=e.date;});
  const start=first&&first.date?first.date:null;
  const end=p.status==="Sold"&&p.soldOn?p.soldOn:today();
  const days=start?Math.max(0,daysBetween(start,end)):null;
  const platform=(listed.length?listed[listed.length-1].platform:"")||"";
  return{ev,first,now,firstPrice,drops,relists,views,saves,inq,checked,start,days,platform};
}
function ttsText(t){t=String(t||"").toLowerCase();const m=/([\d.]+)\s*(week|day|hour)/.exec(t);if(m){const n=+m[1];return m[2]==="week"?n*7:m[2]==="day"?n:n/24;}if(/half day/.test(t))return .5;return null;}
function daysToSell(p){const li=listInfo(p);if(p.status==="Sold"&&li.start)return li.days;return ttsText(p.tts);}
function needsHelp(p){const li=listInfo(p);return li.drops>0||li.relists>0||/relist|dropped/i.test(p.notes||"");}

/* step progress: a step is done once a later step has time logged, or the piece is listed or sold */
function stepState(p){
  const steps=STEPS(),t=timesOf(p);
  const by=steps.map(s=>t.filter(e=>eqi(e.step,s)));
  let last=-1;by.forEach((a,i)=>{if(a.length)last=i;});
  const finished=p.status==="Listed"||p.status==="Pending"||p.status==="Sold"||p.status==="Disposed";
  return steps.map((s,i)=>({name:s,entries:by[i],hours:r2(by[i].reduce((x,e)=>x+(e.hours||0),0)),
    state:finished?(by[i].length||i<=last?"done":"todo"):(i<last?"done":i===last?"cur":"todo")}));
}
function currentStepLabel(p){const st=stepState(p);const i=st.findIndex(s=>s.state==="cur");if(i<0)return"";return"Step "+i+" of "+(st.length-1)+" · "+st[i].name;}

/* ---------- goals ---------- */
const goalRow=(y,m)=>S.goals.find(g=>g.year===y&&g.month===m);
function soldIn(m){return S.projects.filter(p=>p.status==="Sold"&&monthKey(p.soldOn)===m);}
function monthProfit(m){return r2(soldIn(m).reduce((s,p)=>s+(profitOf(p)||0),0));}
function monthSales(m){return r2(soldIn(m).reduce((s,p)=>s+(p.sold||0),0));}

/* ---------- supplies: generic names for scanned and receipt items ---------- */
function genericName(t){
  const s=String(t||"").toLowerCase();
  const grit=s.match(/(\d{2,4})\s*(?:-?\s*grit|g\b)/)||s.match(/(?:sand ?paper|sanding\b[^\d]*)\D{0,12}\b(\d{2,4})\b(?!\s*(?:pk|pack|ct|sheets?|pc))/);
  if(/sand ?paper|sanding (sheet|disc|sponge|block)|abrasive|sanding/.test(s))return"Sandpaper"+(grit&&+grit[1]>=40&&+grit[1]<=3000?" "+grit[1]:"");
  if(/polycrylic|water[- ]?based.*(poly|finish)|(poly|finish).*water[- ]?based|\bwb\b.*poly|poly.*\bwb\b/.test(s))return"Water-based poly";
  if(/wipe[- ]?on poly/.test(s))return"Wipe-on poly";
  if(/spray/.test(s)&&/poly|lacquer|clear ?coat/.test(s))return"Spray poly";
  if(/polyurethane|\bpoly\b/.test(s))return"Oil poly";
  if(/danish oil/.test(s))return"Danish oil";
  if(/gel stain/.test(s))return"Gel stain";
  if(/pre-?stain|wood conditioner/.test(s))return"Pre-stain";
  if(/stain/.test(s))return"Stain";
  if(/stripper|citristrip|paint remover|strip/.test(s))return"Paint stripper";
  if(/primer|zinsser|kilz|\bbin\b|bulls ?eye/.test(s))return/spray|aerosol/.test(s)?"Spray primer":"Primer";
  if(/chalk/.test(s)&&/paint/.test(s))return"Chalk paint";
  if(/spray paint|krylon|aerosol/.test(s))return"Spray paint";
  if(/wood filler|putty|bondo|filler/.test(s))return"Wood filler";
  if(/painter'?s tape|masking tape|frog ?tape/.test(s))return"Painter's tape";
  if(/roller/.test(s))return"Rollers";
  if(/brush/.test(s))return"Brushes";
  if(/tack cloth/.test(s))return"Tack cloth";
  if(/mineral spirit|paint thinner/.test(s))return"Mineral spirits";
  if(/restor-?a-?finish/.test(s))return"Restore-A-Finish";
  if(/rub ?n ?buff/.test(s))return"Rub n Buff";
  if(/wax/.test(s))return"Furniture wax";
  if(/liner|contact paper|wallpaper/.test(s))return"Drawer liners";
  if(/glue|adhesive/.test(s))return"Wood glue";
  if(/knob|pull|handle|hinge|screw|bracket|glide/.test(s))return"Hardware";
  if(/tsp|degreas|cleaner|krud|simple green/.test(s))return"Cleaning products";
  if(/paint/.test(s))return"Paint";
  return String(t||"").replace(/\s+/g," ").trim().slice(0,40);
}
function supplyDefaults(name){
  const s=String(name).toLowerCase();
  const reusable=/sandpaper|brush|roller|tack cloth/.test(s);
  const category=/sandpaper|stripper|filler|tape|clean|tack|mineral/.test(s)?"Strip & sand":/hardware|liner|glue|knob|pull/.test(s)?"Hardware":/foam|batting|vinyl|fabric/.test(s)?"Upholstery":/paint|stain|poly|primer|oil|wax|finish|rub n|roller|brush/.test(s)?"Paint & finish":"Other";
  const unit=/sandpaper/.test(s)?"sheet":/spray/.test(s)?"can":/stripper|cleaning|mineral/.test(s)?"bottle":/tape/.test(s)?"roll":/paint|stain|poly|primer|oil/.test(s)?"qt":"each";
  return{reusable,category,unit};
}
const supByName=n=>S.supplies.find(s=>eqi(s.name,n));
const isLow=s=>s.lowAt!=null&&(s.onHand||0)<=s.lowAt;

/* ---------- pictures: kept private in Drive, cached on the phone ---------- */
const IMG=new Map();let idbP=null;
function idb(){if(idbP)return idbP;idbP=new Promise((res)=>{try{const r=indexedDB.open("ff-img",1);r.onupgradeneeded=()=>r.result.createObjectStore("img");r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);}catch(e){res(null);}});return idbP;}
async function idbGet(k){const db=await idb();if(!db)return null;return new Promise(res=>{try{const q=db.transaction("img").objectStore("img").get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);}catch(e){res(null);}});}
async function idbPut(k,v){const db=await idb();if(!db)return;try{db.transaction("img","readwrite").objectStore("img").put(v,k);}catch(e){}}
const loading=new Set();
async function loadImg(id){
  if(!id)return null;if(IMG.has(id))return IMG.get(id);
  let d=await idbGet(id);
  if(!d&&!loading.has(id)){loading.add(id);try{const r=await call("image",{id});d=r&&r.data;if(d)idbPut(id,d);}catch(e){}loading.delete(id);}
  if(d)IMG.set(id,d);return d||null;
}
function hydrateImages(root){(root||document).querySelectorAll("img[data-img]").forEach(async el=>{const id=el.dataset.img;if(el.dataset.done===id)return;const d=await loadImg(id);if(d&&el.dataset.img===id){el.src=d;el.dataset.done=id;el.hidden=false;}});}
function resizeImage(file,max,q){return new Promise((res,rej)=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{let w=img.naturalWidth,h=img.naturalHeight;const s=Math.min(1,(max||1280)/Math.max(w,h));w=Math.round(w*s);h=Math.round(h*s);const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);URL.revokeObjectURL(url);res(c.toDataURL("image/jpeg",q||.8));};img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("That picture couldn't be opened."));};img.src=url;});}
function pickFiles(which){return new Promise(res=>{const el=$(which);el.value="";const done=()=>{el.removeEventListener("change",h);};const h=()=>{done();res([...el.files]);};el.addEventListener("change",h);el.click();});}
let PICN=0;const picName=base=>{const d=new Date();return base+" "+dayKey(Date.now())+" "+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds())+"-"+(++PICN);};
async function uploadPicture(file,kind,name){const data=await resizeImage(file,1280,.8);const r=await call("upload",{data,kind,name});IMG.set(r.id,data);idbPut(r.id,data);return r.id;}

/* ---------- small UI helpers ---------- */
let toastT=null;
function toast(msg){let el=$("#toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast";el.setAttribute("role","status");document.body.appendChild(el);}el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true;},3200);}
function busy(on,msg){let el=$("#busy");if(!on){if(el)el.remove();return;}if(!el){el=document.createElement("div");el.id="busy";el.className="busy";document.body.appendChild(el);}el.innerHTML='<div class="spin" aria-hidden="true"></div><div>'+esc(msg||"Working…")+'</div>';}
const opt=(v,sel,label)=>`<option value="${esc(v)}"${same(v,sel)?" selected":""}>${esc(label==null?v:label)}</option>`;
function statusChip(p){
  if(p.status==="Sold")return'<span class="chip c-mint">Sold</span>';
  if(p.status==="Disposed")return'<span class="chip c-grey">Disposed</span>';
  if(p.status==="Listed"){const li=listInfo(p);return`<span class="chip c-blue">Listed${li.days!=null?" · "+li.days+" days":""}</span>`;}
  if(p.status==="Pending")return'<span class="chip c-pink">Sale pending</span>';
  if(p.status==="In progress"){const c=currentStepLabel(p);return`<span class="chip c-warm">${esc(c||"In progress")}</span>`;}
  return'<span class="chip c-lav">Not started</span>';
}
function thumbHTML(p,lg){
  const tone=p.status==="Sold"?"t-mint":p.status==="Listed"||p.status==="Pending"?"t-blue":p.status==="In progress"?"t-warm":p.status==="Disposed"?"t-grey":"t-lav";
  return`<div class="thumb ${lg?"lg ":""}${tone}">${I.dresser}${p.picture?`<img data-img="${esc(p.picture)}" alt="" hidden>`:""}</div>`;
}
