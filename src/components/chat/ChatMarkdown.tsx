"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

/** Renders the tutor's Markdown + LaTeX. Internal links stay in the app; external links open safely in a new tab. */
export function ChatMarkdown({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a: ({ href, children }) => {
          if (href && href.startsWith("/")) {
            return (
              <Link href={href} onClick={onNavigate} className="font-semibold text-primary-soft underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
                {children}
              </Link>
            );
          }
          if (href && /^https?:\/\//.test(href)) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-secondary-soft underline underline-offset-2">
                {children}
              </a>
            );
          }
          return <span>{children}</span>;
        },
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
        h1: ({ children }) => <p className="mb-1 mt-3 font-display font-semibold text-fg">{children}</p>,
        h2: ({ children }) => <p className="mb-1 mt-3 font-display font-semibold text-fg">{children}</p>,
        h3: ({ children }) => <p className="mb-1 mt-3 font-semibold text-fg">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
        code: ({ children }) => <code className="rounded bg-surface-soft px-1 py-0.5 font-mono text-[0.85em] text-primary-soft">{children}</code>,
        pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-xl bg-surface-soft p-3 text-xs">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-secondary/50 pl-3 text-fg-2">{children}</blockquote>,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border-b border-line px-2 py-1 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b border-line px-2 py-1">{children}</td>,
        img: () => null,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
