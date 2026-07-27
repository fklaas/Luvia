(function(){
  const ID_KEY='parisIdentityV1';
  const parse=(v,f)=>{try{const x=JSON.parse(v);return x==null?f:x}catch{return f}};
  const trip=parse(localStorage.getItem(ID_KEY),{})||{};
  const raw=String(trip.destination||trip.tripName||'Reiseziel').trim();
  const key=raw.toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  const profiles={
    paris:{name:'Paris',country:'Frankreich',emoji:'🇫🇷',tagline:'Lichter, Boulevards und kleine Lieblingsmomente',highlights:['Eiffelturm','Seine','Montmartre','Louvre'],language:'Französisch',quote:'Zwischen Lichtern, kleinen Cafés und großen Erinnerungen wird Paris zu eurem ganz eigenen Kapitel.'},
    rom:{name:'Rom',country:'Italien',emoji:'🇮🇹',tagline:'Antike Gassen, italienische Abende und Dolce Vita',highlights:['Kolosseum','Trevi-Brunnen','Pantheon','Trastevere'],language:'Italienisch',quote:'Alle Wege führen nach Rom – eurer führt zu neuen Erinnerungen.'},
    berlin:{name:'Berlin',country:'Deutschland',emoji:'🇩🇪',tagline:'Geschichte, Kieze und überraschend viele Lieblingsorte',highlights:['Brandenburger Tor','Museumsinsel','East Side Gallery','Tiergarten'],language:'Deutsch',quote:'Berlin ist nicht nur ein Ort – sondern tausend Geschichten, aus denen eure eigene entsteht.'},
    munchen:{name:'München',country:'Deutschland',emoji:'🇩🇪',tagline:'Altstadt, Isar und bayerische Lebensfreude',highlights:['Marienplatz','Englischer Garten','Viktualienmarkt','Nymphenburg'],language:'Deutsch',quote:'Zwischen Isar und Altstadt sammelt ihr Momente, die länger bleiben als die Reise.'},
    madrid:{name:'Madrid',country:'Spanien',emoji:'🇪🇸',tagline:'Sonnige Plätze, Kunst und lange Abende',highlights:['Plaza Mayor','Retiro-Park','Prado','Gran Vía'],language:'Spanisch',quote:'Madrid schenkt euch Sonne, lange Abende und Erinnerungen mit spanischem Rhythmus.'},
    barcelona:{name:'Barcelona',country:'Spanien',emoji:'🇪🇸',tagline:'Gaudí, Meer und mediterranes Lebensgefühl',highlights:['Sagrada Família','Park Güell','Barri Gòtic','Barceloneta'],language:'Spanisch',quote:'Zwischen Gaudí und Meeresrauschen schreibt Barcelona eure nächste Lieblingsgeschichte.'},
    london:{name:'London',country:'Vereinigtes Königreich',emoji:'🇬🇧',tagline:'Ikonen, Viertel und britischer Großstadtzauber',highlights:['Tower Bridge','Big Ben','Notting Hill','Covent Garden'],language:'Englisch',quote:'London steckt voller Wege – und einer davon wird zu eurer ganz persönlichen Erinnerung.'},
    amsterdam:{name:'Amsterdam',country:'Niederlande',emoji:'🇳🇱',tagline:'Grachten, Fahrräder und gemütliche Entdeckungen',highlights:['Grachtengürtel','Jordaan','Rijksmuseum','Vondelpark'],language:'Niederländisch',quote:'Zwischen Grachten und kleinen Brücken findet ihr die Momente, die diese Reise besonders machen.'},
    wien:{name:'Wien',country:'Österreich',emoji:'🇦🇹',tagline:'Kaffeehäuser, Prunk und entspannte Eleganz',highlights:['Schönbrunn','Stephansdom','Prater','MuseumsQuartier'],language:'Deutsch',quote:'Wien verbindet große Kulissen mit kleinen Augenblicken – genau daraus entsteht eure Reise.'},
    prag:{name:'Prag',country:'Tschechien',emoji:'🇨🇿',tagline:'Goldene Dächer, alte Gassen und romantische Ausblicke',highlights:['Karlsbrücke','Prager Burg','Altstädter Ring','Kampa'],language:'Tschechisch',quote:'Prag fühlt sich an wie eine Geschichte – und ihr seid mittendrin.'},
    lissabon:{name:'Lissabon',country:'Portugal',emoji:'🇵🇹',tagline:'Hügel, Azulejos und Atlantiklicht',highlights:['Alfama','Belém','Tram 28','Miradouros'],language:'Portugiesisch',quote:'Lissabons Licht begleitet euch durch eine Reise voller Höhen, Ausblicke und Lieblingsmomente.'},
    kopenhagen:{name:'Kopenhagen',country:'Dänemark',emoji:'🇩🇰',tagline:'Hygge, Hafen und nordisches Design',highlights:['Nyhavn','Tivoli','Frederiksberg','Königliche Bibliothek'],language:'Dänisch',quote:'Kopenhagen zeigt, wie besonders eine Reise aus Ruhe, Nähe und kleinen Entdeckungen sein kann.'},
    newyork:{name:'New York',country:'USA',emoji:'🇺🇸',tagline:'Skyline, Energie und unendlich viele Geschichten',highlights:['Central Park','Brooklyn Bridge','Times Square','High Line'],language:'Englisch',quote:'In einer Stadt, die niemals schläft, entstehen Erinnerungen, die niemals verblassen.'},
    dubai:{name:'Dubai',country:'Vereinigte Arabische Emirate',emoji:'🇦🇪',tagline:'Wüste, Skyline und außergewöhnliche Erlebnisse',highlights:['Burj Khalifa','Dubai Marina','Old Dubai','Wüstensafari'],language:'Arabisch',quote:'Zwischen Wüste und Skyline wird jeder gemeinsame Moment ein bisschen größer.'},
    venedig:{name:'Venedig',country:'Italien',emoji:'🇮🇹',tagline:'Kanäle, Palazzi und zeitlose Romantik',highlights:['Markusplatz','Rialtobrücke','Dorsoduro','Burano'],language:'Italienisch',quote:'Venedig lässt euch treiben – durch Kanäle, Gassen und eure schönsten gemeinsamen Augenblicke.'}
  };
  const aliases={roma:'rom',rome:'rom','münchen':'munchen',munich:'munchen','new york':'newyork','new york city':'newyork',copenhagen:'kopenhagen',vienna:'wien',prague:'prag',lisbon:'lissabon',venice:'venedig'};
  const resolved=aliases[key]||Object.keys(profiles).find(k=>key===k||key.includes(k))||'';
  const profile=profiles[resolved]||{name:raw||'Euer Reiseziel',country:'',emoji:trip.symbol||'✈️',tagline:'Gemeinsam entdecken, erleben und für immer erinnern',highlights:['Altstadt','Lieblingsviertel','Aussichtspunkt','Besonderer Moment'],language:'Landessprache',quote:`${raw||'Diese Reise'} wird zu eurem ganz persönlichen Kapitel voller gemeinsamer Erinnerungen.`};

  async function resolveGeo(){
    const fallback={latitude:48.8566,longitude:2.3522,timezone:'auto',name:profile.name};
    try{
      const url='https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(profile.name)+'&count=1&language=de&format=json';
      const response=await fetch(url);
      if(!response.ok) return fallback;
      const item=(await response.json())?.results?.[0];
      return item?{latitude:item.latitude,longitude:item.longitude,timezone:item.timezone||'auto',name:item.name||profile.name,country:item.country||profile.country}:fallback;
    }catch{return fallback}
  }
  const ready=resolveGeo();
  window.LuviaDestinationContent=Object.freeze({profile,ready});
  if(!window.LuviaDestination) window.LuviaDestination=window.LuviaDestinationContent;

  function text(selector,value){const el=document.querySelector(selector);if(el&&value)el.textContent=value}
  function replaceAll(find,repl){document.querySelectorAll('h1,h2,h3,p,small,span,strong').forEach(el=>{if(el.children.length===0&&el.textContent.includes(find))el.textContent=el.textContent.split(find).join(repl)})}
  function apply(){
    document.documentElement.dataset.destination=profile.name;
    document.title=`Luvia – ${trip.tripName||profile.name}`;
    text('#countdown-title',`Noch ein bisschen Vorfreude bis ${profile.name}`);
    const countdown=document.querySelector('#trip-countdown-module .eyebrow'); if(countdown) countdown.textContent=`${profile.emoji} ${profile.tagline}`;
    const countdownP=document.querySelector('#trip-countdown-module .countdown-copy > p'); if(countdownP) countdownP.textContent=`Bald heißt es: ${profile.highlights.join(', ')} und viele gemeinsame Erinnerungen in ${profile.name}.`;
    const final=document.querySelector('#trip-final-quote'); if(final){final.childNodes[0].nodeValue=`„${profile.quote}“ `;const small=final.querySelector('small');if(small)small.textContent=`${profile.name}${trip.startDate?` · ${new Date(trip.startDate+'T12:00:00').getFullYear()}`:''} · ${trip.tripName||'Unsere Reise'}`}
    text('#reisebuch-title','Euer persönliches Reisebuch');
    const book=document.querySelector('#reisebuch p');if(book)book.textContent=`Aus euren Fotos, Live Moments, Tagesnotizen, Lieblingsorten und Erinnerungen erstellt Luvia euer persönliches ${profile.name}-Reisebuch.`;
    document.querySelectorAll('[data-weather="source"]').forEach(el=>el.textContent=`Live-Daten: Open-Meteo · ${profile.name}`);
    replaceAll('Paris-Prognose',`${profile.name}-Prognose`);
    replaceAll('für Paris',`für ${profile.name}`);
    replaceAll('Paris-Reisebuch',`${profile.name}-Reisebuch`);
    replaceAll('Unsere Fotospots',`Unsere Fotospots in ${profile.name}`);

    // Paris-spezifische Showcase-Blöcke gehören nie in eine fremde modulare Reise.
    if(profile.name!=='Paris') document.querySelectorAll('#seineTrip,#paris-moments,.disney-feature').forEach(el=>el.remove());

    const spots=document.querySelector('#fotospots .photo-spots');
    if(spots){spots.innerHTML=profile.highlights.map((spot,index)=>`<a class="photo-spot motion-card" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot+' '+profile.name)}" target="_blank" rel="noopener"><div class="photo-spot-media destination-spot-art"><span class="photo-spot-camera">📷</span><span style="font-size:54px">${['📍','✨','🏛️','🌇'][index%4]}</span></div><div class="photo-spot-body"><span class="photo-spot-icon">${['📍','✨','🏛️','🌇'][index%4]}</span><strong>${spot}</strong><small>Ein bekannter Fotopunkt in ${profile.name} – ideal für eure persönliche Reisesammlung.</small><span class="photo-route">In Maps öffnen ↗</span></div></a>`).join('')}
    const allSpots=document.querySelector('#fotospots .fotospots-map-all');if(allSpots){allSpots.href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Fotospots '+profile.name)}`;allSpots.target='_blank'}

    const restaurantGrid=document.querySelector('.restaurant-grid');
    if(restaurantGrid){restaurantGrid.innerHTML=[['🍽️',`Restaurants in ${profile.name}`,`Beliebte Restaurants, Bewertungen und freie Tische am Reiseziel.`],['🌱',`Vegetarisch in ${profile.name}`,`Vegetarische und vegane Optionen passend zu eurer Reise.`]].map(([icon,title,copy])=>`<article class="restaurant-card" style="--restaurant-bg:linear-gradient(145deg,#d98aa0,#506d82)"><span class="restaurant-badge">${profile.emoji} ${profile.name}</span><span class="restaurant-symbol">${icon}</span><h3>${title}</h3><p class="restaurant-copy">${copy}</p><a class="restaurant-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}">In Maps entdecken ↗</a></article>`).join('')}

    text('#sprachcoachTitle',`Sicher unterwegs in ${profile.name}`);
    const coach=document.querySelector('#sprachcoach .language-coach-copy p');if(coach)coach.textContent=`Hilfreiche Formulierungen und Übersetzungshilfen für typische Situationen in ${profile.name}. Landessprache: ${profile.language}.`;
    window.dispatchEvent(new CustomEvent('luvia:destination-ready',{detail:profile}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
