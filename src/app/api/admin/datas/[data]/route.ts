import { z } from "zod";
import { campanha } from "@/config/campanha";
import { exigirAdmin } from "@/lib/admin";
import { bancoDeDados } from "@/lib/supabase";

const esquema = z.object({ acao: z.enum(["abrir", "fechar", "automatico"]) });

// Abre ou fecha um dia inteiro à mão, ou devolve o dia para o automático
export async function POST(request: Request, ctx: RouteContext<"/api/admin/datas/[data]">) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  const { data } = await ctx.params;
  const valida = campanha.datas.entrega.includes(data) || campanha.datas.retirada.includes(data);
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!valida || !corpo.success) return Response.json({ erro: "invalido" }, { status: 400 });

  const tabela = bancoDeDados().from("datas_manuais");
  const { error } =
    corpo.data.acao === "automatico"
      ? await tabela.delete().eq("data", data)
      : await tabela.upsert({ data, aberta: corpo.data.acao === "abrir", atualizado_em: new Date().toISOString() });

  if (error) {
    console.error("admin: mudar data", error);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
