import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Rendu Markdown serveur — 100% Mobile-Friendly & Anti-débordement
 * Support GFM complet : tableaux avec scroll tactile, blocs de code sécurisés,
 * typographie adaptative et zéro débordement horizontal sur écran 320px–375px.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("prose-b2b w-full min-w-0 max-w-full break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node: _n, ...props }) => (
            <h2
              className="mt-8 mb-4 text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words"
              {...props}
            />
          ),
          h2: ({ node: _n, ...props }) => (
            <h2
              className="mt-10 mb-4 text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words"
              {...props}
            />
          ),
          h3: ({ node: _n, ...props }) => (
            <h3
              className="mt-8 mb-3 text-lg sm:text-xl font-semibold text-foreground break-words"
              {...props}
            />
          ),
          h4: ({ node: _n, ...props }) => (
            <h4
              className="mt-6 mb-2 text-base sm:text-lg font-semibold text-foreground break-words"
              {...props}
            />
          ),
          p: ({ node: _n, ...props }) => (
            <p
              className="my-4 text-[15px] sm:text-[15.5px] leading-7 text-foreground/90 break-words"
              {...props}
            />
          ),
          ul: ({ node: _n, ...props }) => (
            <ul
              className="my-4 space-y-2 pl-1 break-words"
              {...props}
            />
          ),
          ol: ({ node: _n, ...props }) => (
            <ol
              className="my-4 space-y-2 list-decimal pl-5 text-[15px] sm:text-[15.5px] leading-7 text-foreground/90 break-words"
              {...props}
            />
          ),
          li: ({ node: _n, ...props }) => (
            <li
              className="text-[15px] sm:text-[15.5px] leading-7 text-foreground/90 break-words"
              {...props}
            />
          ),
          blockquote: ({ node: _n, ...props }) => (
            <blockquote
              className="my-6 rounded-r-xl border-l-4 border-primary bg-accent/30 px-4 py-3 sm:px-5 italic text-[14.5px] sm:text-[15px] leading-7 break-words"
              {...props}
            />
          ),
          a: ({ node: _n, href, children, ...props }) => (
            <a
              href={href}
              className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary break-words [overflow-wrap:anywhere]"
              {...props}
            >
              {children}
            </a>
          ),
          table: ({ node: _n, children }) => (
            <div className="my-6 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between border-b border-border/80 bg-muted/60 px-3.5 py-1.5 text-[11.5px] text-muted-foreground select-none">
                <span className="font-semibold text-foreground/80">Tableau comparatif</span>
                <span className="text-[10px] font-medium text-primary sm:hidden">Glisser horizontalement ↔</span>
              </div>
              <div className="w-full min-w-0 max-w-full overflow-x-auto touch-pan-x">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  {children}
                </table>
              </div>
            </div>
          ),
          pre: ({ node: _n, children, ...props }) => (
            <div className="my-6 w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-muted/60 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/90 px-3.5 py-1.5 text-[11px] font-mono text-muted-foreground select-none">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500/80 animate-pulse" />
                  Extrait de code / Syntaxe
                </span>
                <span className="text-[10px] text-muted-foreground/80 sm:hidden">Glisser ↔</span>
              </div>
              <pre
                className="w-full min-w-0 max-w-full overflow-x-auto p-3.5 sm:p-4 font-mono text-[12.5px] sm:text-[13px] leading-6 text-foreground touch-pan-x"
                {...props}
              >
                {children}
              </pre>
            </div>
          ),
          code: ({ node: _n, className, children, ...props }) => {
            return (
              <code className={cn("font-mono text-[12.5px] sm:text-[13px]", className)} {...props}>
                {children}
              </code>
            );
          },
          img: ({ node: _n, src, alt, ...props }) => (
            <span className="my-6 block overflow-hidden rounded-xl border border-border shadow-xs">
              <img
                src={src}
                alt={alt || ""}
                loading="lazy"
                className="h-auto w-full max-w-full object-cover"
                {...props}
              />
            </span>
          ),
          hr: ({ node: _n, ...props }) => (
            <hr className="my-8 border-border/80" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
