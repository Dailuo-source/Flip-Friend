/* =====================================================================
   SCREENS
   ===================================================================== */
let VIEW={tab:LS.get("tab","home"),project:null,sub:"steps",pf:LS.get("pf","All"),sort:LS.get("sort","recent"),money:"expenses",
  month:today().slice(0,7),lperiod:"all",q:"",open:{},soldAll:false};
let TIMER=null;try{TIMER=JSON.parse(LS.get("timer","null"));}catch(e){TIMER=null;}
const TABS=[["home","Home",I.home],["projects","Projects",I.projects],["listings","Listings",I.listings],["supplies","Supplies",I.supplies],["money","Money",I.money]];

function renderNav(){
  document.body.classList.toggle("desk",DESK);
  if(DESK)$("#tabs").innerHTML=deskNav();else $("#tabs").innerHTML='<div class="in">'+TABS.map(t=>`<button type="button" data-tab="${t[0]}" class="${VIEW.tab===t[0]&&!VIEW.project?"on":""}"${VIEW.tab===t[0]?' aria-current="page"':""}>${t[2]}${t[1]}</button>`).join("")+"</div>";
  $("#tabs").hidden=!API||!KEY||auth==="need";
}
function render(){
  renderNav();
  const app=$("#app");
  if(!API||!KEY||auth==="need"){app.innerHTML=viewConnect();return;}
  if(!ready){app.innerHTML=`<header class="top">${LOGO}<div class="grow"><h1>Flip Friend</h1><div class="sub">Refinished by Cecilia</div></div><button type="button" class="sync" id="sync" data-act="sync">Connecting…</button></header><div class="empty">Loading your projects…</div>`;return;}
  let html;
  if(DESK)html=deskView();
  else if(VIEW.project&&pById(VIEW.project))html=viewProject(pById(VIEW.project));
  else{VIEW.project=null;html={home:viewHome,projects:viewProjects,listings:viewListings,supplies:viewSupplies,money:viewMoney}[VIEW.tab]();}
  app.innerHTML=html;
  setSync(inflight?(queue.length?"saving":"loading"):auth!=="ok"?"off":lastSync?"ok":"connecting");
  hydrateImages(app);tickTimers();
}
function onData(){if(!ready)return;if(holdRender()){heldRender=true;return;}render();}
const syncBtn='<button type="button" class="sync" id="sync" data-act="sync">…</button>';
const monthNav=()=>`<div class="row" style="gap:4px"><button type="button" class="icon-btn" style="width:36px;height:36px" data-act="month" data-v="-1" aria-label="Previous month">${I.left}</button><span class="b small" style="min-width:96px;text-align:center;font-size:13px">${esc(monthName(VIEW.month))}</span><button type="button" class="icon-btn" style="width:36px;height:36px" data-act="month" data-v="1" aria-label="Next month">${I.right}</button></div>`;

/* ---------- connect ---------- */
function viewConnect(){
  return`<div class="connect">${LOGO}<h1 style="margin:0;font-size:26px">Flip Friend</h1>
  <p class="muted" style="margin:0">${auth==="need"?"That app key didn't work. ":""}Open the phone link from your sheet to connect: in the Flip Friend sheet, use the <b>Flip Friend</b> menu → <b>Show app key and phone link</b>.</p>
  <p class="muted small" style="margin:0">Or paste the two values here:</p>
  <label class="f">Web app link<input class="input" id="cApi" value="${esc(API)}" placeholder="https://script.google.com/macros/s/…/exec"></label>
  <label class="f">App key<input class="input" id="cKey" value="${esc(KEY)}" autocomplete="off"></label>
  <button type="button" class="btn full" data-act="connect">Connect</button></div>`;
}

/* ---------- home ---------- */
function viewHome(){
  const m=VIEW.month,y=+m.slice(0,4),mo=+m.slice(5,7);
  const g=goalRow(y,mo),prof=monthProfit(m),sales=monthSales(m),soldN=soldIn(m).length;
  const ytd=S.projects.filter(p=>p.status==="Sold"&&p.soldOn&&p.soldOn.slice(0,4)===String(y)&&monthKey(p.soldOn)<=m);
  const ytdP=r2(ytd.reduce((s,p)=>s+(profitOf(p)||0),0)),ytdS=ytd.reduce((s,p)=>s+(p.sold||0),0);
  const open=S.projects.filter(isOpen),listed=open.filter(p=>p.status==="Listed");
  const months=[];for(let i=5;i>=0;i--)months.push(shiftMonth(m,-i));
  const vals=months.map(monthProfit),mx=Math.max(1,...vals.map(v=>Math.max(0,v)));
  let best=null;for(let i=1;i<=12;i++){const k=y+"-"+pad(i);if(k>today().slice(0,7))break;const v=monthProfit(k);if(!best||v>best.v)best={k,v};}
  const gp=g&&g.goal?Math.max(0,Math.min(1,prof/g.goal)):null;
  return`<header class="top">${LOGO}<div class="grow"><h1>Flip Friend</h1><div class="sub">Refinished by Cecilia</div></div>${syncBtn}</header>
  <main>
    <div class="between"><h2 class="h2" style="font-size:17px">Shop snapshot</h2>${monthNav()}</div>
    <section class="hero" aria-label="Net profit this month">
      <span class="small b">Net profit · ${esc(MONTHS[mo-1])}</span>
      <span class="big">${money(prof)}</span>
      <span class="small">${soldN} piece${soldN===1?"":"s"} sold · ${money0(sales)} in sales</span>
      ${gp!=null?`<div class="meter" style="margin-top:8px"><i style="width:${Math.round(gp*100)}%"></i></div><span class="small b">${Math.round(prof/g.goal*100)}% of your ${money0(g.goal)} monthly goal</span>`:`<button type="button" class="link" style="color:var(--pink2);align-self:flex-start" data-act="goals">Set a goal for this month</button>`}
    </section>
    <div class="grid2">
      <div class="tile"><span class="l">Sold this month</span><span class="v">${soldN} piece${soldN===1?"":"s"}</span><span class="s">${g&&g.min!=null?"forecast "+g.min+(g.max!=null&&g.max!==g.min?"–"+g.max:""):"no forecast set"}</span></div>
      <div class="tile"><span class="l">Net profit ${y}</span><span class="v">${money0(ytdP)}</span><span class="s">January to ${esc(MONTHS[mo-1])}</span></div>
      <div class="tile"><span class="l">Profit margin</span><span class="v">${ytdS?pct(ytdP/ytdS):"–"}</span><span class="s">${y} so far</span></div>
      <button type="button" class="tile" style="text-align:left;color:inherit" data-act="gotab" data-v="projects" data-f="Active"><span class="l">Open projects</span><span class="v">${open.length} project${open.length===1?"":"s"}</span><span class="s" style="color:var(--mint);font-weight:700">${listed.length} listed</span></button>
    </div>
    <section class="card" style="display:flex;flex-direction:column;gap:10px">
      <h2>Net profit by month</h2>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;align-items:end;height:104px" role="img" aria-label="Net profit for the last six months">
      ${months.map((k,i)=>{const v=vals[i],h=v>0?Math.max(3,Math.round(v/mx*70)):3,cur=k===m;return`<div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:10px;font-weight:700;color:${cur?"var(--ink)":"var(--muted)"}">${money0(v)}</span><div style="width:100%;height:${h}px;border-radius:${v>0?6:2}px;background:${cur?"var(--pink)":"var(--bar)"}"></div><span style="font-size:11px;font-weight:${cur?800:700};color:${cur?"var(--ink)":"var(--muted)"}">${MONTHS[+k.slice(5,7)-1].slice(0,3)}</span></div>`;}).join("")}
      </div>
      ${best&&best.v>0?`<span class="small muted">Best month this year: ${MONTHS[+best.k.slice(5,7)-1]}, ${money0(best.v)}</span>`:""}
    </section>
  </main>`;
}

/* ---------- projects list ---------- */
const PF={All:p=>true,Active:isOpen,Done:p=>p.status==="Sold",Disposed:p=>p.status==="Disposed"};
const SORTS=[["recent","Most recent"],["edited","Recently edited"],["high","Highest value"],["low","Lowest value"],["profit","Highest profit"],["number","Project number"]];
function sortProjects(a){
  const val=p=>p.status==="Sold"?(p.sold||0):(listInfo(p).now||p.list||p.paid||0);
  const s={recent:(x,y)=>noNum(y.no)-noNum(x.no),edited:(x,y)=>String(y.updated||"").localeCompare(String(x.updated||""))||noNum(y.no)-noNum(x.no),
    high:(x,y)=>val(y)-val(x),low:(x,y)=>val(x)-val(y),profit:(x,y)=>(profitOf(y)??-1e9)-(profitOf(x)??-1e9),number:(x,y)=>noNum(x.no)-noNum(y.no)}[VIEW.sort]||((x,y)=>noNum(y.no)-noNum(x.no));
  return a.slice().sort(s);
}
function projectCard(p){
  let meta="",right="";
  if(p.status==="Sold"){meta="Sold "+(p.soldOn?fmtShort(p.soldOn):"")+" · "+money0(p.sold);const pr=profitOf(p);right=`<span class="right ${pr<0?"neg":"pos"}">${pr<0?"":"+"}${money(pr)}</span>`;}
  else if(p.status==="Listed"||p.status==="Pending"){const li=listInfo(p);meta=(p.status==="Pending"?"Pending at ":"Listed at ")+money0(li.now)+(li.drops?" · "+li.drops+" drop"+(li.drops>1?"s":""):"")+(li.inq?" · "+li.inq+" inquiries":"");}
  else if(p.status==="In progress"){meta=(p.started?"Started "+fmtShort(p.started)+" · ":"")+hrs(hoursOf(p))+" so far";const st=stepState(p),i=st.findIndex(s=>s.state==="cur");right=`<span class="right">${i>0?Math.round(i/(st.length-1)*100)+"%":""}</span>`;}
  else if(p.status==="Disposed")meta="Disposed";
  else meta="Bought for "+money(p.paid||0);
  return`<button type="button" class="pcard" data-act="open" data-id="${p.id}">${thumbHTML(p)}<div class="pmeta"><span class="pname">#${esc(p.no)} ${esc(p.name)}</span><span class="small muted">${esc(meta)}</span><span>${statusChip(p)}</span></div>${right}</button>`;
}
function viewProjects(){
  const all=S.projects;const counts={ip:all.filter(p=>p.status==="In progress").length,ns:all.filter(p=>p.status==="Not started").length,ls:all.filter(p=>p.status==="Listed").length,pd:all.filter(p=>p.status==="Pending").length,sold:all.filter(p=>p.status==="Sold").length};
  const shown=sortProjects(all.filter(PF[VIEW.pf]||PF.All));
  return`<header class="top"><div class="grow"><h1>Projects</h1><div class="sub">${counts.ip} in progress · ${counts.ns} not started · ${counts.ls} listed${counts.pd?" · "+counts.pd+" pending":""} · ${counts.sold} sold</div></div>${syncBtn}</header>
  <main>
    <div class="pills" role="group" aria-label="Show">${Object.keys(PF).map(k=>`<button type="button" class="pill ${VIEW.pf===k?"on":""}" data-act="pf" data-v="${k}" aria-pressed="${VIEW.pf===k}">${k}</button>`).join("")}</div>
    <div class="between"><span class="small muted b">${shown.length} project${shown.length===1?"":"s"}</span>
      <label class="row small b muted" style="gap:8px">Sort<select class="input" style="height:36px;width:auto;border-radius:18px;font-size:13px" data-act="sort">${SORTS.map(s=>opt(s[0],VIEW.sort,s[1])).join("")}</select></label></div>
    <div class="list">${shown.map(projectCard).join("")||'<div class="empty">Nothing here yet.</div>'}</div>
  </main>
  <button type="button" class="fab" data-act="newProject">${I.plus}Add project</button>`;
}

/* ---------- project page ---------- */
function viewProject(p){
  const li=listInfo(p),sold=p.status==="Sold";
  const subs=[["steps","Steps"],["costs","Costs"],["listing","Listing"],["inspo","Inspiration"]];
  const body={steps:subSteps,costs:subCosts,listing:subListing,inspo:subInspo}[VIEW.sub]||subSteps;
  return`<header class="top" style="padding-bottom:0"><button type="button" class="back" data-act="close" aria-label="Back to projects">${I.back}</button><div class="grow" style="text-align:center;font-weight:800">Project</div><button type="button" class="link" style="font-size:14px;padding:0 4px" data-act="editProject">Edit</button></header>
  <main style="gap:10px">
    <div class="row" style="gap:14px">
      <div style="position:relative">${thumbHTML(p,true)}<button type="button" data-act="pic" aria-label="Change picture" style="position:absolute;right:-6px;bottom:-6px;width:30px;height:30px;border-radius:15px;border:2px solid var(--bg);background:var(--pink);color:var(--pinkInk);display:flex;align-items:center;justify-content:center;padding:0">${I.pencil.replace("<svg",'<svg width="14" height="14"')}</button></div>
      <div class="grow" style="display:flex;flex-direction:column;gap:3px">
        <div class="row" style="gap:6px"><span class="chip c-ink">#${esc(p.no)}</span>${statusChip(p)}</div>
        <h1 style="margin:0;font-size:19px;font-weight:800;line-height:1.2">${esc(p.name)}</h1>
        <span class="small muted">${p.started?"Started "+fmtLong(p.started):"Bought for "+money(p.paid||0)}</span>
      </div>
    </div>
    <div class="grid4">
      <div class="tile sm"><span class="l">Bought for</span><span class="v">${money(p.paid||0)}</span></div>
      <div class="tile sm"><span class="l">Supplies</span><span class="v">${money(costsOf(p))}</span></div>
      <div class="tile sm"><span class="l">Hours</span><span class="v">${hrs(hoursOf(p))}</span></div>
      <div class="tile sm"><span class="l">${sold?"Sold for":"List price"}</span><span class="v">${sold?money0(p.sold):li.now!=null?money0(li.now):"–"}</span></div>
    </div>
    <div class="seg" role="group" aria-label="Project sections">${subs.map(s=>`<button type="button" class="${VIEW.sub===s[0]?"on":""}" data-act="sub" data-v="${s[0]}" aria-pressed="${VIEW.sub===s[0]}">${s[1]}</button>`).join("")}</div>
    ${body(p)}
  </main>`;
}
function timerHTML(p,step){return`<div class="timer"><div style="display:flex;flex-direction:column"><span class="t" data-timer>0:00:00</span><span class="s">${esc(step)} · timer running</span></div><button type="button" class="btn sm" data-act="stopTimer">Stop &amp; save</button></div>`;}
function subSteps(p){
  const st=stepState(p),tOn=TIMER&&same(TIMER.project,p.no);
  return`<section class="card steps"><p class="small muted" style="margin:0 0 8px">Tap a time entry to change its date, step or hours.</p>
  ${st.map((s,i)=>{
    const last=i===st.length-1,running=tOn&&eqi(TIMER.step,s.name);
    const open=s.state==="cur"||running||VIEW.open[p.id+"|"+s.name];
    const dates=s.entries.map(e=>e.date).filter(Boolean).sort();
    const sub=stepDetail(s.name)+(dates.length?" · "+fmtShort(dates[0]):"");
    const dot=s.state==="done"?`<span class="dot done">${I.check}</span>`:s.state==="cur"?`<span class="dot cur">${i||"P"}</span>`:`<span class="dot todo">${i||"P"}</span>`;
    return`<div class="st"><div class="rail">${dot}${last?"":`<span class="line ${s.state==="done"?"done":""}"></span>`}</div><div class="body">
      <button type="button" class="head" data-act="toggleStep" data-v="${esc(s.name)}" aria-expanded="${!!open}"><span style="display:flex;flex-direction:column;min-width:0"><span style="font-size:${s.state==="cur"?15:14}px;font-weight:800;color:${s.state==="cur"?"var(--pink2)":s.state==="todo"&&!s.entries.length?"var(--muted)":"var(--ink)"}">${i?i+" · ":""}${esc(s.name)}</span><span class="small muted">${esc(sub)}</span></span>
      ${s.entries.length?`<span class="hchip">${hrs(s.hours)}</span>`:(!TIMER?`<span class="hchip" data-act="startTimer" data-v="${esc(s.name)}" role="button" tabindex="0">Start</span>`:"")}</button>
      ${open?`${s.entries.map(e=>`<button type="button" class="entry" data-act="editTime" data-id="${e.id}"><span>${esc(e.label||s.name)}${e.date?" · "+fmtShort(e.date):""}</span><span class="row" style="gap:4px">${hrs(e.hours||0)}${I.pencil}</span></button>`).join("")}
      ${running?timerHTML(p,s.name):""}
      <div class="row" style="gap:14px">${!TIMER?`<button type="button" class="link" data-act="startTimer" data-v="${esc(s.name)}">Start timer</button>`:""}<button type="button" class="link" data-act="addTime" data-v="${esc(s.name)}">+ Add hours by hand</button></div>`:""}
    </div></div>`;}).join("")}
  ${TIMER&&!tOn?`<p class="small muted" style="margin:0 0 10px">A timer is running on #${esc(TIMER.project)} (${esc(TIMER.step)}).</p>`:""}
  </section>`;
}
function subCosts(p){
  const u=usesOf(p).slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
  const total=r2((p.paid||0)+costsOf(p)),li=listInfo(p),pr=profitOf(p),h=hoursOf(p);
  /* Supply costs grouped by cost category, in refinishing-step order */
  const groups=COSTCATS().map(c=>({c,items:u.filter(x=>catOf(x)===c)})).filter(g=>g.items.length);
  const item=(x,sub)=>`<button type="button" class="lrow${sub?" sub":""}" data-act="editUse" data-id="${x.id}"><span class="grow"><span class="${sub?"":"b"}">${esc(x.supply)}</span>${x.amount!=null?`<span class="muted small"> · ${esc(x.amount)} ${esc(x.unit||"")}</span>`:""}${x.shared?`<span class="muted small"> · shared</span>`:""}</span><span class="${sub?"":"b"}">${money(x.cost||0)}</span></button>`;
  const grp=g=>g.items.length===1&&eqi(g.items[0].supply,g.c)?item(g.items[0]):`<div class="cgrp"><div class="between"><span class="b">${esc(g.c)}</span><span class="b">${money(r2(g.items.reduce((s,x)=>s+(x.cost||0),0)))}</span></div>${g.items.map(x=>item(x,true)).join("")}</div>`;
  return`<section class="card" style="display:flex;flex-direction:column;gap:6px">
    <div class="between"><h2>Costs</h2><button type="button" class="btn sm ghost" data-act="useForProject">+ Log supply use</button></div>
    <div class="between small muted" style="margin-top:-2px"><span>Grouped by step</span><button type="button" class="link" style="font-size:13px" data-act="costCats">Edit categories</button></div>
    <button type="button" class="lrow" data-act="editProject"><span class="grow b">Furniture (price paid)</span><span class="b">${money(p.paid||0)}</span></button>
    ${groups.map(grp).join("")||'<p class="small muted" style="margin:4px 0">No supplies logged yet.</p>'}
    <div class="between" style="padding-top:6px;border-top:1px solid var(--line)"><span class="b">Total in</span><span class="b" style="font-size:16px">${money(total)}</span></div>
    ${p.status==="Sold"?`<div class="okbox between" style="padding:9px 12px"><span class="b">Profit</span><span class="b" style="font-size:18px">${money(pr)}</span></div>${h?`<span class="small muted">${hrs(h)} of work · ${money(pr/h)} per hour</span>`:""}`
      :li.now!=null?`<div class="okbox between" style="padding:9px 12px"><span class="b">If it sells at ${money0(li.now)}</span><span class="b">${money(r2(li.now-total))} profit</span></div>`:""}
  </section>`;
}
function subListing(p){
  const li=listInfo(p),sold=p.status==="Sold";
  const rows=li.ev.map(e=>{const isDrop=/drop/i.test(e.event),isSold=/^sold$/i.test(e.event),isCheck=/check/i.test(e.event);
    const label=isCheck?"Interest update":e.event+(e.platform&&!isDrop?" · "+e.platform:"");
    const extra=isCheck?[e.views!=null?e.views+" views":"",e.saves!=null?e.saves+" saves":"",e.inquiries!=null?e.inquiries+(e.inquiries===1?" inquiry":" inquiries"):""].filter(Boolean).join(" · "):"";
    return`<button type="button" class="lrow" data-act="editEvent" data-id="${e.id}"><span style="width:12px;height:12px;border-radius:6px;flex-shrink:0;background:${isSold?"var(--mint2)":isDrop?"var(--orange)":isCheck?"var(--lav)":"var(--muted)"}"></span><span class="grow" style="display:flex;flex-direction:column"><span class="b">${esc(label)}</span><span class="small muted">${e.date?fmtShort(e.date):"add a date"}${extra?" · "+esc(extra):""}${e.notes?" · "+esc(e.notes):""}</span></span>${e.price!=null?`<span class="b">${money0(e.price)}</span>`:""}</button>`;}).join("");
  const started=li.ev.some(e=>/^(listed|relisted)$/i.test(e.event));
  return`<div class="grid4">
      <div class="tile sm"><span class="l">Days listed</span><span class="v">${li.days!=null?li.days:"–"}</span></div>
      <div class="tile sm"><span class="l">${sold?"Sold for":"Price now"}</span><span class="v">${sold?money0(p.sold):li.now!=null?money0(li.now):"–"}</span></div>
      <div class="tile sm"><span class="l">Price drops</span><span class="v">${li.drops}</span></div>
      <div class="tile sm"><span class="l">Inquiries</span><span class="v">${li.inq!=null?li.inq:"–"}</span></div>
    </div>
    ${p.status==="Pending"?`<section class="card" style="display:flex;flex-direction:column;gap:8px;border-color:var(--bar)"><span class="b" style="color:var(--pink2)">Sale pending</span><span class="small muted">Someone has committed to buy it. Mark it sold once it's paid for and picked up.</span><div class="row" style="gap:8px"><button type="button" class="btn sm" style="flex:1" data-act="markSold">Mark sold</button><button type="button" class="btn sm ghost" style="flex:1" data-act="setPending" data-v="0">Back on the market</button></div></section>`:p.status==="Listed"?`<button type="button" class="btn sm ghost" data-act="setPending" data-v="1">Sale pending</button>`:""}
    ${sold?`<section class="okbox" style="display:flex;flex-direction:column;gap:4px"><div class="between"><span class="b">Sold ${p.soldOn?fmtLong(p.soldOn):""}</span><span class="b" style="font-size:20px">${money(profitOf(p))}</span></div>
      <span class="small b">${money0(p.sold)}${p.list?" of "+money0(p.list)+" asking ("+pct(p.sold/p.list)+")":""}${p.soldThrough?" · "+esc(p.soldThrough):""}${p.fee?" · "+money(p.fee)+" delivery":""}</span>
      <div class="row" style="gap:14px"><button type="button" class="link" style="color:var(--mint)" data-act="markSold">Edit sale</button><button type="button" class="link" style="color:var(--mint)" data-act="undoSale">Undo sale</button></div></section>`:""}
    <section class="card" style="display:flex;flex-direction:column;gap:4px">
      <h2>Price history</h2>
      ${rows||'<p class="small muted" style="margin:4px 0">Not listed yet.</p>'}
      ${sold?`<span class="small muted" style="padding-top:4px">Sold pieces can still be corrected: tap an entry to edit it, or add one below.</span>`:""}
      <div class="row" style="gap:8px;padding-top:6px">${started?`<button type="button" class="btn sm ghost" style="flex:1" data-act="listEvent" data-v="Price drop">Drop price</button><button type="button" class="btn sm ghost" style="flex:1" data-act="listEvent" data-v="Relisted">Relist / new platform</button>`:`<button type="button" class="btn sm ghost" style="flex:1" data-act="listEvent" data-v="Listed">Start listing</button>`}</div>
    </section>
    ${started||sold||li.inq!=null?`<section class="card" style="display:flex;flex-direction:column;gap:10px">
      <div class="between"><h2>Market interest</h2>${li.checked?`<span class="small muted">updated ${fmtShort(li.checked)}</span>`:""}</div>
      <div class="grid3" style="text-align:center">
        <div style="display:flex;flex-direction:column"><span class="b" style="font-size:20px">${li.views!=null?li.views:"–"}</span><span class="small muted">views</span></div>
        <div style="display:flex;flex-direction:column"><span class="b" style="font-size:20px">${li.saves!=null?li.saves:"–"}</span><span class="small muted">saves</span></div>
        <div style="display:flex;flex-direction:column"><span class="b" style="font-size:20px">${li.inq!=null?li.inq:"–"}</span><span class="small muted">inquiries</span></div>
      </div>
      <div class="row" style="gap:8px"><button type="button" class="btn sm" style="flex:1;background:var(--lavBg);color:var(--lav)" data-act="plusInquiry">+1 inquiry</button><button type="button" class="btn sm ghost" style="flex:1" data-act="listEvent" data-v="Check-in">Update numbers</button></div>
    </section>`:""}
    ${!sold&&p.status!=="Disposed"?`<button type="button" class="btn full" data-act="markSold">${I.check.replace("<svg",'<svg width="20" height="20"')}Mark as sold</button>`:""}`;
}
function subInspo(p){
  const pics=S.inspiration.filter(x=>same(x.project,p.no));
  return`<div class="between"><h2 class="h2" style="font-size:16px">Pictures · ${pics.length}</h2><button type="button" class="btn sm" data-act="addInspo">+ Add pictures</button></div>
  <div class="gallery">${pics.map(x=>`<figure><div class="ph"><span style="color:var(--muted)">${I.photo}</span><img data-img="${esc(x.picture)}" alt="${esc(x.caption||"Inspiration picture")}" hidden style="position:absolute;inset:0"><button type="button" class="more" data-act="inspoMenu" data-id="${x.id}" aria-label="Edit, replace or delete this picture">${I.dots}</button></div>${x.caption?`<figcaption>${esc(x.caption)}</figcaption>`:""}</figure>`).join("")}
  <button type="button" class="addtile" data-act="addInspo">${I.plus.replace("<svg",'<svg width="26" height="26"')}Add picture</button></div>
  <label class="f" style="font-size:16px;color:var(--ink);font-weight:800">Notes<textarea class="input" rows="5" data-act="inspoNotes" placeholder="Colours, finishes, hardware ideas…">${esc(p.inspoNotes||"")}</textarea></label>`;
}

/* ---------- listings (market performance) ---------- */
const LPERIODS=[["all","All time"],["year","This year"],["90","Last 90 days"]];
function inPeriod(k){if(!k)return VIEW.lperiod==="all";if(VIEW.lperiod==="year")return k.slice(0,4)===today().slice(0,4);if(VIEW.lperiod==="90")return daysBetween(k,today())<=90;return true;}
function viewListings(){
  const sold=S.projects.filter(p=>p.status==="Sold"&&inPeriod(p.soldOn));
  const priced=sold.filter(p=>p.sold!=null&&p.list);
  const ratio=priced.length?priced.reduce((s,p)=>s+p.sold/p.list,0)/priced.length:null;
  const full=priced.filter(p=>p.sold>=p.list).length;
  const disc=priced.length?priced.reduce((s,p)=>s+Math.max(0,p.list-p.sold),0)/priced.length:null;
  const dts=sold.map(daysToSell).filter(d=>d!=null);
  const avgD=dts.length?dts.reduce((a,b)=>a+b,0)/dts.length:null;
  const helped=sold.filter(needsHelp);
  const listed=S.projects.filter(p=>p.status==="Listed"||p.status==="Pending").map(p=>({p,li:listInfo(p)})).sort((a,b)=>(b.li.days??-1)-(a.li.days??-1));
  const recent=sold.slice().sort((a,b)=>String(b.soldOn||"").localeCompare(String(a.soldOn||"")));
  const B=[["Under a day",d=>d<1],["1–7 days",d=>d>=1&&d<=7],["8–14 days",d=>d>7&&d<=14],["15–28 days",d=>d>14&&d<=28],["Over 4 weeks",d=>d>28]];
  const bc=B.map(b=>dts.filter(b[1]).length),bm=Math.max(1,...bc);
  const inq=S.projects.filter(p=>p.status==="Sold").map(p=>listInfo(p).inq).filter(x=>x!=null);
  return`<header class="top"><div class="grow"><h1>Listings</h1><div class="sub">How your pieces do on the market</div></div>${syncBtn}</header>
  <main>
    <div class="pills" role="group" aria-label="Period">${LPERIODS.map(l=>`<button type="button" class="pill ${VIEW.lperiod===l[0]?"on":""}" data-act="lperiod" data-v="${l[0]}" aria-pressed="${VIEW.lperiod===l[0]}">${l[1]}</button>`).join("")}</div>
    <div class="grid2">
      <div class="tile"><span class="l">Sold vs asking</span><span class="v">${pct(ratio)}</span><span class="s">average of ${priced.length} sale${priced.length===1?"":"s"}</span></div>
      <div class="tile"><span class="l">Full asking price</span><span class="v">${full} of ${priced.length}</span><span class="s">avg discount ${disc!=null?money0(disc):"–"}</span></div>
      <div class="tile"><span class="l">Time to sell</span><span class="v">${avgD!=null?Math.round(avgD)+" day"+(Math.round(avgD)===1?"":"s"):"–"}</span><span class="s">average${dts.length<sold.length?" ("+dts.length+" with dates)":""}</span></div>
      <div class="tile"><span class="l">Price drop or relist</span><span class="v">${helped.length} of ${sold.length}</span><span class="s">${inq.length?"avg "+Math.round(inq.reduce((a,b)=>a+b,0)/inq.length)+" inquiries per sale":"inquiries tracked from now on"}</span></div>
    </div>
    ${DESK?deskListed(listed):`    <section class="card" style="padding:10px 14px 4px">
      <div class="between" style="padding-bottom:4px"><h2>Listed now · ${listed.length}</h2><span class="small muted b">days · drops · inquiries</span></div>
      ${listed.map(({p,li})=>`<button type="button" class="lrow" data-act="open" data-id="${p.id}" data-sub="listing"><span class="grow" style="display:flex;flex-direction:column;min-width:0"><span class="b">#${esc(p.no)} ${esc(p.name)}</span><span class="small" style="color:${li.start?"var(--muted)":"var(--warm)"}">${li.now!=null?money0(li.now):""}${li.drops&&li.firstPrice!=null&&li.firstPrice!==li.now?" · down from "+money0(li.firstPrice):""}${li.start?"":" · add the date you listed it"}</span></span><span class="b small" style="white-space:nowrap">${li.days!=null?li.days+"d":"–"} · ${li.drops} · ${li.inq!=null?li.inq:"–"}</span>${I.chev}</button>`).join("")||'<p class="small muted" style="margin:4px 0 10px">Nothing listed right now.</p>'}
    </section>`}
    <section class="card" style="padding:10px 14px 4px">
      <div class="between" style="padding-bottom:4px"><h2>Sold</h2><span class="small muted b">sold of asking</span></div>
      ${(VIEW.soldAll?recent:recent.slice(0,6)).map(p=>`<button type="button" class="lrow" data-act="open" data-id="${p.id}" data-sub="listing"><span class="grow" style="display:flex;flex-direction:column;min-width:0"><span class="b">#${esc(p.no)} ${esc(p.name)}</span><span class="small muted">${p.soldOn?fmtShort(p.soldOn)+" · ":""}${money0(p.sold)}${p.list?" of "+money0(p.list):""}${daysToSell(p)!=null?" · "+(daysToSell(p)<1?"under a day":Math.round(daysToSell(p))+" days"):""}</span></span><span class="b small">${p.list&&p.sold!=null?pct(p.sold/p.list):""}</span>${I.chev}</button>`).join("")||'<p class="small muted" style="margin:4px 0 10px">No sales in this period.</p>'}
      ${recent.length>6?`<button type="button" class="link" style="margin-bottom:6px" data-act="soldAll">${VIEW.soldAll?"Show fewer":"Show all "+recent.length}</button>`:""}
    </section>
    ${dts.length?`<section class="card" style="display:flex;flex-direction:column;gap:8px"><h2>How fast pieces sold</h2><div class="hist">${B.map((b,i)=>`<span class="muted">${b[0]}</span><i style="width:${Math.round(bc[i]/bm*100)}%;${bc[i]?"":"background:var(--line)"}"></i><span style="text-align:right">${bc[i]}</span>`).join("")}</div></section>`:""}
    ${helped.length?`<section class="card" style="display:flex;flex-direction:column;gap:4px"><h2>Needed a price drop or relist</h2>${helped.map(p=>`<button type="button" class="lrow" data-act="open" data-id="${p.id}" data-sub="listing"><span class="grow b">#${esc(p.no)} ${esc(p.name)}</span>${I.chev}</button>`).join("")}</section>`:""}
  </main>`;
}

/* ---------- supplies ---------- */
function viewSupplies(){
  const q=VIEW.q.trim().toLowerCase();
  const list=S.supplies.filter(s=>!q||s.name.toLowerCase().includes(q)||String(s.category||"").toLowerCase().includes(q));
  const value=r2(S.supplies.reduce((t,s)=>t+(s.onHand||0)*(s.avgCost||0),0));
  const low=S.supplies.filter(isLow);
  const cats=[...new Set([...SUPCATS(),...list.map(s=>s.category||"Other")])].filter(c=>list.some(s=>(s.category||"Other")===c));
  const row=s=>{const top=Math.max((s.lowAt||0)*4,s.onHand||0,1),w=Math.round(Math.min(1,(s.onHand||0)/top)*100);
    return`<button type="button" class="lrow" style="flex-direction:column;align-items:stretch;gap:5px" data-act="supply" data-id="${s.id}">
      <span class="between"><span class="b" style="font-size:15px">${esc(s.name)}</span><span class="row" style="gap:6px">${s.reusable?'<span class="chip c-lav">Reusable</span>':""}${isLow(s)?'<span class="chip c-warm">Low</span>':""}</span></span>
      <span class="track"><i class="${isLow(s)?"low":""}" style="width:${w}%"></i></span>
      <span class="small muted">${r2(s.onHand||0)} ${esc(s.unit||"")} left${s.reusable&&s.inUse?" · "+s.inUse+" in use":""}${s.avgCost!=null?" · "+money(s.avgCost)+" / "+esc(s.unit||"each"):""}</span></button>`;};
  return`<header class="top"><div class="grow"><h1>Supplies</h1><div class="sub">${S.supplies.length} item${S.supplies.length===1?"":"s"} · ${money0(value)} on the shelf</div></div>${syncBtn}</header>
  <main>
    <div class="row" style="gap:8px"><label class="row grow" style="gap:8px;height:44px;padding:0 14px;border-radius:22px;background:var(--card);border:1px solid var(--line2);color:var(--muted)">${I.search}<input type="search" data-act="q" value="${esc(VIEW.q)}" placeholder="Search supplies" aria-label="Search supplies" style="flex:1;min-width:0;border:0;outline:none;background:none;font-size:14px;font-weight:600;color:var(--ink)"></label>
    <button type="button" class="icon-btn" data-act="scan" aria-label="Scan a barcode">${I.barcode}</button></div>
    ${low.length?`<div class="warnbox">${I.warn}<span>${low.length} running low: ${low.map(s=>esc(s.name)).join(", ")}</span></div>`:""}
    ${DESK?deskSupplies(list):cats.map(c=>`<section class="card" style="display:flex;flex-direction:column;gap:4px;padding:10px 14px"><h2 style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">${esc(c)}</h2>${list.filter(s=>(s.category||"Other")===c).sort((a,b)=>a.name.localeCompare(b.name)).map(row).join("")}</section>`).join("")}
    ${!S.supplies.length?`<div class="empty">No supplies on the shelf yet.<br>Scan a barcode, scan a receipt, or add one by hand.</div>`:!list.length?'<div class="empty">No supplies match.</div>':""}
    <div class="grid2"><button type="button" class="btn out" data-act="newSupply">Add supply</button><button type="button" class="btn" data-act="scan">${I.barcode.replace("<svg",'<svg width="22" height="22"')}Scan barcode</button></div>
  </main>`;
}

/* ---------- money ---------- */
const CATCOL={"Pieces bought":"#F27BA0","Supplies":"#3FB894","Hardware":"#7B6BD6","Gas & fees":"#F0A04B","Tax":"#5E8FD6","Other":"#8A8299"};
function viewMoney(){
  return`<header class="top"><div class="grow"><h1>Money</h1></div>${monthNav()}</header>
  <main>
    <div class="seg" role="group" aria-label="Money sections"><button type="button" class="${VIEW.money==="expenses"?"on":""}" data-act="money" data-v="expenses">Expenses</button><button type="button" class="${VIEW.money==="pnl"?"on":""}" data-act="money" data-v="pnl">Profit &amp; loss</button></div>
    ${VIEW.money==="pnl"?moneyPnl():moneyExpenses()}
  </main>
  ${VIEW.money==="expenses"?`<button type="button" class="fab fab2" data-act="newExpense" aria-label="Add an expense by hand">${I.plus}Add</button><button type="button" class="fab" data-act="receipt">${I.camera}Scan receipt</button>`:""}`;
}
function moneyExpenses(){
  const ex=S.expenses.filter(e=>monthKey(e.date)===VIEW.month).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
  const total=r2(ex.reduce((s,e)=>s+(e.amount||0),0));
  const cats={};ex.forEach(e=>{const c=e.category||"Other";cats[c]=r2((cats[c]||0)+(e.amount||0));});
  const order=[...EXPCATS(),"Tax","Other"].filter((c,i,a)=>a.indexOf(c)===i&&cats[c]>0);Object.keys(cats).forEach(c=>{if(!order.includes(c)&&cats[c]>0)order.push(c);});
  const C=2*Math.PI*46;let off=0;
  const arcs=order.map(c=>{const L=total?cats[c]/total*C:0;const a=`<circle cx="60" cy="60" r="46" fill="none" stroke="${CATCOL[c]||"#8A8299"}" stroke-width="18" stroke-dasharray="${Math.max(0,L-(order.length>1?2:0)).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"/>`;off+=L;return a;}).join("");
  return`<div class="row" style="gap:10px;background:var(--card);border:1px dashed var(--line2);border-radius:12px;padding:8px 12px;color:var(--muted)"><span class="small b">Kept separate from your audit expense sheet for now</span></div>
  <section class="card row" style="gap:14px">
    <div style="position:relative;width:132px;height:132px;flex-shrink:0"><svg width="132" height="132" viewBox="0 0 120 120" role="img" aria-label="Spending by category">${total?arcs:`<circle cx="60" cy="60" r="46" fill="none" stroke="var(--line)" stroke-width="18"/>`}</svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="b" style="font-size:20px">${money0(total)}</span><span class="small muted">spent</span></div></div>
    <div class="grow" style="display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:700">${order.map(c=>`<div class="row" style="gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:${CATCOL[c]||"#8A8299"};flex-shrink:0"></span><span class="grow">${esc(c)}</span><span>${money0(cats[c])}</span></div>`).join("")||'<span class="muted">Nothing logged this month.</span>'}</div>
  </section>
  ${DESK?deskExpenses(ex):`  <h2 class="h2" style="margin:4px 4px 0">This month</h2>
  <section class="card" style="padding:4px 14px">${ex.map(e=>`<button type="button" class="lrow" data-act="editExpense" data-id="${e.id}"><span class="grow" style="display:flex;flex-direction:column;min-width:0"><span class="b">${esc(e.item||e.store||"Expense")}</span><span class="small muted">${e.date?fmtShort(e.date)+" · ":""}${esc([e.store,e.category,e.project?"#"+e.project:""].filter(Boolean).join(" · "))}${e.receipt?" · receipt":""}</span></span><span class="b">${money(e.amount||0)}</span></button>`).join("")||'<p class="small muted">No expenses this month.</p>'}</section>`}
  <div style="height:70px"></div>`;
}
function moneyPnl(){
  const m=VIEW.month,y=+m.slice(0,4),mo=+m.slice(5,7),g=goalRow(y,mo);
  const prof=monthProfit(m),sales=monthSales(m),n=soldIn(m).length;
  const lastM=y<+today().slice(0,4)?12:y>+today().slice(0,4)?0:+today().slice(5,7);
  const rows=[];for(let i=1;i<=12;i++){const k=y+"-"+pad(i),gr=goalRow(y,i);rows.push({i,k,p:i<=lastM?monthProfit(k):null,g:gr&&gr.goal!=null?gr.goal:null,n:i<=lastM?soldIn(k).length:null});}
  const shown=rows.filter(r=>r.i<=Math.max(lastM,1));
  const maxV=Math.max(1,...shown.map(r=>Math.max(r.p||0,r.g||0)));const top=Math.ceil(maxV/500)*500;
  const dw=DESK?Math.max(480,Math.round((innerWidth-236-56-(innerWidth>1300?16:0))*(innerWidth>1300?2/3:1)-44)):0,W=DESK?dw:330,H=DESK?260:140,fs=DESK?12:10,x0=DESK?44:34,x1=W-2,y0=H-24,y1=DESK?16:10,bw=(x1-x0)/12,hb=DESK?Math.min(18,bw*.3):8;
  const yy=v=>y0-(v/top)*(y0-y1);
  const grid=[0,top/2,top].map(v=>`<line x1="${x0}" y1="${yy(v).toFixed(1)}" x2="${x1}" y2="${yy(v).toFixed(1)}" stroke="#352F42"/><text x="${x0-4}" y="${(yy(v)+3).toFixed(1)}" text-anchor="end" fill="#ABA3BC" font-size="${fs}" font-weight="700">${v>=1000?"$"+(v/1000)+"k":"$"+v}</text>`).join("");
  const bars=rows.map(r=>{const cx=x0+bw*(r.i-.5);let s="";if(r.p>0)s+=`<rect x="${(cx-hb).toFixed(1)}" y="${yy(r.p).toFixed(1)}" width="${(hb*2).toFixed(1)}" height="${(y0-yy(r.p)).toFixed(1)}" rx="3" fill="#F27BA0"><title>${MONTHS[r.i-1]}: ${money(r.p)}${r.g!=null?" of "+money0(r.g):""}</title></rect>`;
    if(r.g!=null)s+=`<line x1="${(cx-hb-3.5).toFixed(1)}" y1="${yy(r.g).toFixed(1)}" x2="${(cx+hb+3.5).toFixed(1)}" y2="${yy(r.g).toFixed(1)}" stroke="#EDE8F5" stroke-width="2" stroke-linecap="round"/>`;
    s+=`<text x="${cx.toFixed(1)}" y="${H-6}" text-anchor="middle" fill="${r.i===mo?"#EDE8F5":"#ABA3BC"}" font-size="${fs}" font-weight="700">${MONTHS[r.i-1][0]}</text>`;return s;}).join("");
  const yP=r2(shown.reduce((s,r)=>s+(r.p||0),0)),yG=shown.reduce((s,r)=>s+(r.g||0),0),yN=shown.reduce((s,r)=>s+(r.n||0),0);
  const fullG=rows.reduce((s,r)=>s+(r.g||0),0);
  const yrRows=rows.map(r=>goalRow(y,r.i)).filter(Boolean);const pMin=yrRows.reduce((s,g)=>s+(g.min||0),0),pMax=yrRows.reduce((s,g)=>s+(g.max||0),0);
  const yS=S.projects.filter(p=>p.status==="Sold"&&p.soldOn&&p.soldOn.slice(0,4)===String(y)).reduce((s,p)=>s+(p.sold||0),0);
  const A=`<section class="card" style="display:flex;flex-direction:column;gap:6px">
    <div class="between"><span class="b small" style="font-size:13px">${esc(monthName(m))}</span><button type="button" class="btn sm ghost" style="height:30px;font-size:12px" data-act="goals">Edit goals</button></div>
    <div class="grid2"><div style="display:flex;flex-direction:column"><span class="small muted b">Sales</span><span class="b" style="font-size:22px">${money(sales)}</span></div><div style="display:flex;flex-direction:column"><span class="small muted b">Profit</span><span class="b" style="font-size:22px;color:var(--mint)">${money(prof)}</span></div></div>
    ${g&&g.goal?`<div class="track"><i style="width:${Math.max(0,Math.min(100,Math.round(prof/g.goal*100)))}%;background:var(--pink)"></i></div><span class="small muted b">${Math.round(prof/g.goal*100)}% of the ${money0(g.goal)} goal · ${n} of ${g.min!=null?g.min+(g.max!=null&&g.max!==g.min?"–"+g.max:""):"?"} pieces sold</span>`:`<span class="small muted">No goal set for this month.</span>`}
  </section>`;
  const B=`<section class="card" style="display:flex;flex-direction:column;gap:8px">
    <div class="between"><h2>Profit vs goal · ${y}</h2><div class="row small muted b" style="gap:12px"><span class="row" style="gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:var(--pink)"></span>Profit</span><span class="row" style="gap:5px"><span style="width:14px;height:2px;background:var(--ink)"></span>Goal</span></div></div>
    <svg width="100%" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly profit against goal for ${y}" style="font-family:Nunito,sans-serif">${grid}${bars}</svg>
  </section>`;
  const C=`<section class="card" style="padding:10px 14px">
    <div class="tbl" style="grid-template-columns:1fr 78px 66px 46px"><span class="small muted b">Month</span><span class="small muted b r">Profit</span><span class="small muted b r">Goal</span><span class="small muted b r">Hit</span>
    ${shown.map(r=>{const hit=r.g?Math.round((r.p||0)/r.g*100)+"%":"–";const cur=r.i===mo;const st=cur?' style="color:var(--pink);font-weight:800"':(r.p?"":' style="color:var(--muted)"');return`<span${st}>${MONTHS[r.i-1]}</span><span class="r"${st}>${money(r.p||0)}</span><span class="r muted">${r.g!=null?money0(r.g):"–"}</span><span class="r"${st}>${hit}</span>`;}).join("")}</div>
    <div style="height:1px;background:var(--line);margin:8px 0"></div>
    <div class="tbl" style="grid-template-columns:1fr 78px 66px 46px;font-weight:800"><span>Year so far</span><span class="r pos">${money0(yP)}</span><span class="r muted">${money0(yG)}</span><span class="r">${yG?Math.round(yP/yG*100)+"%":"–"}</span></div>
    <p class="small muted" style="margin:6px 0 0">${yN} piece${yN===1?"":"s"} sold${pMax?" (forecast "+pMin+"–"+pMax+")":""} · ${money0(yS)} in sales${yS?" · "+pct(yP/yS)+" margin":""}${fullG?" · full-year goal "+money0(fullG):""}</p>
  </section>`;
  return DESK?`<div class="dk-pnl"><div class="dk-pnl-l">${A}${B}</div>${C}</div>`:A+B+C;
}
