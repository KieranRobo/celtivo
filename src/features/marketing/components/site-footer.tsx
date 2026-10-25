const footerLink = "text-inherit no-underline hover:text-accent-600";

export function SiteFooter() {
  return (
    <footer className="container-page flex flex-wrap items-center gap-5 pt-8 pb-14 text-[13px] text-neutral-600">
      <span className="mr-auto">Celtivo — group travel, minus the admin.</span>
      <a href="#how" className={footerLink}>
        How it works
      </a>
      <a href="#what" className={footerLink}>
        Pricing
      </a>
      <a href="/support" className={footerLink}>
        Support
      </a>
    </footer>
  );
}
