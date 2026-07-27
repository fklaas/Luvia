(() => {
  'use strict';
  if(!window.LuviaRecommendations)return;
  const text=p=>[p?.name,p?.editorialSummary,p?.primaryTypeLabel,...(p?.types||[])].join(' ').toLowerCase();
  const number=v=>Number.isFinite(Number(v))?Number(v):null;
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
      if(ctx.group?.hardRequirements?.stroller&&place?.features?.strollerFriendly===false)failures.push({key:'restaurant.stroller',label:'Kinderwagen-Eignung ist nicht gegeben.'});
      return{failures,warnings};
    },
    scoreCandidate(place,ctx){
      const components=[],reasons=[],warnings=[],t=text(place),diet=ctx.group?.dietary||[],distance=number(place?.distanceMeters);
      const vegetarian=diet.some(x=>/vegetar|vegan/.test(String(x))),veg=place?.features?.servesVegetarianFood===true||/vegetar|vegan/.test(t);
      if(vegetarian&&veg){components.push({key:'restaurant.dietary',score:14,max:15,label:'Sehr gute Übereinstimmung mit eurer Ernährungsweise.'});reasons.push('Vegetarische Auswahl passt zu euren Präferenzen.')}
      if(place?.features?.reservable===true){components.push({key:'restaurant.reservable',score:6,max:6,label:'Reservierbar'});reasons.push('Reservierbar und dadurch gut planbar.')}
      if(/rooftop|view|panoram|aussicht|terrasse/.test(t)){components.push({key:'restaurant.occasion',score:7,max:8,label:'Besonderer Anlass'});reasons.push('Atmosphäre und Aussicht eignen sich für einen besonderen Reisemoment.')}
      if(ctx.group?.participantCount>1&&place?.features?.goodForGroups){components.push({key:'restaurant.group',score:5,max:6,label:'Gruppeneignung'});reasons.push('Passt zur Größe eurer Reisegruppe.')}
      if((ctx.group?.hardRequirements?.baby||ctx.group?.hardRequirements?.child)&&(place?.features?.childrenAllowed===true||/family|famil|casual|café|cafe/.test(t))){components.push({key:'restaurant.family',score:6,max:6,label:'Familienkontext'});reasons.push('Gut mit Baby oder Kind geeignet.')}
      const budget=String(ctx.group?.budget||'').toLowerCase(),price=String(place?.priceLevel||'');
      const expensive=/EXPENSIVE|VERY_EXPENSIVE|^[34]$/.test(price);
      if(!expensive||!/low|spar|günstig/.test(budget)){components.push({key:'restaurant.budget',score:6,max:7,label:'Budgetstil'});reasons.push('Passt zu eurem Budgetstil.')}else warnings.push('Das Preisniveau liegt über eurem bevorzugten Budget.');
      if(distance!=null&&distance<=1500){components.push({key:'restaurant.route',score:5,max:5,label:'Direkt erreichbar'});reasons.push('Liegt direkt auf eurem Weg beziehungsweise in eurer Nähe.')}
      if(place?.openNow===false)warnings.push('Aktuell geschlossen – Alternativen sollten geprüft werden.');
      const preferred=place?.recommendedVisitTime||'18:45';
      return{entityType:'restaurant',components,reasons,warnings,suggestedDate:ctx.travel?.today||null,suggestedTime:preferred};
    },
    bestTime(input,ctx){
      const distance=number(input.candidate?.distanceMeters),walk=distance==null?null:Math.max(1,Math.ceil(distance/75));
      const preferred=input.preferredTime||input.candidate?.recommendedVisitTime||'18:45';
      const reasons=['Passt zu eurem typischen Abend-Zeitfenster.'];
      if(distance!=null&&distance<2000)reasons.push('Der Weg vom aktuellen Standort bleibt kurz.');
      if(input.candidate?.openNow===true)reasons.push('Die Öffnungszeiten sind kompatibel.');
      if(ctx.availableMinutes)reasons.push(`Berücksichtigt ein verfügbares Zeitfenster von ${ctx.availableMinutes} Minuten.`);
      return{date:input.date||ctx.travel?.today,time:preferred,confidence:'high',travelMinutes:walk,reasons};
    },
    createAlternatives(rec,ctx,options={}){
      const candidates=(options.candidates||[]).filter(x=>String(x.id||x.providerPlaceId)!==String(rec.entityId));
      const primary=rec.candidate||{},distance=number(primary.distanceMeters),price=String(primary.priceLevel||'');
      return candidates.map(candidate=>{
        const cd=number(candidate.distanceMeters),cp=String(candidate.priceLevel||'');let reason='Ähnlicher Stil';
        if(cd!=null&&distance!=null&&cd<distance)reason='Diese Alternative ist näher.';
        else if(cp&&price&&cp<price)reason='Diese Alternative ist günstiger.';
        else if(candidate?.features?.childrenAllowed===true&&primary?.features?.childrenAllowed!==true)reason='Diese Alternative passt besser mit Baby.';
        else if(candidate.openNow===true&&primary.openNow===false)reason='Diese Alternative ist aktuell geöffnet.';
        return{candidate,reason};
      }).slice(0,options.limit||3);
    }
  });
})();
