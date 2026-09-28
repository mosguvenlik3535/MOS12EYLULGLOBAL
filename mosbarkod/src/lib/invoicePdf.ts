import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSource from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
// Bundle the worker locally: invoice bytes are never sent to a third-party service.
GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([workerSource], {type:'text/javascript'}));
export async function readInvoicePdf(file: File): Promise<string> {
  const task=getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
  try {
    const doc=await task.promise;
    if(doc.numPages>30) throw new Error('En fazla 30 sayfalık PDF okunabilir.');
    const pages:string[]=[];
    for(let p=1;p<=doc.numPages;p++) {
      const page=await doc.getPage(p);const content=await page.getTextContent();
      const rows: {y:number;parts:{x:number;text:string}[]}[]=[];
      for(const item of content.items) {
        if(!('str' in item) || !item.str.trim()) continue;
        const y=item.transform[5],x=item.transform[4];
        let row=rows.find(r=>Math.abs(r.y-y)<2.5);
        if(!row) {row={y,parts:[]};rows.push(row);}
        row.parts.push({x,text:item.str});
      }
      pages.push(rows.sort((a,b)=>b.y-a.y).map(r=>r.parts.sort((a,b)=>a.x-b.x).map(p=>p.text).join(' ')).join('\n'));
      page.cleanup();
    }
    const text=pages.join('\n');
    if(text.trim().length<30) throw new Error('Bu PDF taranmış olabilir. OCR bu sürümde yok; belgeyi ekleyip kalemleri elle girin.');
    return text;
  } finally {await task.destroy();}
}
