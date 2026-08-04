const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const testHtml=read('intelligence/test.html');
const consoleHtml=read('intelligence/console.html');
const base=read('intelligence/services/base-services.js');
const core4=read('core/diagnostics/core-v4-finalization.js');
const version=read('intelligence/kernel/version.js');
assert(version.includes("core:'4.27.5.1'"),'core correction version missing');
assert(version.includes("build:'13.27.5.1'"),'app correction version missing');
for(const html of [testHtml,consoleHtml]){
  assert(!html.includes('13.17.0'),'stale 13.17.0 asset reference remains');
  assert(html.includes('kernel/version.js?v=13.27.5.1'),'kernel version loader missing');
  assert(html.includes('ai-capability-registry.js?v=13.27.5.1'),'AI capabilities loader missing');
  assert(html.includes('ai-policy-service.js?v=13.27.5.1'),'AI policy loader missing');
  assert(html.includes('ai-command-proposal-service.js?v=13.27.5.1'),'AI proposal loader missing');
  assert(html.includes('ai-core.js?v=13.27.5.1'),'AI core loader missing');
  assert(html.includes('media-readiness.js?v=13.27.5.1'),'media readiness loader missing');
  assert(html.indexOf('kernel/version.js?v=13.27.5.1') < html.indexOf('core-v4-finalization.js?v=13.27.5.1'),'kernel version must load before Core-4 diagnostics');
  assert(html.indexOf('media-readiness.js?v=13.27.5.1') < html.indexOf('base-services.js?v=13.27.5.1'),'media readiness must load before service registration');
}
assert(testHtml.includes('place-lifecycle-service.js?v=13.27.5.1'),'diagnostic page lifecycle loader missing');
assert(consoleHtml.includes('place-lifecycle-service.js?v=13.27.5.1'),'console lifecycle loader missing');
assert(base.includes("typeof api.run!=='function'"),'defensive media readiness test guard missing');
assert(base.includes("failedChecks:['implementationLoaded']"),'controlled missing-implementation response missing');
assert(core4.includes("||'4.27.5.1'"),'Core-4 fallback version stale');
assert(core4.includes("||'13.27.5.1'"),'Core-4 fallback build stale');
assert(core4.includes("test('Mobility Adapter'"),'obsolete Move Adapter smoke label remains');
console.log('Diagnostics correction 13.27.5.1 static integration: OK');
