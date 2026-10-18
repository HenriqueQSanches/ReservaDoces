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
      <header className="pb-6">
        <Logo variante={logo} />
      </header>
      <main className="flex-1 pb-6">{children}</main>
      {rodape && (
        <footer className="sticky bottom-0 -mx-4 border-t border-neutral-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {rodape}
        </footer>
      )}
    </div>
  );
}

export const classeBotaoAcao =
  "flex h-12 w-full items-center justify-center rounded-lg bg-acao text-base font-semibold text-white transition active:bg-acao-escuro disabled:bg-neutral-300 disabled:text-neutral-500";
