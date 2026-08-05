const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

test('memory evidence is human readable and honest',()=>{
  const ui=read('app/gallery-view.js');
  const bridge=read('core/media/ai-memory-bridge.js');
  assert.match(ui,/Warum wurde dieser Moment erkannt\?/);
  assert.match(bridge,/Keine Standortdaten in den Fotos/);
  assert.match(bridge,/Kein passender Reiseort erkannt/);
  assert.doesNotMatch(ui,/Evidence-Referenzen · keine Änderung/);
});

test('photo memories are included and have a dedicated detail view',()=>{
  const timeline=read('core/places/timeline-core.js');
  assert.match(timeline,/allowedEvents=new Set\(\[[^\]]*'photo_memory'/);
  assert.match(timeline,/function openPhotoMemory/);
  assert.match(timeline,/Erinnerung öffnen/);
  assert.match(timeline,/In der Galerie öffnen/);
});

test('cluster type updates are validated and acknowledged',()=>{
  const clustering=read('core/media/media-clustering.js');
  const ui=read('app/gallery-view.js');
  assert.match(clustering,/new Set\(\['moment','screenshots','documents'\]\)/);
  assert.match(ui,/Als \$\{x\.options\[x\.selectedIndex\]\.text\} gespeichert/);
});

test('release and cache versions are consistent',()=>{
  assert.match(read('intelligence/kernel/version.js'),/core:'4\.28\.2\.2',build:'13\.28\.2\.2'/);
  assert.match(read('sw.js'),/luvia-shell-v13\.28\.2\.2/);
  assert.doesNotMatch(read('sw.js'),/13\.28\.2\.2\.2/);
});
