(function(){
  'use strict';

  const DEFAULTS = {
    heading: {
      eyebrow: 'zwei besondere Abende über den Dächern von Paris',
      title: 'Unsere Dinner mit Aussicht',
      description: 'Zwei reservierte Abende, zwei besondere Ausblicke und ganz viel Zeit, unser Jubiläumswochenende gemeinsam zu genießen.'
    },
    entries: [
      {
        id: 'perruche',
        weekday: 'Freitag',
        date: '31.07.2026',
        time: '19:00',
        name: 'Perruche Rooftop',
        description: 'Unser erster Pariser Abend über den Dächern der Stadt: mediterranes Dinner, goldene Abendsonne und ein besonderer Auftakt für unser Jubiläumswochenende.',
        symbol: '🌇',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Perruche%20Rooftop%20Restaurant%20Paris',
        menu: {
          enabled: true,
          key: 'perruche',
          label: 'Speisekarte',
          original: './carte-food-perruche-summer.pdf',
          pages: ['./menu-perruche-1.jpg','./menu-perruche-2.jpg','./menu-perruche-3.jpg','./menu-perruche-4.jpg','./menu-perruche-5.jpg','./menu-perruche-6.jpg']
        }
      },
      {
        id: 'elio',
        weekday: 'Sonntag',
        date: '02.08.2026',
        time: '17:30',
        name: 'Elio',
        description: 'Zum Abschluss noch einmal Paris ganz bewusst genießen: gemeinsam essen, den Blick Richtung Eiffelturm schweifen lassen und unsere Reise langsam ausklingen lassen.',
        symbol: '🗼',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Elio%20Restaurant%20Paris%20Eiffelturm',
        menu: {
          enabled: true,
          key: 'elio',
          label: 'Speisekarte',
          original: './Elio.pdf',
          pages: ['./menu-elio-1.webp','./menu-elio-2.webp','./menu-elio-3.webp','./menu-elio-4.webp']
        }
      }
    ]
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = value => {
    const url = String(value || '').trim();
    return /^(https?:|\.\/|\/)/i.test(url) ? url : '#';
  };

  function mergeModel(content){
    const source = content?.data || content?.model || content || {};
    const model = clone(DEFAULTS);
    if(source.heading && typeof source.heading === 'object') model.heading = {...model.heading, ...source.heading};
    if(Array.isArray(source.entries)) model.entries = source.entries.map((entry,index)=>({
      ...clone(DEFAULTS.entries[index] || {}),
      ...entry,
      id: String(entry?.id || `restaurant-${index+1}`),
      menu: {...clone(DEFAULTS.entries[index]?.menu || {}), ...(entry?.menu || {})}
    }));
    return model;
  }

  function renderEntry(entry,index){
    const classes = ['restaurant-card','motion-card','motion-shine',entry.id || `restaurant-${index+1}`].join(' ');
    const menu = entry.menu || {};
    return `
      <article class="${esc(classes)}" data-restaurant-id="${esc(entry.id)}" data-luvia-repeatable-item="restaurants.entries.${index}">
        <div class="restaurant-card-header">
          <span class="restaurant-calendar-icon" aria-hidden="true">📅</span>
          <div class="restaurant-date-block">
            <span class="restaurant-weekday" data-luvia-property="weekday">${esc(entry.weekday)}</span>
            <span class="restaurant-date-value" data-luvia-property="date">${esc(entry.date)}</span>
          </div>
          <span class="restaurant-header-line" aria-hidden="true"></span>
        </div>
        <div class="restaurant-card-body">
          <div class="restaurant-symbol" aria-hidden="true" data-luvia-property="symbol">${esc(entry.symbol || '🍽️')}</div>
          <h3 data-luvia-property="name">${esc(entry.name)}</h3>
          <p class="restaurant-time" data-luvia-property="time">Reserviert für ${esc(entry.time)} Uhr</p>
          <p class="restaurant-copy" data-luvia-property="description">${esc(entry.description)}</p>
          ${menu.enabled !== false ? `<div class="restaurant-tools"><button type="button" class="premium-button" data-open-menu="${esc(menu.key || entry.id)}" data-luvia-property="menu.label">📖 ${esc(menu.label || 'Speisekarte')}</button></div>` : ''}
          ${entry.mapsUrl ? `<a class="restaurant-link" href="${esc(safeUrl(entry.mapsUrl))}" target="_blank" rel="noopener" data-luvia-property="mapsUrl">In Google Maps öffnen <span aria-hidden="true">↗</span></a>` : ''}
        </div>
      </article>`;
  }

  function render(instance,{trip}){
    const root = instance.roots[0];
    if(!root) return;
    const content = trip?.moduleContent?.restaurants || {};
    const model = mergeModel(content);
    instance.model = model;
    root.innerHTML = `
      <div class="highlight-heading" data-luvia-config-group="heading">
        <span class="eyebrow" data-luvia-property="heading.eyebrow">${esc(model.heading.eyebrow)}</span>
        <h2 id="besondere-momente" data-luvia-property="heading.title">${esc(model.heading.title)}</h2>
        <p data-luvia-property="heading.description">${esc(model.heading.description)}</p>
      </div>
      <div class="restaurant-grid" data-luvia-repeatable="entries">
        ${model.entries.map(renderEntry).join('')}
      </div>`;
    root.setAttribute('aria-labelledby','besondere-momente');
    root.dataset.luviaRendered = 'restaurants-v2';
    root.classList.add('luvia-restaurants-v2');
  }

  function mount(instance){
    const root = instance.roots[0];
    if(!root || root.dataset.luviaRestaurantsMounted === 'true') return;
    root.dataset.luviaRestaurantsMounted = 'true';
    const onClick = event => {
      const button = event.target.closest('[data-open-menu]');
      if(!button || !root.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      const key = button.dataset.openMenu;
      if(window.LuviaRestaurantMenus?.open){
        window.LuviaRestaurantMenus.open(key);
      }else{
        const entry = instance.model?.entries?.find(item => (item.menu?.key || item.id) === key);
        const href = entry?.menu?.original;
        if(href) window.open(href,'_blank','noopener');
      }
    };
    root.addEventListener('click',onClick);
    instance.cleanupRestaurants = () => root.removeEventListener('click',onClick);
  }

  function unmount(instance){
    instance.cleanupRestaurants?.();
    delete instance.cleanupRestaurants;
    if(instance.roots[0]) delete instance.roots[0].dataset.luviaRestaurantsMounted;
  }

  window.LuviaModules?.register({
    id:'restaurants',
    order:70,
    group:'Planung',
    icon:'🍽️',
    title:'Restaurants & Reservierungen',
    description:'Reservierte Restaurants mit Uhrzeit, Besonderheiten, Speisekarte und Maps.',
    selectors:['#restaurants-module'],
    version:2,
    defaults:DEFAULTS,
    schema:{
      title:'Restaurants',
      onboarding:{
        steps:[
          {id:'intro',title:'Überschrift',fields:['heading.eyebrow','heading.title','heading.description']},
          {id:'entries',title:'Restaurants hinzufügen',repeatable:'entries',min:0,max:20,fields:['name','weekday','date','time','description','symbol']},
          {id:'links',title:'Links & Speisekarten',repeatable:'entries',fields:['mapsUrl','menu.enabled','menu.label','menu.original','menu.pages']}
        ]
      },
      dataShape:{
        heading:{eyebrow:'string',title:'string',description:'string'},
        entries:[{id:'string',name:'string',weekday:'string',date:'string',time:'string',description:'string',symbol:'string',mapsUrl:'url',menu:{enabled:'boolean',key:'string',label:'string',original:'url',pages:'url[]'}}]
      },
      automation:{
        destinationFields:['heading.eyebrow','heading.description'],
        dateFields:['entries[].weekday','entries[].date'],
        userEditable:['heading','entries'],
        generated:['entries[].weekday']
      }
    },
    render,
    mount,
    unmount
  });
})();
