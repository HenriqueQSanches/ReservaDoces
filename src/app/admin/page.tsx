"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { grupoDoProduto, grupos, produtos, type Grupo } from "@/config/campanha";
import { Logo } from "@/components/Logo";
import { classeToque } from "@/components/Tela";
import { dataCurta, linkWhatsapp, moeda, somenteDigitos } from "@/lib/formatar";
import type { PedidoAdmin } from "@/lib/pedidosAdmin";
import type { SituacaoData } from "@/lib/datas";
import type { LimiteComUso } from "@/lib/vagas";
import { PainelLimites } from "./PainelLimites";

const rotulos: Record<string, { texto: string; cor: string }> = {
  pago: { texto: "Pago", cor: "bg-green-100 text-green-800" },
  entregue: { texto: "Entregue", cor: "bg-neutral-900 text-white" },
  pendente: { texto: "Aguardando pagamento", cor: "bg-amber-100 text-amber-800" },
  expirado: { texto: "Não pago", cor: "bg-neutral-100 text-neutral-500" },
  estornar: { texto: "Devolver sinal", cor: "bg-red-100 text-red-800" },
  cancelado: { texto: "Cancelado", cor: "bg-neutral-100 text-neutral-500" },
};

const filtros = [
  { id: "pago", texto: "Pagos" },
  { id: "entregue", texto: "Entregues" },
  { id: "estornar", texto: "Devolver sinal" },
  { id: "pendente", texto: "Aguardando" },
  { id: "cancelado", texto: "Cancelados" },
  { id: "todos", texto: "Todos" },
] as const;

const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? id;
const grupoDoItem = (i: { produto_id: string; grupo: string | null }) => i.grupo ?? grupoDoProduto(i.produto_id);
const ativo = (s: string) => s === "pago" || s === "entregue";

export default function Painel() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoAdmin[] | null>(null);
  const [limites, setLimites] = useState<LimiteComUso[] | null>(null);
  const [aba, setAba] = useState<"pedidos" | "padaria" | "datas" | "limites">("pedidos");
  const [datas, setDatas] = useState<{ datas: SituacaoData[]; antecedenciaDias: number } | null>(null);
  const [filtro, setFiltro] = useState<(typeof filtros)[number]["id"]>("pago");
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/admin/pedidos", { cache: "no-store" });
    if (r.status === 401) return router.replace("/admin/login");
    if (r.status === 403) return router.replace("/admin/senha");
    if (r.ok) setPedidos((await r.json()).pedidos);
    fetch("/api/admin/limites", { cache: "no-store" })
      .then((d) => (d.ok ? d.json() : null))
      .then((d) => d && setLimites(d.limites));
    fetch("/api/admin/datas", { cache: "no-store" })
      .then((d) => (d.ok ? d.json() : null))
      .then((d) => d && setDatas(d));
  }, [router]);

  async function mudarData(data: string, acao: "abrir" | "fechar" | "automatico") {
    setOcupado(data);
    const r = await fetch(`/api/admin/datas/${data}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acao }),
    });
    if (!r.ok) window.alert("Não foi possível mudar a data. Atualize a página e tente de novo.");
    await carregar();
    setOcupado(null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  async function mudarStatus(numero: string, status: "entregue" | "cancelado" | "pago", confirmar?: string) {
    if (confirmar && !window.confirm(confirmar)) return;
    setOcupado(numero);
    const r = await fetch(`/api/admin/pedidos/${numero}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) window.alert("Não foi possível mudar o pedido. Atualize a página e tente de novo.");
    await carregar();
    setOcupado(null);
  }

  async function sair() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (pedidos ?? []).filter((p) => {
      const passaFiltro =
        filtro === "todos" ||
        p.status === filtro ||
        (filtro === "cancelado" && p.status === "expirado");
      const passaBusca =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        p.numero.toLowerCase().includes(termo) ||
        somenteDigitos(p.whatsapp).includes(somenteDigitos(termo) || "\u0000");
      return passaFiltro && passaBusca;
    });
  }, [pedidos, filtro, busca]);

  // Para a padaria: unidades por data e produto, só de pedidos pagos ou entregues
  const padaria = useMemo(() => {
    const porData = new Map<
      string,
      { entrega: Map<string, number>; retirada: Map<string, number>; horas: Map<number, number>; total: number }
    >();
    for (const p of pedidos ?? []) {
      if (!ativo(p.status)) continue;
      const dia = porData.get(p.data_recebimento) ?? {
        entrega: new Map(),
        retirada: new Map(),
        horas: new Map(),
        total: 0,
      };
      for (const i of p.itens_pedido) {
        const mapa = p.modalidade === "entrega" ? dia.entrega : dia.retirada;
        mapa.set(i.produto_id, (mapa.get(i.produto_id) ?? 0) + i.quantidade);
        dia.total += i.quantidade;
      }
      if (p.hora_retirada != null) dia.horas.set(p.hora_retirada, (dia.horas.get(p.hora_retirada) ?? 0) + p.unidades);
      porData.set(p.data_recebimento, dia);
    }
    return [...porData.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [pedidos]);

  // Unidades pagas ou entregues de cada produto, somando os sabores
  const vendidos = (g: Grupo) =>
    (pedidos ?? [])
      .filter((p) => ativo(p.status))
      .flatMap((p) => p.itens_pedido)
      .filter((i) => grupoDoItem(i) === g)
      .reduce((s, i) => s + i.quantidade, 0);

  async function salvarLimite(id: string, limiteDia: number, limiteTotal: number | null) {
    setOcupado(id);
    const r = await fetch(`/api/admin/limites/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limite_dia: limiteDia, limite_total: limiteTotal }),
    });
    if (!r.ok) window.alert("Não foi possível salvar o limite. Confira os números e tente de novo.");
    await carregar();
    setOcupado(null);
    return r.ok;
  }

  const contagem = (s: string) =>
    (pedidos ?? []).filter((p) => p.status === s || (s === "cancelado" && p.status === "expirado")).length;

  if (pedidos === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="size-8 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pt-6 pb-12">
      <header className="flex items-center justify-between gap-4">
        <div className="w-12">
          <Logo variante="monograma" />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/senha" className="text-neutral-600 underline underline-offset-4">
            Trocar senha
          </Link>
          <button type="button" onClick={sair} className="font-medium underline underline-offset-4">
            Sair
          </button>
        </div>
      </header>

      <h1 className="mt-6 text-2xl font-bold tracking-tight">Reservas de Natal</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(Object.keys(grupos) as Grupo[]).map((g) => (
          <div key={g} className="rounded-2xl border border-neutral-200 p-4">
            <p className="text-sm text-neutral-500">{grupos[g].nome}: vendidos</p>
            <p className="text-2xl font-bold">{vendidos(g)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex rounded-xl bg-neutral-100 p-1 text-sm font-medium">
        {(
          [
            ["pedidos", "Pedidos"],
            ["padaria", "Padaria"],
            ["datas", "Datas"],
            ["limites", "Limites"],
          ] as const
        ).map(([a, texto]) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={`flex-1 rounded-lg py-2 transition ${aba === a ? "bg-white shadow-sm" : "text-neutral-500"}`}
          >
            {texto}
          </button>
        ))}
      </div>

      {aba === "pedidos" && (
        <section className="mt-5">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {filtros.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`${classeToque} shrink-0 rounded-full border px-3 py-1.5 text-sm ${
                  filtro === f.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"
                }`}
              >
                {f.texto}
                {f.id !== "todos" && <span className="ml-1 opacity-70">{contagem(f.id)}</span>}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, pedido ou WhatsApp"
              className="h-11 flex-1 rounded-xl border border-neutral-300 px-4 text-sm outline-none focus:border-neutral-900"
            />
            <a
              href="/api/admin/pedidos/csv"
              className={`${classeToque} flex h-11 items-center rounded-xl border border-neutral-300 px-3 text-sm font-medium`}
            >
              Planilha
            </a>
          </div>

          {visiveis.length === 0 && <p className="mt-10 text-center text-sm text-neutral-500">Nenhum pedido aqui.</p>}

          <ul className="mt-4 space-y-3">
            {visiveis.map((p) => {
              const rotulo = rotulos[p.status] ?? { texto: p.status, cor: "bg-neutral-100" };
              const restante = Math.max(0, p.total_centavos - p.sinal_centavos);
              return (
                <li key={p.numero} className="rounded-2xl border border-neutral-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{p.numero}</p>
                      <p className="text-sm">{p.nome}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${rotulo.cor}`}>
                      {rotulo.texto}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-medium">
                    {p.modalidade === "retirada" ? "Retirada" : "Entrega"} em {dataCurta(p.data_recebimento)}
                    {p.hora_retirada != null ? `, às ${p.hora_retirada}h` : ""}
                  </p>
                  {p.modalidade === "entrega" && (
                    <p className="text-sm text-neutral-600">
                      {[p.rua, p.numero_endereco, p.complemento, p.bairro, p.cidade].filter(Boolean).join(", ")}
                      {p.cep ? `, CEP ${p.cep}` : ""}
                    </p>
                  )}

                  <ul className="mt-2 text-sm text-neutral-700">
                    {p.itens_pedido.map((i) => (
                      <li key={i.produto_id}>
                        {i.quantidade}x {nomeProduto(i.produto_id)}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 text-sm text-neutral-600">
                    Total {moeda(p.total_centavos)} · sinal {moeda(p.sinal_centavos)} · falta {moeda(restante)}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={linkWhatsapp(`55${somenteDigitos(p.whatsapp)}`, `Olá, ${p.nome.split(" ")[0]}! Aqui é da Nathalia Perissato Brigaderia, sobre o seu pedido ${p.numero}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${classeToque} rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white`}
                    >
                      WhatsApp {p.whatsapp}
                    </a>
                    {p.status === "pago" && (
                      <button
                        type="button"
                        disabled={ocupado === p.numero}
                        onClick={() => mudarStatus(p.numero, "entregue")}
                        className={`${classeToque} rounded-lg bg-acao px-3 py-2 text-sm font-medium text-white disabled:opacity-50`}
                      >
                        Marcar entregue
                      </button>
                    )}
                    {p.status === "entregue" && (
                      <button
                        type="button"
                        disabled={ocupado === p.numero}
                        onClick={() => mudarStatus(p.numero, "pago")}
                        className={`${classeToque} rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50`}
                      >
                        Desfazer entrega
                      </button>
                    )}
                    {(p.status === "pago" || p.status === "estornar" || p.status === "pendente") && (
                      <button
                        type="button"
                        disabled={ocupado === p.numero}
                        onClick={() =>
                          mudarStatus(
                            p.numero,
                            "cancelado",
                            `Cancelar o pedido ${p.numero}? A vaga volta a ficar disponível. Se ela pagou o sinal, devolva pelo Mercado Pago.`,
                          )
                        }
                        className={`${classeToque} rounded-lg border border-neutral-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50`}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {aba === "datas" && datas && (
        <section className="mt-5 space-y-3">
          <p className="text-sm text-neutral-500">
            Cada data fecha sozinha {datas.antecedenciaDias} dias antes. Se precisar, feche ou reabra o dia inteiro aqui
            (entrega e retirada).
          </p>
          {datas.datas.map((d) => {
            const unidades = (pedidos ?? [])
              .filter((p) => ativo(p.status) && p.data_recebimento === d.data)
              .reduce((s, p) => s + p.unidades, 0);
            return (
              <div key={d.data} className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{dataCurta(d.data)}</p>
                    <p className="text-sm text-neutral-500">
                      {d.modalidades.map((m) => (m === "entrega" ? "Entrega" : "Retirada")).join(" e ")} ·{" "}
                      {unidades === 1 ? "1 unidade reservada" : `${unidades} unidades reservadas`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      d.aberta ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {d.aberta ? "Aberta" : "Fechada"}
                    {d.passou ? "" : d.manual === null ? " (automático)" : " (manual)"}
                  </span>
                </div>
                {!d.passou && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.aberta ? (
                      <button
                        type="button"
                        disabled={ocupado === d.data}
                        onClick={() => mudarData(d.data, "fechar")}
                        className={`${classeToque} rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50`}
                      >
                        Fechar o dia
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={ocupado === d.data}
                        onClick={() => mudarData(d.data, "abrir")}
                        className={`${classeToque} rounded-lg bg-acao px-3 py-2 text-sm font-medium text-white disabled:opacity-50`}
                      >
                        Reabrir o dia
                      </button>
                    )}
                    {d.manual !== null && (
                      <button
                        type="button"
                        disabled={ocupado === d.data}
                        onClick={() => mudarData(d.data, "automatico")}
                        className={`${classeToque} rounded-lg px-3 py-2 text-sm text-neutral-600 underline underline-offset-4 disabled:opacity-50`}
                      >
                        Voltar ao automático ({d.automatica ? "aberta" : "fechada"})
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {aba === "limites" && limites && (
        <PainelLimites limites={limites} ocupado={ocupado} salvar={salvarLimite} />
      )}

      {aba === "padaria" && (
        <section className="mt-5 space-y-3">
          <p className="text-sm text-neutral-500">Só pedidos pagos ou entregues.</p>
          {padaria.length === 0 && <p className="mt-10 text-center text-sm text-neutral-500">Nenhuma reserva paga ainda.</p>}
          {padaria.map(([data, dia]) => (
            <div key={data} className="rounded-2xl border border-neutral-200 p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-bold">{dataCurta(data)}</p>
                <p className="text-sm text-neutral-600">{dia.total} un.</p>
              </div>
              {dia.entrega.size > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Entrega</p>
                  {[...dia.entrega].map(([id, q]) => (
                    <p key={id} className="text-neutral-700">
                      {q}x {nomeProduto(id)}
                    </p>
                  ))}
                </div>
              )}
              {dia.retirada.size > 0 && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Retirada</p>
                  {[...dia.retirada].map(([id, q]) => (
                    <p key={id} className="text-neutral-700">
                      {q}x {nomeProduto(id)}
                    </p>
                  ))}
                  <p className="mt-1 text-neutral-500">
                    {[...dia.horas]
                      .sort(([a], [b]) => a - b)
                      .map(([h, q]) => `${h}h: ${q} un.`)
                      .join(" · ")}
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
