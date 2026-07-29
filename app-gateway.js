(() => {
  'use strict';
  // Build 13.5.5: startup ownership moved to LuviaBootCoordinator.
  // This compatibility layer intentionally performs no auth hydration, trip loading,
  // realtime connection, rendering or scrolling.
  window.LuviaGateway=Object.freeze({version:'13.5.5',managedBy:'LuviaBootCoordinator'});
})();
