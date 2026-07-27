(() => {
  'use strict';
  if(!window.LuviaRecommendations)return;
  const text=p=>[p?.name,p?.editorialSummary,p?.primaryTypeLabel,...(p?.types||[])].join(' ').toLowerCase();
  window.LuviaRecommendations.registerCandidateProvider('restaurants',async(ctx,options)=>(options.candidates||[]).map(x=>({...x,_recommendationSource:x._recommendationSource||'places-or-saved'})));
  window.LuviaRecommendations.registerAdapter('restaurants',{
    async provideCandidates(ctx,options){return options.candidates||[]},
    applyHardConstraints(place,ctx){
      const failures=[],warnings=[],t=text(place),diet=ctx.group?.hardRequirements?.dietary||[];
      const requiresVegetarian=diet.some(x=>/vegetar|vegan/.test(String(x)));
      const supportsVegetarian=place?.features?.servesVegetarianFood===true||/vegetar|vegan/.test(t);
      if(requiresVegetarian&&place?.features?.servesVegetarianFood===false&&!supportsVegetarian)failures.push({key:'restaurant.dietary',label:'Die zwingende Ernährungsweise der Reisegruppe ist nicht erfüllt.'});
      if(ctx.group?.hardRequirements?.allergies?.length&&!place?.allergenInformation)warnings.push({key:'restaurant.allergens-unknown',label:'Allergeninformationen sind nicht bestätigt.'});
      if(ctx.group?.hardRequirements?.baby&&place?.features?.childrenAllowed===false)failures.push({key:'restaurant.baby',label:'Das Restaurant ist nicht für die Reise mit Baby geeignet.'});
      return{failures,warnings};
    },
    scoreCandidate(place,ctx){
      const components=[],reasons=[],warnings=[],t=text(place),diet=ctx.group?.dietary||[];
      const vegetarian=diet.some(x=>/vegetar|vegan/.test(String(x))),veg=place?.features?.servesVegetarianFood===true||/vegetar|vegan/.test(t);
      if(vegetarian&&veg){components.push({key:'restaurant.dietary',score:14,max:15,label:'Sehr gute Übereinstimmung mit eurer Ernährungsweise.'});reasons.push('Die Ernährungsweise passt zu eurer Reisegruppe.')}
      if(place?.features?.reservable===true){components.push({key:'restaurant.reservable',score:6,max:6,label:'Reservierbar'});reasons.push('Lässt sich zuverlässig in euren Tagesplan einbauen.')}
      if(/rooftop|view|panoram|aussicht/.test(t)){components.push({key:'restaurant.occasion',score:7,max:8,label:'Besonderer Anlass'});reasons.push('Atmosphäre und Aussicht eignen sich für einen besonderen Reisemoment.')}
      if(ctx.group?.participantCount>1&&place?.features?.goodForGroups){components.push({key:'restaurant.group',score:5,max:6,label:'Gruppeneignung'});reasons.push('Passt zur Größe eurer Reisegruppe.')}
      if((ctx.group?.hardRequirements?.baby||ctx.group?.hardRequirements?.child)&&(/family|child|kinder|casual/.test(t)||place?.features?.childrenAllowed===true)){components.push({key:'restaurant.family',score:5,max:6,label:'Familienkontext'});reasons.push('Wirkt passend für eine Reise mit Baby oder Kind.')}
      return{entityType:'restaurant',components,reasons,warnings};
    },
    bestTime(input,ctx){
      const preferred=input.preferredTime||input.candidate?.recommendedVisitTime||'18:30',reasons=['Passt zu eurem typischen Abend-Zeitfenster.'];
      if(input.candidate?.distanceMeters<2000)reasons.push('Der Weg vom aktuellen Standort bleibt kurz.');
      if(input.candidate?.openNow===true)reasons.push('Die Öffnungszeiten sind aktuell kompatibel.');
      if(ctx.availableMinutes)reasons.push(`Berücksichtigt ein verfügbares Zeitfenster von ${ctx.availableMinutes} Minuten.`);
      return{date:input.date||ctx.travel?.today,time:preferred,confidence:'high',reasons};
    }
  });
})();
