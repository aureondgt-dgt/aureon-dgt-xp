"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createActivityAction, reviewActivityAction } from "@/app/actions/activities";
import { Icon, type IconName } from "./icons";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel = "Salvando...",
  icon,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (
        <>
          <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          {pendingLabel}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      {children}
      {hint ? <p className="mt-1 text-[0.68rem] text-white/35">{hint}</p> : null}
    </div>
  );
}

export type ActivityTypeOption = {
  id: number;
  name: string;
  category: string;
  xp: number;
  icon: string;
};

export function ActivityForm({
  types,
  memberOptions,
  canAssign,
  currentMemberId,
  today,
}: {
  types: ActivityTypeOption[];
  memberOptions: Array<{ id: number; name: string; jobTitle: string }>;
  canAssign: boolean;
  currentMemberId: number;
  today: string;
}) {
  const [typeId, setTypeId] = useState<number>(types[0]?.id ?? 0);
  const [proofMode, setProofMode] = useState<"none" | "link" | "file">("none");
  const selected = types.find((type) => type.id === typeId);

  return (
    <form action={createActivityAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Atividade realizada">
          <select name="typeId" value={typeId} onChange={(event) => setTypeId(Number(event.target.value))} className="input" required>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} — {type.category} (+{type.xp} XP)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Data da atividade">
          <input type="date" name="occurredAt" defaultValue={today} max={today} className="input" required />
        </Field>
      </div>

      <Field label="Nome da atividade">
        <input
          type="text"
          name="title"
          className="input"
          placeholder={selected ? `Ex.: ${selected.name} para cliente X` : "Descreva o que foi feito"}
          maxLength={140}
          required
        />
      </Field>

      <Field label="Descrição" hint="Detalhe o resultado e o impacto gerado para a Aureon.">
        <textarea name="description" rows={3} className="input resize-none" placeholder="Contexto, cliente, resultado e próximos passos..." />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Integrante responsável" hint={canAssign ? "Administradores podem registrar em nome de outro integrante." : "Registros são vinculados automaticamente à sua conta."}>
          <select name="memberId" className="input" defaultValue={currentMemberId} disabled={!canAssign}>
            {memberOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} • {option.jobTitle}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <span className="label">Comprovante (opcional)</span>
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
            {[
              { key: "none", label: "Sem anexo", icon: "x" as const },
              { key: "link", label: "Link", icon: "link" as const },
              { key: "file", label: "Arquivo", icon: "upload" as const },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setProofMode(option.key as typeof proofMode)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[0.68rem] font-medium transition ${
                  proofMode === option.key ? "bg-neon/20 text-white" : "text-white/45 hover:text-white"
                }`}
              >
                <Icon name={option.icon} size={12} />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {proofMode === "link" ? (
        <Field label="Link do comprovante">
          <input type="url" name="proofUrl" className="input" placeholder="https://..." />
        </Field>
      ) : null}
      {proofMode === "file" ? (
        <Field label="Arquivo do comprovante" hint="PDF, imagem ou documento de até 3MB.">
          <input type="file" name="proof" className="input file:mr-3 file:rounded-md file:border-0 file:bg-neon/20 file:px-2.5 file:py-1 file:text-xs file:text-white" accept="image/*,.pdf,.doc,.docx" />
        </Field>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-neon/25 bg-neon/[0.07] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-neon/30 bg-neon/15 text-neon-bright">
            <Icon name={((selected?.icon ?? "zap") as IconName)} size={18} />
          </span>
          <div>
            <p className="text-xs text-white/50">Recompensa desta atividade</p>
            <p className="text-lg font-semibold text-white">+{selected?.xp ?? 0} XP</p>
          </div>
        </div>
        <p className="max-w-xs text-[0.68rem] leading-relaxed text-white/40">
          O XP é creditado após a aprovação de um administrador. Você nunca aprova as próprias atividades.
        </p>
      </div>

      <SubmitButton className="btn-primary w-full" pendingLabel="Registrando..." icon={<Icon name="plus" size={16} />}>
        Registrar atividade
      </SubmitButton>
    </form>
  );
}

function ReviewActions({ blocked }: { blocked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        name="decision"
        value="approve"
        disabled={pending || blocked}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="check" size={13} />
        {pending ? "Processando..." : "Aprovar"}
      </button>
      <button
        type="submit"
        name="decision"
        value="reject"
        disabled={pending || blocked}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon name="x" size={13} />
        Rejeitar
      </button>
    </div>
  );
}

export function ReviewForm({
  activityId,
  redirectTo,
  selfReview,
  compact = false,
}: {
  activityId: number;
  redirectTo: string;
  selfReview: boolean;
  compact?: boolean;
}) {
  return (
    <form action={reviewActivityAction} className={compact ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input
        type="text"
        name="reviewNote"
        placeholder={compact ? "Observação (opcional)" : "Justificativa da decisão (opcional)"}
        className={`input ${compact ? "w-full min-w-[190px] flex-1" : ""}`}
      />
      <ReviewActions blocked={selfReview} />
      {selfReview ? (
        <p className="text-[0.65rem] text-amber-300/80">Você não pode aprovar a própria atividade. Aguarde outro administrador.</p>
      ) : null}
    </form>
  );
}

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      className="btn-ghost px-2.5 py-1.5 text-[0.7rem]"
    >
      <Icon name={copied ? "check" : "download"} size={12} />
      {copied ? "Copiado!" : label}
    </button>
  );
}
