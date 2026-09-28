import { useEffect, useState } from 'react';
export default function InvoiceDocument({data}:{data:string}) {
 const [url,setUrl]=useState('');const pdf=data.startsWith('data:application/pdf');
 useEffect(()=>{let objectUrl='';let active=true;fetch(data).then(r=>r.blob()).then(b=>{if(active){objectUrl=URL.createObjectURL(b);setUrl(objectUrl);}});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[data]);
 return <div onClick={e=>e.stopPropagation()}>{pdf?<iframe title="Fatura PDF belgesi" src={url} className="h-[72vh] w-[80vw] bg-white"/>:<img src={url} alt="Fatura belgesi" className="max-h-[75vh] max-w-[85vw] object-contain"/>}<a href={url} download={pdf?'fatura.pdf':'fatura-gorseli'} className="block p-3 text-center text-amber">Belgeyi indir</a></div>;
}
