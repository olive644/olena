import { useEffect, useRef, useState } from "react";
import type { LocalRoomParticipant } from "../domain/local-room";
import { playRoomFeedbackSound, prepareRoomFeedbackSound } from "../data/room-feedback-sound";
import { isMotionReduced } from "../data/accessibility-preferences";
import { RoomSocialIcon } from "./room-social-icon";

type PresenceEvent = { id: string; name: string; entering: boolean };

/** Uma única observação por sala, compartilhada por todas as modalidades e fases. */
export function RoomPresenceEffects({
  code,
  participants,
}: {
  code: string;
  participants: readonly LocalRoomParticipant[];
}) {
  const previous = useRef({ code, participants });
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    },
    [],
  );
  useEffect(() => {
    const before = previous.current;
    previous.current = { code, participants };
    if (before.code !== code) return;
    const changes: PresenceEvent[] = [];
    for (const person of participants) {
      const old = before.participants.find((p) => p.id === person.id);
      if (!old || (old.online === false && person.online !== false))
        changes.push({ id: `${person.id}:in`, name: person.displayName, entering: true });
      else if (old.online !== false && person.online === false)
        changes.push({ id: `${person.id}:out`, name: person.displayName, entering: false });
    }
    for (const person of before.participants) {
      if (!participants.some((p) => p.id === person.id) && person.online !== false)
        changes.push({ id: `${person.id}:out`, name: person.displayName, entering: false });
    }
    if (!changes.length) return;
    for (const timer of timers.current) window.clearTimeout(timer);
    const show = window.setTimeout(() => {
      setEvents(changes);
      if (!isMotionReduced())
        playRoomFeedbackSound(
          changes.some((p) => p.entering),
          prepareRoomFeedbackSound(),
        );
    }, 0);
    const clear = window.setTimeout(() => setEvents([]), 1800);
    timers.current = [show, clear];
  }, [code, participants]);
  return (
    <div className="room-presence-events" role="status" aria-live="polite" aria-atomic="true">
      {events.map((event) => (
        <div
          key={event.id}
          className={`room-presence-reaction ${event.entering ? "is-entering" : "is-leaving"}`}
        >
          <RoomSocialIcon kind={event.entering ? "ready" : "away"} />
          <span>
            <strong>{event.name}</strong> {event.entering ? "entrou na sala!" : "saiu da sala"}
          </span>
          <span className="room-presence-sparks" aria-hidden="true">
            ✦ ✦ ✦
          </span>
        </div>
      ))}
    </div>
  );
}
