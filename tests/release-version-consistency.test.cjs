const fs=require('fs'),assert=require('assert');
const build='13.20.1',core='4.20.1';
const read=f=>fs.readFileSync(f,'utf8');
for(const [f,needles] of Object.entries({
 'intelligence/kernel/version.js':[build,core,'Journey Knowledge Graph'],
 'sw.js':['luvia-shell-v13.20.1'],
 'index.html':['journey-knowledge-graph.js','ai-orchestrator.js','curated-travel-canvas.js',build],
 'core/context/journey-knowledge-graph.js':['trip_schedule_events','restaurants','reservations','evidence'],
 'core/ai/ai-orchestrator.js':['MAX_STEPS','toolCalls','LuviaAITools.invoke'],
 'core/ai/ai-domain-registry.js':['places','move','timelineForbidden'],
 'supabase/migrations/20260803213000_core_v4_18_0_journey_knowledge_graph_universal_ai_orchestrator.sql':['ai_evidence_records','ai_orchestration_runs','auth.uid()=user_id'],
 'supabase/functions/luvia-intelligence/index.ts':[build,core,'brain.orchestrate']
}))for(const n of needles)assert(read(f).includes(n),`${f} missing ${n}`);
console.log('Build 13.20.1 release and architecture consistency: OK');