// Browser preview of the live page with a simulated API; never reads Thunderbird data.
// Run: node "docs/issues/401 - troubleshooter/preview-server.mjs"
import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const messages = JSON.parse(await readFile(path.join(root, "_locales/en/messages.json"), "utf8"));
const fixture = `
const messages = ${JSON.stringify(messages)};
const findings = [
 ['runs','no-run-method','Newsletters → Reading'],
 ['folders','missing-folder','Archive invoices'],
 ['addons','missing-action','Save attachments'],
 ['addons','missing-term','Project reminders'],
 ['conditions','mixed-conditions','Priority customers'],
 ['conditions','missing-conditions','Old test filter']
].map(([category,reason,filterName],index)=>({id:String(index),token:String(index),accountId:'a',category,reason,filterName,enabled:true,canEdit:reason!=='mixed-conditions',state:'remaining'}));
let current = findings;
globalThis.browser = {
 i18n: {getUILanguage:()=> 'en', getMessage(key,values=[]) {
  if(key==='@@bidi_dir')return 'ltr'; const item=messages[key];
  return item?.message.replace(/\\$(\\w+)\\$/g,(_,name)=>values[Number(item.placeholders[name].content.slice(1))-1]??'')||key;
 }},
 accounts:{list:async()=>[{id:'a'},{id:'b'}]},tabs:{create:async()=>{throw Error('Preview: no real Add-ons Manager');}},
 FiltersAPI: {
  getTroubleshooterInfo:async()=>({appName:'Thunderbird',supportsMixedConditions:false}),
  getBackupInfo:async()=>({accounts:[{id:'a',name:'Preview · Personal',count:24},{id:'b',name:'Preview · Work',count:8}]}),
  beginTroubleshooting:async()=> 'session',endTroubleshooting:async()=>{},
  getFilterSnapshot:async(session,accountId,checks)=>({
   schemaVersion:1,snapshotId:'preview',source:'live',accountId,accountType:'imap',count:accountId==='a'?24:8,checks,trial:null,
   capabilities:{runnableTypes:127,supportsMixedConditions:false,folderActionTypes:[1,2],customActionType:3,customTermAttribute:-2},
   entries:accountId==='a'?current.map((item,position)=>{
    const term={attrib:0,op:0,customId:'',matchAll:false,booleanAnd:true,beginsGrouping:0,endsGrouping:0};
    const entity={filterName:item.filterName,enabled:item.enabled,filterType:item.reason==='no-run-method'?0:1,unparseable:false,actionList:[],searchTerms:[term]};
    const observations={canEdit:item.canEdit,actions:[],terms:[{}]};
    if(item.reason==='missing-folder'){entity.actionList=[{type:1,targetFolderUri:'imap://preview/Missing'}];observations.actions=[{folder:'missing'}];}
    if(item.reason==='missing-action'){entity.actionList=[{type:3,customId:'preview#action'}];observations.actions=[{provider:'missing'}];}
    if(item.reason==='missing-term'){entity.searchTerms[0]={...term,attrib:-2,customId:'preview#term'};observations.terms=[{provider:'missing'}];}
    if(item.reason==='mixed-conditions'){entity.searchTerms.push({...term,booleanAnd:false,beginsGrouping:1,endsGrouping:1});observations.terms.push({});}
    if(item.reason==='missing-conditions'){entity.searchTerms=[];observations.terms=[];}
    return{token:item.token,position,entity,observations,errors:[]};
   }):[]}),
  getFilterConditionText:async()=>({text:'AND (subject,contains,invoice) OR (,contains,example.com)',canEdit:true,terms:[{text:'subject,contains,invoice',booleanAnd:true,beginsGrouping:1,endsGrouping:0,isCustom:false},{text:',contains,example.com',booleanAnd:false,beginsGrouping:0,endsGrouping:1,isCustom:true,customId:'example@provider#term',customAvailable:false}]}),
  remedyFilter:async(session,token,remedy)=>{if(!confirm('PREVIEW ONLY: simulate '+remedy+'?'))return{changed:false};const item=current.find(item=>item.token===token);if(remedy==='disable'){item.enabled=false;if(item.reason==='mixed-conditions')item.state='disabled';}else current=current.filter(item=>item.token!==token);return {changed:true};},
  openFilterLog:async()=>alert('Preview only: opens the selected account’s filter log in Thunderbird.'),
  openFilterAddons:async()=>alert('Preview only: opens Thunderbird’s Add-ons Manager.')
 }
};
document.addEventListener('DOMContentLoaded',()=>{const note=document.createElement('p');note.textContent='BROWSER PREVIEW · Simulated data only';note.style.cssText='padding:8px;background:#fff0da;color:#805000;text-align:center';document.body.prepend(note);});
`;
const types = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".svg": "image/svg+xml" };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/fixture.js") { response.setHeader("Content-Type", "text/javascript; charset=utf-8"); response.end(fixture); return; }
    const name = decodeURIComponent(url.pathname === "/" ? "/html/filter-troubleshooter.html" : url.pathname);
    if (!/^\/(html|scripts|chrome\/content)\//.test(name)) throw Error("Not a preview asset");
    const file = path.resolve(root, `.${name}`);
    if (!file.startsWith(root)) throw Error("Invalid path");
    let bytes = await readFile(file);
    if (name === "/html/filter-troubleshooter.html") bytes = bytes.toString("utf8").replace('<script type="module"', '<script src="/fixture.js"></script><script type="module"');
    response.setHeader("Content-Type", `${types[path.extname(file)] || "application/octet-stream"}; charset=utf-8`);
    response.end(bytes);
  } catch { response.writeHead(404); response.end("Not found"); }
});
server.listen(8765, "127.0.0.1", () => console.log("Simulated troubleshooter preview: http://127.0.0.1:8765/html/filter-troubleshooter.html"));
