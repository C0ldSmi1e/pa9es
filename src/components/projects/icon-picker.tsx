"use client";

import { useEffect, useRef, useState } from "react";
import { ICON_EMOJIS } from "@/src/config/icon-emojis";

// Site-icon chip + popover grid. Selection is reported upward; the editor
// owns persistence (PATCH) and the optimistic value.
const IconPicker = ({
  value,
  disabled,
  onSelect,
}: {
  value: string | null;
  disabled?: boolean;
  onSelect: (next: string | null) => void;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const pick = (next: string | null) => {
    setOpen(false);
    if (next !== value) onSelect(next);
  };

  // Random keeps the popover open so users can re-roll until one sticks.
  const roll = () => {
    let next = value;
    while (next === value) {
      next = ICON_EMOJIS[Math.floor(Math.random() * ICON_EMOJIS.length)];
    }
    onSelect(next);
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title="Site icon"
        className="flex h-7 w-7 items-center justify-center rounded-md border border-edge text-base transition-colors hover:border-faint disabled:opacity-40"
      >
        {value ?? <span className="text-xs text-faint">◌</span>}
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-72 rounded-xl border border-edge bg-panel p-2 shadow-lg">
          <div className="grid max-h-72 grid-cols-8 overflow-y-auto overscroll-contain">
            {ICON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => pick(emoji)}
                className={`rounded-md py-1 text-lg transition-colors hover:bg-ground ${
                  emoji === value
                    ? "bg-panel-2 shadow-[inset_0_0_0_1px_var(--color-accent)]"
                    : ""
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={roll}
              className="flex-1 rounded-md border border-edge px-2 py-1 text-xs font-medium text-dim transition-colors hover:text-ink"
            >
              🎲 Random
            </button>
            {value && (
              <button
                onClick={() => pick(null)}
                className="flex-1 rounded-md border border-edge px-2 py-1 text-xs font-medium text-dim transition-colors hover:text-ink"
              >
                Remove icon
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { IconPicker };
