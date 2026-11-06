import { sql } from 'drizzle-orm'
import { db } from './db'
import { backgroundCode, backgroundDots } from './project-stake-options'
import type { Session11Tx } from './session11-common'

export type BackgroundAvailability = { trait: string; totalDots: number; reservedDots: number; availableDots: number }

/** Project stakes are the single source of truth; never persist a second balance. */
export function subtractActiveStakes(total: {trait:string;dots:number}[], reserved: {trait:string;dots:number}[]): BackgroundAvailability[] {
  const totals = new Map<string,number>()
  for (const entry of total) {
    const trait=backgroundCode(entry.trait)
    if (trait) totals.set(trait,(totals.get(trait)??0)+entry.dots)
  }
  const held = new Map<string,number>()
  for (const entry of reserved) {
    const trait=backgroundCode(entry.trait)
    if (trait) held.set(trait,(held.get(trait)??0)+entry.dots)
  }
  return [...totals].map(([trait,totalDots])=>({
    trait,totalDots,reservedDots:held.get(trait)??0,availableDots:Math.max(0,totalDots-(held.get(trait)??0))
  }))
}

export async function characterBackgroundAvailability(characterId:string, data:Record<string,unknown>, tx:Session11Tx | typeof db = db) {
  const rows=await tx.execute<{trait:string;dots:number}>(sql`SELECT upper(trim(trait)) AS trait,COALESCE(SUM(dots),0)::int AS dots FROM project_stakes WHERE character_id=${characterId}::uuid AND released_at IS NULL GROUP BY upper(trim(trait))`)
  return subtractActiveStakes(backgroundDots(data),rows.rows)
}

export async function coterieBackgroundAvailability(coterieId:string, tx:Session11Tx | typeof db = db) {
  const totals=await tx.execute<{trait:string;dots:number}>(sql`SELECT background_code AS trait,SUM(dots)::int AS dots FROM coterie_backgrounds WHERE coterie_id=${coterieId}::uuid GROUP BY background_code`)
  const held=await tx.execute<{trait:string;dots:number}>(sql`SELECT upper(trim(trait)) AS trait,SUM(dots)::int AS dots FROM project_stakes WHERE coterie_id=${coterieId}::uuid AND released_at IS NULL GROUP BY upper(trim(trait))`)
  return subtractActiveStakes(totals.rows,held.rows)
}
