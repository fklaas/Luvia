(() => {
  'use strict';
  const VERSION='4.28.2',BUILD='13.28.2';
  const isHeic=file=>/hei[cf]/i.test(file?.type||'')||/\.hei[cf]$/i.test(file?.name||'');
  async function decodedBlob(file){
    if(isHeic(file)&&typeof window.heic2any==='function'){
      const converted=await window.heic2any({blob:file,toType:'image/jpeg',quality:.86});
      return Array.isArray(converted)?converted[0]:converted;
    }
    return file;
  }
  async function make(file,{max=1600,quality=.84}={}){
    const source=await decodedBlob(file);
    const bitmap=await createImageBitmap(source);
    const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('Vorschau konnte nicht erzeugt werden.')),'image/jpeg',quality));
    return{blob,width:canvas.width,height:canvas.height,mimeType:'image/jpeg'};
  }
  window.LuviaMediaPreview=Object.freeze({version:VERSION,build:BUILD,isHeic,make,available:()=>typeof createImageBitmap==='function'});
})();
