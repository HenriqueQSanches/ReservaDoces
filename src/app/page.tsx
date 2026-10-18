"use client";

import Link from "next/link";
import { campanha, produtos } from "@/config/campanha";
import { CarrosselProduto } from "@/components/CarrosselProduto";
import { Tela, classeBotaoAcao } from "@/components/Tela";
import { useReserva } from "@/lib/reserva";
import { dataCurta, moeda } from "@/lib/formatar";

const todasAsDatas = [...new Set([...campanha.datas.entrega, ...campanha.datas.retirada])].sort();

export default function Vitrine() {
  const { itens, adicionar, remover, totalUnidades, totalCentavos } = useReserva();

  return (
    <Tela
      logo="lettering"
      rodape={
        totalUnidades > 0 ? (
          <Link href="/dados" className={classeBotaoAcao}>
            Pronto ({totalUnidades} {totalUnidades === 1 ? "item" : "itens"}, {moeda(totalCentavos)})
          </Link>
        ) : (
          <button type="button" disabled className={classeBotaoAcao}>
            Pronto
          </button>
        )
      }
    >
      <p className="mb-8 text-center text-sm text-neutral-500">
        Entregas e retiradas em {todasAsDatas.map(dataCurta).join(", ")}
      </p>

      <ul className="grid gap-10 md:grid-cols-3 md:gap-6">
        {produtos.map((produto) => {
          const qtd = itens[produto.id] ?? 0;
          return (
            <li key={produto.id}>
              <CarrosselProduto imagens={produto.imagens} nome={produto.nome} />

              <div className="mt-4">
                <h2 className="text-lg font-semibold">{produto.nome}</h2>
                <p className="text-sm text-neutral-500">{produto.descricao}</p>
                <p className="mt-1 font-medium">{moeda(produto.precoCentavos)}</p>
              </div>

              <div className="mt-3 flex items-center gap-3">
                {qtd > 0 && (
                  <button
                    type="button"
                    onClick={() => remover(produto.id)}
                    aria-label={`Tirar uma unidade de ${produto.nome}`}
                    className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-neutral-900 text-xl"
                  >
                    −
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => adicionar(produto.id)}
                  className="relative h-12 flex-1 rounded-lg bg-neutral-900 font-semibold text-white active:bg-neutral-700"
                >
                  Reservar
                  {qtd > 0 && (
                    <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border-2 border-white bg-acao text-xs font-bold">
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
