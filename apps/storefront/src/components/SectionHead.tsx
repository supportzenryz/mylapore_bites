import Link from "next/link";

export function SectionHead({
  eyebrow, title, href, linkLabel = "See all",
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {href && <Link href={href}>{linkLabel} →</Link>}
    </div>
  );
}
