"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { campanha, grupos, produtos, type Grupo, type Modalidade } from "@/config/campanha";
import { Tela, classeBotaoAcao, classeBotaoEscuro } from "@/components/Tela";
import { useReserva } from "@/lib/reserva";
import { esquemaDados } from "@/lib/esquema";
import { useDatasAbertas } from "@/lib/datasAbertas";
import {
  dataCurta,
  linkWhatsapp,
  mascaraCep,
  mascaraWhatsapp,
  somenteDigitos,
} from "@/lib/formatar";

const esquema = esquemaDados.and(
  z.object({
    privacidade: z.boolean().refine((v) => v, "Precisamos do seu aceite para continuar"),
  }),
);

type Formulario = z.input<typeof esquema>;

const vazio: Formulario = {
  nome: "",
  whatsapp: "",
  modalidade: "",
  data: "",
  hora: "",
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
  const { carregado, itens, totalUnidades, dados, salvarDados } = useReserva();

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
  const abertas = useDatasAbertas();
  const datas = modalidade && abertas ? abertas[modalidade] : [];

  // Quanto do carrinho é de cada produto (somando os sabores), para saber quais datas comportam o pedido
  const noCarrinho = (Object.keys(grupos) as Grupo[]).map((g) => ({
    grupo: g,
    qtd: produtos.filter((p) => p.grupo === g).reduce((s, p) => s + (itens[p.id] ?? 0), 0),
  }));
  const cabe = (restantes: Record<Grupo, number>) => noCarrinho.every(({ grupo, qtd }) => qtd <= restantes[grupo]);
  const nenhumaCabe = !!abertas && !!modalidade && datas.every((d) => !cabe(d.restantes));
  // Diz por que a data não serve, "(esgotada)" ou "(cabe até 2 panetones)", para a cliente saber o que mudar
  const motivo = (restantes: Record<Grupo, number>) => {
    const estoura = noCarrinho.filter(({ grupo, qtd }) => qtd > restantes[grupo]);
    const parcial = estoura.find(({ grupo }) => restantes[grupo] > 0);
    if (!parcial) return " (esgotada)";
    const n = restantes[parcial.grupo];
    const { nome, plural } = grupos[parcial.grupo];
    return n === 1 ? ` (cabe só 1 ${nome.toLowerCase()})` : ` (cabe até ${n} ${plural})`;
  };

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
            {...register("modalidade", {
              onChange: () => {
                setValue("data", "");
                setValue("hora", "");
              },
            })}
            aria-invalid={!!errors.modalidade}
            className={classeCampo}
          >
            <option value="">Selecione</option>
            <option value="retirada">Prefiro ir retirar!</option>
            <option value="entrega">Quero receber em casa! (frete grátis)</option>
          </select>
        </Campo>

        {modalidade === "retirada" && (
          <p className="animate-entrar rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Retirada na {campanha.enderecoRetirada}.
          </p>
        )}

        {modalidade === "entrega" && (
          <fieldset className="animate-entrar space-y-5">
            {/* Pedido do Luiz (10/11/2026): deixar claro que receber em casa não custa nada a mais */}
            <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              <span className="font-semibold text-neutral-900">Frete grátis:</span> a entrega é por nossa conta.
            </p>
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
                <option value="">
                  {!abertas ? "Carregando datas..." : nenhumaCabe ? "Nenhuma data disponível" : "Selecione"}
                </option>
                {datas.map((d) => (
                  <option key={d.data} value={d.data} disabled={!cabe(d.restantes)}>
                    {dataCurta(d.data)}
                    {cabe(d.restantes) ? "" : motivo(d.restantes)}
                  </option>
                ))}
              </select>
            </Campo>
            {nenhumaCabe && (
              <div className="mt-3 animate-entrar rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                <p>
                  Não temos data de {modalidade === "retirada" ? "retirada" : "entrega"} para essa quantidade.
                  Fale com a gente pelo WhatsApp que a gente tenta resolver, ou volte e ajuste a quantidade.
                </p>
                <a
                  href={linkWhatsapp(
                    campanha.whatsapp,
                    `Olá! Quero reservar ${noCarrinho
                      .filter((c) => c.qtd > 0)
                      .map((c) => `${c.qtd} ${c.qtd === 1 ? grupos[c.grupo].nome : grupos[c.grupo].plural}`)
                      .join(" e ")} para ${modalidade === "retirada" ? "retirada" : "entrega"}, mas não achei data no site.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${classeBotaoEscuro} mt-3 w-full`}
                >
                  Falar com a gente no WhatsApp
                </a>
              </div>
            )}
            {modalidade === "retirada" && (
              <div className="mt-5 animate-entrar">
                <Campo rotulo="Horário da retirada" erro={errors.hora?.message}>
                  <select {...register("hora")} aria-invalid={!!errors.hora} className={classeCampo}>
                    <option value="">Selecione</option>
                    {campanha.horariosRetirada.map((h) => (
                      <option key={h} value={String(h)}>
                        {h}h
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            )}
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
