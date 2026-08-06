(() => {
  'use strict';
  const VERSION='4.29.5.4',BUILD='13.29.5.4';
  const isHeic=file=>/hei[cf]/i.test(file?.type||'')||/\.hei[cf]$/i.test(file?.name||'');
  async function decodedBlob(file){
    if(isHeic(file)&&typeof window.heic2any==='function'){
      const converted=await window.heic2any({blob:file,toType:'image/jpeg',quality:.86});
      return Array.isArray(converted)?converted[0]:converted;
    }
    return file;
  }
  async function bitmapFor(file){return createImageBitmap(await decodedBlob(file));}
  async function encode(bitmap,{max=1280,quality=.78,type='image/webp'}={}){
    const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d',{alpha:false,desynchronized:true}).drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('Vorschau konnte nicht erzeugt werden.')),type,quality));
    return{blob,width:canvas.width,height:canvas.height,mimeType:blob.type||type};
  }
  async function make(file,{max=1280,quality=.78,type='image/webp'}={}){const bitmap=await bitmapFor(file);try{return await encode(bitmap,{max,quality,type})}finally{bitmap.close?.()}}
  async function makeVariants(file){
    const bitmap=await bitmapFor(file);
    try{
      const [thumb256,thumb640,preview1280]=await Promise.all([
        encode(bitmap,{max:256,quality:.68,type:'image/webp'}),
        encode(bitmap,{max:640,quality:.72,type:'image/webp'}),
        encode(bitmap,{max:1280,quality:.78,type:'image/webp'})
      ]);
      return{thumb256,thumb640,preview1280};
    }finally{bitmap.close?.()}
  }
  window.LuviaMediaPreview=Object.freeze({version:VERSION,build:BUILD,isHeic,make,makeVariants,available:()=>typeof createImageBitmap==='function'});
})();
