/** Cyclo's avatar: a little rolling wheel with its tracing point. */
export function CycloMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="var(--surface-soft)" stroke="color-mix(in srgb, var(--secondary) 55%, transparent)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="var(--secondary-soft)" strokeWidth="2" />
      <path d="M20 9 V31 M9 20 H31" stroke="color-mix(in srgb, var(--secondary-soft) 45%, transparent)" strokeWidth="1.2" />
      <circle cx="20" cy="31" r="3.6" fill="var(--primary)" />
      <circle cx="16.5" cy="17.5" r="1.3" fill="var(--text)" />
      <circle cx="23.5" cy="17.5" r="1.3" fill="var(--text)" />
    </svg>
  );
}
