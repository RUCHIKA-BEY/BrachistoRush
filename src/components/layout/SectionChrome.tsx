import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, House } from "lucide-react";
import type { ReactNode } from "react";
import { SECTIONS, sectionBySlug } from "@/lib/sections";
import { MarkVisited } from "./AppProviders";

export function Breadcrumbs({ slug }: { slug: string }) {
  const s = sectionBySlug(slug);
  if (!s) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="inline-flex items-center gap-1 rounded hover:text-fg">
            <House className="h-3.5 w-3.5" aria-hidden="true" /> Home
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        <li className="text-muted">Step {s.step} of {SECTIONS.length}</li>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
        <li aria-current="page" className="font-semibold text-primary-soft">
          {s.short}
        </li>
      </ol>
    </nav>
  );
}

export function SectionHeader({ slug, children, aside }: { slug: string; children?: ReactNode; aside?: ReactNode }) {
  const s = sectionBySlug(slug)!;
  return (
    <header className="flex flex-col gap-4 pb-6 pt-6 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
      <MarkVisited slug={slug} />
      <div className="max-w-3xl">
        <Breadcrumbs slug={slug} />
        <div className="mt-3 flex items-center gap-3">
          <span className="chip border-primary/30 bg-primary/10 text-primary-soft">Step {s.step}</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">{s.title}</h1>
        <p className="mt-2 text-base text-fg-2 sm:text-lg">{children ?? s.blurb}</p>
      </div>
      {aside}
    </header>
  );
}

export function SectionPager({ slug }: { slug: string }) {
  const i = SECTIONS.findIndex((s) => s.slug === slug);
  const prev = SECTIONS[i - 1];
  const next = SECTIONS[i + 1];
  return (
    <nav aria-label="Learning path" className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
      {prev ? (
        <Link href={prev.href} className="card group flex items-center gap-3 p-4 transition-colors hover:border-line-strong">
          <ArrowLeft className="h-5 w-5 text-muted transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          <span>
            <span className="block text-xs text-muted">Previous · Step {prev.step}</span>
            <span className="block font-semibold text-fg">{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className="card group flex items-center justify-end gap-3 p-4 text-right transition-colors hover:border-primary/40">
          <span>
            <span className="block text-xs text-muted">Next · Step {next.step}</span>
            <span className="block font-semibold text-fg">{next.title}</span>
          </span>
          <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}

export function ComingSoon({ slug, items }: { slug: string; items: { title: string; text: string }[] }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <SectionHeader slug={slug} />
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="atmosphere pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative">
          <span className="chip border-secondary/30 bg-secondary/10 text-secondary-soft">Being built next</span>
          <h2 className="mt-3 font-display text-xl font-semibold text-fg">What you'll find here</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => (
              <li key={it.title} className="rounded-2xl border border-line bg-surface-soft/60 p-4">
                <p className="font-semibold text-fg">{it.title}</p>
                <p className="mt-1 text-sm text-fg-2">{it.text}</p>
              </li>
            ))}
          </ul>
          <Link href="/lab" className="btn btn-primary mt-6">
            Meanwhile, try the Race Lab <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <SectionPager slug={slug} />
    </div>
  );
}
