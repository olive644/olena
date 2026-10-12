import { useState } from "react";
import type { StudyEvent } from "../domain/workspace";
import { PaperChoice, PaperDateField, PaperTimeField } from "./agenda-paper-fields";
import { PaperCheckIcon } from "./paper-check-icon";
import { eventEnd, recurrenceLabels, type EventScope } from "../domain/agenda-calendar";

export type EventDetailsDraft = {
  endDate: string;
  endTime: string;
  allDay: boolean;
  timeZone: string;
  description: string;
  location: string;
  links: string;
  guests: string;
  reminders: number[];
  attachments: NonNullable<StudyEvent["attachments"]>;
  interval: number;
  weekdays: number[];
  scope: EventScope;
  occurrence: string;
};
export function initialEventDetails(date: string, event?: StudyEvent): EventDetailsDraft {
  const end = event ? eventEnd(event, date) : { date, time: "18:25" };
  return {
    endDate: end.date,
    endTime: end.time,
    allDay: event?.allDay ?? false,
    timeZone: event?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    description: event?.description ?? "",
    location: event?.location ?? "",
    links: event?.links?.join("\n") ?? "",
    guests: event?.guests?.join(", ") ?? "",
    reminders: event?.reminders ?? [],
    attachments: event?.attachments ?? [],
    interval: event?.recurrenceInterval ?? 1,
    weekdays: event?.recurrenceDays ?? [],
    scope: "all",
    occurrence: date,
  };
}
export function AgendaEventDetails({
  value,
  date,
  repeating,
  onChange,
  onBusy,
  onAttachment,
  allowAllDay = true,
}: {
  value: EventDetailsDraft;
  date: string;
  repeating: string;
  onChange: (next: EventDetailsDraft) => void;
  onBusy: (busy: boolean) => void;
  onAttachment: (asset: EventDetailsDraft["attachments"][number]) => void;
  allowAllDay?: boolean;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const change = <K extends keyof EventDetailsDraft>(key: K, next: EventDetailsDraft[K]) =>
    onChange({ ...value, [key]: next });
  const zones = [
    ...new Set([
      value.timeZone,
      "America/Sao_Paulo",
      "America/Manaus",
      "America/Rio_Branco",
      "America/Noronha",
      "Europe/Lisbon",
      "UTC",
      ...Intl.supportedValuesOf("timeZone"),
    ]),
  ];
  return (
    <div className="agenda-event-details">
      {allowAllDay && (
        <label className="agenda-choice-check">
          <input
            type="checkbox"
            checked={value.allDay}
            onChange={(event) => change("allDay", event.target.checked)}
          />{" "}
          Dia inteiro
        </label>
      )}
      <div className="field-row">
        <PaperDateField
          label="Data de término"
          min={date}
          value={value.endDate}
          onChange={(next) => change("endDate", next)}
        />
        {!value.allDay && (
          <PaperTimeField
            label="Término"
            value={value.endTime}
            onChange={(next) => change("endTime", next)}
          />
        )}
      </div>
      {!value.allDay && (
        <PaperChoice
          label="Fuso horário"
          value={value.timeZone}
          options={zones.map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }))}
          onChange={(next) => change("timeZone", next)}
        />
      )}
      {repeating !== "none" && (
        <>
          <label className="field">
            Repetir a cada
            <input
              type="number"
              min={1}
              max={365}
              value={value.interval}
              onChange={(event) => change("interval", Number(event.target.value))}
            />
            <small>{recurrenceLabels[repeating as keyof typeof recurrenceLabels]}</small>
          </label>
          {repeating === "weekly" && (
            <div className="agenda-weekday-picks" role="group" aria-label="Dias da repetição">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, index) => (
                <button
                  key={day}
                  type="button"
                  className={value.weekdays.includes(index) ? "primary-button" : "secondary-button"}
                  aria-pressed={value.weekdays.includes(index)}
                  onClick={() =>
                    change(
                      "weekdays",
                      value.weekdays.includes(index)
                        ? value.weekdays.filter((item) => item !== index)
                        : [...value.weekdays, index],
                    )
                  }
                >
                  {day}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <label className="field">
        Descrição
        <textarea
          maxLength={4000}
          rows={3}
          value={value.description}
          onChange={(event) => change("description", event.target.value)}
        />
      </label>
      <label className="field">
        Local
        <input
          maxLength={300}
          value={value.location}
          onChange={(event) => change("location", event.target.value)}
        />
      </label>
      <label className="field">
        Links, um por linha
        <textarea
          rows={2}
          value={value.links}
          onChange={(event) => change("links", event.target.value)}
          placeholder="https://"
        />
      </label>
      <label className="field">
        Participantes, e-mails separados por vírgula
        <input
          maxLength={1000}
          value={value.guests}
          onChange={(event) => change("guests", event.target.value)}
        />
        <small>
          Guardados no evento e incluídos no .ics. Nenhum convite é enviado automaticamente.
        </small>
      </label>
      <fieldset className="agenda-reminder-picks">
        <legend>Lembrar antes</legend>
        {[0, 5, 15, 30, 60, 1440].map((minutes) => (
          <button
            key={minutes}
            type="button"
            aria-pressed={value.reminders.includes(minutes)}
            className={value.reminders.includes(minutes) ? "primary-button" : "secondary-button"}
            onClick={() =>
              change(
                "reminders",
                value.reminders.includes(minutes)
                  ? value.reminders.filter((item) => item !== minutes)
                  : [...value.reminders, minutes].slice(-5),
              )
            }
          >
            {value.reminders.includes(minutes) && <PaperCheckIcon />}
            {minutes === 0 ? "Na hora" : minutes === 1440 ? "1 dia" : `${minutes} min`}
          </button>
        ))}
        <small>Alertas enquanto o aplicativo estiver aberto, com permissão do navegador.</small>
      </fieldset>
      <label className="field">
        Anexos
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          disabled={uploading || value.attachments.length >= 3}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (
              file.size > 300000 ||
              !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type)
            ) {
              setError("Escolha imagem ou PDF de até 300 KB. Máximo de 3 anexos.");
              return;
            }
            setUploading(true);
            onBusy(true);
            setError("");
            try {
              const data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error("Falha na leitura"));
                reader.readAsDataURL(file);
              });
              onAttachment({ id: crypto.randomUUID(), name: file.name, mime: file.type, data });
            } catch {
              setError("Não foi possível ler o arquivo.");
            } finally {
              setUploading(false);
              onBusy(false);
            }
          }}
        />
        <small>Anexos entram no armazenamento da sua conta. Não são exportados no .ics.</small>
      </label>
      {value.attachments.map((asset) => (
        <div className="agenda-attachment" key={asset.id}>
          <span>{asset.name}</span>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              change(
                "attachments",
                value.attachments.filter((item) => item.id !== asset.id),
              )
            }
            aria-label={`Remover anexo ${asset.name}`}
          >
            Remover
          </button>
        </div>
      ))}
      {uploading && <p role="status">Lendo anexo...</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
