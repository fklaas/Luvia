(() => {
  'use strict';
  const VERSION='1.0.3';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const canonicalType=raw=>{
    const type=String(raw||'').toLowerCase();
    if(type==='restaurant'||type.includes('restaurant')||['cafe','café','bar','bakery','meal_takeaway','meal_delivery','food'].includes(type))return 'restaurant';
    if(['accommodation','hotel','lodging','motel','hostel','resort_hotel','bed_and_breakfast','guest_house'].includes(type)||type.includes('hotel'))return 'accommodation';
    return type;
  };
  const capable=type=>{
    const canonical=canonicalType(type);
    if(['restaurant','accommodation'].includes(canonical))return true;
    return Boolean(window.LuviaPlaceTypeContracts?.capability?.(canonical,'reservation')||window.LuviaPlaceTypeContracts?.capability?.(canonical,'booking'));
  };

  function actionButton({placeType,place}={}){
    const type=canonicalType(placeType||place?.primaryType||place?.primary_type||'');
    if(!capable(type))return '';
    const label=type==='accommodation'?'Buchen':'Reservieren';
    const pid=place?.providerPlaceId||place?.provider_place_id||place?.id||'';
    const name=place?.name||'';
    const email=place?.email||place?.contactEmail||'';
    return `<button type="button" class="luv-place-primary-action" data-luvia-booking-place data-booking-place-type="${esc(type)}" data-booking-place-id="${esc(pid)}" data-booking-place-name="${esc(name)}" data-booking-place-email="${esc(email)}">◇ ${label}</button>`;
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
          <label><span>Kontakt-E-Mail des Anbieters <small>(falls bekannt)</small></span><input type="email" data-booking-email value="${esc(place.email||'')}" placeholder="reservierung@…"></label>
          <label class="is-wide"><span>Wunsch / Hinweis</span><textarea data-booking-note rows="3" placeholder="z. B. Kinderwagen, ruhiger Tisch, spätes Check-in …"></textarea></label>
        </div>
        <div class="lv-booking-safety">
          <strong>So funktioniert es</strong>
          <p>Luvia legt eine Buchungsanfrage an. Bei einer verifizierten E-Mail kann sie nach deiner ausdrücklichen Freigabe versendet werden. Ohne sicheren Kontakt bleibt die Anfrage als Aufgabe offen – Luvia rät keine Adressen.</p>
        </div>
        <div class="lv-booking-actions">
          <button type="button" data-booking-close>Abbrechen</button>
          <button type="button" class="is-primary" data-booking-create>Anfrage anlegen</button>
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
        result.innerHTML=hasEmail
          ? `<strong>Anfrage vorbereitet.</strong><p>Die Buchungsanfrage wurde in Luvia angelegt. Du kannst sie im Bereich „Buchungen“ verbindlich versenden.</p>`
          : `<strong>Anfrage angelegt.</strong><p>Für diesen Ort liegt noch keine sichere E-Mail-Adresse vor. Luvia hält die Anfrage offen und verwendet keine geratenen Kontaktdaten.</p>`;
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

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-luvia-booking-place]');
    if(!button)return;
    e.preventDefault();
    e.stopPropagation();
    open({
      type:button.dataset.bookingPlaceType,
      id:button.dataset.bookingPlaceId,
      providerPlaceId:button.dataset.bookingPlaceId,
      name:button.dataset.bookingPlaceName,
      email:button.dataset.bookingPlaceEmail
    }).catch(console.error);
  },true);

  window.LuviaBookingUI=Object.freeze({version:VERSION,actionButton,open});
})();