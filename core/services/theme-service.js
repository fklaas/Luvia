(() => {
  'use strict';
  const DEFAULT='#ee6f83';
  const clamp=n=>Math.max(0,Math.min(255,Math.round(n)));
  const normalize=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toLowerCase():DEFAULT;
  const rgb=hex=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)});
  const hex=({r,g,b})=>'#'+[r,g,b].map(v=>clamp(v).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,weight)=>{const x=rgb(normalize(a)),y=rgb(normalize(b)),w=Math.max(0,Math.min(1,weight));return hex({r:x.r+(y.r-x.r)*w,g:x.g+(y.g-x.g)*w,b:x.b+(y.b-x.b)*w})};
  const luminance=color=>{const c=rgb(normalize(color));return (0.2126*c.r+0.7152*c.g+0.0722*c.b)/255};
  function palette(accent){const base=normalize(accent);return{accent:base,hover:mix(base,'#000000',.12),soft:mix(base,'#ffffff',.84),muted:mix(base,'#ffffff',.66),border:mix(base,'#ffffff',.54),contrast:luminance(base)>.62?'#203142':'#ffffff',shadow:`0 18px 50px ${mix(base,'#ffffff',.62)}80`};}
  function apply(input){const trip=input||window.LuviaTripStore?.snapshot?.().activeTrip||{};const p=palette(trip.accent||trip.color||DEFAULT),style=document.documentElement.style;style.setProperty('--lv-accent',p.accent);style.setProperty('--trip-accent',p.accent);style.setProperty('--trip-accent-hover',p.hover);style.setProperty('--trip-accent-soft',p.soft);style.setProperty('--trip-accent-muted',p.muted);style.setProperty('--trip-accent-border',p.border);style.setProperty('--trip-accent-contrast',p.contrast);style.setProperty('--trip-accent-shadow',p.shadow);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',p.soft);window.dispatchEvent(new CustomEvent('luvia:theme-changed',{detail:{tripId:trip.id||trip.tripId||null,palette:p}}));return p;}
  window.LuviaTheme=Object.freeze({version:'1.0.0',apply,palette,normalize});
})();
