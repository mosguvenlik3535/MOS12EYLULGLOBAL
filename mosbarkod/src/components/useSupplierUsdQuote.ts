import {useEffect,useRef,useState} from 'react';
import {fetchSupplierQuote,readSupplierQuote} from '../lib/supplierUsdQuote';
export function useSupplierUsdQuote(){
 const [quote,setQuote]=useState(readSupplierQuote);const [loading,setLoading]=useState(false);const [offline,setOffline]=useState(false);
 const alive=useRef(false);const busy=useRef(false);
 const refresh=async()=>{if(busy.current)return;busy.current=true;setLoading(true);try{const q=await fetchSupplierQuote();if(alive.current){if(q)setQuote(q);setOffline(!q);}}finally{busy.current=false;if(alive.current)setLoading(false);}};
 useEffect(()=>{alive.current=true;void refresh();const timer=setInterval(()=>void refresh(),15*60*1000);return()=>{alive.current=false;clearInterval(timer);};},[]);
 return {quote,loading,offline,refresh};
}
