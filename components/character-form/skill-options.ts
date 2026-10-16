import type { SKILL_DISTRIBUTIONS } from '@/lib/vtm-v5/presets'

export type QuickSkillMode = keyof typeof SKILL_DISTRIBUTIONS

export const physicalSkills = ['Armas brancas', 'Armas de fogo', 'Atletismo', 'Briga', 'Condução', 'Furtividade', 'Ladroagem', 'Ofícios', 'Sobrevivência'] as const
export const socialSkills = ['Empatia com animais', 'Etiqueta', 'Intimidação', 'Liderança', 'Manha', 'Performance', 'Persuasão', 'Sagacidade', 'Subterfúgio'] as const
export const mentalSkills = ['Ciência', 'Erudição', 'Finanças', 'Investigação', 'Medicina', 'Ocultismo', 'Percepção', 'Política', 'Tecnologia'] as const

export const skillGroups = [
  { title: 'Físicas', skills: physicalSkills },
  { title: 'Sociais', skills: socialSkills },
  { title: 'Intelectuais', skills: mentalSkills },
] as const

export const skillModeLabels: Record<QuickSkillMode, string> = {
  JACK_OF_ALL_TRADES: 'Generalista',
  BALANCED: 'Equilibrado',
  SPECIALIST: 'Especialista',
}
