/**
 * Phase 1 placeholder. The full Shopify-style admin is Phase 7; this exists so
 * the app, its routing and its container are real from the start.
 *
 * Deliberately shows no fake numbers: an admin dashboard with invented figures
 * is worse than an empty one.
 */
const MODULES = [
  { name: "Production", phase: "Phase 5", note: "Plans, batches, capacity, daily production sheet" },
  { name: "Products", phase: "Phase 7", note: "Catalogue, variants, per-market pricing, CSV import" },
  { name: "Orders", phase: "Phase 4", note: "Orders, statuses, refunds" },
  { name: "Customers", phase: "Phase 7", note: "Profiles, addresses, segments" },
  { name: "Delivery", phase: "Phase 5", note: "Zones, slots, dispatch" },
  { name: "Inventory", phase: "Phase 7", note: "Finished goods, ingredients, movements" },
];

export default function AdminHome() {
  return (
    <>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: "#5C5852", maxWidth: "60ch" }}>
        Phase 1 established the database, markets, catalogue, customers and authentication.
        The modules below are scaffolded and arrive in the phases shown.
      </p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", marginTop: 20 }}>
        {MODULES.map((m) => (
          <div key={m.name} style={{ background: "#fff", border: "1px solid #E4E1DA", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <b>{m.name}</b>
              <span style={{ fontSize: ".7rem", color: "#153017", background: "#EDF3EE", padding: "2px 6px", borderRadius: 4 }}>
                {m.phase}
              </span>
            </div>
            <div style={{ color: "#5C5852", fontSize: ".85rem", marginTop: 6 }}>{m.note}</div>
          </div>
        ))}
      </div>
    </>
  );
}
