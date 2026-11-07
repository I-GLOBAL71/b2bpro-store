import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Rendu Markdown serveur, styles prose-b2b (globals.css). Support GFM (tableaux, listes tâches). */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-b2b">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => <h2 {...props} />,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          code: ({ children, className, ...rest }) => {
            const isBlock = /language-/.test(className || "");
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-xl border border-border bg-muted/60 p-4 font-mono text-[13px] leading-6" {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-accent-foreground" {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
