import { z } from "zod";
import { buscarCupomAtivo, type Cupom } from "@/lib/cupons";

const esquema = z.object({ codigo: z.string().max(40) });

export type RespostaCupom = ({ ok: true } & Cupom) | { ok: false; motivo: "invalido" | "erro" };

// A tela de resumo confere o cupom antes de mostrar o desconto. O valor cobrado é recalculado no pagamento.
export async function POST(request: Request) {
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ ok: false, motivo: "invalido" } satisfies RespostaCupom, { status: 400 });
  try {
    const cupom = await buscarCupomAtivo(corpo.data.codigo);
    const resposta: RespostaCupom = cupom ? { ok: true, ...cupom } : { ok: false, motivo: "invalido" };
    return Response.json(resposta);
  } catch (e) {
    console.error("cupom: conferir", e);
    return Response.json({ ok: false, motivo: "erro" } satisfies RespostaCupom, { status: 500 });
  }
}
