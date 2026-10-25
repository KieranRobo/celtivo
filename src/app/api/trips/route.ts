import { z } from "zod";

import { createTripSchema, type Trip } from "@/features/trips/schema";
import { slugify } from "@/features/trips/slug";

// Placeholder backend: validates and echoes the trip back. Swap the body for
// a database write once a backend is chosen.
export async function POST(request: Request) {
  const parsed = createTripSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  const slug = slugify(parsed.data.name);
  const trip: Trip = {
    ...parsed.data,
    id: crypto.randomUUID(),
    slug,
    inviteUrl: `https://celtivo.com/join/${slug}`,
  };
  return Response.json(trip, { status: 201 });
}
