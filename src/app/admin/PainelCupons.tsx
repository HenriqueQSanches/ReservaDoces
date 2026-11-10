"use client";

import { useState } from "react";
import { classeToque } from "@/components/Tela";
import { normalizarCupom } from "@/config/campanha";
import { moeda } from "@/lib/formatar";
import type { CupomAdmin } from "@/app/api/admin/cupons/route";
import type { PedidoAdmin } from "@/lib/pedidosAdmin";

const usado = (s: string) => s === "pago" || s === "entregue" || s === "estornar";

// Aba "Cupons" do painel: códigos que dão desconto no valor final. O sinal continua sobre o preço cheio.
export function PainelCupons({
  cupons,
  pedidos,
  ocupado,
  criar,
  mudar,
}: {
  cupons: CupomAdmin[];
  pedidos: PedidoAdmin[];
  ocupado: string | null;
  criar: (codigo: string, percentual: number) => Promise<string | null>;
  mudar: (codigo: string, dados: { ativo?: boolean; percentual?: number }) => Promise<void>;
}) {
  const [codigo, setCodigo] = useState("");
  const [percentual, setPercentual] = useState("15");
  const [erro, setErro] = useState<string | null>(null);

  const codigoNorm = normalizarCupom(codigo);
  const pct = Number(percentual);
  const valido = /^[A-Z0-9]{3,20}$/.test(codigoNorm) && Number.isInteger(pct) && pct >= 1 && pct <= 90;

  const campo = "h-11 rounded-xl border border-neutral-300 px-3 text-base outline-none focus:border-neutral-900";

  return (
    <section className="mt-5 space-y-3">
      <p className="text-sm text-neutral-500">
        Quem digitar um cupom ativo na tela de pagamento ganha o desconto no valor final; o sinal continua sobre o
        preço cheio. Desligar um cupom vale na hora para quem ainda não pagou. Os pedidos com cupom aparecem no filtro
        &quot;Com cupom&quot; da aba Pedidos.
      </p>

      {cupons.map((c) => {
        const comCupom = pedidos.filter((p) => p.cupom_codigo === c.codigo && usado(p.status));
        const descontos = comCupom.reduce((s, p) => s + p.desconto_centavos, 0);
        return (
          <div key={c.codigo} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4">
            <div>
              <p className="font-bold">
                {c.codigo} <span className="font-normal text-neutral-600">· {c.percentual}% de desconto</span>
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {comCupom.length} {comCupom.length === 1 ? "pedido pago" : "pedidos pagos"}
                {descontos > 0 ? ` · ${moeda(descontos)} em descontos` : ""}
              </p>
              <p className={`mt-1 text-xs font-medium ${c.ativo ? "text-green-700" : "text-neutral-400"}`}>
                {c.ativo ? "Ativo" : "Desligado"}
              </p>
            </div>
            <button
              type="button"
              disabled={ocupado === c.codigo}
              onClick={() => mudar(c.codigo, { ativo: !c.ativo })}
              className={`${classeToque} shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50`}
            >
              {c.ativo ? "Desligar" : "Ligar"}
            </button>
          </div>
        );
      })}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valido) return;
          setErro(null);
          const falhou = await criar(codigoNorm, pct);
          if (falhou) setErro(falhou);
          else setCodigo("");
        }}
        className="rounded-2xl border border-dashed border-neutral-300 p-4"
      >
        <p className="font-bold">Novo cupom</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-600">Código</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="EX.: VIP10"
              maxLength={20}
              autoCapitalize="characters"
              className={`${campo} w-36 uppercase`}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-600">Desconto (%)</span>
            <input
              inputMode="numeric"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
              className={`${campo} w-20 text-center`}
            />
          </label>
          <button
            type="submit"
            disabled={!valido || ocupado === "novo-cupom"}
            className={`${classeToque} h-11 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white disabled:bg-neutral-300`}
          >
            {ocupado === "novo-cupom" ? "Criando..." : "Criar"}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">Só letras e números, de 3 a 20 caracteres.</p>
        {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
      </form>
    </section>
  );
}
