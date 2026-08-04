(() => {
  'use strict';
  const VERSION='4.25.0',KEY='luvia.product-focus-reset.v13.25.0';
  function invalidate(){
    if(sessionStorage.getItem(KEY)==='done')return false;
    Object.keys(sessionStorage).filter(k=>/planning|candidate|research|journey-deck/i.test(k)).forEach(k=>sessionStorage.removeItem(k));
    sessionStorage.setItem(KEY,'done');
    window.dispatchEvent(new CustomEvent('luvia:planning-experiments-invalidated',{detail:{version:VERSION}}));
    return true;
  }
  invalidate();
  window.LuviaProductFocusReset=Object.freeze({version:VERSION,invalidate,diagnostics:()=>({version:VERSION,applied:sessionStorage.getItem(KEY)==='done',movePlanning:false,multiGoalComposer:false})});
})();
