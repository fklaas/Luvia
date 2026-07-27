(() => {
  'use strict';
  const DEFAULT='#ee6f83';let media=null,listener=null;
  const clamp=n=>Math.max(0,Math.min(255,Math.round(n))),normalize=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():DEFAULT;
  const rgb=h=>({r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)}),hex=o=>'#'+[o.r,o.g,o.b].map(v=>clamp(v).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,w)=>{const x=rgb(normalize(a)),y=rgb(normalize(b));return hex({r:x.r+(y.r-x.r)*w,g:x.g+(y.g-x.g)*w,b:x.b+(y.b-x.b)*w})};
  const luminance=c=>{const x=rgb(normalize(c));return(.2126*x.r+.7152*x.g+.0722*x.b)/255};
  function palette(accent){const a=normalize(accent);return{accent:a,hover:mix(a,'#000000',.12),soft:mix(a,'#ffffff',.84),muted:mix(a,'#ffffff',.66),border:mix(a,'#ffffff',.54),contrast:luminance(a)>.62?'#203142':'#fff',shadow:`0 18px 50px ${mix(a,'#ffffff',.62)}80`};}
  function resolved(mode){return mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):(mode==='dark'?'dark':'light');}
  function apply(input){const trip=input||window.LuviaTripStore?.snapshot?.().activeTrip||{},profile=window.LuviaProfileService?.snapshot?.().profile||{},mode=profile.themeMode||'system',actual=resolved(mode),accent=profile.useTripAccent===false?(profile.avatarColor||DEFAULT):(trip.accent||profile.avatarColor||DEFAULT),p=palette(accent),html=document.documentElement,s=html.style;html.dataset.theme=actual;html.dataset.themeMode=mode;html.dataset.density=profile.density||'comfortable';html.classList.toggle('reduce-motion',Boolean(profile.reducedMotion));Object.entries({'--lv-accent':p.accent,'--trip-accent':p.accent,'--trip-accent-hover':p.hover,'--trip-accent-soft':p.soft,'--trip-accent-muted':p.muted,'--trip-accent-border':p.border,'--trip-accent-contrast':p.contrast,'--trip-accent-shadow':p.shadow}).forEach(([k,v])=>s.setProperty(k,v));document.querySelector('meta[name="theme-color"]')?.setAttribute('content',actual==='dark'?'#17232d':p.soft);window.dispatchEvent(new CustomEvent('luvia:theme-changed',{detail:{mode,resolved:actual,palette:p,tripId:trip.id||null}}));return {mode,resolved:actual,palette:p};}
  function watch(){if(media)return;media=matchMedia('(prefers-color-scheme: dark)');listener=()=>{if((window.LuviaProfileService?.snapshot?.().profile?.themeMode||'system')==='system')apply()};media.addEventListener?.('change',listener);}
  watch();window.LuviaTheme=Object.freeze({version:'2.0.0',apply,palette,normalize,resolved});
})();
