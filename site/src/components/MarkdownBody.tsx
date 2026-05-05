import { Fragment, useMemo } from "react"

// ─── Types ─────────────────────────────────────────────────────────────────
type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "blockquote"; text: string }
  | { type: "code"; text: string }
  | { type: "p"; text: string }

// ─── Inline renderer — **bold**, *italic*, `code` ──────────────────────────
function renderInline(text: string): JSX.Element {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/)
  return (
    <Fragment>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i}>{part.slice(1, -1)}</em>
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i}>{part.slice(1, -1)}</code>
        return <Fragment key={i}>{part}</Fragment>
      })}
    </Fragment>
  )
}

// ─── Block parser ──────────────────────────────────────────────────────────
function parseBlocks(src: string): Block[] {
  const lines = src.split("\n")
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing ```
      blocks.push({ type: "code", text: codeLines.join("\n") })
      continue
    }

    // h2
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3) })
      i++
      continue
    }

    // h3
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4) })
      i++
      continue
    }

    // Table — collect all | lines then parse
    if (line.startsWith("|")) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i])
        i++
      }
      // Filter separator rows like |---|---|
      const dataLines = tableLines.filter(
        (l) => !/^\|[\s\-|:]+\|$/.test(l.trim())
      )
      const rows = dataLines.map((l) =>
        l
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim())
      )
      if (rows.length > 0) blocks.push({ type: "table", rows })
      continue
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: "ul", items })
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""))
        i++
      }
      blocks.push({ type: "ol", items })
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const parts: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        parts.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: "blockquote", text: parts.join(" ") })
      continue
    }

    // Empty line
    if (line.trim() === "") {
      i++
      continue
    }

    // Paragraph — accumulate non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("|") &&
      !/^[-*] /.test(lines[i]) &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("```") &&
      !/^\d+\. /.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "p", text: paraLines.join(" ") })
    }
  }

  return blocks
}

// ─── Component ─────────────────────────────────────────────────────────────
interface Props {
  src: string
}

export function MarkdownBody({ src }: Props) {
  const blocks = useMemo(() => parseBlocks(src), [src])

  return (
    <div className="md-body">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h2":
            return (
              <h3 key={idx} className="md-h2">
                {renderInline(block.text)}
              </h3>
            )
          case "h3":
            return (
              <h4 key={idx} className="md-h3">
                {renderInline(block.text)}
              </h4>
            )
          case "ul":
            return (
              <ul key={idx} className="md-ul">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            )
          case "ol":
            return (
              <ol key={idx} className="md-ol">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            )
          case "table":
            return (
              <div key={idx} className="md-table-wrap">
                <table className="md-table">
                  <thead>
                    <tr>
                      {block.rows[0]?.map((cell, j) => (
                        <th key={j}>{renderInline(cell)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.slice(1).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case "blockquote":
            return (
              <blockquote key={idx} className="md-blockquote">
                {renderInline(block.text)}
              </blockquote>
            )
          case "code":
            return (
              <pre key={idx} className="panel-code mono">
                {block.text}
              </pre>
            )
          case "p":
            return (
              <p key={idx} className="md-p">
                {renderInline(block.text)}
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
