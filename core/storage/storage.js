(() => {
  'use strict';
  const PREFIX='luvia.';
  const KEYS=Object.freeze({activeTripId:PREFIX+'activeTripId',trips:PREFIX+'trips.v1',migration:PREFIX+'migration.paris.v1'});
  const parse=(v,f)=>{try{return v==null?f:JSON.parse(v)}catch{return f}};
  const api=Object.freeze({
    keys:KEYS,
    get(key,fallback=null){return parse(localStorage.getItem(key),fallback)},
    set(key,value){localStorage.setItem(key,JSON.stringify(value));return value},
    remove(key){localStorage.removeItem(key)},
    getText(key,fallback=''){return localStorage.getItem(key)??fallback},
    setText(key,value){localStorage.setItem(key,String(value));return value}
  });
  window.LuviaStorage=api;
})();
