"use client";

import { useEffect, useState } from "react";
import type { VagasPorData } from "@/lib/vagas";

// Datas que ainda aceitam reserva, com quanto cabe de cada produto em cada uma.
// O servidor aplica o fechamento automático, as escolhas manuais do Luiz e os limites.
export function useDatasAbertas() {
  const [datas, setDatas] = useState<VagasPorData | null>(null);

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
