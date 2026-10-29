import { z } from "zod";

import { insertTrip } from "@/features/trips/repository";
import { createTripSchema } from "@/features/trips/schema";

export async function POST(request: Request) {
  const parsed = createTripSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ errors: z.flattenError(parsed.error).fieldErrors }, { status: 400 });
  }

  const trip = await insertTrip(parsed.data);
  return Response.json(trip, { status: 201 });
}
