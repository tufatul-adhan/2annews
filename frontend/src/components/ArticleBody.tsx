import { createElement, type ReactNode } from 'react';

type SafeTag = 'p' | 'br' | 'h1' | 'h2' | 'h3' | 'h4' | 'ul' | 'ol' | 'li' | 'blockquote' | 'strong' | 'b' | 'em' | 'i' | 'u' | 's' | 'del' | 'sup' | 'sub' | 'small' | 'mark' | 'code' | 'pre' | 'hr' | 'figure' | 'figcaption' | 'table' | 'thead' | 'tbody' | 'tfoot' | 'tr' | 'th' | 'td' | 'caption' | 'a' | 'img';
const allowedTags = new Set([
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'sup', 'sub', 'small', 'mark', 'code', 'pre',
  'hr', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'a', 'img',
]);
const blockedTags = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'svg', 'math']);

function renderNode(node: ChildNode, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement)) return null;

  const tag = node.tagName.toLowerCase();
  if (blockedTags.has(tag)) return null;
  const children = Array.from(node.childNodes, (child, index) => renderNode(child, `${key}-${index}`));
  if (!allowedTags.has(tag)) return children;

  if (tag === 'a') {
    const href = node.getAttribute('href')?.trim() ?? '';
    if (!/^(https?:\/\/|mailto:|tel:|\/[^/]|#)/i.test(href)) return children;
    const external = /^https?:\/\//i.test(href);
    return createElement('a', { key, href, ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }, ...children);
  }
  if (tag === 'img') {
    const src = node.getAttribute('src')?.trim() ?? '';
    if (!/^(https?:\/\/|\/(?!\/))/i.test(src)) return null;
    return createElement('img', { key, src, alt: node.getAttribute('alt') ?? '', loading: 'lazy' });
  }

  const safeTag = tag === 'h1' ? 'h2' : tag;
  return createElement(safeTag as SafeTag, { key }, ...children);
}

/** Renders saved article markup using a small semantic allowlist without injecting raw HTML. */
export function ArticleBody({ content }: { content: string }) {
  if (!/<\/?[a-z][^>]*>/i.test(content)) {
    const paragraphs = content.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
    return <>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>;
  }

  const parsed = new DOMParser().parseFromString(content, 'text/html');
  return <>{Array.from(parsed.body.childNodes, (node, index) => renderNode(node, String(index)))}</>;
}
