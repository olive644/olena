import "./profile-labels.css";
export function ProfileLabels({ creks, username }: { creks: boolean; username: string }) {
  const labels =
    username === "dreyxnn"
      ? ["GALAXIA", "BETA TESTER"]
      : username === "eito" || username === "pranksterbrain"
        ? ["CREKS", "BETA TESTER"]
        : creks
          ? username === "oliver644"
            ? ["CREKS", "DEV", "BETA TESTER", "GALAXIA"]
            : ["CREKS"]
          : [];
  if (!labels.length) return null;
  return (
    <span className="profile-labels">
      {labels.map((label) => (
        <span
          key={label}
          className={`profile-creks profile-label--${label.toLowerCase().replace(" ", "-")}`}
          aria-label={`Selo ${label}`}
        >
          {label}
        </span>
      ))}
    </span>
  );
}
