import { connection } from "next/server";
import type { Grupo } from "@/config/campanha";
import { maximoPorGrupo, vagasPorData } from "@/lib/vagas";

export type Disponibilidade = {
  // maior quantidade de cada produto que ainda cabe em alguma data aberta
  maximo: Record<Grupo, number>;
  esgotado: boolean;
};

export async function GET() {
  await connection();
  try {
    const maximo = maximoPorGrupo(await vagasPorData());
    const resposta: Disponibilidade = { maximo, esgotado: Object.values(maximo).every((n) => n === 0) };
    return Response.json(resposta, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("disponibilidade", e);
    return Response.json({ erro: "indisponivel" }, { status: 500 });
  }
}
