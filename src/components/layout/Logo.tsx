export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // a cycloid arch with a ball rushing down it
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect x="1" y="1" width="38" height="38" rx="11" fill="var(--surface-soft)" stroke="var(--border)" />
      <path d="M8 9 C 8.6 22, 14 30, 23 30 S 32 27, 33 23" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 9 L 33 23" stroke="var(--c-straight)" strokeWidth="1.4" strokeDasharray="2 2.5" strokeLinecap="round" opacity="0.8" />
      <circle cx="23" cy="30" r="3.4" fill="var(--primary)" />
      <circle cx="8" cy="9" r="2" fill="var(--text)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="font-display text-lg font-bold tracking-tight text-fg">
      Brachisto<span className="text-gradient">Rush</span>
    </span>
  );
}
