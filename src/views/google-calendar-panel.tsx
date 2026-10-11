import { useGoogleCalendar, type GoogleCalendarEvent } from "../hooks/use-google-calendar";
import { HelenaLoading } from "../components/helena-loading";

function formatGoogleEventWhen(event: GoogleCalendarEvent): string {
  if (event.allDay) return new Date(`${event.start}T00:00:00`).toLocaleDateString("pt-BR");
  return new Date(event.start).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GoogleCalendarPanel() {
  const googleCalendar = useGoogleCalendar();

  return (
    <section className="module-panel" aria-labelledby="google-calendar-title">
      <div className="module-heading">
        <h2 id="google-calendar-title">Google Agenda</h2>
        {googleCalendar.status === "connected" && (
          <button
            className="icon-button"
            type="button"
            onClick={() => void googleCalendar.disconnect()}
          >
            Desconectar
          </button>
        )}
      </div>
      <p>
        Eventos do Google são somente leitura aqui. Abra o evento no Google para alterar. Eles não
        são copiados para sua agenda local.
      </p>
      {googleCalendar.status === "checking" && (
        <HelenaLoading label="Verificando conexão…" compact />
      )}
      {googleCalendar.status === "disconnected" && (
        <div className="empty-state">
          <p>Conecte seu Google Agenda para ver seus próximos compromissos aqui.</p>
          <button className="secondary-button" type="button" onClick={googleCalendar.connect}>
            Conectar Google Agenda
          </button>
        </div>
      )}
      {googleCalendar.status === "connected" && (
        <>
          {googleCalendar.error && <p role="alert">{googleCalendar.error}</p>}
          {googleCalendar.events.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum evento nos próximos 14 dias.</p>
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
