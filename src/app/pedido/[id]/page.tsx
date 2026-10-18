import { Suspense } from "react";
import { Tela } from "@/components/Tela";
import { Concluido } from "./Concluido";

// O número do pedido vem da URL, então fica dentro do Suspense; o resto da tela é estático.
export default function PedidoConcluido() {
  return (
    <Tela logo="lettering">
      <Suspense fallback={null}>
        <Concluido />
      </Suspense>
    </Tela>
  );
}
