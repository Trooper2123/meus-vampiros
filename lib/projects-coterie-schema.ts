/**
 * SPEC-SESSION-011. Bootstrap aditivo; executar somente após validar o ambiente.
 * O banco de testes precisa de schema isolado. Nada aqui apaga dados existentes.
 */
export const PROJECTS_COTERIE_SCHEMA = `
CREATE TABLE IF NOT EXISTS coterie_type_catalog (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  suggested_mechanics JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE coterie_type_catalog ADD COLUMN IF NOT EXISTS id TEXT;
UPDATE coterie_type_catalog SET id = code WHERE id IS NULL;
ALTER TABLE coterie_type_catalog ALTER COLUMN id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS coterie_type_catalog_id_idx ON coterie_type_catalog(id);
INSERT INTO coterie_type_catalog (id,code,name,description,source,suggested_mechanics)
VALUES
('BLOOD_CULT','BLOOD_CULT','Blood Cult','Culto de sangue; atrai seguidores mortais.','V5 Corebook pp. 197–199','{"lien":1,"portillon":2,"herd":3}'::jsonb),
('CERBERUS','CERBERUS','Cerberus','Guarda local, relíquia ou passagem importante.','V5 Corebook pp. 197–199','{}'::jsonb),
('CHAMPIONS','CHAMPIONS','Champions','Defende uma causa reconhecível dentro ou fora da sociedade vampírica.','V5 Corebook pp. 197–199','{"chasse":1,"lien":3}'::jsonb),
('COMMANDO','COMMANDO','Commando','Grupo de combate e operações de um patrono.','V5 Corebook pp. 197–199','{"chasse":1,"portillon":2}'::jsonb),
('DAY_WATCH','DAY_WATCH','Day Watch','Protege a cidade de ameaças mortais durante o dia.','V5 Corebook pp. 197–199','{"chasse":1,"portillon":2}'::jsonb),
('FANG_GANG','FANG_GANG','Fang Gang','Quadrilha de crimes ou golpes.','V5 Corebook pp. 197–199','{"chasse":1,"lien":1,"portillon":1}'::jsonb),
('HUNTING_PARTY','HUNTING_PARTY','Hunting Party','Caça e captura humanos com características específicas de sangue.','V5 Corebook pp. 197–199','{"chasse":3}'::jsonb),
('MARECHAL','MARECHAL','Maréchal','Serve e guarda Príncipe ou Barão.','V5 Corebook pp. 197–199','{}'::jsonb),
('NOMADS','NOMADS','Nomads','Coterie itinerante; pode operar sem Domain.','V5 Corebook pp. 197–199','{"hasDomain":false}'::jsonb),
('PLUMAIRES','PLUMAIRES','Plumaires','Coterie social ligada a interesses e subculturas.','V5 Corebook pp. 197–199','{"chasse":2,"lien":2}'::jsonb),
('QUESTARI','QUESTARI','Questari','Busca um objetivo, artefato ou mistério de longo prazo.','V5 Corebook pp. 197–199','{"chasse":1,"lien":3}'::jsonb),
('REGENCY','REGENCY','Regency','Administra a posição de um ancião ausente.','V5 Corebook pp. 197–199','{"chasse":2,"portillon":3}'::jsonb),
('SBIRRI','SBIRRI','Sbirri','Serve secretamente outra autoridade usando identidade de fachada.','V5 Corebook pp. 197–199','{}'::jsonb),
('VEHME','VEHME','Vehme','Reforça a Máscara e contém infratores.','V5 Corebook pp. 197–199','{"chasse":1}'::jsonb),
('WATCHMEN','WATCHMEN','Watchmen','Patrulha a cidade contra intrusos.','V5 Corebook pp. 197–199','{"chasse":1,"lien":2,"portillon":1}'::jsonb)
ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS coteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type_id TEXT REFERENCES coterie_type_catalog(id),
  chronicle TEXT,
  city TEXT,
  description TEXT NOT NULL DEFAULT '',
  has_domain BOOLEAN NOT NULL DEFAULT false,
  domain_description TEXT NOT NULL DEFAULT '',
  chasse INT NOT NULL DEFAULT 0 CHECK(chasse BETWEEN 0 AND 5),
  lien INT NOT NULL DEFAULT 0 CHECK(lien BETWEEN 0 AND 5),
  portillon INT NOT NULL DEFAULT 0 CHECK(portillon BETWEEN 0 AND 5),
  domain_resonance TEXT NOT NULL DEFAULT '',
  chronicle_tenets TEXT NOT NULL DEFAULT '',
  revision INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id,campaign_id),
  CHECK(has_domain OR (chasse=0 AND lien=0 AND portillon=0))
);
CREATE INDEX IF NOT EXISTS coteries_campaign_idx ON coteries(campaign_id);
CREATE TABLE IF NOT EXISTS coterie_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coterie_id UUID NOT NULL REFERENCES coteries(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE RESTRICT,
  role TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS coterie_member_active_unique ON coterie_members(coterie_id,character_id) WHERE left_at IS NULL;
CREATE TABLE IF NOT EXISTS coterie_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coterie_id UUID NOT NULL REFERENCES coteries(id) ON DELETE CASCADE,
  background_code TEXT NOT NULL,
  dots INT NOT NULL CHECK(dots BETWEEN 1 AND 5),
  description TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'CUSTOM'
);
CREATE TABLE IF NOT EXISTS coterie_advantages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coterie_id UUID NOT NULL REFERENCES coteries(id) ON DELETE CASCADE,
  catalog_item_id TEXT,
  custom_name TEXT,
  dots INT NOT NULL CHECK(dots BETWEEN 1 AND 5),
  kind TEXT NOT NULL CHECK(kind IN ('ADVANTAGE','FLAW')),
  notes TEXT NOT NULL DEFAULT '',
  CHECK(catalog_item_id IS NOT NULL OR nullif(trim(custom_name),'') IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS coterie_havens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coterie_id UUID NOT NULL REFERENCES coteries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS coterie_one_primary_haven_idx ON coterie_havens(coterie_id) WHERE is_primary;
CREATE TABLE IF NOT EXISTS coterie_haven_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  haven_id UUID NOT NULL REFERENCES coterie_havens(id) ON DELETE CASCADE,
  catalog_item_id TEXT,
  custom_name TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('MERIT','FLAW')),
  dots INT NOT NULL CHECK(dots BETWEEN 1 AND 5),
  CHECK(catalog_item_id IS NOT NULL OR nullif(trim(custom_name),'') IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS coterie_boons_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coterie_id UUID NOT NULL REFERENCES coteries(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('BOON_OWED_TO_COTERIE','BOON_OWED_BY_COTERIE','DEBT')),
  counterparty TEXT NOT NULL,
  level INT NOT NULL CHECK(level BETWEEN 1 AND 5),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','SETTLED','CANCELLED'))
);
CREATE TABLE IF NOT EXISTS coterie_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coterie_id UUID NOT NULL REFERENCES coteries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','COMPLETED','ABANDONED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS character_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  owner_character_id UUID REFERENCES characters(id) ON DELETE RESTRICT,
  coterie_id UUID REFERENCES coteries(id) ON DELETE RESTRICT,
  origin_goal_id UUID UNIQUE REFERENCES coterie_goals(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal_description TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK(project_type IN ('PERSONAL','COTERIE')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','AWAITING_APPROVAL','ACTIVE','SUCCESS','FAILED','ABANDONED')),
  target_trait TEXT,
  target_current_dots INT CHECK(target_current_dots BETWEEN 0 AND 5),
  target_final_dots INT CHECK(target_final_dots BETWEEN 0 AND 5),
  scope INT CHECK(scope BETWEEN 1 AND 5),
  increment_unit TEXT CHECK(increment_unit IN ('DAY','WEEK','MONTH','YEAR')),
  increment_value INT CHECK(increment_value BETWEEN 1 AND 120),
  project_die INT CHECK(project_die BETWEEN 1 AND 10),
  launch_pool INT CHECK(launch_pool BETWEEN 1 AND 50),
  launch_difficulty INT CHECK(launch_difficulty BETWEEN 3 AND 50),
  launch_result JSONB,
  approved_at TIMESTAMPTZ,
  approved_by_user_id TEXT,
  launch_failure_count INT NOT NULL DEFAULT 0 CHECK(launch_failure_count BETWEEN 0 AND 50),
  goal_roll_requested BOOLEAN NOT NULL DEFAULT false,
  private_narrator_notes TEXT NOT NULL DEFAULT '',
  revision INT NOT NULL DEFAULT 0,
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  launched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK((project_type='PERSONAL' AND owner_character_id IS NOT NULL AND coterie_id IS NULL)
     OR (project_type='COTERIE' AND coterie_id IS NOT NULL AND owner_character_id IS NULL)),
  CHECK(target_current_dots IS NULL OR target_final_dots IS NULL OR target_final_dots>target_current_dots)
);
CREATE INDEX IF NOT EXISTS character_projects_campaign_idx ON character_projects(campaign_id,status,updated_at DESC);
CREATE TABLE IF NOT EXISTS project_participants (
  project_id UUID NOT NULL REFERENCES character_projects(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE RESTRICT,
  PRIMARY KEY(project_id,character_id)
);
CREATE TABLE IF NOT EXISTS project_npc_participants (
  project_id UUID NOT NULL REFERENCES character_projects(id) ON DELETE CASCADE,
  campaign_npc_id UUID NOT NULL,
  participation_role TEXT NOT NULL DEFAULT 'PARTNER' CHECK(participation_role IN ('PARTNER','ALLY','ADVERSARY','OTHER')),
  display_name TEXT NOT NULL,
  PRIMARY KEY(project_id,campaign_npc_id)
);
CREATE TABLE IF NOT EXISTS project_stakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES character_projects(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE RESTRICT,
  coterie_id UUID REFERENCES coteries(id) ON DELETE RESTRICT,
  trait TEXT NOT NULL,
  dots INT NOT NULL CHECK(dots BETWEEN 0 AND 5),
  available BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  CHECK((character_id IS NOT NULL) <> (coterie_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS project_stakes_active ON project_stakes(character_id,coterie_id,trait) WHERE released_at IS NULL;
CREATE TABLE IF NOT EXISTS project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES character_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('CREATED','UPDATED','SUBMITTED','APPROVED','LAUNCH_PENDING_STAKE','LAUNCHED','LAUNCH_FAILED','INCREMENT','GOAL_REQUESTED','GOAL_ROLL','INTERFERENCE','STAKE_LOST','COMPLETED','FAILED','ABANDONED')),
  previous_project_die INT,
  new_project_die INT,
  description TEXT NOT NULL DEFAULT '',
  mechanical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS project_commands (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL,
  command_key UUID NOT NULL,
  payload_hash TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(campaign_id,actor_user_id,command_key)
);
`;
