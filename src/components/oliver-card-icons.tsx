export function OliverAttributeIcon({ kind }: { kind: "power" | "life" | "stamina" }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      {kind === "power" ? (
        <>
          <path fill="#292432" d="m17 2 10 3-1 10-9 9-4-5 9-9-2-3-9 9-5-4Z" />
          <path fill="#f3c44d" d="m17 4 8 2-1 8-9 8-5-6Z" />
          <path fill="#fff1b7" d="m17 4 8 2-15 10Z" />
          <path fill="#805239" d="m4 22 5-5 6 6-5 6Z" />
        </>
      ) : kind === "life" ? (
        <>
          <path fill="#a84250" d="m3 8 6-4 7 4 7-4 6 4-1 12-12 10L3 20Z" />
          <path fill="#ff8b9c" d="m3 8 6-4 7 4v20L3 18Z" />
          <path fill="#ed6076" d="m16 8 7-4 6 4-1 10-12 10Z" />
          <path fill="#ffc2b8" d="m3 8 6-4 7 4-7 7Z" />
        </>
      ) : (
        <>
          <path fill="#267f83" d="m17 1 10 3-8 11 7 1-14 15-7-3 8-13-7-1Z" />
          <path fill="#89d7cf" d="m17 1 10 3-12 14-9-4Z" />
          <path fill="#4db2b2" d="m15 18 11-2-14 15-7-3Z" />
        </>
      )}
    </svg>
  );
}
