export function ShelfToolIcon({ name }: { name: "pen" | "save" | "text" | "trash" }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="shelf-tool-icon">
      {name === "pen" ? (
        <>
          <path d="M8 31 31 5 43 17 19 42 5 45Z" fill="#ffdb29" />
          <path d="m8 31 11 11 24-25-6-6Z" fill="#dca90b" />
          <path d="m5 45 3-14 11 11Z" fill="#fff2ce" />
          <path d="m5 45 2-6 4 4Z" fill="#654237" />
          <path d="m28 8 6-6 12 12-6 6Z" fill="#a779ef" />
          <path d="m34 2 12 12-6 6-5-5 6-6Z" fill="#7433e0" />
        </>
      ) : name === "save" ? (
        <>
          <path d="M6 4h29l8 8v32H6Z" fill="#a779ef" />
          <path d="m35 4 8 8v32H6v-5h32V12Z" fill="#7433e0" />
          <path d="M13 4h20v15H13Z" fill="#ffdb29" />
          <path d="M26 5h5v11h-5Z" fill="#86573f" />
          <path d="M12 26h25v16H12Z" fill="#fff2ce" />
          <path d="M16 30h17v3H16Zm0 6h12v3H16Z" fill="#a97951" />
        </>
      ) : name === "text" ? (
        <>
          <path d="m3 11 37-5 5 32-37 6Z" fill="#ffdf92" />
          <path d="m3 11 8 7 30-4-1-8Z" fill="#fff2ce" />
          <path d="m16 34 6-17 5-1 10 16-6 1-2-4-7 1-1 4Zm7-9 4-1-3-5Z" fill="#7433e0" />
          <path d="m8 44 37-6-1-6-36 6Z" fill="#dca90b" />
        </>
      ) : (
        <>
          <path d="M11 15h28l-4 29H15Z" fill="#fa8e86" />
          <path d="m32 15 7 0-4 29H15l-1-5h17Z" fill="#cf586f" />
          <path d="M7 9h35v7H7Z" fill="#a779ef" />
          <path d="M7 13h35v4H7Z" fill="#7433e0" />
          <path d="M18 4h14v6h-5V8h-4v2h-5Z" fill="#ffdb29" />
          <path d="M20 22h3v14h-3Zm8 0h3v14h-3Z" fill="#fff2ce" />
        </>
      )}
    </svg>
  );
}
