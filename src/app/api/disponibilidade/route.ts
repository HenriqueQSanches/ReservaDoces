import { connection } from "next/server";
import { campanha } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";

export type Disponibilidade = {
  reservas_restantes: number;
  produtos_restantes: number;
  esgotado: boolean;
};

export async function GET() {
  await connection();

  const { data, error } = await bancoDeDados().rpc("disponibilidade", {
    p_limite_reservas: campanha.limiteReservas,
    p_limite_produtos: campanha.limiteProdutos,
  });

  if (error) {
    console.error("disponibilidade", error);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }

  return Response.json(data as Disponibilidade, { headers: { "Cache-Control": "no-store" } });
}
