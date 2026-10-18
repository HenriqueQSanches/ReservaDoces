// Dados da campanha. Endereço de retirada e sinal vieram do Luiz; produtos, preços, datas e WhatsApp são provisórios.

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  precoCentavos: number;
  imagens: string[];
};

export type Modalidade = "retirada" | "entrega";

export const campanha = {
  sinalCentavos: 5000,
  whatsapp: "5511999999999",
  enderecoRetirada:
    "R. Francisco Lobo, 71, Parque São Rafael, São Mateus, Zona Leste, SP",
  datas: {
    retirada: ["2026-12-23", "2026-12-24"],
    entrega: ["2026-12-22", "2026-12-23", "2026-12-24"],
  } satisfies Record<Modalidade, string[]>,
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
