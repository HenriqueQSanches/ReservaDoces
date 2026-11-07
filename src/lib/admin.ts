import "server-only";
import { cookies } from "next/headers";
import { bancoDeDados } from "@/lib/supabase";

// Login do painel do Luiz. Senha guardada como PBKDF2-SHA256 (Web Crypto, roda no Node e na Cloudflare).
// Sessão: cookie com { id, versão, validade } assinado com HMAC; trocar a senha muda a versão e derruba as sessões.

const COOKIE = "admin_sessao";
const DURACAO_HORAS = 12;
const ITERACOES = 100_000; // máximo aceito pelo PBKDF2 da Cloudflare
const MAX_FALHAS = 5;
const BLOQUEIO_MINUTOS = 15;

const codificador = new TextEncoder();

const paraBase64 = (bytes: ArrayBuffer | Uint8Array) =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString("base64url");
const deBase64 = (texto: string) => Uint8Array.from(Buffer.from(texto, "base64url"));

async function derivar(senha: string, sal: Uint8Array<ArrayBuffer>, iteracoes: number) {
  const chave = await crypto.subtle.importKey("raw", codificador.encode(senha), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iteracoes }, chave, 256);
}

function iguais(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a[i] ^ b[i];
  return diferenca === 0;
}

export async function gerarHash(senha: string) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(senha, sal, ITERACOES);
  return `pbkdf2$${ITERACOES}$${paraBase64(sal)}$${paraBase64(hash)}`;
}

async function conferirHash(senha: string, guardado: string) {
  const [tipo, iteracoes, sal, hash] = guardado.split("$");
  if (tipo !== "pbkdf2" || !iteracoes || !sal || !hash) return false;
  const calculado = new Uint8Array(await derivar(senha, deBase64(sal), Number(iteracoes)));
  return iguais(calculado, deBase64(hash));
}

export function senhaForte(senha: string) {
  return senha.length >= 8 && /[A-Za-z]/.test(senha) && /\d/.test(senha);
}

// ---------- sessão ----------

async function chaveSessao() {
  const segredo = process.env.ADMIN_SESSION_SECRET;
  if (!segredo || segredo.length < 32) throw new Error("ADMIN_SESSION_SECRET precisa estar configurado");
  return crypto.subtle.importKey("raw", codificador.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

type DadosSessao = { id: string; v: number; exp: number };

async function assinar(dados: DadosSessao) {
  const corpo = paraBase64(codificador.encode(JSON.stringify(dados)));
  const assinatura = await crypto.subtle.sign("HMAC", await chaveSessao(), codificador.encode(corpo));
  return `${corpo}.${paraBase64(assinatura)}`;
}

async function lerAssinado(valor: string): Promise<DadosSessao | null> {
  const [corpo, assinatura] = valor.split(".");
  if (!corpo || !assinatura) return null;
  const valida = await crypto.subtle.verify("HMAC", await chaveSessao(), deBase64(assinatura), codificador.encode(corpo));
  if (!valida) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString()) as DadosSessao;
    return dados.exp > Date.now() ? dados : null;
  } catch {
    return null;
  }
}

function cookieSeguro() {
  return (process.env.URL ?? "").startsWith("https://");
}

async function gravarSessao(id: string, versao: number) {
  const valor = await assinar({ id, v: versao, exp: Date.now() + DURACAO_HORAS * 3600_000 });
  (await cookies()).set(COOKIE, valor, {
    httpOnly: true,
    secure: cookieSeguro(),
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_HORAS * 3600,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export type Admin = { id: string; usuario: string; precisaTrocar: boolean };

// Admin logado ou null. Confere assinatura, validade e se a senha não foi trocada depois do login.
export async function adminLogado(): Promise<Admin | null> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return null;
  const sessao = await lerAssinado(valor);
  if (!sessao) return null;

  const { data } = await bancoDeDados()
    .from("admins")
    .select("id, usuario, precisa_trocar, sessao_versao")
    .eq("id", sessao.id)
    .maybeSingle();
  if (!data || data.sessao_versao !== sessao.v) return null;
  return { id: data.id, usuario: data.usuario, precisaTrocar: data.precisa_trocar };
}

// Para as rotas do painel: só passa se estiver logado e já tiver trocado a senha inicial.
export async function exigirAdmin() {
  const admin = await adminLogado();
  if (!admin) return { erro: Response.json({ erro: "nao_logado" }, { status: 401 }) } as const;
  if (admin.precisaTrocar) return { erro: Response.json({ erro: "trocar_senha" }, { status: 403 }) } as const;
  return { admin } as const;
}

// ---------- login e troca de senha ----------

export type ResultadoLogin = { ok: true; precisaTrocar: boolean } | { ok: false; motivo: "invalido" | "bloqueado" };

export async function entrar(usuario: string, senha: string): Promise<ResultadoLogin> {
  const banco = bancoDeDados();
  const { data: admin } = await banco
    .from("admins")
    .select("id, senha_hash, precisa_trocar, sessao_versao, falhas, bloqueado_ate")
    .eq("usuario", usuario.trim().toLowerCase())
    .maybeSingle();

  if (!admin) {
    // Mesmo trabalho de quando o usuário existe, para não dar pista de quais usuários existem
    await conferirHash(senha, `pbkdf2$${ITERACOES}$${paraBase64(new Uint8Array(16))}$x`);
    return { ok: false, motivo: "invalido" };
  }
  if (admin.bloqueado_ate && new Date(admin.bloqueado_ate) > new Date()) return { ok: false, motivo: "bloqueado" };

  if (!(await conferirHash(senha, admin.senha_hash))) {
    const falhas = admin.falhas + 1;
    await banco
      .from("admins")
      .update({
        falhas: falhas >= MAX_FALHAS ? 0 : falhas,
        bloqueado_ate: falhas >= MAX_FALHAS ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60_000).toISOString() : null,
      })
      .eq("id", admin.id);
    return { ok: false, motivo: falhas >= MAX_FALHAS ? "bloqueado" : "invalido" };
  }

  await banco.from("admins").update({ falhas: 0, bloqueado_ate: null }).eq("id", admin.id);
  await gravarSessao(admin.id, admin.sessao_versao);
  return { ok: true, precisaTrocar: admin.precisa_trocar };
}

export async function trocarSenha(admin: Admin, atual: string, nova: string) {
  const banco = bancoDeDados();
  const { data } = await banco.from("admins").select("senha_hash, sessao_versao").eq("id", admin.id).single();
  if (!data || !(await conferirHash(atual, data.senha_hash))) return { ok: false as const, motivo: "senha_atual" };
  if (!senhaForte(nova)) return { ok: false as const, motivo: "fraca" };
  if (nova === atual) return { ok: false as const, motivo: "igual" };

  const versao = data.sessao_versao + 1;
  await banco
    .from("admins")
    .update({ senha_hash: await gerarHash(nova), precisa_trocar: false, sessao_versao: versao })
    .eq("id", admin.id);
  await gravarSessao(admin.id, versao);
  return { ok: true as const };
}
