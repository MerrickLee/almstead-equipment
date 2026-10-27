"use client";

// Phone-side persistence: the in-progress draft and an outbox of orders that
// could not be sent (no signal). Stored in IndexedDB via idb-keyval so photo
// blobs survive app restarts. Nothing here runs on the server.

import { del, get, set } from "idb-keyval";
import type { RepairOrderInput } from "./types";

export interface LocalPhoto {
  id: string;
  blob: Blob;
  caption: string;
  uploaded?: boolean;
}

export interface DraftOrder {
  values: RepairOrderInput;
  photos: LocalPhoto[];
  signature: string | null; // PNG data URL
  updatedAt: number;
}

export interface OutboxItem extends DraftOrder {
  queuedAt: number;
  serverId?: string; // set once the order row exists on the server
  signatureUploaded?: boolean;
  lastError?: string;
}

const DRAFT_KEY = "ro:draft";
const OUTBOX_KEY = "ro:outbox";

export async function loadDraft(): Promise<DraftOrder | undefined> {
  try {
    return await get<DraftOrder>(DRAFT_KEY);
  } catch {
    return undefined;
  }
}
export async function saveDraft(draft: DraftOrder): Promise<void> {
  try {
    await set(DRAFT_KEY, draft);
  } catch {
    /* storage may be unavailable in private mode */
  }
}
export async function clearDraft(): Promise<void> {
  try {
    await del(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export async function loadOutbox(): Promise<OutboxItem[]> {
  try {
    return (await get<OutboxItem[]>(OUTBOX_KEY)) ?? [];
  } catch {
    return [];
  }
}
async function writeOutbox(items: OutboxItem[]): Promise<void> {
  try {
    await set(OUTBOX_KEY, items);
  } catch {
    /* ignore */
  }
}
export async function enqueue(draft: DraftOrder): Promise<void> {
  const items = await loadOutbox();
  const existing = items.findIndex((i) => i.values.client_id === draft.values.client_id);
  const item: OutboxItem = { ...draft, queuedAt: Date.now() };
  if (existing >= 0) items[existing] = { ...items[existing], ...item };
  else items.push(item);
  await writeOutbox(items);
}

/**
 * Sends one order: the form, then each photo, then the signature. Each step is
 * idempotent on the server (client_id for the order; signature overwrites).
 * Returns the server order id. Throws on the first failure, leaving progress
 * recorded in `item` so the next attempt resumes.
 */
export async function sendOrder(item: OutboxItem, onProgress?: (item: OutboxItem) => void): Promise<string> {
  if (!item.serverId) {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.values),
    });
    const body = (await res.json().catch(() => ({}))) as { order?: { id: string }; error?: string };
    if (!res.ok || !body.order) throw new Error(body.error ?? `Upload failed (${res.status})`);
    item.serverId = body.order.id;
    onProgress?.(item);
  }

  for (const photo of item.photos) {
    if (photo.uploaded) continue;
    const form = new FormData();
    form.append("file", photo.blob, `${photo.id}.jpg`);
    form.append("caption", photo.caption);
    const res = await fetch(`/api/orders/${item.serverId}/photos`, { method: "POST", body: form });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Photo upload failed (${res.status})`);
    }
    photo.uploaded = true;
    onProgress?.(item);
  }

  if (item.signature && !item.signatureUploaded) {
    const res = await fetch(`/api/orders/${item.serverId}/signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl: item.signature }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `Signature upload failed (${res.status})`);
    }
    item.signatureUploaded = true;
    onProgress?.(item);
  }

  return item.serverId!;
}

/** Tries to send everything in the outbox. Returns how many remain. */
export async function flushOutbox(): Promise<{ sent: number; remaining: number }> {
  const items = await loadOutbox();
  const done = new Set<string>();
  // `items` holds the live objects; persisting it after each step records progress.
  const persist = () => writeOutbox(items.filter((i) => !done.has(i.values.client_id)));

  for (const item of items) {
    try {
      await sendOrder(item, () => void persist());
      done.add(item.values.client_id);
      await persist();
    } catch (err) {
      item.lastError = (err as Error).message;
      await persist();
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
    }
  }
  return { sent: done.size, remaining: items.length - done.size };
}

export function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}
