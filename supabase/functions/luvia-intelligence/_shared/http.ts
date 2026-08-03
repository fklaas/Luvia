export function requestId(req:Request){const supplied=req.headers.get('x-luvia-request-id')||'';return /^[a-zA-Z0-9_-]{8,100}$/.test(supplied)?supplied:crypto.randomUUID()}
export function jsonResponse(status:number,body:unknown,headers:HeadersInit={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8',...headers}})}
export function errorResponse(status:number,code:string,message:string,id:string,headers:HeadersInit={}){return jsonResponse(status,{ok:false,error:{code,message},meta:{requestId:id}},headers)}
