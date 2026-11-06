'use client'
import { useEffect, useRef, useState } from 'react'

type Props={videoId:string|null;playlistId:string|null;playing:boolean;positionSeconds:number;revision:number;volume:number;muted:boolean;serverNow:string;enabled:boolean}
type Command='playVideo'|'pauseVideo'|'seekTo'|'setVolume'|'mute'|'unMute'
export function SessionYoutubePlayer({videoId,playlistId,playing,positionSeconds,revision,volume,muted,serverNow,enabled}:Readonly<Props>){
 const frame=useRef<HTMLIFrameElement>(null)
 const [loaded,setLoaded]=useState(false)
 const lastRevision=useRef(-1)
 const lastVideo=useRef('')
 const send=(func:Command,args:(number|boolean)[]=[])=>{
  frame.current?.contentWindow?.postMessage(JSON.stringify({event:'command',func,args}),'https://www.youtube.com')
 }
 useEffect(()=>{setLoaded(false);lastRevision.current=-1;lastVideo.current=playlistId??videoId??''},[videoId,playlistId])
 useEffect(()=>{
  if(!enabled||!loaded)return
  send('setVolume',[muted?0:volume])
  send(muted?'mute':'unMute')
 },[enabled,loaded,volume,muted])
 useEffect(()=>{
  if(!enabled||!loaded)return
  const reconcile=()=>{
   const elapsed=playing?Math.max(0,(Date.now()-Date.parse(serverNow))/1000):0
   const target=Math.max(0,positionSeconds+elapsed)
   if(lastRevision.current!==revision){
    send('seekTo',[target,true])
    send(playing?'playVideo':'pauseVideo')
    lastRevision.current=revision
   }
  }
  reconcile()
  const retry=window.setTimeout(()=>{lastRevision.current=-1;reconcile()},1200)
  return ()=>window.clearTimeout(retry)
  // Reconcile on polling updates, not on a local player event. No player command writes to server.
 },[enabled,loaded,revision,playing,positionSeconds,serverNow])
 if(!enabled)return <p className="text-sm text-muted-foreground">Ative o áudio para carregar o player oficial do YouTube.</p>
 return <div className="min-w-0">
  <iframe key={playlistId??videoId} ref={frame} title="Trilha sonora compartilhada do YouTube" className="aspect-video w-full max-w-xl rounded-md border border-border" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" src={`https://www.youtube.com/embed/${playlistId?'videoseries':videoId}?${playlistId?`list=${encodeURIComponent(playlistId)}&`:''}enablejsapi=1&playsinline=1&origin=${encodeURIComponent(typeof window==='undefined'?'':window.location.origin)}`} onLoad={()=>setLoaded(true)}/>
  <p className="mt-1 text-xs text-muted-foreground">Se o navegador bloquear a reprodução, clique no player para iniciar o áudio. Alguns vídeos não permitem incorporação.</p>
 </div>
}
