/* Build 13.17.0 – provider-independent Luvia model tiers */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const window={};const context=vm.createContext({window,console,Object,Array,Map,Set,JSON,String,Number,Boolean});
vm.runInContext(fs.readFileSync('core/ai/ai-capability-registry.js','utf8'),context);
vm.runInContext(fs.readFileSync('core/ai/ai-model-router.js','utf8'),context);
assert.strictEqual(window.LuviaAIModelRouter.resolve('memory.extract').alias,'Luna');
assert.strictEqual(window.LuviaAIModelRouter.resolve('discovery.plan').alias,'Terra');
assert.strictEqual(window.LuviaAIModelRouter.resolve('timeline.propose').alias,'Sol');
assert(!fs.readFileSync('core/ai/ai-model-router.js','utf8').includes('OPENAI_API_KEY'),'browser model router contains provider secret');
const provider=fs.readFileSync('supabase/functions/luvia-intelligence/providers/openai.ts','utf8');
for(const model of ['gpt-5.6-luna','gpt-5.6-terra','gpt-5.6-sol'])assert(provider.includes(model),`missing server model default ${model}`);
console.log('AI model aliases and server-authoritative routing: OK');
