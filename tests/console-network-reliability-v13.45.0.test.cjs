const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const schedule=read('core/recommendations/schedule-intelligence-service.js');
const collab=read('core/collaboration/collaboration-service.js');
const backend=read('intelligence/backend-service.js');
const index=read('index.html');
const migration=read('supabase/migrations/20260808134500_core_v4_45_0_sevenrooms_console_reliability.sql');
assert(index.includes('core/runtime/network-guard.js?v=13.45.0'));
assert(schedule.includes('authenticatedClient'));
assert(schedule.includes("const REMOTE_RETRY_MS=[0]"));
assert(!schedule.includes("hydrateActiveLocal();refresh().catch"),'duplicate schedule boot refresh must be removed');
assert(!schedule.includes("console.error('[Luvia Schedule] SELECT auf trip_schedule_events nicht erlaubt."));
assert(collab.includes('sessionReady'));
assert(collab.includes("state.availability='offline'"));
assert(!collab.includes("console.warn('[LuviaPresence]'"));
assert(backend.includes('jwtNeedsRefresh'));
assert(backend.includes("error.code='NETWORK_OFFLINE'"));
assert(backend.includes('LuviaNetworkGuard?.markFailure'));
for(const needle of [
 'grant select, insert, update, delete on table public.trip_schedule_events to authenticated',
 'grant execute on function public.luvia_list_trip_activity(uuid,integer) to authenticated',
 'grant execute on function public.luvia_presence_heartbeat(uuid,text,text,text,jsonb) to authenticated',
 'grant execute on function public.luvia_list_trip_presence(uuid) to authenticated'
])assert(migration.includes(needle),`missing migration repair: ${needle}`);
console.log('LUVIA_V13_45_0_CONSOLE_NETWORK_RELIABILITY_OK');
