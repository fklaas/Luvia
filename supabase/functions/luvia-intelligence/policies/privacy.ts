const blocked=/^(email|phone|telephone|password|token|access_token|refresh_token|authorization|apikey|api_key|booking_number|reservation_number|payment|card|iban|address_exact)$/i;
export function sanitize(value:unknown,depth=0):unknown{
  if(value==null||typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value==='string')return value.slice(0,1500);
  if(depth>=8)return '[redacted-depth]';
  if(Array.isArray(value))return value.slice(0,60).map(item=>sanitize(item,depth+1));
  if(typeof value==='object'){const result:Record<string,unknown>={};for(const [key,item] of Object.entries(value as Record<string,unknown>)){if(blocked.test(key))continue;result[key]=sanitize(item,depth+1)}return result}
  return undefined;
}
export function byteLength(value:unknown){return new TextEncoder().encode(JSON.stringify(value)).byteLength}
export async function safetyIdentifier(userId:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`luvia:${userId}`));return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,64)}
