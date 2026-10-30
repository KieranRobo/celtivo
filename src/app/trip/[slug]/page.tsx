import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { Logo } from "@/components/brand/logo";
import { listTripBookings } from "@/features/bookings/repository";
import { listInboundEmails } from "@/features/inbound/repository";
import { TripDashboard, TripDashboardSkeleton } from "@/features/trips/components/trip-dashboard";
import { findTripBySlug } from "@/features/trips/repository";

// One query per request, shared by the metadata and the page.
const getTrip = cache(findTripBySlug);

export async function generateMetadata({ params }: PageProps<"/trip/[slug]">): Promise<Metadata> {
  const trip = await getTrip((await params).slug);
  // Trip boards are private to the group: keep them out of search.
  return { title: trip?.name, robots: { index: false, follow: false } };
}

export default function TripPage({ params }: PageProps<"/trip/[slug]">) {
  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-10 sm:px-7 sm:py-16">
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100 shadow-card-lg">
        <header className="flex items-center border-b border-neutral-300 px-6 py-3.5">
          <Logo size="sm" />
        </header>
        <Suspense fallback={<TripDashboardSkeleton />}>
          {params.then(({ slug }) => (
            <Trip slug={slug} />
          ))}
        </Suspense>
      </div>
    </main>
  );
}

async function Trip({ slug }: { slug: string }) {
  const trip = await getTrip(slug);
  if (!trip) notFound();
  const [bookings, emails] = await Promise.all([
    listTripBookings(trip.id),
    listInboundEmails(trip.id),
  ]);
  return <TripDashboard trip={trip} bookings={bookings} emails={emails} />;
}
