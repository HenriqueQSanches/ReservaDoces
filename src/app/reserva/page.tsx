"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { campanha, produtos } from "@/config/campanha";
import { Tela, classeBotaoAcao } from "@/components/Tela";
import { useReserva } from "@/lib/reserva";
import { dataCurta, moeda } from "@/lib/formatar";

export default function Resumo() {
  const router = useRouter();
  const { carregado, itens, dados, totalUnidades, totalCentavos, restanteCentavos } = useReserva();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregado) return;
    if (totalUnidades === 0) router.replace("/");
    else if (!dados) router.replace("/dados");
  }, [carregado, totalUnidades, dados, router]);

  if (!carregado || !dados || totalUnidades === 0) return null;

  const escolhidos = produtos.filter((p) => itens[p.id]);
  const retirada = dados.modalidade === "retirada";

  // Simulação até integrar o Mercado Pago: aqui o backend vai criar o pedido,
  // segurar a vaga por 15 minutos e mandar a cliente para o Checkout Pro.
  function pagar() {
    setEnviando(true);
    const id = `NAT-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    router.push(`/pedido/${id}`);
  }

  return (
    <Tela
      logo="monograma"
      rodape={
        <button type="button" onClick={pagar} disabled={enviando} className={classeBotaoAcao}>
          {enviando ? "Abrindo pagamento..." : `Pagar sinal de ${moeda(campanha.sinalCentavos)}`}
        </button>
      }
    >
      <h1 className="mb-6 text-2xl font-bold">Sua reserva:</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-1 text-sm">
          <p className="font-semibold">{dados.nome}</p>
          <p className="text-neutral-600">{dados.whatsapp}</p>
          <p className="pt-2 font-semibold">
            {retirada ? "Retirada" : "Entrega"} em {dataCurta(dados.data)}
          </p>
          <p className="text-neutral-600">
            {retirada
              ? campanha.enderecoRetirada
              : `${dados.rua}, ${dados.numero}${dados.complemento ? `, ${dados.complemento}` : ""}, ${dados.bairro}${dados.cidade ? `, ${dados.cidade}` : ""}`}
          </p>
          <Link href="/dados" className="inline-block pt-1 text-neutral-600 underline">
            Alterar dados
          </Link>
        </section>

        <section>
          <ul className="space-y-3">
            {escolhidos.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={p.imagens[0]}
                    alt={p.nome}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized={/\.(svg|gif)$/i.test(p.imagens[0])}
                  />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{p.nome}</p>
                  <p className="text-neutral-600">{itens[p.id]} un.</p>
                </div>
                <p className="text-sm font-medium">{moeda(itens[p.id] * p.precoCentavos)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-neutral-200 pt-3 text-sm">
            <span>Valor total</span>
            <span className="font-semibold">{moeda(totalCentavos)}</span>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-lg border-2 border-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Valor do sinal a ser pago</span>
          <span className="text-2xl font-black">{moeda(campanha.sinalCentavos)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-neutral-600">
          <span>Restante a pagar {retirada ? "na retirada" : "na entrega"}</span>
          <span>{moeda(restanteCentavos)}</span>
        </div>
      </section>

      <section className="mt-6 space-y-2 text-sm text-neutral-600">
        <h2 className="font-semibold text-neutral-900">Formas de pagamento</h2>
        <p>Pix, cartão de crédito ou débito, na página segura do Mercado Pago.</p>
        <p>
          Se precisar desistir, devolvemos o sinal. É só chamar a gente no WhatsApp.
        </p>
      </section>
    </Tela>
  );
}
