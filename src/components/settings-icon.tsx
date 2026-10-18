export type SettingsIconName =
  "account" | "appearance" | "study" | "notebooks" | "notifications" | "data";

// Silhuetas próprias, facetas sólidas e cores por assunto, sem ícones de contorno.
export function SettingsIcon({ name }: { name: SettingsIconName }) {
  const shapes: Record<SettingsIconName, React.ReactNode> = {
    account: (
      <>
        <path fill="#26A6AD" d="M5 7 29 3l5 7-2 25-27 1Z" />
        <path fill="#166B80" d="m5 7 8 5-2 24-6-1Z" />
        <path fill="#FFF9EF" d="m18 10 7 1 2 7-5 4-7-4Zm-6 21 3-8 11 1 4 7Z" />
        <path fill="#FFE88D" d="m25 4 4 7-6 1Z" />
      </>
    ),
    appearance: (
      <>
        <path fill="#A779EF" d="m20 3 14 9-1 17-14 8L5 28 4 12Z" />
        <path fill="#7433E0" d="m20 3-1 34L5 28 4 12Z" />
        <path fill="#FACC15" d="m21 9 8 6-2 10-8 5-7-7 1-9Z" />
        <path fill="#FFF9EF" d="m21 9-2 21-7-7 1-9Z" />
      </>
    ),
    study: (
      <>
        <path fill="#ED729D" d="m11 11 17-2 7 14-6 12-17 1L4 24Z" />
        <path fill="#B64772" d="m4 24 8 12 7-4-6-18Z" />
        <path fill="#51A477" d="m14 4 8 5 7-4-1 9-10 1-8-6Z" />
        <path fill="#FFF9EF" d="m20 17 4 1v7l5 3-2 3-7-5Z" />
      </>
    ),
    notebooks: (
      <>
        <path fill="#4DA6D6" d="m8 4 24 2 3 28-27 2Z" />
        <path fill="#216789" d="m5 5 6-1 1 32-6-2Z" />
        <path fill="#FFF9EF" d="m14 10 14 1 1 17-14 2Z" />
        <path fill="#FACC15" d="m24 5 5 1-1 13-3-3-2 2Z" />
        <path fill="#A779EF" d="m16 15 10-1v3l-10 1Zm1 7 8-1v3l-8 1Z" />
      </>
    ),
    notifications: (
      <>
        <path fill="#FACC15" d="m18 4 7 1 2 5 5 6v12l4 3H5l4-5V16l7-6Z" />
        <path fill="#D79A24" d="m18 4-3 22-6 5H5l4-5V16l7-6Z" />
        <path fill="#FFF9EF" d="m15 32 11 1-4 5-5-1Z" />
        <path fill="#ED729D" d="m29 2 8 4-1 9-8 1-4-7Z" />
      </>
    ),
    data: (
      <>
        <path fill="#51A477" d="m20 3 15 7-3 18-12 10L7 29 4 10Z" />
        <path fill="#246D55" d="m20 3 1 35L7 29 4 10Z" />
        <path fill="#FFF9EF" d="m15 17 1-6 8-1 4 7-4 2-2-5-3 1v4Zm-3 2 17-1-1 12-15 1Z" />
        <path fill="#FACC15" d="m19 22 5-1 1 4-3 2v2h-3v-4Z" />
      </>
    ),
  };
  return (
    <svg
      className="settings-paper-icon"
      viewBox="0 0 40 40"
      width="32"
      height="32"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}
