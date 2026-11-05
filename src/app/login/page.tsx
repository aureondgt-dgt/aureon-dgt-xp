import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { getCurrentMember } from "@/lib/auth";
import { BrandMark, Icon } from "@/components/icons";
import { SubmitButton } from "@/components/forms";

export const dynamic = "force-dynamic";

const DEMO_ACCOUNTS = [
  { name: "Abraão", role: "Sócio • Administrador", email: "abraao@aureon.com", accent: "#a259ff" },
  { name: "Allen", role: "Sócio • Comercial", email: "allen@aureon.com", accent: "#38bdf8" },
  { name: "Matheus", role: "Sócio • Design", email: "matheus@aureon.com", accent: "#34d399" },
];

const FEATURES = [
  { icon: "zap" as const, title: "XP por resultado", text: "Cada atividade aprovada vira experiência real na sua jornada." },
  { icon: "crown" as const, title: "10 patentes exclusivas", text: "De Recruta a Lenda Aureon, com emblemas próprios." },
  { icon: "target" as const, title: "Missões e metas", text: "Diárias, semanais, mensais e coletivas com recompensas." },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const member = await getCurrentMember();
  if (member) redirect("/inicio");
  const { error } = await searchParams;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-noise opacity-40" />
      <div className="pointer-events-none absolute -left-40 top-0 size-[38rem] rounded-full bg-violet-700/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 size-[34rem] rounded-full bg-fuchsia-700/15 blur-[130px]" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1320px] items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div className="animate-fade-up">
          <div className="flex items-center gap-3">
            <BrandMark className="h-12 w-12" />
            <div>
              <p className="text-xl font-bold tracking-[0.2em] text-white">
                AUREON<span className="text-neon-bright">XP</span>
              </p>
              <p className="text-[0.6rem] font-medium uppercase tracking-[0.34em] text-white/35">Evolua. Conquiste. Construa.</p>
            </div>
          </div>

          <h1 className="mt-10 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            O seu trabalho na Aureon agora tem <span className="text-gradient">nível, patente e legado.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">
            A plataforma interna de gamificação e performance da Aureon transforma cada entrega em XP, cada meta em
            missão e cada integrante em parte de uma evolução coletiva.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="card animate-fade-up p-3.5"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="flex size-8 items-center justify-center rounded-lg border border-neon/25 bg-neon/10 text-neon-bright">
                  <Icon name={feature.icon} size={16} />
                </span>
                <p className="mt-2.5 text-xs font-semibold text-white">{feature.title}</p>
                <p className="mt-1 text-[0.68rem] leading-relaxed text-white/45">{feature.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 text-[0.65rem] uppercase tracking-[0.18em] text-white/30">
            <span>Acesso restrito</span>
            <span className="size-1 rounded-full bg-white/20" />
            <span>Dados protegidos</span>
            <span className="size-1 rounded-full bg-white/20" />
            <span>Aureon Group</span>
          </div>
        </div>

        <div className="animate-fade-up card card-glow relative overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-neon/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">Entrar na plataforma</h2>
                <p className="mt-1 text-xs text-white/45">Use suas credenciais corporativas Aureon.</p>
              </div>
              <span className="chip border-neon/30 bg-neon/10 text-neon-bright">
                <Icon name="lock" size={11} /> Seguro
              </span>
            </div>

            {error ? (
              <p className="mt-4 flex items-center gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
                <Icon name="alert" size={14} /> {error}
              </p>
            ) : null}

            <form action={loginAction} className="mt-5 space-y-3.5">
              <div>
                <span className="label">E-mail</span>
                <input name="email" type="email" className="input" placeholder="nome@aureon.com" required autoComplete="email" />
              </div>
              <div>
                <span className="label">Senha</span>
                <input name="password" type="password" className="input" placeholder="••••••••" required autoComplete="current-password" />
              </div>
              <SubmitButton className="btn-primary w-full" pendingLabel="Autenticando..." icon={<Icon name="logout" size={15} className="rotate-180" />}>
                Acessar o Aureon XP
              </SubmitButton>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/8" />
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/30">Acesso rápido de demonstração</span>
              <span className="h-px flex-1 bg-white/8" />
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <form key={account.email} action={loginAction} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-2">
                  <input type="hidden" name="email" value={account.email} />
                  <input type="hidden" name="password" value="aureon123" />
                  <span
                    className="flex size-8 items-center justify-center rounded-full border text-[0.7rem] font-bold"
                    style={{ borderColor: `${account.accent}55`, color: account.accent, background: `${account.accent}14` }}
                  >
                    {account.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">{account.name}</p>
                    <p className="text-[0.65rem] text-white/40">{account.role}</p>
                  </div>
                  <SubmitButton className="btn-ghost px-2.5 py-1 text-[0.68rem]" pendingLabel="Entrando...">
                    Entrar
                  </SubmitButton>
                </form>
              ))}
            </div>

            <p className="mt-4 text-center text-[0.62rem] leading-relaxed text-white/30">
              Senha padrão dos perfis de demonstração: <span className="text-white/55">aureon123</span>. O cadastro de novos
              integrantes é feito exclusivamente pela administração.
            </p>
            <Link href="/api/health" className="mt-2 block text-center text-[0.6rem] text-white/20 hover:text-white/40">
              status do sistema
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
