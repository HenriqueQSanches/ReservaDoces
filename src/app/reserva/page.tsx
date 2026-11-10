"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  campanha,
  descontoDoCupom,
  grupos,
  nomesOpcoes,
  normalizarCupom,
  opcoesDePagamento,
  produtos,
  type OpcaoPagamento,
} from "@/config/campanha";
import { Tela, classeBotaoAcao, classeToque } from "@/components/Tela";
import { useReserva } from "@/lib/reserva";
import { dataCurta, moeda } from "@/lib/formatar";
import type { RespostaCriarPedido } from "@/app/api/pedidos/route";
import type { RespostaPagamento } from "@/app/api/pedidos/[numero]/pagamento/route";
import type { RespostaCupom } from "@/app/api/cupons/route";

export default function Resumo() {
  const router = useRouter();
  const { carregado, itens, dados, pedido, salvarPedido, totalUnidades, totalCentavos } = useReserva();
  const [enviando, setEnviando] = useState(false);
  const [opcao, setOpcao] = useState<OpcaoPagamento>("sinal");
  const [aviso, setAviso] = useState<{ texto: string; link?: string; rotulo?: string } | null>(null);
  // Cupom de desconto: conferido no servidor ao aplicar e de novo na hora de gerar o pagamento
  const [textoCupom, setTextoCupom] = useState("");
  const [cupom, setCupom] = useState<{ codigo: string; percentual: number } | null>(null);
  const [conferindoCupom, setConferindoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState<string | null>(null);

  useEffect(() => {
    if (!carregado) return;
    if (totalUnidades === 0) router.replace("/");
    else if (!dados) router.replace("/dados");
  }, [carregado, totalUnidades, dados, router]);

  if (!carregado || !dados || totalUnidades === 0) return null;

  const escolhidos = produtos.filter((p) => itens[p.id]);
  const retirada = dados.modalidade === "retirada";
  // Só o sinal, metade ou tudo. Se a opção escolhida sumiu (carrinho mudou), volta para o sinal.
  // O sinal fica sobre o preço cheio; o desconto do cupom sai do valor final
  const descontoCentavos = cupom ? descontoDoCupom(totalCentavos, cupom.percentual) : 0;
  const finalCentavos = totalCentavos - descontoCentavos;
  const opcoes = opcoesDePagamento(totalCentavos, descontoCentavos);
  const escolhida = opcoes.find((o) => o.opcao === opcao) ?? opcoes[0];
  const restanteCentavos = Math.max(0, finalCentavos - escolhida.centavos);

  async function aplicarCupom(e: React.FormEvent) {
    e.preventDefault();
    const codigo = normalizarCupom(textoCupom);
    if (!codigo) return;
    setConferindoCupom(true);
    setErroCupom(null);
    try {
      const r = await fetch("/api/cupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const resposta: RespostaCupom = await r.json();
      if (resposta.ok) {
        setCupom({ codigo: resposta.codigo, percentual: resposta.percentual });
        setTextoCupom("");
      } else {
        setErroCupom(
          resposta.motivo === "erro" ? "Não conseguimos conferir o cupom agora. Tente de novo." : "Cupom inválido ou encerrado.",
        );
      }
    } catch {
      setErroCupom("Não conseguimos conferir o cupom agora. Confira sua internet.");
    }
    setConferindoCupom(false);
  }

  // 1. Cria o pedido no banco (segura a vaga por 15 minutos), ou reaproveita o pendente
  //    de uma tentativa anterior. 2. Pede o link de pagamento e leva a cliente ao Mercado Pago.
  async function pagar() {
    setEnviando(true);
    setAviso(null);
    try {
      let numero = pedido;

      if (!numero) {
        const r = await fetch("/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itens, dados }),
        });
        const resposta: RespostaCriarPedido = await r.json();

        if (!resposta.ok) {
          setAviso(
            resposta.motivo === "sem_vaga"
              ? {
                  texto:
                    resposta.restante > 0
                      ? `Nessa data só cabem mais ${resposta.restante} ${grupos[resposta.grupo].plural}. Escolha outra data ou ajuste a quantidade.`
                      : `Não há mais ${grupos[resposta.grupo].plural} disponíveis nessa data. Escolha outra data.`,
                  link: "/dados",
                  rotulo: "Escolher outra data",
                }
              : resposta.motivo === "data_fechada"
                ? { texto: "A data escolhida não está mais disponível. Escolha outra data.", link: "/dados", rotulo: "Escolher outra data" }
                : { texto: "Não conseguimos registrar sua reserva. Tente de novo em instantes." },
          );
          setEnviando(false);
          return;
        }
        numero = resposta.numero;
        salvarPedido(numero);
      }

      const p = await fetch(`/api/pedidos/${numero}/pagamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opcao: escolhida.opcao, cupom: cupom?.codigo ?? null }),
      });
      const pagamento: RespostaPagamento = await p.json();

      if (!pagamento.ok) {
        // O cupom foi desligado entre aplicar e pagar: tira o desconto e deixa a cliente decidir
        if (pagamento.motivo === "cupom_invalido") {
          setCupom(null);
          setAviso({ texto: "Esse cupom não está mais valendo. Os valores foram atualizados sem o desconto." });
          setEnviando(false);
          return;
        }
        if (pagamento.motivo === "ja_pago") {
          router.push(`/pedido/${numero}`);
          return;
        }
        // Pedido pendente venceu: a próxima tentativa cria outro
        salvarPedido(null);
        setAviso({
          texto:
            pagamento.motivo === "expirado" || pagamento.motivo === "nao_encontrado"
              ? "Sua reserva anterior venceu. Toque de novo para reservar outra vez."
              : "Não conseguimos abrir o pagamento. Tente de novo em instantes.",
        });
        setEnviando(false);
        return;
      }

      window.location.assign(pagamento.url);
    } catch {
      setAviso({ texto: "Não conseguimos registrar sua reserva. Confira sua internet e tente de novo." });
      setEnviando(false);
    }
  }

  return (
    <Tela
      logo="monograma"
      rodape={
        <button type="button" onClick={pagar} disabled={enviando} className={classeBotaoAcao}>
          {enviando ? (
            <>
              <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Abrindo pagamento...
            </>
          ) : (
            `${escolhida.opcao === "sinal" ? "Pagar sinal de" : "Pagar"} ${moeda(escolhida.centavos)}`
          )}
        </button>
      }
    >
      <h1 className="mb-8 text-2xl font-bold tracking-tight">Sua reserva:</h1>

      {aviso && (
        <div role="alert" className="mb-6 animate-entrar rounded-2xl border-2 border-red-500 p-4 text-sm">
          <p className="font-medium text-red-700">{aviso.texto}</p>
          {aviso.link && (
            <Link href={aviso.link} className="mt-2 inline-block font-medium underline underline-offset-4">
              {aviso.rotulo ?? "Voltar para os produtos"}
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="space-y-1 rounded-2xl bg-neutral-50 p-4 text-sm">
          <p className="font-semibold">{dados.nome}</p>
          <p className="text-neutral-600">{dados.whatsapp}</p>
          <p className="pt-2 font-semibold">
            {retirada ? "Retirada" : "Entrega"} em {dataCurta(dados.data)}
            {retirada && dados.hora ? `, às ${dados.hora}h` : ""}
          </p>
          <p className="text-neutral-600">
            {retirada
              ? campanha.enderecoRetirada
              : `${dados.rua}, ${dados.numero}${dados.complemento ? `, ${dados.complemento}` : ""}, ${dados.bairro}${dados.cidade ? `, ${dados.cidade}` : ""}`}
          </p>
          <Link href="/dados" className="inline-block pt-2 font-medium text-neutral-900 underline underline-offset-4">
            Alterar dados
          </Link>
        </section>

        <section className="rounded-2xl border border-neutral-200 p-4">
          <ul className="space-y-3">
            {escolhidos.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5">
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
            <span className={cupom ? "text-neutral-500 line-through" : "font-semibold"}>{moeda(totalCentavos)}</span>
          </div>
          {cupom && (
            <>
              <div className="mt-1 flex justify-between text-sm text-neutral-600">
                <span>
                  Cupom {cupom.codigo} (−{cupom.percentual}%)
                </span>
                <span>−{moeda(descontoCentavos)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="font-semibold">Valor com desconto</span>
                <span className="font-semibold">{moeda(finalCentavos)}</span>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">Cupom de desconto</h2>
        {cupom ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-neutral-900 px-4 py-3 text-sm">
            <span>
              <span className="font-semibold">{cupom.codigo}</span> aplicado: {cupom.percentual}% de desconto no valor final
            </span>
            <button
              type="button"
              onClick={() => setCupom(null)}
              className={`${classeToque} shrink-0 font-medium underline underline-offset-4`}
            >
              Remover
            </button>
          </div>
        ) : (
          <form onSubmit={aplicarCupom} className="flex gap-2">
            <input
              value={textoCupom}
              onChange={(e) => {
                setTextoCupom(e.target.value.toUpperCase());
                setErroCupom(null);
              }}
              placeholder="Digite seu cupom"
              aria-label="Cupom de desconto"
              aria-invalid={!!erroCupom}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={20}
              className="h-12 min-w-0 flex-1 rounded-xl border border-neutral-300 px-4 text-base uppercase outline-none placeholder:normal-case focus:border-neutral-900"
            />
            <button
              type="submit"
              disabled={!textoCupom.trim() || conferindoCupom}
              className={`${classeToque} h-12 shrink-0 rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white disabled:bg-neutral-300`}
            >
              {conferindoCupom ? "Conferindo..." : "Aplicar"}
            </button>
          </form>
        )}
        {erroCupom && <p className="mt-2 px-1 text-sm text-red-700">{erroCupom}</p>}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Quanto você quer pagar agora?</h2>
        <div role="radiogroup" aria-label="Quanto pagar agora" className="space-y-2">
          {opcoes.map((o) => {
            const ativa = o.opcao === escolhida.opcao;
            return (
              <button
                key={o.opcao}
                type="button"
                role="radio"
                aria-checked={ativa}
                onClick={() => setOpcao(o.opcao)}
                className={`${classeToque} flex w-full items-center gap-3 rounded-2xl p-4 text-left ${
                  ativa ? "border-2 border-neutral-900 shadow-sm" : "border border-neutral-200 px-[17px] py-[17px]"
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${ativa ? "border-neutral-900" : "border-neutral-300"}`}
                >
                  {ativa && <span className="size-2.5 rounded-full bg-neutral-900" />}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{nomesOpcoes[o.opcao]}</span>
                  {o.opcao === "sinal" && (
                    <span className="block text-xs text-neutral-500">
                      {campanha.sinalPercentual}% do pedido, com mínimo de {moeda(campanha.sinalMinimoCentavos)}
                    </span>
                  )}
                </span>
                <span className={`text-lg ${ativa ? "font-black" : "font-semibold text-neutral-600"}`}>{moeda(o.centavos)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between px-1 text-sm text-neutral-600">
          <span>Restante a pagar {retirada ? "na retirada" : "na entrega"}</span>
          <span className="font-medium text-neutral-900">{restanteCentavos > 0 ? moeda(restanteCentavos) : "Nada"}</span>
        </div>
      </section>

      <section className="mt-6 space-y-2 px-1 text-sm text-neutral-600">
        <h2 className="font-semibold text-neutral-900">Formas de pagamento</h2>
        <p>Pix ou cartão de crédito, na página segura do Mercado Pago.</p>
        <p>
          O sinal garante a sua reserva. Se precisar desistir, o sinal não é devolvido; o que você pagou além dele, a
          gente devolve.
        </p>
      </section>
    </Tela>
  );
}
