// Dados da campanha. Endereço, datas, horários, sinal, WhatsApp, limites e os panetones vieram do Luiz (06 e 07/11/2026).
// Ainda provisórias: as fotos. Outros sabores de Torta Cookie podem chegar.

// Os limites contam por grupo, somando todos os sabores (18 panetones, independente do sabor)
export type Grupo = "panetone" | "torta";

export type Produto = {
  id: string;
  grupo: Grupo;
  nome: string;
  descricao: string;
  // Trechos da descrição com um leve destaque na vitrine (precisam aparecer iguais na descrição)
  destaques?: string[];
  peso?: string;
  precoCentavos: number;
  imagens: string[];
};

export type Modalidade = "retirada" | "entrega";

export const grupos: Record<Grupo, { nome: string; plural: string }> = {
  panetone: { nome: "Panetone", plural: "panetones" },
  torta: { nome: "Torta Cookie", plural: "tortas cookie" },
};

export const campanha = {
  // Tempo que a vaga fica segura enquanto a cliente paga
  validadeMinutos: 15,
  // Sinal fixo por pedido, sem devolução em caso de desistência (Luiz, 07/11/2026)
  sinalCentavos: 7000,
  // Atendimento: (11) 95878-2711
  whatsapp: "5511958782711",
  enderecoRetirada: "Rua Francisco Lobo, 71, Parque São Rafael, São Paulo, SP, CEP 08311-140",
  datas: {
    // Retirada: 16 a 23/12 com hora marcada, menos o dia 19 (exclusivo da entrega)
    retirada: ["2026-12-16", "2026-12-17", "2026-12-18", "2026-12-20", "2026-12-21", "2026-12-22", "2026-12-23"],
    // Entrega: dois dias fixos, sem escolha de horário
    entrega: ["2026-12-12", "2026-12-19"],
  } satisfies Record<Modalidade, string[]>,
  // Cada data sai do site sozinha esses dias antes, ao meio-dia (com 2, o dia 12 fecha no dia 10 às 12h).
  // O Luiz pode fechar ou reabrir qualquer data à mão no painel, por cima disso.
  antecedenciaDias: 2,
  horaFechamento: 12,
  // Horários de retirada, de hora em hora
  horariosRetirada: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  // Os limites por produto, data e bloco ficam no banco (tabela "limites") e o Luiz edita no painel
};

// Cada sabor vira um item aqui, com o grupo certo.
// Nome, descrição, peso e preço do Luiz (07/11/2026); fotos ainda provisórias. Podem chegar mais sabores de torta.
export const produtos: Produto[] = [
  {
    id: "panetone-cacau-castanhas",
    grupo: "panetone",
    nome: "Cacau & Castanhas",
    descricao:
      "Panetone de fermentação natural recheado com Brigadeiro de Cacau 70%, Castanhas de Caju caramelizadas e toques de Flor de Sal.",
    destaques: ["fermentação natural", "Brigadeiro de Cacau 70%", "Castanhas de Caju caramelizadas", "Flor de Sal"],
    peso: "Aprox. 985g",
    precoCentavos: 15000,
    imagens: ["/produtos/exemplo-1.svg", "/produtos/exemplo-2.svg", "/produtos/exemplo-3.svg"],
  },
  {
    id: "panetone-frutas-vermelhas",
    grupo: "panetone",
    nome: "Frutas Vermelhas",
    descricao: "Panetone de fermentação natural recheado com Brigadeiro de Chocolate Branco e Geleia de Frutas Vermelhas.",
    destaques: ["fermentação natural", "Brigadeiro de Chocolate Branco", "Geleia de Frutas Vermelhas"],
    peso: "Aprox. 985g",
    precoCentavos: 15000,
    imagens: ["/produtos/exemplo-2.svg", "/produtos/exemplo-3.svg", "/produtos/exemplo-1.svg"],
  },
  {
    id: "panetone-pistache",
    grupo: "panetone",
    nome: "Pistache",
    descricao: "Panetone de fermentação natural recheado com Brigadeiro de Pistache 100% puro, feito exclusivamente da noz.",
    destaques: ["fermentação natural", "Brigadeiro de Pistache 100% puro"],
    peso: "Aprox. 985g",
    precoCentavos: 15000,
    imagens: ["/produtos/exemplo-3.svg", "/produtos/exemplo-1.svg", "/produtos/exemplo-2.svg"],
  },
  {
    id: "torta-cookie-tradicional",
    grupo: "torta",
    nome: "Torta Cookie Tradicional",
    descricao:
      "Torta Cookie de massa tradicional recheada com Brigadeiro Tradicional e finalizada com gotas de Chocolate meio-amargo.",
    destaques: ["Brigadeiro Tradicional", "Chocolate meio-amargo"],
    peso: "Aprox. 1,1kg",
    precoCentavos: 12500,
    imagens: ["/produtos/exemplo-1.svg", "/produtos/exemplo-2.svg", "/produtos/exemplo-3.svg"],
  },
  {
    id: "torta-cookie-red-velvet",
    grupo: "torta",
    nome: "Torta Cookie Red-Velvet",
    descricao:
      "Torta Cookie de massa red-velvet recheada com Brigadeiro de Ninho, Geleia de Morango artesanal e finalizada com gotas de Chocolate branco.",
    destaques: ["massa red-velvet", "Brigadeiro de Ninho", "Geleia de Morango artesanal", "Chocolate branco"],
    peso: "Aprox. 1,1kg",
    precoCentavos: 12500,
    imagens: ["/produtos/exemplo-2.svg", "/produtos/exemplo-3.svg", "/produtos/exemplo-1.svg"],
  },
];

export const grupoDoProduto = (produtoId: string) => produtos.find((p) => p.id === produtoId)?.grupo;
