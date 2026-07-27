type Bucket={count:number;resetAt:number};
const buckets=new Map<string,Bucket>();
export function enforceRateLimit(key:string,limit:number,windowMs:number){const now=Date.now();let bucket=buckets.get(key);if(!bucket||bucket.resetAt<=now){bucket={count:0,resetAt:now+windowMs};buckets.set(key,bucket);}bucket.count++;if(buckets.size>5000)for(const [k,v] of buckets)if(v.resetAt<=now)buckets.delete(k);return{allowed:bucket.count<=limit,remaining:Math.max(0,limit-bucket.count),retryAfter:Math.max(1,Math.ceil((bucket.resetAt-now)/1000))};}
