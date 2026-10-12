import { eventEnd, occurrenceOn } from "./agenda-calendar";
import type { StudyEvent } from "./workspace";

export function layoutAgendaDay(events: StudyEvent[], date: string) {
  const entries = events
    .map((event) => {
      const viewStart = occurrenceOn(event, date) ?? date;
      const occurrence =
          "displayOccurrence" in event && typeof event.displayOccurrence === "string"
            ? event.displayOccurrence
            : viewStart,
        end = eventEnd(event, viewStart);
      const start =
        viewStart < date ? 0 : Number(event.time.slice(0, 2)) * 60 + Number(event.time.slice(3));
      const finish =
        end.date > date ? 1440 : Number(end.time.slice(0, 2)) * 60 + Number(end.time.slice(3));
      return {
        event,
        occurrence,
        start,
        finish,
        height: Math.max(48, ((finish - start) / 60) * 48),
        lane: 0,
        lanes: 1,
      };
    })
    .sort((a, b) => a.start - b.start || b.finish - a.finish);
  let group: typeof entries = [],
    laneEnds: number[] = [],
    groupEnd = -1;
  const flush = () => {
    for (const entry of group) entry.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };
  for (const entry of entries) {
    if (entry.start >= groupEnd) flush();
    const drawnEnd = entry.start + (entry.height / 48) * 60;
    let lane = laneEnds.findIndex((end) => end <= entry.start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = drawnEnd;
    entry.lane = lane;
    group.push(entry);
    groupEnd = Math.max(group.length === 1 ? -1 : groupEnd, drawnEnd);
  }
  flush();
  return entries;
}
