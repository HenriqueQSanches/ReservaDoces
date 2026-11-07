import { encerrarSessao } from "@/lib/admin";

export async function POST() {
  await encerrarSessao();
  return new Response(null, { status: 204 });
}
