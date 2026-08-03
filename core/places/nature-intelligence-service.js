(function(){
'use strict';
const VERSION='4.16.2';
const text=place=>[
 place?.name,
 place?.primaryType,
 place?.primaryTypeDisplayName?.text,
 place?.primaryTypeDisplayName,
 place?.editorialSummary?.text,
 place?.editorialSummary,
 place?.description,
 ...(place?.types||[])
].filter(Boolean).join(' ').toLowerCase();
const field=(value,confidence,source)=>({value,confidence,source});
function format(place={}){
 const t=text(place);
 if(/national_park|state_park|nature_preserve|wildlife_refuge|nationalpark|naturreservat|réserve naturelle/.test(t))return field('Naturpark oder Schutzgebiet','hoch','Google-Kategorie, Name und Beschreibung');
 if(/hiking_area|trail|wander|sentier|randonnée|trek/.test(t))return field('Wandergebiet oder Naturpfad','hoch','Google-Kategorie, Name und Beschreibung');
 if(/botanical_garden|garden|city_park|park|garten|jardin/.test(t))return field('Park oder Garten','hoch','Google-Kategorie, Name und Beschreibung');
 if(/beach|strand|coast|coastal|plage|küste/.test(t))return field('Strand oder Küstenort','hoch','Google-Kategorie, Name und Beschreibung');
 if(/lake|river|waterfall|marina|see|fluss|wasserfall|lac|rivière/.test(t))return field('Wasserlandschaft','hoch','Google-Kategorie, Name und Beschreibung');
 if(/mountain_peak|mountain|hill|berg|gipfel|montagne/.test(t))return field('Berg- oder Höhenlandschaft','hoch','Google-Kategorie, Name und Beschreibung');
 if(/woods|forest|wald|forêt/.test(t))return field('Waldgebiet','hoch','Google-Kategorie, Name und Beschreibung');
 if(/scenic_spot|observation_deck|viewpoint|panorama|aussicht|belvédère/.test(t))return field('Aussichts- oder Panoramaort','hoch','Google-Kategorie, Name und Beschreibung');
 return field('Natur- oder Ausflugsort','mittel','Google-Place-Daten');
}
function purpose(place={}){
 const t=text(place),f=format(place).value;
 if(/hiking|trail|wander|randonnée|trek|mountain|berg/.test(t))return field('Bewegen und Natur aktiv erleben','mittel','Name, Kategorie und Beschreibung');
 if(/beach|lake|river|water|strand|see|fluss|plage/.test(t))return field('Wasser, Ufer und Erholung','mittel','Name, Kategorie und Beschreibung');
 if(/scenic|view|panorama|aussicht|belvédère/.test(t))return field('Aussicht und Landschaft genießen','hoch','Name und Kategorie');
 if(/picnic|barbecue|park|garden|garten|jardin/.test(t))return field('Spazieren, entspannen oder picknicken','mittel','Google-Kategorie und Beschreibung');
 if(f==='Naturpark oder Schutzgebiet'||/wildlife|nature preserve|naturreservat/.test(t))return field('Natur beobachten und entdecken','mittel','Schutzgebiets- oder Naturtyp');
 return field('Auszeit im Grünen','niedrig','Keine eindeutige Aktivitätsangabe');
}
function experience(place={}){
 const f=format(place).value;
 if(f==='Park oder Garten')return field('Flexibler Spaziergang mit frei wählbarer Dauer','hoch','Abgeleitet aus dem Ortstyp');
 if(f==='Wandergebiet oder Naturpfad')return field('Aktiver Ausflug mit Wegstrecke','hoch','Abgeleitet aus dem Ortstyp');
 if(f==='Aussichts- oder Panoramaort')return field('Kurzer bis mittlerer Panorama-Stopp','hoch','Abgeleitet aus dem Ortstyp');
 if(f==='Strand oder Küstenort'||f==='Wasserlandschaft')return field('Erholung und Naturerlebnis am Wasser','mittel','Abgeleitet aus dem Ortstyp');
 if(f==='Naturpark oder Schutzgebiet'||f==='Waldgebiet')return field('Ruhiger Naturausflug mit Erkundung','mittel','Abgeleitet aus dem Ortstyp');
 return field('Flexibler Naturstopp','mittel','Abgeleitet aus den Place-Daten');
}
function effort(place={}){
 const t=text(place),f=format(place).value;
 if(/mountain_peak|steep|climb|summit|gipfel|steil|kletter/.test(t))return field('Eher anspruchsvoll','mittel','Name, Kategorie und Landschaftstyp; Route vor Ort prüfen');
 if(f==='Wandergebiet oder Naturpfad'||f==='Naturpark oder Schutzgebiet'||f==='Waldgebiet')return field('Leicht bis mittel – abhängig von der gewählten Route','mittel','Ortstyp; konkrete Wege vor Ort prüfen');
 if(f==='Park oder Garten'||f==='Aussichts- oder Panoramaort')return field('Eher leicht','mittel','Ortstyp; Zugangsweg vor Ort prüfen');
 return field('Vor Ort prüfen','niedrig','Keine belastbaren Weg- oder Höhendaten');
}
function weather(place={}){
 const t=text(place);
 if(/botanical_garden|visitor_center|greenhouse|gewächshaus/.test(t))return field('Teilweise wettergeschützt möglich','mittel','Ortstyp und Beschreibung');
 return field('Überwiegend wetterabhängig','hoch','Natur- und Outdoor-Charakter');
}
function family(place={}){
 const t=text(place),accessible=place?.wheelchairAccessibleEntrance===true||place?.accessibilityOptions?.wheelchairAccessibleEntrance===true||place?.accessibility?.wheelchairAccessibleEntrance===true;
 if(accessible)return field('Zugangshinweis zur Barrierefreiheit vorhanden','hoch','Google-Barrierefreiheitsangabe; Wege weiterhin prüfen');
 if(/city_park|park|garden|botanical_garden|picnic|spielplatz|playground/.test(t))return field('Für unterschiedliche Altersgruppen wahrscheinlich gut geeignet','mittel','Ortstyp; Wege und Ausstattung vor Ort prüfen');
 if(/mountain_peak|off_roading|steep|climb|gipfel|steil/.test(t))return field('Für kleine Kinder oder Mobilitätshilfen vorher genau prüfen','mittel','Landschafts- und Aktivitätstyp');
 return field('Eignung vor Ort prüfen','niedrig','Keine belastbaren Wege- oder Ausstattungsdaten');
}
function access(place={}){
 const t=text(place),f=format(place).value;
 if(/botanical_garden|wildlife_park|visitor_center|guided|ticket|eintritt|billet/.test(t))return field('Eintritt oder geregelter Zugang möglich','mittel','Ortstyp und Beschreibung');
 if(['Park oder Garten','Strand oder Küstenort','Wasserlandschaft','Waldgebiet','Aussichts- oder Panoramaort'].includes(f))return field('Freier Zugang wahrscheinlich','mittel','Öffentlicher Naturtyp; lokale Regeln prüfen');
 return field('Zugang und mögliche Gebühren prüfen','niedrig','Keine eindeutigen Zugangsdaten');
}
function scenic(place={}){
 const t=text(place),f=format(place).value;
 if(/sunset|sunrise|panorama|scenic|view|aussicht|belvédère/.test(t))return field('Weite Aussicht und starke Fotomotive','hoch','Name, Kategorie und Beschreibung');
 if(f==='Wasserlandschaft'||f==='Strand oder Küstenort')return field('Wasser, Himmel und offene Landschaft','mittel','Landschaftstyp');
 if(f==='Waldgebiet'||f==='Naturpark oder Schutzgebiet')return field('Naturdetails, Wege und ruhige Landschaft','mittel','Landschaftstyp');
 if(f==='Park oder Garten')return field('Grünflächen, Wege und gestaltete Natur','mittel','Ortstyp');
 return field('Landschaft und Umgebung','niedrig','Keine eindeutige Motivangabe');
}
function bestVisit(place={}){
 const t=text(place),f=format(place).value;
 if(/sunrise|sonnenaufgang/.test(t))return field('Rund um den Sonnenaufgang','hoch','Eindeutiger Hinweis in Name oder Beschreibung');
 if(/sunset|sonnenuntergang/.test(t)||f==='Aussichts- oder Panoramaort')return field('Später Nachmittag bis Sonnenuntergang','mittel','Aussichtscharakter; Wetter und Öffnung prüfen');
 if(f==='Wandergebiet oder Naturpfad'||f==='Naturpark oder Schutzgebiet')return field('Früh am Tag mit ausreichend Zeitreserve','mittel','Ausflugs- und Wegcharakter');
 if(f==='Park oder Garten')return field('Vormittags oder am späten Nachmittag','mittel','Typische ruhigere Licht- und Besuchszeit');
 if(place?.openNow===true)return field('Jetzt geöffnet; Wetter und Auslastung prüfen','mittel','Aktueller Google-Öffnungsstatus');
 return field('Bei Tageslicht und passendem Wetter','niedrig','Allgemeine Outdoor-Empfehlung');
}
function duration(place={}){
 const f=format(place).value;
 if(f==='Aussichts- oder Panoramaort')return field('Etwa 30–75 Minuten','mittel','Planungsempfehlung aus dem Ortstyp');
 if(f==='Park oder Garten')return field('Etwa 60–120 Minuten','mittel','Planungsempfehlung aus dem Ortstyp');
 if(f==='Wandergebiet oder Naturpfad'||f==='Naturpark oder Schutzgebiet'||f==='Waldgebiet')return field('Mindestens 2–4 Stunden einplanen','mittel','Planungsempfehlung; konkrete Route bestimmt die Dauer');
 if(f==='Strand oder Küstenort'||f==='Wasserlandschaft')return field('Etwa 1–3 Stunden flexibel','niedrig','Planungsempfehlung aus dem Ortstyp');
 return field('Etwa 60–120 Minuten','niedrig','Allgemeine Planungsempfehlung');
}
function travelFit(place={}){
 const t=text(place),reasons=[];
 if(/park|garden|nature|beach|lake|river|forest|scenic|natur|strand|see|wald|aussicht/.test(t))reasons.push('Bringt Natur, Bewegung oder Erholung in den Reiseablauf.');
 if(/scenic|view|panorama|sunset|sunrise|aussicht/.test(t))reasons.push('Eignet sich wahrscheinlich für besondere Ausblicke und Erinnerungsfotos.');
 if(place?.accessibilityOptions||place?.accessibility)reasons.push('Es liegen einzelne Angaben zur Barrierefreiheit vor; konkrete Wege sollten trotzdem geprüft werden.');
 return reasons;
}
function analyze(place={},context={}){
 const extension=context?.extension&&typeof context.extension==='object'?context.extension:{};
 const persisted=(key,fallback)=>extension[key]!==undefined&&extension[key]!==null&&String(extension[key]).trim()!==''?field(String(extension[key]),'hoch','Gespeicherte Natur-Einordnung'):fallback;
 const natureFormat=persisted('nature_type',format(place));
 const naturePurpose=persisted('nature_purpose',purpose(place));
 const natureExperience=persisted('nature_experience',experience(place));
 const effortLevel=persisted('effort_level',effort(place));
 const weatherExposure=persisted('weather_exposure',weather(place));
 const familySuitability=persisted('family_suitability',family(place));
 const accessType=persisted('access_type',access(place));
 const scenicCharacter=persisted('scenic_character',scenic(place));
 const bestTime=persisted('best_visit_window',bestVisit(place));
 const durationHint=persisted('duration_hint',duration(place));
 return{natureFormat,naturePurpose,natureExperience,effortLevel,weatherExposure,familySuitability,accessType,scenicCharacter,bestVisit:bestTime,durationHint,travelReasons:travelFit(place),decisionNote:'Die Hinweise werden aus Google-Place-Daten und dem Naturtyp abgeleitet. Wege, Wetter, saisonale Sperrungen, Eintritt und tatsächliche Zugänglichkeit müssen vor Ort geprüft werden.'};
}
window.LuviaNatureIntelligence=Object.freeze({version:VERSION,analyze,format,purpose,experience,effort,weather,family,access,scenic,bestVisit,duration});
})();
