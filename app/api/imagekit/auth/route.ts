import { NextRequest, NextResponse } from "next/server";

import { createImageKitUploadCredentials } from "@/lib/imagekit";
import { getEntryForOwner } from "@/lib/journal";
import { getOwnerSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getOwnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entryId = request.nextUrl.searchParams.get("entryId");
  if (!entryId) return NextResponse.json({ error: "entryId is required" }, { status: 400 });

  const entry = await getEntryForOwner(session.user.id, entryId);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  return NextResponse.json(createImageKitUploadCredentials(entryId));
}
