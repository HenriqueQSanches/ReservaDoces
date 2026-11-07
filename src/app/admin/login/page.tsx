"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tela, classeBotaoEscuro } from "@/components/Tela";

const classeCampo =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base outline-none transition duration-150 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/10";

export default function LoginAdmin() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      const resposta = await r.json();
      if (resposta.ok) {
        router.replace(resposta.precisaTrocar ? "/admin/senha" : "/admin");
        return;
      }
      setErro(
        resposta.motivo === "bloqueado"
          ? "Muitas tentativas erradas. Espere 15 minutos e tente de novo."
          : "Usuário ou senha incorretos.",
      );
    } catch {
      setErro("Não foi possível entrar. Confira sua internet.");
    }
    setEnviando(false);
  }

  return (
    <Tela logo="monograma">
      <form onSubmit={entrar} className="mx-auto max-w-sm space-y-5">
        <h1 className="text-center text-2xl font-bold tracking-tight">Painel de reservas</h1>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Usuário</span>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            className={classeCampo}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-neutral-700">Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            className={classeCampo}
          />
        </label>
        {erro && <p className="animate-entrar text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={enviando || !usuario || !senha} className={`${classeBotaoEscuro} w-full disabled:bg-neutral-300`}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </Tela>
  );
}
