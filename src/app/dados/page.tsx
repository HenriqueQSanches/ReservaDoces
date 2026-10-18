"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { campanha, type Modalidade } from "@/config/campanha";
import { Tela, classeBotaoAcao } from "@/components/Tela";
import { useReserva } from "@/lib/reserva";
import {
  dataCurta,
  linkWhatsapp,
  mascaraCep,
  mascaraWhatsapp,
  somenteDigitos,
} from "@/lib/formatar";

const esquema = z
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
    cep: z.string(),
    rua: z.string(),
    numero: z.string(),
    complemento: z.string(),
    bairro: z.string(),
    cidade: z.string(),
    privacidade: z.boolean().refine((v) => v, "Precisamos do seu aceite para continuar"),
  })
  .superRefine((d, ctx) => {
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

type Formulario = z.input<typeof esquema>;

const vazio: Formulario = {
  nome: "",
  whatsapp: "",
  modalidade: "",
  data: "",
  cep: "",
  rua: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  privacidade: false,
};

const classeCampo =
  "h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-neutral-900";

function Erro({ mensagem }: { mensagem?: string }) {
  return mensagem ? <p className="mt-1 text-sm text-red-600">{mensagem}</p> : null;
}

export default function Dados() {
  const router = useRouter();
  const { carregado, totalUnidades, dados, salvarDados } = useReserva();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: vazio,
  });

  // Sem produto escolhido não tem o que reservar: volta para a vitrine.
  useEffect(() => {
    if (carregado && totalUnidades === 0) router.replace("/");
  }, [carregado, totalUnidades, router]);

  // Quem volta da tela 3 encontra o formulário preenchido.
  useEffect(() => {
    if (carregado && dados) reset({ ...vazio, ...dados, privacidade: true });
  }, [carregado, dados, reset]);

  const modalidade = useWatch({ control, name: "modalidade" }) as Modalidade | "";
  const cep = useWatch({ control, name: "cep" });
  const datas = modalidade ? campanha.datas[modalidade] : [];

  useEffect(() => {
    const digitos = somenteDigitos(cep);
    if (digitos.length !== 8) return;
    const controle = new AbortController();
    fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal: controle.signal })
      .then((r) => r.json())
      .then((endereco) => {
        if (endereco.erro) return;
        setValue("rua", endereco.logradouro ?? "", { shouldValidate: true });
        setValue("bairro", endereco.bairro ?? "", { shouldValidate: true });
        setValue("cidade", `${endereco.localidade}/${endereco.uf}`);
      })
      .catch(() => {});
    return () => controle.abort();
  }, [cep, setValue]);

  const enviar = handleSubmit((valores) => {
    salvarDados({ ...valores, modalidade: valores.modalidade as Modalidade });
    router.push("/reserva");
  });

  return (
    <Tela
      logo="monograma"
      rodape={
        <button type="submit" form="form-dados" className={classeBotaoAcao}>
          Concluir
        </button>
      }
    >
      <h1 className="mb-6 text-center text-2xl font-bold">Dados para reserva</h1>

      <form id="form-dados" onSubmit={enviar} noValidate className="mx-auto max-w-md space-y-4">
        <div>
          <input
            {...register("nome")}
            placeholder="Nome e sobrenome"
            autoComplete="name"
            className={classeCampo}
          />
          <Erro mensagem={errors.nome?.message} />
        </div>

        <div>
          <input
            {...register("whatsapp", {
              onChange: (e) => setValue("whatsapp", mascaraWhatsapp(e.target.value)),
            })}
            placeholder="WhatsApp (DDD)"
            inputMode="numeric"
            autoComplete="tel-national"
            className={classeCampo}
          />
          <Erro mensagem={errors.whatsapp?.message} />
        </div>

        <div>
          <select
            {...register("modalidade", { onChange: () => setValue("data", "") })}
            className={classeCampo}
          >
            <option value="">Como você quer receber?</option>
            <option value="retirada">Prefiro ir retirar!</option>
            <option value="entrega">Quero receber em casa!</option>
          </select>
          <Erro mensagem={errors.modalidade?.message} />
          {modalidade === "retirada" && (
            <p className="mt-2 text-sm text-neutral-600">
              Retirada na {campanha.enderecoRetirada}.
            </p>
          )}
        </div>

        {modalidade === "entrega" && (
          <fieldset className="space-y-4">
            <div>
              <input
                {...register("cep", { onChange: (e) => setValue("cep", mascaraCep(e.target.value)) })}
                placeholder="CEP"
                inputMode="numeric"
                autoComplete="postal-code"
                className={classeCampo}
              />
              <Erro mensagem={errors.cep?.message} />
            </div>
            <div>
              <input {...register("rua")} placeholder="Rua" autoComplete="address-line1" className={classeCampo} />
              <Erro mensagem={errors.rua?.message} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input {...register("numero")} placeholder="Número" inputMode="numeric" className={classeCampo} />
                <Erro mensagem={errors.numero?.message} />
              </div>
              <input {...register("complemento")} placeholder="Complemento" className={classeCampo} />
            </div>
            <div>
              <input {...register("bairro")} placeholder="Bairro" className={classeCampo} />
              <Erro mensagem={errors.bairro?.message} />
            </div>
          </fieldset>
        )}

        {modalidade && (
          <div>
            <select {...register("data")} className={classeCampo}>
              <option value="">
                {modalidade === "retirada" ? "Data da retirada" : "Data da entrega"}
              </option>
              {datas.map((d) => (
                <option key={d} value={d}>
                  {dataCurta(d)}
                </option>
              ))}
            </select>
            <Erro mensagem={errors.data?.message} />
            <a
              href={linkWhatsapp(
                campanha.whatsapp,
                "Olá! Quero fazer uma reserva de Natal, mas nenhuma data serve para mim.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-neutral-600 underline"
            >
              Nenhuma data serve? Fale com a gente
            </a>
          </div>
        )}

        <div>
          <label className="flex items-start gap-3 text-sm text-neutral-600">
            <input type="checkbox" {...register("privacidade")} className="mt-0.5 size-5 accent-neutral-900" />
            <span>
              Concordo que meus dados sejam usados apenas para esta reserva e para o contato sobre o
              pedido.
            </span>
          </label>
          <Erro mensagem={errors.privacidade?.message} />
        </div>
      </form>
    </Tela>
  );
}
