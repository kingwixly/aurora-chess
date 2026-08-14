"use client";

/**
 * Last-resort boundary, for a crash in the root layout itself.
 *
 * Must render its own `<html>` and `<body>`: at this point the layout that
 * normally provides them is the thing that failed. Deliberately styled inline
 * rather than with Tailwind, since a layout crash may mean the stylesheet never
 * loaded.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#05070E",
          color: "#b6c4da",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", color: "#fff", margin: 0 }}>Aurora is down</h1>
        <p style={{ maxWidth: "24rem", margin: 0 }}>
          Something failed badly enough to take the whole page with it.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#18C0D8",
            color: "#05070E",
            border: 0,
            borderRadius: "0.5rem",
            padding: "0.65rem 1.25rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
