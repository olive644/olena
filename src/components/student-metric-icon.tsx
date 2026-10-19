/** Ícones exclusivos dos indicadores, sem alterar símbolos compartilhados. */
export function StudentMetricIcon({ name }: { name: "pending" | "focus" | "agenda" }) {
  return (
    <img
      className="student-metric-icon"
      src={`/navigation-icons/paper/student-${name}.svg`}
      alt=""
      width="32"
      height="32"
    />
  );
}
