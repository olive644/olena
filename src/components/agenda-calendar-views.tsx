import { useRef, useState, type ReactNode } from "react";
import type { StudyEvent, StudyTask } from "../domain/workspace";
import { addDays, displayEventsOn, eventSpan } from "../domain/agenda-calendar";
import { layoutAgendaDay } from "../domain/agenda-grid-layout";
import { weekDates } from "../domain/agenda";
import { PaperArrow } from "./paper-arrow";
import { PaperCheckIcon } from "./paper-check-icon";
import { AgendaAttachmentPreview } from "./agenda-attachment-preview";

export type CalendarView = "month" | "week" | "day" | "list";
export function AgendaCalendarViews({
  view,
  timeZone,
  selected,
  events,
  tasks,
  onSelect,
  onCreate,
  onEdit,
  onMove,
  onResize,
  renderEvent,
  renderTask,
}: {
  view: CalendarView;
  timeZone: string;
  selected: string;
  events: StudyEvent[];
  tasks: StudyTask[];
  onSelect: (date: string) => void;
  onCreate: (date: string, time: string) => void;
  onEdit: (event: StudyEvent, date: string) => void;
  onMove: (event: StudyEvent, from: string, to: string, time: string) => void;
  onResize: (event: StudyEvent, date: string, minutes: number) => void;
  renderEvent: (event: StudyEvent, date: string) => ReactNode;
  renderTask: (task: StudyTask) => ReactNode;
}) {
  const days =
    view === "week"
      ? weekDates(selected)
      : view === "list"
        ? Array.from({ length: 30 }, (_, index) => addDays(selected, index))
        : [selected];
  const root = useRef<HTMLDivElement>(null);
  const suppressGestureClick = useRef(false);
  const [moving, setMoving] = useState<{ id: string; date: string } | null>(null);
  const gesture = useRef<{
    pointer: number;
    event: StudyEvent;
    date: string;
    resize: boolean;
    y: number;
    x: number;
    height: number;
  } | null>(null);
  const [hint, setHint] = useState("");
  const eventsFor = (date: string) => displayEventsOn(events, date, timeZone);
  const slotAt = (x: number, y: number) => {
    const column = document.elementFromPoint(x, y)?.closest<HTMLElement>(".agenda-time-column");
    const bounds = column?.querySelector(".agenda-hour-slots")?.getBoundingClientRect();
    if (!column || !bounds || y < bounds.top || y > bounds.bottom) return null;
    const minutes = Math.min(1425, Math.max(0, Math.floor(((y - bounds.top) / 48) * 4) * 15));
    return {
      date: column.dataset["columnDate"]!,
      time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    };
  };
  const dated = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  if (view === "list")
    return (
      <div className="agenda-schedule-list" aria-label="Próximos 30 dias">
        {days.map((date) => {
          const dayEvents = eventsFor(date),
            dayTasks = tasks.filter((task) => task.dueDate === date);
          return dayEvents.length || dayTasks.length ? (
            <section key={date}>
              <button className="text-button" type="button" onClick={() => onSelect(date)}>
                {dated(date)}
              </button>
              {dayEvents.map((event) => renderEvent(event, date))}
              {dayTasks.map(renderTask)}
            </section>
          ) : null;
        })}
        {!days.some(
          (date) => eventsFor(date).length || tasks.some((task) => task.dueDate === date),
        ) && <p>Nenhum item corresponde aos filtros nos próximos 30 dias.</p>}
      </div>
    );
  return (
    <div
      ref={root}
      className="agenda-time-view"
      aria-label={view === "week" ? "Grade semanal" : "Grade do dia"}
      onKeyDown={(key) => {
        if (key.key === "Escape") {
          setMoving(null);
          gesture.current = null;
          setHint("");
        }
      }}
      onPointerMove={(pointer) => {
        const active = gesture.current;
        if (!active || active.pointer !== pointer.pointerId) return;
        const target = slotAt(pointer.clientX, pointer.clientY);
        if (active.resize)
          setHint(
            `Duração: ${Math.max(15, Math.round((((active.height + pointer.clientY - active.y) / 48) * 60) / 15) * 15)} min`,
          );
        else if (target) setHint(`${dated(target.date)} às ${target.time}`);
      }}
      onPointerUp={(pointer) => {
        const active = gesture.current;
        gesture.current = null;
        if (!active || active.pointer !== pointer.pointerId) return;
        if (Math.hypot(pointer.clientY - active.y, pointer.clientX - active.x) <= 6) return;
        suppressGestureClick.current = true;
        if (active.resize)
          onResize(
            active.event,
            active.date,
            Math.max(
              15,
              Math.min(
                1440,
                Math.round((((active.height + pointer.clientY - active.y) / 48) * 60) / 15) * 15,
              ),
            ),
          );
        else {
          const target = slotAt(pointer.clientX, pointer.clientY);
          if (target) onMove(active.event, active.date, target.date, target.time);
        }
        setHint("");
      }}
      onPointerCancel={() => {
        gesture.current = null;
        setHint("");
      }}
    >
      <p className="agenda-time-hint" role="status">
        {hint ||
          `Horários da conta (${timeZone.replace(/_/g, " ")}). Arraste o bloco ou use os controles para mover e editar.`}
      </p>
      <div className="agenda-time-scroll">
        <div
          className="agenda-time-columns-grid"
          style={{
            gridTemplateColumns: `44px repeat(${days.length}, minmax(${view === "day" ? 200 : 90}px, 1fr))`,
          }}
        >
          <div className="agenda-hour-axis">
            <span>Hora</span>
            {Array.from({ length: 24 }, (_, hour) => (
              <small key={hour} style={{ top: 88 + hour * 48 }}>
                {String(hour).padStart(2, "0")}:00
              </small>
            ))}
          </div>
          {days.map((date) => {
            const all = eventsFor(date),
              timed = all.filter((event) => !event.allDay);
            return (
              <div key={date} className="agenda-time-column" data-column-date={date}>
                <button
                  type="button"
                  className={date === selected ? "primary-button" : "secondary-button"}
                  onClick={() => onSelect(date)}
                >
                  {dated(date)}
                </button>
                <div className="agenda-all-day-strip">
                  {tasks
                    .filter((task) => task.dueDate === date)
                    .map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className="secondary-button"
                        aria-label={`Ver tarefa ${task.title}`}
                        onClick={() => onSelect(date)}
                      >
                        {task.completed && <PaperCheckIcon />}
                        {task.title}
                      </button>
                    ))}
                  {all
                    .filter((event) => event.allDay)
                    .map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className="secondary-button"
                        onClick={() => onEdit(event, event.displayOccurrence)}
                      >
                        {event.title}
                        <AgendaAttachmentPreview attachments={event.attachments} compact />
                      </button>
                    ))}
                </div>
                <div className="agenda-hour-slots">
                  {Array.from({ length: 24 }, (_, hour) => {
                    const time = `${String(hour).padStart(2, "0")}:00`;
                    return (
                      <button
                        key={hour}
                        className="agenda-time-slot"
                        type="button"
                        data-slot-date={date}
                        data-slot-time={time}
                        aria-label={`Planejar ${dated(date)} às ${time}`}
                        onClick={() => {
                          if (moving) {
                            const event = events.find((item) => item.id === moving.id);
                            if (event) onMove(event, moving.date, date, time);
                            setMoving(null);
                          } else onCreate(date, time);
                        }}
                      />
                    );
                  })}
                  {layoutAgendaDay(timed, date).map(
                    (
                      {
                        event,
                        occurrence: startDate,
                        start: startMinute,
                        finish: endMinute,
                        height: drawnHeight,
                        lane,
                        lanes,
                      },
                      index,
                    ) => {
                      const height = ((endMinute - startMinute) / 60) * 48;
                      const width = 100 / lanes;
                      return (
                        <article
                          className={`agenda-time-block agenda-time-block--${event.kind ?? "appointment"}`}
                          key={`${event.id}:${index}`}
                          style={{
                            top: (startMinute / 60) * 48,
                            height: drawnHeight,
                            width: `${width}%`,
                            left: `${lane * width}%`,
                          }}
                        >
                          <button
                            type="button"
                            className="agenda-block-title"
                            onClick={() => {
                              if (suppressGestureClick.current) {
                                suppressGestureClick.current = false;
                                return;
                              }
                              onEdit(event, startDate);
                            }}
                            onPointerDown={(pointer) => {
                              if (pointer.button !== 0) return;
                              pointer.currentTarget.setPointerCapture(pointer.pointerId);
                              gesture.current = {
                                pointer: pointer.pointerId,
                                event,
                                date: startDate,
                                resize: false,
                                y: pointer.clientY,
                                x: pointer.clientX,
                                height,
                              };
                            }}
                            title={`${event.title}, ${event.timeZone ?? "fuso do dispositivo"}`}
                          >
                            <strong>{event.title}</strong>
                            <AgendaAttachmentPreview attachments={event.attachments} compact />
                            <small>
                              {event.time} ·{" "}
                              {event.timeZone?.split("/").at(-1)?.replace(/_/g, " ") ?? "Local"}
                            </small>
                          </button>
                          <div className="agenda-block-actions">
                            <button
                              className="agenda-block-move"
                              type="button"
                              aria-label={`Mover ${event.title}`}
                              aria-pressed={moving?.id === event.id}
                              onClick={() => {
                                if (suppressGestureClick.current) {
                                  suppressGestureClick.current = false;
                                  return;
                                }
                                setMoving({ id: event.id, date: startDate });
                                setHint("Escolha o novo horário na grade. Escape cancela.");
                              }}
                              onKeyDown={(key) => {
                                if (key.key === "Escape") {
                                  setMoving(null);
                                  setHint("");
                                }
                              }}
                              onPointerDown={(pointer) => {
                                if (pointer.button !== 0) return;
                                pointer.currentTarget.setPointerCapture(pointer.pointerId);
                                gesture.current = {
                                  pointer: pointer.pointerId,
                                  event,
                                  date: startDate,
                                  resize: false,
                                  y: pointer.clientY,
                                  x: pointer.clientX,
                                  height,
                                };
                              }}
                            >
                              Mover <PaperArrow />
                            </button>
                            {eventSpan(event) === 0 && (
                              <button
                                className="agenda-block-resize"
                                type="button"
                                aria-label={`Ajustar duração de ${event.title}`}
                                onClick={() => {
                                  if (suppressGestureClick.current) {
                                    suppressGestureClick.current = false;
                                    return;
                                  }
                                  onEdit(event, startDate);
                                }}
                                onPointerDown={(pointer) => {
                                  if (pointer.button !== 0) return;
                                  pointer.currentTarget.setPointerCapture(pointer.pointerId);
                                  gesture.current = {
                                    pointer: pointer.pointerId,
                                    event,
                                    date: startDate,
                                    resize: true,
                                    y: pointer.clientY,
                                    x: pointer.clientX,
                                    height,
                                  };
                                }}
                              />
                            )}
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
