"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { campanha } from "@/config/campanha";
import { useReserva } from "@/lib/reserva";
import { linkWhatsapp } from "@/lib/formatar";
import { classeBotaoAcao, classeBotaoEscuro } from "@/components/Tela";

type Resultado = "aprovado" | "aguardando" | "recusado";

// O Mercado Pago devolve a cliente com ?status=approved|pending|in_process|rejected.
// Provisório: sem banco, a tela confia nesse parâmetro. Quando o banco entrar, o status
// passa a vir do pedido confirmado pelo webhook, e o parâmetro da URL deixa de valer.
function lerResultado(status: string | null): Resultado {
  if (status === null || status === "approved") return "aprovado";
  if (status === "pending" || status === "in_process") return "aguardando";
  return "recusado";
}

function IconeWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

const icones: Record<Resultado, React.ReactNode> = {
  aprovado: (
    <span className="flex size-11 shrink-0 animate-check items-center justify-center rounded-full bg-acao text-white shadow-sm shadow-acao/40">
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={3}>
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ),
  aguardando: (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-100">
      <span className="size-6 animate-spin rounded-full border-[3px] border-neutral-300 border-t-neutral-900" />
    </span>
  ),
  recusado: (
    <span className="flex size-11 shrink-0 animate-check items-center justify-center rounded-full bg-neutral-900 text-white">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={3}>
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      </svg>
    </span>
  ),
};

export function Concluido() {
  const { id } = useParams<{ id: string }>();
  const resultado = lerResultado(useSearchParams().get("status"));
  const { carregado, limpar } = useReserva();

  // Só limpa a reserva quando o pagamento foi aprovado; nos outros casos a cliente pode tentar de novo.
  useEffect(() => {
    if (carregado && resultado === "aprovado") limpar();
  }, [carregado, resultado, limpar]);

  const whatsapp = linkWhatsapp(
    campanha.whatsapp,
    resultado === "recusado"
      ? `Olá! Tive um problema para pagar o sinal do pedido ${id}.`
      : `Olá! Quero acompanhar meu pedido ${id}.`,
  );

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-6 text-center">
      <div className="flex w-full items-center gap-4 rounded-full border border-neutral-200 px-5 py-4 shadow-sm">
        {icones[resultado]}
        <span className="flex-1 text-left text-xl font-bold tracking-tight">#{id}</span>
      </div>

      {resultado === "aprovado" && (
        <>
          <p className="mt-8 animate-entrar text-lg leading-relaxed [animation-delay:200ms]">
            Você garantiu uma vaga exclusiva! Sua reserva foi confirmada.
          </p>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={`${classeBotaoEscuro} mt-8 w-full animate-entrar gap-2 [animation-delay:350ms]`}
          >
            <IconeWhatsapp />
            Quero acompanhar meu pedido
          </a>
        </>
      )}

      {resultado === "aguardando" && (
        <>
          <h1 className="mt-8 animate-entrar text-2xl font-bold tracking-tight">
            Aguardando confirmação
          </h1>
          <p className="mt-2 animate-entrar leading-relaxed text-neutral-600">
            Estamos esperando o Mercado Pago confirmar o seu pagamento. No Pix isso costuma levar
            poucos segundos.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`${classeBotaoEscuro} mt-8 w-full animate-entrar`}
          >
            Atualizar
          </button>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex animate-entrar items-center gap-2 text-sm text-neutral-600 underline underline-offset-4"
          >
            Ficou com dúvida? Fale com a gente
          </a>
        </>
      )}

      {resultado === "recusado" && (
        <>
          <h1 className="mt-8 animate-entrar text-2xl font-bold tracking-tight">
            Pagamento não concluído
          </h1>
          <p className="mt-2 animate-entrar leading-relaxed text-neutral-600">
            O pagamento do sinal não foi aprovado. Você pode tentar de novo, se quiser com outra forma
            de pagamento.
          </p>
          <Link href="/reserva" className={`${classeBotaoAcao} mt-8 animate-entrar`}>
            Tentar de novo
          </Link>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex animate-entrar items-center gap-2 text-sm text-neutral-600 underline underline-offset-4"
          >
            Precisa de ajuda? Fale com a gente
          </a>
        </>
      )}
    </div>
  );
}
