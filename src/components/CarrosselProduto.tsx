"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

export function CarrosselProduto({ imagens, nome }: { imagens: string[]; nome: string }) {
  const [refCarrossel, embla] = useEmblaCarousel({ loop: true });
  const [atual, setAtual] = useState(0);

  const aoSelecionar = useCallback(() => {
    if (embla) setAtual(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", aoSelecionar);
    return () => {
      embla.off("select", aoSelecionar);
    };
  }, [embla, aoSelecionar]);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-neutral-100 shadow-sm ring-1 ring-black/5" ref={refCarrossel}>
        <div className="flex">
          {imagens.map((src, i) => (
            <div key={i} className="relative aspect-square min-w-0 flex-[0_0_100%]">
              <Image
                src={src}
                alt={`${nome}, foto ${i + 1}`}
                fill
                sizes="(min-width: 768px) 300px, 100vw"
                className="object-cover"
                // SVG e GIF vão sem otimização (o otimizador não processa SVG e congela GIF)
                unoptimized={/\.(svg|gif)$/i.test(src)}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {imagens.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ver foto ${i + 1}`}
            onClick={() => embla?.scrollTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === atual ? "w-5 bg-neutral-900" : "w-2 bg-neutral-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
