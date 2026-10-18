import { uiText, useLanguage } from "../i18n/runtime";
import "./brand-footer.css";

export const BRAND_FOOTER_TEXT = uiText(1635);
export const BRAND_FOOTER_ICON = "/galeria-oli-icon.svg";

// Rodapé da marca: ícone da Galeria.Oli à esquerda do texto de direitos. O ícone é
// decorativo (o texto ao lado já diz tudo), então fica fora da leitura por voz.
export function BrandFooter() {
  useLanguage();

  return (
    <footer className="brand-footer">
      <img src={BRAND_FOOTER_ICON} alt="" width="30" height="30" />
      <span>{uiText(BRAND_FOOTER_TEXT)}</span>
    </footer>
  );
}
