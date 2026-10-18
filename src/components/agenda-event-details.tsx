import { uiText, useLanguage } from "../i18n/runtime";
import { useRef, useState } from "react";
import type { StudyEvent } from "../domain/workspace";
import { PaperDateField, PaperTimeField } from "./agenda-paper-fields";
import { agendaTimeZone } from "../data/agenda-time-zone";
import { RoomStepSlider } from "./local-room-parts";
import { AgendaMetadataField } from "./agenda-metadata-field";
import { AgendaDetailIcon } from "./agenda-detail-icon";
import { AgendaColorPalette } from "./agenda-color-palette";
import { AgendaAttachmentPreview } from "./agenda-attachment-preview";
import { HelenaLoading } from "./helena-loading";
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
  color: string;
};
export function initialEventDetails(date: string, event?: StudyEvent): EventDetailsDraft {
  const end = event ? eventEnd(event, date) : { date, time: "18:25" };
  return {
    endDate: end.date,
    endTime: end.time,
    allDay: event?.allDay ?? false,
    timeZone: event?.timeZone || agendaTimeZone(),
    description: event?.description ?? "",
    location: event?.location ?? "",
    links: event?.links?.join("\n") ?? "",
    guests: event?.guests?.join(", ") ?? "",
    reminders: event?.reminders?.length ? event.reminders : [0],
    attachments: event?.attachments ?? [],
    interval: event?.recurrenceInterval ?? 1,
    weekdays: event?.recurrenceDays ?? [],
    scope: "all",
    occurrence: date,
    color: event?.color ?? (event?.kind === "study" ? "#7c3aed" : "#facc15"),
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
  useLanguage();

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const busy = useRef(false),
    input = useRef<HTMLInputElement>(null);
  const change = <K extends keyof EventDetailsDraft>(key: K, next: EventDetailsDraft[K]) =>
    onChange({ ...value, [key]: next });
  async function upload(files: readonly File[]) {
    if (busy.current || !files.length) return;
    busy.current = true;
    setUploading(true);
    onBusy(true);
    setError("");
    let count = value.attachments.length;
    try {
      for (const file of files) {
        if (count >= 3) {
          setError(uiText(26));
          break;
        }
        if (
          file.size > 300000 ||
          !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type)
        ) {
          setError(uiText(27));
          continue;
        }
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error(uiText(1579)));
          reader.readAsDataURL(file);
        });
        onAttachment({ id: crypto.randomUUID(), name: file.name, mime: file.type, data });
        count++;
      }
    } catch {
      setError(uiText(28));
    } finally {
      busy.current = false;
      setUploading(false);
      onBusy(false);
    }
  }
  return (
    <div className="agenda-event-details">
      {allowAllDay && (
        <label className="agenda-choice-check">
          <input
            type="checkbox"
            checked={value.allDay}
            onChange={(event) => change("allDay", event.target.checked)}
          />{" "}
          {uiText(29)}
        </label>
      )}
      <div className="field-row">
        <PaperDateField
          label={uiText(30)}
          min={date}
          value={value.endDate}
          onChange={(next) => change("endDate", next)}
        />
        {!value.allDay && (
          <PaperTimeField
            label={uiText(31)}
            value={value.endTime}
            onChange={(next) => change("endTime", next)}
          />
        )}
      </div>
      {repeating !== "none" && (
        <>
          <label className="field">
            {uiText(32)}
            <input
              type="number"
              min={1}
              max={365}
              value={value.interval}
              onChange={(event) => change("interval", Number(event.target.value))}
            />
            <small>{uiText(recurrenceLabels[repeating as keyof typeof recurrenceLabels])}</small>
          </label>
          {repeating === "weekly" && (
            <div className="agenda-weekday-picks" role="group" aria-label={uiText(33)}>
              {[
                uiText(1580),
                uiText(1581),
                uiText(1582),
                uiText(1583),
                uiText(1584),
                uiText(1585),
                uiText(34),
              ].map((day, index) => (
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
        {uiText(35)}
        <textarea
          maxLength={4000}
          rows={3}
          value={value.description}
          onChange={(event) => change("description", event.target.value)}
        />
      </label>
      <AgendaColorPalette value={value.color} onChange={(color) => change("color", color)} />
      <div className="agenda-metadata-options">
        <AgendaMetadataField
          name="location"
          label={uiText(36)}
          value={value.location}
          onChange={(next) => change("location", next)}
        />
        <AgendaMetadataField
          name="links"
          label={uiText(37)}
          value={value.links}
          onChange={(next) => change("links", next)}
        />
        <AgendaMetadataField
          name="guests"
          label={uiText(38)}
          value={value.guests}
          onChange={(next) => change("guests", next)}
        />
      </div>
      <div className="agenda-reminder-slider">
        <RoomStepSlider
          label={uiText(39)}
          value={Math.max(0, ...value.reminders)}
          steps={REMINDER_STEPS}
          formatValue={(minutes) =>
            minutes === 0 ? uiText(1586) : minutes === 1440 ? "1 dia" : `${minutes} min`
          }
          onCommit={(minutes) => change("reminders", minutes === 0 ? [0] : [0, minutes])}
        />
      </div>
      <div
        className={`agenda-attachment-drop${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(Array.from(event.dataTransfer.files));
        }}
      >
        <AgendaDetailIcon name="attachment" />
        <strong>{uiText(40)}</strong>
        <p>{uiText(41)}</p>
        <button
          type="button"
          className="secondary-button"
          disabled={uploading || value.attachments.length >= 3}
          onClick={() => input.current?.click()}
        >
          {uiText(42)}
        </button>
        <input
          ref={input}
          className="agenda-attachment-input"
          aria-label={uiText(40)}
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp"
          disabled={uploading || value.attachments.length >= 3}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void upload(files);
          }}
        />
        <small>{uiText(43)}</small>
      </div>
      {value.attachments.map((asset) => (
        <div className="agenda-attachment" key={asset.id}>
          <AgendaAttachmentPreview attachments={[asset]} />
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
            aria-label={uiText(1587, [asset.name])}
          >
            {uiText(44)}
          </button>
        </div>
      ))}
      {uploading && <HelenaLoading label={uiText(45)} compact />}
      {error && <p role="alert">{uiText(error)}</p>}
    </div>
  );
}
const REMINDER_STEPS = [0, 5, 15, 30, 60, 1440] as const;
