import { exigirAdmin } from "@/lib/admin";
import { limitesComUso } from "@/lib/vagas";

export async function GET() {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;
  try {
    return Response.json({ limites: await limitesComUso() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("admin: limites", e);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
}
