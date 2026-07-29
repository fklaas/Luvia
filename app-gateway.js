(() => {
  'use strict';
  // Build 13.6.0: startup ownership moved to LuviaBootCoordinator.
  // This compatibility layer intentionally performs no auth hydration, trip loading,
  // realtime connection, rendering or scrolling.
  window.LuviaGateway=Object.freeze({version:'13.6.0',managedBy:'LuviaBootCoordinator'});
})();
