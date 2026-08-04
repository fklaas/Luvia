(()=>{'use strict';
const VERSION='4.18.0';
const field=(value,confidence='mittel',source='Google-Place-Daten')=>({value,confidence,source});
const text=p=>[p?.name,p?.primaryType,p?.primaryTypeDisplayName,...(p?.types||[]),p?.formattedAddress,p?.editorialSummary].filter(Boolean).join(' ').toLowerCase();
const typeSet=p=>new Set([p?.primaryType,...(p?.types||[])].filter(Boolean));
function mode(place={}){
 const t=typeSet(place),s=text(place);
 if(t.has('international_airport')||t.has('airport')||t.has('airstrip')||/airport|flughafen|aéroport|aeroporto/.test(s))return field('Flughafen','hoch','Google-Kategorie');
 if(t.has('train_station')||t.has('train_ticket_office')||/bahnhof|gare|railway|train station|reisezentrum/.test(s))return field('Bahn & Fernverkehr','hoch','Google-Kategorie');
 if(t.has('subway_station')||t.has('light_rail_station')||/metro|subway|u-bahn/.test(s))return field('Metro oder Stadtbahn','hoch','Google-Kategorie');
 if(t.has('tram_stop')||/tram|straßenbahn/.test(s))return field('Straßenbahn','hoch','Google-Kategorie');
 if(t.has('bus_station')||t.has('bus_stop')||/bus station|busbahnhof|bushaltestelle/.test(s))return field('Bus','hoch','Google-Kategorie');
 if(t.has('ferry_terminal')||t.has('ferry_service')||/ferry|fähre|terminal maritime/.test(s))return field('Fähre','hoch','Google-Kategorie');
 if(t.has('taxi_stand')||t.has('taxi_service')||/taxi/.test(s))return field('Taxi','hoch','Google-Kategorie');
 if(t.has('car_rental')||/car rental|mietwagen|location de voiture/.test(s))return field('Mietwagen','hoch','Google-Kategorie');
 if(t.has('electric_vehicle_charging_station')||t.has('ebike_charging_station')||/charging|ladestation|borne de recharge/.test(s))return field(t.has('ebike_charging_station')?'E-Bike-Ladestation':'E-Auto-Ladestation','hoch','Google-Kategorie');
 if(t.has('bike_sharing_station')||/bike sharing|vélib|leihfahrrad/.test(s))return field('Bike-Sharing','hoch','Google-Kategorie');
 if(t.has('park_and_ride'))return field('Park-and-Ride','hoch','Google-Kategorie');
 if(t.has('parking_garage'))return field('Parkhaus','hoch','Google-Kategorie');
 if(t.has('parking_lot')||t.has('parking'))return field('Parkplatz','hoch','Google-Kategorie');
 if(t.has('transit_station')||t.has('transit_stop')||t.has('transit_depot')||t.has('transportation_service'))return field('ÖPNV-Station','hoch','Google-Kategorie');
 return field('Mobilitätspunkt','mittel','Name und Google-Place-Typ');
}
function role(place={}){
 const m=mode(place).value;
 if(m==='Flughafen'||m==='Bahn & Fernverkehr'||m==='Fähre')return field('An- oder Abreise und größere Etappen','hoch','Verkehrsart');
 if(['Metro oder Stadtbahn','Straßenbahn','Bus','ÖPNV-Station'].includes(m))return field('Fortbewegung am Reiseziel','hoch','Verkehrsart');
 if(['Park-and-Ride','Parkhaus','Parkplatz'].includes(m))return field('Fahrzeug abstellen und weiterreisen','hoch','Verkehrsart');
 if(m.includes('Ladestation'))return field('Ladestopp während Anreise oder Aufenthalt','hoch','Verkehrsart');
 if(m==='Mietwagen')return field('Fahrzeugübernahme oder Rückgabe','hoch','Verkehrsart');
 if(m==='Taxi')return field('Flexible Tür-zu-Tür-Verbindung','hoch','Verkehrsart');
 if(m==='Bike-Sharing')return field('Kurze flexible Wege in der Stadt','hoch','Verkehrsart');
 return field('Mobilität rund um eure Reise','mittel','Verkehrsart');
}
function buffer(place={}){
 const m=mode(place).value;
 if(m==='Flughafen')return field('Großzügigen Zeitpuffer und Terminalprüfung einplanen','hoch','Planungsempfehlung nach Verkehrsart');
 if(m==='Bahn & Fernverkehr'||m==='Fähre')return field('Mindestens 20–30 Minuten Puffer einplanen','mittel','Planungsempfehlung nach Verkehrsart');
 if(m==='Mietwagen')return field('Übergabezeit, Dokumente und Öffnungszeiten prüfen','hoch','Planungsempfehlung nach Verkehrsart');
 if(['Park-and-Ride','Parkhaus','Parkplatz'].includes(m))return field('Einfahrt, Fußweg und mögliche Auslastung berücksichtigen','mittel','Planungsempfehlung nach Verkehrsart');
 if(m.includes('Ladestation'))return field('Ladeleistung, Steckertyp und Verfügbarkeit vor Abfahrt prüfen','hoch','Sicherheits- und Planungshinweis');
 return field('Aktuelle Verbindung kurz vor Abfahrt prüfen','mittel','Allgemeine Mobilitätsempfehlung');
}
function access(place={}){
 const a=place?.accessibilityOptions||place?.accessibility||{};
 if(a.wheelchairAccessibleEntrance===true)return field('Rollstuhlgerechter Eingang angegeben','hoch','Google-Barrierefreiheitsangabe');
 if(a.wheelchairAccessibleParking===true)return field('Rollstuhlgerechter Parkplatz angegeben','hoch','Google-Barrierefreiheitsangabe');
 return field('Barrierefreiheit und stufenlosen Zugang vor Ort prüfen','niedrig','Keine eindeutige vollständige Angabe');
}
function operating(place={}){
 if(place?.businessStatus==='CLOSED_PERMANENTLY')return field('Dauerhaft geschlossen','hoch','Google-Betriebsstatus');
 if(place?.businessStatus==='CLOSED_TEMPORARILY')return field('Vorübergehend geschlossen','hoch','Google-Betriebsstatus');
 if(place?.openNow===true)return field('Aktuell geöffnet','hoch','Google-Öffnungsstatus');
 if(place?.openNow===false)return field('Aktuell geschlossen','hoch','Google-Öffnungsstatus');
 return field('Betrieb und Zeiten vor Nutzung prüfen','mittel','Keine aktuelle eindeutige Öffnungsangabe');
}
function parking(place={}){
 const m=mode(place).value,o=place?.parkingOptions||{};
 const labels=[];
 if(o.freeParkingLot)labels.push('kostenloser Parkplatz');
 if(o.paidParkingLot)labels.push('gebührenpflichtiger Parkplatz');
 if(o.freeGarageParking)labels.push('kostenloses Parkhaus');
 if(o.paidGarageParking)labels.push('gebührenpflichtiges Parkhaus');
 if(o.freeStreetParking)labels.push('kostenlose Straßenplätze');
 if(o.paidStreetParking)labels.push('gebührenpflichtige Straßenplätze');
 if(o.valetParking)labels.push('Valet-Parking');
 if(labels.length)return field(labels.join(', '),'hoch','Google-Parkplatzoptionen');
 if(['Park-and-Ride','Parkhaus','Parkplatz'].includes(m))return field('Parkmöglichkeit vorhanden; Kosten und Verfügbarkeit prüfen','mittel','Google-Kategorie');
 return field('Keine belastbare Parkplatzangabe','niedrig','Google-Place-Daten');
}
function charging(place={}){
 const m=mode(place).value,o=place?.evChargeOptions||{};
 const count=Number(o.connectorCount||o.count||o.totalConnectorCount);
 if(Number.isFinite(count)&&count>0)return field(`${count} Ladeanschlüsse gemeldet`,'hoch','Google-Ladeoptionen');
 if(m.includes('Ladestation'))return field('Ladestation erkannt; Anschlüsse, Leistung und Belegung prüfen','mittel','Google-Kategorie');
 return field('Keine Ladeinformation erforderlich oder verfügbar','niedrig','Google-Place-Daten');
}
function ticket(place={}){
 const m=mode(place).value;
 if(['Bahn & Fernverkehr','Flughafen','Fähre'].includes(m))return field('Ticket, Terminal beziehungsweise Gleis beim Anbieter prüfen','hoch','Verkehrsart');
 if(['Metro oder Stadtbahn','Straßenbahn','Bus','ÖPNV-Station'].includes(m))return field('Tarif, Ticketmedium und letzte Verbindung lokal prüfen','mittel','Verkehrsart');
 if(m==='Mietwagen')return field('Buchungsbestätigung, Führerschein und Kaution bereithalten','hoch','Verkehrsart');
 if(['Park-and-Ride','Parkhaus','Parkplatz'].includes(m))return field('Tarif und maximale Parkdauer vor Einfahrt prüfen','mittel','Verkehrsart');
 return field('Keine eindeutige Ticketanforderung','niedrig','Verkehrsart');
}
function travelReasons(place={}){const m=mode(place).value,r=[`Unterstützt eure Reise als ${m}.`];if(place?.rating>=4.3)r.push('Besitzt eine gute öffentliche Bewertung.');if(place?.googleMapsUri||place?.mapsUrl)r.push('Kann direkt in Google Maps geöffnet werden.');return r;}
function analyze(place={},context={}){
 const extension=context?.extension&&typeof context.extension==='object'?context.extension:{};
 const persisted=(key,fallback)=>extension[key]!==undefined&&extension[key]!==null&&String(extension[key]).trim()!==''?field(String(extension[key]),'hoch','Gespeicherte Mobilitäts-Einordnung'):fallback;
 const mobilityMode=persisted('mobility_mode',mode(place));
 const transportRole=persisted('transport_role',role(place));
 const transferBuffer=persisted('transfer_buffer',buffer(place));
 const accessHint=persisted('access_hint',access(place));
 const operatingHint=persisted('operating_hint',operating(place));
 const parkingHint=persisted('parking_hint',parking(place));
 const chargingHint=persisted('charging_hint',charging(place));
 const ticketHint=persisted('ticket_hint',ticket(place));
 return{mobilityMode,transportRole,transferBuffer,accessHint,operatingHint,parkingHint,chargingHint,ticketHint,travelReasons:travelReasons(place),decisionNote:'Move zeigt verlässliche Ortsdaten. Live-Abfahrten, Belegung, Preise, Tarife und Verspätungen müssen beim jeweiligen Betreiber geprüft werden.'};
}
function diagnostics(){return{version:VERSION,status:'ready',capability:'move-mobility',liveTransit:false,providerFields:['accessibilityOptions','parkingOptions','evChargeOptions']}}
window.LuviaTransportIntelligence=Object.freeze({version:VERSION,analyze,mode,role,buffer,access,operating,parking,charging,ticket,diagnostics});
})();
