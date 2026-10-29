"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** A link to share, shown in full beside a button that copies it. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 rounded-control border border-section-ghost bg-[color-mix(in_srgb,var(--color-neutral-100)_12%,transparent)] p-3.5">
      <p className="m-0 text-[13px] break-all text-accent-300 tabular-nums">{url}</p>
      <Button size="lg" onClick={copy} className="w-full">
        {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <span role="status" className="sr-only">
        {copied ? "Trip link copied" : ""}
      </span>
    </div>
  );
}
