import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { CreateTripForm } from "@/features/trips/components/create-trip-form";

export const metadata: Metadata = {
  title: "Create a trip",
};

export default function NewTripPage() {
  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-10 sm:px-7 sm:py-16">
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100 shadow-card-lg">
        <header className="flex flex-wrap items-center gap-4 border-b border-neutral-300 px-6 py-3.5">
          <Logo size="sm" className="mr-auto" />
          <span className="text-[12.5px] text-neutral-600">
            Step 1 of 2 · you can change all of this later
          </span>
        </header>
        <CreateTripForm />
      </div>
    </main>
  );
}
