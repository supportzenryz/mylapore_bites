"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconSearch } from "./Icons";

export function SearchField({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      className="searchbar"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
    >
      <label htmlFor="q" className="sr-only">Search products</label>
      <input
        id="q"
        name="q"
        type="search"
        className="field"
        placeholder="Podi, murukku, pickle…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
      />
      <button type="submit" className="btn btn--primary" aria-label="Search">
        <IconSearch size={20} />
      </button>
    </form>
  );
}
