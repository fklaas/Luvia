(function(){
'use strict';
const VERSION='4.13.0';
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
 if(/shopping_mall|shopping mall|einkaufszentrum|centre commercial|centro comercial/.test(t))return field('Einkaufszentrum','hoch','Google-Kategorie, Name und Beschreibung');
 if(/department_store|department store|kaufhaus|grand magasin/.test(t))return field('Kaufhaus','hoch','Google-Kategorie, Name und Beschreibung');
 if(/flea_market|farmers_market|market|markt|marché|mercado/.test(t))return field('Markt','hoch','Google-Kategorie, Name und Beschreibung');
 if(/outlet|factory store|factory outlet/.test(t))return field('Outlet','hoch','Name und Place-Kategorie');
 if(/boutique|designer|concept store|luxury|luxe/.test(t))return field('Boutique oder Concept Store','mittel','Name, Kategorie und Beschreibung');
 if(/souvenir|gift shop|geschenk|cadeau/.test(t))return field('Souvenir- und Geschenkeshop','hoch','Google-Kategorie und Name');
 if(/supermarket|grocery|food store|bakery|delicatessen|feinkost|épicerie/.test(t))return field('Lebensmittel und Feinkost','hoch','Google-Kategorie und Name');
 return field('Geschäft oder Einkaufsort','mittel','Google-Place-Daten');
}
function purpose(place={}){
 const t=text(place);
 if(/souvenir|gift|geschenk|cadeau/.test(t))return field('Souvenirs und Geschenke','hoch','Name und Kategorie');
 if(/fashion|clothing|shoe|jewelry|mode|bekleidung|schuh|schmuck|designer|luxury|luxe/.test(t))return field('Mode und Lifestyle','mittel','Name, Kategorie und Beschreibung');
 if(/food|grocery|bakery|chocolate|wine|cheese|delicatessen|feinkost|épicerie|boulangerie/.test(t))return field('Regionale Spezialitäten und Genuss','mittel','Name, Kategorie und Beschreibung');
 if(/pharmacy|drugstore|supermarket|convenience|reisebedarf/.test(t))return field('Alltag und Reisebedarf','mittel','Google-Kategorie');
 if(/book|art|antique|record|vintage|craft|kunst|buch|antik|handwerk/.test(t))return field('Kultur, Design und besondere Fundstücke','mittel','Name und Kategorie');
 return field('Gemischtes Sortiment','niedrig','Keine eindeutige Sortimentsangabe');
}
function experience(place={}){
 const f=format(place).value;
 if(f==='Einkaufszentrum')return field('Viele Geschäfte und Services an einem Ort','hoch','Abgeleitet aus dem Einkaufsformat');
 if(f==='Kaufhaus')return field('Mehrere Sortimente kompakt unter einem Dach','hoch','Abgeleitet aus dem Einkaufsformat');
 if(f==='Markt')return field('Stöbern, lokale Anbieter und wechselndes Angebot','mittel','Abgeleitet aus Markt-Typ und Beschreibung');
 if(f==='Outlet')return field('Markenangebote und preisorientiertes Einkaufen','mittel','Abgeleitet aus Outlet-Typ');
 if(/Boutique/.test(f))return field('Gezieltes, individuelles Einkaufserlebnis','mittel','Abgeleitet aus Boutique- oder Concept-Store-Typ');
 return field('Gezielter Einkaufsstopp','mittel','Abgeleitet aus Place-Typ');
}
function setting(place={}){
 const t=text(place),f=format(place).value;
 if(f==='Markt'&&/flea|farmers|open air|outdoor|street|platz|square|marché/.test(t))return field('Outdoor oder teilweise überdacht','mittel','Markt-Typ und Beschreibung; vor Ort prüfen');
 if(f==='Markt')return field('Indoor oder Outdoor möglich','niedrig','Markt-Typ; vor Ort prüfen');
 if(/mall|department|store|shop|boutique|supermarket|outlet|kaufhaus|geschäft/.test(t)||['Einkaufszentrum','Kaufhaus','Outlet','Boutique oder Concept Store','Souvenir- und Geschenkeshop','Lebensmittel und Feinkost'].includes(f))return field('Überwiegend indoor','hoch','Google-Kategorie und Einkaufsformat');
 return field('Vor Ort prüfen','niedrig','Keine eindeutige Gebäudeangabe');
}
function budget(place={}){
 const raw=String(place?.priceLevel||place?.price_level||'').toLowerCase(),t=text(place);
 if(/very_expensive|price_level_4|luxury|luxe|designer|haute couture/.test(`${raw} ${t}`))return field('Eher gehoben','mittel','Preisniveau, Name oder Kategorie');
 if(/inexpensive|price_level_1|discount|outlet|flea|market|markt/.test(`${raw} ${t}`))return field('Eher günstig bis gemischt','mittel','Preisniveau und Einkaufsformat');
 if(/moderate|price_level_2|expensive|price_level_3/.test(raw))return field('Mittleres bis gehobenes Niveau','mittel','Google-Preisniveau');
 return field('Preisniveau vor Ort prüfen','niedrig','Keine belastbare Preisinformation');
}
function localCharacter(place={}){
 const t=text(place),f=format(place).value;
 if(f==='Markt'||/local|regional|artisan|craft|handmade|traditional|lokal|regional|handwerk|tradition/.test(t))return field('Lokaler Charakter wahrscheinlich','mittel','Markt-Typ, Name und Beschreibung');
 if(f==='Einkaufszentrum'||/chain|mall|department/.test(t))return field('Breites, eher internationales Angebot','mittel','Einkaufsformat');
 return field('Lokalen Charakter vor Ort prüfen','niedrig','Keine eindeutigen Anbieterinformationen');
}
function bestVisit(place={}){
 const f=format(place).value;
 if(f==='Markt')return field('Vormittags für die größte Auswahl','mittel','Allgemeine Marktlogik; konkrete Öffnungszeiten prüfen');
 if(f==='Einkaufszentrum'||f==='Kaufhaus')return field('Werktags vormittags oder am frühen Nachmittag','mittel','Typische ruhigere Einkaufszeit');
 if(f==='Outlet')return field('Möglichst früh am Tag','mittel','Mehr Auswahl und meist weniger Andrang');
 if(place?.openNow===true)return field('Jetzt geöffnet; Auslastung vor Ort prüfen','mittel','Aktueller Google-Öffnungsstatus');
 return field('Während der Öffnungszeit, möglichst außerhalb der Stoßzeiten','niedrig','Allgemeine Empfehlung');
}
function travelFit(place={}){
 const t=text(place),reasons=[];
 if(/souvenir|gift|local|regional|artisan|market|markt/.test(t))reasons.push('Gut für Erinnerungsstücke oder lokale Produkte geeignet.');
 if(/mall|department|supermarket|convenience|pharmacy/.test(t))reasons.push('Kann mehrere Reisebedarfe in einem Stopp abdecken.');
 if(place?.wheelchairAccessibleEntrance===true||place?.accessibilityOptions?.wheelchairAccessibleEntrance===true)reasons.push('Es liegt eine Angabe zu einem rollstuhlgerechten Eingang vor.');
 return reasons;
}
function analyze(place={},context={}){
 const extension=context?.extension&&typeof context.extension==='object'?context.extension:{};
 const persisted=(key,fallback)=>extension[key]!==undefined&&extension[key]!==null&&String(extension[key]).trim()!==''?field(String(extension[key]),'hoch','Gespeicherte Shopping-Einordnung'):fallback;
 const shoppingFormat=persisted('shopping_type',format(place));
 const shoppingPurpose=persisted('shopping_purpose',purpose(place));
 const shoppingExperience=persisted('shopping_experience',experience(place));
 const indoorOutdoor=persisted('indoor_outdoor',setting(place));
 const budgetHint=persisted('budget_hint',budget(place));
 const locality=persisted('local_character',localCharacter(place));
 const bestTime=persisted('best_visit_window',bestVisit(place));
 return{shoppingFormat,shoppingPurpose,shoppingExperience,indoorOutdoor,budgetHint,localCharacter:locality,bestVisit:bestTime,travelReasons:travelFit(place),decisionNote:'Die Hinweise werden aus Google-Place-Daten und dem Einkaufsformat abgeleitet. Gespeicherte Einordnungen bleiben cloudseitig erhalten; Sortiment, Preise und Marktstände können sich ändern.'};
}
window.LuviaShoppingIntelligence=Object.freeze({version:VERSION,analyze,format,purpose,experience,setting,budget,localCharacter,bestVisit});
})();
