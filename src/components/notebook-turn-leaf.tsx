import type { CSSProperties, ReactNode } from "react";
import type { NotebookTab, StudyNote } from "../domain/workspace";
import { NotebookRidingTab } from "./notebook-tab-art";
import { useNotebookPagePreview } from "./notebook-page-thumbnail";

/** A folha é cortada em fatias que se curvam umas sobre as outras: o papel dobra ao virar. */
export const TURN_SLICES = 8;

export type RidingTab = { tab: NotebookTab; pageIndex: number };

type Props = {
  direction: number;
  settling: boolean;
  automatic: boolean;
  /** Ângulo da folha em graus (negativo para a frente, positivo para trás). */
  angle: number;
  front: StudyNote | undefined;
  back: StudyNote | undefined;
  frontNumber: number | undefined;
  backNumber: number | undefined;
  riding: RidingTab[];
};

function FaceContent({
  page,
  number,
  url,
}: {
  page: StudyNote | undefined;
  number: number | undefined;
  url: string;
}) {
  const asset = page?.assets[0];
  return (
    <>
      {asset ? (
        url ? (
          <img draggable={false} src={url} alt="" />
        ) : (
          <span aria-hidden="true" />
        )
      ) : (
        <div className="notebook-empty-paper">{page?.content && <p>{page.content}</p>}</div>
      )}
      <strong>{page?.title ?? ""}</strong>
      <span>{number ?? ""}</span>
    </>
  );
}

function Clip({
  face,
  portion,
  children,
}: {
  face: "front" | "back";
  portion: number;
  children: ReactNode;
}) {
  return (
    <span className={`notebook-turn-clip is-${face}`}>
      <span
        className={`notebook-turn-face is-${face}`}
        style={{ "--portion": portion } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * Posição de um marcador na cadeia de fatias: a fatia que o contém e a fração dentro dela, medidas
 * a partir da lombada (`hinge` é a distância da lombada em fração do caderno inteiro).
 */
function ribbonSlot(hinge: number) {
  const along = Math.min(0.999, Math.max(0, hinge * 2)) * TURN_SLICES;
  const slice = Math.floor(along);
  return { slice, fraction: along - slice };
}

export function NotebookTurnLeaf({
  direction,
  settling,
  automatic,
  angle,
  front,
  back,
  frontNumber,
  backNumber,
  riding,
}: Props) {
  const backward = direction < 0;
  const frontUrl = useNotebookPagePreview(front?.assets[0]);
  const backUrl = useNotebookPagePreview(back?.assets[0]);
  const startSide = backward ? "left" : "right";
  const slices = Array.from({ length: TURN_SLICES }, (_, index) => index);
  const style = {
    "--turn-angle": `${angle}deg`,
    "--turn-final": `${angle}deg`,
    "--n": TURN_SLICES,
  } as CSSProperties;
  const renderSlice = (index: number): ReactNode => {
    const frontPortion = backward ? TURN_SLICES - 1 - index : index;
    const backPortion = backward ? index : TURN_SLICES - 1 - index;
    return (
      <span className="notebook-turn-slice" style={{ "--i": index } as CSSProperties}>
        <Clip face="front" portion={frontPortion}>
          <FaceContent page={front} number={frontNumber} url={frontUrl} />
        </Clip>
        <Clip face="back" portion={backPortion}>
          <FaceContent page={back} number={backNumber} url={backUrl} />
        </Clip>
        {riding.map(({ tab, pageIndex }) => {
          const last = index === TURN_SLICES - 1;
          if (tab.kind === "divider") {
            return last ? (
              <NotebookRidingTab key={tab.id} tab={tab} pageIndex={pageIndex} side={startSide} />
            ) : null;
          }
          const hinge = pageIndex % 2 ? 0.07 + tab.position * 0.36 : 0.43 - tab.position * 0.36;
          const slot = ribbonSlot(hinge);
          if (slot.slice !== index) return null;
          const left = backward ? 1 - slot.fraction : slot.fraction;
          return (
            <NotebookRidingTab
              key={tab.id}
              tab={tab}
              pageIndex={pageIndex}
              side={startSide}
              left={`${left * 100}%`}
            />
          );
        })}
        {index < TURN_SLICES - 1 && renderSlice(index + 1)}
      </span>
    );
  };
  return (
    <div
      className={`notebook-turn ${backward ? "is-backward" : ""} ${settling ? "is-settling" : "is-dragging"} ${automatic ? "is-automatic" : ""}`}
      aria-hidden="true"
      style={style}
    >
      <div className="notebook-turn-shadow" />
      <div className="notebook-turn-leaf">{slices.length ? renderSlice(0) : null}</div>
    </div>
  );
}
