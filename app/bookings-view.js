(() => {
  'use strict';
  const VERSION='1.1.0';
  let root=null,trip=null,busy=new Set(),feedback=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STATUS={draft:'Entwurf',ready:'Bereit',requested:'Angefragt',awaiting_reply:'Antwort ausstehend',confirmed:'Bestätigt',declined:'Abgelehnt',needs_action:'Aktion nötig',cancelled:'Storniert',failed:'Fehler'};
  const TYPE={restaurant:'Restaurant',hotel:'Unterkunft',activity:'Aktivität',event:'Event',transport:'Transport',rental:'Mietobjekt',other:'Buchung'};
  const PROVIDER={opentable:'OpenTable',thefork:'TheFork',resy:'Resy',sevenrooms:'SevenRooms',quandoo:'Quandoo',zenchef:'Zenchef',covermanager:'CoverManager',resdiary:'ResDiary',tablecheck:'TableCheck',official_website:'Offizielle Website'};
  const fmt=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(d)};
  const msg=(id,text,type='info')=>{feedback.set(id,{text,type});};
  const providerName=v=>PROVIDER[String(v||'').toLowerCase()]||String(v||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const bookingUrl=b=>b?.contact?.bookingUrl||b?.contact?.booking_url||'';
  function routeLabel(b){
    if(b.channel==='external_link'&&bookingUrl(b))return `${providerName(b.provider)||'Reservierung'} · Direkt reservieren`;
    if(b.channel==='email'&&b.contact?.email)return `${providerName(b.provider)||'E-Mail'} · Luvia kann anfragen`;
    if(b.channel==='api')return `${providerName(b.provider)||'Direkt'} · In Luvia buchbar`;
    return '';
  }
  function card(b){
    const email=b.contact?.email||'';
    const url=bookingUrl(b);
    const canSend=['ready','needs_action'].includes(b.status)&&email&&b.channel==='email';
    const canOpen=['ready','needs_action'].includes(b.status)&&b.channel==='external_link'&&url;
    const canCancel=!['cancelled'].includes(b.status);
    const note=feedback.get(b.id);
    const route=routeLabel(b);
    return `<article class="lv-booking-card" data-booking-id="${esc(b.id)}">
      <div class="lv-booking-card-head"><div><small>${esc(TYPE[b.booking_type]||TYPE.other)}</small><h3>${esc(b.title||'Buchung')}</h3></div><span class="lv-booking-status">${esc(STATUS[b.status]||b.status)}</span></div>
      <div class="lv-booking-meta">${b.start_at?`<span>🗓️ ${esc(fmt(b.start_at))}</span>`:''}<span>👥 ${Number(b.party_size||1)}</span>${route?`<span>↗ ${esc(route)}</span>`:''}${b.confirmation_number?`<span>✓ ${esc(b.confirmation_number)}</span>`:''}${b.open_dead_letters?`<span>⚠️ ${b.open_dead_letters} Fehler</span>`:''}</div>
      <div class="lv-booking-card-actions">
        ${canOpen?`<button type="button" class="is-primary" data-booking-open-route="${esc(b.id)}" data-booking-route-url="${esc(url)}">Bei ${esc(providerName(b.provider)||'Anbieter')} reservieren</button>`:''}
        ${canSend?`<button type="button" class="is-primary" data-booking-send="${esc(b.id)}" ${busy.has(b.id)?'disabled':''}>${busy.has(b.id)?'Wird gesendet …':'Verbindlich senden'}</button>`:''}
        ${!url&&!email&&['ready','needs_action'].includes(b.status)?`<button type="button" data-booking-resolve="${esc(b.id)}" ${busy.has(b.id)?'disabled':''}>Buchungskanal automatisch suchen</button><button type="button" data-booking-contact="${esc(b.id)}" ${busy.has(b.id)?'disabled':''}>Kontakt manuell ergänzen</button>`:''}
        ${b.status==='confirmed'?'<span>✓ Reservierung bestätigt</span>':''}
        ${canCancel?`<button type="button" data-booking-cancel="${esc(b.id)}" ${busy.has(b.id)?'disabled':''}>Stornieren</button>`:''}
      </div>
      ${note?`<div class="lv-booking-action-feedback is-${esc(note.type)}" role="status">${esc(note.text)}</div>`:''}
    </article>`;
  }
  async function load(){
    if(!root||!trip)return;
    root.innerHTML='<section class="lv-bookings-view"><div class="lv-booking-empty">Buchungen werden geladen …</div></section>';
    try{
      const rows=await window.LuviaBooking.listForTrip(trip.id||trip.tripId);
      root.innerHTML=`<section class="lv-bookings-view"><header class="lv-bookings-head"><span>Booking Core</span><h1>Buchungen & Reservierungen</h1><p>Luvia bevorzugt direkte Buchungsanbieter und offizielle Reservierungswege. E-Mail ist nur der Fallback.</p></header>${rows.length?`<div class="lv-booking-list">${rows.map(card).join('')}</div>`:`<div class="lv-booking-empty"><strong>Noch keine Buchungsanfragen.</strong><p>Öffne ein reservierbares Restaurant oder eine Unterkunft in Places und wähle „Reservieren“ bzw. „Buchen“.</p></div>`}</section>`;
    }catch(error){
      root.innerHTML=`<section class="lv-bookings-view"><div class="lv-booking-empty"><strong>Buchungen konnten nicht geladen werden.</strong><p>${esc(error?.message||'Unbekannter Fehler')}</p></div></section>`;
    }
  }
  async function run(id,label,job){
    if(busy.has(id))return;
    busy.add(id);msg(id,label,'info');await load();
    try{const result=await job();busy.delete(id);return result}
    catch(error){busy.delete(id);msg(id,error?.message||'Aktion fehlgeschlagen.','error');console.error('[Luvia Booking] action failed',error);await load();throw error}
  }
  async function handleClick(e){
    const open=e.target.closest?.('[data-booking-open-route]');
    if(open){e.preventDefault();e.stopPropagation();const url=open.dataset.bookingRouteUrl;try{const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw new Error('Ungültiger Buchungslink.');window.open(parsed.toString(),'_blank','noopener,noreferrer')}catch(error){msg(open.dataset.bookingOpenRoute,error?.message||'Buchungslink konnte nicht geöffnet werden.','error');await load()}return;}
    const send=e.target.closest?.('[data-booking-send]');
    if(send){e.preventDefault();e.stopPropagation();const id=send.dataset.bookingSend;try{await run(id,'Buchungsanfrage wird sicher versendet …',()=>window.LuviaBooking.sendEmail(id,{}));msg(id,'Buchungsanfrage wurde versendet.','success');await load()}catch{}return;}
    const cancel=e.target.closest?.('[data-booking-cancel]');
    if(cancel){e.preventDefault();e.stopPropagation();const id=cancel.dataset.bookingCancel;if(!confirm('Diese Buchungsanfrage wirklich stornieren?'))return;try{await run(id,'Buchungsanfrage wird storniert …',()=>window.LuviaBooking.cancel(id));msg(id,'Buchungsanfrage wurde storniert.','success');await load()}catch{}return;}
    const resolve=e.target.closest?.('[data-booking-resolve]');
    if(resolve){e.preventDefault();e.stopPropagation();const id=resolve.dataset.bookingResolve;try{const result=await run(id,'Bester belegbarer Buchungskanal wird gesucht …',()=>window.LuviaBooking.resolveRoute(id));const label=result?.resolved?(result.channel==='external_link'?`${providerName(result.provider)||'Direkter Buchungsweg'} gefunden.`:'Sicherer Buchungskanal gefunden.'):'Kein sicherer automatischer Buchungskanal gefunden.';msg(id,label,result?.resolved?'success':'info');await load()}catch{}return;}
    const contact=e.target.closest?.('[data-booking-contact]');
    if(contact){e.preventDefault();e.stopPropagation();const id=contact.dataset.bookingContact;const email=prompt('Öffentliche bzw. verifizierte Kontakt-E-Mail des Anbieters:','');if(!email)return;try{await run(id,'Kontakt wird gespeichert …',()=>window.LuviaBooking.updateContact(id,email));msg(id,'Kontakt gespeichert.','success');await load()}catch{}return;}
  }
  function globalClick(e){
    if(!root?.isConnected)return;
    if(!e.target.closest?.('[data-booking-open-route],[data-booking-send],[data-booking-cancel],[data-booking-resolve],[data-booking-contact]'))return;
    const bookingView=e.target.closest?.('.lv-bookings-view');
    if(!bookingView||!root.contains(bookingView))return;
    handleClick(e).catch(error=>console.error('[Luvia Booking] action handler',error));
  }
  document.addEventListener('click',globalClick,true);
  async function mount(node,activeTrip){root=node;trip=activeTrip;await window.LuviaBooking.init();await load();}
  function unmount(){root=null;trip=null;busy.clear();feedback.clear();}
  window.addEventListener('luvia:booking-changed',()=>{if(root?.isConnected)load().catch(console.warn)});
  window.LuviaBookingsView=Object.freeze({version:VERSION,mount,unmount,load});
})();
