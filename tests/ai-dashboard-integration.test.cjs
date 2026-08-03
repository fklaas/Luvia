/* Build 13.17.0 – dashboard brain and future-module hooks */
const fs=require('fs'),assert=require('assert');
const dashboard=fs.readFileSync('core/ai/ai-dashboard-service.js','utf8');
const core=fs.readFileSync('core/ai/ai-core.js','utf8');
const registry=fs.readFileSync('core/ai/ai-capability-registry.js','utf8');
const app=fs.readFileSync('app/app-shell.js','utf8');
for(const token of ["id:'aiBrain'",'dashboard.brief','data-ai-timeline-check','data-ai-ask-open'])assert(dashboard.includes(token),`dashboard brain missing ${token}`);
for(const method of ['ask','recommend','rank','explain','summarize','proposeAction','learnFromEvent','subscribe'])assert(core.includes(method),`LuviaAI facade missing ${method}`);
for(const capability of ['brain.ask','discovery.plan','discovery.rank','dashboard.brief','timeline.propose','memory.extract','text.summarize'])assert(registry.includes(capability),`capability missing ${capability}`);
assert(app.includes('luvia:dashboard-widget-refresh'),'app shell does not refresh AI widget');
assert(app.includes('lv-ai-global-trigger')&&app.includes('data-ai-ask-open'),'global Luvia Brain trigger is not available across app views');
assert(dashboard.includes("openChat:askModal"),'global chat is not exported by the Brain service');
console.log('Dashboard Brain and global future-module AI facade: OK');
