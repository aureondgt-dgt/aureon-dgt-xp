"use client";

import { Icon } from "@/components/icons";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-rose-400/30 bg-rose-400/10 text-rose-300">
        <Icon name="alert" size={22} />
      </span>
      <h2 className="text-lg font-semibold text-white">Algo interrompeu o carregamento</h2>
      <p className="max-w-md text-xs text-white/45">
        Não foi possível carregar esta área da plataforma. Tente novamente — seus dados e o seu XP estão salvos com segurança.
      </p>
      <button type="button" onClick={reset} className="btn-primary">
        <Icon name="history" size={14} /> Recarregar
      </button>
    </div>
  );
}
