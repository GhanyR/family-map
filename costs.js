(() => {
  'use strict';

  const cities = window.CITY_PRICES;
  const countries = new Map(window.WORLD.map(country => [country.id, country]));
  const choices = Object.values(cities).sort((a, b) => a.city.localeCompare(b.city, 'en'));
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
    panel.innerHTML = '<div class="budget-intro"><h2 id="budget-heading">What does family life cost?</h2><p>Compare a month’s budget for a family of four, or check the price of an everyday purchase.</p><label for="cost-metric">Compare prices</label><select id="cost-metric">'+rows.filter(([key]) => homeMetrics.includes(key)).map(([key,title,unit]) => '<option value="'+key+'">'+esc(title)+(key==='total'?' · monthly':' · '+esc(unit.split(' · ').pop()))+'</option>').join('')+'</select></div><div class="budget-chart"><div class="budget-chart-title"><h3 id="cost-title"></h3><span>USD</span></div><div id="cost-chart-rows"></div><div class="budget-legend" id="cost-legend"><span><i></i>Housing &amp; utilities</span><span><i></i>Food</span><span><i></i>Transport</span><span><i></i>Other</span></div><div class="budget-source" id="cost-source"></div><a class="budget-link" id="cost-compare">Compare these cities <span aria-hidden="true">→</span></a></div>';
    panel.querySelector('#cost-metric').addEventListener('change', event => {
      metric = event.target.value;
      drawChart();
    });
    panel.querySelector('#cost-chart-rows').addEventListener('change', event => {
      const select = event.target.closest('select[data-city-slot]');
      if (!select) return;
      const index = Number(select.dataset.citySlot);
      const oldPosition = selections.indexOf(select.value);
      if (oldPosition >= 0) selections[oldPosition] = selections[index];
      selections[index] = select.value;
      drawChart();
      panel.querySelector('[data-city-slot="'+index+'"]').focus({preventScroll:true});
    });
    drawChart();
  }

  function drawChart() {
    const selected = selections.map(id => cities[id]);
    const largest = Math.max(...selected.map(city => city[metric] || 0), 0.01);
    const monthly = metric==='total';
    const [,title,unit] = rows.find(([key])=>key===metric);
    document.getElementById('cost-title').textContent = monthly ? 'Monthly family budget' : title+' · '+unit;
    document.getElementById('cost-legend').hidden = !monthly;
    document.getElementById('cost-chart-rows').innerHTML = selected.map((city, index) => {
      const value = city[metric];
      const segments = monthly ? [city.rent,city.food,city.transport,Math.max(0,value-city.rent-city.food-city.transport)] : [value];
      const options = choices.map(c => '<option value="'+c.id+'"'+(c.id===city.id?' selected':'')+'>'+esc(c.city)+'</option>').join('');
      return '<div class="cost-bar-row"><div class="cost-bar-head"><select data-city-slot="'+index+'" aria-label="City '+(index+1)+'">'+options+'</select><strong>'+ (value==null?'No data':money(value,metric))+'</strong></div><div class="cost-track" aria-hidden="true">'+segments.map((v,i) => '<i class="seg-'+i+'" style="width:'+(100*v/largest).toFixed(3)+'%"></i>').join('')+'</div></div>';
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

  window.FamilyCosts = {mount, compare, profile};
})();
