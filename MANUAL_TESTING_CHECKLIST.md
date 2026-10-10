# Manual Testing Checklist — Character Form Refactor

**Objetivo:** Validar que o formulário de personagem funciona corretamente após refatoração para controlled inputs e separação de create/edit.

**Pré-requisitos:**
- Dev server rodando: `npm run dev` (Turbopack, sem webpack)
- Autenticação: Necessário Auth0 real ou `DATABASE_URL` configurado para testes de API
- URL: http://localhost:3000

---

## Test 1: Create New Character Flow

**Objetivo:** Validar criação de novo personagem com dados de identidade.

### Steps:
1. Acesse http://localhost:3000/create-characters
2. Preencha **Identidade** (Tab 1):
   - Nome: "Teste Silva"
   - Conceito: "Assassino Noturno"
   - Clã: "Brujah"
   - Predador: "Caçador de Sangue"
   - Geração: "11"
   - Sire: "Master Vampire"
3. Clique **Avançar** para proxima tab
4. Observe o status: "Salvando..." → "Alterações salvas automaticamente"
5. Retorne à **Identidade** (voltar + avançar)
6. **Verificar:** Todos os dados devem estar preenchidos (dados não foram perdidos)
7. Clique **Selar ficha** no final
8. Observe: redirect para `/characters` com personagem listado

### Esperado:
- ✓ Dados salvos automaticamente ao mudar tab
- ✓ Personagem criado com ID e listado em /characters

---

## Test 2: Edit Existing Character

**Objetivo:** Validar que caracteres existentes carregam e editam corretamente.

### Steps:
1. Selecione um personagem da listagem em `/characters`
2. Clique **Editar**
3. Na página de edição `/characters/[id]/edit`:
   - **Verificar que todos os dados aparecem populados** (identidade, atributos, habilidades, etc)
   - Se algum campo estava vazio na gravação anterior, **deve aparecer vazio** (não null/undefined)
4. Edite um campo: mude "Conceito" de "Assassino Noturno" para "Caçador Misterioso"
5. Mude para outra tab e retorne
6. **Verificar:** Edição foi salva (nova valor no conceito)
7. Recarregue a página (F5)
8. **Verificar:** Valor editado persist (carregou do DB)

### Esperado:
- ✓ Dados carregam ao entrar em modo edit
- ✓ Campos vazios permanecem vazios (não há null/undefined)
- ✓ Edições salvam automaticamente
- ✓ Edições persistem após reload

---

## Test 3: Empty Fields Persistence

**Objetivo:** Validar que campos vazios são salvos como strings vazias, não null.

### Steps:
1. Crie novo personagem
2. Preencha APENAS:
   - Nome: "Mínimo"
   - Deixe em branco: conceito, clã, predador, geração, sire
3. Mude para **Atributos** (autosave)
4. Retorne a **Identidade**
5. **Verificar:** Campos em branco continuam em branco (não preenchidos automaticamente)
6. Clique **Selar ficha**
7. Acesse `/api/characters?id=<character-id>` (em browser console ou curl):
   ```bash
   curl http://localhost:3000/api/characters?id=<id>
   ```
8. No JSON retornado, procure por `data` object:
   - `nome`: "Mínimo" ✓
   - `conceito`: "" (string vazio, não null) ✓
   - `cla`: "" (string vazio) ✓
   - etc

### Esperado:
- ✓ Empty fields salvos como "" (not null/undefined)
- ✓ Ao recarregar, campos vazios continuam vazios

---

## Test 4: Discipline Management (Limit 7)

**Objetivo:** Validar limite de 7 disciplinas e gerenciamento.

### Steps:
1. Acesse Tab **Disciplinas** (4º)
2. Há 3 disciplinas vazias por padrão
3. Adicione disciplinas clicando **+ Adicionar disciplina** (até ter 7):
   - Disciplina 1: Animalismo (Level 3)
   - Disciplina 2: Auspícios (Level 2)
   - Disciplina 3: Rapidez (Level 2)
   - Disciplina 4: Dominação (Level 1)
   - Disciplina 5: Feitiçaria de Sangue (Level 1)
   - Disciplina 6: Fortitude (Level 2)
   - Disciplina 7: Oblívio (Level 1)
4. **Verificar:** Botão "+ Adicionar disciplina" fica **desabilitado** (disabled)
5. Remova uma disciplina (deixe um slot vazio)
6. **Verificar:** Botão "+ Adicionar disciplina" volta a **ativo**
7. Mude para outra tab e retorne
8. **Verificar:** Disciplinas salvaram corretamente (mesmas disciplinas estão lá)

### Esperado:
- ✓ Máximo 7 disciplinas simultâneas
- ✓ Botão desabilitado quando limite atingido
- ✓ Disciplinas persistem após tab change
- ✓ Pode adicionar nova após remover uma

---

## Test 5: Autosave on Tab Change

**Objetivo:** Validar que dados salvam automaticamente ao mudar tab.

### Steps:
1. Abra um personagem em modo edit
2. Na tab **Identidade**, edite:
   - Nome: adicione sufixo " - AUTOSAVE TEST"
3. Clique botão **Avançar** para ir para **Atributos**
4. **Observe:** "Salvando..." → "Alterações salvas automaticamente"
5. Mude para **Habilidades** e depois volte a **Identidade**
6. **Verificar:** Nome ainda tem " - AUTOSAVE TEST"

### Esperado:
- ✓ Salva indicado quando troca tab
- ✓ Dados não são perdidos ao navegar
- ✓ Podem voltar e continuar editando

---

## Test 6: Resources & Convictions (Dots & Text)

**Objetivo:** Validar que dots (0-10) e convictions salvam corretamente.

### Steps:
1. Acesse Tab **Recursos e convicções** (5º)
2. Defina recursos clicando nas bolinhas:
   - Humanidade: 7 pontos
   - Força de vontade: 5 pontos
   - Vitalidade: 8 pontos
   - Fome: 3 pontos
3. Preencha **Convicções**:
   - Pilar 1: "Justiça"
   - Crença 1: "Todos merecem um julgamento justo"
   - Pilar 2: "Liberdade"
   - Crença 2: "Ninguém deve ser escravizado"
4. Mude para outra tab
5. Retorne a **Recursos e convicções**
6. **Verificar:** Bolinhas nos mesmos níveis e texto de convictions ainda lá

### Esperado:
- ✓ Dots salvam e carregam
- ✓ Texto de convictions (pilares + crenças) persiste
- ✓ XP Disponível calcula corretamente (Total - Gasto)

---

## Test 7: Campaign Linking (If Available)

**Objetivo:** Validar linking de personagem a mesas.

### Pré-requisito:
- Deve haver pelo menos uma mesa criada em `/campaigns` (ou copie um ID de mesa existente)

### Steps:
1. Abra personagem em modo edit
2. Scroll até **Mesa vinculada** (fim da tab Identidade)
3. Se não vinculado:
   - Cole um **ID da mesa** válido
   - Clique **Vincular**
   - **Verificar:** Apareça o nome da mesa, tema e um botão "Desvincular"
4. Clique **Desvincular**
5. **Verificar:** Volta ao estado de "vincular"
6. Recarregue página (F5)
7. **Verificar:** Estado de vinculação persiste (ainda desvinculado)

### Esperado:
- ✓ Pode vincular personagem a mesa
- ✓ Vinculação persiste após reload
- ✓ Pode desvincular

---

## Test 8: Possessions Management

**Objetivo:** Validar criação e aprovação de pertences.

### Steps:
1. Acesse Tab **Vantagens e Defeitos** (6º) → scroll até **Pertences e Posses**
2. Seção **Seus Pertences**:
   - Item: "Motocicleta Harley"
   - Descrição: "Motor personalizado, vidros insulados"
   - Clique **+ Adicionar pertence**
3. **Verificar:** Item aparece com status "Pendente"
4. Mude para outra tab
5. Retorne a **Vantagens e Defeitos**
6. **Verificar:** Pertence salvo (ainda lá com status Pendente)
7. Scroll até **Concedidos pelo Mestre** (se houver items):
   - Devem ser somente-leitura (não editáveis)

### Esperado:
- ✓ Pertences salvos com status correto
- ✓ Items do mestre são read-only
- ✓ Persistem após reload

---

## Test 9: Merits & Flaws (Vantagens & Defeitos)

**Objetivo:** Validar que vantagens e defeitos com descrições salvam.

### Steps:
1. Na tab **Vantagens e Defeitos**:
2. **Vantagens**:
   - Nome: "Talento para Combate"
   - Nível: 3 (clique nas bolinhas)
   - Clique ícone 📄 para expandir
   - Descrição: "Treinamento marcial especial com sensei vampiro"
3. **Defeitos**:
   - Nome: "Rival Mortal"
   - Nível: 2
   - Descrição: "Ex-policial que descobriu meu segredo"
4. Mude para outra tab
5. Retorne
6. **Verificar:** Dados ainda lá com descrições visíveis/expandidas

### Esperado:
- ✓ Vantagens/defeitos salvam com níveis
- ✓ Descrições persistem
- ✓ Estado expandido/colapsado lógico

---

## Test 10: XP Tracking

**Objetivo:** Validar experiência total, gasta e cálculo de disponível.

### Steps:
1. Na tab **Identidade**, seção de XP:
   - Experiência Total: 150
   - Experiência Gasta: 45
2. **Verificar:** XP Disponível mostra 105 (150 - 45)
3. Edite Experiência Gasta: 60
4. **Verificar:** XP Disponível atualiza para 90 (150 - 60) imediatamente
5. Mude tab
6. Retorne
7. **Verificar:** Valores originais (150, 60, 90 disponível)

### Esperado:
- ✓ Cálculo de XP disponível em tempo real
- ✓ XP Disponível é read-only (não editável)
- ✓ Valores persistem

---

## Checklist Final

- [ ] Test 1: Create flow ✓
- [ ] Test 2: Edit & load ✓
- [ ] Test 3: Empty fields ✓
- [ ] Test 4: Discipline limit ✓
- [ ] Test 5: Autosave ✓
- [ ] Test 6: Resources & convictions ✓
- [ ] Test 7: Campaign linking (skip se não houver mesas)
- [ ] Test 8: Possessions ✓
- [ ] Test 9: Merits & flaws ✓
- [ ] Test 10: XP tracking ✓

---

## Bug Report Template

Se encontrar um bug, documente:

**Test:** (qual dos 10 acima)
**Steps to Reproduce:**
1. ...
2. ...

**Esperado:**
...

**Resultado Obtido:**
...

**Impacto:** (Critical | High | Medium | Low)
**Fix:** (sugestão de solução)

---

## Notes

- Em **dev mode** com Turbopack, recompilação é mais rápida
- Se `DATABASE_URL` não está setado, usa dev-db (in-memory, estado reseta ao reiniciar server)
- Autenticação em dev retorna `dev|local` como user ID (suficiente para testes locais)
- Pre-commit review executado antes; nenhum issue crítico pendente
