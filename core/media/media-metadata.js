(() => {
  'use strict';
  const VERSION='4.28.5.3';
  const TYPE_SIZE={1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8};
  const ascii=(v,o,n)=>{let s='';for(let i=0;i<n&&o+i<v.byteLength;i++){const c=v.getUint8(o+i);if(!c)break;s+=String.fromCharCode(c)}return s};
  const exifDate=(value,offset)=>{const m=String(value||'').trim().match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);if(!m)return null;const local=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${/^[-+]\d\d:\d\d$/.test(offset||'')?offset:''}`;const d=new Date(local);return Number.isNaN(d.getTime())?null:d.toISOString()};
  const rational=(v,o,le,signed=false)=>{if(o+8>v.byteLength)return null;const n=signed?v.getInt32(o,le):v.getUint32(o,le),d=signed?v.getInt32(o+4,le):v.getUint32(o+4,le);return d?n/d:null};
  function ifd(v,tiff,offset,le){const out={};const base=tiff+offset;if(base<0||base+2>v.byteLength)return out;const count=v.getUint16(base,le);for(let i=0;i<count;i++){const e=base+2+i*12;if(e+12>v.byteLength)break;const tag=v.getUint16(e,le),type=v.getUint16(e+2,le),amount=v.getUint32(e+4,le),bytes=amount*(TYPE_SIZE[type]||1),pointer=v.getUint32(e+8,le),pos=bytes<=4?e+8:tiff+pointer;if(pos>=0&&pos+Math.min(bytes,1)<=v.byteLength)out[tag]={type,amount,pos,bytes,pointer}}return out}
  const text=(v,e)=>e&&[1,2,7].includes(e.type)?ascii(v,e.pos,e.amount).trim():null;
  const short=(v,e,le)=>e&&e.pos+2<=v.byteLength?v.getUint16(e.pos,le):null;
  const valueOffset=(v,e,le)=>e&&e.pos+4<=v.byteLength?v.getUint32(e.pos,le):null;
  const decimal=(a,ref)=>{if(!a||a.length<3||a.some(x=>!Number.isFinite(x)))return null;let x=a[0]+a[1]/60+a[2]/3600;if(String(ref).toUpperCase()==='S'||String(ref).toUpperCase()==='W')x*=-1;return Number.isFinite(x)?x:null};
  async function parseJpegExif(file){
    if(!file||(!/image\/(jpeg|jpg)/i.test(file.type||'')&&!/\.jpe?g$/i.test(file.name||'')))return{};
    const v=new DataView(await file.arrayBuffer());
    if(v.byteLength<4||v.getUint16(0,false)!==0xffd8)return{};
    let o=2;
    while(o+4<=v.byteLength){while(o<v.byteLength&&v.getUint8(o)!==0xff)o++;while(o<v.byteLength&&v.getUint8(o)===0xff)o++;if(o>=v.byteLength)break;const code=v.getUint8(o++);if(code===0xd9||code===0xda)break;if(code>=0xd0&&code<=0xd7)continue;if(o+2>v.byteLength)break;const len=v.getUint16(o,false);if(len<2||o+len>v.byteLength)break;const payload=o+2;
      if(code===0xe1&&len>=8&&ascii(v,payload,6)==='Exif'){
        const t=payload+6,endian=ascii(v,t,2),le=endian==='II';if(!le&&endian!=='MM')return{};if(v.getUint16(t+2,le)!==42)return{};
        const root=ifd(v,t,v.getUint32(t+4,le),le),ep=root[0x8769],gp=root[0x8825];
        const exOffset=valueOffset(v,ep,le),gpsOffset=valueOffset(v,gp,le),ex=Number.isFinite(exOffset)?ifd(v,t,exOffset,le):{},g=Number.isFinite(gpsOffset)?ifd(v,t,gpsOffset,le):{};
        const dateEntry=ex[0x9003]||ex[0x9004]||root[0x0132],offsetEntry=ex[0x9011]||ex[0x9012]||root[0x9010],latRef=text(v,g[1]),lonRef=text(v,g[3]);
        const latitude=g[2]?.type===5&&g[2].amount>=3?decimal([0,1,2].map(i=>rational(v,g[2].pos+i*8,le)),latRef):null;
        const longitude=g[4]?.type===5&&g[4].amount>=3?decimal([0,1,2].map(i=>rational(v,g[4].pos+i*8,le)),lonRef):null;
        const dateRaw=text(v,dateEntry),offsetRaw=text(v,offsetEntry);
        return{capturedAt:exifDate(dateRaw,offsetRaw),latitude,longitude,source:'exif',exif:{make:text(v,root[0x010f]),model:text(v,root[0x0110]),software:text(v,root[0x0131]),orientation:short(v,root[0x0112],le),lensModel:text(v,ex[0xa434]),dateTimeOriginal:dateRaw,offsetTimeOriginal:offsetRaw,gpsLatitudeRef:latRef,gpsLongitudeRef:lonRef,gpsAvailable:Number.isFinite(latitude)&&Number.isFinite(longitude)}};
      }o+=len;
    }return{};
  }
  async function dimensions(file){try{if(typeof createImageBitmap==='function'){const b=await createImageBitmap(file),r={width:b.width,height:b.height};b.close?.();return r}}catch{}return{width:null,height:null}}
  async function contentHash(file){if(!crypto?.subtle||!(file instanceof Blob))return null;const n=512*1024,a=await file.slice(0,Math.min(file.size,n)).arrayBuffer(),start=Math.max(0,file.size-n),b=start?await file.slice(start).arrayBuffer():new ArrayBuffer(0),m=new TextEncoder().encode(`${file.name||''}|${file.size}|${file.type||''}`),all=new Uint8Array(a.byteLength+b.byteLength+m.byteLength);all.set(new Uint8Array(a));all.set(new Uint8Array(b),a.byteLength);all.set(m,a.byteLength+b.byteLength);const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',all));return[...hash].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function extract(file,options={}){const [parsed,size,hash]=await Promise.all([parseJpegExif(file).catch(error=>{console.warn('[LuviaMediaMetadata] EXIF parse failed',error);return{}}),dimensions(file),contentHash(file)]);const fallback=options.capturedAt||(file?.lastModified?new Date(file.lastModified).toISOString():new Date().toISOString()),location=options.location||{},latitude=parsed.latitude??location.latitude??null,longitude=parsed.longitude??location.longitude??null;return Object.freeze({capturedAt:parsed.capturedAt||fallback,latitude,longitude,locationAccuracy:parsed.latitude!=null?null:(location.accuracy??null),width:size.width,height:size.height,contentHash:hash,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||null,evidence:parsed.source||(location.latitude!=null?'global_location':file?.lastModified?'file_last_modified':'upload_time'),captureSource:options.captureSource||options.source||'user_upload',deviceMetadata:options.deviceMetadata||null,exif:parsed.exif||{},originalLastModified:file?.lastModified||null,originalName:file?.name||null,mimeType:file?.type||null})}
  window.LuviaMediaMetadata=Object.freeze({version:VERSION,extract,parseJpegExif,contentHash});
})();
