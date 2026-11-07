import type { Metadata } from "next";

// Painel do Luiz: fora dos buscadores
export const metadata: Metadata = {
  title: "Painel | Nathalia Perissato Brigaderia",
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return children;
}
