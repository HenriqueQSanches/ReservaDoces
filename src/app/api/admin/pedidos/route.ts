import { exigirAdmin } from "@/lib/admin";
import { listarPedidos } from "@/lib/pedidosAdmin";

export async function GET() {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  try {
    return Response.json({ pedidos: await listarPedidos() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("admin: listar pedidos", e);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
}
