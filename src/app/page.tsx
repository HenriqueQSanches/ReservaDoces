import { campanha } from "@/config/campanha";
import { Vitrine } from "@/components/Vitrine";

export default function Inicio() {
  return <Vitrine esgotado={campanha.esgotado} />;
}
