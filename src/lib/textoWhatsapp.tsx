import type { ReactNode } from "react";

// Formatação igual à do WhatsApp nas mensagens de cupom (pedido do Luiz, 10/11/2026):
//   *negrito*   _itálico_   ~riscado~   (dá para combinar: *_negrito e itálico_*)
// Monta elementos do React, nunca HTML: o que o Luiz escreve no painel não vira código na página.
const MARCAS = {
  "*": (conteudo: ReactNode, chave: string) => (
    <strong key={chave} className="font-bold">
      {conteudo}
    </strong>
  ),
  _: (conteudo: ReactNode, chave: string) => <em key={chave}>{conteudo}</em>,
  "~": (conteudo: ReactNode, chave: string) => <s key={chave}>{conteudo}</s>,
} as const;

// Um trecho marcado, como no WhatsApp: a marca só abre no começo ou depois de algo que não é letra/número
// (assim "joao_silva_x" não vira itálico), o texto não começa nem termina com espaço, não quebra linha,
// e a mesma marca fecha antes de uma não-letra. Sem lookbehind, que quebra em iPhone antigo.
const TRECHO = /(^|[^\p{L}\p{N}])([*_~])(\S(?:[^\n]*?\S)??)\2(?![\p{L}\p{N}])/u;

export function formatarWhatsapp(texto: string, prefixo = "w"): ReactNode[] {
  const partes: ReactNode[] = [];
  let resto = texto;
  let i = 0;
  while (resto) {
    const achado = TRECHO.exec(resto);
    if (!achado) {
      partes.push(resto);
      break;
    }
    const [inteiro, antes, marca, conteudo] = achado;
    const inicio = achado.index + antes.length;
    if (inicio > 0) partes.push(resto.slice(0, inicio));
    const chave = `${prefixo}-${i++}`;
    partes.push(MARCAS[marca as keyof typeof MARCAS](formatarWhatsapp(conteudo, chave), chave));
    resto = resto.slice(achado.index + inteiro.length);
  }
  return partes;
}
