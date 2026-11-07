import "server-only";
import { campanha, type Modalidade } from "@/config/campanha";
import { bancoDeDados } from "@/lib/supabase";

// Data de hoje em São Paulo, "AAAA-MM-DD" (o servidor roda em UTC)
export function hojeSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function diasAntes(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

// Momento em que a data fecha sozinha: X dias antes, ao meio-dia de São Paulo (sem horário de verão desde 2019)
export function fechamentoAutomatico(data: string) {
  const hora = String(campanha.horaFechamento).padStart(2, "0");
  return new Date(`${diasAntes(data, campanha.antecedenciaDias)}T${hora}:00:00-03:00`);
}

export type SituacaoData = {
  data: string;
  modalidades: Modalidade[];
  // o que o automático diria
  automatica: boolean;
  // escolha manual do Luiz, ou null se segue o automático
  manual: boolean | null;
  // o que vale
  aberta: boolean;
  passou: boolean;
};

// Situação de cada data da campanha. Manual vence o automático; data que já passou fica sempre fechada.
export async function situacaoDasDatas(): Promise<SituacaoData[]> {
  const { data: manuais, error } = await bancoDeDados().from("datas_manuais").select("data, aberta");
  if (error) throw error;
  const escolhas = new Map((manuais ?? []).map((m) => [m.data as string, m.aberta as boolean]));

  const hoje = hojeSaoPaulo();
  const todas = [...new Set([...campanha.datas.entrega, ...campanha.datas.retirada])].sort();

  return todas.map((data) => {
    const modalidades = (["entrega", "retirada"] as const).filter((m) => campanha.datas[m].includes(data));
    const passou = data < hoje;
    const automatica = Date.now() < fechamentoAutomatico(data).getTime();
    const manual = escolhas.has(data) ? escolhas.get(data)! : null;
    return { data, modalidades, automatica, manual, passou, aberta: !passou && (manual ?? automatica) };
  });
}

export async function datasAbertas() {
  const situacao = await situacaoDasDatas();
  const abertas = (m: Modalidade) => situacao.filter((s) => s.aberta && s.modalidades.includes(m)).map((s) => s.data);
  return { entrega: abertas("entrega"), retirada: abertas("retirada") };
}
