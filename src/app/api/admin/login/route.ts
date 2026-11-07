import { z } from "zod";
import { entrar } from "@/lib/admin";

const esquema = z.object({ usuario: z.string().min(1).max(60), senha: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const corpo = esquema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ ok: false, motivo: "invalido" }, { status: 400 });

  const resultado = await entrar(corpo.data.usuario, corpo.data.senha);
  return Response.json(resultado, { status: resultado.ok ? 200 : resultado.motivo === "bloqueado" ? 429 : 401 });
}
