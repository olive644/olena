import { useState, type PointerEvent } from "react";
import { isPenBarrelButton, isPenEraserTip, isPenSecondButton } from "./handwriting-pointer";
import { uiText, useLanguage } from "../i18n/runtime";

type Reading = { device: number; pressure: number; tilt: number; buttons: number[] };

// O que o navegador entregou neste evento: nomes (ids do catálogo) dos botões da caneta apertados.
type PenSample = {
  pointerType: string;
  button: number;
  buttons: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
};

export function readPenInput(event: PenSample): Reading {
  const buttons: number[] = [];
  if (isPenBarrelButton(event)) buttons.push(3814);
  if (isPenSecondButton(event)) buttons.push(4008);
  if (isPenEraserTip(event)) buttons.push(3817);
  const device = event.pointerType === "pen" ? 355 : event.pointerType === "touch" ? 4017 : 4016;
  return {
    device,
    pressure: Math.round(event.pressure * 100) / 100,
    tilt: Math.round(Math.max(Math.abs(event.tiltX), Math.abs(event.tiltY))),
    buttons,
  };
}

// Área de teste: mostra, ao vivo, o que a caneta ou a mesa digitalizadora informa. Serve para
// descobrir se o aparelho manda o botão lateral, o segundo botão ou a ponta traseira antes de
// escolher a ação deles. Nada é gravado nem enviado.
export function PenInputTest() {
  useLanguage();
  const [reading, setReading] = useState<Reading | null>(null);
  const show = (event: PointerEvent<HTMLDivElement>) => setReading(readPenInput(event.nativeEvent));
  return (
    <div className="notebook-pen-test">
      <strong>{uiText(4009)}</strong>
      <p>{uiText(4010)}</p>
      <div
        className="notebook-pen-test__pad"
        onPointerDown={show}
        onPointerMove={show}
        onPointerUp={show}
        onPointerCancel={() => setReading(null)}
        onPointerLeave={() => setReading(null)}
        onContextMenu={(event) => event.preventDefault()}
      >
        {reading ? (
          <ul>
            <li>{uiText(4011, [uiText(reading.device)])}</li>
            <li>{uiText(4012, [String(reading.pressure)])}</li>
            <li>{uiText(4013, [String(reading.tilt)])}</li>
            <li>
              {uiText(4014, [
                reading.buttons.length > 0
                  ? reading.buttons.map((id) => uiText(id)).join(", ")
                  : uiText(4015),
              ])}
            </li>
          </ul>
        ) : (
          <span>{uiText(4018)}</span>
        )}
      </div>
    </div>
  );
}
