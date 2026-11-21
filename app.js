(() => {
  'use strict';
  const icons = {
    search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    bookmark:'<path d="M6.5 4.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16L12 17l-5.5 3.5z"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m15.9 8.1-2.2 5.6-5.6 2.2 2.2-5.6z"/>',
    compare:'<rect x="2.5" y="5" width="7.5" height="14" rx="1.5"/><rect x="14" y="5" width="7.5" height="14" rx="1.5"/>',
    pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
    left:'<path d="m14.5 6-6 6 6 6"/>',right:'<path d="m9.5 6 6 6-6 6"/>',
    menu:'<path d="M3.5 7h17m-17 5h17m-17 5h17"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
    book:'<path d="M12 5.8C9.4 3.9 6.7 3.6 3 4.8v14.3c3.7-1.2 6.4-.9 9 1 2.6-1.9 5.3-2.2 9-1V4.8c-3.7-1.2-6.4-.9-9 1zM12 6v14"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    prayer:'<path d="M3 20h18M5 20v-6.2h14V20M6 13.8v-2.1c0-2.4 3.5-3.5 6-6.4 2.5 2.9 6 4 6 6.4v2.1M12 3v2M10 20v-3a2 2 0 0 1 4 0v3"/>',
    food:'<path d="M3 12h18a9 9 0 0 1-18 0Zm2 8h14M8 8c-2-2 2-2 0-4m4 4c-2-2 2-2 0-4m4 4c-2-2 2-2 0-4"/>',
    family:'<circle cx="9" cy="8" r="3"/><path d="M3 19v-1a6 6 0 0 1 12 0v1M15.2 5.5a3 3 0 0 1 0 5.5M17 13a5 5 0 0 1 4 5v1"/>',
    language:'<path d="M3 4h13v10H9l-4.5 3v-3H3zM17.5 8H21v10h-3v3l-4-3h-3v-2"/>',
    check:'<path d="m4 12 5 5L20 6"/>'
  };
  const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
  const escape = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const $=s=>document.querySelector(s);
  const list=[...window.WORLD].sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const byId=Object.fromEntries(list.map(c=>[c.id,c]));
  const measures=Object.fromEntries(window.MEASURES.map(m=>[m.key,m]));
  const guide=Object.fromEntries(window.COUNTRIES.map(c=>[c.id,c]));
  const img={id:'jakarta',my:'kuala-lumpur',tr:'turkiye',dz:'algeria',ma:'fez',fr:'france'};
  const asset=path=>window.ATLAS_ASSETS?.[path]||path;
  const groups=['Overview','Healthcare','Children & schools','Costs & work','Safety & environment','Daily infrastructure','Faith & community'];
  const overview=['share','prices','uhc','oop','schoolyears','dpt','homicide'];
  const names={people:'Muslim population',share:'Muslim share',prices:'Household price level',uhc:'Health service coverage',dpt:'DPT vaccination',teachers:'Pupils per teacher',water:'Safe drinking water',jobs:'Unemployment'};
  const placeName=(c)=>escape(c.name);
  const searchText=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const searchable=new Map(list.map(c=>[c.id,searchText([c.name,c.iso2,c.iso3,guide[c.id]?.city,...c.aliases].join(' '))]));
  function match(c,q){return !q || searchable.get(c.id).includes(searchText(q));}
  function format(c,key,compact=false){
    const row=c.d[key],m=measures[key];
    if(!row)return 'No data';
    if(row[2])return row[2];
    if(row[0]==null)return 'No data';
    const value=row[0];
    if(key==='people'){
      if(compact&&value>=1e6)return (value/1e6).toFixed(1)+'m';
      if(compact&&value>=1e3)return Math.round(value/1e3)+'k';
      return value.toLocaleString('en');
    }
    return value.toLocaleString('en',{minimumFractionDigits:m.decimals,maximumFractionDigits:m.decimals})+(m.unit==='%'?'%':'');
  }
  const unit=key=>measures[key].unit==='%'?'% of population':measures[key].unit;
  const regions=[...new Set(list.map(c=>c.region))].sort();
  const regionOptions='<option value="">All regions</option>'+regions.map(r=>'<option>'+escape(r)+'</option>').join('');
  let mobileStart=0;
  let pair=['dz','fr'], category='Overview',view='home',saved=[],pageSize=12,pickerAction=null,toastTimer;
  function readSaved(){try{const v=JSON.parse(localStorage.getItem('sakinah.saved.v1')||'[]');saved=Array.isArray(v)?[...new Set(v.filter(id=>byId[id]))]:[];}catch{saved=[];}}
  function notify(message){const n=$('#toast');n.textContent=message;n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),1700);}
  function saveButton(c){const active=saved.includes(c.id);return '<button class="place-save" aria-label="'+(active?'Remove ':'Save ')+placeName(c)+(active?' from saved places':'')+'" aria-pressed="'+active+'" data-save="'+c.id+'">'+icon('bookmark')+'</button>';}
  function syncSaved(){const n=$('.saved-count');n.textContent=saved.length;n.hidden=!saved.length;$('.saved-nav').setAttribute('aria-label','Saved places, '+saved.length+' saved');document.querySelectorAll('[data-save]').forEach(b=>{const c=byId[b.dataset.save],active=saved.includes(c.id);b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-label',(active?'Remove ':'Save ')+c.name+(active?' from saved places':''));});}
  function save(id){const active=saved.includes(id);saved=active?saved.filter(v=>v!==id):[...saved,id];let stored=true;try{localStorage.setItem('sakinah.saved.v1',JSON.stringify(saved));}catch{stored=false;}
    if(view==='saved'){renderSaved();($('#detail [data-save]')||$('#detail a'))?.focus({preventScroll:true});}syncSaved();notify(byId[id].name+(active?' removed':stored?' saved':' saved for this visit'));}
  function countryRows(items){
    return items.map(c=>'<div class="directory-row"><a href="#country/'+c.id+'"><span class="iso">'+escape(c.iso3)+'</span><span class="directory-name"><b>'+placeName(c)+'</b><small>'+escape(guide[c.id]?guide[c.id].city+' city guide':c.region)+'</small></span><span class="directory-stat">'+escape(format(c,'share'))+'<small>Muslim share</small></span>'+icon('right')+'</a>'+saveButton(c)+'</div>').join('');
  }
  function renderDirectory(){
    const selected=$('#dir-region').value,q=$('#dir-search').value,only=$('#guides-only').checked;
    const matches=list.filter(c=>(!selected||c.region===selected)&&(!only||guide[c.id])&&match(c,q));
    $('#dir-count').textContent=matches.length+' '+(matches.length===1?'place':'places');
    $('#dir-list').innerHTML=matches.length?countryRows(matches.slice(0,pageSize)):'<p class="no-results">No matches. Try another name or region.</p>';
    $('#dir-more').hidden=matches.length<=pageSize;
  }
  function renderSaved(){
    $('#detail').innerHTML=crumb()+'<h1>Saved places</h1><p class="subdek">'+(saved.length?'Your shortlist, saved in this browser.':'Bookmark a place in the directory to keep it here.')+'</p>'+(saved.length?countryRows(saved.map(id=>byId[id])):'<a class="btn dark" href="#atlas">Browse countries</a>');
  }
  function crumb(){return '<a class="breadcrumb" href="#atlas">'+icon('left')+'Country directory</a>';}
  function sources(g){return g.sources.map(s=>'<a class="credit-link" href="'+escape(s.url)+'" target="_blank" rel="noopener">'+escape(s.label)+'</a>').join('');}
  function measureRows(ids,keys){
    return keys.map(key=>{
      const m=measures[key];
      return '<section class="measure-row"><div class="measure-label"><h3>'+escape(m.name)+'</h3><span>'+escape(m.unit)+'</span><details><summary>Definition &amp; source</summary><p>'+escape(m.description)+'</p><a class="credit-link" target="_blank" rel="noopener" href="'+escape(m.url)+'">'+escape(m.source)+'</a></details></div><div class="value-grid" style="--n:'+ids.length+'">'+ids.map(id=>{
        const c=byId[id],r=c.d[key];
        let graph='';
        if(r?.[0]!=null&&(m.unit==='%'||key==='uhc'||key==='prices')){
          graph='<span class="mini-track" aria-hidden="true"><i style="--bar:'+Math.max(0,Math.min(r[0],100))+'%"></i></span>';
        }
        return '<div class="measure-cell"><span class="sr">'+placeName(c)+'. </span><b>'+escape(format(c,key,true))+'</b>'+(r?'<small>'+r[1]+'</small>':'<small>Unavailable</small>')+graph+'</div>';
      }).join('')+'</div></section>';
    }).join('');
  }
  const prompts={
    Healthcare:'Ask the local health insurer when a newly arrived child is eligible, how to register with a paediatrician, and what a prescription or emergency visit costs.',
    'Children & schools':'Ask the school district about residence documents, teaching language, fees, catchment boundaries and places for your child’s age.',
    'Costs & work':'Price a real rental, childcare place and grocery basket near work. Check which family members can work under the residence permit.',
    'Safety & environment':'Look up neighbourhood air readings, water quality and the school route for the address you are considering.',
    'Daily infrastructure':'Try the weekday commute and check internet providers for the specific address before signing a lease.',
    'Faith & community':'Visit the nearby mosque and school on a normal weekday. Ask about women’s facilities, halal suppliers and weekend programmes.'
  };
  function compareText(ids){
    const covered=ids.some(id=>guide[id]);if(!covered)return '';
    return '<div class="city-comparison"><h2>In the neighbourhood</h2>'+[['prayer','Prayer spaces'],['food','Halal food'],['family','Family & community'],['language','Language']].map(([key,title])=>
      '<section class="measure-row"><div class="measure-label"><h3>'+title+'</h3></div><div class="value-grid" style="--n:'+ids.length+'">'+ids.map(id=>{
        const g=guide[id];return '<div class="local-cell">'+(g?'<b>'+escape(g.city)+'</b><p>'+escape(g[key])+'</p><a href="#country/'+id+'">Local sources</a>':'<p>City guide unavailable.</p>')+'</div>';
      }).join('')+'</div></section>').join('')+'</div>';
  }
  function renderCompare(){
    const visible=category==='Overview'?overview:window.MEASURES.filter(m=>m.group===category).map(m=>m.key);
    const paged=matchMedia('(max-width:680px)').matches&&pair.length>2;
    mobileStart=Math.max(0,Math.min(mobileStart,pair.length-2));
    const shown=paged?pair.slice(mobileStart,mobileStart+2):pair;
    const pager=paged?'<div class="pair-pager"><button data-pair-page="-1" '+(mobileStart===0?'disabled':'')+'>Previous</button><span>Countries '+(mobileStart+1)+'–'+(mobileStart+2)+' of '+pair.length+'</span><button data-pair-page="1" '+(mobileStart>=pair.length-2?'disabled':'')+'>Next</button></div>':'';
    const body=measureRows(shown,visible)+(category==='Faith & community'?compareText(shown):'');
    $('#detail').innerHTML='<a class="breadcrumb" href="#home">'+icon('left')+'World map</a><div class="compare-heading"><div><h1>Compare family life</h1><p class="subdek">Choose up to four places. Each value includes its observation year.</p></div>'+(pair.length<4?'<button class="btn plain-btn" data-find="add">+ Add a country</button>':'')+'</div>'+
      '<div class="category-tabs" aria-label="Comparison topics" role="group">'+groups.map(g=>'<button data-category="'+escape(g)+'" aria-pressed="'+(category===g)+'">'+escape(g)+'</button>').join('')+'</div>'+
      '<div class="comparison-sheet" style="--n:'+shown.length+'"><div class="family-sticky">'+pager+'<div class="value-grid">'+shown.map(id=>{const i=pair.indexOf(id);
        const c=byId[id];return '<div class="pair-slot"><button data-find="pair-'+i+'" class="choose-country" aria-label="Change '+placeName(c)+'"><small>'+escape(c.iso3)+'</small><b>'+placeName(c)+'</b>'+icon('down')+'</button>'+(pair.length>2?'<button class="remove-country" data-remove="'+i+'" aria-label="Remove '+placeName(c)+' from comparison">'+icon('close')+'</button>':'')+'</div>';
      }).join('')+'</div></div>'+body+'</div>'+
      (prompts[category]?'<div class="local-check"><h3>Check locally</h3><p>'+escape(prompts[category])+'</p></div>':'<p class="compare-note">National averages are a starting point. School admission, visa eligibility and healthcare coverage can differ by city and residence status.</p>')+
      '<div class="compare-guides">'+pair.map(id=>'<a class="inline-action" href="#country/'+id+'">'+escape(byId[id].name)+' profile</a>').join('')+'</div>';
  }
  function renderProfile(c){
    const g=guide[c.id],pic=img[c.id],other=c.id==='fr'?'dz':'fr';
    const local=g?'<hr class="section-rule"><div class="profile-content"><div><h2>Daily life in '+escape(g.city)+'</h2><p class="subdek">'+escape(g.intro)+'</p>'+[['prayer','Prayer spaces'],['food','Halal food'],['family','Family & community'],['language','Language']].map(([k,l])=>'<div class="fact-row"><div>'+icon(k)+'</div><div><h3>'+l+'</h3><p>'+escape(g[k])+'</p></div></div>').join('')+'</div><aside><div class="tip"><h3>Before you move</h3><p>'+escape(g.tip)+'</p></div><div class="source-block"><h3>Local sources</h3>'+sources(g)+'</div></aside></div>':'';
    const head='<div><div class="meta-line">'+escape(c.region)+'</div><h1>'+placeName(c)+'</h1><div class="profile-actions"><a class="btn dark" href="#compare/'+c.id+'/'+other+'">'+icon('compare')+'Compare this country</a>'+saveButton(c)+'</div></div>';
    $('#detail').innerHTML=crumb()+'<article><div class="'+(pic?'profile-hero':'profile-head')+'">'+head+(pic?'<img class="profile-img" src="'+asset('assets/'+pic+'.webp')+'" alt="'+escape(window.PHOTOS[pic].alt)+'">':'')+'</div><div class="profile-stats">'+['share','prices','uhc','dpt'].map(key=>'<div><small>'+escape(names[key])+'</small><b>'+escape(format(c,key,true))+'</b><span>'+escape(measures[key].unit)+' · '+(c.d[key]?.[1]||'No observation')+'</span></div>').join('')+'</div>'+local+'<hr class="section-rule"><h2 class="profile-data-title">National indicators</h2>'+measureRows([c.id],window.MEASURES.map(m=>m.key))+'</article>';
  }
  function renderAbout(){
    $('#detail').innerHTML='<a class="breadcrumb" href="#home">'+icon('left')+'World map</a><article class="about"><h1>Methods &amp; sources</h1><p>The atlas covers the 201 countries and territories in Pew Research Center’s religious composition dataset. National indicators describe residents as a whole. The 21 city guides use local sources for everyday questions about prayer, food, family and language.</p><h2>Dates and missing data</h2><p>Religious affiliation uses Pew’s 2010 and 2020 estimates, based on censuses, surveys and demographic modelling. Counts are rounded to 10,000 and percentages to one decimal. Upper and lower bounds are kept as published. Rankings include only numeric values.</p><p>Household prices, internet, urban population and life expectancy use 2024. Other family indicators use each country’s most recent observation between 2018 and 2024. Missing observations are shown as “No data.” National averages cannot determine a specific family’s benefits, insurance eligibility or monthly budget.</p><h2>Indicator sources</h2>'+window.MEASURES.map(m=>'<details><summary>'+escape(m.name)+'</summary><p>'+escape(m.description)+'</p><a class="credit-link" href="'+escape(m.url)+'" target="_blank" rel="noopener">'+escape(m.source)+'</a></details>').join('')+
      '<h2>Map and city guides</h2><p>The map uses Natural Earth country boundaries in the Equal Earth projection. Small territories can be found through country search. Regions follow Pew’s classification.</p><a class="credit-link" target="_blank" rel="noopener" href="https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/">Natural Earth · Map source</a>'+Object.values(guide).sort((a,b)=>a.name.localeCompare(b.name)).map(g=>'<details><summary>'+escape(g.city)+', '+escape(g.name)+'</summary>'+sources(g)+'</details>').join('')+'<div class="source-block"><a href="photo-credits.html" class="photo-credits">Photography credits and licences</a></div></article>';
  }
  function toggleMenu(open){$('#mobile-nav').hidden=!open;const b=$('.menu-btn');b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-label',open?'Close navigation':'Open navigation');b.innerHTML=icon(open?'close':'menu');}
  function route(initial=false){
    const [part,...tokens]=location.hash.slice(1).split('/');view=['saved','compare','about'].includes(part)?part:part==='country'&&byId[tokens[0]]?'country':'home';
    $('#home').hidden=view!=='home';$('#detail').hidden=view==='home';toggleMenu(false);
    if(view==='compare'){const ids=[...new Set(tokens.filter(id=>byId[id]))].slice(0,4);if(ids.length>=2)pair=ids;
      const group=tokens.find(t=>t.startsWith('topic-'));if(group){const g=groups.find(g=>slug(g)===group.substring(6));if(g)category=g;}renderCompare();}
    if(view==='country')renderProfile(byId[tokens[0]]);
    if(view==='saved')renderSaved();if(view==='about')renderAbout();
    syncSaved();const page=view==='home'&&part==='atlas'?'atlas':view==='country'?'atlas':view;
    document.querySelectorAll('.desktop-nav a,.saved-nav').forEach(a=>{if(a.hash==='#'+page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    document.title=(view==='country'?byId[tokens[0]].name:view==='home'?'Muslim family life around the world':view==='compare'?'Compare family life':view==='saved'?'Saved places':'Methods & sources')+' | Sakinah Atlas';
    requestAnimationFrame(()=>{if(view==='home'&&['atlas','rankings'].includes(part)){const n=document.getElementById(part);n.scrollIntoView({behavior:'instant'});if(!initial){n.tabIndex=-1;n.focus({preventScroll:true});}}
      else if(!initial||location.hash){window.scrollTo({top:0,behavior:'instant'});if(!initial)$('#main').focus({preventScroll:true});}});
  }
  function slug(s){return s.toLowerCase().replace(/[^a-z]+/g,'-').replace(/-$/,'');}
  function recordPair(){history.replaceState(null,'','#compare/'+pair.join('/')+'/topic-'+slug(category));}
  function showPicker(action){
    pickerAction=action;
    $('#picker-title').textContent=action==='add'?'Add a country':action.startsWith('pair-')?'Change country':'Find a country';
    $('#picker-input').value='';renderPicker();$('#picker').showModal();$('#picker-input').focus();
  }
  function renderPicker(){
    const q=$('#picker-input').value;
    const rows=list.filter(c=>match(c,q)&&(pickerAction!=='add'||!pair.includes(c.id)));
    $('#picker-list').innerHTML=rows.length?rows.map(c=>'<button data-picked="'+c.id+'"><b>'+placeName(c)+'</b><small>'+escape(c.region)+'</small></button>').join(''):'<p class="no-results">No places match your search.</p>';
  }
  function pick(id){
    const action=pickerAction;$('#picker').close();
    if(action==='profile'){location.hash='country/'+id;return;}
    if(action==='map'){window.dispatchEvent(new CustomEvent('atlas:place',{detail:id}));return;}
    if(action==='add'&&!pair.includes(id)&&pair.length<4){pair.push(id);mobileStart=pair.length-2;}
    else if(action.startsWith('pair-')){const i=Number(action.slice(5)),existing=pair.indexOf(id);if(existing>=0)pair[existing]=pair[i];pair[i]=id;}
    recordPair();renderCompare();$('[data-find="pair-'+pair.indexOf(id)+'"]')?.focus({preventScroll:true});
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!$('#mobile-nav').hidden&&!e.composedPath().includes($('.mast')))toggleMenu(false);
    if(b?.matches('.menu-btn'))toggleMenu($('#mobile-nav').hidden);
    else if(b?.dataset.find)showPicker(b.dataset.find);
    else if(b?.dataset.picked)pick(b.dataset.picked);
    else if(b?.dataset.save)save(b.dataset.save);
    else if(b?.dataset.pairPage){mobileStart+=Number(b.dataset.pairPage);renderCompare();}
    else if(b?.dataset.category){category=b.dataset.category;recordPair();renderCompare();Array.from(document.querySelectorAll('[data-category]')).find(n=>n.dataset.category===category)?.focus({preventScroll:true});}
    else if(b?.dataset.remove!==undefined&&pair.length>2){pair.splice(Number(b.dataset.remove),1);recordPair();renderCompare();}
    else if(b?.id==='picker-close')$('#picker').close();
    else if(b?.id==='dir-more'){pageSize+=24;renderDirectory();}
    if(e.target===$('#picker')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}
    const a=e.target.closest('a');if(a?.getAttribute('href')?.startsWith('#')&&a.hash===location.hash){e.preventDefault();route();}
  });
  $('#picker-input').addEventListener('input',renderPicker);
  $('#picker-input').addEventListener('keydown',e=>{if(['ArrowDown','Enter'].includes(e.key)){e.preventDefault();const first=$('#picker-list button');if(e.key==='Enter')first?.click();else first?.focus();}});
  $('#picker-list').addEventListener('keydown',e=>{const b=e.target.closest('button');if(!b)return;if(e.key==='ArrowDown'){e.preventDefault();b.nextElementSibling?.focus();}if(e.key==='ArrowUp'){e.preventDefault();(b.previousElementSibling||$('#picker-input')).focus();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#mobile-nav').hidden){toggleMenu(false);$('.menu-btn').focus();}});
  matchMedia('(max-width:680px)').addEventListener('change',()=>{if(view==='compare')renderCompare();});
  window.addEventListener('hashchange',()=>route());
  window.addEventListener('storage',e=>{if(e.key==='sakinah.saved.v1'){readSaved();if(view==='saved')renderSaved();syncSaved();}});
  $('#dir-region').innerHTML=regionOptions;
  [$('#dir-search'),$('#dir-region'),$('#guides-only')].forEach(n=>n.addEventListener('input',()=>{pageSize=12;renderDirectory();}));
  document.querySelectorAll('[data-icon]').forEach(n=>n.innerHTML=icon(n.dataset.icon));
  window.Atlas={list,byId,measures,regions,regionOptions,format,unit,escape,icon,guide};
  readSaved();renderDirectory();route(true);
})();
