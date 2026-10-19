import Link from "next/link";
import { Tela, classeBotaoEscuro } from "@/components/Tela";

export default function NaoEncontrado() {
  return (
    <Tela logo="lettering">
      <div className="mx-auto flex max-w-md flex-col items-center pt-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-neutral-600">O endereço que você abriu não existe ou mudou.</p>
        <Link href="/" className={`${classeBotaoEscuro} mt-8 w-full`}>
          Voltar para o início
        </Link>
      </div>
    </Tela>
  );
}
