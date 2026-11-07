"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tela, classeBotaoEscuro } from "@/components/Tela";

const classeCampo =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none transition duration-150 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10";

const mensagens: Record<string, string> = {
  senha_atual: "A senha atual está errada.",
  fraca: "A nova senha precisa ter pelo menos 8 caracteres, com letras e números.",
  igual: "A nova senha precisa ser diferente da atual.",
};

export default function TrocarSenha() {
  const router = useRouter();
  const [primeiraVez, setPrimeiraVez] = useState<boolean | null>(null);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/eu", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((eu) => setPrimeiraVez(eu.precisaTrocar))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nova !== confirmar) return setErro("A confirmação não bate com a nova senha.");
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atual, nova }),
      });
      const resposta = await r.json();
      if (resposta.ok) return router.replace("/admin");
      setErro(mensagens[resposta.motivo] ?? "Não foi possível trocar a senha.");
    } catch {
      setErro("Não foi possível trocar a senha. Confira sua internet.");
    }
    setEnviando(false);
  }

  if (primeiraVez === null) return null;

  return (
    <Tela logo="monograma">
      <form onSubmit={salvar} className="mx-auto max-w-sm space-y-5">
        <h1 className="text-center text-2xl font-bold tracking-tight">Trocar senha</h1>
        {primeiraVez && (
          <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            É seu primeiro acesso: troque a senha provisória por uma só sua para continuar.
          </p>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Senha atual</span>
          <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" className={classeCampo} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Nova senha</span>
          <input type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" className={classeCampo} />
          <span className="mt-1.5 block text-xs text-neutral-500">Pelo menos 8 caracteres, com letras e números.</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Confirmar nova senha</span>
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" className={classeCampo} />
        </label>
        {erro && <p className="animate-entrar text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={enviando || !atual || !nova || !confirmar} className={`${classeBotaoEscuro} w-full disabled:bg-neutral-300`}>
          {enviando ? "Salvando..." : "Salvar nova senha"}
        </button>
        {!primeiraVez && (
          <Link href="/admin" className="block text-center text-sm text-neutral-600 underline underline-offset-4">
            Voltar para o painel
          </Link>
        )}
      </form>
    </Tela>
  );
}
