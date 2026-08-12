"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// [token color class, text, render element revealed once this token finishes]
const TOKENS: ReadonlyArray<readonly [string, string, string?]> = [
  ["p", "<!"],
  ["t", "doctype html"],
  ["p", ">\n"],
  ["p", "<"],
  ["t", "html"],
  ["p", ">\n"],
  ["p", "  <"],
  ["t", "body"],
  ["p", ">\n"],
  ["p", "    <"],
  ["t", "h1"],
  ["p", ">"],
  ["x", "Hi, I'm Alice"],
  ["p", "</"],
  ["t", "h1"],
  ["p", ">\n", "h1"],
  ["p", "    <"],
  ["t", "p"],
  ["p", ">"],
  ["x", "I made this page with one\n    file and zero dependencies."],
  ["p", "</"],
  ["t", "p"],
  ["p", ">\n", "p1"],
  ["p", "    <"],
  ["t", "a"],
  ["x", " "],
  ["t", "href"],
  ["p", "="],
  ["s", '"mailto:alice@hey.com"'],
  ["p", ">"],
  ["x", "Say hello →"],
  ["p", "</"],
  ["t", "a"],
  ["p", ">\n", "a1"],
  ["p", "  </"],
  ["t", "body"],
  ["p", ">\n"],
  ["p", "</"],
  ["t", "html"],
  ["p", ">"],
];

const TOKEN_CLASS: Record<string, string> = {
  t: "text-code-tag",
  s: "text-code-str",
  p: "text-code-punc",
  x: "text-ink",
};

const TypewriterDemo = () => {
  const codeRef = useRef<HTMLElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());
  const [live, setLive] = useState(false);

  const play = useCallback(() => {
    const codeEl = codeRef.current;
    if (!codeEl) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    codeEl.textContent = "";
    setShown(new Set());
    setLive(false);

    const reveal = (key: string) => setShown((prev) => new Set(prev).add(key));

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const [cls, text, reveals] of TOKENS) {
        const span = document.createElement("span");
        span.className = TOKEN_CLASS[cls];
        span.textContent = text;
        codeEl.appendChild(span);
        if (reveals) reveal(reveals);
      }
      setLive(true);
      return;
    }

    let tokenIndex = 0;
    let charIndex = 0;
    let span: HTMLSpanElement | null = null;
    const step = () => {
      if (tokenIndex >= TOKENS.length) {
        timerRef.current = setTimeout(() => setLive(true), 500);
        return;
      }
      const [cls, text, reveals] = TOKENS[tokenIndex];
      if (charIndex === 0) {
        span = document.createElement("span");
        span.className = TOKEN_CLASS[cls];
        codeEl.appendChild(span);
      }
      if (span) span.textContent += text[charIndex];
      charIndex += 1;
      if (charIndex >= text.length) {
        if (reveals) reveal(reveals);
        tokenIndex += 1;
        charIndex = 0;
      }
      timerRef.current = setTimeout(step, 14 + Math.random() * 26);
    };
    step();
  }, []);

  useEffect(() => {
    const starter = setTimeout(play, 0);
    return () => {
      clearTimeout(starter);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [play]);

  const revealStyle = (key: string): React.CSSProperties => ({
    opacity: shown.has(key) ? 1 : 0,
    transform: shown.has(key) ? "none" : "translateY(5px)",
    transition: "opacity .3s ease, transform .3s ease",
  });

  return (
    <div className="grid overflow-hidden rounded-xl border border-edge bg-panel md:grid-cols-2">
      <div>
        <div className="flex min-h-9 items-center gap-2 border-b border-edge px-3.5 py-2 font-mono text-xs text-dim">
          <span className="flex gap-1.5">
            <i className="h-2 w-2 rounded-full bg-edge" />
            <i className="h-2 w-2 rounded-full bg-edge" />
            <i className="h-2 w-2 rounded-full bg-edge" />
          </span>
          hello.html
        </div>
        <pre className="min-h-[16.5rem] overflow-x-auto whitespace-pre p-4 font-mono text-[13px] leading-[1.65]">
          <code ref={codeRef} />
          <span className="ml-px inline-block h-[1.05em] w-[7px] translate-y-[3px] animate-caret bg-accent" />
        </pre>
      </div>

      <div className="flex flex-col border-t border-edge bg-[#fbfaf7] md:border-l md:border-t-0">
        <div className="flex min-h-9 items-center border-b border-[#e2ded2] bg-[#f1efe9] px-3.5 py-2">
          <span
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#e2ded2] bg-white px-3 py-0.5 font-mono text-xs transition-colors ${
              live ? "text-[#1d7a4f]" : "text-[#6d675d]"
            }`}
          >
            <span
              className={`h-[7px] w-[7px] rounded-full transition-colors ${
                live ? "bg-[#2eaf6e]" : "bg-[#cfcabc]"
              }`}
            />
            {live ? "alice.pa9es.com/hello" : "draft — not published"}
          </span>
        </div>
        <div className="flex-1 p-7 text-[#211f1c] [font-family:Georgia,serif]">
          <h3 className="mb-3 text-[1.7rem] font-semibold" style={revealStyle("h1")}>
            Hi, I&#39;m Alice
          </h3>
          <p
            className="mb-3 text-[15px] leading-relaxed text-[#46423b]"
            style={revealStyle("p1")}
          >
            I made this page with one file and zero dependencies.
          </p>
          <p className="text-[15px]" style={revealStyle("a1")}>
            <span className="cursor-pointer text-[#1a41c8] underline">
              Say hello →
            </span>
          </p>
        </div>
      </div>

      <div className="col-span-full flex items-center justify-between border-t border-edge px-3.5 py-2 text-xs text-faint">
        <span>this is the whole workflow</span>
        <button
          onClick={play}
          className="rounded-md border border-edge px-2.5 py-1 text-dim transition-colors hover:border-faint hover:text-ink"
        >
          ↺ replay
        </button>
      </div>
    </div>
  );
};

export { TypewriterDemo };
