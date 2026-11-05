import Link from "next/link";
import { BrandMark, Icon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <BrandMark className="h-14 w-14" />
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-neon-bright/80">Erro 404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Esta missão não existe no Aureon XP</h1>
      <p className="max-w-md text-sm text-white/45">
        A página que você tentou acessar não faz parte da plataforma ou foi movida pela administração.
      </p>
      <Link href="/inicio" className="btn-primary">
        <Icon name="home" size={15} /> Voltar ao início
      </Link>
    </div>
  );
}
