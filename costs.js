(() => {
  'use strict';

  const cities = window.CITY_PRICES;
  const countries = new Map(window.WORLD.map(country => [country.id, country]));
  const rows = [
    ['total', 'Family budget', 'Family of four · month, including rent'],
    ['rent', 'Rent & utilities', 'Family of four · month'],
    ['food', 'Food', 'Family of four · month'],
    ['transport', 'Transport', 'Family of four · month'],
    ['flat', 'Three-bedroom apartment', 'City centre · 80 m² · month'],
    ['preschool', 'Daycare or preschool', 'One child · month'],
    ['milk', 'Milk', '1 litre'],
    ['rice', 'Rice', '1 kilogram'],
    ['eggs', 'Eggs', '12 eggs'],
    ['fare', 'Public transport', 'One local ticket']
  ];
  const homeMetrics = ['total','rent','food','preschool','milk','rice','eggs','fare'];
  const usd = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', maximumFractionDigits:0});
  const smallUsd = new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'});
  const money = (value, key) => ['milk','rice','eggs','fare'].includes(key) ? smallUsd.format(value) : usd.format(value);
  const dateFormat = new Intl.DateTimeFormat('en', {month:'short',year:'numeric',timeZone:'UTC'});
  const date = snapshot => dateFormat.format(new Date(snapshot.date+'T12:00:00Z'));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sourceLink = city => '<a class="source" href="'+esc(city.url)+'" target="_blank" rel="noopener">'+esc(city.city)+' ↗</a>';
  const comparison = ids => '#compare/'+ids.join('/')+'/topic-living-costs';
  const selections = ['dz','id','fr'];
  let metric = 'total';

  function mount() {
    const panel = document.getElementById('budget');
    const options = rows.filter(([key]) => homeMetrics.includes(key)).map(([key,title]) =>
      '<option value="'+key+'">'+esc(title)+'</option>').join('');
    panel.innerHTML = `
      <div class="budget-intro">
        <div class="edition-date"><b>Cost of living</b><time datetime="2026-06">June 2026</time></div>
        <h1 id="budget-heading"></h1>
        <a class="story-more" href="#compare">Compare countries <span aria-hidden="true">→</span></a>
      </div>
      <div class="budget-chart">
        <div class="cost-controls"><label class="sr" for="cost-metric">Compare prices</label><select id="cost-metric">${options}</select><span>USD</span></div>
        <h2 id="cost-title"></h2>
        <div id="cost-chart-rows"></div>
        <div class="budget-legend" id="cost-legend"><span><i></i>Housing &amp; utilities</span><span><i></i>Food</span><span><i></i>Transport</span><span><i></i>Other</span></div>
        <div class="budget-source" id="cost-source"></div>
        <a class="budget-link" id="cost-compare">Compare these cities <span aria-hidden="true">→</span></a>
      </div>`;
    panel.querySelector('#cost-metric').addEventListener('change', event => {
      metric = event.target.value;
      drawChart();
    });
    drawChart();
  }

  function changeCity(index, id) {
    const previous = selections.indexOf(id);
    if (previous >= 0) selections[previous] = selections[index];
    selections[index] = id;
    drawChart();
    document.querySelector('[data-find="city-'+index+'"]').focus({preventScroll:true});
  }

  function drawChart() {
    const selected = selections.map(id => cities[id]);
    const largest = Math.max(...selected.map(city => city[metric] || 0), 0.01);
    const monthly = metric==='total';
    const [,title,unit] = rows.find(([key])=>key===metric);
    const subjects = {
      total:'A month for four costs', rent:'Monthly rent and utilities for four cost', food:'A month of food for four costs',
      preschool:'A month of preschool costs', milk:'A litre of milk costs', rice:'A kilo of rice costs',
      eggs:'A dozen eggs cost', fare:'A local transport ticket costs'
    };
    const ordered = selected.filter(city => city[metric]!=null).sort((a,b) => a[metric]-b[metric]);
    const first = ordered[0], last = ordered[ordered.length-1];
    document.getElementById('budget-heading').textContent = first && first!==last
      ? subjects[metric]+' '+money(first[metric],metric)+' in '+first.city+' and '+money(last[metric],metric)+' in '+last.city+'.'
      : title+' in the selected cities';
    document.getElementById('cost-title').textContent = monthly ? 'Monthly estimate for a family of four, including rent' : title+' · '+unit;
    document.getElementById('cost-legend').hidden = !monthly;
    document.getElementById('cost-chart-rows').innerHTML = selected.map((city, index) => {
      const value = city[metric];
      const segments = monthly ? [city.rent,city.food,city.transport,Math.max(0,value-city.rent-city.food-city.transport)] : [value];
      const trigger = '<button type="button" class="city-trigger" data-find="city-'+index+'" data-city-id="'+city.id+'" aria-haspopup="dialog" aria-controls="picker" aria-label="Change city '+(index+1)+', '+esc(city.city)+'">'+esc(city.city)+window.Atlas.icon('down')+'</button>';
      return '<div class="cost-bar-row"><div class="cost-bar-head">'+trigger+'<strong>'+ (value==null?'No data':money(value,metric))+'</strong></div><div class="cost-track" aria-hidden="true">'+segments.map((v,i) => '<i class="seg-'+i+'" style="width:'+(100*v/largest).toFixed(3)+'%"></i>').join('')+'</div></div>';
    }).join('');
    document.getElementById('cost-source').innerHTML = 'Livingcost.org estimates · '+[...new Set(selected.map(date))].join(' / ')+'<br>'+selected.map(sourceLink).join(' &nbsp; ');
    document.getElementById('cost-compare').href = comparison(selections);
  }

  function compare(ids) {
    const selected = ids.map(id => cities[id]);
    if (!selected.some(Boolean)) return '<div class="costs-section-title"><h2>National cost indicators</h2><p>City samples are available in 21 guides. National observations for these places appear below.</p></div>';
    const cityRows = rows.map(([key,title,unit]) =>
      '<section class="measure-row price-row"><div class="measure-label"><h3>'+esc(title)+'</h3><span>'+esc(unit)+'</span></div><div class="value-grid" style="--n:'+ids.length+'">'+selected.map((c,i) =>
        '<div class="measure-cell"><span class="sr">'+esc(countries.get(ids[i]).name)+'. </span><b>'+(c?.[key]!=null?money(c[key],key):'—')+'</b><small>'+(c ? esc(c.city)+' · '+date(c) : 'No city sample')+'</small></div>').join('')+'</div></section>'
    ).join('');
    return '<div class="costs-section-title"><h2>City prices</h2><p>Estimates in US dollars. Childcare and individual purchases are shown separately for reference.</p></div>'+cityRows+
      '<p class="budget-source">Source: Livingcost.org · '+selected.filter(Boolean).map(sourceLink).join(' &nbsp; ')+'</p><div class="costs-section-title"><h2>National cost indicators</h2></div>';
  }

  function profile(id, other) {
    const city = cities[id];
    if (!city) return '';
    return '<section class="profile-budget"><div><h2>Living costs in '+esc(city.city)+'</h2><p>Family of four · estimated monthly budget in USD · '+date(city)+'</p></div><strong>'+money(city.total,'total')+'</strong><div><a class="budget-link" href="'+comparison([id,other])+'">Compare rent, food and childcare →</a></div><div class="budget-source">'+sourceLink(city)+'</div></section>';
  }

  window.FamilyCosts = {mount, compare, profile, changeCity};
})();
