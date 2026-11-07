import { connection } from "next/server";
import { vagasPorData } from "@/lib/vagas";

// Datas que ainda aceitam reserva, por modalidade, com quanto cabe de cada produto em cada uma
export async function GET() {
  await connection();
  try {
    return Response.json(await vagasPorData(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("datas abertas", e);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
}
