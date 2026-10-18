const moedaBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function moeda(centavos: number) {
  return moedaBRL.format(centavos / 100);
}

const diaSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Recebe "AAAA-MM-DD" e devolve "ter, 22/12". Sem Date com fuso para não virar o dia.
export function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const semana = diaSemana[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${semana}, ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

export function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

export function mascaraWhatsapp(valor: string) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function mascaraCep(valor: string) {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function linkWhatsapp(numero: string, mensagem: string) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
