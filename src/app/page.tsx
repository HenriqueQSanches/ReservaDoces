"use client";

import Link from "next/link";
import { campanha, produtos } from "@/config/campanha";
import { CarrosselProduto } from "@/components/CarrosselProduto";
import { Tela, classeBotaoAcao, classeBotaoEscuro, classeToque } from "@/components/Tela";
import { useReserva } from "@/lib/reserva";
import { dataCurta, moeda } from "@/lib/formatar";

const todasAsDatas = [...new Set([...campanha.datas.entrega, ...campanha.datas.retirada])].sort();

// Vibração curta de confirmação. Só o Android permite pelo navegador; no iPhone não faz nada.
function vibrar() {
  try {
    navigator.vibrate?.(12);
  } catch {}
}

export default function Vitrine() {
  const { itens, adicionar, remover, totalUnidades, totalCentavos } = useReserva();

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
      <p className="mb-10 text-center text-sm text-neutral-500">
        Entregas e retiradas em {todasAsDatas.map(dataCurta).join(", ")}
      </p>

      <ul className="grid gap-14 md:grid-cols-3 md:gap-8">
        {produtos.map((produto) => {
          const qtd = itens[produto.id] ?? 0;
          return (
            <li key={produto.id}>
              <CarrosselProduto imagens={produto.imagens} nome={produto.nome} />

              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{produto.nome}</h2>
                  <p className="mt-0.5 text-sm text-neutral-500">{produto.descricao}</p>
                </div>
                <p className="shrink-0 text-lg font-bold">{moeda(produto.precoCentavos)}</p>
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
                  className={`${classeBotaoEscuro} relative flex-1`}
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
