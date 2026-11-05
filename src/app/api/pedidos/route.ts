import { z } from "zod";
import { campanha, produtos } from "@/config/campanha";
import { esquemaDados } from "@/lib/esquema";
import { bancoDeDados } from "@/lib/supabase";

const esquemaPedido = z.object({
  itens: z.record(z.string(), z.number().int().min(1).max(campanha.limiteProdutos)),
  dados: esquemaDados,
});

export type RespostaCriarPedido =
  | { ok: true; numero: string }
  | { ok: false; motivo: "esgotado" | "poucas_unidades" | "dados_invalidos" | "erro"; produtos_restantes?: number };

// Cria o pedido pendente e segura a vaga. Preço e total saem daqui, nunca do navegador.
export async function POST(request: Request) {
  const corpo = esquemaPedido.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return resposta({ ok: false, motivo: "dados_invalidos" }, 400);

  const itens = Object.entries(corpo.data.itens).map(([produtoId, quantidade]) => {
    const produto = produtos.find((p) => p.id === produtoId);
    return produto && { produto_id: produto.id, quantidade, preco_centavos: produto.precoCentavos };
  });
  if (itens.length === 0 || itens.some((i) => !i)) return resposta({ ok: false, motivo: "dados_invalidos" }, 400);

  const validos = itens.filter((i) => i !== undefined);
  const totalCentavos = validos.reduce((s, i) => s + i.quantidade * i.preco_centavos, 0);

  const { data, error } = await bancoDeDados().rpc("criar_pedido", {
    p_pedido: { ...corpo.data.dados, total_centavos: totalCentavos, sinal_centavos: campanha.sinalCentavos },
    p_itens: validos,
    p_limite_reservas: campanha.limiteReservas,
    p_limite_produtos: campanha.limiteProdutos,
    p_validade_minutos: campanha.validadeMinutos,
  });

  if (error) {
    console.error("criar_pedido", error);
    return resposta({ ok: false, motivo: "erro" }, 500);
  }

  if (!data.ok) {
    return resposta(
      { ok: false, motivo: data.motivo, produtos_restantes: data.produtos_restantes },
      409,
    );
  }

  return resposta({ ok: true, numero: data.numero }, 201);
}

function resposta(corpo: RespostaCriarPedido, status: number) {
  return Response.json(corpo, { status });
}
