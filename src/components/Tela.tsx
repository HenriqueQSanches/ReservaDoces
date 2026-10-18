import { Logo } from "./Logo";

export function Tela({
  logo,
  children,
  rodape,
}: {
  logo: "lettering" | "monograma";
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-8 md:max-w-4xl">
      <header className="pb-8">
        <Logo variante={logo} />
      </header>
      <main className="flex-1 animate-entrar pb-8">{children}</main>
      {rodape && (
        <footer className="sticky bottom-0 -mx-4 animate-subir border-t border-neutral-100 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          {rodape}
        </footer>
      )}
    </div>
  );
}

// Toque: o botão afunda de leve e volta suave
export const classeToque =
  "transition duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-900/15";

export const classeBotaoAcao = `${classeToque} flex h-13 w-full items-center justify-center rounded-xl bg-acao text-base font-semibold text-white shadow-sm shadow-acao/30 active:bg-acao-escuro disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none`;

export const classeBotaoEscuro = `${classeToque} flex h-12 items-center justify-center rounded-xl bg-neutral-900 font-semibold text-white active:bg-neutral-700`;
