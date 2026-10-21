import Image from "next/image";

// Logos enviadas pelo Luiz em 20/10/2026 (JPG convertido para PNG com fundo transparente).
// Lettering nas telas 1 e 4, monograma nas telas 2 e 3.
export function Logo({ variante }: { variante: "lettering" | "monograma" }) {
  if (variante === "monograma") {
    return (
      <Image
        src="/marca/monograma.png"
        alt="Nathalia Perissato Brigaderia"
        width={1600}
        height={1600}
        priority
        sizes="64px"
        className="mx-auto size-16"
      />
    );
  }

  return (
    <Image
      src="/marca/lettering.png"
      alt="Nathalia Perissato Brigaderia"
      width={1600}
      height={514}
      priority
      sizes="(min-width: 768px) 320px, 256px"
      className="mx-auto h-auto w-64 md:w-80"
    />
  );
}
