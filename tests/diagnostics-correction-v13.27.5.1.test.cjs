const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const testHtml=read('intelligence/test.html');
const consoleHtml=read('intelligence/console.html');
const base=read('intelligence/services/base-services.js');
const core4=read('core/diagnostics/core-v4-finalization.js');
const version=read('intelligence/kernel/version.js');
const build=(version.match(/build:'([^']+)'/)||[])[1],core=(version.match(/core:'([^']+)'/)||[])[1];
assert(build&&core,'current version missing');
for(const html of [testHtml,consoleHtml]){
  assert(!html.includes('13.17.0'),'stale 13.17.0 asset reference remains');
  assert(html.includes(`kernel/version.js?v=${build}`),'kernel version loader missing');
  assert(html.includes(`ai-capability-registry.js?v=${build}`),'AI capabilities loader missing');
  assert(html.includes(`ai-policy-service.js?v=${build}`),'AI policy loader missing');
  assert(html.includes(`ai-command-proposal-service.js?v=${build}`),'AI proposal loader missing');
  assert(html.includes(`ai-core.js?v=${build}`),'AI core loader missing');
  assert(html.includes(`media-readiness.js?v=${build}`),'media readiness loader missing');
  assert(html.indexOf(`kernel/version.js?v=${build}`)<html.indexOf(`core-v4-finalization.js?v=${build}`),'kernel version must load before Core-4 diagnostics');
  assert(html.indexOf(`media-readiness.js?v=${build}`)<html.indexOf(`base-services.js?v=${build}`),'media readiness must load before service registration');
}
assert(testHtml.includes(`place-lifecycle-service.js?v=${build}`),'diagnostic page lifecycle loader missing');
assert(consoleHtml.includes(`place-lifecycle-service.js?v=${build}`),'console lifecycle loader missing');
assert(base.includes("typeof api.run!=='function'"),'defensive media readiness test guard missing');
assert(base.includes("failedChecks:['implementationLoaded']"),'controlled missing-implementation response missing');
assert(core4.includes(`||'${core}'`),'Core-4 fallback version stale');
assert(core4.includes(`||'${build}'`),'Core-4 fallback build stale');
assert(core4.includes("test('Mobility Adapter'"),'obsolete Move Adapter smoke label remains');
console.log(`Diagnostics compatibility ${build}: OK`);
