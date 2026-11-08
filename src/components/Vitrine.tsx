"use client";

import Link from "next/link";
import { campanha, grupos, produtos, type Grupo } from "@/config/campanha";
import { CarrosselProduto } from "@/components/CarrosselProduto";
import { Tela, classeBotaoAcao, classeBotaoEscuro, classeToque } from "@/components/Tela";
import { useReserva } from "@/lib/reserva";
import { useDisponibilidade } from "@/lib/disponibilidade";
import { dataCurta, linkWhatsapp, moeda } from "@/lib/formatar";

// Datas embaixo do logo: cada modalidade numa linha de "bolinhas" que ocupa a largura toda,
// para a entrega (2 dias) e a retirada (7 dias) ficarem do mesmo tamanho. Dia sem retirada, como o 19, não aparece.
// Sai sozinho das datas e horários do campanha.ts.
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const horarios = campanha.horariosRetirada;
const horarioRetirada = `das ${horarios[0]}h às ${horarios[horarios.length - 1]}h`;

function Modo({ titulo, detalhe, datas }: { titulo: string; detalhe?: string; datas: string[] }) {
  const ordenadas = [...datas].sort();
  // Mês no título quando todas as datas caem no mesmo mês; senão a bolinha leva dd/mm
  const mes = new Set(ordenadas.map((d) => d.slice(0, 7))).size === 1 ? MESES[Number(ordenadas[0].slice(5, 7)) - 1] : null;
  return (
    <div>
      <p className="text-center text-sm">
        <span className="font-semibold text-neutral-900">{titulo}</span>
        <span className="text-neutral-500"> · {[mes, detalhe].filter(Boolean).join(", ")}</span>
      </p>
      <ul className="mt-2 flex gap-1.5">
        {ordenadas.map((d) => {
          const [semana, diaMes] = dataCurta(d).split(", ");
          return (
            <li
              key={d}
              className="flex h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl bg-white ring-1 ring-neutral-200"
            >
              <span className="text-[11px] leading-none text-neutral-500">{semana}</span>
              <span className="mt-1 text-sm leading-none font-semibold text-neutral-900">
                {mes ? String(Number(d.slice(8, 10))) : diaMes}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Escurece um pouco os trechos de destaque da descrição (ingredientes), sem negrito pesado
function realcar(texto: string, destaques: string[] = []) {
  if (destaques.length === 0) return texto;
  const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const partes = texto.split(new RegExp(`(${destaques.map(escapar).join("|")})`));
  return partes.map((parte, i) =>
    destaques.includes(parte) ? (
      <span key={i} className="font-medium text-neutral-800">
        {parte}
      </span>
    ) : (
      parte
    ),
  );
}

// Vibração curta de confirmação. Só o Android permite pelo navegador; no iPhone não faz nada.
function vibrar() {
  try {
    navigator.vibrate?.(12);
  } catch {}
}

export function Vitrine({ esgotadoForcado = false }: { esgotadoForcado?: boolean }) {
  const { itens, adicionar, remover, totalUnidades, totalCentavos } = useReserva();
  const disponibilidade = useDisponibilidade();
  const esgotado = esgotadoForcado || disponibilidade?.esgotado === true;

  // Não deixa escolher mais de um produto do que cabe na melhor data disponível (somando os sabores)
  const noCarrinho = (grupo: Grupo) =>
    produtos.filter((p) => p.grupo === grupo).reduce((s, p) => s + (itens[p.id] ?? 0), 0);
  const maximo = (grupo: Grupo) => (disponibilidade ? disponibilidade.maximo[grupo] : Infinity);

  // Esgotado: só o aviso, sem produtos
  if (esgotado) {
    return (
      <Tela logo="lettering">
        <section className="mx-auto max-w-md rounded-2xl border-2 border-neutral-900 p-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Reservas esgotadas</h1>
          <p className="mt-2 text-neutral-600">Todas as vagas desta campanha foram preenchidas.</p>
          <a
            href={linkWhatsapp(campanha.whatsapp, "Olá! Vi que as reservas de Natal esgotaram.")}
            target="_blank"
            rel="noopener noreferrer"
            className={`${classeBotaoEscuro} mt-5 w-full`}
          >
            Fale com a gente
          </a>
        </section>
      </Tela>
    );
  }

  return (
    <Tela
      logo="lettering"
      rodape={
        totalUnidades > 0 && (
          <Link href="/dados" className={classeBotaoAcao}>
            Pronto
            <span className="ml-2 font-normal opacity-90">
              {totalUnidades} {totalUnidades === 1 ? "item" : "itens"}, {moeda(totalCentavos)}
            </span>
          </Link>
        )
      }
    >
      <div className="mx-auto mb-10 max-w-md space-y-4 rounded-2xl bg-neutral-50 p-4">
        <Modo titulo="Entrega" datas={campanha.datas.entrega} />
        <Modo titulo="Retirada" detalhe={horarioRetirada} datas={campanha.datas.retirada} />
      </div>

      <ul className="grid gap-14 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {produtos.map((produto) => {
          const qtd = itens[produto.id] ?? 0;
          const produtoEsgotado = maximo(produto.grupo) === 0;
          const noLimite = noCarrinho(produto.grupo) >= maximo(produto.grupo);
          return (
            <li key={produto.id} className={produtoEsgotado ? "opacity-60" : undefined}>
              <CarrosselProduto imagens={produto.imagens} nome={produto.nome} />

              <div className="mx-auto mt-4 max-w-sm text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {grupos[produto.grupo].nome}
                </p>
                <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{produto.nome}</h2>
                <p className="mt-1 text-lg font-bold">{moeda(produto.precoCentavos)}</p>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-neutral-500">
                  {realcar(produto.descricao, produto.destaques)}
                </p>
                {produto.peso && <p className="mt-1.5 text-xs text-neutral-400">{produto.peso}</p>}

                {produtoEsgotado && <p className="mt-3 text-sm font-semibold">Esgotado</p>}
                {!produtoEsgotado && noLimite && qtd > 0 && (
                  <p className="mt-3 text-sm text-neutral-500">Você chegou ao máximo disponível deste produto.</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                {qtd > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      vibrar();
                      remover(produto.id);
                    }}
                    aria-label={`Tirar uma unidade de ${produto.nome}`}
                    className={`${classeToque} flex size-12 shrink-0 animate-entrar items-center justify-center rounded-xl border border-neutral-300 text-xl active:bg-neutral-100`}
                  >
                    −
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    vibrar();
                    adicionar(produto.id);
                  }}
                  disabled={noLimite}
                  className={`${classeBotaoEscuro} relative flex-1 disabled:bg-neutral-300 disabled:active:scale-100`}
                >
                  Reservar
                  {qtd > 0 && (
                    <span
                      key={qtd}
                      aria-label={`${qtd} reservado${qtd > 1 ? "s" : ""}`}
                      className="absolute -top-2.5 -right-2.5 flex size-7 animate-pulo items-center justify-center rounded-full border-2 border-white bg-acao text-xs font-bold shadow-sm"
                    >
                      {qtd}
                    </span>
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Tela>
  );
}
