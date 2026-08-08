(() => {
  'use strict';
  const VERSION='1.5.0';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canonicalType=raw=>{
    const type=String(raw||'').toLowerCase();
    if(type==='restaurant'||type.includes('restaurant')||['cafe','café','bar','bakery','meal_takeaway','meal_delivery','food'].includes(type))return 'restaurant';
    if(['accommodation','hotel','lodging','motel','hostel','resort_hotel','bed_and_breakfast','guest_house'].includes(type)||type.includes('hotel'))return 'accommodation';
    return type;
  };
  const capable=type=>{
    const canonical=canonicalType(type);
    if(canonical==='restaurant')return true;
    if(canonical==='accommodation')return false;
    return Boolean(window.LuviaPlaceTypeContracts?.capability?.(canonical,'reservation')||window.LuviaPlaceTypeContracts?.capability?.(canonical,'booking'));
  };

  function actionButton({placeType,place}={}){
    const type=canonicalType(placeType||place?.primaryType||place?.primary_type||'');
    if(!capable(type))return '';
    const label=type==='accommodation'?'Buchen':'Reservieren';
    const pid=place?.providerPlaceId||place?.provider_place_id||place?.id||'';
    const name=place?.name||'';
    const email=place?.email||place?.contactEmail||'';
    const website=place?.website||place?.websiteUri||place?.website_uri||'';
    const reservationUrl=place?.reservationUrl||place?.reservation_url||place?.bookingUrl||place?.booking_url||'';
    return `<button type="button" class="luv-place-primary-action" data-luvia-booking-place data-booking-place-type="${esc(type)}" data-booking-place-id="${esc(pid)}" data-booking-place-name="${esc(name)}" data-booking-place-email="${esc(email)}" data-booking-place-website="${esc(website)}" data-booking-place-reservation-url="${esc(reservationUrl)}">◇ ${label}</button>`;
  }

  function dialogHtml(place={}){
    const type=String(place.type||'other');
    const isHotel=type==='accommodation'||type==='hotel';
    const trip=window.LuviaTripStore?.snapshot?.()?.activeTrip||{};
    const defaultDate=(trip.startDate||trip.start_date||new Date().toISOString().slice(0,10));
    return `<div class="lv-booking-backdrop">
      <section class="lv-booking-dialog" role="dialog" aria-modal="true" aria-labelledby="bookingDialogTitle">
        <button type="button" class="lv-booking-close" data-booking-close aria-label="Schließen">×</button>
        <span class="lv-booking-kicker">Luvia Booking</span>
        <h2 id="bookingDialogTitle">${isHotel?'Unterkunft anfragen':'Reservierung anfragen'}</h2>
        <p><strong>${esc(place.name||'Ausgewählter Ort')}</strong></p>
        <div class="lv-booking-form">
          <label><span>${isHotel?'Check-in':'Datum'}</span><input type="date" data-booking-date value="${esc(defaultDate)}"></label>
          ${isHotel?`<label><span>Check-out</span><input type="date" data-booking-end-date value="${esc(defaultDate)}"></label>`:`<label><span>Uhrzeit</span><input type="time" data-booking-time value="19:00"></label>`}
          <label><span>${isHotel?'Gäste':'Personen'}</span><input type="number" min="1" max="50" value="2" data-booking-party></label>
          <label><span>Kontaktprüfung</span>${place.email?`<div class="lv-booking-auto-contact is-found"><strong>${esc(place.email)}</strong><small>Verifizierte öffentliche E-Mail auf der offiziellen Restaurant-Seite gefunden.</small></div><input type="hidden" data-booking-email value="${esc(place.email)}">`:place._bookingContactChecked?`<div class="lv-booking-auto-contact is-missing"><strong>Keine verifizierte öffentliche E-Mail-Adresse gefunden.</strong><small>Luvia hat die verfügbare offizielle Website und Kontaktseiten geprüft. Es wird keine Adresse geraten und keine Nachricht versendet.</small></div><input type="hidden" data-booking-email value="">`:`<div class="lv-booking-auto-contact"><strong>Kontakt wird geprüft …</strong><small>Luvia sucht ausschließlich auf belegbaren offiziellen Quellen.</small></div><input type="hidden" data-booking-email value="">`}</label>
          <label class="is-wide"><span>Wunsch / Hinweis</span><textarea data-booking-note rows="3" placeholder="z. B. Kinderwagen, ruhiger Tisch, spätes Check-in …"></textarea></label>
        </div>
        <div class="lv-booking-safety">
          <strong>So funktioniert es</strong>
          <p>Wenn kein direkter Buchungsanbieter verfügbar ist, nutzt Luvia automatisch eine verifizierte öffentliche E-Mail des Restaurants. Mit dem Klick auf „Anfrage senden“ bestätigst du den Versand.</p>
        </div>
        <div class="lv-booking-actions">
          <button type="button" data-booking-close>Abbrechen</button>
          <button type="button" class="is-primary" data-booking-create ${place.email?'':'disabled'}>${place.email?'Reservierungsanfrage senden':'Keine E-Mail verfügbar'}</button>
        </div>
        <div class="lv-booking-result" data-booking-result hidden></div>
      </section>
    </div>`;
  }

  function close(node){node?.remove();}

  async function open(place={}){
    document.querySelector('.lv-booking-backdrop')?.remove();
    const wrap=document.createElement('div');
    wrap.innerHTML=dialogHtml(place);
    const node=wrap.firstElementChild;
    document.body.appendChild(node);
    node.addEventListener('click',async e=>{
      if(e.target===node||e.target.closest('[data-booking-close]'))return close(node);
      const create=e.target.closest('[data-booking-create]');
      if(!create)return;
      if(!node.querySelector('[data-booking-email]')?.value){return;}
      create.disabled=true;
      const result=node.querySelector('[data-booking-result]');
      try{
        const date=node.querySelector('[data-booking-date]')?.value||'';
        const time=node.querySelector('[data-booking-time]')?.value||'12:00';
        const endDate=node.querySelector('[data-booking-end-date]')?.value||'';
        const startAt=date?new Date(`${date}T${time}:00`).toISOString():null;
        const endAt=endDate?new Date(`${endDate}T11:00:00`).toISOString():null;
        const booking=await window.LuviaBooking.createForPlace({
          placeType:place.type,
          place:{...place,email:node.querySelector('[data-booking-email]')?.value||place.email||''},
          startAt,endAt,
          partySize:Number(node.querySelector('[data-booking-party]')?.value||1),
          note:node.querySelector('[data-booking-note]')?.value||''
        });
        const hasEmail=Boolean(booking?.contact?.email);
        result.hidden=false;
        if(hasEmail){
          await window.LuviaBooking.sendEmail(booking.id,{note:node.querySelector('[data-booking-note]')?.value||''});
          result.innerHTML=`<strong>Anfrage versendet.</strong><p>Luvia hat die Reservierungsanfrage direkt an ${esc(booking.contact.email)} gesendet. Der Status bleibt „Angefragt“, bis eine belastbare Antwort vorliegt.</p>`;
        }else{
          result.innerHTML=`<strong>Keine Nachricht versendet.</strong><p>Für dieses Restaurant wurde keine verifizierte öffentliche E-Mail gefunden.</p>`;
        }
        create.remove();
        // Nach erfolgreichem Anlegen die gesamte Overlay-Kette schließen: Booking-Dialog
        // und ggf. darunter geöffnete Place-Detailkarte.
        close(node);
        try{window.LuviaPlaceDetail?.close?.()}catch{}
        try{window.LuviaPlaceDetails?.close?.()}catch{}
        setTimeout(()=>window.dispatchEvent(new CustomEvent('luvia:navigate-request',{detail:{view:'bookings'}})),120);
      }catch(error){
        result.hidden=false;
        result.textContent=error?.message||'Die Buchungsanfrage konnte nicht angelegt werden.';
        create.disabled=false;
      }
    });
    return node;
  }

  const routeCache=new Map();
  const cacheKey=place=>[place?.providerPlaceId||place?.id||'',place?.name||'',place?.website||'',place?.reservationUrl||''].join('|');

  async function enrichPlace(place){
    let enriched={...place};
    const providerId=String(enriched.providerPlaceId||'').replace(/^places\//,'');
    if(providerId&&window.LuviaPlaceDetails?.prepare&&(!enriched.website||!enriched.reservationUrl)){
      try{
        const prepared=await window.LuviaPlaceDetails.prepare(providerId,{regionCode:'DE',photoLimit:1,seedPlace:{name:enriched.name,primaryType:enriched.type}});
        const detail=prepared?.place||{};
        enriched={...enriched,
          name:enriched.name||detail.name||detail.displayName?.text||'',
          website:enriched.website||detail.website||detail.websiteUri||detail.website_uri||'',
          reservationUrl:enriched.reservationUrl||detail.reservationUrl||detail.reservation_url||detail.bookingUrl||detail.booking_url||'',
          email:enriched.email||detail.email||detail.contactEmail||''
        };
      }catch(error){console.debug('[Luvia Booking] Place-Details für Provider-Routing konnten nicht nachgeladen werden.',error?.message||error)}
    }
    return enriched;
  }

  async function resolveRouteCached(place){
    const firstKey=cacheKey(place);
    if(routeCache.has(firstKey))return routeCache.get(firstKey);
    const promise=(async()=>{
      const enriched=await enrichPlace(place);
      const enrichedKey=cacheKey(enriched);
      if(enrichedKey!==firstKey&&routeCache.has(enrichedKey))return routeCache.get(enrichedKey);
      const route=await window.LuviaBooking.resolvePlaceRoute(enriched);
      const resolved={place:enriched,route};
      if(enrichedKey!==firstKey)routeCache.set(enrichedKey,Promise.resolve(resolved));
      return resolved;
    })();
    routeCache.set(firstKey,promise);
    promise.catch(()=>routeCache.delete(firstKey));
    return promise;
  }

  function placeFromButton(button){
    return {
      type:button.dataset.bookingPlaceType,
      id:button.dataset.bookingPlaceId,
      providerPlaceId:button.dataset.bookingPlaceId,
      name:button.dataset.bookingPlaceName,
      email:button.dataset.bookingPlaceEmail,
      website:button.dataset.bookingPlaceWebsite,
      reservationUrl:button.dataset.bookingPlaceReservationUrl
    };
  }

  // Warm the provider route as soon as the user approaches the action. On desktop this
  // normally completes before the click, so the external booking page opens immediately.
  document.addEventListener('pointerover',e=>{
    const button=e.target.closest?.('[data-luvia-booking-place]');
    if(!button||button.dataset.bookingPrefetched==='1')return;
    button.dataset.bookingPrefetched='1';
    resolveRouteCached(placeFromButton(button)).catch(()=>{});
  },{passive:true,capture:true});
  document.addEventListener('focusin',e=>{
    const button=e.target.closest?.('[data-luvia-booking-place]');
    if(!button||button.dataset.bookingPrefetched==='1')return;
    button.dataset.bookingPrefetched='1';
    resolveRouteCached(placeFromButton(button)).catch(()=>{});
  },true);

  // Mobile has no hover. Resolve as soon as a reservation action becomes visible so the
  // verified destination is normally ready before the user's click.
  const bookingObserver=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      const button=entry.target;
      if(button?.dataset?.bookingPrefetched!=='1'){
        button.dataset.bookingPrefetched='1';
        resolveRouteCached(placeFromButton(button)).catch(()=>{});
      }
      bookingObserver.unobserve(button);
    }
  },{rootMargin:'240px'}):null;
  const observeBookingButtons=()=>document.querySelectorAll('[data-luvia-booking-place]').forEach(button=>{
    if(button.dataset.bookingPrefetched!=='1'){button.dataset.bookingPrefetched='1';resolveRouteCached(placeFromButton(button)).catch(()=>{});}
    bookingObserver?.observe(button);
  });
  new MutationObserver(observeBookingButtons).observe(document.documentElement,{childList:true,subtree:true});
  queueMicrotask(observeBookingButtons);

  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-luvia-booking-place]');
    if(!button)return;
    e.preventDefault();
    e.stopPropagation();
    if(button.dataset.bookingBusy==='1')return;
    let place=placeFromButton(button);
    button.dataset.bookingBusy='1';button.disabled=true;
    try{
      // If a warmed route already exists, this resolves immediately. Otherwise open one
      // lightweight Luvia handoff tab while the authenticated resolver validates the route.
      const key=cacheKey(place);
      const warmed=routeCache.has(key);
      let handoffWindow=null;
      if(!warmed){
        try{handoffWindow=window.open('/booking-handoff.html','_blank');if(handoffWindow)handoffWindow.opener=null}catch{}
      }
      const resolved=await resolveRouteCached(place);
      place=resolved.place||place;
      const route=resolved.route;
      if(route?.resolved&&route.channel==='external_link'&&route.value){
        let target=null;try{target=new URL(route.value);if(!/^https?:$/.test(target.protocol))throw new Error('invalid')}catch{throw new Error('Der gefundene Buchungslink ist ungültig.')}
        window.LuviaBooking.recordPlaceHandoff?.(place,{...route,value:target.toString()}).catch(error=>console.debug('[Luvia Booking] Handoff-Attribution konnte nicht protokolliert werden.',error?.message||error));
        if(handoffWindow&&!handoffWindow.closed){handoffWindow.location.replace(target.toString());return;}
        const opened=window.open(target.toString(),'_blank','noopener,noreferrer');
        if(!opened)window.LuviaUIKit?.toast?.('Der Browser hat das Buchungsfenster blockiert. Bitte Pop-ups für Luvia erlauben und erneut auf „Reservieren“ klicken.',{type:'warning'});
        return;
      }
      if(handoffWindow&&!handoffWindow.closed)handoffWindow.close();
      place._bookingContactChecked=true;
      place._bookingContactReason=route?.reason||'NO_VERIFIED_ROUTE';
      if(route?.resolved&&route.channel==='email'&&route.value)place.email=route.value;
      await open(place);
    }catch(error){
      try{for(const w of [])w.close()}catch{}
      console.warn('[Luvia Booking] Route-Preview fehlgeschlagen; sicherer Fallback wird geöffnet.',error);
      place._bookingContactChecked=false;
      await open(place);
    }finally{
      button.dataset.bookingBusy='0';button.disabled=false;
    }
  },true);


  window.LuviaBookingUI=Object.freeze({version:VERSION,actionButton,open});
})();