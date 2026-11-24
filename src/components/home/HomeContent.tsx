"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, Gauge, Route, Zap } from "lucide-react";
import { useApp } from "@/components/layout/AppProviders";
import { SECTIONS } from "@/lib/sections";
import { HeroRace } from "./HeroRace";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } }),
};

const IDEAS = [
  { icon: <Zap className="h-5 w-5" />, title: "Drop steeply first", text: "A steep start converts height into speed right away.", tone: "text-ke" },
  { icon: <Gauge className="h-5 w-5" />, title: "Then cruise fast", text: "Being fast for most of the trip beats being on the shortest track.", tone: "text-primary-soft" },
  { icon: <Route className="h-5 w-5" />, title: "Longer ≠ slower", text: "The cycloid is ~10% longer than the straight ramp, yet ~20% quicker.", tone: "text-secondary-soft" },
];

export function HomeContent() {
  const { visited, openTour } = useApp();
  return (
    <>
      {/* ── hero ── */}
      <section className="atmosphere relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <motion.p custom={0} variants={fadeUp} initial="hidden" animate="show" className="chip border-primary/30 bg-primary/10 text-primary-soft">
              Physics that feels like magic
            </motion.p>
            <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="show" className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-5xl lg:text-6xl">
              The fastest way down <span className="text-gradient">isn&apos;t a straight line.</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="mt-5 max-w-xl text-lg text-fg-2">
              Race balls down different slopes, drag the finish line, add friction, and measure every run. Discover why a <strong className="text-primary-soft">longer curve</strong> beats the{" "}
              <strong className="text-straight">shortest path</strong>.
            </motion.p>
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mt-8 flex flex-wrap gap-3">
              <Link href="/lab" className="btn btn-primary !px-6 !py-3 !text-base">
                Enter the Race Lab <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/cycloid" className="btn btn-secondary !px-6 !py-3 !text-base">
                What&apos;s a cycloid?
              </Link>
              <button onClick={openTour} className="btn btn-ghost !py-3">
                Take the tour
              </button>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="card relative aspect-[16/11] overflow-hidden !bg-bg/60 glow-teal"
          >
            <HeroRace />
            <span className="chip absolute left-4 top-4">live simulation · slow motion</span>
          </motion.div>
        </div>
      </section>

      {/* ── key ideas ── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-labelledby="ideas-title">
        <h2 id="ideas-title" className="font-display text-2xl font-bold text-fg sm:text-3xl">
          The secret in three moves
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {IDEAS.map((idea, i) => (
            <motion.div
              key={idea.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1 }}
              className="card p-6"
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-surface-soft ${idea.tone}`}>{idea.icon}</span>
              <p className="mt-4 font-display text-lg font-semibold text-fg">
                <span className="mr-2 font-mono text-sm text-muted">0{i + 1}</span>
                {idea.title}
              </p>
              <p className="mt-1 text-sm text-fg-2">{idea.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── learning path ── */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6" aria-labelledby="path-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="path-title" className="font-display text-2xl font-bold text-fg sm:text-3xl">
              Your learning path
            </h2>
            <p className="mt-1 text-fg-2">Seven short steps. Go in order, or jump straight into the lab.</p>
          </div>
          <span className="chip">
            {visited.length} / {SECTIONS.length} explored
          </span>
        </div>
        <ol className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s, i) => {
            const done = visited.includes(s.slug);
            const hero = s.slug === "lab";
            return (
              <motion.li
                key={s.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06 }}
                className={hero ? "lg:col-span-2" : ""}
              >
                <Link
                  href={s.href}
                  className={`card group relative flex h-full flex-col p-5 transition-all hover:-translate-y-1 ${hero ? "border-primary/40 glow-teal" : "hover:border-line-strong"}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${done ? "bg-primary text-on-primary" : "bg-surface-soft text-fg-2 ring-1 ring-line"}`}>
                      {done ? <Check className="h-4 w-4" strokeWidth={3} /> : s.step}
                    </span>
                    {!s.ready && <span className="chip !text-[10px]">coming soon</span>}
                    {hero && <span className="chip border-primary/30 bg-primary/10 !text-[10px] text-primary-soft">main playground</span>}
                  </span>
                  <span className="mt-4 font-display text-lg font-semibold text-fg">{s.title}</span>
                  <span className="mt-1 flex-1 text-sm text-fg-2">{s.blurb}</span>
                  <ArrowRight className="mt-4 h-4 w-4 text-muted transition-all group-hover:translate-x-1 group-hover:text-primary-soft" aria-hidden="true" />
                </Link>
              </motion.li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
