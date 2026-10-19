import type { ReactNode } from "react";
import { AnimatedPomodoroTomato } from "./pomodoro-tomato";
import { PaperDigits } from "./paper-digits";

export function PomodoroDial({
  stage,
  time,
  mini = false,
  children,
}: {
  stage: number;
  time: string;
  mini?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="pomodoro-dial">
      <AnimatedPomodoroTomato stage={stage} sound={!mini} />
      <div className="pomodoro-dial__time">
        <img
          className="pomodoro-worm"
          src="/pomodoro-tomato/minhoca.svg"
          alt=""
          aria-hidden="true"
          width="320"
          height="120"
          draggable={false}
        />
        <h2 id={mini ? undefined : "focus-timer-title"} className="timer">
          <PaperDigits value={time} />
        </h2>
        {children}
      </div>
    </div>
  );
}
