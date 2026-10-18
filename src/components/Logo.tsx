// Espaço reservado até chegarem os SVGs do Luiz (lettering nas telas 1 e 4, monograma nas telas 2 e 3).
export function Logo({ variante }: { variante: "lettering" | "monograma" }) {
  const tamanho = variante === "monograma" ? "size-12" : "h-10 w-40";
  return (
    <div
      aria-hidden
      className={`mx-auto flex ${tamanho} items-center justify-center rounded border border-dashed border-neutral-300 text-[10px] uppercase tracking-wide text-neutral-400`}
    >
      logo
    </div>
  );
}
