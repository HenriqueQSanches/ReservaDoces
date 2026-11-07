import { adminLogado } from "@/lib/admin";

// Quem está logado (para o painel decidir entre login, troca de senha ou pedidos)
export async function GET() {
  const admin = await adminLogado();
  if (!admin) return Response.json({ erro: "nao_logado" }, { status: 401 });
  return Response.json({ usuario: admin.usuario, precisaTrocar: admin.precisaTrocar }, { headers: { "Cache-Control": "no-store" } });
}
