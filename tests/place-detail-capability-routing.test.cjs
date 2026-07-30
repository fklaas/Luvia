const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const detailCore=fs.readFileSync('core/places/place-detail-service.js','utf8');
const photoModule=fs.readFileSync('modules/photo-spots/photo-spot-module.js','utf8');
const appShell=fs.readFileSync('app/app-shell.js','utf8');

assert(detailCore.includes('registerCapabilityRenderer'),'Global capability renderer registry missing');
assert(detailCore.includes("capabilityRenderers.get(type)"),'Detail shell does not resolve type capability renderer');
assert(photoModule.includes("registerCapabilityRenderer?.('photo_spot'"),'Photo spot capability renderer is not registered globally');
assert(photoModule.includes('async function openPlace(payload={})'),'Photo spot external opener missing');
assert(photoModule.includes("LuviaPlaceEntities?.list?.({tripId:tripId(),type:'photo_spot'})"),'External photo spot detail must reload its cloud entity');
assert(appShell.includes('if(await openTypedPlaceOverlay(payload))return'),'Timeline must delegate to exact type detail before generic fallback');
assert(appShell.includes("payload.type==='photo_spot'?'Fotospot'"),'Generic fallback must label photo spots correctly');
assert(appShell.includes('placeType:payload.type'),'Generic detail fallback must expose the requested place type');
assert(appShell.includes("primaryType:payload.type"),'Prepared provider details must not overwrite the requested place role');

const overlayNode={isConnected:true,classList:{remove(){}},innerHTML:'',querySelectorAll:()=>[]};
const context={
  console,
  window:{
    LuviaPlaceExperience:{esc:v=>String(v??''),openOverlay:()=>({node:{querySelector:()=>overlayNode},close(){}})},
    LuviaPlaceUI:{typeMeta:()=>['📸','Fotospot'],assessment:()=>''},
    LuviaPlaceProviderFields:{render:()=>''},
    LuviaPlaceUIStates:{empty:()=>'<p>leer</p>'},
    LuviaPlaceUIContract:{forType:()=>({card:{factSlots:[]}})},
    addEventListener(){}
  },
  document:{createElement:()=>({}),body:{appendChild(){}}},
  CustomEvent:function(){}
};
vm.createContext(context);
vm.runInContext(detailCore,context);
context.window.LuviaPlaceDetail.registerCapabilityRenderer('photo_spot',()=>'<section data-test-photo-guidance>Licht, Motiv und Zugang</section>');
const overlay={node:overlayNode};
context.window.LuviaPlaceDetail.update(overlay,{placeType:'photo_spot',place:{name:'Testspot',primaryType:'photo_spot'},intelligence:{},lifecycle:{}});
assert(overlayNode.innerHTML.includes('data-test-photo-guidance'),'Generic detail fallback omitted registered photo guidance');
assert(context.window.LuviaPlaceDetail.diagnostics().capabilityRenderers.includes('photo_spot'),'Capability renderer missing in diagnostics');

console.log('Place detail capability routing: OK');
