import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
Deno.serve(async req=>{
 if(req.method!=='GET')return new Response('Method Not Allowed',{status:405});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return Response.json({status:'failed',error:'ENV_MISSING'},{status:500});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.from('booking_health_checks').select('*').eq('check_key','release').maybeSingle();
 if(error)return Response.json({status:'failed',error:error.message},{status:500});
 return Response.json({status:data?.status||'degraded',version:data?.details?.version||'unknown',integrationReady:data?.details?.integration_ready===true});
});