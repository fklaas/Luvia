(function(){
'use strict';
const VERSION='0.4.0';
const INTENTS=Object.freeze(['confirmed','declined','alternative_proposed','needs_action','informational','unknown']);
const HIGH_CONFIDENCE=0.90;
const REVIEW_CONFIDENCE=0.70;
const clean=v=>String(v??'').replace(/\r\n/g,'\n').trim();
const normalized=v=>clean(v).toLocaleLowerCase('de-DE').normalize('NFKC');
function visibleReply(body=''){
  let text=clean(body);
  const separators=[
    /\n\s*>/i,
    /\n.+\bschrieb am\b.+:/i,
    /\nOn .+ wrote:/i,
    /\nLe .+ a écrit\s*:/i,
    /\n-{2,}\s*Original Message\s*-{2,}/i,
    /\nVon:\s/i,
    /\nFrom:\s/i
  ];
  let cut=text.length;
  for(const re of separators){const m=re.exec(text);if(m&&m.index<cut)cut=m.index;}
  return text.slice(0,cut).trim()||text.slice(0,2000).trim();
}
const includesAny=(t,arr)=>arr.some(x=>t.includes(x));
const matchAny=(t,arr)=>arr.some(r=>r.test(t));
function extract(text){
  const result={};
  const time=text.match(/\b(?:um|at|à)?\s*([01]?\d|2[0-3])[:.]([0-5]\d)\s*(?:uhr|h)?\b/i);
  if(time)result.proposedTime=`${String(time[1]).padStart(2,'0')}:${time[2]}`;
  const date=text.match(/\b([0-3]?\d)[.\/-]([01]?\d)[.\/-](20\d{2})\b/);
  if(date)result.proposedDate=`${date[3]}-${String(date[2]).padStart(2,'0')}-${String(date[1]).padStart(2,'0')}`;
  return result;
}
function classifyReply({subject='',bodyText=''}={}){
  const visible=visibleReply(bodyText);
  const t=normalized(`${subject}\n${visible}`);
  const evidence=[];
  let intent='unknown',confidence=0.45,proposedStatus=null,requiresUserAction=true;

  const decline=[
    /\bleider\b.{0,80}\b(nicht|keine|kein|ausgebucht|voll)\b/i,
    /\b(nicht möglich|nicht verf[üu]gbar|keine verf[üu]gbarkeit|ausgebucht|vollst[äa]ndig belegt)\b/i,
    /\b(k[öo]nnen wir .* nicht best[äa]tigen|reservierung .* nicht best[äa]tigt)\b/i,
    /\b(unfortunately|fully booked|no availability|cannot confirm|unable to accommodate)\b/i,
    /\b(complet|aucune disponibilit[ée]|ne pouvons pas confirmer|impossible)\b/i
  ];
  const alternatives=[
    /\b(stattdessen|alternativ|als alternative|ander(?:e|er|en) uhrzeit|anderen termin)\b/i,
    /\b(k[öo]nnen .* (?:um|gegen)\s*\d{1,2}[:.]\d{2}\b)/i,
    /\b(offer|alternative|instead|another time|available at)\b/i,
    /\b(proposons|alternative|disponible [àa])\b/i
  ];
  const confirm=[
    /^(best[äa]tigt|confirmed|confirm[ée]e?)\s*[.!]?$/i,
    /\b(reservierung|buchung|tisch).{0,40}\b(ist|wurde|wird)\s+(?:hiermit\s+)?best[äa]tigt\b/i,
    /\b(gerne|hiermit)\s+best[äa]tigen wir\b/i,
    /\b(ist f[üu]r sie reserviert|haben wir .* reserviert)\b/i,
    /\b(we confirm|reservation is confirmed|your booking is confirmed|table is reserved)\b/i,
    /\b(r[ée]servation .* confirm[ée]e|nous confirmons|table .* r[ée]serv[ée]e)\b/i
  ];
  const action=[
    /\b(kreditkarte|kartendaten|anzahlung|vorkasse|zahlung|deposit|prepayment|credit card|carte bancaire|acompte)\b/i,
    /\b(bitte .* (best[äa]tigen|antworten|anrufen|kontaktieren|ausw[äa]hlen))\b/i,
    /\b(please (confirm|reply|call|choose|provide))\b/i,
    /\b(merci de (confirmer|r[ée]pondre|appeler|choisir))\b/i
  ];
  const info=[/\b(wir melden uns|in bearbeitung|wird gepr[üu]ft|we will get back|under review|nous revenons vers vous)\b/i];

  if(matchAny(t,decline)){
    intent='declined';confidence=0.97;proposedStatus='declined';requiresUserAction=false;evidence.push('explicit_decline');
  }else if(matchAny(t,alternatives)){
    intent='alternative_proposed';confidence=0.94;proposedStatus='needs_action';requiresUserAction=true;evidence.push('explicit_alternative');
  }else if(matchAny(t,confirm)){
    intent='confirmed';confidence=0.98;proposedStatus='confirmed';requiresUserAction=false;evidence.push('explicit_confirmation');
  }else if(matchAny(t,action)){
    intent='needs_action';confidence=0.92;proposedStatus='needs_action';requiresUserAction=true;evidence.push('explicit_action_required');
  }else if(matchAny(t,info)){
    intent='informational';confidence=0.82;proposedStatus=null;requiresUserAction=false;evidence.push('informational_reply');
  }else if(includesAny(t,['bestätigen','confirm','réservation','reservierung','buchung'])){
    intent='unknown';confidence=0.62;proposedStatus=null;requiresUserAction=true;evidence.push('booking_language_without_decision');
  }

  const extracted=extract(visible);
  const autoApply=confidence>=HIGH_CONFIDENCE && Boolean(proposedStatus);
  return Object.freeze({
    version:VERSION,intent,confidence,proposedStatus,autoApply,requiresUserAction,
    reviewRequired:!autoApply && confidence>=REVIEW_CONFIDENCE,
    visibleReply:visible,evidence:Object.freeze(evidence),extracted:Object.freeze(extracted)
  });
}
window.LuviaBookingReservationIntelligence=Object.freeze({version:VERSION,INTENTS,HIGH_CONFIDENCE,REVIEW_CONFIDENCE,visibleReply,classifyReply});
})();
