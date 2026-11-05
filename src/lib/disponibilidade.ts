"use client";

import { useEffect, useState } from "react";
import type { Disponibilidade } from "@/app/api/disponibilidade/route";

// Vagas restantes, lidas do banco quando a vitrine abre.
// Se a consulta falhar, a vitrine segue aberta: quem barra de verdade é a criação do pedido.
export function useDisponibilidade() {
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade | null>(null);

  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/disponibilidade", { signal: controle.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDisponibilidade(d))
      .catch(() => {});
    return () => controle.abort();
  }, []);

  return disponibilidade;
}
