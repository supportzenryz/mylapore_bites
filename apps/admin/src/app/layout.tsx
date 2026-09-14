import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mylapore Bites Admin" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F7F6F3", color: "#1A1A1A" }}>
        <header style={{ background: "#153017", color: "#fff", padding: "12px 20px", fontWeight: 600 }}>
          Mylapore Bites — Admin
        </header>
        <div style={{ display: "flex", minHeight: "calc(100vh - 46px)" }}>
          <nav style={{ width: 200, borderRight: "1px solid #E4E1DA", background: "#fff", padding: 16, fontSize: ".9rem" }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              <li><a href="/">Dashboard</a></li>
              <li><a href="/production">Production</a></li>
              <li><a href="/products">Products</a></li>
              <li><a href="/orders">Orders</a></li>
              <li><a href="/customers">Customers</a></li>
            </ul>
          </nav>
          <main style={{ flex: 1, padding: 24 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
