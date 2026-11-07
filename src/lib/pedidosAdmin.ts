import "server-only";
import { bancoDeDados } from "@/lib/supabase";

export type PedidoAdmin = {
  numero: string;
  status: string;
  nome: string;
  whatsapp: string;
  modalidade: "retirada" | "entrega";
  data_recebimento: string;
  hora_retirada: number | null;
  cep: string | null;
  rua: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  unidades: number;
  total_centavos: number;
  sinal_centavos: number;
  expira_em: string;
  pago_em: string | null;
  criado_em: string;
  mp_pagamento_id: string | null;
  itens_pedido: { produto_id: string; quantidade: number; preco_centavos: number }[];
};

export async function listarPedidos() {
  const { data, error } = await bancoDeDados()
    .from("pedidos")
    .select(
      "numero, status, nome, whatsapp, modalidade, data_recebimento, hora_retirada, cep, rua, numero_endereco, complemento, bairro, cidade, unidades, total_centavos, sinal_centavos, expira_em, pago_em, criado_em, mp_pagamento_id, itens_pedido(produto_id, quantidade, preco_centavos)",
    )
    .order("criado_em", { ascending: false })
    .limit(1000);
  if (error) throw error;

  // Pendente vencido aparece como expirado, igual à contagem de vagas
  const agora = Date.now();
  return (data as PedidoAdmin[]).map((p) =>
    p.status === "pendente" && new Date(p.expira_em).getTime() < agora ? { ...p, status: "expirado" } : p,
  );
}
