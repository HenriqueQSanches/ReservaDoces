import { z } from "zod";
import { campanha, produtos, sinalDoPedido, type Grupo, type Modalidade } from "@/config/campanha";
import { datasAbertas } from "@/lib/datas";
import { esquemaDados } from "@/lib/esquema";
import { bancoDeDados } from "@/lib/supabase";

const esquemaPedido = z.object({
  itens: z.record(z.string(), z.number().int().min(1).max(100)),
  dados: esquemaDados,
});

export type RespostaCriarPedido =
  | { ok: true; numero: string }
  | { ok: false; motivo: "sem_vaga"; grupo: Grupo; restante: number }
  | { ok: false; motivo: "data_fechada" | "dados_invalidos" | "erro" };

// Cria o pedido pendente e segura a vaga. Preço, total e grupo saem daqui, nunca do navegador.
// Os limites por produto, data e bloco são conferidos no banco, numa trava única.
export async function POST(request: Request) {
  const corpo = esquemaPedido.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return resposta({ ok: false, motivo: "dados_invalidos" }, 400);

  const itens = Object.entries(corpo.data.itens).map(([produtoId, quantidade]) => {
    const produto = produtos.find((p) => p.id === produtoId);
    return (
      produto && {
        produto_id: produto.id,
        grupo: produto.grupo,
        quantidade,
        preco_centavos: produto.precoCentavos,
      }
    );
  });
  if (itens.length === 0 || itens.some((i) => !i)) return resposta({ ok: false, motivo: "dados_invalidos" }, 400);

  // A data pode ter fechado (sozinha ou à mão) entre a tela 2 e o pagamento
  const modalidade = corpo.data.dados.modalidade as Modalidade;
  if (!(await datasAbertas())[modalidade].includes(corpo.data.dados.data))
    return resposta({ ok: false, motivo: "data_fechada" }, 409);

  const validos = itens.filter((i) => i !== undefined);
  const totalCentavos = validos.reduce((s, i) => s + i.quantidade * i.preco_centavos, 0);

  const { data, error } = await bancoDeDados().rpc("criar_pedido", {
    p_pedido: { ...corpo.data.dados, total_centavos: totalCentavos, sinal_centavos: sinalDoPedido(totalCentavos) },
    p_itens: validos,
    p_validade_minutos: campanha.validadeMinutos,
  });

  if (error) {
    console.error("criar_pedido", error);
    return resposta({ ok: false, motivo: "erro" }, 500);
  }

  if (!data.ok) {
    return data.motivo === "sem_vaga"
      ? resposta({ ok: false, motivo: "sem_vaga", grupo: data.grupo, restante: data.restante }, 409)
      : resposta({ ok: false, motivo: "dados_invalidos" }, 400);
  }

  return resposta({ ok: true, numero: data.numero }, 201);
}

function resposta(corpo: RespostaCriarPedido, status: number) {
  return Response.json(corpo, { status });
}
