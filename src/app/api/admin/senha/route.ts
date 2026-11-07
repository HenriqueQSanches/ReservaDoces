import { z } from "zod";
import { adminLogado, trocarSenha } from "@/lib/admin";

const esquema = z.object({ atual: z.string().min(1).max(200), nova: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const admin = await adminLogado();
  if (!admin) return Response.json({ ok: false, motivo: "nao_logado" }, { status: 401 });

  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ ok: false, motivo: "invalido" }, { status: 400 });

  const resultado = await trocarSenha(admin, corpo.data.atual, corpo.data.nova);
  return Response.json(resultado, { status: resultado.ok ? 200 : 400 });
}
