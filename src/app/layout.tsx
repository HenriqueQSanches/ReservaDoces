import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ReservaProvider } from "@/lib/reserva";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reservas de Natal",
  description: "Garanta a sua reserva de Natal.",
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
