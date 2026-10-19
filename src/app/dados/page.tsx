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

// Campo com contorno preto e brilho suave quando selecionado; vermelho quando tem erro
const classeCampo =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none transition duration-150 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/15";

function Campo({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">{rotulo}</span>
      {children}
      {erro && <span className="mt-1.5 block animate-entrar text-sm text-red-600">{erro}</span>}
    </label>
  );
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

  // Sem produto escolhido, ou campanha esgotada, não tem o que reservar: volta para a vitrine.
  useEffect(() => {
    if (campanha.esgotado || (carregado && totalUnidades === 0)) router.replace("/");
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
      <h1 className="mb-8 text-center text-2xl font-bold tracking-tight">Dados para reserva</h1>

      <form id="form-dados" onSubmit={enviar} noValidate className="mx-auto max-w-md space-y-5">
        <Campo rotulo="Nome e sobrenome" erro={errors.nome?.message}>
          <input
            {...register("nome")}
            autoComplete="name"
            aria-invalid={!!errors.nome}
            className={classeCampo}
          />
        </Campo>

        <Campo rotulo="WhatsApp (DDD)" erro={errors.whatsapp?.message}>
          <input
            {...register("whatsapp", {
              onChange: (e) => setValue("whatsapp", mascaraWhatsapp(e.target.value)),
            })}
            inputMode="numeric"
            autoComplete="tel-national"
            aria-invalid={!!errors.whatsapp}
            className={classeCampo}
          />
        </Campo>

        <Campo rotulo="Como você quer receber?" erro={errors.modalidade?.message}>
          <select
            {...register("modalidade", { onChange: () => setValue("data", "") })}
            aria-invalid={!!errors.modalidade}
            className={classeCampo}
          >
            <option value="">Selecione</option>
            <option value="retirada">Prefiro ir retirar!</option>
            <option value="entrega">Quero receber em casa!</option>
          </select>
        </Campo>

        {modalidade === "retirada" && (
          <p className="animate-entrar rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Retirada na {campanha.enderecoRetirada}.
          </p>
        )}

        {modalidade === "entrega" && (
          <fieldset className="animate-entrar space-y-5">
            <Campo rotulo="CEP" erro={errors.cep?.message}>
              <input
                {...register("cep", { onChange: (e) => setValue("cep", mascaraCep(e.target.value)) })}
                inputMode="numeric"
                autoComplete="postal-code"
                aria-invalid={!!errors.cep}
                className={classeCampo}
              />
            </Campo>
            <Campo rotulo="Rua" erro={errors.rua?.message}>
              <input
                {...register("rua")}
                autoComplete="address-line1"
                aria-invalid={!!errors.rua}
                className={classeCampo}
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Número" erro={errors.numero?.message}>
                <input
                  {...register("numero")}
                  inputMode="numeric"
                  aria-invalid={!!errors.numero}
                  className={classeCampo}
                />
              </Campo>
              <Campo rotulo="Complemento">
                <input {...register("complemento")} className={classeCampo} />
              </Campo>
            </div>
            <Campo rotulo="Bairro" erro={errors.bairro?.message}>
              <input {...register("bairro")} aria-invalid={!!errors.bairro} className={classeCampo} />
            </Campo>
          </fieldset>
        )}

        {modalidade && (
          <div className="animate-entrar">
            <Campo
              rotulo={modalidade === "retirada" ? "Data da retirada" : "Data da entrega"}
              erro={errors.data?.message}
            >
              <select {...register("data")} aria-invalid={!!errors.data} className={classeCampo}>
                <option value="">Selecione</option>
                {datas.map((d) => (
                  <option key={d} value={d}>
                    {dataCurta(d)}
                  </option>
                ))}
              </select>
            </Campo>
            <a
              href={linkWhatsapp(
                campanha.whatsapp,
                "Olá! Quero fazer uma reserva de Natal, mas nenhuma data serve para mim.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-neutral-600 underline underline-offset-4"
            >
              Nenhuma data serve? Fale com a gente
            </a>
          </div>
        )}

        <div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl p-1 text-sm text-neutral-600">
            <input
              type="checkbox"
              {...register("privacidade")}
              className="mt-0.5 size-5 shrink-0 accent-neutral-900"
            />
            <span>
              Concordo que meus dados sejam usados apenas para esta reserva e para o contato sobre o
              pedido.
            </span>
          </label>
          {errors.privacidade && (
            <p className="mt-1.5 animate-entrar text-sm text-red-600">{errors.privacidade.message}</p>
          )}
        </div>
      </form>
    </Tela>
  );
}
