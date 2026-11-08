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
  // Limite que vale em cada dia: o do dia específico, se o Luiz definiu, ou o "por dia" do bloco
  limitePorDia: Record<string, number>;
  // Só os dias com limite próprio (tabela limites_por_dia)
  ajustesPorDia: Record<string, number>;
};

// Quanto ainda cabe de cada grupo em cada data aberta, por modalidade
export type VagasPorData = Record<Modalidade, { data: string; restantes: Record<Grupo, number> }[]>;

const nomesGrupos = Object.keys(grupos) as Grupo[];

export async function limitesComUso(): Promise<LimiteComUso[]> {
  const banco = bancoDeDados();
  const [{ data: limites, error: e1 }, { data: ocupadas, error: e2 }, { data: ajustes, error: e3 }] = await Promise.all([
    banco.from("limites").select("*").order("ordem"),
    banco.rpc("unidades_ocupadas"),
    banco.from("limites_por_dia").select("limite_id, data, limite"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  const porDia = (ajustes ?? []) as { limite_id: string; data: string; limite: number }[];

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
    const ajustesPorDia = Object.fromEntries(
      porDia.filter((a) => a.limite_id === l.id && l.datas.includes(a.data)).map((a) => [a.data, a.limite]),
    );
    const limitePorDia = Object.fromEntries(l.datas.map((d) => [d, ajustesPorDia[d] ?? l.limite_dia]));
    return { ...l, ocupadoPorDia, ocupadoBloco, limitePorDia, ajustesPorDia };
  });
}

// Mesmo cálculo da função pedido_cabe do banco: o menor entre o que sobra no dia e o que sobra no bloco
function restanteNoDia(l: LimiteComUso, data: string) {
  const dia = (l.limitePorDia[data] ?? l.limite_dia) - (l.ocupadoPorDia[data] ?? 0);
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
