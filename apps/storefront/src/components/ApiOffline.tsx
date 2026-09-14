/**
 * Shown when the storefront cannot reach the API. Aimed at whoever is running
 * the stack, not at a customer — a customer should never see this in
 * production, where the health check would have pulled the container.
 */
export function ApiOffline({ error }: { error: unknown }) {
  return (
    <main className="wrap" style={{ paddingBlock: 48 }}>
      <div className="note note--warn">
        <b>The storefront can&rsquo;t reach the API.</b>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>Is it running? <code>pnpm api:dev</code></li>
          <li>Is <code>API_INTERNAL_URL</code> set correctly in <code>.env</code>?</li>
          <li>
            Is this hostname registered in <code>market_domains</code>? The seed adds{" "}
            <code>localhost</code>.
          </li>
        </ul>
        <p style={{ margin: "10px 0 0", fontSize: 12, opacity: .8 }}>
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    </main>
  );
}
