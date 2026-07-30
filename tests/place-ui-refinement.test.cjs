const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const shellCss=fs.readFileSync('modules/places-shell.css','utf8');
const shellJs=fs.readFileSync('modules/places-shell.js','utf8');
const placeUi=fs.readFileSync('core/places/place-ui.js','utf8');
const placeUiCss=fs.readFileSync('core/places/place-ui.css','utf8');
const photoModule=fs.readFileSync('modules/photo-spots/photo-spot-module.js','utf8');
const photoCss=fs.readFileSync('modules/photo-spots/photo-spot-module.css','utf8');

assert(shellCss.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'),'Places Hub must use exactly three desktop columns');
assert(shellCss.includes('@media (max-width: 1040px)'),'Tablet breakpoint missing');
assert(shellCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'),'Tablet must use two columns');
assert(shellCss.includes('@media (max-width: 700px)'),'Mobile breakpoint missing');
assert(shellJs.includes('places-hub-tags'),'Modern hub metadata missing');
assert(placeUi.includes('function insightGrid'),'Global insightGrid renderer missing');
assert(placeUi.includes("components:['card','factSlots','roles','lifecycle','assessment','insightGrid']"),'Insight renderer missing from diagnostics');
assert(placeUiCss.includes('.luv-place-insight-section'),'Global insight section CSS missing');
assert(placeUiCss.includes('.luv-place-insight-card.is-wide'),'Wide insight card contract missing');
assert(photoModule.includes('window.LuviaPlaceUI.insightGrid'),'Photo spots must use global insight renderer');
assert(!photoCss.includes('luv-photo-guidance-row'),'Photo spots must not own a local insight-card shell');

const context={window:{LuviaPlaceUIContract:{forType:()=>({card:{factSlots:[]}})}}};
vm.createContext(context);
vm.runInContext(placeUi,context);
const rendered=context.window.LuviaPlaceUI.insightGrid({title:'Licht, Motiv und Zugang',items:[{label:'Lichtmoment',icon:'🌇',value:'Sonnenuntergang',source:'Astronomie',confidence:'hoch',featured:true}]});
assert(rendered.includes('luv-place-insight-card is-featured'),'Rendered insight card missing');
assert(rendered.includes('Hohe Sicherheit'),'Confidence label must be readable German copy');
assert(context.window.LuviaPlaceUI.diagnostics().components.includes('insightGrid'),'Runtime diagnostics missing insightGrid');

console.log('Places UI refinement: OK');
