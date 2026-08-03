/* Build 13.17.0 – secure OpenAI Responses integration */
const fs=require('fs'),path=require('path'),assert=require('assert'),ts=require('typescript');
const root='supabase/functions/luvia-intelligence';
for(const file of fs.readdirSync(root,{recursive:true}).filter(name=>name.endsWith('.ts'))){const full=path.join(root,file),source=fs.readFileSync(full,'utf8');const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,strict:true},reportDiagnostics:true,fileName:full});const errors=(result.diagnostics||[]).filter(item=>item.category===ts.DiagnosticCategory.Error);assert.strictEqual(errors.length,0,`${file}: ${errors.map(item=>ts.flattenDiagnosticMessageText(item.messageText,' ')).join('; ')}`)}
const provider=fs.readFileSync(`${root}/providers/openai.ts`,'utf8'),index=fs.readFileSync(`${root}/index.ts`,'utf8'),privacy=fs.readFileSync(`${root}/policies/privacy.ts`,'utf8');
for(const token of ['https://api.openai.com/v1/responses','store:false','json_schema','safety_identifier','OPENAI_API_KEY'])assert(provider.includes(token),`provider missing ${token}`);
for(const token of ['AUTH_REQUIRED','PAYLOAD_TOO_LARGE','brain.run','brain.health','recordUsage'])assert(index.includes(token),`edge function missing ${token}`);
for(const token of ['access_token','booking_number','safetyIdentifier'])assert(privacy.includes(token),`privacy policy missing ${token}`);
assert(!provider.includes('console.log'),'raw OpenAI payload logging found');
console.log('Secure Edge AI function and TypeScript transpilation: OK');
