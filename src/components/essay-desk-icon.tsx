export function EssayDeskIcon({ name }: { name: string }) {
  return (
    <svg className="essay-desk-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {name === "minhas" ? (
        <>
          <path d="M9 10h25l7 8v26H9Z" fill="#32897e" />
          <path d="M5 5h25l7 8v26H5Z" fill="#63c9b4" />
          <path d="M30 5v9h7Z" fill="#c2f2de" />
          <path d="M11 19h18v3H11Zm0 7h14v3H11Z" fill="#edfff7" />
          <path d="m23 34 5 5 11-13 4 4-15 16-9-8Z" fill="#24816c" />
        </>
      ) : name === "redacao" ? (
        <>
          <path d="M7 3h23l11 11v31H7Z" fill="#fff2ce" />
          <path d="m30 3 11 11H30Z" fill="#d6b98a" />
          <path d="M13 17h17v3H13Zm0 7h13v3H13Zm0 7h10v3H13Z" fill="#9a764e" />
          <path d="m24 35 14-19 7 6-15 18-10 4Z" fill="#facc15" />
          <path d="m24 35 6 5 15-18-4-3Z" fill="#d69a14" />
          <path d="m20 44 4-9 6 5Z" fill="#a77bef" />
        </>
      ) : name === "vestibular" ? (
        <>
          <path d="M5 8h32l7 7v29H5Z" fill="#e8a35d" />
          <path d="m5 8 7 7h32l-7-7Z" fill="#ffcf86" />
          <path d="M10 16h28v23H10Z" fill="#fff2ce" />
          <path d="m13 21 3 3 5-7 3 2-8 10-6-5Zm0 12h18v3H13Z" fill="#b6753b" />
          <path d="m32 26 14 2-4 11-11 6-5-11Z" fill="#a77bef" />
          <path d="m32 26 14 2-9 7-11-1Z" fill="#d3b5ff" />
        </>
      ) : name === "technology" ? (
        <>
          <path d="M7 7h34v26H7Z" fill="#49bfd0" />
          <path d="m7 7 7 6h27V7Z" fill="#9ce1dd" />
          <path d="M12 13h24v14H12Z" fill="#236975" />
          <path d="m17 18 4-3 2 3-4 2 4 2-2 3-6-5Zm14-3 4 5-4 5-2-3 3-2-3-2Z" fill="#9ce1dd" />
          <path d="M20 33h8v6h9v4H11v-4h9Z" fill="#32899b" />
          <path d="m37 28 9 5-3 10-9-2-3-8Z" fill="#ffcf35" />
        </>
      ) : name === "health" ? (
        <>
          <path d="m24 13 8-8 10 3 4 11-5 13-17 13L7 32 2 19 6 8l10-3Z" fill="#df7497" />
          <path d="m24 13 8-8 10 3-5 15-13 22Z" fill="#ae456c" />
          <path d="M8 23h9l4-9 6 17 4-8h10v4h-8l-7 12-6-16-1 4H8Z" fill="#fff2ce" />
        </>
      ) : name === "education" ? (
        <>
          <path d="m3 10 20-5 22 5v33l-22-4-20 4Z" fill="#6d9eea" />
          <path d="m23 5 22 5v33l-22-4Z" fill="#3e68b8" />
          <path d="m7 14 13-4v24l-13 3Zm20-4 13 4v23l-13-3Z" fill="#fff2ce" />
          <path d="m23 5 18 5-17 9L5 11Z" fill="#b1d0ff" />
          <path d="M22 19h3v20h-3Z" fill="#254a8a" />
        </>
      ) : name === "work" ? (
        <>
          <path d="M17 4h15v9h-4V8h-7v5h-4Z" fill="#9f653d" />
          <path d="M3 13h42v29H3Z" fill="#e8b65c" />
          <path d="m3 13 8 9h34v-9Z" fill="#ffe0a1" />
          <path d="M3 32h42v10H3Z" fill="#ad783e" />
          <path d="M20 21h8v10h-8Z" fill="#86573f" />
          <path d="m35 28 10 4-1 12-11-2-4-9Z" fill="#facc15" />
        </>
      ) : name === "environment" ? (
        <>
          <path d="M24 3 43 12l2 20-19 14-21-11-2-20Z" fill="#64b990" />
          <path d="m24 3 19 9 2 20-19 14-2-24Z" fill="#287557" />
          <path d="M11 27C9 11 25 8 37 10c0 18-8 28-23 23Z" fill="#b7e197" />
          <path d="m11 27 26-17-23 23-2 9-4-1Z" fill="#4a905d" />
        </>
      ) : (
        <>
          <path d="M22 5h4v32h13v6H9v-6h13Z" fill="#bf8ada" />
          <path d="m22 5 4 0v32l-4 6Z" fill="#8857b1" />
          <path d="M5 12h38v5H5Z" fill="#e0baff" />
          <path d="m10 16 7 14H3Zm28 0 7 14H31Z" fill="#f3d48e" />
          <path d="M3 30h14l-4 6H7Zm28 0h14l-4 6h-6Z" fill="#bb904e" />
          <path d="m19 5 5-4 6 4-6 6Z" fill="#facc15" />
        </>
      )}
    </svg>
  );
}
