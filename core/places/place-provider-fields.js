(function(){
'use strict';
const VERSION='4.5.1.2';
const esc=v=>window.LuviaPlaceExperience?.esc?.(v)||String(v??'');
const defs=[
 ['primaryTypeDisplayName','Kategorie','🏷️'],['formattedAddress','Adresse','📍'],['nationalPhoneNumber','Telefon','📞'],['internationalPhoneNumber','Telefon international','☎️'],['websiteUri','Website','🌐'],['googleMapsUri','Google Maps','🗺️'],['rating','Bewertung','⭐'],['userRatingCount','Bewertungen','💬'],['priceLevel','Preisniveau','💶'],['businessStatus','Geschäftsstatus','ℹ️'],['utcOffsetMinutes','Zeitzone','🕒'],['allowsDogs','Hunde erlaubt','🐕'],['goodForChildren','Für Kinder geeignet','👶'],['goodForGroups','Für Gruppen geeignet','👥'],['restroom','WC vorhanden','🚻'],['outdoorSeating','Außenplätze','🌤️'],['reservable','Reservierbar','🗓️'],['takeout','Mitnahme','🥡'],['delivery','Lieferung','🚲'],['dineIn','Vor Ort','🍽️'],['servesBreakfast','Frühstück','🥐'],['servesLunch','Mittagessen','☀️'],['servesDinner','Abendessen','🌙'],['servesVegetarianFood','Vegetarische Auswahl','🌱'],['servesBeer','Bier','🍺'],['servesWine','Wein','🍷'],['servesCocktails','Cocktails','🍸'],['liveMusic','Live-Musik','🎵'],['curbsidePickup','Abholung am Fahrzeug','🚗']
];
const skip=new Set(['id','name','displayName','photos','location','types','openingHours','regularOpeningHours','currentOpeningHours','editorialSummary','generativeSummary','shortFormattedAddress','addressComponents','reviews','plusCode','viewport','iconMaskBaseUri','iconBackgroundColor','primaryType']);
function value(v){if(v===true)return'Ja';if(v===false)return'Nein';if(v==null||v==='')return'';if(Array.isArray(v))return v.join(', ');if(typeof v==='object')return'';return String(v).replace(/^PRICE_LEVEL_/,'').replaceAll('_',' ').toLowerCase().replace(/(^| )\w/g,m=>m.toUpperCase())}
function render(place={}){const rows=[];for(const [key,label,icon] of defs){const raw=place[key];const val=value(raw);if(!val)continue;const linked=/Uri$/.test(key)&&/^https?:/.test(String(raw));rows.push(`<div class="luv-place-provider-row"><span>${icon} ${esc(label)}</span>${linked?`<a href="${esc(raw)}" target="_blank" rel="noopener">Öffnen ↗</a>`:`<strong>${esc(val)}</strong>`}</div>`)}
 for(const [key,raw] of Object.entries(place)){if(skip.has(key)||defs.some(d=>d[0]===key))continue;const val=value(raw);if(!val)continue;if(!/accessibility|parking|payment|option|amenit|service/i.test(key))continue;const label=key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());rows.push(`<div class="luv-place-provider-row"><span>• ${esc(label)}</span><strong>${esc(val)}</strong></div>`)}
 return rows.length?`<section class="luv-place-provider-details"><span>Details zum Ort</span><div>${rows.join('')}</div></section>`:''}
function diagnostics(){return{version:VERSION,status:'ready',knownFields:defs.map(x=>x[0]),mode:'all-available-normalized-provider-fields'}}
window.LuviaPlaceProviderFields=Object.freeze({version:VERSION,render,diagnostics});
})();
