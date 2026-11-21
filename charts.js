(() => {
  'use strict';
  const {list,byId,measures,regionOptions,format,escape,guide}=window.Atlas;
  const $=s=>document.querySelector(s),ns='http://www.w3.org/2000/svg';
  const byIso=Object.fromEntries(list.map(c=>[c.iso3,c]));
  const geography=window.LAND;
  const palettes={
    share:['#25403f','#365e55','#52836e','#7fb695','#b6dca4','#f0d78a'],
    uhc:['#284441','#396456','#608768','#97b985','#c6dba3','#f0dc91'],
    prices:['#294641','#446e60','#719481','#9ab2a2','#d1c393','#e4a976']
  };
  const modes={
    prices:{label:'Household prices',title:'Household price levels',bins:[30,45,60,75,100],legend:['<30','30–<45','45–<60','60–<75','75–<100','100+'],source:'World Bank',note:'Household consumption price level · U.S. = 100 · 2024'},
    uhc:{label:'Healthcare',title:'Coverage of essential health services',bins:[40,50,60,70,80],legend:['<40','40–<50','50–<60','60–<70','70–<80','80+'],source:'WHO & World Bank',note:'UHC service coverage index · 0–100 · latest available, 2018–2024'},
    share:{label:'Muslim share',title:'Muslim share of the population',bins:[1,10,50,75,95],legend:['<1%','1–<10%','10–<50%','50–<75%','75–<95%','95%+'],source:'Pew Research Center',note:'Share of residents identifying as Muslim · 2020'}
  };
  let mode='prices',selected=null,rankPage=0;
  const svg=$('#map-svg');
  function numeric(c,key){
    const row=c?.d[key];if(!row)return null;
    if(row[0]!=null)return row[0];
    if(row[2]?.startsWith('<'))return 0;
    if(row[2]?.startsWith('>'))return Number(row[2].replace(/[^\d.]/g,''))+.001;
    return null;
  }
  function buildMap(){
    const defs=document.createElementNS(ns,'defs');
    defs.innerHTML='<pattern id="unknown-fill" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="#4a615c" stroke-width=".9"/></pattern>';
    svg.append(defs);
    for(const f of geography){
      const c=byIso[f.iso3],p=document.createElementNS(ns,'path');
      p.setAttribute('d',f.d);p.setAttribute('fill-rule','evenodd');p.setAttribute('class','land');
      if(c)p.dataset.place=c.id;
      const title=document.createElementNS(ns,'title');title.textContent=c?.name||f.name;p.append(title);svg.append(p);
    }
    renderMap();
  }
  function renderMap(){
    const settings=modes[mode];
    $('#map-title').textContent=settings.title;$('#map-meta').textContent=settings.note;
    svg.setAttribute('aria-label',settings.title+'. '+settings.note+'. All 201 places are available in country search.');
    $('#map-source').href=measures[mode].url;$('#map-source').textContent=settings.source;
    for(const p of svg.querySelectorAll('.land')){
      const c=byId[p.dataset.place],n=numeric(c,mode);
      const bin=n==null?-1:settings.bins.filter(b=>n>=b).length;
      p.setAttribute('fill',bin<0?'url(#unknown-fill)':palettes[mode][bin]);
      p.classList.toggle('chosen',!!c&&selected===c.id);
      if(c)p.firstElementChild.textContent=c.name+' · '+format(c,mode);
    }
    $('#map-legend').innerHTML=settings.legend.map((label,i)=>'<span><i style="background:'+palettes[mode][i]+'"></i>'+escape(label)+'</span>').join('')+'<span><i class="no-color"></i>No data</span>';
    $('#map-modes').innerHTML=Object.entries(modes).map(([key,m])=>'<button data-layer="'+key+'" aria-pressed="'+(key===mode)+'">'+escape(m.label)+'</button>').join('');
    drawSide();
  }
  function drawSide(){
    const side=$('#map-side');
    if(selected){
      const c=byId[selected],other=selected==='fr'?'dz':'fr',v=format(c,mode,true);
      side.innerHTML='<div class="map-selection"><div class="inspector-line"><small>'+escape(c.region)+'</small><button data-clear-map aria-label="Clear country selection">×</button></div><h3>'+escape(c.name)+'</h3><b class="map-value">'+escape(v)+'</b><p>'+escape(modes[mode].label)+(c.d[mode]?' · '+c.d[mode][1]:'')+'</p><div class="map-links"><a href="#country/'+c.id+'">Country profile</a><a href="#compare/'+c.id+'/'+other+'">Compare</a></div></div>';
      return;
    }
    const metric=mode==='share'?'people':mode;
    const best=list.filter(c=>c.d[metric]?.[0]!=null).sort((a,b)=>b.d[metric][0]-a.d[metric][0]||a.name.localeCompare(b.name)).slice(0,5);
    side.innerHTML='<h3>'+(mode==='share'?'Largest Muslim communities':mode==='uhc'?'Highest coverage index':'Highest price levels')+'</h3><div class="side-list">'+best.map(c=>'<button data-map-place="'+c.id+'"><span>'+escape(c.name)+'</span><b>'+escape(format(c,metric,true))+'</b></button>').join('')+'</div><a class="full-ranking" href="#rankings" data-rank-jump="'+metric+'">Explore rankings</a>';
  }
  function selectPlace(id){if(!byId[id])return;selected=id;renderMap();$('#map-hint').hidden=true;}
  $('#worldstage').addEventListener('click',e=>{
    const layer=e.target.closest('[data-layer]'),place=e.target.closest('[data-place],[data-map-place]'),jump=e.target.closest('[data-rank-jump]');
    if(layer){mode=layer.dataset.layer;renderMap();$('#map-modes [data-layer="'+mode+'"]').focus({preventScroll:true});}
    else if(place){selectPlace(place.dataset.place||place.dataset.mapPlace);}
    else if(e.target.closest('[data-clear-map]')){selected=null;renderMap();$('.find-country').focus({preventScroll:true});}
    else if(jump){$('#rank-metric').value=jump.dataset.rankJump;rankPage=0;drawRanking();}
  });
  svg.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;const c=byId[e.target.closest('[data-place]')?.dataset.place],h=$('#map-hint');if(!c){h.hidden=true;return;}
    const r=$('#map-frame').getBoundingClientRect();h.textContent=c.name+' · '+format(c,mode,true);h.hidden=false;
    h.style.left=Math.max(0,Math.min(r.width-h.offsetWidth,e.clientX-r.left+9))+'px';
    h.style.top=Math.min(r.height-h.offsetHeight,Math.max(0,e.clientY-r.top+12))+'px';
  });
  svg.addEventListener('pointerleave',()=>$('#map-hint').hidden=true);
  window.addEventListener('atlas:place',e=>selectPlace(e.detail));
  const metricPicker=$('#rank-metric');
  metricPicker.innerHTML=window.MEASURES.map(m=>'<option value="'+m.key+'">'+escape(m.name)+'</option>').join('');metricPicker.value='prices';
  $('#rank-region').innerHTML=regionOptions;
  function drawRanking(){
    const key=metricPicker.value,region=$('#rank-region').value,desc=$('#rank-order').value==='desc',m=measures[key];
    const available=list.filter(c=>(!region||c.region===region)&&c.d[key]?.[0]!=null);
    const sorted=available.sort((a,b)=>(a.d[key][0]-b.d[key][0])*(desc?-1:1)||a.name.localeCompare(b.name));
    const total=sorted.length,per=7,maxPages=Math.max(1,Math.ceil(total/per));rankPage=Math.max(0,Math.min(rankPage,maxPages-1));
    const slice=sorted.slice(rankPage*per,(rankPage+1)*per);
    const max=(m.unit==='%'||key==='uhc')?100:Math.max(1,...sorted.map(c=>c.d[key][0]));
    $('#rank-title').textContent=m.name;$('#rank-unit').textContent=m.unit;
    $('#rank-rows').innerHTML=slice.map((c,i)=>'<a class="ranking-row" href="#country/'+c.id+'"><span class="rank-number">'+(i+rankPage*per+1)+'</span><b>'+escape(c.name)+'</b><i class="rank-track"><i style="--bar:'+Math.max(0,Math.min(100,c.d[key][0]/max*100))+'%"></i></i><span class="rank-value">'+escape(format(c,key,true))+'<small>'+c.d[key][1]+'</small></span></a>').join('')||'<p class="no-results">No numeric observations in this region.</p>';
    $('#rank-page').textContent=total?(rankPage*per+1)+'–'+Math.min(total,(rankPage+1)*per)+' of '+total:'0 places';
    $('#rank-prev').disabled=rankPage===0;$('#rank-next').disabled=rankPage>=maxPages-1;
    $('#rank-source').href=m.url;$('#rank-source').textContent=key==='people'||key==='share'?'Pew Research Center':'Indicator source';
  }
  ['#rank-metric','#rank-region','#rank-order'].forEach(id=>$(id).addEventListener('change',()=>{rankPage=0;drawRanking();}));
  $('#rank-prev').addEventListener('click',()=>{rankPage--;drawRanking();});$('#rank-next').addEventListener('click',()=>{rankPage++;drawRanking();});
  function healthPlot(){
    const covered=list.filter(c=>c.d.prices?.[0]!=null&&c.d.uhc?.[0]!=null);
    const regional={'Asia-Pacific':'#428a78','Europe':'#626eac','Latin America-Caribbean':'#af7657','Middle East-North Africa':'#a67522','North America':'#3b81af','Sub-Saharan Africa':'#aa668b'};
    const x=n=>42+n*2.9,y=n=>202-n*1.7;
    const grid=[0,25,50,75,100].map(v=>'<line x1="42" x2="423" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="36" y="'+(y(v)+4)+'" text-anchor="end">'+v+'</text>').join('')+[0,25,50,75,100,125].map(v=>'<text x="'+x(v)+'" y="222" text-anchor="middle">'+v+'</text>').join('');
    const dots=covered.map(c=>'<circle class="country-dot" data-dot="'+c.id+'" cx="'+x(c.d.prices[0])+'" cy="'+y(c.d.uhc[0])+'" r="4.2" fill="'+regional[c.region]+'"><title>'+escape(c.name)+' · Price level '+format(c,'prices')+' · Health coverage '+format(c,'uhc')+'/100</title></circle>').join('');
    $('#scatter').innerHTML='<div class="scatter-text"><h2>Healthcare coverage and household prices</h2><p>Each dot represents one of the '+covered.length+' places with both observations. Move right for higher household prices and up for broader coverage of essential health services.</p><label class="scatter-label">Highlight a country<select id="dot-pick">'+covered.map(c=>'<option value="'+c.id+'"'+(c.id==='dz'?' selected':'')+'>'+escape(c.name)+'</option>').join('')+'</select></label><p id="dot-note"></p></div><figure><figcaption>Health service coverage <span>· index, 2023</span></figcaption><svg viewBox="0 0 440 232" role="img" aria-label="Scatterplot of household price levels and essential healthcare coverage across '+covered.length+' places. Select a country to read its values."><g class="graph-grid">'+grid+'</g>'+dots+'<circle id="dot-ring" r="7.5" fill="none" stroke="#132a25" stroke-width="2" pointer-events="none"/></svg><div class="axis-title">Household price level <span>· U.S. = 100, 2024</span></div><div class="region-key">'+Object.entries(regional).map(([k,v])=>'<span><i style="background:'+v+'"></i>'+escape(k)+'</span>').join('')+'</div></figure><div class="scatter-foot"><a class="source" href="'+measures.uhc.url+'" target="_blank" rel="noopener">WHO &amp; World Bank · 2023</a> / <a class="source" href="'+measures.prices.url+'" target="_blank" rel="noopener">World Bank · 2024</a></div>';
    function highlight(id){
      const c=byId[id],ring=$('#dot-ring');$('#dot-pick').value=id;ring.setAttribute('cx',x(c.d.prices[0]));ring.setAttribute('cy',y(c.d.uhc[0]));
      $('#dot-note').innerHTML='<strong>'+escape(c.name)+'</strong> · Health coverage '+format(c,'uhc')+'/100 · Price level '+format(c,'prices')+'. <a class="source" href="#country/'+c.id+'">Country profile</a>';
    }
    $('#dot-pick').addEventListener('change',e=>highlight(e.target.value));$('#scatter svg').addEventListener('click',e=>{const dot=e.target.closest('[data-dot]');if(dot)highlight(dot.dataset.dot);});highlight('dz');
  }
  buildMap();drawRanking();healthPlot();
})();
