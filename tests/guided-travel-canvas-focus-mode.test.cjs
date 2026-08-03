/* Build 13.16.2 – focused guided results, layered preferences and motion quality */
const fs=require('fs');
const assert=require('assert');
const read=file=>fs.readFileSync(file,'utf8');

const guided=read('core/preferences/guided-discovery-sequence.js');
const guidedCss=read('core/preferences/guided-discovery-sequence.css');
const schema=read('core/preferences/preference-schema.js');
const places=read('modules/places-shell.js');
const move=read('modules/move-shell.js');
const placesCss=read('modules/places-shell.css');
const moveCss=read('modules/move-shell.css');
const profile=read('core/profiles/profile-foundation.js');
const profileCss=read('core/profiles/profile-foundation.css');

for(const [source,tokens,label] of [
  [places,["hideBrowse:true",'is-guided-results','guided-result-story','data-guided-open-catalog','Gesamten Bereich öffnen'],'Places focus mode'],
  [move,["hideBrowse:true",'is-guided-results','guided-result-story','data-guided-open-catalog','Gesamten Bereich öffnen'],'Move focus mode'],
  [placesCss,['.places-experience.is-guided-results :is(.rv2-head, .rv2-today-plan, .rv2-entity-search, .rv2-library)','guided-catalog-gate','guided-result-scene','content-visibility: auto'],'focused result CSS'],
  [moveCss,['guided-result-story-move','Move story canvas'],'Move canvas CSS'],
  [guided,['updateMultiSelectionUI','requestAnimationFrame','suspendUnderlyingSurface','state.root.querySelectorAll(`[data-gds-scene="${CSS.escape(scene.id)}"]`)'],'guided interaction runtime'],
  [guidedCss,['gds-cloud-shape','Smooth composite-only atmosphere','animation: none','z-index:2147483646'],'cloud/performance CSS'],
  [profile,['Dein globaler Reisekompass','Aktueller Reisemoment','überschreibt ihn aber niemals','LuviaUserPreferences?.get?.()'],'preference layer copy'],
  [profileCss,['pf-preference-layers','pf-preference-layer-join','pf-overlay.is-guided-suspended','pfCanvasIn'],'profile layer UI']
]) for(const token of tokens) assert(source.includes(token),`${label} missing: ${token}`);

assert(!places.includes('onBrowse:showBrowse'),'Places reintroduced immediate catalog browsing');
assert(!move.includes('onBrowse:showBrowse'),'Move reintroduced immediate catalog browsing');
assert(schema.includes("mutatesGlobalProfile: false"),'Places/Move contracts do not explicitly protect global profile');
assert((schema.match(/mutatesGlobalProfile: false/g)||[]).length>=2,'Both Places and Move must protect the global profile');
assert(schema.includes("mergePolicy: 'global-profile-context-plus-explicit-module-moment'"),'preference merge policy missing');
assert(schema.includes("title: 'Welche Stimmung soll diesmal dazu passen?'"),'Places final multi-select scene missing');
assert(schema.includes("title: 'Was ist euch für diese Verbindung besonders wichtig?'"),'Move final multi-select scene missing');
console.log('Guided travel canvas focus mode and layered preferences: OK');
