'use client'
import useSWR from 'swr'
import Link from 'next/link'
type Participant={actorId:string;playerName:string;nickname:string;pronouns:string;characterId:string|null;characterName:string|null;isNarrator:boolean}
async function read(url:string):Promise<{participants:Participant[]}>{const r=await fetch(url);const data=await r.json();if(!r.ok)throw new Error(data.error??'Falha ao carregar participantes.');return data}
export function SessionParticipants({campaignId}:Readonly<{campaignId:string}>){
 const {data,error}=useSWR(`/api/campaigns/${campaignId}/participants`,read,{refreshInterval:30000})
 return <section className="session-participants-list" aria-label="Jogadores e personagens da mesa">
 <h3 className="font-serif text-lg">Jogadores e personagens</h3>
 {error&&<p role="alert" className="text-sm text-muted-foreground">Não foi possível carregar participantes.</p>}
 {!data&&!error&&<p className="text-sm text-muted-foreground">Carregando participantes...</p>}
 <ul className="mt-3 flex flex-col gap-2">{data?.participants.map((p,i)=><li key={`${p.actorId}:${p.characterId??i}`} className="rounded-md border border-border p-3"><strong className="block text-sm">{p.nickname||p.playerName}{p.isNarrator?' · Narrador':''}</strong>{p.nickname&&p.nickname!==p.playerName&&<span className="block text-xs text-muted-foreground">{p.playerName}</span>}{p.pronouns&&<span className="block text-xs text-muted-foreground">{p.pronouns}</span>}{p.characterName&&<span className="block text-sm">Personagem: {p.characterName}</span>}</li>)}</ul>
 <Link href="/profile" className="mt-3 inline-block text-xs underline">Editar meu perfil</Link>
 </section>
}
