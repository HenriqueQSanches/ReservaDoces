"use client";

import { useState } from "react";
import { classeToque } from "@/components/Tela";
import { dataCurta } from "@/lib/formatar";
import type { LimiteComUso } from "@/lib/vagas";

const diaMes = (iso: string) => dataCurta(iso).split(", ")[1];

// Aba "Limites" do painel: quanto cabe por dia e no bloco, e quanto já foi reservado
export function PainelLimites({
  limites,
  ocupado,
  salvar,
}: {
  limites: LimiteComUso[];
  ocupado: string | null;
  salvar: (id: string, limiteDia: number, limiteTotal: number | null) => Promise<boolean>;
}) {
  return (
    <section className="mt-5 space-y-3">
      <p className="text-sm text-neutral-500">
        Contam pedidos pagos, entregues e os que estão no meio do pagamento. Mudou um número, vale na hora para quem
        está reservando.
      </p>
      {limites.map((l) => (
        <CartaoLimite key={l.id} limite={l} ocupado={ocupado === l.id} salvar={salvar} />
      ))}
    </section>
  );
}

function CartaoLimite({
  limite,
  ocupado,
  salvar,
}: {
  limite: LimiteComUso;
  ocupado: boolean;
  salvar: (id: string, limiteDia: number, limiteTotal: number | null) => Promise<boolean>;
}) {
  const [dia, setDia] = useState(String(limite.limite_dia));
  const [total, setTotal] = useState(limite.limite_total == null ? "" : String(limite.limite_total));
  const temBloco = limite.limite_total != null;

  const diaNum = Number(dia);
  const totalNum = total.trim() === "" ? null : Number(total);
  const valido = Number.isInteger(diaNum) && diaNum >= 0 && (totalNum === null || (Number.isInteger(totalNum) && totalNum >= 0));
  const mudou = diaNum !== limite.limite_dia || totalNum !== limite.limite_total;

  const campo =
    "h-11 w-20 rounded-xl border border-neutral-300 px-3 text-center text-base outline-none focus:border-neutral-900";

  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <p className="font-bold">{limite.nome}</p>
      <p className="mt-1 text-sm text-neutral-600">
        {limite.datas.map((d) => `${diaMes(d)}: ${limite.ocupadoPorDia[d] ?? 0}`).join(" · ")}
      </p>
      {temBloco && (
        <p className="text-sm text-neutral-600">
          Bloco: {limite.ocupadoBloco} de {limite.limite_total} reservados
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-neutral-600">Por dia</span>
          <input inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} className={campo} />
        </label>
        {temBloco && (
          <label className="text-sm">
            <span className="mb-1 block text-neutral-600">No bloco</span>
            <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} className={campo} />
          </label>
        )}
        <button
          type="button"
          disabled={!valido || !mudou || ocupado}
          onClick={() => salvar(limite.id, diaNum, temBloco ? totalNum : null)}
          className={`${classeToque} h-11 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white disabled:bg-neutral-300`}
        >
          {ocupado ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
