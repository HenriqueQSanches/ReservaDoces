// Dados da campanha. Endereço, datas, horários e sinal vieram do Luiz (06/11/2026); produtos, preços e WhatsApp são provisórios.

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  precoCentavos: number;
  imagens: string[];
};

export type Modalidade = "retirada" | "entrega";

export const campanha = {
  // Limites da campanha: encerra no que acabar primeiro. A contagem fica no banco.
  // 100 panetones no total (Luiz, 06/11). Limite de reservas a confirmar: por ora não trava antes dos produtos.
  limiteReservas: 100,
  limiteProdutos: 100,
  // Tempo que a vaga fica segura enquanto a cliente paga
  validadeMinutos: 15,
  sinalCentavos: 5000,
  whatsapp: "5511999999999",
  enderecoRetirada: "Rua Francisco Lobo, 71, Parque São Rafael, São Paulo, SP, CEP 08311-140",
  datas: {
    // Retirada: todos os dias de 16/12 a 23/12, com hora marcada
    retirada: ["2026-12-16", "2026-12-17", "2026-12-18", "2026-12-19", "2026-12-20", "2026-12-21", "2026-12-22", "2026-12-23"],
    // Entrega: dois dias fixos, sem escolha de horário
    entrega: ["2026-12-12", "2026-12-19"],
  } satisfies Record<Modalidade, string[]>,
  // Horários de retirada, de hora em hora
  horariosRetirada: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
};

export const produtos: Produto[] = [
  {
    id: "produto-1",
    nome: "Produto 1",
    descricao: "Descrição do produto",
    precoCentavos: 10000,
    imagens: ["/produtos/exemplo-1.svg", "/produtos/exemplo-2.svg", "/produtos/exemplo-3.svg"],
  },
  {
    id: "produto-2",
    nome: "Produto 2",
    descricao: "Descrição do produto",
    precoCentavos: 8000,
    imagens: ["/produtos/exemplo-2.svg", "/produtos/exemplo-3.svg", "/produtos/exemplo-1.svg"],
  },
  {
    id: "produto-3",
    nome: "Produto 3",
    descricao: "Descrição do produto",
    precoCentavos: 6000,
    imagens: ["/produtos/exemplo-3.svg", "/produtos/exemplo-1.svg", "/produtos/exemplo-2.svg"],
  },
];
