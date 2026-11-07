import { z } from "zod";
import { campanha } from "@/config/campanha";
import { somenteDigitos } from "@/lib/formatar";

// Mesmo esquema na tela 2 (navegador) e na rota que cria o pedido (servidor).
export const esquemaDados = z
  .object({
    nome: z
      .string()
      .trim()
      .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome"),
    whatsapp: z
      .string()
      .refine((v) => somenteDigitos(v).length === 11, "Informe o WhatsApp com DDD"),
    modalidade: z
      .string()
      .refine((v) => v === "retirada" || v === "entrega", "Escolha retirar ou receber em casa"),
    data: z.string().min(1, "Escolha uma data"),
    hora: z.string(),
    cep: z.string(),
    rua: z.string(),
    numero: z.string(),
    complemento: z.string(),
    bairro: z.string(),
    cidade: z.string(),
  })
  .superRefine((d, ctx) => {
    const datas: string[] =
      d.modalidade === "retirada" || d.modalidade === "entrega" ? campanha.datas[d.modalidade] : [];
    if (d.data && !datas.includes(d.data))
      ctx.addIssue({ code: "custom", path: ["data"], message: "Escolha uma data" });

    // Retirada tem hora marcada (de hora em hora); entrega não tem escolha de horário
    if (d.modalidade === "retirada") {
      const horas = campanha.horariosRetirada.map(String);
      if (!horas.includes(d.hora))
        ctx.addIssue({ code: "custom", path: ["hora"], message: "Escolha o horário da retirada" });
    }

    if (d.modalidade !== "entrega") return;
    const exigir = (campo: "rua" | "numero" | "bairro", mensagem: string) => {
      if (!d[campo].trim()) ctx.addIssue({ code: "custom", path: [campo], message: mensagem });
    };
    if (somenteDigitos(d.cep).length !== 8)
      ctx.addIssue({ code: "custom", path: ["cep"], message: "Informe o CEP" });
    exigir("rua", "Informe a rua");
    exigir("numero", "Informe o número");
    exigir("bairro", "Informe o bairro");
  });
