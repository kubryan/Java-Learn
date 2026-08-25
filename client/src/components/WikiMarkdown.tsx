/**
 * Design reminder — 藍圖工作桌：文章中的 Wiki 連結應像同一張藍圖的交叉座標，清楚、可點且不打斷閱讀。
 */
import { useMemo, type ComponentProps } from "react";
import { Streamdown } from "streamdown";
import type { Note } from "@/lib/notes";
import { renderWikiSyntax, resolveWikiNote, wikiTargetFromHref } from "@/lib/wiki-links";

type WikiMarkdownProps = {
  markdown: string;
  onOpenNote: (note: Note) => void;
};

export function WikiMarkdown({ markdown, onOpenNote }: WikiMarkdownProps) {
  const components = useMemo(() => ({
    a: ({ href, children, ...props }: ComponentProps<"a">) => {
      const target = wikiTargetFromHref(href);
      if (!target) return <a href={href} {...props}>{children}</a>;

      const targetNote = resolveWikiNote(target);
      if (!targetNote) {
        return <span className="wiki-link-missing" title={`找不到 Wiki 筆記：${target}`}>{children}</span>;
      }

      return (
        <a
          href={`#note-${targetNote.slug}`}
          {...props}
          className="wiki-link"
          aria-label={`開啟 Wiki 筆記：${targetNote.title}`}
          title={`開啟：${targetNote.title}`}
          onClick={(event) => {
            event.preventDefault();
            onOpenNote(targetNote);
          }}
        >
          {children}
        </a>
      );
    },
  }), [onOpenNote]);

  return <Streamdown components={components}>{renderWikiSyntax(markdown)}</Streamdown>;
}
