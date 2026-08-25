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
  headingIds?: string[];
};

export function createHeadingIds(headings: string[]) {
  const occurrences = new Map<string, number>();
  return headings.map((heading) => {
    const base = heading
      .normalize("NFKC")
      .replace(/[`*_~]/g, "")
      .replace(/[^A-Za-z0-9\u3400-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "section";
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    return occurrence ? `${base}-${occurrence + 1}` : base;
  });
}

export function WikiMarkdown({ markdown, onOpenNote, headingIds }: WikiMarkdownProps) {
  const components = useMemo(() => {
    let headingIndex = 0;
    const renderHeading = (level: 2 | 3, { children, ...props }: ComponentProps<"h2">) => {
      const id = headingIds?.[headingIndex] ?? props.id ?? `section-${headingIndex + 1}`;
      headingIndex += 1;
      return level === 2 ? <h2 {...props} id={id}>{children}</h2> : <h3 {...props} id={id}>{children}</h3>;
    };

    return {
    h2: (props: ComponentProps<"h2">) => renderHeading(2, props),
    h3: (props: ComponentProps<"h3">) => renderHeading(3, props),
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
    };
  }, [headingIds, markdown, onOpenNote]);

  return <Streamdown components={components}>{renderWikiSyntax(markdown)}</Streamdown>;
}
