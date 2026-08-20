'use client';
const stickers=['❤️','👍','😂','🥰','😍','😢','🔥','🎉','👏','🙏','✅','❌'];
export function StickerPicker({onSelect}:{onSelect:(s:string)=>void}){return <div className="grid grid-cols-6 gap-1 rounded-2xl bg-white p-2 shadow-card">{stickers.map(s=><button onClick={()=>onSelect(s)} key={s} className="rounded-lg p-2 text-2xl hover:bg-slate-100">{s}</button>)}</div>}
