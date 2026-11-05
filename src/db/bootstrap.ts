import { pool } from "@/db";
import { hashPassword } from "@/lib/password";

const DDL = `
CREATE TABLE IF NOT EXISTS members (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  job_title text NOT NULL DEFAULT 'Integrante',
  role text NOT NULL DEFAULT 'member',
  accent text NOT NULL DEFAULT '#a259ff',
  bio text,
  avatar_url text,
  status text NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ranks (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  min_xp integer NOT NULL,
  tier integer NOT NULL,
  color text NOT NULL DEFAULT '#a259ff',
  description text
);
CREATE TABLE IF NOT EXISTS activity_types (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  xp integer NOT NULL,
  icon text NOT NULL DEFAULT 'zap',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS activities (
  id serial PRIMARY KEY,
  member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type_id integer NOT NULL REFERENCES activity_types(id),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  occurred_at date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  proof_url text,
  proof_name text,
  proof_data text,
  xp_awarded integer NOT NULL DEFAULT 0,
  reviewer_id integer REFERENCES members(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS xp_transactions (
  id serial PRIMARY KEY,
  member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'activity',
  reference_id integer,
  actor_id integer REFERENCES members(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS achievements (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  condition_type text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'trophy',
  rarity text NOT NULL DEFAULT 'comum',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS member_achievements (
  id serial PRIMARY KEY,
  member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  achievement_id integer NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_achievements_unique UNIQUE (member_id, achievement_id)
);
CREATE TABLE IF NOT EXISTS missions (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'daily',
  scope text NOT NULL DEFAULT 'individual',
  metric text NOT NULL DEFAULT 'activities',
  target integer NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 50,
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by integer REFERENCES members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mission_claims (
  id serial PRIMARY KEY,
  mission_id integer NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  xp_awarded integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mission_claims_unique UNIQUE (mission_id, member_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  actor_id integer REFERENCES members(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id integer,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activities_member_idx ON activities(member_id);
CREATE INDEX IF NOT EXISTS activities_status_idx ON activities(status);
CREATE INDEX IF NOT EXISTS xp_member_idx ON xp_transactions(member_id);
CREATE INDEX IF NOT EXISTS notifications_member_idx ON notifications(member_id);
`;

const RANKS: Array<[string, string, number, number, string, string]> = [
  ["Recruta", "recruta", 0, 1, "#8a8a9c", "O primeiro passo dentro da Aureon."],
  ["Aprendiz", "aprendiz", 300, 2, "#8b9dc3", "Você já entendeu o jogo. Continue."],
  ["Operador", "operador", 800, 3, "#7dd3fc", "Execução consistente no dia a dia."],
  ["Profissional", "profissional", 1500, 4, "#a259ff", "Referência de entrega e confiança."],
  ["Especialista", "especialista", 2500, 5, "#c084fc", "Domínio técnico reconhecido pela equipe."],
  ["Executivo", "executivo", 3800, 6, "#f0abfc", "Decisões que movem a Aureon."],
  ["Diretor", "diretor", 5500, 7, "#fbbf24", "Liderança e visão de crescimento."],
  ["Elite", "elite", 8000, 8, "#f87171", "Poucos chegam até aqui."],
  ["Mestre", "mestre", 11000, 9, "#34d399", "Maestria absoluta em resultados."],
  ["Lenda Aureon", "lenda", 15000, 10, "#ffffff", "O nível mais alto da jornada Aureon."],
];

const ACTIVITY_TYPES: Array<[string, string, string, number, string, number]> = [
  ["prospectar-cliente", "Prospectar cliente", "Prospecção", 20, "target", 1],
  ["conseguir-interessado", "Conseguir um interessado", "Prospecção", 40, "handshake", 2],
  ["agendar-reuniao", "Agendar reunião", "Reuniões", 50, "calendar", 3],
  ["fechar-venda", "Fechar uma venda", "Vendas", 200, "rocket", 4],
  ["criar-site", "Criar um site", "Desenvolvimento", 150, "code", 5],
  ["entregar-site", "Entregar um site", "Desenvolvimento", 100, "check", 6],
  ["criar-estrategia", "Criar uma estratégia", "Estratégia", 40, "compass", 7],
  ["criar-conteudo", "Criar conteúdo para a empresa", "Marketing", 30, "pen", 8],
  ["resolver-problema", "Resolver um problema importante", "Operações", 50, "shield", 9],
];

const ACHIEVEMENTS: Array<[string, string, string, string, number, number, string, string, number]> = [
  ["primeira-venda", "Primeira Venda", "Conclua a sua primeira venda fechada na Aureon.", "sales", 1, 100, "rocket", "lendaria", 1],
  ["primeiro-cliente", "Cliente Conquistado", "Registre o seu primeiro interessado real.", "clients", 1, 50, "handshake", "rara", 2],
  ["primeiro-site", "Primeira Entrega", "Entregue o seu primeiro site a um cliente.", "sites_delivered", 1, 80, "globe", "rara", 3],
  ["cinco-sites", "5 Sites Entregues", "Entregue 5 sites com qualidade Aureon.", "sites_delivered", 5, 180, "globe", "epica", 4],
  ["dez-sites", "10 Sites Entregues", "Chegue a 10 sites entregues para clientes.", "sites_delivered", 10, 300, "globe", "lendaria", 5],
  ["dez-vendas", "10 Vendas Realizadas", "Feche 10 vendas e entre no clube dos caçadores.", "sales", 10, 500, "diamond", "lendaria", 6],
  ["cem-atividades", "100 Atividades", "Registre 100 atividades aprovadas.", "activities", 100, 400, "growth", "epica", 7],
  ["trinta-dias", "30 Dias de Produtividade", "Mantenha atividade aprovada em 30 dias diferentes.", "active_days", 30, 350, "flame", "epica", 8],
  ["lenda-aureon", "Lenda Aureon", "Alcance 15.000 XP e conquiste a patente máxima.", "xp", 15000, 1000, "crown", "lendaria", 9],
  ["estrategista", "Estrategista", "Crie 5 estratégias aprovadas para a Aureon.", "strategies", 5, 150, "compass", "rara", 10],
  ["voz-aureon", "Voz da Aureon", "Publique 10 conteúdos aprovados sobre a empresa.", "content", 10, 200, "pen", "epica", 11],
  ["primeira-semana", "Primeira Semana", "Registre 5 atividades aprovadas.", "activities", 5, 60, "star", "comum", 12],
];

function isoOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthStart(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function monthEnd(): string {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function weekStart(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function weekEnd(): string {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

const TITLES: Record<string, string[]> = {
  "prospectar-cliente": ["Prospecção ativa de novos negócios", "Abordagem de clientes em potencial", "Mapeamento de novas oportunidades"],
  "conseguir-interessado": ["Lead demonstrou interesse", "Novo interessado captado", "Interesse confirmado no serviço"],
  "agendar-reuniao": ["Reunião agendada com lead", "Call de apresentação marcada", "Reunião de alinhamento agendada"],
  "fechar-venda": ["Venda fechada para cliente", "Contrato assinado", "Novo projeto vendido"],
  "criar-site": ["Site criado para cliente", "Landing page desenvolvida", "Novo site institucional construído"],
  "entregar-site": ["Site entregue para cliente", "Projeto publicado em produção", "Entrega final aprovada pelo cliente"],
  "criar-estrategia": ["Estratégia de crescimento criada", "Plano de prospecção estruturado", "Estratégia de marca definida"],
  "criar-conteudo": ["Conteúdo para a Aureon publicado", "Case da Aureon produzido", "Post institucional criado"],
  "resolver-problema": ["Problema crítico resolvido", "Ajuste importante em produção", "Bloqueio operacional eliminado"],
};

const DESCRIPTIONS: Record<string, string> = {
  "prospectar-cliente": "Prospecção ativa realizada com pesquisa de mercado e abordagem personalizada.",
  "conseguir-interessado": "O cliente respondeu com interesse e pediu detalhes do serviço.",
  "agendar-reuniao": "Reunião confirmada em agenda com pauta definida.",
  "fechar-venda": "Proposta aprovada, pagamento iniciado e contrato fechado.",
  "criar-site": "Projeto construído do zero com design exclusivo e responsivo.",
  "entregar-site": "Site publicado, treinamento entregue e cliente satisfeito.",
  "criar-estrategia": "Documento estratégico criado com metas e responsáveis.",
  "criar-conteudo": "Conteúdo produzido para fortalecer a presença da Aureon.",
  "resolver-problema": "Problema identificado e resolvido com impacto direto na operação.",
};

type SeedPlan = {
  name: string;
  email: string;
  jobTitle: string;
  role: string;
  accent: string;
  bio: string;
  plan: Array<[string, number]>;
};

const MEMBERS: SeedPlan[] = [
  {
    name: "Abraão",
    email: "abraao@aureon.com",
    jobTitle: "Sócio • Desenvolvedor",
    role: "admin",
    accent: "#a259ff",
    bio: "Sócio fundador da Aureon. Constrói produtos, sites e estratégias digitais para os clientes do grupo.",
    plan: [
      ["fechar-venda", 3],
      ["criar-site", 5],
      ["conseguir-interessado", 7],
      ["prospectar-cliente", 9],
      ["entregar-site", 11],
      ["criar-estrategia", 14],
      ["fechar-venda", 16],
      ["prospectar-cliente", 18],
      ["criar-site", 20],
      ["conseguir-interessado", 22],
      ["resolver-problema", 24],
      ["criar-site", 26],
      ["entregar-site", 29],
      ["fechar-venda", 32],
      ["criar-conteudo", 34],
      ["prospectar-cliente", 36],
      ["agendar-reuniao", 38],
      ["criar-site", 41],
      ["fechar-venda", 44],
      ["conseguir-interessado", 47],
      ["entregar-site", 50],
      ["criar-estrategia", 53],
      ["prospectar-cliente", 56],
      ["criar-conteudo", 59],
    ],
  },
  {
    name: "Allen",
    email: "allen@aureon.com",
    jobTitle: "Sócio • Comercial",
    role: "member",
    accent: "#38bdf8",
    bio: "Sócio responsável pela operação comercial da Aureon, com foco em prospecção e fechamento de contratos.",
    plan: [
      ["agendar-reuniao", 2],
      ["conseguir-interessado", 4],
      ["prospectar-cliente", 6],
      ["fechar-venda", 8],
      ["prospectar-cliente", 10],
      ["conseguir-interessado", 13],
      ["criar-conteudo", 15],
      ["agendar-reuniao", 17],
      ["resolver-problema", 19],
      ["fechar-venda", 22],
      ["prospectar-cliente", 25],
      ["conseguir-interessado", 28],
      ["criar-estrategia", 31],
      ["agendar-reuniao", 34],
      ["prospectar-cliente", 37],
      ["fechar-venda", 40],
      ["conseguir-interessado", 43],
      ["prospectar-cliente", 46],
      ["criar-conteudo", 49],
      ["agendar-reuniao", 52],
    ],
  },
  {
    name: "Matheus",
    email: "matheus@aureon.com",
    jobTitle: "Sócio • Design & Conteúdo",
    role: "member",
    accent: "#34d399",
    bio: "Sócio criativo da Aureon. Cuida do design dos projetos, da identidade visual e da produção de conteúdo.",
    plan: [
      ["criar-site", 3],
      ["entregar-site", 6],
      ["criar-conteudo", 8],
      ["agendar-reuniao", 11],
      ["criar-site", 14],
      ["entregar-site", 17],
      ["criar-conteudo", 20],
      ["criar-estrategia", 23],
      ["fechar-venda", 27],
      ["criar-site", 30],
      ["criar-conteudo", 34],
      ["agendar-reuniao", 38],
      ["entregar-site", 42],
      ["criar-estrategia", 47],
      ["fechar-venda", 52],
    ],
  },
];

const MISSIONS = [
  {
    title: "Registrar uma oportunidade",
    description: "Registre pelo menos um novo interessado hoje e mantenha o funil da Aureon ativo.",
    type: "daily",
    scope: "individual",
    metric: "clients",
    target: 1,
    xpReward: 50,
    startsAt: isoOffset(0),
    endsAt: isoOffset(0),
  },
  {
    title: "Criar um site para cliente",
    description: "Avance a construção de um site de cliente e registre a atividade.",
    type: "daily",
    scope: "individual",
    metric: "sites_created",
    target: 1,
    xpReward: 150,
    startsAt: isoOffset(0),
    endsAt: isoOffset(0),
  },
  {
    title: "Postar conteúdo sobre a Aureon",
    description: "Publique um conteúdo sobre a Aureon nas redes e registre a atividade.",
    type: "daily",
    scope: "individual",
    metric: "content",
    target: 1,
    xpReward: 30,
    startsAt: isoOffset(0),
    endsAt: isoOffset(0),
  },
  {
    title: "Ritmo de execução",
    description: "Tenha 5 atividades aprovadas nesta semana.",
    type: "weekly",
    scope: "individual",
    metric: "activities",
    target: 5,
    xpReward: 200,
    startsAt: weekStart(),
    endsAt: weekEnd(),
  },
  {
    title: "Caçador de contratos",
    description: "Feche 2 vendas nesta semana.",
    type: "weekly",
    scope: "individual",
    metric: "sales",
    target: 2,
    xpReward: 300,
    startsAt: weekStart(),
    endsAt: weekEnd(),
  },
  {
    title: "Agenda cheia",
    description: "Agende 3 reuniões nesta semana.",
    type: "weekly",
    scope: "individual",
    metric: "meetings",
    target: 3,
    xpReward: 150,
    startsAt: weekStart(),
    endsAt: weekEnd(),
  },
  {
    title: "Meta coletiva: 50 atividades",
    description: "A Aureon inteira precisa registrar 50 atividades aprovadas nesta semana.",
    type: "weekly",
    scope: "collective",
    metric: "activities",
    target: 50,
    xpReward: 250,
    startsAt: weekStart(),
    endsAt: weekEnd(),
  },
  {
    title: "10 sites entregues no mês",
    description: "Meta individual de entregas de sites no mês atual.",
    type: "monthly",
    scope: "individual",
    metric: "sites_delivered",
    target: 10,
    xpReward: 500,
    startsAt: monthStart(),
    endsAt: monthEnd(),
  },
  {
    title: "Faturamento em movimento",
    description: "Feche 4 vendas durante o mês.",
    type: "monthly",
    scope: "individual",
    metric: "sales",
    target: 4,
    xpReward: 600,
    startsAt: monthStart(),
    endsAt: monthEnd(),
  },
  {
    title: "Operação Aureon 100",
    description: "Meta coletiva do mês: 100 atividades aprovadas por toda a equipe.",
    type: "collective",
    scope: "collective",
    metric: "activities",
    target: 100,
    xpReward: 400,
    startsAt: monthStart(),
    endsAt: monthEnd(),
  },
  {
    title: "Missão especial: expansão",
    description: "Conquiste 5 novos interessados nos próximos 10 dias.",
    type: "special",
    scope: "individual",
    metric: "clients",
    target: 5,
    xpReward: 250,
    startsAt: isoOffset(0),
    endsAt: isoOffset(10),
  },
];

async function seed(): Promise<void> {
  const { rows: memberCount } = await pool.query("SELECT count(*)::int AS count FROM members");
  if ((memberCount[0]?.count ?? 0) > 0) return;

  for (const [name, slug, minXp, tier, color, description] of RANKS) {
    await pool.query(
      "INSERT INTO ranks (name, slug, min_xp, tier, color, description) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO NOTHING",
      [name, slug, minXp, tier, color, description],
    );
  }

  const typeRows = await Promise.all(
    ACTIVITY_TYPES.map(([slug, name, category, xp, icon, sortOrder]) =>
      pool.query(
        "INSERT INTO activity_types (slug, name, category, xp, icon, sort_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [slug, name, category, xp, icon, sortOrder],
      ),
    ),
  );
  const typeIds = new Map<string, number>();
  ACTIVITY_TYPES.forEach(([slug], index) => {
    typeIds.set(slug, typeRows[index].rows[0].id as number);
  });
  const typeInfo = new Map<string, { name: string; category: string; xp: number }>(
    ACTIVITY_TYPES.map(([slug, name, category, xp]) => [slug, { name, category, xp }]),
  );

  const achievementRows = await Promise.all(
    ACHIEVEMENTS.map(([slug, name, description, conditionType, target, xpReward, icon, rarity, sortOrder]) =>
      pool.query(
        "INSERT INTO achievements (slug, name, description, condition_type, target, xp_reward, icon, rarity, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id",
        [slug, name, description, conditionType, target, xpReward, icon, rarity, sortOrder],
      ),
    ),
  );
  const achievementIds = new Map<string, number>();
  ACHIEVEMENTS.forEach(([slug], index) => achievementIds.set(slug, achievementRows[index].rows[0].id as number));

  const passwordHash = hashPassword("aureon123");
  const memberIds: number[] = [];
  for (const member of MEMBERS) {
    const { rows } = await pool.query(
      "INSERT INTO members (name, email, password_hash, job_title, role, accent, bio) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
      [member.name, member.email, passwordHash, member.jobTitle, member.role, member.accent, member.bio],
    );
    memberIds.push(rows[0].id as number);
  }
  const adminId = memberIds[0];
  const reviewerFor = (index: number) => (index === 0 ? memberIds[1] : adminId);

  const stats: Array<Record<string, number>> = MEMBERS.map(() => ({}));

  for (let m = 0; m < MEMBERS.length; m += 1) {
    const member = MEMBERS[m];
    const memberId = memberIds[m];
    for (let i = 0; i < member.plan.length; i += 1) {
      const [slug, daysAgo] = member.plan[i];
      const info = typeInfo.get(slug);
      if (!info) continue;
      const titles = TITLES[slug] ?? [info.name];
      const title = titles[i % titles.length];
      const occurredAt = isoOffset(-daysAgo);
      const reviewedAt = new Date(Date.now() - daysAgo * 86400000 + 3600000);
      const { rows } = await pool.query(
        `INSERT INTO activities (member_id, type_id, title, description, category, occurred_at, status, xp_awarded, reviewer_id, reviewed_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,'approved',$7,$8,$9,$9) RETURNING id`,
        [
          memberId,
          typeIds.get(slug),
          title,
          DESCRIPTIONS[slug] ?? info.name,
          info.category,
          occurredAt,
          info.xp,
          reviewerFor(m),
          reviewedAt,
        ],
      );
      await pool.query(
        `INSERT INTO xp_transactions (member_id, amount, reason, source, reference_id, actor_id, created_at)
         VALUES ($1,$2,$3,'activity',$4,$5,$6)`,
        [memberId, info.xp, `${info.name} aprovada`, rows[0].id, reviewerFor(m), reviewedAt],
      );
      stats[m][slug] = (stats[m][slug] ?? 0) + 1;
      stats[m].activities = (stats[m].activities ?? 0) + 1;
    }

    // Pending activities waiting for review (never self-reviewed)
    const pendingSlugs = m === 0 ? ["fechar-venda", "criar-site"] : m === 1 ? ["conseguir-interessado"] : ["entregar-site", "criar-conteudo"];
    for (let p = 0; p < pendingSlugs.length; p += 1) {
      const slug = pendingSlugs[p];
      const info = typeInfo.get(slug);
      if (!info) continue;
      await pool.query(
        `INSERT INTO activities (member_id, type_id, title, description, category, occurred_at, status, xp_awarded, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',0,$7)`,
        [
          memberId,
          typeIds.get(slug),
          `${info.name} — aguardando validação`,
          "Atividade registrada pelo integrante e aguardando aprovação de um administrador.",
          info.category,
          isoOffset(-p),
          new Date(Date.now() - p * 5400000),
        ],
      );
    }
  }

  // XP adjustment with justification (history of score corrections)
  await pool.query(
    `INSERT INTO xp_transactions (member_id, amount, reason, source, actor_id, note, created_at)
     VALUES ($1, 150, 'Bônus de liderança trimestral', 'adjustment', $2, 'Reconhecimento pela condução do trimestre e suporte aos sócios.', $3)`,
    [memberIds[0], memberIds[1], new Date(Date.now() - 5 * 86400000)],
  );

  await pool.query(
    `INSERT INTO xp_transactions (member_id, amount, reason, source, actor_id, note, created_at)
     VALUES ($1, 80, 'Ajuste de pontuação', 'adjustment', $2, 'Atividade registrada fora do prazo, pontuação corrigida manualmente.', $3)`,
    [memberIds[2], memberIds[0], new Date(Date.now() - 12 * 86400000)],
  );

  // Seed achievements consistent with data
  for (let m = 0; m < MEMBERS.length; m += 1) {
    const s = stats[m];
    const earned: string[] = [];
    if ((s["fechar-venda"] ?? 0) >= 1) earned.push("primeira-venda");
    if ((s["conseguir-interessado"] ?? 0) >= 1) earned.push("primeiro-cliente");
    if ((s["entregar-site"] ?? 0) >= 1) earned.push("primeiro-site");
    if ((s["entregar-site"] ?? 0) >= 5) earned.push("cinco-sites");
    if ((s["entregar-site"] ?? 0) >= 10) earned.push("dez-sites");
    if ((s["fechar-venda"] ?? 0) >= 10) earned.push("dez-vendas");
    if ((s.activities ?? 0) >= 100) earned.push("cem-atividades");
    if ((s.activities ?? 0) >= 5) earned.push("primeira-semana");
    if ((s["criar-estrategia"] ?? 0) >= 5) earned.push("estrategista");
    if ((s["criar-conteudo"] ?? 0) >= 10) earned.push("voz-aureon");
    for (const slug of earned) {
      const achievementId = achievementIds.get(slug);
      if (!achievementId) continue;
      const unlockedAt = new Date(Date.now() - (2 + m * 3) * 86400000);
      await pool.query(
        "INSERT INTO member_achievements (member_id, achievement_id, unlocked_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [memberIds[m], achievementId, unlockedAt],
      );
      await pool.query(
        "INSERT INTO notifications (member_id, type, title, body, link, read_at, created_at) VALUES ($1,'achievement',$2,$3,'/conquistas',$4,$4)",
        [
          memberIds[m],
          "Conquista desbloqueada",
          `Você desbloqueou a conquista ${slug === "lenda-aureon" ? "Lenda Aureon" : slug.replace(/-/g, " ")}.`,
          unlockedAt,
        ],
      );
    }
  }

  const missionIds: number[] = [];
  for (const mission of MISSIONS) {
    const { rows } = await pool.query(
      `INSERT INTO missions (title, description, type, scope, metric, target, xp_reward, starts_at, ends_at, status, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11) RETURNING id`,
      [
        mission.title,
        mission.description,
        mission.type,
        mission.scope,
        mission.metric,
        mission.target,
        mission.xpReward,
        mission.startsAt,
        mission.endsAt,
        adminId,
        new Date(Date.now() - 3600000),
      ],
    );
    missionIds.push(rows[0].id as number);
  }

  // Notifications for the three members
  for (let m = 0; m < MEMBERS.length; m += 1) {
    await pool.query(
      `INSERT INTO notifications (member_id, type, title, body, link, created_at) VALUES
       ($1,'activity','Atividade aprovada','Sua atividade recebeu aprovação e o XP já está na sua conta.','/atividades',$2),
       ($1,'xp','XP recebido','Você recebeu XP por uma atividade aprovada pela administração.','/atividades',$3),
       ($1,'mission','Nova missão criada','A missão especial "Expansão" está disponível com 250 XP de recompensa.','/missoes',$4)`,
      [
        memberIds[m],
        new Date(Date.now() - 2 * 3600000),
        new Date(Date.now() - 5 * 3600000),
        new Date(Date.now() - 26 * 3600000),
      ],
    );
  }

  await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity, entity_id, details, created_at) VALUES
     ($1,'activity.approved','activity',NULL,'Abraão aprovou uma atividade de Allen (+200 XP).',$2),
     ($1,'mission.created','mission',$3,'Missão especial de expansão criada com recompensa de 250 XP.',$2),
     ($1,'xp.adjusted','xp_transaction',NULL,'Bônus de liderança trimestral concedido a Abraão (+150 XP).',$4)`,
    [adminId, new Date(Date.now() - 7200000), missionIds.at(-1) ?? null, new Date(Date.now() - 5 * 86400000)],
  );
}

let ready: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await pool.query(DDL);
      await seed();
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
