"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { useCreateTrip } from "../api";
import { useTripDraft } from "../draft-store";
import { createTripSchema, GROUP_SIZES, type CreateTripInput } from "../schema";
import { EXAMPLE_TRIP_NAME, slugify, tripTitle } from "../slug";

const nextSteps = [
  {
    n: "1",
    title: "The group joins",
    copy: "They tap the link, add their name, and they are in. No app, no password.",
  },
  {
    n: "2",
    title: "Shortlist and vote",
    copy: "Add stays from anywhere. Celtivo prices them per person automatically.",
  },
  {
    n: "3",
    title: "Money handles itself",
    copy: "Each friend pays their own share to the booking. Reminders included.",
  },
];

export function CreateTripForm() {
  const draftName = useTripDraft((state) => state.name);
  const setDraftName = useTripDraft((state) => state.setName);
  const createTrip = useCreateTrip();
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: { name: draftName, destination: "", roughDates: "", groupSize: "9-15" },
  });

  // The draft rehydrates from sessionStorage after mount; pick it up if the
  // organiser hasn't started typing here yet.
  useEffect(() => {
    if (!form.formState.dirtyFields.name) form.setValue("name", draftName);
  }, [draftName, form]);

  const name = useWatch({ control: form.control, name: "name" }) ?? "";
  const title = tripTitle(name);
  const inviteUrl = createTrip.data?.inviteUrl ?? `celtivo.com/join/${slugify(title)}`;
  const { errors } = form.formState;

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid lg:grid-cols-2">
      <form
        noValidate
        className="px-[clamp(28px,4vw,56px)] pt-11 pb-12"
        onSubmit={form.handleSubmit((values) => createTrip.mutate(values))}
      >
        <h1 className="m-0 mb-2.5 text-[32px] leading-[1.14] tracking-[-0.018em] text-neutral-900">
          Let&apos;s make it real
        </h1>
        <p className="mb-8 max-w-[44ch] text-[15px] leading-[25px] text-neutral-700">
          Two things now, the rest when the group shows up.
        </p>

        <Field
          label="Trip name"
          htmlFor="trip-name"
          error={errors.name?.message}
          className="mb-[22px]"
        >
          <Input
            id="trip-name"
            placeholder={EXAMPLE_TRIP_NAME}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            className="min-h-[46px] text-[17px]"
            {...form.register("name", { onChange: (event) => setDraftName(event.target.value) })}
          />
        </Field>

        <div className="mb-[22px] grid gap-4 sm:grid-cols-2">
          <Field label="Where to" hint="optional" htmlFor="trip-destination">
            <Input
              id="trip-destination"
              placeholder="Chamonix, France"
              {...form.register("destination")}
            />
          </Field>
          <Field label="Rough dates" hint="optional" htmlFor="trip-dates">
            <Input
              id="trip-dates"
              placeholder="Early February 2027"
              {...form.register("roughDates")}
            />
          </Field>
        </div>

        <div className="mb-[26px] flex flex-col">
          <span id="group-size-label" className="mb-[5px] block text-xs text-neutral-700">
            How many of you?
          </span>
          <Controller
            control={form.control}
            name="groupSize"
            render={({ field }) => (
              <SegmentedControl
                aria-labelledby="group-size-label"
                options={GROUP_SIZES}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="mb-[26px] rule-fade" />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            className="px-[22px]"
            disabled={createTrip.isPending || createTrip.isSuccess}
          >
            {createTrip.isSuccess ? `${createTrip.data.name} created` : `Create ${title}`}
          </Button>
          <span role="status" className="text-[12.5px] text-neutral-600">
            {createTrip.isError
              ? createTrip.error.message
              : createTrip.isSuccess
                ? "Done. Send the invite link to the group."
                : "You'll get an invite link on the next screen."}
          </span>
        </div>
      </form>

      <aside className="bg-section bg-[radial-gradient(600px_300px_at_90%_-10%,var(--color-section-glow),transparent_66%)] px-[clamp(24px,3vw,40px)] pt-11 pb-12">
        <h2 className="mb-5 block font-sans text-[11px] font-normal tracking-[0.1em] text-accent-300 uppercase">
          Then, all at once
        </h2>
        <ol className="m-0 list-none p-0">
          {nextSteps.map((step) => (
            <li key={step.n} className="flex gap-3 pb-5">
              <span
                aria-hidden="true"
                className="grid size-[22px] flex-none place-items-center rounded-full bg-accent-500 text-[11px] text-accent-900 tabular-nums"
              >
                {step.n}
              </span>
              <div>
                <p className="m-0 mb-[3px] text-[14.5px] leading-[21px] font-medium text-neutral-100">
                  {step.title}
                </p>
                <p className="m-0 text-[13px] leading-5 text-[color-mix(in_srgb,var(--color-neutral-100)_74%,transparent)]">
                  {step.copy}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-end gap-3 rounded-control border border-section-ghost bg-[color-mix(in_srgb,var(--color-neutral-100)_12%,transparent)] p-3.5">
          <div className="min-w-0 flex-1">
            <p className="m-0 mb-2 text-xs text-[color-mix(in_srgb,var(--color-neutral-100)_70%,transparent)]">
              Invite link, ready to paste
            </p>
            <p className="m-0 text-[13px] break-all text-accent-300 tabular-nums">{inviteUrl}</p>
          </div>
          {createTrip.isSuccess && (
            <button
              type="button"
              onClick={copyInvite}
              aria-label={copied ? "Invite link copied" : "Copy invite link"}
              className="grid size-9 flex-none cursor-pointer place-items-center rounded-md text-accent-300 transition-colors hover:bg-section-ghost"
            >
              {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
