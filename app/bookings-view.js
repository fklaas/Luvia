(() => {
  'use strict';
  const VERSION='1.0.3';
  let root=null,trip=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STATUS={
    draft:'Entwurf',ready:'Bereit',requested:'Angefragt',awaiting_reply:'Antwort ausstehend',
    confirmed:'Bestätigt',declined:'Abgelehnt',needs_action:'Aktion nötig',cancelled:'Storniert',failed:'Fehler'
  };
  const TYPE={restaurant:'Restaurant',hotel:'Unterkunft',activity:'Aktivität',event:'Event',transport:'Transport',rental:'Mietobjekt',other:'Buchung'};
  const fmt=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(d)};
  function card(b){
    const email=b.contact?.email||'';
    const canSend=['ready','needs_action'].includes(b.status)&&email;
    const canCancel=!['cancelled','declined'].includes(b.status);
    return `<article class="lv-booking-card" data-booking-id="${esc(b.id)}">
      <div class="lv-booking-card-head"><div><small>${esc(TYPE[b.booking_type]||TYPE.other)}</small><h3>${esc(b.title||'Buchung')}</h3></div><span class="lv-booking-status">${esc(STATUS[b.status]||b.status)}</span></div>
      <div class="lv-booking-meta">${b.start_at?`<span>🗓️ ${esc(fmt(b.start_at))}</span>`:''}<span>👥 ${Number(b.party_size||1)}</span>${b.provider?`<span>↗ ${esc(b.provider)}</span>`:''}${b.confirmation_number?`<span>✓ ${esc(b.confirmation_number)}</span>`:''}${b.open_dead_letters?`<span>⚠️ ${b.open_dead_letters} Fehler</span>`:''}</div>
      <div class="lv-booking-card-actions">
        ${canSend?`<button type="button" class="is-primary" data-booking-send="${esc(b.id)}">Verbindlich senden</button>`:''}
        ${!email&&['ready','needs_action'].includes(b.status)?`<button type="button" data-booking-resolve="${esc(b.id)}">Kontakt automatisch suchen</button><button type="button" data-booking-contact="${esc(b.id)}">Kontakt manuell ergänzen</button>`:''}
        ${b.status==='confirmed'?'<span>✓ Reservierung bestätigt</span>':''}
        ${canCancel?`<button type="button" data-booking-cancel="${esc(b.id)}">Stornieren</button>`:''}
      </div>
    </article>`;
  }
  async function load(){
    if(!root||!trip)return;
    root.innerHTML='<section class="lv-bookings-view"><div class="lv-booking-empty">Buchungen werden geladen …</div></section>';
    try{
      const rows=await window.LuviaBooking.listForTrip(trip.id||trip.tripId);
      root.innerHTML=`<section class="lv-bookings-view"><header class="lv-bookings-head"><span>Booking Core</span><h1>Buchungen & Reservierungen</h1><p>Anfragen, Antworten und Bestätigungen für diese Reise.</p></header>${rows.length?`<div class="lv-booking-list">${rows.map(card).join('')}</div>`:`<div class="lv-booking-empty"><strong>Noch keine Buchungsanfragen.</strong><p>Öffne ein reservierbares Restaurant oder eine Unterkunft in Places und wähle „Reservieren“ bzw. „Buchen“.</p></div>`}</section>`;
    }catch(error){
      root.innerHTML=`<section class="lv-bookings-view"><div class="lv-booking-empty"><strong>Buchungen konnten nicht geladen werden.</strong><p>${esc(error?.message||'Unbekannter Fehler')}</p></div></section>`;
    }
  }
  async function handleClick(e){
    const send=e.target.closest('[data-booking-send]');
    if(send){e.preventDefault();e.stopPropagation();send.disabled=true;try{await window.LuviaBooking.sendEmail(send.dataset.bookingSend,{});window.LuviaUIKit?.toast?.('Buchungsanfrage wurde versendet.',{type:'success'});await load()}catch(error){console.error('[Luvia Booking] send',error);window.LuviaUIKit?.toast?.(error?.message||'Versand fehlgeschlagen.',{type:'error'});send.disabled=false}return;}
    const cancel=e.target.closest('[data-booking-cancel]');
    if(cancel){e.preventDefault();e.stopPropagation();if(!window.confirm('Diese Buchungsanfrage wirklich stornieren?'))return;cancel.disabled=true;try{await window.LuviaBooking.cancel(cancel.dataset.bookingCancel);window.LuviaUIKit?.toast?.('Buchungsanfrage storniert.',{type:'success'});await load()}catch(error){console.error('[Luvia Booking] cancel',error);window.LuviaUIKit?.toast?.(error?.message||'Stornierung fehlgeschlagen.',{type:'error'});cancel.disabled=false}return;}
    const resolve=e.target.closest('[data-booking-resolve]');
    if(resolve){e.preventDefault();e.stopPropagation();resolve.disabled=true;try{const result=await window.LuviaBooking.resolveContact(resolve.dataset.bookingResolve);if(result?.resolved){window.LuviaUIKit?.toast?.('Offizieller Buchungskontakt gefunden.',{type:'success'})}else{window.LuviaUIKit?.toast?.('Kein sicherer öffentlicher E-Mail-Kontakt gefunden.',{type:'info'})}await load()}catch(error){console.error('[Luvia Booking] resolve contact',error);window.LuviaUIKit?.toast?.(error?.message||'Kontaktsuche fehlgeschlagen.',{type:'error'});resolve.disabled=false}return;}
    const contact=e.target.closest('[data-booking-contact]');
    if(contact){e.preventDefault();e.stopPropagation();const email=window.prompt('Öffentliche bzw. verifizierte Kontakt-E-Mail des Anbieters:','');if(!email)return;contact.disabled=true;try{await window.LuviaBooking.updateContact(contact.dataset.bookingContact,email);window.LuviaUIKit?.toast?.('Kontakt gespeichert.',{type:'success'});await load()}catch(error){console.error('[Luvia Booking] update contact',error);window.LuviaUIKit?.toast?.(error?.message||'Kontakt konnte nicht gespeichert werden.',{type:'error'});contact.disabled=false}}
  }
  async function mount(node,activeTrip){
    if(root&&root!==node)root.removeEventListener('click',handleClick,true);
    root=node;trip=activeTrip;
    root.addEventListener('click',handleClick,true);
    await window.LuviaBooking.init();await load();
  }
  function unmount(){if(root)root.removeEventListener('click',handleClick,true);root=null;trip=null;}
  window.addEventListener('luvia:booking-changed',()=>{if(root?.isConnected)load().catch(console.warn)});
  window.LuviaBookingsView=Object.freeze({version:VERSION,mount,unmount,load});
})();