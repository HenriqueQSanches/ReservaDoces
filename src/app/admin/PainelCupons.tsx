"use client";

import { useState } from "react";
import { classeToque } from "@/components/Tela";
import { mensagemDoCupom, normalizarCupom } from "@/config/campanha";
import { moeda } from "@/lib/formatar";
import { formatarWhatsapp } from "@/lib/textoWhatsapp";
import type { CupomAdmin } from "@/app/api/admin/cupons/route";
import type { PedidoAdmin } from "@/lib/pedidosAdmin";

const usado = (s: string) => s === "pago" || s === "entregue" || s === "estornar";
const MAX_MENSAGEM = 200;
// Nome de exemplo só para a prévia da mensagem no painel
const NOME_EXEMPLO = "Ana";

type Mudanca = { ativo?: boolean; percentual?: number; mensagem?: string | null };

// Aba "Cupons" do painel: códigos que dão desconto no valor final. O sinal continua sobre o preço cheio.
// Cada cupom pode ter uma mensagem para a tela de resumo, com {nome} no lugar do primeiro nome da cliente.
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
  criar: (codigo: string, percentual: number, mensagem: string) => Promise<string | null>;
  mudar: (codigo: string, dados: Mudanca) => Promise<void>;
}) {
  const [codigo, setCodigo] = useState("");
  const [percentual, setPercentual] = useState("10");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const codigoNorm = normalizarCupom(codigo);
  const pct = Number(percentual);
  const valido =
    /^[A-Z0-9]{3,20}$/.test(codigoNorm) && Number.isInteger(pct) && pct >= 1 && pct <= 90 && mensagem.length <= MAX_MENSAGEM;

  const campo = "h-11 rounded-xl border border-neutral-300 px-3 text-base outline-none focus:border-neutral-900";

  return (
    <section className="mt-5 space-y-3">
      <p className="text-sm text-neutral-500">
        Quem digitar um cupom ativo na tela de pagamento ganha o desconto no valor final; o sinal continua sobre o
        preço cheio. Desligar um cupom vale na hora para quem ainda não pagou. Os pedidos com cupom aparecem no filtro
        &quot;Com cupom&quot; da aba Pedidos.
      </p>

      {cupons.map((c) => (
        <CartaoCupom key={c.codigo} cupom={c} pedidos={pedidos} ocupado={ocupado === c.codigo} mudar={mudar} />
      ))}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valido) return;
          setErro(null);
          const falhou = await criar(codigoNorm, pct, mensagem);
          if (falhou) setErro(falhou);
          else {
            setCodigo("");
            setMensagem("");
          }
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
        </div>
        <p className="mt-2 text-xs text-neutral-500">Código: só letras e números, de 3 a 20 caracteres.</p>

        <CampoMensagem valor={mensagem} mudar={setMensagem} />

        <button
          type="submit"
          disabled={!valido || ocupado === "novo-cupom"}
          className={`${classeToque} mt-3 h-11 w-full rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white disabled:bg-neutral-300`}
        >
          {ocupado === "novo-cupom" ? "Criando..." : "Criar cupom"}
        </button>
        {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
      </form>
    </section>
  );
}

function CartaoCupom({
  cupom: c,
  pedidos,
  ocupado,
  mudar,
}: {
  cupom: CupomAdmin;
  pedidos: PedidoAdmin[];
  ocupado: boolean;
  mudar: (codigo: string, dados: Mudanca) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [mensagem, setMensagem] = useState(c.mensagem ?? "");

  const comCupom = pedidos.filter((p) => p.cupom_codigo === c.codigo && usado(p.status));
  const descontos = comCupom.reduce((s, p) => s + p.desconto_centavos, 0);

  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between gap-3">
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
          disabled={ocupado}
          onClick={() => mudar(c.codigo, { ativo: !c.ativo })}
          className={`${classeToque} shrink-0 rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50`}
        >
          {c.ativo ? "Desligar" : "Ligar"}
        </button>
      </div>

      {editando ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await mudar(c.codigo, { mensagem: mensagem.trim() || null });
            setEditando(false);
          }}
        >
          <CampoMensagem valor={mensagem} mudar={setMensagem} />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={ocupado || mensagem.length > MAX_MENSAGEM}
              className={`${classeToque} h-10 flex-1 rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:bg-neutral-300`}
            >
              {ocupado ? "Salvando..." : "Salvar mensagem"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMensagem(c.mensagem ?? "");
                setEditando(false);
              }}
              className={`${classeToque} h-10 rounded-xl border border-neutral-300 px-4 text-sm`}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 border-t border-neutral-100 pt-3 text-sm">
          <p className="text-neutral-600">
            {c.mensagem ? (
              <>
                <span className="text-neutral-500">Mensagem: </span>
                <span className="text-neutral-900">{formatarWhatsapp(c.mensagem)}</span>
              </>
            ) : (
              <span className="text-neutral-400">Sem mensagem: a cliente vê só o aviso de cupom aplicado.</span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={`${classeToque} mt-1 font-medium underline underline-offset-4`}
          >
            {c.mensagem ? "Editar mensagem" : "Escrever mensagem"}
          </button>
        </div>
      )}
    </div>
  );
}

// Campo da mensagem com a prévia de como a cliente vai ver
function CampoMensagem({ valor, mudar }: { valor: string; mudar: (v: string) => void }) {
  return (
    <label className="mt-3 block text-sm">
      <span className="mb-1 block text-neutral-600">Mensagem para quem usar o cupom (opcional)</span>
      <textarea
        value={valor}
        onChange={(e) => mudar(e.target.value)}
        rows={3}
        maxLength={MAX_MENSAGEM}
        placeholder="Ex.: Parabéns, {nome}! Você é especial pra gente."
        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900"
      />
      <span className="mt-1 block text-xs text-neutral-500">
        Escreva {"{nome}"} onde deve entrar o primeiro nome da cliente. Como no WhatsApp: *negrito*, _itálico_ e
        ~riscado~. {valor.length}/{MAX_MENSAGEM}
      </span>
      {valor.trim() && (
        <span className="mt-2 block rounded-xl bg-neutral-50 px-3 py-2 text-sm">
          <span className="text-neutral-500">Prévia: </span>
          <span className="font-medium text-neutral-900">
            {formatarWhatsapp(mensagemDoCupom(valor.trim(), NOME_EXEMPLO))}
          </span>
        </span>
      )}
    </label>
  );
}
