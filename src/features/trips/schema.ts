import { z } from "zod";

export const GROUP_SIZES = [
  { value: "2-4", label: "2–4" },
  { value: "5-8", label: "5–8" },
  { value: "9-15", label: "9–15" },
  { value: "16+", label: "16+" },
] as const;

export type GroupSize = (typeof GROUP_SIZES)[number]["value"];

export const groupSizeValues = GROUP_SIZES.map((size) => size.value) as [GroupSize, ...GroupSize[]];

/** Shared by the create-trip form (client) and the /api/trips handler (server). */
export const createTripSchema = z.object({
  name: z.string().trim().min(1, "Give the trip a name").max(80, "Keep it under 80 characters"),
  destination: z.string().trim().max(120).optional(),
  roughDates: z.string().trim().max(80).optional(),
  groupSize: z.enum(groupSizeValues),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

export type Trip = CreateTripInput & {
  id: string;
  slug: string;
  /** ISO timestamp — a string so the type holds on both sides of the JSON API. */
  createdAt: string;
  /** The trip dashboard: https://celtivo.com/trip/<slug>. */
  url: string;
  inviteUrl: string;
  /** Where members forward bookings: <name-slug>-<token>@celtivo.space. */
  inboundAddress: string;
};
