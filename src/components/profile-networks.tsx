import { recognizeSocialLink, SOCIAL_LABELS } from "../domain/profile-identity";
import { ProfilePaperIcon } from "./profile-editor";
export function ProfileNetworks({ links }: { links: string[] }) {
  return links.map((link) => {
    const social = recognizeSocialLink(link);
    return social ? (
      <a
        key={social.url}
        href={social.url}
        target="_blank"
        rel="noopener noreferrer"
        className="secondary-button"
        aria-label={SOCIAL_LABELS[social.network]}
        title={SOCIAL_LABELS[social.network]}
      >
        <ProfilePaperIcon name={social.network} />
      </a>
    ) : null;
  });
}
