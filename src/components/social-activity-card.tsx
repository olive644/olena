import { useState } from "react";
import { uiText } from "../i18n/runtime";
import { requestSocial, visitSocialProfile } from "../data/profile-social";
import type { SocialActivity, SocialActivitySummary, SocialNotice } from "../domain/profile-social";
import { MATH_COURSES } from "../data/math-courses";

export function activityLabel(activity: SocialActivitySummary) {
  const course = MATH_COURSES.find((item) => item.id === activity.course);
  if (activity.kind === "module")
    return uiText(2734, [
      course?.topics[activity.level ?? -1] ?? uiText(1406),
      course?.title ?? uiText(1406),
    ]);
  const labels = {
    practice: "Avançou em Matemática: {0} respostas praticadas.",
    focus: "Completou {0} minutos de foco.",
    quiz: "Acertou {0} respostas em um questionário.",
    streak: "Alcançou uma sequência de {0} dias de estudo!",
  };
  return uiText(labels[activity.kind], [activity.value]);
}
export function socialNoticeLabel(notice: SocialNotice) {
  return notice.kind === "like"
    ? uiText(2700)
    : notice.kind === "activity" && notice.activity
      ? activityLabel(notice.activity)
      : uiText(1029);
}
export function socialNoticeId(notice: SocialNotice) {
  return `${notice.kind ?? "follow"}:${notice.person.username}:${notice.activity?.id ?? ""}:${notice.at}`;
}
export function SocialActivityCard({
  activity,
  own,
  onUpdated,
}: {
  activity: SocialActivity;
  own: boolean;
  onUpdated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <article className="social-activity-card">
      <button
        type="button"
        className="social-notice-person"
        onClick={() => visitSocialProfile(activity.person.username)}
      >
        <img src={activity.person.photoUrl} width="40" height="40" alt="" draggable={false} />
        <span>
          <strong>{activity.person.name}</strong>
          <small>@{activity.person.username}</small>
        </span>
      </button>
      <p>{activityLabel(activity)}</p>
      <div className="social-activity-reactions">
        <button
          type="button"
          className="secondary-button"
          aria-pressed={activity.liked}
          disabled={own || busy}
          aria-label={uiText(activity.liked ? "Descurtir conquista" : "Curtir conquista")}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await requestSocial({
                action: "like-activity",
                username: activity.person.username,
                activityId: activity.id,
                liked: !activity.liked,
              });
              onUpdated?.();
            } catch {
              setError(uiText(2703));
            } finally {
              setBusy(false);
            }
          }}
        >
          <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
            <path
              fill={activity.liked ? "#e95576" : "currentColor"}
              d="M16 29 3 17 1 9 6 3h7l3 4 3-4h7l5 6-2 8Z"
            />
            <path fill="#ffb4c6" d="m6 5 6 0 3 5-7-2-3 7-2-5Z" />
          </svg>
          {activity.likes.length}
        </button>
        <small>
          {activity.likes.length
            ? uiText(2704, [
                activity.likes
                  .map((person) => person.name)
                  .slice(0, 3)
                  .join(", "),
              ])
            : uiText(2705)}
        </small>
      </div>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
