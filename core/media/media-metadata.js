(() => {
  'use strict';
  const VERSION='4.28.5.2';
  const ascii=(v,o,n)=>{let s='';for(let i=0;i<n&&o+i<v.byteLength;i++){const c=v.getUint8(o+i);if(!c)break;s+=String.fromCharCode(c)}return s};
  const exifDate=value=>{const m=String(value||'').trim().match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);if(!m)return null;const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);return Number.isNaN(d.getTime())?null:d.toISOString()};
  const rational=(v,o,le)=>{if(o+8>v.byteLength)return 0;const d=v.getUint32(o+4,le);return d?v.getUint32(o,le)/d:0};
  function ifd(v,tiff,offset,le){const out={};if(tiff+offset+2>v.byteLength)return out;const count=v.getUint16(tiff+offset,le);for(let i=0;i<count;i++){const e=tiff+offset+2+i*12;if(e+12>v.byteLength)break;const type=v.getUint16(e+2,le),amount=v.getUint32(e+4,le),unit={1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8}[type]||1,bytes=amount*unit;out[v.getUint16(e,le)]={type,amount,pos:bytes<=4?e+8:tiff+v.getUint32(e+8,le)}}return out}
  const text=(v,e)=>e?.type===2?ascii(v,e.pos,e.amount).trim():null;
  const short=(v,e,le)=>e&&e.pos+2<=v.byteLength?v.getUint16(e.pos,le):null;
  const decimal=(a,ref)=>{if(!a||a.length<3)return null;let x=a[0]+a[1]/60+a[2]/3600;if(ref==='S'||ref==='W')x*=-1;return Number.isFinite(x)?x:null};
  async function parseJpegExif(file){
    if(!file||(!/image\/(jpeg|jpg)/i.test(file.type||'')&&!/\.jpe?g$/i.test(file.name||'')))return{};
    const v=new DataView(await file.slice(0,Math.min(file.size,8*1024*1024)).arrayBuffer());
    if(v.byteLength<4||v.getUint16(0)!==0xffd8)return{};let o=2;
    while(o+4<v.byteLength){const marker=v.getUint16(o),len=v.getUint16(o+2);if(marker===0xffe1&&len>=10&&ascii(v,o+4,6)==='Exif'){
      const t=o+10,endian=ascii(v,t,2),le=endian==='II';if(!le&&endian!=='MM')return{};
      const root=ifd(v,t,v.getUint32(t+4,le),le),ep=root[0x8769],gp=root[0x8825],ex=ep?ifd(v,t,v.getUint32(ep.pos,le),le):{},g=gp?ifd(v,t,v.getUint32(gp.pos,le),le):{};
      const dateEntry=ex[0x9003]||ex[0x9004]||root[0x0132],latRef=text(v,g[1]),lonRef=text(v,g[3]);
      const latitude=g[2]?.type===5&&g[2].amount>=3?decimal([0,1,2].map(i=>rational(v,g[2].pos+i*8,le)),latRef):null;
      const longitude=g[4]?.type===5&&g[4].amount>=3?decimal([0,1,2].map(i=>rational(v,g[4].pos+i*8,le)),lonRef):null;
      return{capturedAt:exifDate(text(v,dateEntry)),latitude,longitude,source:'exif',exif:{make:text(v,root[0x010f]),model:text(v,root[0x0110]),software:text(v,root[0x0131]),orientation:short(v,root[0x0112],le),lensModel:text(v,ex[0xa434]),dateTimeOriginal:text(v,ex[0x9003]),gpsAvailable:Number.isFinite(latitude)&&Number.isFinite(longitude)}};
    }if(!len||len<2)break;o+=2+len}return{}
  }
  async function dimensions(file){try{if(typeof createImageBitmap==='function'){const b=await createImageBitmap(file),r={width:b.width,height:b.height};b.close?.();return r}}catch{}return{width:null,height:null}}
  async function contentHash(file){if(!crypto?.subtle||!(file instanceof Blob))return null;const n=512*1024,a=await file.slice(0,Math.min(file.size,n)).arrayBuffer(),start=Math.max(0,file.size-n),b=start?await file.slice(start).arrayBuffer():new ArrayBuffer(0),m=new TextEncoder().encode(`${file.name||''}|${file.size}|${file.type||''}`),all=new Uint8Array(a.byteLength+b.byteLength+m.byteLength);all.set(new Uint8Array(a));all.set(new Uint8Array(b),a.byteLength);all.set(m,a.byteLength+b.byteLength);const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',all));return[...hash].map(x=>x.toString(16).padStart(2,'0')).join('')}
  async function extract(file,options={}){const [parsed,size,hash]=await Promise.all([parseJpegExif(file).catch(()=>({})),dimensions(file),contentHash(file)]);const fallback=options.capturedAt||(file?.lastModified?new Date(file.lastModified).toISOString():new Date().toISOString()),location=options.location||{},latitude=parsed.latitude??location.latitude??null,longitude=parsed.longitude??location.longitude??null;return Object.freeze({capturedAt:parsed.capturedAt||fallback,latitude,longitude,locationAccuracy:parsed.latitude!=null?null:(location.accuracy??null),width:size.width,height:size.height,contentHash:hash,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||null,evidence:parsed.source||(location.latitude!=null?'global_location':file?.lastModified?'file_last_modified':'upload_time'),captureSource:options.captureSource||options.source||'user_upload',deviceMetadata:options.deviceMetadata||null,exif:parsed.exif||{},originalLastModified:file?.lastModified||null,originalName:file?.name||null,mimeType:file?.type||null})}
  window.LuviaMediaMetadata=Object.freeze({version:VERSION,extract,parseJpegExif,contentHash});
})();
