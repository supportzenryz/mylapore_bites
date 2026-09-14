import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="empty" style={{ paddingBlock: 72 }}>
        <h2>We couldn&rsquo;t find that</h2>
        <p>The page or product you were looking for isn&rsquo;t here any more.</p>
        <Link href="/shop" className="btn btn--primary">Browse everything</Link>
      </div>
    </main>
  );
}
