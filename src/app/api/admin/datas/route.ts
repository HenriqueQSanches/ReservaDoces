import { exigirAdmin } from "@/lib/admin";
import { situacaoDasDatas } from "@/lib/datas";
import { campanha } from "@/config/campanha";

export async function GET() {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;
  try {
    return Response.json(
      { datas: await situacaoDasDatas(), antecedenciaDias: campanha.antecedenciaDias },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("admin: datas", e);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
}
