import { produtos } from "@/config/campanha";
import { exigirAdmin } from "@/lib/admin";
import { listarPedidos } from "@/lib/pedidosAdmin";
import { faltaDoPedido } from "@/lib/valores";

// Planilha dos pedidos, separada por ponto e vírgula (abre direto no Excel em português)
export async function GET() {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  const pedidos = await listarPedidos();
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? id;
  const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const celula = (v: unknown) => {
    const texto = String(v ?? "");
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };

  const cabecalho = [
    "Pedido",
    "Status",
    "Nome",
    "WhatsApp",
    "Modalidade",
    "Data",
    "Hora",
    "Endereço",
    "Produtos",
    "Unidades",
    "Total (R$)",
    "Sinal (R$)",
    "Cupom",
    "Desconto (R$)",
    "Pago (R$)",
    "Restante (R$)",
    "Criado em",
  ];
  const linhas = pedidos.map((p) => [
    p.numero,
    p.status,
    p.nome,
    p.whatsapp,
    p.modalidade,
    p.data_recebimento.split("-").reverse().join("/"),
    p.hora_retirada != null ? `${p.hora_retirada}h` : "",
    p.modalidade === "entrega"
      ? [p.rua, p.numero_endereco, p.complemento, p.bairro, p.cidade, p.cep].filter(Boolean).join(", ")
      : "",
    p.itens_pedido.map((i) => `${i.quantidade}x ${nomeProduto(i.produto_id)}`).join(" + "),
    p.unidades,
    reais(p.total_centavos),
    reais(p.sinal_centavos),
    p.cupom_codigo ?? "",
    p.desconto_centavos > 0 ? reais(p.desconto_centavos) : "",
    p.pago_centavos != null ? reais(p.pago_centavos) : "",
    reais(faltaDoPedido(p)),
    new Date(p.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
  ]);

  // BOM no início para o Excel reconhecer os acentos
  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-natal.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
