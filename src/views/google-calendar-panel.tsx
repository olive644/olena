import { uiText, useLanguage, uiLocale } from "../i18n/runtime";
import { useGoogleCalendar, type GoogleCalendarEvent } from "../hooks/use-google-calendar";
import { HelenaLoading } from "../components/helena-loading";

function formatGoogleEventWhen(event: GoogleCalendarEvent): string {
  if (event.allDay) return new Date(`${event.start}T00:00:00`).toLocaleDateString(uiLocale());
  return new Date(event.start).toLocaleString(uiLocale(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GoogleCalendarPanel() {
  useLanguage();

  const googleCalendar = useGoogleCalendar();

  return (
    <section className="module-panel" aria-labelledby="google-calendar-title">
      <div className="module-heading">
        <h2 id="google-calendar-title">{uiText(1185)}</h2>
        {googleCalendar.status === "connected" && (
          <button
            className="icon-button"
            type="button"
            onClick={() => void googleCalendar.disconnect()}
          >
            {uiText(1186)}
          </button>
        )}
      </div>
      <p>{uiText(1187)}</p>
      {googleCalendar.status === "checking" && <HelenaLoading label={uiText(1188)} compact />}
      {googleCalendar.status === "disconnected" && (
        <div className="empty-state">
          <p>{uiText(1189)}</p>
          <button className="secondary-button" type="button" onClick={googleCalendar.connect}>
            {uiText(1190)}
          </button>
        </div>
      )}
      {googleCalendar.status === "connected" && (
        <>
          {googleCalendar.error && <p role="alert">{googleCalendar.error}</p>}
          {googleCalendar.events.length === 0 ? (
            <div className="empty-state">
              <p>{uiText(1191)}</p>
            </div>
          ) : (
            <ul className="schedule-list schedule-list--dated">
              {googleCalendar.events.map((event) => (
                <li key={event.id}>
                  <time>{formatGoogleEventWhen(event)}</time>
                  <div>
                    <strong>
                      <a href={event.htmlLink} target="_blank" rel="noreferrer">
                        {event.title}
                      </a>
                    </strong>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
