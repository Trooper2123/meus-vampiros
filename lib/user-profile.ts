import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getUserOrDev } from '@/lib/auth0'

export type UserProfile = { name: string; nickname: string; pronouns: string }
export async function profileActor() {
 const user=await getUserOrDev()
 if(!user?.sub) throw new Error('Sessão não autenticada.')
 return user
}
export async function readUserProfile(actorId:string):Promise<UserProfile> {
 const result=await db.execute<{name:string|null;nickname:string|null;pronouns:string|null}>(sql`SELECT name,nickname,pronouns FROM users WHERE auth0_id=${actorId}`)
 const row=result.rows[0]
 return {name:row?.name??'',nickname:row?.nickname??'',pronouns:row?.pronouns??''}
}
export async function saveUserProfile(actorId:string,profile:UserProfile):Promise<UserProfile> {
 const name=profile.name.trim(),nickname=profile.nickname.trim(),pronouns=profile.pronouns.trim()
 if(!name||name.length>120||nickname.length>80||pronouns.length>80) throw new Error('Dados de perfil inválidos.')
 const result=await db.execute<{name:string;nickname:string;pronouns:string}>(sql`
 INSERT INTO users(auth0_id,name,nickname,pronouns) VALUES(${actorId},${name},${nickname},${pronouns})
 ON CONFLICT(auth0_id) DO UPDATE SET name=EXCLUDED.name,nickname=EXCLUDED.nickname,pronouns=EXCLUDED.pronouns,updated_at=now()
 RETURNING name,nickname,pronouns`)
 return result.rows[0]
}
export type CampaignParticipant={actorId:string;playerName:string;nickname:string;pronouns:string;characterId:string|null;characterName:string|null;isNarrator:boolean}
export async function listCampaignParticipants(campaignId:string,actorId:string):Promise<CampaignParticipant[]> {
 const access=await db.execute<{master_user_id:string;allowed:boolean}>(sql`
 SELECT master_user_id,(master_user_id=${actorId} OR EXISTS(SELECT 1 FROM characters WHERE campaign_id=c.id AND user_id=${actorId} AND status='APPROVED')) AS allowed
 FROM campaigns c WHERE c.id=${campaignId}::uuid`)
 const campaign=access.rows[0]
 if(!campaign?.allowed) throw new Error('Acesso não autorizado à mesa.')
 const result=await db.execute<{actorId:string;playerName:string;nickname:string;pronouns:string;characterId:string|null;characterName:string|null;isNarrator:boolean}>(sql`
 WITH participants AS (
 SELECT c.master_user_id AS actor_id,NULL::uuid AS character_id,NULL::text AS character_name,TRUE AS is_narrator FROM campaigns c WHERE c.id=${campaignId}::uuid
 UNION ALL
 SELECT ch.user_id,ch.id,ch.name,FALSE FROM characters ch WHERE ch.campaign_id=${campaignId}::uuid AND ch.character_type='PLAYER_VAMPIRE' AND ch.status='APPROVED' AND ch.user_id IS NOT NULL
 )
 SELECT p.actor_id AS "actorId",COALESCE(NULLIF(u.name,''),'Jogador') AS "playerName",
 COALESCE(u.nickname,'') AS nickname,COALESCE(u.pronouns,'') AS pronouns,
 p.character_id AS "characterId",p.character_name AS "characterName",p.is_narrator AS "isNarrator"
 FROM participants p LEFT JOIN users u ON u.auth0_id=p.actor_id
 ORDER BY p.is_narrator DESC,COALESCE(NULLIF(u.nickname,''),u.name,p.actor_id),p.character_name`)
 return result.rows
}
