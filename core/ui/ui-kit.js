(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cls=(...items)=>items.flat().filter(Boolean).join(' ');
  const card=({className='',title='',subtitle='',content='',actions='' }={})=>`<article class="${cls('lv-ui-card',className)}">${title?`<header><h3>${esc(title)}</h3>${subtitle?`<p>${esc(subtitle)}</p>`:''}</header>`:''}<div>${content}</div>${actions?`<footer>${actions}</footer>`:''}</article>`;
  const chip=({label,icon='',active=false,disabled=false,attrs='' }={})=>`<button type="button" class="lv-ui-chip${active?' is-active':''}" aria-pressed="${active}" ${disabled?'disabled':''} ${attrs}>${icon?`<span>${icon}</span>`:''}<span>${esc(label)}</span></button>`;
  const state=({type='empty',title='',message='',action='' }={})=>`<section class="lv-ui-${type}" role="status"><div>${title?`<h3>${esc(title)}</h3>`:''}${message?`<p>${esc(message)}</p>`:''}${action}</div></section>`;
  const moduleShell=({kicker='',title='',subtitle='',toolbar='',content='' }={})=>`<section class="lv-module"><header class="lv-module-hero">${kicker?`<span class="lv-kicker">${esc(kicker)}</span>`:''}<h1 class="lv-module-title">${esc(title)}</h1>${subtitle?`<p class="lv-module-subtitle">${esc(subtitle)}</p>`:''}${toolbar?`<div class="lv-module-toolbar">${toolbar}</div>`:''}</header><div class="lv-module-content">${content}</div></section>`;
  window.LuviaUIKit=Object.freeze({version:'3.0.0',esc,cls,card,chip,state,moduleShell});
  window.dispatchEvent(new CustomEvent('luvia:ui-kit-ready',{detail:window.LuviaUIKit}));
})();
