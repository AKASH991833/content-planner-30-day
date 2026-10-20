'use strict';
(function(){
var $=function(s){return document.querySelector(s)},N=window.NICHES,P=window.PILLARS,T=window.TEMPLATES,GL=window.GOALS;
var KEY='planner-v1',plan=null,view='list';
var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('show')},2000)}
function rng(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function fill(str,c){return str.replace(/\{t\}/g,c.t).replace(/\{a\}/g,c.a).replace(/\{p\}/g,c.p).replace(/\{n\}/g,c.n)}
function pad(n){return n<10?'0'+n:''+n}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}
function postDays(freq){ // weekday sets (0=Sun)
  return {3:[1,3,5],5:[1,2,3,4,5],7:[0,1,2,3,4,5,6]}[freq]}
function makeIdea(o,pillar,topic,used,r,fmtNeed){
  var list=T[pillar],opts=[];list.forEach(function(t,i){opts.push(i)});
  // shuffle
  for(var i=opts.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),x=opts[i];opts[i]=opts[j];opts[j]=x}
  var best=1e9,pick=opts[0];opts.forEach(function(ix){var u=used['n:'+pillar+':'+ix]||0;if(u<best){best=u;pick=ix}});used['n:'+pillar+':'+pick]=best+1;
  var tp=list[pick],tx=tp[o.lang],nic=N[o.niche],c={t:topic,a:o.aud||nic.aud,p:nic.proof,n:nic.n.split('/')[0].trim().toLowerCase()};
  var ttl=fill(tx[0],c);if(used['t:'+ttl]){ttl=ttl+' ('+topic+')';if(used['t:'+ttl])ttl=ttl+' #'+(used['t:'+ttl]+1)}used['t:'+ttl]=(used['t:'+ttl]||0)+1;used['t:'+fill(tx[0],c)]=1;var cap=fill(tx[2],c);if(o.name)cap+='\n\n- '+o.name;
  return {pillar:pillar,format:tp.f,title:ttl,hook:fill(tx[1],c),caption:cap,tags:pickTags(o,r),topic:topic,tpl:pick}}
function pickTags(o,r){var a=N[o.niche].tags.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),x=a[i];a[i]=a[j];a[j]=x}return a.slice(0,7).join(' ')+' #'+o.platform.replace(/\s/g,'')+'Tips'}
function weightedPillars(o,n,r){
  var w=GL[o.goal].w,keys=Object.keys(w),out=[],cnt={},tot=0;keys.forEach(function(k){tot+=w[k]});
  keys.forEach(function(k){cnt[k]=Math.max(1,Math.round(n*w[k]/tot));});
  var sum=function(){var s=0;keys.forEach(function(k){s+=cnt[k]});return s};
  var big=keys.slice().sort(function(a,b){return w[b]-w[a]});
  var g=0;while(sum()>n&&g++<50){for(var i=0;i<big.length&&sum()>n;i++)if(cnt[big[i]]>1)cnt[big[i]]--}
  g=0;while(sum()<n&&g++<50){cnt[big[g%big.length]]++}
  // interleave: round robin by remaining count, avoid same pillar twice in a row, promo never first
  var last='';
  for(var s=0;s<n;s++){
    var cand=keys.filter(function(k){return cnt[k]>0&&k!==last&&!(s===0&&k==='promo')});if(!cand.length)cand=keys.filter(function(k){return cnt[k]>0});
    cand.sort(function(a,b){return cnt[b]-cnt[a]+(r()-.5)});var k=cand[0];out.push(k);cnt[k]--;last=k}
  return out}
function generate(o){
  var r=rng(o.seed),start=parse(o.start),days=[],pd=postDays(o.freq),topics=N[o.niche].topics.slice();
  for(var i=topics.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),x=topics[i];topics[i]=topics[j];topics[j]=x}
  var slots=[];for(var d=0;d<30;d++){var dt=new Date(start.getFullYear(),start.getMonth(),start.getDate()+d);slots.push({d:d,date:dt,post:pd.indexOf(dt.getDay())>=0})}
  var np=slots.filter(function(s){return s.post}).length,pill=weightedPillars(o,np,r),used={},pi=0,ti=0;
  slots.forEach(function(s){
    var item={day:s.d+1,date:iso(s.date),post:s.post,done:false};
    if(s.post){var idea=makeIdea(o,pill[pi++],topics[ti++%topics.length],used,r);for(var k in idea)item[k]=idea[k];item.time=window.BEST_TIME[o.platform]}
    else{item.title='Rest and engage';item.hook='Spend 15 minutes replying to comments and DMs.';item.caption='No new post today. Reply to every comment, like a few posts from your niche, and note ideas for next week.';item.pillar='';item.format='Engage';item.tags=''}
    days.push(item)});
  return {opts:o,days:days}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(plan))}catch(e){}}
function load(){try{var p=JSON.parse(localStorage.getItem(KEY)||'null');if(p&&p.days&&p.days.length===30&&p.opts)return p}catch(e){}return null}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
function fmtDate(s){var d=parse(s);return DN[d.getDay()]+', '+d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}
function renderList(){
  var box=$('#list');box.replaceChildren();
  plan.days.forEach(function(d,idx){
    var c=el('article','day'+(d.post?'':' rest')+(d.done?' done':''));if(d.pillar)c.style.setProperty('--pc',P[d.pillar].color);
    var h=el('div','dh'),l=el('div');l.append(el('span','dn','Day '+d.day),el('span','dd',' · '+fmtDate(d.date)));h.append(l);
    var tg=el('div','tags');if(d.post){var p=el('span','tag p',P[d.pillar].n);p.style.setProperty('--pc',P[d.pillar].color);tg.append(p,el('span','tag',d.format))}else tg.append(el('span','tag','Rest day'));h.append(tg);c.append(h);
    c.append(el('div','title',d.title),el('div','hook','Hook: '+d.hook));
    if(d.post){
      var ta=el('textarea');ta.value=d.caption;ta.setAttribute('aria-label','Caption for day '+d.day);ta.addEventListener('input',function(){d.caption=ta.value;save()});c.append(ta);
      var tgs=el('input');tgs.type='text';tgs.value=d.tags;tgs.setAttribute('aria-label','Hashtags for day '+d.day);tgs.addEventListener('input',function(){d.tags=tgs.value;save()});c.append(tgs);
      c.append(el('div','muted small','Best time: '+d.time))}
    else c.append(el('div','muted small',d.caption));
    var a=el('div','dact');
    var lab=el('label','sw');var cb=el('input');cb.type='checkbox';cb.checked=d.done;cb.addEventListener('change',function(){d.done=cb.checked;save();c.classList.toggle('done',d.done);progress()});lab.append(cb,document.createTextNode(d.post?' Done':' Rest done'));a.append(lab);
    if(d.post){var sw=el('button','btn ghost sm','🔄 Swap idea');sw.type='button';sw.addEventListener('click',function(){swap(idx)});var cp=el('button','btn ghost sm','📋 Copy');cp.type='button';cp.addEventListener('click',function(){copy(dayText(d),'Copied day '+d.day)});a.append(sw,cp)}
    c.append(a);box.append(c)});
  progress()}
function renderCal(){
  var box=$('#cal');box.replaceChildren();box.className='cal';DN.forEach(function(n){box.append(el('div','h',n))});
  var first=parse(plan.days[0].date).getDay();for(var i=0;i<first;i++){box.append(el('div'))}
  plan.days.forEach(function(d){var b=el('button','cell'+(d.post?'':' e')+(d.done?' done':''));b.type='button';var dt=parse(d.date);b.append(el('b',null,dt.getDate()+(dt.getDate()===1?' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]:'')),el('span',null,d.post?d.format+': '+d.title:'Rest'));if(d.pillar)b.style.borderLeft='4px solid '+P[d.pillar].color;b.addEventListener('click',function(){setView('list');var n=document.querySelectorAll('.day')[d.day-1];n.scrollIntoView({behavior:'smooth',block:'center'})});box.append(b)})}
function setView(v){view=v;$('#vList').setAttribute('aria-selected',v==='list');$('#vCal').setAttribute('aria-selected',v==='cal');$('#list').hidden=v!=='list';$('#cal').hidden=v!=='cal';if(v==='cal')renderCal()}
function progress(){var p=plan.days.filter(function(d){return d.post}),dn=p.filter(function(d){return d.done}).length;$('#doneN').textContent=dn;$('#totalN').textContent=p.length;$('#meter').style.width=(p.length?dn/p.length*100:0)+'%'}
function swap(idx){var d=plan.days[idx],o=plan.opts,r=rng(Date.now()&0xffffff),used={};used['n:'+d.pillar+':'+d.tpl]=9;var nt=N[o.niche].topics,topic=nt[Math.floor(r()*nt.length)],ni=makeIdea(o,d.pillar,topic,used,r);for(var k in ni)d[k]=ni[k];d.done=false;save();renderList();toast('New idea for day '+d.day)}
function dayText(d){return d.post?('Day '+d.day+' ('+fmtDate(d.date)+') - '+d.format+' - '+P[d.pillar].n+'\n'+d.title+'\nHook: '+d.hook+'\n\n'+d.caption+'\n\n'+d.tags):('Day '+d.day+' ('+fmtDate(d.date)+') - Rest and engage')}
function copy(t,msg){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast(msg)},function(){toast('Copy not allowed here')})}else{var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(msg)}catch(e){toast('Copy not allowed here')}ta.remove()}}
var HEAD=['Day','Date','Weekday','Format','Pillar','Idea','Hook','Caption draft','Hashtags','Best time hint','Done'];
function rows(){return plan.days.map(function(d){return [d.day,d.date,DN[parse(d.date).getDay()],d.format,d.post?P[d.pillar].n:'Rest',d.title,d.hook,d.caption,d.tags,d.post?d.time:'',d.done?'Yes':'No']})}
function fname(ext){return 'content-plan-30-days-'+plan.opts.start+'.'+ext}
function dl(blob,name){var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000)}
function toCSV(){var q=function(v){v=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};return '\ufeff'+[HEAD].concat(rows()).map(function(r){return r.map(q).join(',')}).join('\r\n')}
function toXlsx(){
  function run(){var X=window.XLSX,safe=function(v){return typeof v==='string'&&/^[=+\-@]/.test(v)?"'"+v:v};
    var ws=X.utils.aoa_to_sheet([HEAD].concat(rows().map(function(r){return r.map(safe)})));ws['!cols']=[{wch:5},{wch:11},{wch:8},{wch:10},{wch:14},{wch:40},{wch:40},{wch:70},{wch:50},{wch:32},{wch:6}];
    var wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'30-day plan');X.writeFile(wb,fname('xlsx'));toast('Excel downloaded')}
  if(window.XLSX)return run();var s=document.createElement('script');s.src='vendor/xlsx.mini.min.js';s.onload=run;s.onerror=function(){toast('Could not load Excel export. Use CSV.')};document.head.appendChild(s)}
function show(){$('#planArea').hidden=false;renderList();setView(view)}
function gather(){return {niche:$('#niche').value,goal:$('#goal').value,platform:$('#platform').value,freq:+$('#freq').value,lang:$('#lang').value,start:$('#start').value,name:$('#name').value.trim(),aud:$('#aud').value.trim(),seed:(Date.now()&0x7fffffff)}}
function init(){
  Object.keys(N).forEach(function(k){var o=el('option',null,N[k].emoji+' '+N[k].n);o.value=k;$('#niche').append(o)});
  Object.keys(GL).forEach(function(k){var o=el('option',null,GL[k].n);o.value=k;$('#goal').append(o)});
  var today=new Date();$('#start').value=iso(today);
  var p=load();if(p){plan=p;var o=p.opts;['niche','goal','platform','freq','lang','start','name','aud'].forEach(function(k){$('#'+k).value=o[k]});show()}
  $('#gen').addEventListener('click',function(){var o=gather();if(!o.start){toast('Pick a start date');return}plan=generate(o);save();show();$('#planArea').scrollIntoView({behavior:'smooth'})});
  $('#vList').addEventListener('click',function(){setView('list')});$('#vCal').addEventListener('click',function(){setView('cal')});
  $('#xlsx').addEventListener('click',toXlsx);$('#csv').addEventListener('click',function(){dl(new Blob([toCSV()],{type:'text/csv;charset=utf-8'}),fname('csv'));toast('CSV downloaded')});
  $('#copyall').addEventListener('click',function(){copy(plan.days.map(dayText).join('\n\n----------\n\n'),'Full plan copied')});
  $('#print').addEventListener('click',function(){window.print()});
  $('#reset').addEventListener('click',function(){if(confirm('Delete this plan and start a new one?')){try{localStorage.removeItem(KEY)}catch(e){}plan=null;$('#planArea').hidden=true;window.scrollTo({top:0,behavior:'smooth'})}});
  window.__cp={generate:generate,get plan(){return plan},N:N};
  if('serviceWorker' in navigator&&location.protocol.indexOf('http')===0)navigator.serviceWorker.register('sw.js').catch(function(){});
}
init();
})();
