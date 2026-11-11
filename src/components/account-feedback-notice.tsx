import { uiText } from "../i18n/runtime";
import { PaperCloseGlyph } from "./paper-close-icon";
import "./account-feedback-notice.css";

export function AccountFeedbackNotice({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  if (!message) return null;
  return (
    <aside className="account-access__notice" role="status" aria-live="polite">
      <button type="button" aria-label={uiText("Fechar aviso")} onClick={onClose}>
        <PaperCloseGlyph />
      </button>
      <p>{message}</p>
    </aside>
  );
}
