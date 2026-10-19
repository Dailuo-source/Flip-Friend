/* =====================================================================
   SHEETS (pop-up forms) and BACK BUTTON
   ===================================================================== */
let SH=null,skipPop=0,guard=false,guardT=null;
/* The phone's back button closes the top thing open (scanner, form, project) instead of leaving the app.
   One history entry stands in for "something is open"; it's added and removed as things open and close. */
function overlays(){return(document.getElementById("scanner")?1:0)+(document.getElementById("scrim")?1:0)+(VIEW.project?1:0);}
function syncGuard(){clearTimeout(guardT);guardT=setTimeout(()=>{const n=overlays();
  if(n&&!guard){history.pushState({ff:1},"");guard=true;}
  else if(!n&&guard){guard=false;skipPop++;history.back();}},0);}
const head=(t,sub)=>`<span class="grab" aria-hidden="true"></span><div class="between"><div style="display:flex;flex-direction:column;min-width:0"><h3>${esc(t)}</h3>${sub?`<span class="small muted">${esc(sub)}</span>`:""}</div><button type="button" class="x" data-act="closeSheet" aria-label="Close">${I.x}</button></div>`;
function openSheet(html,handlers,mount){
  let el=$("#scrim");
  if(!el){el=document.createElement("div");el.id="scrim";el.className="scrim";document.body.appendChild(el);
    el.addEventListener("click",e=>{if(e.target===el)closeSheet();});}
  el.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  SH=handlers||{};const sh=el.querySelector(".sheet");if(mount)mount(sh);hydrateImages(sh);
  syncGuard();return sh;
}
function closeSheet(){const el=$("#scrim");if(!el)return;el.remove();SH=null;syncGuard();}
function openProject(id,sub){VIEW.project=id;VIEW.sub=sub||"steps";if(!DESK)window.scrollTo(0,0);else{const sd=document.querySelector(".dk-side");if(sd)sd.scrollTop=0;}render();syncGuard();}
function closeProject(){VIEW.project=null;render();syncGuard();}
window.addEventListener("popstate",()=>{
  if(skipPop>0){skipPop--;return;}
  guard=false;
  if($("#scanner"))closeScanner(true);
  else if($("#scrim")){$("#scrim").remove();SH=null;}
  else if(VIEW.project){VIEW.project=null;render();}
  syncGuard();
});
const val=(sh,sel)=>{const el=sh.querySelector(sel);return el?el.value.trim():"";};
const numv=(sh,sel)=>{const v=val(sh,sel).replace(/[$,\s]/g,"");return v===""||isNaN(+v)?null:+v;};
const projOptions=(sel,onlyOpen)=>S.projects.filter(p=>!onlyOpen||isOpen(p)||same(p.no,sel)).slice().sort((a,b)=>noNum(b.no)-noNum(a.no)).map(p=>opt(p.no,sel,"#"+p.no+" "+p.name)).join("");
function markStarted(p){if(p.status==="Not started")store.update("projects",p.id,{status:"In progress",started:p.started||today()});}
function refreshProfit(p){if(p&&p.status==="Sold")store.update("projects",p.id,{profit:calcProfit(p,p.sold,p.fee)});}

/* ---------- new / edit project ---------- */
function sheetNewProject(){
  const no=nextNo();let photo=null,inspo=[];
  const sh=openSheet(`${head("New project")}
    <div class="card row" style="gap:14px"><span class="b" style="font-size:38px;color:var(--pink);line-height:1">#${no}</span><div class="grow" style="display:flex;flex-direction:column"><span class="b">Project number</span><span class="small muted">Next in line, set automatically</span></div></div>
    <div class="row" style="gap:12px"><button type="button" class="thumb lg t-lav" data-act="sh:photo" style="width:84px;height:84px;border:2px dashed #8A4A64;background:#2A1C26;color:var(--pink2)" aria-label="Add a photo">${I.camera.replace("<svg",'<svg width="26" height="26"')}<img id="npPhoto" alt="" hidden></button>
      <div style="display:flex;flex-direction:column;gap:3px"><span class="b">Project picture</span><span class="small muted">Use a photo of the piece, or keep the cute icon. You can change it any time.</span></div></div>
    <label class="f">What is it?<input class="input" id="npName" placeholder="e.g. MCM teak sideboard" autocomplete="off"></label>
    <div class="grid2"><label class="f">Price paid<input class="input" id="npPaid" inputmode="decimal" placeholder="$0.00"></label><label class="f">Bought on<input class="input" id="npDate" type="date" value="${today()}"></label></div>
    <label class="f">Plan to list price<input class="input" id="npList" inputmode="decimal" placeholder="$0.00"></label>
    <div class="card between" style="padding:10px 14px"><div style="display:flex;flex-direction:column"><span class="b">Inspiration</span><span class="small muted" id="npInspo">Optional · pictures to work from</span></div><button type="button" class="btn sm ghost" data-act="sh:inspo">+ Add</button></div>
    <label class="check"><input type="checkbox" id="npExp" checked>Also add the purchase to expenses</label>
    <button type="button" class="btn full" data-act="sh:save">Create project #${no}</button>`,{
    async photo(sh){const f=(await pickFiles("#filePick"))[0];if(!f)return;photo=f;const im=sh.querySelector("#npPhoto");im.src=URL.createObjectURL(f);im.hidden=false;im.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover";},
    async inspo(sh){const fs=await pickFiles("#filePickMany");if(!fs.length)return;inspo=inspo.concat(fs);sh.querySelector("#npInspo").textContent=inspo.length+" picture"+(inspo.length>1?"s":"")+" ready to add";},
    save(sh){
      const name=val(sh,"#npName");if(!name){toast("Give the project a name first.");sh.querySelector("#npName").focus();return;}
      const paid=numv(sh,"#npPaid")||0,date=val(sh,"#npDate")||today(),list=numv(sh,"#npList");
      const id=store.add("projects",{no:String(no),name,status:"Not started",started:date,paid,list});
      if(paid&&sh.querySelector("#npExp").checked)store.add("expenses",{date,item:name,amount:paid,category:"Pieces bought",project:String(no)});
      closeSheet();openProject(id);
      if(photo||inspo.length)(async()=>{try{
        if(photo){const pid=await uploadPicture(photo,"project","#"+no+" "+name);store.update("projects",id,{picture:pid});}
        for(const f of inspo){const iid=await uploadPicture(f,"inspiration",picName("#"+no+" inspiration"));store.add("inspiration",{project:String(no),picture:iid,caption:""});}
      }catch(e){toast(e.message||"A picture didn't upload.");}})();
    }});
  sh.querySelector("#npName").focus();
}
function sheetEditProject(p){
  const sold=p.status==="Sold";let armed=false;
  openSheet(`${head("Edit project","#"+p.no)}
    <label class="f">Name<input class="input" id="epName" value="${esc(p.name)}"></label>
    <div class="grid2"><label class="f">Status<select class="input" id="epStatus">${STATUSES.map(s=>opt(s,p.status)).join("")}</select></label><label class="f">Started<input class="input" type="date" id="epStarted" value="${esc(p.started||"")}"></label></div>
    <div class="grid2"><label class="f">Price paid<input class="input" id="epPaid" inputmode="decimal" value="${p.paid??""}"></label><label class="f">List price<input class="input" id="epList" inputmode="decimal" value="${p.list??""}"></label></div>
    ${sold?`<div class="grid2"><label class="f">Sold price<input class="input" id="epSold" inputmode="decimal" value="${p.sold??""}"></label><label class="f">Sold on<input class="input" type="date" id="epSoldOn" value="${esc(p.soldOn||"")}"></label></div>
    <div class="grid2"><label class="f">Delivery fee<input class="input" id="epFee" inputmode="decimal" value="${p.fee??""}"></label><label class="f">Profit<input class="input" id="epProfit" inputmode="decimal" value="${p.profit??""}"></label></div>
    <button type="button" class="link" data-act="sh:recalc" style="align-self:flex-start">Work out profit again from the numbers</button>`:""}
    <label class="f">Notes<textarea class="input" id="epNotes" rows="3">${esc(p.notes||"")}</textarea></label>
    <button type="button" class="btn full" data-act="sh:save">Save</button>
    <button type="button" class="btn full danger" data-act="sh:del">Delete project</button>`,{
    recalc(sh){const s=numv(sh,"#epSold"),f=numv(sh,"#epFee");const tmp=Object.assign({},p,{paid:numv(sh,"#epPaid")||0});sh.querySelector("#epProfit").value=calcProfit(tmp,s,f);},
    save(sh){const d={name:val(sh,"#epName")||p.name,status:val(sh,"#epStatus"),started:val(sh,"#epStarted"),paid:numv(sh,"#epPaid"),list:numv(sh,"#epList"),notes:val(sh,"#epNotes")};
      if(sold){d.sold=numv(sh,"#epSold");d.soldOn=val(sh,"#epSoldOn");d.fee=numv(sh,"#epFee");d.profit=numv(sh,"#epProfit");}
      store.update("projects",p.id,d);closeSheet();toast("Saved");},
    del(sh,b){if(!armed){armed=true;b.textContent="Tap again to delete #"+p.no+" and its time log";return;}
      timesOf(p).forEach(t=>store.del("timelog",t.id));eventsOf(p).forEach(e=>store.del("listings",e.id));usesOf(p).forEach(u=>store.del("supplyuse",u.id));
      S.inspiration.filter(x=>same(x.project,p.no)).forEach(x=>store.del("inspiration",x.id));
      store.del("projects",p.id);closeSheet();closeProject();toast("Deleted #"+p.no);}
  });
}
function sheetPicture(p){
  openSheet(`${head("Project picture",pTitle(p))}
    <button type="button" class="btn full" data-act="sh:cam">${I.camera.replace("<svg",'<svg width="20" height="20"')}Take a photo</button>
    <button type="button" class="btn full ghost" data-act="sh:pick">Choose from gallery</button>
    ${p.picture?`<button type="button" class="btn full ghost" data-act="sh:icon">Use the cute icon instead</button>`:""}`,{
    async cam(){await setPicture(p,"#cameraPick");},async pick(){await setPicture(p,"#filePick");},
    icon(){store.update("projects",p.id,{picture:""});closeSheet();}});
}
async function setPicture(p,input){const f=(await pickFiles(input))[0];if(!f)return;closeSheet();busy(true,"Saving picture…");
  try{const id=await uploadPicture(f,"project","#"+p.no+" "+p.name);store.update("projects",p.id,{picture:id});}catch(e){toast(e.message||"The picture didn't upload.");}busy(false);}

/* ---------- time entries and timer ---------- */
function sheetTime(p,entry,step){
  const e=entry||{step:step||STEPS()[0],date:today(),hours:null,label:"",notes:""};
  openSheet(`${head(entry?"Edit time entry":"Add hours",pTitle(p))}
    <label class="f">Step<select class="input" id="tStep">${STEPS().map((s,i)=>opt(s,e.step,(i?i+" · ":"")+s)).join("")}</select></label>
    <label class="f">Label (optional)<input class="input" id="tLabel" value="${esc(e.label||"")}" placeholder="e.g. Coat 2"></label>
    <div class="grid2"><label class="f">Date<input class="input" type="date" id="tDate" value="${esc(e.date||"")}"></label><label class="f">Hours<input class="input" id="tHours" inputmode="decimal" value="${e.hours??""}" placeholder="0.75"></label></div>
    <div class="row" style="gap:8px"><button type="button" class="btn sm ghost" style="flex:1" data-act="sh:bump" data-v="-0.25">−15 min</button><button type="button" class="btn sm ghost" style="flex:1" data-act="sh:bump" data-v="0.25">+15 min</button><button type="button" class="btn sm ghost" style="flex:1" data-act="sh:bump" data-v="1">+1 hr</button></div>
    <label class="f">Notes<textarea class="input" id="tNotes" rows="2" placeholder="Optional">${esc(e.notes||"")}</textarea></label>
    <div class="row" style="gap:10px">${entry?`<button type="button" class="btn danger" data-act="sh:del">Delete</button>`:""}<button type="button" class="btn" style="flex:1" data-act="sh:save">Save</button></div>`,{
    bump(sh,b){const el=sh.querySelector("#tHours");el.value=Math.max(0,r2((+el.value||0)+ +b.dataset.v));},
    save(sh){const h=numv(sh,"#tHours");if(h==null){toast("Enter the hours.");return;}
      const d={project:String(p.no),step:val(sh,"#tStep"),label:val(sh,"#tLabel"),date:val(sh,"#tDate"),hours:h,notes:val(sh,"#tNotes")};
      if(entry)store.update("timelog",entry.id,d);else{store.add("timelog",d);markStarted(p);}closeSheet();},
    del(){store.del("timelog",entry.id);closeSheet();}});
}
function startTimer(p,step){if(TIMER){toast("Stop the running timer first.");return;}TIMER={project:String(p.no),pid:p.id,step,start:Date.now()};LS.set("timer",JSON.stringify(TIMER));markStarted(p);VIEW.open[p.id+"|"+step]=true;render();}
function stopTimer(){if(!TIMER)return;const p=pByNo(TIMER.project);const h=Math.max(.01,r2((Date.now()-TIMER.start)/36e5));
  if(p)store.add("timelog",{project:String(p.no),step:TIMER.step,label:"",date:dayKey(TIMER.start),hours:h,notes:""});
  toast("Saved "+hrs(h)+" to "+TIMER.step);TIMER=null;LS.del("timer");render();}
function tickTimers(){if(!TIMER)return;const s=Math.floor((Date.now()-TIMER.start)/1000);const t=Math.floor(s/3600)+":"+pad(Math.floor(s%3600/60))+":"+pad(s%60);document.querySelectorAll("[data-timer]").forEach(el=>{el.textContent=t;});}
setInterval(tickTimers,1000);

/* ---------- listing events and selling ---------- */
function sheetListEvent(p,type,ev){
  const li=listInfo(p),e=ev||{event:type,date:today(),price:type==="Check-in"?null:li.now,platform:li.platform||PLATFORMS()[0]};
  const kind=e.event,priced=/^(listed|relisted|price drop|sold)$/i.test(kind),check=/check/i.test(kind);
  const title=ev?"Edit listing entry":{"Listed":"Start listing","Relisted":"Relist","Price drop":"Drop the price","Check-in":"Update interest numbers"}[kind]||kind;
  openSheet(`${head(title,pTitle(p))}
    <div class="grid2"><label class="f">Date<input class="input" type="date" id="lDate" value="${esc(e.date||"")}"></label>${priced?`<label class="f">${/drop/i.test(kind)?"New price":"Price"}<input class="input" id="lPrice" inputmode="decimal" value="${e.price??""}"></label>`:""}</div>
    ${/^(listed|relisted)$/i.test(kind)?`<label class="f">Where<select class="input" id="lPlat">${PLATFORMS().map(x=>opt(x,e.platform)).join("")}</select></label>`:""}
    ${check?`<p class="small muted" style="margin:0">Copy these from the listing's insights. Leave any you don't have blank.</p><div class="grid3"><label class="f">Views<input class="input" id="lViews" inputmode="numeric" value="${(ev?e.views:li.views)??""}"></label><label class="f">Saves<input class="input" id="lSaves" inputmode="numeric" value="${(ev?e.saves:li.saves)??""}"></label><label class="f">Inquiries<input class="input" id="lInq" inputmode="numeric" value="${(ev?e.inquiries:li.inq)??""}"></label></div>`:""}
    <label class="f">Notes<input class="input" id="lNotes" value="${esc(e.notes||"")}" placeholder="Optional, e.g. new photos and staging"></label>
    <div class="row" style="gap:10px">${ev?`<button type="button" class="btn danger" data-act="sh:del">Delete</button>`:""}<button type="button" class="btn" style="flex:1" data-act="sh:save">Save</button></div>`,{
    save(sh){const d={project:String(p.no),event:kind,date:val(sh,"#lDate"),notes:val(sh,"#lNotes")};
      if(priced){d.price=numv(sh,"#lPrice");if(d.price==null&&!/sold/i.test(kind)){toast("Enter the price.");return;}}
      if(sh.querySelector("#lPlat"))d.platform=val(sh,"#lPlat");
      if(check){d.views=numv(sh,"#lViews");d.saves=numv(sh,"#lSaves");d.inquiries=numv(sh,"#lInq");}
      if(ev)store.update("listings",ev.id,d);else store.add("listings",d);
      if(priced&&!/sold/i.test(kind)&&p.status!=="Sold"){store.update("projects",p.id,{list:d.price,status:"Listed"});}
      closeSheet();},
    del(){store.del("listings",ev.id);closeSheet();}});
}
function plusInquiry(p){const li=listInfo(p);store.add("listings",{project:String(p.no),event:"Check-in",date:today(),inquiries:(li.inq||0)+1});toast("Inquiry added · "+((li.inq||0)+1)+" so far");}
function setPending(p,on){store.update("projects",p.id,{status:on?"Pending":"Listed"});toast(on?"Marked as sale pending":"Back on the market");}
function sheetMarkSold(p){
  const li=listInfo(p),editing=p.status==="Sold";
  const first=li.firstPrice??li.now;
  const preview=sh=>{const s=numv(sh,"#sPrice"),f=numv(sh,"#sFee");const pr=calcProfit(p,s,f);
    sh.querySelector("#sProfit").textContent=money(pr);
    sh.querySelector("#sBreak").textContent=money0(s||0)+" sold"+(f?" + "+money0(f)+" delivery":"")+" − "+money0(p.paid||0)+" bought − "+money(costsOf(p))+" supplies";
    sh.querySelector("#sStats").innerHTML=[li.days!=null?"Listed "+li.days+" day"+(li.days===1?"":"s"):"",li.drops?li.drops+" price drop"+(li.drops>1?"s":""):"",li.inq!=null?li.inq+" inquiries":""].filter(Boolean).join(" · ")+(first&&s?"<br>Sold at "+pct(s/first)+" of the first asking price ("+money0(first)+")":"");};
  openSheet(`${head(editing?"Edit sale":"Mark as sold",pTitle(p))}
    <div class="grid2"><label class="f">Sold for<input class="input" id="sPrice" inputmode="decimal" value="${(editing?p.sold:li.now)??""}" style="font-size:18px;border-color:var(--pink)"></label><label class="f">Sold on<input class="input" type="date" id="sDate" value="${esc(editing?p.soldOn||today():today())}"></label></div>
    <div class="grid2"><label class="f">Delivery fee charged<input class="input" id="sFee" inputmode="decimal" value="${editing&&p.fee?p.fee:""}" placeholder="$0"></label><label class="f">Sold through<select class="input" id="sThrough">${PLATFORMS().map(x=>opt(x,editing?p.soldThrough:li.platform)).join("")}</select></label></div>
    <div class="okbox" style="display:flex;flex-direction:column;gap:4px"><div class="between"><span class="b">Profit</span><span class="b" style="font-size:24px" id="sProfit"></span></div><span class="small b" id="sBreak"></span></div>
    <div class="note" id="sStats"></div>
    <span class="small muted">It moves to Done and counts toward that month's profit. You can edit or undo this later.</span>
    <button type="button" class="btn full" data-act="sh:save">${editing?"Save sale":"Mark sold"}</button>`,{
    save(sh){const sold=numv(sh,"#sPrice");if(sold==null){toast("Enter what it sold for.");return;}
      const fee=numv(sh,"#sFee"),date=val(sh,"#sDate")||today();
      const d={status:"Sold",sold,soldOn:date,fee:fee||0,soldThrough:val(sh,"#sThrough"),profit:calcProfit(p,sold,fee)};
      if(li.now!=null)d.list=li.now;
      if(li.start)d.tts=Math.max(0,daysBetween(li.start,date))+" days";
      store.update("projects",p.id,d);
      const sev=li.ev.find(e=>/^sold$/i.test(e.event));
      if(sev)store.update("listings",sev.id,{date,price:sold,platform:d.soldThrough});else store.add("listings",{project:String(p.no),event:"Sold",date,price:sold,platform:d.soldThrough});
      closeSheet();VIEW.sub="listing";toast(editing?"Sale updated":"Sold! "+money(d.profit)+" profit");}},
    sh=>{["#sPrice","#sFee"].forEach(s=>sh.querySelector(s).addEventListener("input",()=>preview(sh)));preview(sh);});
}
function undoSale(p){const li=listInfo(p);li.ev.filter(e=>/^sold$/i.test(e.event)).forEach(e=>store.del("listings",e.id));
  store.update("projects",p.id,{status:li.ev.some(e=>/^(listed|relisted)$/i.test(e.event))||p.list?"Listed":"In progress",sold:"",soldOn:"",fee:"",profit:"",soldThrough:"",tts:""});toast("Sale undone");}

/* ---------- supplies ---------- */
function sheetUse(p,use){
  const u=use||{supply:"",amount:1,unit:"",cost:null,date:today()};
  const shelf=S.supplies.slice().sort((a,b)=>a.name.localeCompare(b.name));
  const fill=sh=>{const s=supByName(val(sh,"#uSup"));const other=sh.querySelector("#uOtherWrap");other.hidden=!!s||val(sh,"#uSup")!=="__other";
    if(s&&!use){sh.querySelector("#uUnit").value=s.unit||"each";const a=numv(sh,"#uAmt")||0;sh.querySelector("#uCost").value=s.avgCost!=null?r2(a*s.avgCost):"";}};
  openSheet(`${head(use?"Edit supply cost":"Log supply use",pTitle(p))}
    <label class="f">Supply<select class="input" id="uSup">${use?opt(u.supply,u.supply):""}${!use?shelf.map(s=>opt(s.name,"",s.name+" · "+r2(s.onHand||0)+" "+(s.unit||"")+" left")).join(""):""}${!use?opt("__other","","Something else (not on the shelf)"):""}</select></label>
    <div id="uOtherWrap" ${shelf.length&&!use?"hidden":""}><label class="f">What was it?<input class="input" id="uOther" value="${esc(use?u.supply:"")}" placeholder="e.g. New legs"></label></div>
    <div class="grid2"><label class="f">Amount<input class="input" id="uAmt" inputmode="decimal" value="${u.amount??""}"></label><label class="f">Unit<select class="input" id="uUnit">${UNITS().map(x=>opt(x,u.unit||"each")).join("")}</select></label></div>
    <div class="grid2"><label class="f">Cost<input class="input" id="uCost" inputmode="decimal" value="${u.cost??""}"></label><label class="f">Date<input class="input" type="date" id="uDate" value="${esc(u.date||"")}"></label></div>
    <div class="row" style="gap:10px">${use?`<button type="button" class="btn danger" data-act="sh:del">Delete</button>`:""}<button type="button" class="btn" style="flex:1" data-act="sh:save">Save</button></div>`,{
    save(sh){const sel=use?"":val(sh,"#uSup");const s=sel&&sel!=="__other"?supByName(sel):null;
      const name=s?s.name:(val(sh,"#uOther")||sel);if(!name||name==="__other"){toast("Say what the supply was.");return;}
      const amt=numv(sh,"#uAmt"),cost=numv(sh,"#uCost");
      const d={project:String(p.no),supply:name,amount:amt,unit:val(sh,"#uUnit"),cost:cost||0,date:val(sh,"#uDate")};
      if(use)store.update("supplyuse",use.id,d);
      else{store.add("supplyuse",d);if(s&&amt){const up={onHand:Math.max(0,r2((s.onHand||0)-amt))};if(s.reusable)up.inUse=r2((s.inUse||0)+amt);store.update("supplies",s.id,up);}markStarted(p);}
      refreshProfit(pById(p.id));closeSheet();},
    del(){store.del("supplyuse",use.id);refreshProfit(pById(p.id));closeSheet();}},
    sh=>{if(!use){sh.querySelector("#uSup").addEventListener("change",()=>fill(sh));sh.querySelector("#uAmt").addEventListener("input",()=>fill(sh));if(shelf.length)fill(sh);else sh.querySelector("#uSup").value="__other";}});
}
function sheetSupply(s,mode){
  mode=mode||"use";let picked=[],armed=false;
  const openP=S.projects.filter(isOpen).sort((a,b)=>noNum(b.no)-noNum(a.no));
  const draw=()=>{
    const sh=openSheet(`${head(s.name,s.category||"")}
    <div class="grid3"><div class="tile sm"><span class="l">On the shelf</span><span class="v">${r2(s.onHand||0)} ${esc(s.unit||"")}</span></div><div class="tile sm"><span class="l">In use</span><span class="v">${s.reusable?r2(s.inUse||0)+" "+esc(s.unit||""):"–"}</span></div><div class="tile sm"><span class="l">Avg cost</span><span class="v">${s.avgCost!=null?money(s.avgCost):"–"}</span></div></div>
    ${s.reusable?`<div class="note" style="background:var(--lavBg);color:var(--lav)">Reusable: pick every project it was used on and the cost is split between them.${s.inUse?` <button type="button" class="link" style="color:var(--lav)" data-act="sh:worn">Mark 1 worn out</button>`:""}</div>`:""}
    <div class="seg"><button type="button" class="${mode==="use"?"on":""}" data-act="sh:mode" data-v="use">I used some</button><button type="button" class="${mode==="restock"?"on":""}" data-act="sh:mode" data-v="restock">I restocked</button></div>
    ${mode==="use"?`<div style="display:flex;flex-direction:column;gap:6px"><span class="small muted b">Which project${s.reusable?"s? Pick one or more":"?"}</span><div class="row" style="flex-wrap:wrap;gap:8px">${openP.map(p=>`<button type="button" class="pill ${picked.includes(p.id)?"on":""}" data-act="sh:pick" data-id="${p.id}" aria-pressed="${picked.includes(p.id)}">${picked.includes(p.id)?"✓ ":""}#${esc(p.no)} ${esc(p.name.length>18?p.name.slice(0,17)+"…":p.name)}</button>`).join("")||'<span class="small muted">No open projects.</span>'}</div></div>
      <div class="row" style="gap:8px"><span class="grow small muted b">Amount${s.reusable?" taken from the shelf":""}</span><div class="stepper"><button type="button" data-act="sh:step" data-v="-1" aria-label="Less">−</button><input class="input" id="sAmt" inputmode="decimal" value="1" aria-label="Amount"><button type="button" data-act="sh:step" data-v="1" aria-label="More">+</button></div><select class="input" id="sUnit" style="width:auto" aria-label="Unit">${UNITS().map(x=>opt(x,s.unit||"each")).join("")}</select></div>
      <label class="f">Cost<input class="input" id="sCost" inputmode="decimal"></label>
      <div class="okbox small b" id="sSplit" style="padding:10px 12px"></div>
      <button type="button" class="btn full" data-act="sh:use">Log use</button>`
    :`<div class="row" style="gap:8px"><span class="grow small muted b">Amount bought</span><div class="stepper"><button type="button" data-act="sh:step" data-v="-1" aria-label="Less">−</button><input class="input" id="sAmt" inputmode="decimal" value="1" aria-label="Amount"><button type="button" data-act="sh:step" data-v="1" aria-label="More">+</button></div><select class="input" id="sUnit" style="width:auto" aria-label="Unit">${UNITS().map(x=>opt(x,s.unit||"each")).join("")}</select></div>
      <div class="grid2"><label class="f">Total paid<input class="input" id="sPaid" inputmode="decimal" placeholder="$0.00"></label><label class="f">Store<input class="input" id="sStore" placeholder="Optional"></label></div>
      <label class="check"><input type="checkbox" id="sExp" checked>Also add to expenses</label>
      <button type="button" class="btn full" data-act="sh:restock">Save restock</button>`}
    <details><summary class="small b muted" style="padding:6px 0;cursor:pointer">Edit this supply</summary><div style="display:flex;flex-direction:column;gap:10px;padding-top:8px">
      <label class="f">Name<input class="input" id="eName" value="${esc(s.name)}"></label>
      <div class="grid2"><label class="f">Category<select class="input" id="eCat">${SUPCATS().map(c=>opt(c,s.category||"Other")).join("")}</select></label><label class="f">Unit<select class="input" id="eUnit">${UNITS().map(x=>opt(x,s.unit||"each")).join("")}</select></label></div>
      <div class="grid2"><label class="f">On the shelf<input class="input" id="eOn" inputmode="decimal" value="${s.onHand??""}"></label><label class="f">Low at<input class="input" id="eLow" inputmode="decimal" value="${s.lowAt??""}"></label></div>
      <div class="grid2"><label class="f">Avg cost per unit<input class="input" id="eAvg" inputmode="decimal" value="${s.avgCost??""}"></label><label class="check" style="align-self:end"><input type="checkbox" id="eReuse" ${s.reusable?"checked":""}>Reusable</label></div>
      <div class="row" style="gap:10px"><button type="button" class="btn danger" data-act="sh:del">Delete</button><button type="button" class="btn ghost" style="flex:1" data-act="sh:edit">Save changes</button></div></div></details>`,H,sh=>{
      const a=sh.querySelector("#sAmt");if(a)a.addEventListener("input",()=>split(sh));const c=sh.querySelector("#sCost");if(c)c.addEventListener("input",()=>split(sh,true));split(sh);});
    return sh;
  };
  const split=(sh,manual)=>{const el=sh.querySelector("#sSplit");if(!el)return;const a=numv(sh,"#sAmt")||0;const c=sh.querySelector("#sCost");
    if(!manual&&c)c.value=s.avgCost!=null?r2(a*s.avgCost):"";const cost=numv(sh,"#sCost")||0;const n=picked.length;
    el.textContent=n?(n>1?a+" "+(s.unit||"")+" shared by "+n+" projects: "+money(cost/n)+" goes on each":money(cost)+" goes on #"+pById(picked[0]).no):"Pick a project above.";};
  const H={
    mode(sh,b){mode=b.dataset.v;draw();},
    pick(sh,b){const id=b.dataset.id;if(s.reusable)picked=picked.includes(id)?picked.filter(x=>x!==id):picked.concat(id);else picked=picked.includes(id)?[]:[id];
      const keep={amt:val(sh,"#sAmt"),cost:val(sh,"#sCost")};const n=draw();n.querySelector("#sAmt").value=keep.amt;if(keep.cost)n.querySelector("#sCost").value=keep.cost;split(n,true);},
    step(sh,b){const el=sh.querySelector("#sAmt");el.value=Math.max(0,r2((+el.value||0)+ +b.dataset.v));split(sh);},
    use(sh){if(!picked.length){toast("Pick a project.");return;}const amt=numv(sh,"#sAmt")||0,cost=numv(sh,"#sCost")||0,unit=val(sh,"#sUnit");
      const ps=picked.map(pById).filter(Boolean);const share=r2(cost/ps.length);
      ps.forEach(p=>{store.add("supplyuse",{project:String(p.no),supply:s.name,amount:r2(amt/ps.length),unit,cost:share,date:today(),shared:ps.length>1?ps.filter(x=>x!==p).map(x=>"#"+x.no).join(", "):""});markStarted(p);refreshProfit(pById(p.id));});
      const up={onHand:Math.max(0,r2((s.onHand||0)-amt))};if(s.reusable)up.inUse=r2((s.inUse||0)+amt);store.update("supplies",s.id,up);
      closeSheet();toast("Logged "+money(cost)+(ps.length>1?" across "+ps.length+" projects":""));},
    restock(sh){const amt=numv(sh,"#sAmt")||0,paid=numv(sh,"#sPaid");if(!amt||paid==null){toast("Enter how many and what you paid.");return;}
      const on=s.onHand||0,avg=s.avgCost||0;const newAvg=r4((on*avg+paid)/(on+amt));
      store.update("supplies",s.id,{onHand:r2(on+amt),avgCost:newAvg,unit:val(sh,"#sUnit")||s.unit});
      if(sh.querySelector("#sExp").checked)store.add("expenses",{date:today(),store:val(sh,"#sStore"),item:s.name,amount:paid,category:/hardware/i.test(s.category||"")?"Hardware":"Supplies"});
      closeSheet();toast("Restocked "+s.name);},
    worn(){store.update("supplies",s.id,{inUse:Math.max(0,r2((s.inUse||0)-1))});s.inUse=Math.max(0,(s.inUse||0)-1);draw();},
    edit(sh){store.update("supplies",s.id,{name:val(sh,"#eName")||s.name,category:val(sh,"#eCat"),unit:val(sh,"#eUnit"),onHand:numv(sh,"#eOn"),lowAt:numv(sh,"#eLow"),avgCost:numv(sh,"#eAvg"),reusable:sh.querySelector("#eReuse").checked});closeSheet();toast("Saved");},
    del(sh,b){if(!armed){armed=true;b.textContent="Tap again to delete";return;}store.del("supplies",s.id);closeSheet();}
  };
  if(VIEW.project){const p=pById(VIEW.project);if(p&&isOpen(p))picked=[p.id];}
  draw();
}
function sheetNewSupply(prefill,after){
  const f=prefill||{};const d=supplyDefaults(f.name||"");
  const sh=openSheet(`${head("Add supply")}
    <label class="f">Name<input class="input" id="nName" value="${esc(f.name||"")}" placeholder="e.g. Water-based poly"></label>
    <div class="grid2"><label class="f">Category<select class="input" id="nCat">${SUPCATS().map(c=>opt(c,f.category||d.category)).join("")}</select></label><label class="f">Unit<select class="input" id="nUnit">${UNITS().map(x=>opt(x,f.unit||d.unit)).join("")}</select></label></div>
    <div class="grid2"><label class="f">On the shelf now<input class="input" id="nOn" inputmode="decimal" value="${f.onHand??""}" placeholder="0"></label><label class="f">What you paid for it<input class="input" id="nPaid" inputmode="decimal" placeholder="$0.00"></label></div>
    <div class="grid2"><label class="f">Warn me when down to<input class="input" id="nLow" inputmode="decimal" placeholder="Optional"></label><label class="check" style="align-self:end"><input type="checkbox" id="nReuse" ${(f.reusable??d.reusable)?"checked":""}>Reusable</label></div>
    <button type="button" class="btn full" data-act="sh:save">Add to shelf</button>`,{
    save(sh){const name=val(sh,"#nName");if(!name){toast("Give it a name.");return;}if(supByName(name)){toast(name+" is already on the shelf.");return;}
      const on=numv(sh,"#nOn")||0,paid=numv(sh,"#nPaid");
      const id=store.add("supplies",{name,category:val(sh,"#nCat"),unit:val(sh,"#nUnit"),onHand:on,avgCost:paid!=null&&on?r4(paid/on):null,lowAt:numv(sh,"#nLow"),reusable:sh.querySelector("#nReuse").checked,inUse:0});
      closeSheet();if(after)after(S.supplies.find(x=>x.id===id));}});
  sh.querySelector("#nName").addEventListener("input",()=>{const dd=supplyDefaults(val(sh,"#nName"));sh.querySelector("#nCat").value=dd.category;sh.querySelector("#nUnit").value=dd.unit;sh.querySelector("#nReuse").checked=dd.reusable;});
}

/* ---------- goals ---------- */
function sheetGoals(year){
  const y=year||+VIEW.month.slice(0,4);
  const years=[...new Set(S.goals.map(g=>g.year).concat([y,+today().slice(0,4),+today().slice(0,4)+1]))].sort();
  openSheet(`${head("Goals & forecast")}
    <div class="between"><label class="row small b muted" style="gap:8px">Year<select class="input" id="gYear" style="width:auto;height:38px">${years.map(v=>opt(v,y)).join("")}</select></label><button type="button" class="btn sm ghost" data-act="sh:fill">Fill empty months</button></div>
    <div class="card" style="padding:10px 12px;display:flex;flex-direction:column;gap:4px">
      <div style="display:grid;grid-template-columns:1fr 96px 56px 56px;gap:6px;font-size:11px;font-weight:800;color:var(--muted)"><span>Month</span><span>Profit goal</span><span>Pieces min</span><span>max</span></div>
      ${MONTHS.map((n,i)=>{const g=goalRow(y,i+1)||{};return`<div style="display:grid;grid-template-columns:1fr 96px 56px 56px;gap:6px;align-items:center" data-m="${i+1}"><span class="b small">${n.slice(0,3)}</span><input class="input" style="height:36px;padding:0 8px;font-size:14px" data-k="goal" inputmode="decimal" value="${g.goal??""}" aria-label="${n} profit goal"><input class="input" style="height:36px;padding:0 8px;font-size:14px" data-k="min" inputmode="numeric" value="${g.min??""}" aria-label="${n} pieces minimum"><input class="input" style="height:36px;padding:0 8px;font-size:14px" data-k="max" inputmode="numeric" value="${g.max??""}" aria-label="${n} pieces maximum"></div>`;}).join("")}
    </div>
    <button type="button" class="btn full" data-act="sh:save">Save goals</button>`,{
    fill(sh){let last={};sh.querySelectorAll("[data-m]").forEach(r=>{["goal","min","max"].forEach(k=>{const el=r.querySelector(`[data-k=${k}]`);if(el.value.trim())last[k]=el.value;else if(last[k]!=null)el.value=last[k];});});},
    save(sh){sh.querySelectorAll("[data-m]").forEach(r=>{const m=+r.dataset.m;const d={};["goal","min","max"].forEach(k=>{const v=r.querySelector(`[data-k=${k}]`).value.replace(/[$,\s]/g,"");d[k]=v===""?null:+v;});
      const g=goalRow(y,m);if(g){if(g.goal!==d.goal||g.min!==d.min||g.max!==d.max)store.update("goals",g.id,d);}else if(d.goal!=null||d.min!=null||d.max!=null)store.add("goals",Object.assign({year:y,month:m},d));});
      closeSheet();toast("Goals saved");}},
    sh=>{sh.querySelector("#gYear").addEventListener("change",e=>sheetGoals(+e.target.value));});
}

/* ---------- expenses and receipts ---------- */
function sheetExpense(e){
  const x=e||{date:today(),category:"Supplies"};let armed=false;
  openSheet(`${head(e?"Edit expense":"Add expense")}
    <div class="grid2"><label class="f">Date<input class="input" type="date" id="xDate" value="${esc(x.date||"")}"></label><label class="f">Amount<input class="input" id="xAmt" inputmode="decimal" value="${x.amount??""}"></label></div>
    <label class="f">What was it?<input class="input" id="xItem" value="${esc(x.item||"")}"></label>
    <div class="grid2"><label class="f">Store<input class="input" id="xStore" value="${esc(x.store||"")}"></label><label class="f">Category<select class="input" id="xCat">${[...new Set(EXPCATS().concat(["Tax",x.category||"Other"]))].map(c=>opt(c,x.category)).join("")}</select></label></div>
    <label class="f">Project (optional)<select class="input" id="xProj">${opt("","" ,"None")}${projOptions(x.project||"",false)}</select></label>
    ${x.receipt?`<a class="small b" href="${esc(x.receipt)}" target="_blank" rel="noopener">Open the receipt photo in Drive</a>`:""}
    <label class="f">Notes<input class="input" id="xNotes" value="${esc(x.notes||"")}"></label>
    <div class="row" style="gap:10px">${e?`<button type="button" class="btn danger" data-act="sh:del">Delete</button>`:""}<button type="button" class="btn" style="flex:1" data-act="sh:save">Save</button></div>`,{
    save(sh){const amt=numv(sh,"#xAmt");if(amt==null){toast("Enter the amount.");return;}
      const d={date:val(sh,"#xDate"),amount:amt,item:val(sh,"#xItem"),store:val(sh,"#xStore"),category:val(sh,"#xCat"),project:val(sh,"#xProj"),notes:val(sh,"#xNotes")};
      if(e)store.update("expenses",e.id,d);else store.add("expenses",d);closeSheet();},
    del(sh,b){if(!armed){armed=true;b.textContent="Tap again";return;}store.del("expenses",e.id);closeSheet();}});
}
let RC=null;
async function scanReceipt(){
  const f=(await pickFiles("#cameraPick"))[0];if(!f)return;
  busy(true,"Saving the photo and reading it…");
  try{const data=await resizeImage(f,1800,.85);const r=await call("receipt",{data});busy(false);
    RC={store:r.store||"",date:r.date||today(),total:r.total,tax:r.tax,receipt:r.receipt||"",items:(r.items||[]).map(i=>({text:i.text,amount:i.amount,dest:"shelf",generic:genericName(i.text),qty:1,unit:supplyDefaults(genericName(i.text)).unit,project:"",cat:"Supplies"}))};
    if(!RC.items.length)RC.items.push({text:"",amount:null,dest:"other",generic:"",qty:1,unit:"each",project:"",cat:"Supplies"});
    sheetReceipt();
  }catch(e){busy(false);toast(e.message||"The receipt couldn't be read.");}
}
function sheetReceipt(){
  const r=RC;
  const sh=openSheet(`${head("Check receipt")}
    <div class="row" style="gap:10px"><span class="chip c-mint">Photo saved to Drive</span>${r.receipt?`<a class="small b" href="${esc(r.receipt)}" target="_blank" rel="noopener">View</a>`:""}</div>
    <div class="grid2"><label class="f">Store<input class="input" data-rc="store" value="${esc(r.store)}"></label><label class="f">Date<input class="input" type="date" data-rc="date" value="${esc(r.date)}"></label></div>
    ${r.items.map((it,i)=>`<div class="card" style="display:flex;flex-direction:column;gap:8px;padding:10px 12px" data-i="${i}">
      <div style="display:grid;grid-template-columns:1fr 92px;gap:8px"><input class="input" data-it="text" value="${esc(it.text)}" aria-label="Item"><input class="input" data-it="amount" inputmode="decimal" value="${it.amount??""}" aria-label="Price"></div>
      <select class="input" data-it="dest" aria-label="Where it goes">${opt("shelf",it.dest,"Supplies · add to the shelf")}${opt("project",it.dest,"Cost on a project")}${opt("other",it.dest,"Other expense")}${opt("skip",it.dest,"Leave this line out")}</select>
      ${it.dest==="shelf"?`<div style="display:grid;grid-template-columns:1fr 52px 74px;gap:6px"><input class="input" data-it="generic" value="${esc(it.generic)}" aria-label="Shelf name" list="supNames"><input class="input" data-it="qty" inputmode="decimal" value="${it.qty??1}" aria-label="How many"><select class="input" data-it="unit" aria-label="Unit">${UNITS().map(x=>opt(x,it.unit)).join("")}</select></div>`:""}
      ${it.dest==="project"?`<select class="input" data-it="project" aria-label="Project">${opt("",it.project,"Pick a project")}${projOptions(it.project,true)}</select>`:""}
      ${it.dest==="other"?`<select class="input" data-it="cat" aria-label="Category">${EXPCATS().map(c=>opt(c,it.cat)).join("")}</select>`:""}
    </div>`).join("")}
    <datalist id="supNames">${S.supplies.map(s=>`<option value="${esc(s.name)}">`).join("")}</datalist>
    <button type="button" class="link" data-act="sh:addLine" style="align-self:flex-start">+ Add a line</button>
    <div class="grid2"><label class="f">Tax<input class="input" data-rc="tax" inputmode="decimal" value="${r.tax??""}"></label><label class="f">Total<input class="input" data-rc="total" inputmode="decimal" value="${r.total??""}"></label></div>
    <span class="small muted" style="text-align:center">Read from your photo. Fix anything that looks off, then save.</span>
    <button type="button" class="btn full" data-act="sh:save">Save expense</button>`,{
    addLine(){read();RC.items.push({text:"",amount:null,dest:"shelf",generic:"",qty:1,unit:"each",project:"",cat:"Supplies"});sheetReceipt();},
    save(){read();saveReceipt();}});
  const read=()=>{sh.querySelectorAll("[data-rc]").forEach(el=>{const k=el.dataset.rc;r[k]=k==="tax"||k==="total"?N(el.value.replace(/[$,\s]/g,"")):el.value.trim();});
    sh.querySelectorAll("[data-i]").forEach(row=>{const it=r.items[+row.dataset.i];row.querySelectorAll("[data-it]").forEach(el=>{const k=el.dataset.it;it[k]=k==="amount"||k==="qty"?N(el.value.replace(/[$,\s]/g,"")):el.value.trim();});});};
  sh.addEventListener("change",e=>{const t=e.target;if(t.dataset.it==="dest"){read();sheetReceipt();}
    if(t.dataset.it==="text"){const row=t.closest("[data-i]");const g=row&&row.querySelector('[data-it="generic"]');if(g&&!g.dataset.touched){g.value=genericName(t.value);}}
    if(t.dataset.it==="generic")t.dataset.touched="1";});
}
function saveReceipt(){
  const r=RC;const date=r.date||today();let n=0;
  r.items.forEach(it=>{if(it.dest==="skip"||it.amount==null)return;n++;
    if(it.dest==="shelf"){const name=it.generic||genericName(it.text);const qty=it.qty||1;const s=supByName(name);
      if(s){const on=s.onHand||0,avg=s.avgCost||0;store.update("supplies",s.id,{onHand:r2(on+qty),avgCost:r4((on*avg+it.amount)/(on+qty))});}
      else{const d=supplyDefaults(name);store.add("supplies",{name,category:d.category,unit:it.unit||d.unit,onHand:qty,avgCost:r4(it.amount/qty),reusable:d.reusable,inUse:0});}
      store.add("expenses",{date,store:r.store,item:it.text||name,amount:it.amount,category:/hardware/i.test(name)?"Hardware":"Supplies",receipt:r.receipt});}
    else if(it.dest==="project"){const p=pByNo(it.project);
      store.add("expenses",{date,store:r.store,item:it.text,amount:it.amount,category:"Supplies",project:it.project,receipt:r.receipt});
      if(p){store.add("supplyuse",{project:String(p.no),supply:it.text||"Supplies",cost:it.amount,date});markStarted(p);refreshProfit(pById(p.id));}}
    else store.add("expenses",{date,store:r.store,item:it.text,amount:it.amount,category:it.cat||"Other",receipt:r.receipt});});
  if(r.tax)store.add("expenses",{date,store:r.store,item:"Tax",amount:r.tax,category:"Tax",receipt:r.receipt});
  RC=null;closeSheet();toast("Saved "+n+" line"+(n===1?"":"s")+" from the receipt");
}

/* ---------- inspiration ---------- */
async function addInspo(p){const fs=await pickFiles("#filePickMany");if(!fs.length)return;busy(true,"Saving "+fs.length+" picture"+(fs.length>1?"s":"")+"…");
  try{for(const f of fs){const id=await uploadPicture(f,"inspiration",picName("#"+p.no+" inspiration"));store.add("inspiration",{project:String(p.no),picture:id,caption:""});}}catch(e){toast(e.message||"A picture didn't upload.");}busy(false);}
function sheetInspo(x){let armed=false;const p=pByNo(x.project);
  openSheet(`${head("Inspiration picture")}
    <div class="gallery" style="grid-template-columns:1fr"><div class="ph" style="height:220px"><img data-img="${esc(x.picture)}" alt="" hidden style="position:absolute;inset:0"></div></div>
    <label class="f">Caption<input class="input" id="iCap" value="${esc(x.caption||"")}" placeholder="e.g. Brass pull style"></label>
    <div class="row" style="gap:10px"><button type="button" class="btn danger" data-act="sh:del">Delete</button><button type="button" class="btn ghost" data-act="sh:replace">Replace</button><button type="button" class="btn" style="flex:1" data-act="sh:save">Save</button></div>`,{
    save(sh){store.update("inspiration",x.id,{caption:val(sh,"#iCap")});closeSheet();},
    async replace(){const f=(await pickFiles("#filePick"))[0];if(!f)return;closeSheet();busy(true,"Saving picture…");try{const id=await uploadPicture(f,"inspiration",picName("#"+(p?p.no:"")+" inspiration"));store.update("inspiration",x.id,{picture:id});}catch(e){toast(e.message||"The picture didn't upload.");}busy(false);},
    del(sh,b){if(!armed){armed=true;b.textContent="Tap again";return;}store.del("inspiration",x.id);closeSheet();}});
}

/* =====================================================================
   BARCODE SCANNER
   ===================================================================== */
let SCAN=null;
async function openScanner(){
  const el=document.createElement("div");el.id="scanner";el.setAttribute("role","dialog");el.setAttribute("aria-label","Scan a barcode");
  el.innerHTML=`<video playsinline muted></video><div class="frame" aria-hidden="true"></div>
    <div class="bar"><button type="button" data-act="closeScan" aria-label="Close scanner">${I.x}</button><span class="b">Scan a supply</span><button type="button" data-act="torch" aria-label="Turn on flashlight"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h10l-2 6v12H9V9z"/><path d="M12 13v3"/></svg></button></div>
    <div class="bottom"><span class="b" id="scanMsg" style="text-align:center;color:#CFC7DD">Line up the barcode inside the box</span>
      <div class="row" style="gap:8px"><input class="input" id="scanCode" inputmode="numeric" placeholder="Or type the barcode number" aria-label="Barcode number"><button type="button" class="btn sm" data-act="scanGo">Go</button></div></div>`;
  document.body.appendChild(el);
  SCAN={el,stream:null,timer:null,torch:false};syncGuard();
  if(!("BarcodeDetector" in window)){$("#scanMsg").textContent="This phone's browser can't read barcodes. Type the number below.";}
  try{SCAN.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment",width:{ideal:1280}},audio:false});
    const v=el.querySelector("video");v.srcObject=SCAN.stream;await v.play();
    if("BarcodeDetector" in window){let formats=["ean_13","ean_8","upc_a","upc_e","code_128","code_39"];try{const sup=await BarcodeDetector.getSupportedFormats();formats=formats.filter(f=>sup.includes(f));}catch(e){}
      const det=new BarcodeDetector({formats});
      const loop=async()=>{if(!SCAN)return;try{const c=await det.detect(v);if(c&&c[0]&&c[0].rawValue){const code=c[0].rawValue;if(navigator.vibrate)navigator.vibrate(60);closeScanner();handleBarcode(code);return;}}catch(e){}SCAN.timer=setTimeout(loop,220);};loop();}
  }catch(e){$("#scanMsg").textContent="The camera didn't open. Allow camera access for this app, or type the number below.";}
}
function closeScanner(fromPop){if(!SCAN)return;clearTimeout(SCAN.timer);if(SCAN.stream)SCAN.stream.getTracks().forEach(t=>t.stop());SCAN.el.remove();SCAN=null;if(!fromPop)syncGuard();}
async function toggleTorch(){if(!SCAN||!SCAN.stream)return;const tr=SCAN.stream.getVideoTracks()[0];try{SCAN.torch=!SCAN.torch;await tr.applyConstraints({advanced:[{torch:SCAN.torch}]});}catch(e){toast("No flashlight control on this phone.");}}
async function handleBarcode(code){
  code=String(code).replace(/\s/g,"");
  const known=S.barcodes.find(b=>same(b.barcode,code));
  if(known){const s=supByName(known.supply);if(s){sheetSupply(s,"use");return;}}
  const sh=openSheet(`${head("New product","Barcode "+code)}<div class="row" style="gap:10px"><div class="spin" aria-hidden="true"></div><span class="b">Looking it up…</span></div>`,{});
  let info={product:""};try{info=await call("barcode",{code});}catch(e){}
  const prod=[info.brand&&!new RegExp(info.brand,"i").test(info.product||"")?info.brand:"",info.product].filter(Boolean).join(" ").trim();
  const gen=genericName(prod)||"";const d=supplyDefaults(gen);
  openSheet(`${head("New product","Barcode "+code)}
    <label class="f">Product name<input class="input" id="bProd" value="${esc(prod)}" placeholder="${info.product?"":"Not found online. Type the name on the label"}"></label>
    <label class="f">File it on the shelf as<input class="input" id="bGen" value="${esc(gen)}" list="supNames2" placeholder="e.g. Water-based poly"><datalist id="supNames2">${S.supplies.map(s=>`<option value="${esc(s.name)}">`).join("")}</datalist></label>
    <p class="small muted" style="margin:0">Brands are filed under a simple name so you can see what you use and what it costs. Next time this barcode is scanned it goes straight there.</p>
    <div class="grid2"><label class="f">Category<select class="input" id="bCat">${SUPCATS().map(c=>opt(c,d.category)).join("")}</select></label><label class="f">Unit<select class="input" id="bUnit">${UNITS().map(x=>opt(x,d.unit)).join("")}</select></label></div>
    <label class="check"><input type="checkbox" id="bReuse" ${d.reusable?"checked":""}>Reusable (like sandpaper)</label>
    <button type="button" class="btn full" data-act="sh:save">Save and continue</button>`,{
    save(sh){const name=val(sh,"#bGen")||genericName(val(sh,"#bProd"));if(!name){toast("Say what to file it as.");return;}
      store.add("barcodes",{barcode:code,product:val(sh,"#bProd"),supply:name});
      let s=supByName(name);
      if(!s){const id=store.add("supplies",{name,category:val(sh,"#bCat"),unit:val(sh,"#bUnit"),onHand:0,avgCost:null,reusable:sh.querySelector("#bReuse").checked,inUse:0});s=S.supplies.find(x=>x.id===id);}
      sheetSupply(s,s.onHand?"use":"restock");}},
    s=>{s.querySelector("#bProd").addEventListener("input",()=>{const g=s.querySelector("#bGen");if(!g.dataset.touched)g.value=genericName(val(s,"#bProd"));});s.querySelector("#bGen").addEventListener("input",e=>{e.target.dataset.touched="1";});});
}

/* =====================================================================
   TAPS
   ===================================================================== */
document.addEventListener("click",async e=>{
  const t=e.target.closest("[data-tab]");
  if(t&&!e.target.closest("[data-act]")){VIEW.tab=t.dataset.tab;LS.set("tab",VIEW.tab);VIEW.project=null;window.scrollTo(0,0);render();syncGuard();return;}
  const b=e.target.closest("[data-act]");if(!b)return;
  const a=b.dataset.act,p=VIEW.project?pById(VIEW.project):null;
  if(a.startsWith("sh:")){if(SH&&SH[a.slice(3)]){e.preventDefault();SH[a.slice(3)]($("#scrim .sheet"),b);}return;}
  switch(a){
    case"sync":clearTimeout(retryT);flush();break;
    case"connect":{const api=$("#cApi").value.trim().split(/[?#]/)[0],key=$("#cKey").value.trim();if(!/^https:\/\/script\.google\.com\//.test(api)||!key){toast("Paste the web app link and the key.");return;}API=api;KEY=key;LS.set("api",API);LS.set("key",KEY);auth="ok";render();flush();break;}
    case"closeSheet":closeSheet();break;
    case"month":VIEW.month=shiftMonth(VIEW.month,+b.dataset.v);render();break;
    case"gotab":VIEW.tab=b.dataset.v;LS.set("tab",VIEW.tab);if(b.dataset.f){VIEW.pf=b.dataset.f;LS.set("pf",VIEW.pf);}render();break;
    case"goals":sheetGoals();break;
    case"pf":VIEW.pf=b.dataset.v;LS.set("pf",VIEW.pf);render();break;
    case"open":openProject(b.dataset.id,b.dataset.sub);break;
    case"close":closeProject();break;
    case"newProject":sheetNewProject();break;
    case"editProject":if(p)sheetEditProject(p);break;
    case"pic":if(p)sheetPicture(p);break;
    case"sub":VIEW.sub=b.dataset.v;render();break;
    case"toggleStep":if(p){const k=p.id+"|"+b.dataset.v;VIEW.open[k]=!VIEW.open[k];render();}break;
    case"startTimer":e.stopPropagation();if(p)startTimer(p,b.dataset.v);break;
    case"stopTimer":stopTimer();break;
    case"addTime":if(p)sheetTime(p,null,b.dataset.v);break;
    case"editTime":if(p){const x=S.timelog.find(t=>t.id===b.dataset.id);if(x)sheetTime(p,x);}break;
    case"useForProject":if(p)sheetUse(p);break;
    case"editUse":if(p){const x=S.supplyuse.find(u=>u.id===b.dataset.id);if(x)sheetUse(p,x);}break;
    case"listEvent":if(p)sheetListEvent(p,b.dataset.v);break;
    case"editEvent":if(p){const x=S.listings.find(l=>l.id===b.dataset.id);if(x)sheetListEvent(p,x.event,x);}break;
    case"plusInquiry":if(p)plusInquiry(p);break;
    case"markSold":if(p)sheetMarkSold(p);break;
    case"setPending":if(p)setPending(p,b.dataset.v==="1");break;
    case"undoSale":if(p)undoSale(p);break;
    case"addInspo":if(p)addInspo(p);break;
    case"inspoMenu":{const x=S.inspiration.find(i=>i.id===b.dataset.id);if(x)sheetInspo(x);break;}
    case"lperiod":VIEW.lperiod=b.dataset.v;render();break;
    case"soldAll":VIEW.soldAll=!VIEW.soldAll;render();break;
    case"supply":{const s=S.supplies.find(x=>x.id===b.dataset.id);if(s)sheetSupply(s,"use");break;}
    case"newSupply":sheetNewSupply();break;
    case"scan":openScanner();break;
    case"closeScan":closeScanner();break;
    case"torch":toggleTorch();break;
    case"scanGo":{const c=$("#scanCode").value.trim();if(c){closeScanner();handleBarcode(c);}break;}
    case"money":VIEW.money=b.dataset.v;render();break;
    case"newExpense":sheetExpense();break;
    case"editExpense":{const x=S.expenses.find(z=>z.id===b.dataset.id);if(x)sheetExpense(x);break;}
    case"receipt":scanReceipt();break;
  }
});
document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches('[role="button"][data-act]')){e.preventDefault();e.target.click();}});
document.addEventListener("change",e=>{const t=e.target;if(t.dataset.act==="sort"){VIEW.sort=t.value;LS.set("sort",VIEW.sort);render();}
  if(t.dataset.act==="inspoNotes"&&VIEW.project){store.update("projects",VIEW.project,{inspoNotes:t.value.trim()});toast("Notes saved");}});
document.addEventListener("input",e=>{const t=e.target;if(t.dataset.act==="q"){VIEW.q=t.value;const pos=t.selectionStart;render();const n=$('[data-act="q"]');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch(x){}}}});

/* =====================================================================
   START
   ===================================================================== */
readLinkParams();
try{const c=JSON.parse(LS.get("cache","null"));if(c){S=normalize(c);ready=true;}}catch(e){}
try{queue=JSON.parse(LS.get("queue","[]"))||[];queue.forEach(applyLocal);}catch(e){queue=[];}
render();flush();
if("serviceWorker"in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});
</script>
</body>
</html>
