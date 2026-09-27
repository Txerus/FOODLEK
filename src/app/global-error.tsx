"use client";

/** Last-resort error page: replaces the root layout, so it carries its own document and styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#faf8f3", color: "#1f2a24", margin: 0 }}>
        <title>Erreur · FOODLEK</title>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 16px" }}>
          <p style={{ textTransform: "uppercase", fontSize: 13, fontWeight: 600, color: "#5d665f" }}>Erreur</p>
          <h1 style={{ fontSize: 28, margin: "8px 0 16px" }}>FOODLEK ne répond pas correctement</h1>
          <p>Réessayez dans un instant.</p>
          {error.digest ? <p style={{ fontSize: 12, color: "#5d665f" }}>Référence : {error.digest}</p> : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{ marginTop: 16, padding: "10px 16px", borderRadius: 8, border: 0, background: "#2f6b4f", color: "white", fontSize: 15, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
