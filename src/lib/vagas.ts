import "server-only";
import { grupos, type Grupo, type Modalidade } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";
import { situacaoDasDatas } from "@/lib/datas";

export type Limite = {
  id: string;
  nome: string;
  grupo: Grupo;
  modalidade: Modalidade;
  datas: string[];
  limite_total: number | null;
  limite_dia: number;
  ordem: number;
};

export type LimiteComUso = Limite & {
  ocupadoBloco: number;
  ocupadoPorDia: Record<string, number>;
};

// Quanto ainda cabe de cada grupo em cada data aberta, por modalidade
export type VagasPorData = Record<Modalidade, { data: string; restantes: Record<Grupo, number> }[]>;

const nomesGrupos = Object.keys(grupos) as Grupo[];

export async function limitesComUso(): Promise<LimiteComUso[]> {
  const banco = bancoDeDados();
  const [{ data: limites, error: e1 }, { data: ocupadas, error: e2 }] = await Promise.all([
    banco.from("limites").select("*").order("ordem"),
    banco.rpc("unidades_ocupadas"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const uso = (ocupadas ?? []) as { grupo: string; modalidade: string; data: string; unidades: number }[];
  return (limites as Limite[]).map((l) => {
    const ocupadoPorDia = Object.fromEntries(
      l.datas.map((d) => [
        d,
        uso
          .filter((o) => o.grupo === l.grupo && o.modalidade === l.modalidade && o.data === d)
          .reduce((s, o) => s + o.unidades, 0),
      ]),
    );
    const ocupadoBloco = Object.values(ocupadoPorDia).reduce((s, n) => s + n, 0);
    return { ...l, ocupadoPorDia, ocupadoBloco };
  });
}

// Mesmo cálculo da função pedido_cabe do banco: o menor entre o que sobra no dia e o que sobra no bloco
function restanteNoDia(l: LimiteComUso, data: string) {
  const dia = l.limite_dia - (l.ocupadoPorDia[data] ?? 0);
  const bloco = l.limite_total == null ? Infinity : l.limite_total - l.ocupadoBloco;
  return Math.max(0, Math.min(dia, bloco));
}

export async function vagasPorData(): Promise<VagasPorData> {
  const [limites, situacao] = await Promise.all([limitesComUso(), situacaoDasDatas()]);

  const montar = (modalidade: Modalidade) =>
    situacao
      .filter((s) => s.aberta && s.modalidades.includes(modalidade))
      .map((s) => ({
        data: s.data,
        restantes: Object.fromEntries(
          nomesGrupos.map((g) => {
            const regra = limites.find((l) => l.grupo === g && l.modalidade === modalidade && l.datas.includes(s.data));
            return [g, regra ? restanteNoDia(regra, s.data) : 0];
          }),
        ) as Record<Grupo, number>,
      }));

  return { entrega: montar("entrega"), retirada: montar("retirada") };
}

// Maior quantidade de cada grupo que ainda cabe em alguma data aberta (para a vitrine)
export function maximoPorGrupo(vagas: VagasPorData): Record<Grupo, number> {
  const todas = [...vagas.entrega, ...vagas.retirada];
  return Object.fromEntries(
    nomesGrupos.map((g) => [g, todas.reduce((m, d) => Math.max(m, d.restantes[g]), 0)]),
  ) as Record<Grupo, number>;
}
