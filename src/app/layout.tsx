import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ReservaProvider } from "@/lib/reserva";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const titulo = "Reservas de Natal | Nathalia Perissato Brigaderia";
const descricao = "Garanta a sua reserva de Natal.";

export const metadata: Metadata = {
  // A Netlify define URL no build com o endereço do site; a imagem de compartilhamento precisa dele completo
  metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
  title: titulo,
  description: descricao,
  openGraph: {
    title: titulo,
    description: descricao,
    siteName: "Nathalia Perissato Brigaderia",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-neutral-900">
        <ReservaProvider>{children}</ReservaProvider>
      </body>
    </html>
  );
}
