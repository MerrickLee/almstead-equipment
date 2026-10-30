import { after, NextResponse } from "next/server";
import { getOrder, setOrderReview } from "@/lib/db";
import { apiSession } from "@/lib/session";
import { ensureTranslations } from "@/lib/translate";
import { firstIssue, reviewSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Mark an order reviewed (or reopen it) and save manager notes. */
export async function POST(request: Request, { params }: Ctx) {
  const { user, error } = await apiSession({ manager: true });
  if (error) return error;
  const { id } = await params;

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  if (!(await getOrder(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const order = await setOrderReview(id, user.id, parsed.data.status, parsed.data.manager_notes);
    after(() => ensureTranslations(order));
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
