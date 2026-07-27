import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
};

function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}

serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({ok:false,error:{code:"METHOD_NOT_ALLOWED",message:"POST required"}},405);
  try{
    const {action,payload,client}=await req.json();
    if(action==="health")return json({ok:true,data:{service:"luvia-intelligence",version:"1.0.0",googlePlacesConfigured:Boolean(Deno.env.get("GOOGLE_PLACES_API_KEY")),aiConfigured:Boolean(Deno.env.get("OPENAI_API_KEY")),client}});
    if(action==="destination.normalize"){
      const name=String(payload?.name||"").trim();
      return json({ok:true,data:{name,isUsable:Boolean(name),isResolved:false,source:"server_normalized"}});
    }
    return json({ok:false,error:{code:"ACTION_NOT_IMPLEMENTED",message:`Action ${String(action)} is not implemented in Core V1 foundation.`}},501);
  }catch(error){return json({ok:false,error:{code:"BAD_REQUEST",message:error instanceof Error?error.message:"Unknown error"}},400)}
});
