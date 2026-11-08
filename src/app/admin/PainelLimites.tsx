"use client";

import { useState } from "react";
import { classeToque } from "@/components/Tela";
import { dataCurta } from "@/lib/formatar";
import type { LimiteComUso } from "@/lib/vagas";

// Dias com limite próprio: { data: número } define, { data: null } volta para o "por dia" do bloco
export type MudancasDias = Record<string, number | null>;
type Salvar = (id: string, limiteDia: number, limiteTotal: number | null, dias: MudancasDias) => Promise<boolean>;

const inteiroValido = (texto: string) => /^\d{1,4}$/.test(texto.trim());

// Aba "Limites" do painel: quanto cabe por dia e no bloco, e quanto já foi reservado
export function PainelLimites({
  limites,
  ocupado,
  salvar,
}: {
  limites: LimiteComUso[];
  ocupado: string | null;
  salvar: Salvar;
}) {
  return (
    <section className="mt-5 space-y-3">
      <p className="text-sm text-neutral-500">
        Contam pedidos pagos, entregues e os que estão no meio do pagamento. Mudou um número, vale na hora para quem
        está reservando. Baixar um limite não cancela nenhuma reserva: o site só para de aceitar novas.
      </p>
      {limites.map((l) => (
        <CartaoLimite key={l.id} limite={l} ocupado={ocupado === l.id} salvar={salvar} />
      ))}
    </section>
  );
}

function CartaoLimite({ limite, ocupado, salvar }: { limite: LimiteComUso; ocupado: boolean; salvar: Salvar }) {
  const [dia, setDia] = useState(String(limite.limite_dia));
  const [total, setTotal] = useState(limite.limite_total == null ? "" : String(limite.limite_total));
  // Campo vazio = o dia segue o "por dia" do bloco
  const [dias, setDias] = useState<Record<string, string>>(() =>
    Object.fromEntries(limite.datas.map((d) => [d, d in limite.ajustesPorDia ? String(limite.ajustesPorDia[d]) : ""])),
  );
  const temBloco = limite.limite_total != null;

  const diaNum = Number(dia);
  const totalNum = total.trim() === "" ? null : Number(total);

  // Só os dias que mudaram em relação ao que está salvo
  const mudancasDias: MudancasDias = {};
  for (const d of limite.datas) {
    const texto = (dias[d] ?? "").trim();
    const salvo = limite.ajustesPorDia[d];
    if (texto === "" && salvo !== undefined) mudancasDias[d] = null;
    else if (texto !== "" && Number(texto) !== salvo) mudancasDias[d] = Number(texto);
  }

  const valido =
    inteiroValido(dia) &&
    (total.trim() === "" || inteiroValido(total)) &&
    limite.datas.every((d) => (dias[d] ?? "").trim() === "" || inteiroValido(dias[d]));
  const mudou =
    diaNum !== limite.limite_dia || totalNum !== limite.limite_total || Object.keys(mudancasDias).length > 0;

  const campo =
    "h-11 w-20 rounded-xl border border-neutral-300 px-3 text-center text-base outline-none focus:border-neutral-900";

  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <p className="font-bold">{limite.nome}</p>
      {temBloco && (
        <p className="mt-1 text-sm text-neutral-600">
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
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium">Dia a dia</p>
        <p className="text-xs text-neutral-500">
          Vazio segue o &quot;por dia&quot;. Coloque um número para mudar só aquele dia.
          {temBloco && " O limite do bloco continua valendo."}
        </p>
        <ul className="mt-2 divide-y divide-neutral-100">
          {limite.datas.map((d) => {
            const proprio = (dias[d] ?? "").trim() !== "";
            return (
              <li key={d} className="flex items-center justify-between gap-3 py-2">
                <div className="text-sm">
                  <p className="font-medium">{dataCurta(d)}</p>
                  <p className="text-neutral-500">
                    {limite.ocupadoPorDia[d] ?? 0} reservados
                    {proprio ? " · limite só deste dia" : ""}
                  </p>
                </div>
                <input
                  inputMode="numeric"
                  aria-label={`Limite de ${dataCurta(d)}`}
                  placeholder={inteiroValido(dia) ? String(diaNum) : ""}
                  value={dias[d] ?? ""}
                  onChange={(e) => setDias((atual) => ({ ...atual, [d]: e.target.value }))}
                  className={`${campo} placeholder:text-neutral-400 ${proprio ? "border-neutral-900 font-semibold" : ""}`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        disabled={!valido || !mudou || ocupado}
        onClick={() => salvar(limite.id, diaNum, temBloco ? totalNum : null, mudancasDias)}
        className={`${classeToque} mt-3 h-11 w-full rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white disabled:bg-neutral-300`}
      >
        {ocupado ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
