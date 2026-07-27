(() => {
  'use strict';
  if(!window.LuviaRecommendations)return;
  const text=p=>[p?.name,p?.editorialSummary,p?.primaryTypeLabel,...(p?.types||[])].join(' ').toLowerCase();
  window.LuviaRecommendations.registerAdapter('restaurants',{
    async provideCandidates(ctx,options){return options.candidates||[]},
    scoreCandidate(place,ctx){
      const components=[],reasons=[],warnings=[];const t=text(place),diet=ctx.preferences?.group?.dietary||[];
      const vegetarian=diet.some(x=>/vegetar|vegan/.test(x));const veg=place?.features?.servesVegetarianFood===true||/vegetar|vegan/.test(t);
      if(vegetarian&&veg){components.push({key:'restaurant.dietary',score:14,max:15,label:'Sehr gute Übereinstimmung mit eurer Ernährungsweise.'});reasons.push('Die Ernährungsweise passt zu euren hinterlegten Präferenzen.')}else if(vegetarian&&place?.features?.servesVegetarianFood===false)return{hardFailure:{key:'dietary',label:'Die zwingende Ernährungsweise ist nicht erfüllt.'}};
      if(place?.features?.reservable===true){components.push({key:'restaurant.reservable',score:6,max:6,label:'Reservierbar'});reasons.push('Lässt sich zuverlässig in euren Tagesplan einbauen.')}
      if(/rooftop|view|panoram|aussicht/.test(t)){components.push({key:'restaurant.occasion',score:7,max:8,label:'Besonderer Anlass'});reasons.push('Atmosphäre und Aussicht eignen sich für einen besonderen Reisemoment.')}
      const party=Number(ctx.partySize||ctx.group?.participantCount||0);if(party>0&&place?.features?.goodForGroups){components.push({key:'restaurant.group',score:5,max:6,label:'Gruppeneignung'});reasons.push('Passt zur Größe eurer Reisegruppe.')}
      if(ctx.hasBaby&&/family|child|kinder|casual/.test(t)){components.push({key:'restaurant.family',score:5,max:6,label:'Familienkontext'});reasons.push('Wirkt passend für eine Reise mit Baby oder Kind.')}
      return{entityType:'restaurant',components,reasons,warnings};
    },
    bestTime(input,ctx){
      const preferred=input.preferredTime||input.candidate?.recommendedVisitTime||'18:30';
      const reasons=['Passt zu eurem typischen Abend-Zeitfenster.'];
      if(input.candidate?.distanceMeters<2000)reasons.push('Der Weg vom aktuellen Standort bleibt kurz.');
      if(input.candidate?.openNow===true)reasons.push('Die Öffnungszeiten sind aktuell kompatibel.');
      return{date:input.date||ctx.travel?.today,time:preferred,confidence:'high',reasons};
    }
  });
})();
