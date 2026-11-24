import Link from "next/link";
import { SECTIONS } from "@/lib/sections";
import { LogoMark, Wordmark } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_2fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted">
            A digital lab for the cycloid and the brachistochrone — inspired by the Agastya International Foundation&apos;s hands-on “Cycloidal Path” model.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {SECTIONS.map((s) => (
              <li key={s.slug}>
                <Link href={s.href} className="text-fg-2 hover:text-primary-soft">
                  {s.step}. {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
