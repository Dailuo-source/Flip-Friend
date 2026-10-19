
/* =====================================================================
   DESKTOP — screens 1024px and wider get a sidebar, tables, the project
   open beside the list, bulk editing and batch expenses.
   Same data and sync as the phone; only the layout changes.
   ===================================================================== */
const DESKQ=window.matchMedia("(min-width:1024px)");
let DESK=DESKQ.matches;
DESKQ.addEventListener("change",e=>{DESK=e.matches;if(!DESK){D.edit=false;D.batch=null;}render();});
const D={edit:false,sel:{},drafts:{},batch:null,reading:""};
const NUMF=["paid","list","sold"];

/* Background syncs re-draw the screen. While typing in a desktop grid, wait until the cell loses focus. */
let heldRender=false;
function holdRender(){const a=document.activeElement;return!!(DESK&&a&&a.closest&&a.closest("[data-hold]")&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));}
document.addEventListener("focusout",()=>{setTimeout(()=>{if(heldRender&&!holdRender()){heldRender=false;render();}},0);});

/* ---------- sidebar ---------- */
function deskNav(){
  const open=S.projects.filter(isOpen).length,listed=S.projects.filter(p=>p.status==="Listed").length,low=S.supplies.filter(isLow).length;
  const badge={projects:open?`<span class="dn-n">${open}</span>`:"",listings:listed?`<span class="dn-n">${listed}</span>`:"",supplies:low?`<span class="chip c-warm dn-n">${low} low</span>`:""};
  const tp=TIMER&&pByNo(TIMER.project);
  return`<div class="dn-brand">${LOGO}<div><b>Flip Friend</b><span>Refinished by Cecilia</span></div></div>
  <div class="in">${TABS.map(t=>{const on=VIEW.tab===t[0];return`<button type="button" data-tab="${t[0]}" class="${on?"on":""}"${on?' aria-current="page"':""}>${t[2]}<span class="grow">${t[1]}</span>${badge[t[0]]||""}</button>`;}).join("")}</div>
  <div class="grow"></div>
  ${TIMER?`<div class="dn-timer"><span class="small muted b">Timer running</span><span class="b">${tp?esc(pTitle(tp)):"#"+esc(TIMER.project)} · ${esc(TIMER.step)}</span><span class="t" data-timer>0:00:00</span><button type="button" class="btn sm ghost" data-act="dkStopTimer">Stop and log</button></div>`:""}
  <div class="dn-foot">N new project · / search · Esc close</div>`;
}

/* ---------- which screen ---------- */
function deskView(){
  const p=VIEW.project&&pById(VIEW.project);if(!p)VIEW.project=null;
  if(VIEW.tab==="projects")return deskProjects(p);
  if(p)return`<div class="dk-solo">${viewProject(p)}</div>`;
  if(VIEW.tab==="money"&&D.batch)return deskBatch();
  return({home:deskHome,listings:viewListings,supplies:viewSupplies,money:viewMoney}[VIEW.tab]||viewHome)();
}

/* ---------- projects: table + panel, or edit mode ---------- */
function deskProjects(p){
  const all=S.projects,c=s=>all.filter(x=>x.status===s).length;
  const q=VIEW.q.trim().toLowerCase();
  let shown=sortProjects(all.filter(PF[VIEW.pf]||PF.All));
  if(q)shown=shown.filter(x=>("#"+x.no+" "+x.name+" "+(x.notes||"")).toLowerCase().includes(q));
  const head=`<header class="top"><div class="grow"><h1>Projects</h1><div class="sub">${c("In progress")} in progress · ${c("Not started")} not started · ${c("Listed")} listed · ${c("Sold")} sold</div></div>
    <label class="dk-search">${I.search}<input type="search" data-act="q" value="${esc(VIEW.q)}" placeholder="Search projects" aria-label="Search projects"></label>
    <div class="seg dk-seg" role="group" aria-label="Mode"><button type="button" class="${D.edit?"":"on"}" data-act="dkMode" data-v="view">View</button><button type="button" class="${D.edit?"on":""}" data-act="dkMode" data-v="edit">Edit</button></div>
    <button type="button" class="btn sm" data-act="newProject">${I.plus}Add project</button>${syncBtn}</header>`;
  const tools=`<div class="between"><div class="pills" role="group" aria-label="Show">${Object.keys(PF).map(k=>`<button type="button" class="pill ${VIEW.pf===k?"on":""}" data-act="pf" data-v="${k}" aria-pressed="${VIEW.pf===k}">${k}</button>`).join("")}</div>
    <label class="row small b muted" style="gap:8px">Sort<select class="input" style="height:36px;width:auto;border-radius:18px;font-size:13px" data-act="sort">${SORTS.map(s=>opt(s[0],VIEW.sort,s[1])).join("")}</select></label></div>`;
  if(D.edit)return`<div class="dk-wide">${head}<main>${tools}${bulkBar()}${editTable(shown)}<div id="dkSave">${saveBar()}</div>
    <span class="small muted">Tab moves across, Enter moves down. Nothing goes to the sheet until you press Save.</span></main></div>`;
  return`<div class="dk-split"><div class="dk-main">${head}<main>${tools}${viewTable(shown,p)}</main></div>
    <aside class="dk-side" aria-label="Selected project">${p?viewProject(p):`<div class="empty" style="padding-top:120px">${I.projects.replace("<svg",'<svg width="40" height="40"')}<br>Pick a project to see it here.</div>`}</aside></div>`;
}
function viewTable(list,sel){
  if(!list.length)return'<div class="empty">Nothing here yet.</div>';
  return`<div class="dk-table"><table><thead><tr><th scope="col">No</th><th scope="col">Project</th><th scope="col">Status</th><th scope="col" class="r">Paid</th><th scope="col" class="r">Listed / sold</th><th scope="col" class="r">Hours</th><th scope="col" class="r">Profit</th></tr></thead><tbody>
  ${list.map(x=>{const pr=profitOf(x),li=x.status==="Listed"?listInfo(x):null,price=x.status==="Sold"?x.sold:li?li.now:x.list,h=hoursOf(x);
    return`<tr class="click${sel&&sel.id===x.id?" sel":""}" data-act="open" data-id="${x.id}"><td class="muted b">#${esc(x.no)}</td><td><button type="button" class="dk-name" data-act="open" data-id="${x.id}">${esc(x.name)}</button></td><td>${statusChip(x)}</td><td class="r">${x.paid!=null?money(x.paid):"–"}</td><td class="r">${price!=null?money0(price):"–"}</td><td class="r muted">${h?hrs(h):"–"}</td><td class="r b ${pr==null?"muted":pr<0?"neg":"pos"}">${pr==null?"–":(pr<0?"":"+")+money(pr)}</td></tr>`;}).join("")}
  </tbody></table></div>`;
}

/* edit mode */
const EDF=[["name","Name","text"],["status","Status","status"],["started","Started","date"],["paid","Paid","num"],["list","List price","num"],["sold","Sold price","num"],["soldOn","Sold on","date"],["notes","Notes","text"]];
const origVal=(p,f)=>p[f]==null?"":String(p[f]);
const curVal=(p,f)=>D.drafts[p.id]&&f in D.drafts[p.id]?D.drafts[p.id][f]:origVal(p,f);
function setDraft(id,f,v){const p=pById(id);if(!p)return;const d=D.drafts[id]||(D.drafts[id]={});
  if(String(v)===origVal(p,f))delete d[f];else d[f]=v;if(!Object.keys(d).length)delete D.drafts[id];}
const changed=(p,f)=>!!(D.drafts[p.id]&&f in D.drafts[p.id]);
function editTable(list){
  const selN=list.filter(x=>D.sel[x.id]).length,all=list.length&&selN===list.length;
  if(!list.length)return'<div class="empty">Nothing here yet.</div>';
  const cell=(x,f,type)=>{const v=curVal(x,f),cls=changed(x,f)?" chg":"",a=`data-ed="${f}" data-id="${x.id}" aria-label="${esc(f)} for #${esc(x.no)}"`;
    if(type==="status")return`<select class="dk-in${cls}" ${a}>${STATUSES.map(s=>opt(s,v)).join("")}</select>`;
    if(type==="date")return`<input type="date" class="dk-in${cls}" ${a} value="${esc(v)}">`;
    if(type==="num")return`<input class="dk-in r${cls}" inputmode="decimal" ${a} value="${esc(v)}" style="width:92px">`;
    return`<input class="dk-in${cls}" ${a} value="${esc(v)}"${f==="notes"?' placeholder="Add a note"':""}>`;};
  return`<div class="dk-table" data-hold><table class="dk-edit"><thead><tr><th scope="col"><input type="checkbox" data-selall aria-label="Select all"${all?" checked":""}></th><th scope="col">No</th>${EDF.map(f=>`<th scope="col"${f[2]==="num"?' class="r"':""}>${f[1]}</th>`).join("")}</tr></thead><tbody>
  ${list.map(x=>`<tr class="${D.sel[x.id]?"sel":""}"><td><input type="checkbox" data-sel="${x.id}" aria-label="Select #${esc(x.no)}"${D.sel[x.id]?" checked":""}></td><td class="muted b">#${esc(x.no)}</td>${EDF.map(f=>`<td>${cell(x,f[0],f[2])}</td>`).join("")}</tr>`).join("")}
  </tbody></table></div>`;
}
function bulkBar(){
  const ids=Object.keys(D.sel).filter(id=>D.sel[id]&&pById(id));if(!ids.length)return"";
  return`<div class="dk-bulk"><span class="b">${ids.length} selected</span>
    <label class="row small b" style="gap:8px">Set status<select class="dk-in" data-bulk="status"><option value="">Choose…</option>${STATUSES.map(s=>opt(s,"")).join("")}</select></label>
    <label class="row small b" style="gap:8px">Change list price<input class="dk-in r" id="dkPct" inputmode="decimal" placeholder="-10" style="width:64px">%</label><button type="button" class="btn sm ghost" data-act="dkPct">Apply</button>
    <label class="row small b" style="gap:8px">Note<input class="dk-in" id="dkNote" placeholder="Added to each" style="width:170px"></label><button type="button" class="btn sm ghost" data-act="dkNote">Add</button>
    <span class="grow"></span><button type="button" class="link" data-act="dkClear">Clear selection</button></div>`;
}
function saveBar(){
  const ids=Object.keys(D.drafts).filter(id=>pById(id));
  if(!ids.length)return`<div class="dk-savebar muted"><span class="small b">No changes yet.</span></div>`;
  const n=ids.reduce((s,id)=>s+Object.keys(D.drafts[id]).length,0);
  const one=ids.length===1&&n===1?(()=>{const p=pById(ids[0]),f=Object.keys(D.drafts[ids[0]])[0];return" · "+pTitle(p)+": "+(origVal(p,f)||"blank")+" → "+(D.drafts[ids[0]][f]||"blank");})():"";
  return`<div class="dk-savebar"><span class="dot-warm" aria-hidden="true"></span><span class="grow b">${n} unsaved change${n===1?"":"s"} on ${ids.length} project${ids.length===1?"":"s"}${esc(one)}</span>
    <button type="button" class="btn sm ghost" data-act="dkUndo">Undo all</button><button type="button" class="btn sm" data-act="dkSaveEdits">Save changes</button></div>`;
}
function saveDrafts(){
  const ids=Object.keys(D.drafts).filter(id=>pById(id));
  for(const id of ids){const p=pById(id),nx=Object.assign({},p);Object.entries(D.drafts[id]).forEach(([f,v])=>{nx[f]=NUMF.includes(f)?N(String(v).replace(/[$,\s]/g,"")):String(v).trim();});
    if(nx.status==="Sold"&&nx.sold==null){toast("Add a sold price for "+pTitle(p)+" first.");return;}
    const bad=NUMF.find(f=>f in D.drafts[id]&&String(D.drafts[id][f]).trim()&&nx[f]==null);if(bad){toast("Check the "+bad+" amount on "+pTitle(p)+".");return;}}
  let n=0;
  ids.forEach(id=>{const p=pById(id),ch=D.drafts[id],d={},li=listInfo(p);
    Object.entries(ch).forEach(([f,v])=>{d[f]=NUMF.includes(f)?N(String(v).replace(/[$,\s]/g,"")):String(v).trim();});
    if(d.name==="")delete d.name;
    const status=d.status||p.status;
    if(d.status==="In progress"&&!p.started&&!d.started)d.started=today();
    if(status==="Sold"&&!(d.soldOn||p.soldOn))d.soldOn=today();
    store.update("projects",id,d);n++;
    const np=pById(id);
    if(status==="Listed"&&!li.start)store.add("listings",{project:String(np.no),event:"Listed",date:today(),price:np.list??null,platform:PLATFORMS()[0]});
    else if("list"in d&&d.list!=null&&status==="Listed"&&d.list!==li.now)store.add("listings",{project:String(np.no),event:li.now!=null&&d.list<li.now?"Price drop":"Check-in",date:today(),price:d.list,platform:li.platform||""});
    if(d.status==="Sold"&&p.status!=="Sold"&&!li.ev.some(e=>/^sold$/i.test(e.event)))store.add("listings",{project:String(np.no),event:"Sold",date:np.soldOn||today(),price:np.sold,platform:li.platform||""});
    if(status==="Sold"&&["sold","paid","status"].some(k=>k in d))store.update("projects",id,{profit:calcProfit(np,np.sold,np.fee)});});
  D.drafts={};toast("Saved changes to "+n+" project"+(n===1?"":"s"));render();
}

/* ---------- listings: the "listed now" table ---------- */
function deskListed(listed){
  if(!listed.length)return'<section class="card"><h2>Listed now</h2><p class="small muted">Nothing listed right now.</p></section>';
  const mx=k=>Math.max(0,...listed.map(x=>x.li[k]||0));const mV=mx("views"),mS=mx("saves"),mI=mx("inq");
  const bar=(v,m,col,l)=>`<div class="ib"><span>${l} ${v==null?"–":v}</span><i><b style="width:${v&&m?Math.max(4,Math.round(v/m*100)):0}%;background:${col}"></b></i></div>`;
  return`<section class="dk-table"><div class="dk-cap"><h2 class="h2" style="font-size:16px">Listed now · ${listed.length}</h2><span class="small muted">Interest is from your latest check-in. The longest bar is your top piece listed now.</span></div><table>
  <thead><tr><th scope="col">Project</th><th scope="col">Platform</th><th scope="col" class="r">Days</th><th scope="col" class="r">Price</th><th scope="col" style="width:230px">Interest</th><th scope="col" class="r">Quick actions</th></tr></thead><tbody>
  ${listed.map(({p,li})=>`<tr><td><button type="button" class="dk-name" data-act="open" data-id="${p.id}" data-sub="listing">#${esc(p.no)} ${esc(p.name)}</button><div class="small muted">${p.paid!=null?"Paid "+money0(p.paid):""}${hoursOf(p)?" · "+hrs(hoursOf(p)):""}${li.checked?" · checked "+fmtShort(li.checked):""}</div></td>
    <td class="b">${esc(li.platform||"–")}</td><td class="r b" style="${li.days!=null&&li.days>=21?"color:var(--warm)":""}">${li.days!=null?li.days+" d":"–"}</td>
    <td class="r"><div class="b">${li.now!=null?money0(li.now):"–"}</div><div class="small muted">${li.drops&&li.firstPrice!=null&&li.firstPrice!==li.now?"was "+money0(li.firstPrice)+" · ":""}${li.drops?li.drops+" drop"+(li.drops>1?"s":""):"no drops"}</div></td>
    <td>${bar(li.views,mV,"var(--blue)","Views")}${bar(li.saves,mS,"var(--lav)","Saves")}${bar(li.inq,mI,"var(--pink)","Asks")}</td>
    <td class="r"><div class="dk-acts"><button type="button" class="btn sm ghost" data-act="dkInq" data-id="${p.id}">+1 inquiry</button><button type="button" class="btn sm ghost" data-act="dkLev" data-v="Check-in" data-id="${p.id}">Check-in</button><button type="button" class="btn sm ghost" data-act="dkLev" data-v="Price drop" data-id="${p.id}">Price drop</button><button type="button" class="btn sm dk-mint" data-act="dkSold" data-id="${p.id}">Mark sold</button></div></td></tr>`).join("")}
  </tbody></table></section>`;
}

/* ---------- supplies table ---------- */
function deskSupplies(list){
  if(!list.length)return"";
  return`<div class="dk-table"><table><thead><tr><th scope="col">Supply</th><th scope="col">Category</th><th scope="col" style="width:200px">On hand</th><th scope="col" class="r">Avg cost</th><th scope="col" class="r">Value</th><th scope="col"></th></tr></thead><tbody>
  ${list.slice().sort((a,b)=>String(a.category||"").localeCompare(String(b.category||""))||a.name.localeCompare(b.name)).map(s=>{const top=Math.max((s.lowAt||0)*4,s.onHand||0,1),w=Math.round(Math.min(1,(s.onHand||0)/top)*100);
    return`<tr class="click" data-act="supply" data-id="${s.id}"><td><button type="button" class="dk-name" data-act="supply" data-id="${s.id}">${esc(s.name)}</button></td><td class="muted b">${esc(s.category||"Other")}</td>
    <td><div class="row" style="gap:10px"><span class="track grow"><i class="${isLow(s)?"low":""}" style="width:${w}%"></i></span><span class="small b" style="white-space:nowrap">${r2(s.onHand||0)} ${esc(s.unit||"")}</span></div></td>
    <td class="r">${s.avgCost!=null?money(s.avgCost)+" / "+esc(s.unit||"each"):"–"}</td><td class="r b">${money0((s.onHand||0)*(s.avgCost||0))}</td>
    <td class="r">${s.reusable?'<span class="chip c-lav">Reusable</span> ':""}${isLow(s)?'<span class="chip c-warm">Low</span>':""}</td></tr>`;}).join("")}
  </tbody></table></div>`;
}

/* ---------- expenses table ---------- */
function deskExpenses(ex){
  return`<div class="between" style="margin:4px 4px 0"><h2 class="h2">This month</h2><div class="row" style="gap:8px"><button type="button" class="btn sm ghost" data-act="newExpense">${I.plus}Add one</button><button type="button" class="btn sm ghost" data-act="receipt">${I.camera}Receipt</button><button type="button" class="btn sm" data-act="dkBatch">Add in a batch</button></div></div>
  ${ex.length?`<div class="dk-table"><table><thead><tr><th scope="col">Date</th><th scope="col">What</th><th scope="col">Store</th><th scope="col">Category</th><th scope="col">Project</th><th scope="col" class="r">Amount</th></tr></thead><tbody>
  ${ex.map(e=>`<tr class="click" data-act="editExpense" data-id="${e.id}"><td class="muted b">${e.date?fmtShort(e.date):"–"}</td><td><button type="button" class="dk-name" data-act="editExpense" data-id="${e.id}">${esc(e.item||"Expense")}</button>${e.receipt?' <span class="chip c-lav">receipt</span>':""}</td><td>${esc(e.store||"")}</td><td class="muted b">${esc(e.category||"")}</td><td class="muted b">${e.project?"#"+esc(e.project):""}</td><td class="r b">${money(e.amount)}</td></tr>`).join("")}
  </tbody></table></div>`:'<div class="empty">Nothing logged this month.</div>'}`;
}

/* ---------- batch expenses ---------- */
let BK=0;
const brow=o=>Object.assign({k:++BK,src:"Typed",date:today(),item:"",store:"",cat:"Supplies",project:"",amount:"",receipt:"",check:false},o);
function deskBatch(){
  const b=D.batch,cats=[...new Set(EXPCATS().concat(["Tax","Other"]))];
  const srcCls={Receipt:"c-lav",Pasted:"t-blue",Typed:"t-grey"};
  return`<div class="dk-wide" id="dkBatch"><header class="top"><button type="button" class="back" data-act="dkBatchClose" aria-label="Back to expenses">${I.back}</button><div class="grow"><h1>Add expenses in a batch</h1><div class="sub">Kept separate from your audit expense sheet for now</div></div>${syncBtn}</header>
  <main>
    <div class="dk-two">
      <div class="dk-drop" id="dkDrop">${I.camera.replace("<svg",'<svg width="36" height="36"')}<div class="grow"><div class="b">Drop receipt photos or PDFs here</div><div class="small muted">Drop several at once. Each one is saved to Drive, read, and its lines appear below to check.</div></div><button type="button" class="btn sm ghost" data-act="dkFiles">Choose files</button></div>
      <div class="dk-drop solid"><div class="grow"><div class="b">Paste rows from a spreadsheet</div><div class="small muted">Copy date, item, store and amount columns, click in the table, then Ctrl+V.</div></div></div>
    </div>
    ${D.reading?`<div class="note row" style="gap:10px"><span class="spin" style="width:18px;height:18px;border-width:3px"></span>${esc(D.reading)}</div>`:""}
    <div class="dk-table" data-hold><table class="dk-edit"><thead><tr><th scope="col">From</th><th scope="col">Date</th><th scope="col">What was it?</th><th scope="col">Store</th><th scope="col">Category</th><th scope="col">Project</th><th scope="col" class="r">Amount</th><th scope="col"><span class="vh">Remove</span></th></tr></thead><tbody>
    ${b.rows.map(r=>`<tr><td><span class="chip ${srcCls[r.src]||"t-grey"}">${r.src}</span></td>
      <td><input type="date" class="dk-in" data-bf="date" data-k="${r.k}" value="${esc(r.date)}" aria-label="Date"></td>
      <td><input class="dk-in" data-bf="item" data-k="${r.k}" value="${esc(r.item)}" aria-label="What was it" style="min-width:180px"></td>
      <td><input class="dk-in" data-bf="store" data-k="${r.k}" value="${esc(r.store)}" aria-label="Store" style="width:140px"></td>
      <td><select class="dk-in" data-bf="cat" data-k="${r.k}" aria-label="Category">${cats.concat(cats.includes(r.cat)?[]:[r.cat]).map(c=>opt(c,r.cat)).join("")}</select></td>
      <td><select class="dk-in" data-bf="project" data-k="${r.k}" aria-label="Project">${opt("",r.project,"None")}${projOptions(r.project,true)}</select></td>
      <td><input class="dk-in r${r.check&&N(String(r.amount).replace(/[$,\s]/g,""))==null?" chg":""}" inputmode="decimal" data-bf="amount" data-k="${r.k}" value="${esc(r.amount)}" aria-label="Amount" style="width:96px"></td>
      <td><button type="button" class="x" data-act="dkRowDel" data-k="${r.k}" aria-label="Remove row">${I.x}</button></td></tr>`).join("")}
    <tr><td colspan="8"><button type="button" class="link" data-act="dkRowAdd">+ Add a row</button></td></tr></tbody></table></div>
    <div class="dk-savebar" id="dkBsum">${batchSum()}</div>
  </main></div>`;
}
function batchSum(){
  const rows=D.batch.rows.filter(r=>r.item.trim()||String(r.amount).trim());
  const amt=r=>N(String(r.amount).replace(/[$,\s]/g,""));
  const tot=r2(rows.reduce((s,r)=>s+(amt(r)||0),0)),miss=rows.filter(r=>amt(r)==null).length;
  return`<span class="grow" style="display:flex;flex-direction:column"><span class="b">${rows.length} expense${rows.length===1?"":"s"} · ${money(tot)}</span><span class="small b" style="color:${miss?"var(--warm)":"var(--muted)"}">${miss?miss+" row"+(miss===1?" needs an amount":"s need an amount"):"Rows from receipts log spending only. Use Scan receipt on the phone to also restock the shelf."}</span></span>
  <button type="button" class="btn" data-act="dkBatchSave"${rows.length&&!miss?"":" disabled"}>Save ${rows.length} expense${rows.length===1?"":"s"}</button>`;
}
function saveBatch(){
  const amt=r=>N(String(r.amount).replace(/[$,\s]/g,""));
  const rows=D.batch.rows.filter(r=>r.item.trim()||String(r.amount).trim());
  if(!rows.length||rows.some(r=>amt(r)==null)){toast("Every row needs an amount.");return;}
  rows.forEach(r=>{const a=amt(r),date=r.date||today();
    store.add("expenses",{date,store:r.store.trim(),item:r.item.trim(),amount:a,category:r.cat||"Other",project:r.project,receipt:r.receipt});
    const p=r.project&&pByNo(r.project);
    if(p&&r.cat!=="Tax"){store.add("supplyuse",{project:String(p.no),supply:r.item.trim()||"Supplies",cost:a,date});markStarted(p);refreshProfit(pById(p.id));}});
  D.batch=null;VIEW.money="expenses";toast("Saved "+rows.length+" expense"+(rows.length===1?"":"s"));render();
}
function readAsData(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("Couldn't open "+f.name));r.readAsDataURL(f);});}
async function batchFiles(files){
  files=[...files].filter(f=>/^image\/|pdf$/.test(f.type));if(!files.length){toast("Drop photos or PDFs of receipts.");return;}
  for(let i=0;i<files.length;i++){const f=files[i];D.reading="Reading receipt "+(i+1)+" of "+files.length+"…";render();
    try{const data=/pdf$/.test(f.type)?await readAsData(f):await resizeImage(f,1800,.85);const r=await call("receipt",{data});
      const base={src:"Receipt",date:r.date||today(),store:r.store||"",receipt:r.receipt||""};
      const items=(r.items||[]).filter(it=>it.text||it.amount!=null);
      if(items.length)items.forEach(it=>D.batch.rows.push(brow(Object.assign({},base,{item:it.text||"",amount:it.amount??"",check:it.amount==null}))));
      else D.batch.rows.push(brow(Object.assign({},base,{item:f.name.replace(/\.[^.]+$/,""),amount:r.total??"",check:true})));
      if(r.tax)D.batch.rows.push(brow(Object.assign({},base,{item:"Tax",cat:"Tax",amount:r.tax})));
    }catch(e){D.batch.rows.push(brow({src:"Receipt",item:f.name,check:true}));toast((e.message||"Couldn't read")+" · "+f.name);}}
  D.batch.rows=D.batch.rows.filter(r=>r.src!=="Typed"||r.item||r.amount||r.store);if(!D.batch.rows.length)D.batch.rows.push(brow());
  D.reading="";render();
}
function pasteKey(s){s=String(s||"").trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  if(/^[\d.,$\s-]+$/.test(s)&&!/[\/-]\d/.test(s.replace(/^-/,"")))return null;
  let t=/\d{4}/.test(s)?Date.parse(s):Date.parse(s+" "+today().slice(0,4));if(isNaN(t)&&!/\d{4}/.test(s))t=Date.parse(s);
  return isNaN(t)?null:dayKey(t);}
function batchPaste(text){
  const lines=text.replace(/\r/g,"").split("\n").filter(l=>l.trim());let n=0;
  lines.forEach(l=>{const cells=l.split("\t").map(c=>c.trim());let date=null,amount=null;const rest=[];
    cells.forEach((c,i)=>{if(date==null&&pasteKey(c)){date=pasteKey(c);return;}rest.push(c);});
    for(let i=rest.length-1;i>=0;i--){const v=N(rest[i].replace(/[$,\s]/g,""));if(v!=null){amount=v;rest.splice(i,1);break;}}
    const txt=rest.filter(Boolean);if(!txt.length&&amount==null)return;
    if(/^(date|item|description|amount)$/i.test(txt[0]||"")&&amount==null)return;
    D.batch.rows.push(brow({src:"Pasted",date:date||today(),item:txt[0]||"",store:txt[1]||"",amount:amount??""}));n++;});
  D.batch.rows=D.batch.rows.filter(r=>r.src!=="Typed"||r.item||r.amount||r.store);if(!D.batch.rows.length)D.batch.rows.push(brow());
  toast("Added "+n+" row"+(n===1?"":"s"));render();
}

/* ---------- desktop events ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b||!b.dataset.act.startsWith("dk"))return;
  const p=b.dataset.id?pById(b.dataset.id):null;
  switch(b.dataset.act){
    case"dkMode":D.edit=b.dataset.v==="edit";if(D.edit){VIEW.project=null;syncGuard();}render();break;
    case"dkClear":D.sel={};render();break;
    case"dkUndo":D.drafts={};render();break;
    case"dkSaveEdits":saveDrafts();break;
    case"dkPct":{const v=N(($("#dkPct").value||"").replace(/[%\s]/g,""));if(v==null){toast("Type a percent, like -10.");return;}let n=0;
      Object.keys(D.sel).forEach(id=>{const x=pById(id);if(!D.sel[id]||!x)return;const cur=N(curVal(x,"list"))??listInfo(x).now;if(cur==null)return;setDraft(id,"list",String(Math.round(cur*(1+v/100))));n++;});
      toast(n?"Changed "+n+" list price"+(n===1?"":"s")+" · press Save to keep":"None of those have a list price yet.");render();break;}
    case"dkNote":{const t=($("#dkNote").value||"").trim();if(!t)return;Object.keys(D.sel).forEach(id=>{const x=pById(id);if(!D.sel[id]||!x)return;const c=curVal(x,"notes");setDraft(id,"notes",c?c+"; "+t:t);});render();break;}
    case"dkStopTimer":stopTimer();break;
    case"dkInq":if(p)plusInquiry(p);break;
    case"dkLev":if(p)sheetListEvent(p,b.dataset.v);break;
    case"dkSold":if(p)sheetMarkSold(p);break;
    case"dkBatch":D.batch={rows:[brow()]};render();window.scrollTo(0,0);break;
    case"dkBatchClose":if(D.batch.rows.some(r=>r.item||r.amount)&&!b.dataset.armed){b.dataset.armed="1";toast("Rows not saved. Press back again to leave them.");return;}D.batch=null;render();break;
    case"dkFiles":pickFiles("#fileDocs").then(batchFiles);break;
    case"dkRowAdd":D.batch.rows.push(brow());render();{const ins=document.querySelectorAll('[data-bf="item"]');if(ins.length)ins[ins.length-1].focus();}break;
    case"dkRowDel":D.batch.rows=D.batch.rows.filter(r=>String(r.k)!==b.dataset.k);if(!D.batch.rows.length)D.batch.rows.push(brow());render();break;
    case"dkBatchSave":saveBatch();break;
  }
});
document.addEventListener("input",e=>{const t=e.target;
  if(t.dataset.ed){setDraft(t.dataset.id,t.dataset.ed,t.value);const x=pById(t.dataset.id);t.classList.toggle("chg",!!x&&changed(x,t.dataset.ed));const sb=$("#dkSave");if(sb)sb.innerHTML=saveBar();}
  if(t.dataset.bf&&D.batch){const r=D.batch.rows.find(z=>String(z.k)===t.dataset.k);if(r){r[t.dataset.bf]=t.value;if(t.dataset.bf==="amount"&&N(t.value.replace(/[$,\s]/g,""))!=null)t.classList.remove("chg");const s=$("#dkBsum");if(s)s.innerHTML=batchSum();}}
});
document.addEventListener("change",e=>{const t=e.target;
  if(t.dataset.ed&&t.tagName==="SELECT"){setDraft(t.dataset.id,t.dataset.ed,t.value);render();}
  if(t.dataset.bf&&D.batch&&t.tagName==="SELECT"){const r=D.batch.rows.find(z=>String(z.k)===t.dataset.k);if(r)r[t.dataset.bf]=t.value;}
  if(t.dataset.sel){D.sel[t.dataset.sel]=t.checked;render();}
  if(t.hasAttribute("data-selall")){const on=t.checked;D.sel={};if(on)document.querySelectorAll('[data-sel]').forEach(c=>{D.sel[c.dataset.sel]=true;});render();}
  if(t.dataset.bulk==="status"&&t.value){Object.keys(D.sel).forEach(id=>{if(D.sel[id]&&pById(id))setDraft(id,"status",t.value);});render();}
});
document.addEventListener("keydown",e=>{
  if(!DESK)return;const t=e.target,typing=/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)||t.isContentEditable;
  if(e.key==="Escape"){if($("#scrim")){closeSheet();e.preventDefault();}else if(!typing&&VIEW.project){closeProject();}return;}
  if(typing&&e.key==="Enter"&&(t.dataset.ed||t.dataset.bf)&&t.tagName==="INPUT"){e.preventDefault();const attr=t.dataset.ed?"data-ed":"data-bf",f=t.getAttribute(attr);
    const all=[...document.querySelectorAll(`[${attr}="${f}"]`)],i=all.indexOf(t);if(all[i+1])all[i+1].focus();else t.blur();return;}
  if(typing||e.ctrlKey||e.metaKey||e.altKey||$("#scrim"))return;
  if(e.key==="n"||e.key==="N"){e.preventDefault();sheetNewProject();}
  else if(e.key==="/"){e.preventDefault();if(!$('[data-act="q"]')){VIEW.tab="projects";LS.set("tab","projects");D.batch=null;render();}const q=$('[data-act="q"]');if(q)q.focus();}
});
document.addEventListener("dragover",e=>{if(D.batch&&e.target.closest&&e.target.closest("#dkBatch")){e.preventDefault();const z=$("#dkDrop");if(z)z.classList.add("over");}});
document.addEventListener("dragleave",e=>{const z=$("#dkDrop");if(z&&!z.contains(e.relatedTarget))z.classList.remove("over");});
document.addEventListener("drop",e=>{if(D.batch&&e.target.closest&&e.target.closest("#dkBatch")){e.preventDefault();batchFiles(e.dataTransfer.files);}});
document.addEventListener("paste",e=>{if(!D.batch||!e.target.closest||!e.target.closest("#dkBatch"))return;const txt=(e.clipboardData||window.clipboardData).getData("text");
  if(txt&&(/\t/.test(txt)||/\n\s*\S/.test(txt.trim()))){e.preventDefault();batchPaste(txt);}});

/* ---------- desktop home ---------- */
function deskHome(){
  const m=VIEW.month,y=+m.slice(0,4),mo=+m.slice(5,7),g=goalRow(y,mo),prof=monthProfit(m),sales=monthSales(m),soldN=soldIn(m).length;
  const ytd=S.projects.filter(p=>p.status==="Sold"&&p.soldOn&&p.soldOn.slice(0,4)===String(y)&&monthKey(p.soldOn)<=m);
  const ytdP=r2(ytd.reduce((s,p)=>s+(profitOf(p)||0),0)),ytdS=ytd.reduce((s,p)=>s+(p.sold||0),0);
  const open=S.projects.filter(isOpen),listed=open.filter(p=>p.status==="Listed");
  const dts=ytd.map(daysToSell).filter(d=>d!=null),avgD=dts.length?Math.round(dts.reduce((a,b)=>a+b,0)/dts.length):null;
  const gp=g&&g.goal?Math.max(0,Math.min(1,prof/g.goal)):null;
  /* 12-month chart with goal marks */
  const months=[];for(let i=1;i<=12;i++){const k=y+"-"+pad(i),gr=goalRow(y,i);months.push({k,i,v:k<=today().slice(0,7)?monthProfit(k):null,g:gr&&gr.goal!=null?gr.goal:null});}
  const mx=Math.max(1,...months.map(x=>Math.max(x.v||0,x.g||0)));
  const chart=`<div class="dh-chart" role="img" aria-label="Net profit by month in ${y}, with monthly goals">${months.map(x=>{const h=x.v>0?Math.max(4,Math.round(x.v/mx*170)):3,cur=x.k===m;
    return`<div class="dh-col"><span class="small ${cur?"b":"muted"}">${x.v?money0(x.v).replace(/,000$/,"k"):""}</span><div class="dh-bar-wrap">${x.g!=null?`<i class="dh-goal" style="bottom:${Math.round(x.g/mx*170)}px" title="Goal ${money0(x.g)}"></i>`:""}<div class="dh-bar" style="height:${h}px;background:${x.v==null?"var(--line)":cur?"var(--pink)":x.v>0?"var(--bar)":"var(--line2)"}"></div></div><span class="small ${cur?"b":"muted"}">${MONTHS[x.i-1].slice(0,3)}</span></div>`;}).join("")}</div>`;
  /* needs a look */
  const look=[];
  listed.forEach(p=>{const li=listInfo(p);
    if(!li.start)look.push({c:"warm",p,t:pTitle(p),s:"Listed, but the listing date is missing · add it"});
    else if(li.days>=21&&!li.inq)look.push({c:"warm",p,t:pTitle(p),s:"Listed "+li.days+" days, no inquiries · try a price drop"});
    else if(li.days>=7&&(!li.checked||daysBetween(li.checked,today())>=7))look.push({c:"blue",p,t:pTitle(p),s:"No check-in for a week · update views and inquiries"});});
  S.supplies.filter(isLow).forEach(s=>look.push({c:"warm",sup:s,t:s.name,s:r2(s.onHand||0)+" "+(s.unit||"")+" left · low at "+s.lowAt+" "+(s.unit||"")}));
  open.filter(p=>p.status==="Not started").forEach(p=>look.push({c:"blue",p,t:pTitle(p),s:"Bought"+(p.paid!=null?" for "+money0(p.paid):"")+", not started yet"}));
  const lookHTML=look.slice(0,6).map(x=>`<button type="button" class="dh-look" ${x.p?`data-act="dkOpenP" data-id="${x.p.id}"`:`data-act="supply" data-id="${x.sup.id}"`}><span class="dot" style="background:var(--${x.c})"></span><span class="grow" style="display:flex;flex-direction:column"><span class="b">${esc(x.t)}</span><span class="small muted">${esc(x.s)}</span></span>${I.chev||""}</button>`).join("")
    +(look.length>6?`<span class="small muted">and ${look.length-6} more</span>`:"");
  /* on the bench */
  const bench=open.filter(p=>p.status==="In progress").map(p=>{const st=stepState(p),i=st.findIndex(s=>s.state==="cur"),n=st.length-1;return{p,i,n,name:i>=0?st[i].name:"",pct:i>0?Math.round(i/n*100):0};}).sort((a,b)=>b.pct-a.pct);
  const benchHTML=bench.map(b=>`<button type="button" class="dh-bench" data-act="dkOpenP" data-id="${b.p.id}"><span class="b">${esc(pTitle(b.p))}</span><span class="small muted">${b.p.started?"Started "+fmtShort(b.p.started)+" · ":""}${hrs(hoursOf(b.p))} so far</span><span class="track"><i style="width:${b.pct}%"></i></span><span class="small b" style="color:var(--mint)">${b.i>0?esc(b.name)+" · step "+b.i+" of "+b.n:b.i===0?"Pick-up":"Not logged yet"}</span>${TIMER&&TIMER.pid===b.p.id?'<span class="chip c-mint" style="align-self:flex-start">Timer running</span>':""}</button>`).join("");
  return`<header class="top"><div class="grow"><h1>Shop snapshot</h1><div class="sub">${esc(monthName(m))}</div></div>${monthNav()}
    <button type="button" class="btn sm ghost" data-act="receipt">${I.camera}Add receipt</button><button type="button" class="btn sm" data-act="newProject">${I.plus}Add project</button>${syncBtn}</header>
  <main>
    <div class="dh-tiles">
      <section class="hero dh-hero" aria-label="Net profit this month"><span class="small b">Net profit · ${esc(MONTHS[mo-1])}</span><span class="big">${money(prof)}</span><span class="small">${soldN} piece${soldN===1?"":"s"} sold · ${money0(sales)} in sales</span>
        ${gp!=null?`<div class="meter" style="margin-top:8px"><i style="width:${Math.round(gp*100)}%"></i></div><span class="small b">${Math.round(prof/g.goal*100)}% of your ${money0(g.goal)} monthly goal</span>`:`<button type="button" class="link" style="color:var(--pink2);align-self:flex-start" data-act="goals">Set a goal for this month</button>`}</section>
      <div class="tile"><span class="l">Sold this month</span><span class="v">${soldN} piece${soldN===1?"":"s"}</span><span class="s">${g&&g.min!=null?"forecast "+g.min+(g.max!=null&&g.max!==g.min?"–"+g.max:""):"no forecast set"}</span></div>
      <div class="tile"><span class="l">Net profit ${y}</span><span class="v">${money0(ytdP)}</span><span class="s">January to ${esc(MONTHS[mo-1])}</span></div>
      <div class="tile"><span class="l">Profit margin</span><span class="v">${ytdS?pct(ytdP/ytdS):"–"}</span><span class="s">${y} so far</span></div>
      <div class="tile"><span class="l">Average days to sell</span><span class="v">${avgD!=null?avgD+" day"+(avgD===1?"":"s"):"–"}</span><span class="s">${y} so far</span></div>
    </div>
    <div class="dh-row">
      <section class="card dh-card dh-grow"><div class="between"><h2>Net profit by month, ${y}</h2>${months.some(x=>x.g!=null)?'<span class="small muted row" style="gap:6px"><i class="dh-key"></i>Goal</span>':`<button type="button" class="link" data-act="goals">Set goals</button>`}</div>${chart}</section>
      <section class="card dh-card dh-side"><h2>Needs a look</h2>${lookHTML||'<p class="small muted" style="margin:0">All clear. Nothing waiting on you.</p>'}</section>
    </div>
    <section class="card dh-card"><div class="between"><h2>On the bench · ${bench.length}</h2><button type="button" class="link" data-act="gotab" data-v="projects" data-f="Active">All projects</button></div>
      ${benchHTML?`<div class="dh-benches">${benchHTML}</div>`:'<p class="small muted" style="margin:0">Nothing in progress. Start a project from Projects.</p>'}</section>
  </main>`;
}
document.addEventListener("click",e=>{const b=e.target.closest('[data-act="dkOpenP"]');if(!b)return;VIEW.tab="projects";LS.set("tab","projects");D.edit=false;openProject(b.dataset.id);});

let rzT=null;window.addEventListener("resize",()=>{if(!DESK||VIEW.tab!=="money"||VIEW.money!=="pnl")return;clearTimeout(rzT);rzT=setTimeout(()=>{if(!holdRender())render();},150);});
