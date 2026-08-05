const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const gallery=fs.readFileSync('app/gallery-view.js','utf8');const cluster=fs.readFileSync('core/media/media-clustering.js','utf8');const timeline=fs.readFileSync('core/places/timeline-core.js','utf8');
test('day tiles replace broken details accordions',()=>{assert.match(gallery,/lv-day-tiles/);assert.match(gallery,/data-day-open/);assert.doesNotMatch(gallery,/<details class="lv-day-group"/)});
test('realtime distinguishes data refresh from clustering',()=>{assert.match(gallery,/analyze:Boolean\(options\.analyze\)/);assert.match(gallery,/clusterRealtime\(\).*analyze:false/);assert.match(gallery,/REALTIME_DEBOUNCE_MS = 650/)});
test('cluster items are idempotent',()=>assert.match(cluster,/upsert\(ins,\{onConflict:'cluster_id,media_id',ignoreDuplicates:true\}\)/));
test('app camera stores location and device metadata',()=>{assert.match(gallery,/captureLocation:location/);assert.match(gallery,/deviceMetadata/);assert.match(gallery,/navigator\.geolocation/)});
test('timeline photo memory renders actual images',()=>{assert.match(timeline,/data-memory-photo/);assert.match(timeline,/<img alt=/);assert.match(timeline,/lv-photo-memory-actions/)});
test('creative editor includes filters and overlays',()=>{assert.match(gallery,/Golden Hour/);assert.match(gallery,/B&W Drama/);assert.match(gallery,/data-ed="sticker"/);assert.match(gallery,/data-ed="caption"/);assert.match(gallery,/data-ed="vignette"/)});
