import { CreationHint, SheetSection } from './form-controls'
import { dots } from './dot-track'
import { skillGroups, skillModeLabels, type QuickSkillMode } from './skill-options'
import styles from '@/app/create-characters/skills.module.css'

type Props = { independent?: boolean; skills: Record<string, number>; skillMode: QuickSkillMode; setSkillMode: (mode: QuickSkillMode) => void; skillsComplete: boolean; skillPointsRemaining: number; setSkill: (name: string, value: number) => void }

export function SkillsStep({ independent, skills, skillMode, setSkillMode, skillsComplete, skillPointsRemaining, setSkill }: Readonly<Props>) {
  let distributionHint
  if (skillMode === 'JACK_OF_ALL_TRADES') {
    distributionHint = 'Generalista: uma habilidade em 3, oito em 2 e dez em 1.'
  } else if (skillMode === 'BALANCED') {
    distributionHint = 'Equilibrado: três habilidades em 3, cinco em 2 e sete em 1.'
  } else {
    distributionHint = 'Especialista: uma habilidade em 4, três em 3, três em 2 e três em 1.'
  }
  return <SheetSection title="Habilidades" eyebrow="III / aquilo que foi aprendido">{independent ? <p className="mb-5 text-sm text-muted-foreground">Ficha sem mesa: distribua livremente as habilidades entre 0 e 5.</p> : <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr]"><label className="sheet-field"><span>Perfil de distribuição</span><select className="select" value={skillMode} onChange={(event) => setSkillMode(event.target.value as QuickSkillMode)}>{Object.entries(skillModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><CreationHint complete={skillsComplete}>{distributionHint} {skillsComplete ? 'Distribuição concluída.' : `Restam ${skillPointsRemaining} pontos; níveis fora do perfil são bloqueados.`}</CreationHint></div>}<div className={`skills-columns ${styles.skillColumns}`}>{skillGroups.map((group) => <div key={group.title} className={styles.skillGroup}><h3>{group.title}</h3><div className="skill-list">{group.skills.map((skill) => <label key={skill} className={`skill-row ${styles.skillRow}`}><span>{skill}</span>{dots(5, skills[skill] ?? 0, (value) => setSkill(skill, value), `habilidade-${skill.toLowerCase().replaceAll(' ', '-')}`)}</label>)}</div></div>)}</div></SheetSection>
}
