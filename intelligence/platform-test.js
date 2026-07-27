(function(){
  'use strict';
  async function run(){
    const p=window.LuviaPlatform;if(!p)throw new Error('LuviaPlatform fehlt.');
    await p.load();
    const probe='luvia:platform-test:'+Date.now();
    await p.storage.set(probe,{ok:true});
    const stored=await p.storage.get(probe);
    await p.storage.remove(probe);
    const s=p.snapshot();
    const expectedBuild=window.LuviaKernelVersion?.build||window.LuviaCoreVersion?.build||null;
    const expectedCore=window.LuviaKernelVersion?.core||window.LuviaCoreVersion?.core||null;
    const checks={
      loaded:Boolean(s.loadedAt),
      build:Boolean(s.build?.build)&&(!expectedBuild||s.build.build===expectedBuild),
      core:Boolean(s.build?.core)&&(!expectedCore||s.build.core===expectedCore),
      adapter:s.adapter?.name==='web-adapter',
      environment:Boolean(s.platformEnvironment?.runtime),
      assetsEndpoint:Boolean(s.endpoints?.assets),
      flags:typeof p.flag('developerConsole')==='boolean',
      capabilities:typeof s.capabilities?.serviceWorker==='boolean',
      channel:Boolean(s.build?.channel),
      storage:stored?.ok===true,
      network:typeof p.network.isOnline()==='boolean',
      lifecycle:Boolean(p.lifecycle.snapshot().state),
      navigation:typeof p.navigation.go==='function',
      clipboard:typeof p.clipboard.write==='function',
      sharing:typeof p.sharing.share==='function',
      location:typeof p.location.getCurrent==='function',
      permissions:typeof p.permissions.query==='function',
      files:typeof p.files.pick==='function'
    };
    return{ok:Object.values(checks).every(Boolean),message:'Platform Layer, Web-Adapter und zentrale Geräte-Services geprüft.',checks,snapshot:s};
  }
  window.LuviaPlatformTest=Object.freeze({run});
})();
