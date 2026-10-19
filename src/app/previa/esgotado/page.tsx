import { notFound } from "next/navigation";
import { Vitrine } from "@/components/Vitrine";

// Só para conferir a vitrine esgotada durante o desenvolvimento; no site publicado não existe.
export default function PreviaEsgotado() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Vitrine esgotado />;
}
