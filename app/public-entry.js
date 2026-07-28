(() => {
  'use strict';
  const state={idea:null,dialog:null};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const ideas=[
    ['place','An einen bestimmten Ort'],
    ['weekend','An ein freies Wochenende'],
    ['sun','An Sonne und Meer'],
    ['family','An eine Familienreise'],
    ['open','Ich weiß es noch nicht genau']
  ];
  function page(){return `<main class="lv-entry" data-entry-root>
    <nav class="lv-entry-nav" aria-label="Hauptnavigation">
      <a class="lv-entry-brand" href="/" aria-label="Luvia Startseite"><img src="luvia-logo.svg" alt=""><span>Luvia</span></a>
      <div class="lv-entry-navlinks"><button class="lv-entry-navbutton" data-entry-scroll="story">So funktioniert es</button><button class="lv-entry-navbutton" data-entry-invite>Einladung</button><button class="lv-entry-navbutton is-primary" data-entry-login>Anmelden</button></div>
    </nav>
    <section class="lv-entry-hero" aria-labelledby="entry-title">
      <span class="lv-thought t1">Vielleicht Paris?</span><span class="lv-thought t2">Ein Wochenende am Meer</span><span class="lv-thought t3">Nur wir drei</span><span class="lv-thought t4">Momente festhalten</span><span class="lv-thought t5">Schön essen gehen</span><span class="lv-thought t6">Unser nächstes Abenteuer</span>
      <div class="lv-entry-hero-copy"><span class="lv-entry-eyebrow">Von der ersten Idee bis zur Erinnerung</span><h1 id="entry-title">Wohin führt euch eure nächste Geschichte?</h1><p class="lv-entry-lead">Luvia begleitet euch von der ersten Reiseidee über die gemeinsame Planung bis zu den Erinnerungen, die bleiben.</p><div class="lv-entry-actions"><button class="lv-entry-cta is-main" data-entry-start>Reise beginnen</button><button class="lv-entry-cta is-soft" data-entry-invite>Ich wurde eingeladen</button></div><p class="lv-entry-login-note">Bereits bei Luvia? <button class="lv-entry-inline" data-entry-login>Anmelden</button></p></div>
      <span class="lv-entry-scroll">Entdecken</span>
    </section>
    <section class="lv-entry-section" id="story"><div class="lv-entry-section-head"><span class="lv-entry-kicker">Eine Reise entsteht nicht auf einmal</span><h2>Erst ein Gedanke. Dann euer Plan. Später eure Geschichte.</h2><p>Luvia lässt euch klein anfangen und wächst mit jeder Entscheidung. Ohne komplizierte Formulare und ohne dass schon alles feststehen muss.</p></div><div class="lv-story-grid"><article class="lv-story-card"><span class="lv-story-number">01</span><h3>Eine Idee festhalten</h3><p>Vielleicht ein Ort, ein freies Wochenende oder nur das Gefühl, gemeinsam raus zu wollen.</p></article><article class="lv-story-card"><span class="lv-story-number">02</span><h3>Gemeinsam planen</h3><p>Unterkunft, Lieblingsorte, Wege und kleine Wünsche finden nach und nach ihren Platz.</p></article><article class="lv-story-card"><span class="lv-story-number">03</span><h3>Erinnerungen bewahren</h3><p>Aus Fotos, Orten und besonderen Momenten entsteht eure persönliche Reisegeschichte.</p></article></div></section>
    <section class="lv-entry-section"><div class="lv-entry-section-head"><span class="lv-entry-kicker">Ein Begleiter für die ganze Reise</span><h2>Genau der nächste Schritt. Nicht alles auf einmal.</h2><p>Luvia führt euch sanft durch die Reise, bleibt aber offen für euren ganz eigenen Ablauf.</p></div><div class="lv-journey-line"><div class="lv-journey-step"><span class="lv-journey-dot"></span><strong>Idee</strong><small>Einen Gedanken festhalten</small></div><div class="lv-journey-step"><span class="lv-journey-dot"></span><strong>Planen</strong><small>Entscheidungen gemeinsam treffen</small></div><div class="lv-journey-step"><span class="lv-journey-dot"></span><strong>Entdecken</strong><small>Passende Orte und Möglichkeiten finden</small></div><div class="lv-journey-step"><span class="lv-journey-dot"></span><strong>Erleben</strong><small>Den Tag entspannt begleiten lassen</small></div><div class="lv-journey-step"><span class="lv-journey-dot"></span><strong>Erinnern</strong><small>Die Geschichte weiterleben lassen</small></div></div></section>
    <section class="lv-entry-final"><span class="lv-entry-kicker">Eure Reise wartet</span><h2>Vielleicht beginnt eure nächste Geschichte genau hier.</h2><p class="lv-entry-lead">Noch ist es nur ein Gedanke. Lass uns etwas daraus machen.</p><div class="lv-entry-actions"><button class="lv-entry-cta is-main" data-entry-start>Neue Reise beginnen</button><button class="lv-entry-cta is-soft" data-entry-login>Bei Luvia anmelden</button></div></section>
    <footer class="lv-entry-footer"><strong>Luvia</strong><span>Gemeinsam reisen. Für immer erinnern.</span><span>Build 13.3.0</span></footer>
    <div data-entry-dialog></div>
  </main>`}
  function ideaDialog(){return `<div class="lv-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="flow-title"><section class="lv-entry-panel"><button class="lv-entry-close" data-entry-close aria-label="Schließen">×</button><div class="lv-flow-head"><small>Der erste Gedanke</small><h2 id="flow-title">Woran denkst du gerade?</h2><p>Du musst noch nichts fertig geplant haben. Wähle einfach das, was deiner Reiseidee gerade am nächsten kommt.</p></div><div class="lv-thought-options">${ideas.map(([value,label])=>`<button class="lv-thought-option" data-entry-idea="${value}" data-label="${esc(label)}">${esc(label)}</button>`).join('')}</div><form class="lv-flow-write" data-entry-free><input name="idea" maxlength="120" placeholder="Oder schreib deinen Gedanken auf …" aria-label="Eigene Reiseidee"><button>Festhalten</button></form></section></div>`}
  function authDialog(mode='register'){const idea=state.idea?.label;return `<div class="lv-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title"><section class="lv-entry-panel"><button class="lv-entry-close" data-entry-close aria-label="Schließen">×</button>${mode==='register'?'<button class="lv-entry-back" data-entry-back>← Zurück zum Gedanken</button>':''}<div class="lv-flow-head"><small>${mode==='register'?'Deine Idee festhalten':'Willkommen zurück'}</small><h2 id="auth-title">${mode==='register'?'Lass uns daraus eure Reise machen.':'Schön, dass du wieder da bist.'}</h2><p>${mode==='register'?'Erstelle jetzt dein Konto. Im nächsten Schritt wird aus deinem Gedanken eine echte Luvia-Reise.':'Melde dich an und setze eure Reise dort fort, wo ihr aufgehört habt.'}</p></div>${idea&&mode==='register'?`<div class="lv-flow-summary"><span>${esc(idea)}</span><small>bleibt für diesen Einstieg vorgemerkt</small></div>`:''}<div class="lv-auth-entry" data-entry-auth></div></section></div>`}
  function setDialog(root,html){const host=root.querySelector('[data-entry-dialog]');if(!host)return;host.innerHTML=html||'';if(html){document.body.style.overflow='hidden';requestAnimationFrame(()=>host.querySelector('button,input')?.focus())}else document.body.style.overflow=''}
  function openIdea(root){state.dialog='idea';setDialog(root,ideaDialog())}
  function openAuth(root,mode){state.dialog=mode;setDialog(root,authDialog(mode));window.ParisAuthUI?.renderAuthForm?.(root.querySelector('[data-entry-auth]'),mode)}
  function selectIdea(root,value,label){state.idea={value,label,createdAt:new Date().toISOString()};window.LuviaGuidedJourneyEntry?.emit?.();openAuth(root,'register')}
  function render(root){root.innerHTML=page();root.dataset.entryMounted='true';if(root.dataset.entryBound==='true')return;root.dataset.entryBound='true';root.addEventListener('click',event=>{
      const target=event.target.closest('button,a');if(!target)return;
      if(target.matches('[data-entry-start]')){event.preventDefault();openIdea(root)}
      else if(target.matches('[data-entry-login]')){event.preventDefault();openAuth(root,'login')}
      else if(target.matches('[data-entry-invite]')){event.preventDefault();window.LuviaJoinFlow?.openCodeEntry?.()}
      else if(target.matches('[data-entry-close]')){event.preventDefault();state.dialog=null;setDialog(root,'')}
      else if(target.matches('[data-entry-back]')){event.preventDefault();openIdea(root)}
      else if(target.matches('[data-entry-idea]')){event.preventDefault();selectIdea(root,target.dataset.entryIdea,target.dataset.label)}
      else if(target.matches('[data-entry-scroll]')){event.preventDefault();document.getElementById(target.dataset.entryScroll)?.scrollIntoView({behavior:'smooth'})}
    });
    root.addEventListener('submit',event=>{const form=event.target.closest('[data-entry-free]');if(!form)return;event.preventDefault();const value=String(new FormData(form).get('idea')||'').trim();if(value)selectIdea(root,'custom',value);else form.querySelector('input')?.focus()});
  }
  function emit(){window.dispatchEvent(new CustomEvent('luvia:guided-entry-idea',{detail:snapshot()}))}
  function snapshot(){return Object.freeze({version:'13.3.0',idea:state.idea?{...state.idea}:null,dialog:state.dialog,persistence:'memory-until-auth'})}
  window.LuviaGuidedJourneyEntry=Object.freeze({version:'13.3.0',render,openIdea,openAuth,snapshot,emit});
})();
