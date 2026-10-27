"use client";

import { Check, Search, Truck as TruckIcon, Wrench, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { unitLabel } from "@/lib/format";
import type { Truck } from "@/lib/types";

interface Props {
  trucks: Truck[];
  /** The selected truck id, or null when a free-text number is in use. */
  truckId: string | null;
  /** The number shown on the form (either from the picked truck or typed). */
  truckNumber: string;
  onPick: (truck: Truck | null, freeText?: string) => void;
}

const MAX_RESULTS = 12;

/**
 * Type-to-search picker over the fleet list (hundreds of units). Matches on unit
 * number, description, and branch; falls back to free text for a unit that isn't
 * listed yet. Works offline because the list is passed in (cached on the phone).
 */
export function TruckPicker({ trucks, truckId, truckNumber, onPick }: Props) {
  const selected = useMemo(() => trucks.find((t) => t.id === truckId) ?? null, [trucks, truckId]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trucks.slice(0, MAX_RESULTS);
    const starts: Truck[] = [];
    const contains: Truck[] = [];
    for (const t of trucks) {
      const num = t.truck_number.toLowerCase();
      if (num.startsWith(q)) starts.push(t);
      else if (num.includes(q) || (t.description ?? "").toLowerCase().includes(q) || (t.branch ?? "").toLowerCase().includes(q) || (t.asset_id ?? "").includes(q)) contains.push(t);
      if (starts.length >= MAX_RESULTS) break;
    }
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [trucks, query]);

  const exactMatch = results.some((t) => t.truck_number.toLowerCase() === query.trim().toLowerCase());

  const choose = (t: Truck | null, free?: string) => {
    onPick(t, free);
    setOpen(false);
    setQuery("");
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="field flex items-center gap-3 text-left" aria-haspopup="listbox">
        {selected ? (
          <>
            <KindIcon kind={selected.kind} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[16px] font-semibold">{unitLabel(selected.truck_number)}{selected.description ? ` · ${selected.description}` : ""}</span>
              <span className="truncate text-[12px] text-muted">{selected.branch ?? "No branch on file"}</span>
            </span>
          </>
        ) : truckNumber ? (
          <>
            <Wrench size={20} className="shrink-0 text-muted" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[16px] font-semibold">{unitLabel(truckNumber)}</span>
              <span className="text-[12px] text-muted">Not in the fleet list — typed in</span>
            </span>
          </>
        ) : (
          <>
            <Search size={20} className="shrink-0 text-muted" />
            <span className="flex-1 text-[16px] text-muted">Search unit # or description…</span>
          </>
        )}
        <span className="text-[13px] font-semibold text-brand">{selected || truckNumber ? "Change" : ""}</span>
      </button>
    );
  }

  return (
    <div className="card overflow-hidden border-brand ring-2 ring-brand/20">
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Unit #, e.g. 103, or 'chip dump'"
          className="min-h-12 flex-1 bg-transparent text-[16px] outline-none"
          inputMode="search"
          autoComplete="off"
          aria-label="Search trucks and equipment"
        />
        <button type="button" onClick={() => { setOpen(false); setQuery(""); }} aria-label="Close" className="flex h-10 w-10 items-center justify-center text-muted">
          <X size={18} />
        </button>
      </div>
      <ul role="listbox" className="max-h-72 overflow-y-auto">
        {results.map((t) => (
          <li key={t.id}>
            <button type="button" role="option" aria-selected={t.id === truckId} onClick={() => choose(t)} className="flex min-h-13 w-full items-center gap-3 border-b border-line px-3 py-2 text-left hover:bg-ground">
              <KindIcon kind={t.kind} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-semibold">{unitLabel(t.truck_number)}{t.description ? ` · ${t.description}` : ""}</span>
                <span className="truncate text-[12px] text-muted">{[t.kind === "equipment" ? "Equipment" : "Vehicle", t.branch].filter(Boolean).join(" · ")}</span>
              </span>
              {t.id === truckId ? <Check size={18} className="text-brand" /> : null}
            </button>
          </li>
        ))}
        {query.trim() && !exactMatch ? (
          <li>
            <button type="button" onClick={() => choose(null, query.trim())} className="flex min-h-13 w-full items-center gap-3 px-3 py-2 text-left hover:bg-ground">
              <Wrench size={20} className="shrink-0 text-muted" />
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">Use &ldquo;{query.trim()}&rdquo; as typed</span>
                <span className="text-[12px] text-muted">Not in the list — your manager can add it later</span>
              </span>
            </button>
          </li>
        ) : null}
        {results.length === 0 && !query.trim() ? <li className="px-3 py-4 text-[14px] text-muted">No trucks on file yet.</li> : null}
      </ul>
    </div>
  );
}

function KindIcon({ kind }: { kind: Truck["kind"] }) {
  return kind === "equipment" ? <Wrench size={20} className="shrink-0 text-muted" /> : <TruckIcon size={20} className="shrink-0 text-brand" />;
}
