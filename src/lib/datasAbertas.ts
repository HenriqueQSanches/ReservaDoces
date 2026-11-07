"use client";

import { useEffect, useState } from "react";
import type { Modalidade } from "@/config/campanha";

// Datas que ainda aceitam reserva (o servidor aplica a antecedência e as escolhas manuais do Luiz)
export function useDatasAbertas() {
  const [datas, setDatas] = useState<Record<Modalidade, string[]> | null>(null);

  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/datas", { signal: controle.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDatas(d))
      .catch(() => {});
    return () => controle.abort();
  }, []);

  return datas;
}
