import "./brand-footer.css";

export const BRAND_FOOTER_TEXT = "Todos os direitos Galeria.Oli - OlenaStudy";
export const BRAND_FOOTER_ICON = "/galeria-oli-icon.svg";

// Rodapé da marca: ícone da Galeria.Oli à esquerda do texto de direitos. O ícone é
// decorativo (o texto ao lado já diz tudo), então fica fora da leitura por voz.
export function BrandFooter() {
  return (
    <footer className="brand-footer">
      <img src={BRAND_FOOTER_ICON} alt="" width="30" height="30" />
      <span>{BRAND_FOOTER_TEXT}</span>
    </footer>
  );
}
