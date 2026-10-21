import type { ClanCode } from './clans'
import type { RuleSourceId } from './rule-profile'

export type ClanRule = {
  name: string
  originalName: string
  description: string
  sourceId: RuleSourceId
  section: string
  mechanics: {
    rules: string[]
    dicePenalty?: number | 'BANE_SEVERITY'
    difficultyBase?: number
    aggravatedDamage?: { track: 'HEALTH' | 'WILLPOWER'; amount: 'BANE_SEVERITY' | 'TENS_ON_BANE_DICE' | 'SUNLIGHT_PLUS_BANE_SEVERITY' }
    endsWhen?: string
  }
}
export type ClanRuleSet = { originalName: string; description: string; baneRule: ClanRule; compulsionRule: ClanRule }

// Traduções de apresentação; preservar os nomes e a edição original junto das regras.
export const CLAN_RULES: Partial<Record<ClanCode, ClanRuleSet>> = {
  BANU_HAQIM: {
    originalName: 'Banu Haqim', description: 'Juízes do sangue que conciliam seus códigos pessoais com a sede de punir e consumir transgressores.',
    baneRule: {
      name: 'Sede de vitae', originalName: 'Bane — Banu Haqim', sourceId: 'CLAN-BANU-HAQIM', section: 'Bane',
      description: 'Ao beber sangue de outro vampiro, o Banu Haqim tem dificuldade de interromper a alimentação e pode tentar consumir a vítima por completo.',
      mechanics: { difficultyBase: 2, rules: ['Saciar ao menos 1 ponto de Fome com vitae vampírica exige teste de frenesi de Fome com dificuldade 2 + Gravidade da Perdição. Falhar leva a continuar bebendo, com risco de diablerie.'] },
    },
    compulsionRule: {
      name: 'Julgamento', originalName: 'Judgment', sourceId: 'CLAN-BANU-HAQIM', section: 'Clan Compulsion: Judgment',
      description: 'A Besta exige punir alguém que transgrida as Convicções do próprio vampiro, tomando seu sangue como reparação.',
      mechanics: { dicePenalty: 3, rules: ['Enquanto não saciar ao menos 1 ponto de Fome de um transgressor de suas Convicções, sofre −3 dados em todas as rolagens. Se a vítima for vampira, a Perdição também pode ser desencadeada.'], endsWhen: 'Saciar a exigência ou encerrar a cena.' },
    },
  },
  HECATA: {
    originalName: 'Hecata', description: 'Família de linhagens necromânticas unidas por sua ligação com os mortos e pelos conflitos de sua própria herança.',
    baneRule: {
      name: 'Beijo doloroso', originalName: 'Painful Kiss', sourceId: 'CLAN-HECATA', section: 'Bane',
      description: 'A mordida Hecata causa agonia em vez de prazer. Vítimas resistem ou tentam fugir, e a alimentação direta sempre prejudica o alvo.',
      mechanics: { difficultyBase: 2, rules: ['Beber diretamente só permite alimentação prejudicial, com perda de sangue; mortais indispostos e soltos tentam escapar.', 'Mortais coagidos ou voluntários testam Vigor + Determinação, dificuldade 2 + Gravidade da Perdição, para não recuar. Vampiros coagidos ou voluntários testam frenesi de terror, dificuldade 3. A severidade é a do Hecata.'] },
    },
    compulsionRule: {
      name: 'Morbidez', originalName: 'Morbidity', sourceId: 'CLAN-HECATA', section: 'Compulsion: Morbidity',
      description: 'Uma curiosidade mórbida exige investigar sinais de doença, fragilidade e morte nas pessoas próximas.',
      mechanics: { dicePenalty: 3, rules: ['−3 dados em outras rolagens até prever uma morte sem meios sobrenaturais ou solucionar a causa de uma morte local. A conclusão deve ser plausível, mas não precisa estar correta.'], endsWhen: 'Cumprir a investigação ou encerrar a cena.' },
    },
  },
  LASOMBRA: {
    originalName: 'Lasombra', description: 'Mestres das sombras que valorizam ambição, domínio e a capacidade de sobreviver às próprias provações.',
    baneRule: {
      name: 'Imagem distorcida', originalName: 'Bane — Lasombra', sourceId: 'CLAN-LASOMBRA', section: 'Bane / Lasombra and Technology',
      description: 'Reflexos, gravações e transmissões revelam uma distorção sobrenatural, sem garantir anonimato. Equipamentos modernos podem falhar ao interagir com o vampiro.',
      mechanics: { dicePenalty: 'BANE_SEVERITY', difficultyBase: 2, rules: ['Usar tecnologia moderna de comunicação, inclusive telefonar, exige teste de Tecnologia com dificuldade 2 + Gravidade da Perdição.', 'Evitar sistemas eletrônicos de detecção de vampiros sofre penalidade de dados igual à Gravidade da Perdição. Reflexos distorcidos não tornam o vampiro invisível nem impedem sua identificação.'] },
    },
    compulsionRule: {
      name: 'Implacabilidade', originalName: 'Ruthlessness', sourceId: 'CLAN-LASOMBRA', section: 'Compulsion: Ruthlessness',
      description: 'O Lasombra não tolera fracassos e insiste em atingir seu objetivo por métodos cada vez mais cruéis.',
      mechanics: { dicePenalty: 2, rules: ['Após a próxima falha em uma ação, −2 dados em todas as rolagens, inclusive nas novas tentativas da ação que falhou. Não acumular −2 a cada falha.'], endsWhen: 'Uma tentativa futura da mesma ação tiver sucesso; o Narrador confirma o que constitui a mesma ação.' },
    },
  },
  MINISTRY: {
    originalName: 'The Ministry', description: 'Tentadores ligados ao culto de Set, que buscam libertar ou corromper outros ao romper suas crenças e limites.',
    baneRule: {
      name: 'Aversão à luz', originalName: 'Bane — The Ministry', sourceId: 'CLAN-MINISTRY', section: 'Bane',
      description: 'Luz intensa dirigida ao vampiro, natural ou artificial, prejudica suas ações. O sol é ainda mais destrutivo para o Ministério.',
      mechanics: { dicePenalty: 'BANE_SEVERITY', aggravatedDamage: { track: 'HEALTH', amount: 'SUNLIGHT_PLUS_BANE_SEVERITY' }, rules: ['Sob luz intensa dirigida diretamente ao personagem, subtrair a Gravidade da Perdição de todas as paradas de dados.', 'Somar a Gravidade da Perdição ao dano agravado recebido de luz solar. Iluminação artificial não causa automaticamente esse dano solar.'] },
    },
    compulsionRule: {
      name: 'Transgressão', originalName: 'Transgression', sourceId: 'CLAN-MINISTRY', section: 'Clan Compulsion: Transgression',
      description: 'O vampiro precisa levar alguém, inclusive a si próprio, a romper as amarras de uma Convicção ou Princípio da crônica.',
      mechanics: { dicePenalty: 2, rules: ['−2 dados nas paradas sem relação com induzir a violação de uma Convicção ou Princípio. A transgressão precisa causar ao menos 1 Mancha; não atribuir Manchas por apenas ativar a compulsão.'], endsWhen: 'A transgressão causar ao menos 1 Mancha.' },
    },
  },
  RAVNOS: {
    originalName: 'Ravnos', description: 'Sobreviventes errantes de um clã devastado, conduzidos pelo perigo e pela necessidade sobrenatural de continuar em movimento.',
    baneRule: {
      name: 'Condenação errante', originalName: 'Bane — Ravnos', sourceId: 'CLAN-RAVNOS', section: 'Bane',
      description: 'Repousar repetidamente no mesmo lugar faz o fogo da maldição arder dentro do Ravnos.',
      mechanics: { aggravatedDamage: { track: 'HEALTH', amount: 'TENS_ON_BANE_DICE' }, rules: ['Ao dormir de dia em local já usado nas últimas 7 noites, rolar uma quantidade de dados igual à Gravidade da Perdição: cada resultado 10 causa 1 dano agravado. Não contar sucessos comuns nem pares críticos.', 'A regra volta a se aplicar a cada repouso repetido. Salvo definição da crônica, locais devem distar ao menos 1 milha (aproximadamente 1,6 km). Refúgio móvel exige mudar o local onde estaciona. Não pode escolher o Defeito Sem Refúgio na criação.'] },
    },
    compulsionRule: {
      name: 'Tentar o destino', originalName: 'Tempting Fate', sourceId: 'CLAN-RAVNOS', section: 'Compulsion: Tempting Fate',
      description: 'Diante de um problema, o Ravnos sente necessidade de buscar a solução mais ousada e perigosa.',
      mechanics: { dicePenalty: 2, rules: ['−2 dados em tentativas de solução que não sejam as mais ousadas ou perigosas. Bônus por ousadia são decisão do Narrador, não uma concessão automática.'], endsWhen: 'Resolver o problema ou tornar novas tentativas impossíveis.' },
    },
  },
  SALUBRI: {
    originalName: 'Salubri', description: 'Raros descendentes de Saulot, perseguidos por outros Membros e identificados pelo terceiro olho que carregam.',
    baneRule: {
      name: 'Sangue cobiçado e terceiro olho', originalName: 'Bane — Salubri', sourceId: 'CLAN-SALUBRI', section: 'Bane',
      description: 'Sua vitae é especialmente tentadora para outros vampiros. O terceiro olho está sempre presente e não pode ser ocultado por poderes sobrenaturais.',
      mechanics: { difficultyBase: 2, rules: ['Um não Salubri que sacie ao menos 1 ponto de Fome com seu sangue testa frenesi de Fome, dificuldade 2 + Gravidade da Perdição do Salubri; para Banu Haqim, 3 + essa mesma severidade. Falhar leva a continuar bebendo.', 'Ao ativar qualquer poder de Disciplina, o terceiro olho verte vitae em intensidade relacionada ao nível do poder. Isso provoca teste de frenesi de Fome em vampiros próximos com Fome 4 ou mais. Cobertura física é possível; ocultação sobrenatural, não.'] },
    },
    compulsionRule: {
      name: 'Empatia afetiva', originalName: 'Affective Empathy', sourceId: 'CLAN-SALUBRI', section: 'Compulsion: Affective Empathy',
      description: 'A dor pessoal de alguém na cena domina a atenção do Salubri, que procura aliviar esse sofrimento.',
      mechanics: { dicePenalty: 2, rules: ['−2 dados em ações que não ajudem a aliviar a tragédia pessoal escolhida. A gravidade aparente do problema não elimina a obrigação.'], endsWhen: 'Aliviar o sofrimento, surgir crise mais imediata ou encerrar a cena.' },
    },
  },
  TZIMISCE: {
    originalName: 'Tzimisce', description: 'Senhores possessivos que vinculam sua existência a um domínio, incumbência ou conjunto de pessoas sob seu controle.',
    baneRule: {
      name: 'Vínculo com o domínio', originalName: 'Bane — Tzimisce', sourceId: 'CLAN-TZIMISCE', section: 'Bane',
      description: 'O Tzimisce precisa repousar cercado por uma posse ou domínio específico: território, pessoas, organização ou outra incumbência delimitada.',
      mechanics: { aggravatedDamage: { track: 'WILLPOWER', amount: 'BANE_SEVERITY' }, rules: ['Definir uma posse ou incumbência clara e limitada. Dormir fora dela causa dano agravado à Força de Vontade igual à Gravidade da Perdição ao despertar na noite seguinte. Não é dano à Vitalidade e não exige rolagem.'] },
    },
    compulsionRule: {
      name: 'Cobiça', originalName: 'Covetousness', sourceId: 'CLAN-TZIMISCE', section: 'Compulsion: Covetousness',
      description: 'O vampiro fica obcecado em possuir algo da cena, seja objeto, propriedade ou pessoa.',
      mechanics: { dicePenalty: 2, rules: ['−2 dados em ações que não contribuam para obter a posse desejada. O Narrador define o que representa posse quando o alvo não for um objeto.'], endsWhen: 'Estabelecer a posse ou tornar o objeto de desejo inalcançável.' },
    },
  },
}
