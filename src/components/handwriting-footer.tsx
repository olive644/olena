import { uiText, useLanguage } from "../i18n/runtime";
import type { CloudSyncState } from "../hooks/use-cloud-sync";

type HandwritingFooterProps = {
  cloud: CloudSyncState | undefined;
  draftStatus: string;
  inert: boolean;
};

export function HandwritingFooter({ cloud, draftStatus, inert }: HandwritingFooterProps) {
  useLanguage();

  return (
    <footer className="handwriting-footer" inert={inert}>
      <p>
        <strong>
          {cloud?.authenticated
            ? cloud.status === "synced"
              ? uiText(157)
              : cloud.status === "offline"
                ? uiText(158)
                : cloud.status === "conflict"
                  ? uiText(159)
                  : uiText(160)
            : uiText(draftStatus) || uiText(2052)}
        </strong>
        <span>{cloud?.authenticated ? uiText(161) : uiText(162)}</span>
      </p>
    </footer>
  );
}
