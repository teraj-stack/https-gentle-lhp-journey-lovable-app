import React, { lazy, Suspense } from "react";
import DOMPurify from "dompurify";

const chartComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  effectiveness: lazy(() => import("@/components/blog/EffectivenessChart")),
  hemoroid: lazy(() => import("@/components/blog/HemoroidComparisonChart")),
};
const formatInline = (text: string) =>
  text
    .replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground font-semibold'>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");

const renderTable = (headerLine: string, rows: string[], key: number): React.ReactNode => {
  const parseRow = (line: string) =>
    line.split("|").filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim());
  const headers = parseRow(headerLine);

  return (
    <div key={key} className="overflow-x-auto mb-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-3 border-b-2 border-primary/20 text-foreground font-semibold text-xs uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const cells = parseRow(row);
            return (
              <tr key={ri} className={ri % 2 === 0 ? "bg-muted/30" : ""}>
                {cells.map((cell, ci) => (
                  <td key={ci} className="py-2 px-3 border-b border-border text-muted-foreground" dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const renderMarkdown = (content: string): React.ReactNode[] => {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-6 space-y-1 text-muted-foreground mb-6">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith("|") && lines[i + 1]?.trim().startsWith("|") && lines[i + 1]?.includes("---")) {
      flushList();
      const headerLine = line;
      i++; // skip separator
      const tableRows: string[] = [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
        i++;
        tableRows.push(lines[i]);
      }
      elements.push(renderTable(headerLine, tableRows, i));
      continue;
    }

    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={i} className="text-lg font-semibold font-serif text-foreground mt-6 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={i} className="text-xl font-semibold font-serif text-foreground mt-8 mb-3">
          {line.slice(3)}
        </h2>
      );
    } else if (line.trim() === "---") {
      flushList();
      elements.push(<hr key={i} className="border-border my-8" />);
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
    } else if (line.match(/^\d+\.\s/)) {
      flushList();
      listItems.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim().match(/^\[chart:(\w+)\]$/)) {
      flushList();
      const chartId = line.trim().match(/^\[chart:(\w+)\]$/)![1];
      const ChartComponent = chartComponents[chartId];
      if (ChartComponent) {
        elements.push(
          <Suspense key={`chart-${i}`} fallback={<div className="h-[360px] rounded-2xl bg-muted/20 animate-pulse" />}>
            <ChartComponent />
          </Suspense>
        );
      }
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      elements.push(
        <p
          key={i}
          className="text-muted-foreground leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
  }
  flushList();
  return elements;
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => (
  <div className={className}>{renderMarkdown(content)}</div>
);

export default MarkdownRenderer;
