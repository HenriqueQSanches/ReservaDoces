"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { campanha, produtos, type Modalidade } from "@/config/campanha";

export type DadosCliente = {
  nome: string;
  whatsapp: string;
  modalidade: Modalidade;
  data: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
};

type Estado = {
  itens: Record<string, number>;
  dados: DadosCliente | null;
};

type ContextoReserva = Estado & {
  carregado: boolean;
  totalUnidades: number;
  totalCentavos: number;
  restanteCentavos: number;
  adicionar: (produtoId: string) => void;
  remover: (produtoId: string) => void;
  salvarDados: (dados: DadosCliente) => void;
  limpar: () => void;
};

// A reserva fica no sessionStorage para sobreviver a um recarregar da página.
// Quando o backend entrar, o pedido passa a existir no banco a partir da tela 2.
const CHAVE = "reserva-natal";
const vazio: Estado = { itens: {}, dados: null };

let atual: Estado | null = null;
const ouvintes = new Set<() => void>();

function ler(): Estado {
  if (atual) return atual;
  try {
    atual = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null") ?? vazio;
  } catch {
    atual = vazio;
  }
  return atual!;
}

function gravar(atualizar: (e: Estado) => Estado) {
  atual = atualizar(ler());
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch {}
  ouvintes.forEach((ouvinte) => ouvinte());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

const acoes = {
  adicionar: (id: string) =>
    gravar((e) => ({ ...e, itens: { ...e.itens, [id]: (e.itens[id] ?? 0) + 1 } })),
  remover: (id: string) =>
    gravar((e) => {
      const qtd = (e.itens[id] ?? 0) - 1;
      const itens = { ...e.itens };
      if (qtd > 0) itens[id] = qtd;
      else delete itens[id];
      return { ...e, itens };
    }),
  salvarDados: (dados: DadosCliente) => gravar((e) => ({ ...e, dados })),
  limpar: () => gravar(() => vazio),
};

const Contexto = createContext<ContextoReserva | null>(null);

export function ReservaProvider({ children }: { children: React.ReactNode }) {
  // No servidor não existe sessionStorage: o estado é null até o navegador assumir.
  const estado = useSyncExternalStore(assinar, ler, () => null);

  const valor = useMemo<ContextoReserva>(() => {
    const { itens, dados } = estado ?? vazio;
    const totalUnidades = Object.values(itens).reduce((s, q) => s + q, 0);
    const totalCentavos = produtos.reduce(
      (s, p) => s + (itens[p.id] ?? 0) * p.precoCentavos,
      0,
    );

    return {
      itens,
      dados,
      carregado: estado !== null,
      totalUnidades,
      totalCentavos,
      restanteCentavos: Math.max(0, totalCentavos - campanha.sinalCentavos),
      ...acoes,
    };
  }, [estado]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useReserva() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useReserva precisa estar dentro do ReservaProvider");
  return ctx;
}
