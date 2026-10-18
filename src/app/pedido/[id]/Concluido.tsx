"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { campanha } from "@/config/campanha";
import { useReserva } from "@/lib/reserva";
import { linkWhatsapp } from "@/lib/formatar";

export function Concluido() {
  const { id } = useParams<{ id: string }>();
  const { carregado, limpar } = useReserva();

  // Reserva concluída: a próxima visita começa do zero.
  useEffect(() => {
    if (carregado) limpar();
  }, [carregado, limpar]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-8 text-center">
      <div className="flex w-full items-center gap-4 rounded-full border border-neutral-900 px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-acao text-white">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="flex-1 text-xl font-bold">#{id}</span>
      </div>

      <p className="mt-8 text-lg">Você garantiu uma vaga exclusiva! Sua reserva foi confirmada.</p>

      <a
        href={linkWhatsapp(campanha.whatsapp, `Olá! Quero acompanhar meu pedido ${id}.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 font-semibold text-white active:bg-neutral-700"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z" />
        </svg>
        Quero acompanhar meu pedido
      </a>
    </div>
  );
}
