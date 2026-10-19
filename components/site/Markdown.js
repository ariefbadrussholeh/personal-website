import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import CodeBlock from "./CodeBlock";

function langOf(node) {
  const cls = node?.children?.[0]?.properties?.className;
  const found = Array.isArray(cls) ? cls.find((c) => String(c).startsWith("language-")) : null;
  const lang = found ? String(found).replace("language-", "") : "";
  return lang === "plaintext" || lang === "text" ? "" : lang; // no label for untagged blocks
}

const components = {
  pre({ node, children }) {
    return <CodeBlock lang={langOf(node)}>{children}</CodeBlock>;
  },
  a({ href = "", children }) {
    const external = /^https?:\/\//.test(href);
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  // eslint-disable-next-line @next/next/no-img-element
  img({ src, alt }) {
    return <img src={src} alt={alt || ""} loading="lazy" />;
  },
};

export default function Markdown({ children, className = "" }) {
  return (
    <div className={`prose prose-invert prose-site ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={components}
      >
        {children || ""}
      </ReactMarkdown>
    </div>
  );
}
