import { uiText, useLanguage } from "../i18n/runtime";
import { PaperRecoveryPage } from "../components/paper-recovery-page";

export default function NotFoundView() {
  useLanguage();
  return (
    <PaperRecoveryPage
      notFound
      title={uiText("Esta página saiu do mapa.")}
      description={uiText(
        "Não encontramos este endereço. Confira o link ou volte ao seu espaço para continuar.",
      )}
      homeLabel={uiText("Voltar ao início")}
    />
  );
}
