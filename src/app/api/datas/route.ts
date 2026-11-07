import { connection } from "next/server";
import { datasAbertas } from "@/lib/datas";

// Datas que ainda aceitam reserva, por modalidade
export async function GET() {
  await connection();
  try {
    return Response.json(await datasAbertas(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("datas abertas", e);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
}
