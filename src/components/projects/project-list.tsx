"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import type { ProjectSummary } from "@/src/schemas/project";
import { DeleteProjectButton } from "@/src/components/projects/delete-project-button";

// Dashboard page list with manual ordering. Drag the ⠿ handle (pointer
// events, so touch works too) or focus it and use the arrow keys. Reorders
// are optimistic: the settled order POSTs /api/projects/reorder (debounced,
// full id list) and reverts to the last server-confirmed order on failure.
//
// Row transforms during a drag are imperative (never React-rendered) so the
// list doesn't re-render per pointer move; state changes only on settle.

const reducedMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

type DragState = {
  id: string;
  index: number;
  startY: number;
  height: number;
  shift: number;
  moved: boolean;
};

const ProjectList = ({
  projects,
  liveUrlPrefix,
}: {
  projects: ProjectSummary[];
  // "https://alice.pa9es.com/" — null when the account has no username.
  liveUrlPrefix: string | null;
}) => {
  // Rows are derived, not copied: props stay the server's truth (deletes
  // re-render the page via router.refresh()) and orderIds overlays the
  // user's reordering. Ids that vanished drop out; projects the overlay
  // doesn't know yet go on top, matching the server's new-page placement.
  const [orderIds, setOrderIds] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  let rows = projects;
  if (orderIds !== null) {
    const byId = new Map(projects.map((row) => [row.id, row]));
    const known = new Set(orderIds);
    rows = [
      ...projects.filter((row) => !known.has(row.id)),
      ...orderIds
        .map((id) => byId.get(id))
        .filter((row): row is ProjectSummary => row !== undefined),
    ];
  }

  const rowEls = useRef(new Map<string, HTMLLIElement>());
  const dragRef = useRef<DragState | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedIdsRef = useRef(projects.map((project) => project.id));
  // Visual row tops captured just before a reorder render; the layout effect
  // below FLIPs from them so rows glide instead of jumping.
  const flipTopsRef = useRef<Map<string, number> | null>(null);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  // Reorders the list with a FLIP: capture where each row is (transforms
  // included), drop all inline styles, render the new order, then animate
  // each row from its captured position to its new one.
  const applyOrderIds = (ids: string[]) => {
    const tops = new Map<string, number>();
    if (!reducedMotion()) {
      for (const [id, el] of rowEls.current) {
        tops.set(id, el.getBoundingClientRect().top);
      }
    }
    for (const el of rowEls.current.values()) {
      el.style.transition = "";
      el.style.transform = "";
    }
    flipTopsRef.current = tops.size > 0 ? tops : null;
    setOrderIds(ids);
  };

  useLayoutEffect(() => {
    const tops = flipTopsRef.current;
    flipTopsRef.current = null;
    if (!tops) return;
    const moved: HTMLLIElement[] = [];
    for (const [id, el] of rowEls.current) {
      const prev = tops.get(id);
      if (prev === undefined) continue;
      const delta = prev - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      moved.push(el);
    }
    if (moved.length === 0) return;
    void moved[0].offsetHeight;
    for (const el of moved) {
      el.style.transition = "transform 0.2s cubic-bezier(0.2, 0.7, 0.3, 1)";
      el.style.transform = "";
    }
    const timer = setTimeout(() => {
      for (const el of moved) el.style.transition = "";
    }, 250);
    return () => clearTimeout(timer);
  }, [orderIds]);

  const persistSoon = (orderedIds: string[]) => {
    setError(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api<ProjectSummary[]>("/api/projects/reorder", {
          method: "POST",
          body: JSON.stringify({ orderedIds }),
        });
        lastSyncedIdsRef.current = orderedIds;
      } catch (requestError) {
        // Revert to the last order the server confirmed; the derivation
        // drops ids that vanished in the meantime.
        applyOrderIds(lastSyncedIdsRef.current);
        setError(
          requestError instanceof Error ? requestError.message : "Reorder failed",
        );
      }
    }, 400);
  };

  // Handlers are recreated every render, so they close over the current
  // derived rows — no ref indirection needed.
  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;
    const next = [...rows];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    const ids = next.map((r) => r.id);
    applyOrderIds(ids);
    persistSoon(ids);
    setAnnouncement(`${row.title} moved to position ${to + 1} of ${next.length}`);
  };

  // Drag: transforms follow the pointer; rows between the start and the
  // current slot shift by one row height. Nothing commits until release.
  const onGripDown = (id: string) => (event: React.PointerEvent) => {
    if (dragRef.current || (event.pointerType === "mouse" && event.button !== 0))
      return;
    const el = rowEls.current.get(id);
    if (!el) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id,
      index: rows.findIndex((row) => row.id === id),
      startY: event.clientY,
      height: el.getBoundingClientRect().height,
      shift: 0,
      moved: false,
    };
    setDraggingId(id);
  };

  const onGripMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const el = rowEls.current.get(drag.id);
    if (!el) return;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dy) > 3) drag.moved = true;
    el.style.transition = "none";
    el.style.transform = `translateY(${dy}px)`;
    const shift = Math.max(
      -drag.index,
      Math.min(rows.length - 1 - drag.index, Math.round(dy / drag.height)),
    );
    if (shift === drag.shift) return;
    drag.shift = shift;
    rows.forEach((row, index) => {
      if (row.id === drag.id) return;
      const other = rowEls.current.get(row.id);
      if (!other) return;
      let offset = 0;
      if (shift > 0 && index > drag.index && index <= drag.index + shift) {
        offset = -drag.height;
      } else if (shift < 0 && index < drag.index && index >= drag.index + shift) {
        offset = drag.height;
      }
      other.style.transition = reducedMotion() ? "none" : "transform 0.16s ease";
      other.style.transform = offset ? `translateY(${offset}px)` : "";
    });
  };

  const onGripUp = (cancelled: boolean) => () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const el = rowEls.current.get(drag.id);
    if (!cancelled && el && drag.moved && drag.shift !== 0) {
      // Glide the dragged row into its slot, then commit: the FLIP in
      // applyOrderIds starts from the settled positions, so nothing jumps.
      el.style.transition = reducedMotion() ? "none" : "transform 0.15s ease";
      el.style.transform = `translateY(${drag.shift * drag.height}px)`;
      settleTimerRef.current = setTimeout(
        () => {
          setDraggingId(null);
          move(drag.index, drag.index + drag.shift);
        },
        reducedMotion() ? 0 : 150,
      );
      return;
    }
    // No slot change — ease every row back to its natural position.
    setDraggingId(null);
    for (const other of rowEls.current.values()) {
      other.style.transition = reducedMotion() ? "none" : "transform 0.18s ease";
      other.style.transform = "";
    }
    settleTimerRef.current = setTimeout(() => {
      for (const other of rowEls.current.values()) other.style.transition = "";
    }, 220);
  };

  const onGripKeyDown = (id: string) => (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const index = rows.findIndex((row) => row.id === id);
    move(index, index + (event.key === "ArrowUp" ? -1 : 1));
  };

  return (
    <>
      {error && (
        <p className="mb-2 text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y divide-edge border-y border-edge">
        {rows.map((project) => {
          // Row click opens the public page; drafts (and accounts that
          // somehow lack a username) get an inert row. Editing moved
          // behind the explicit Edit button.
          const liveHref =
            project.isPublished && liveUrlPrefix
              ? `${liveUrlPrefix}${project.slug}`
              : null;
          const rowClass =
            "flex min-w-0 flex-1 items-baseline justify-between gap-3 px-2.5 py-3.5";
          const row = (
            <>
              <span className="min-w-0 truncate">
                {project.iconEmoji && (
                  <span className="mr-1.5">{project.iconEmoji}</span>
                )}
                <span className="text-sm font-medium text-ink">{project.title}</span>
                <span className="ml-2.5 font-mono text-xs text-dim">
                  /{project.slug}
                </span>
              </span>
              <span
                className={`flex shrink-0 items-center gap-1.5 font-mono text-xs ${
                  project.isPublished ? "text-live" : "text-dim"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    project.isPublished ? "bg-live" : "bg-faint"
                  }`}
                />
                {project.isPublished ? "live ↗" : "draft"}
              </span>
            </>
          );
          return (
            <li
              key={project.id}
              ref={(el) => {
                if (el) rowEls.current.set(project.id, el);
                else rowEls.current.delete(project.id);
              }}
              className={`flex items-center gap-2 ${
                draggingId === project.id
                  ? "relative z-10 rounded-lg bg-panel shadow-lg"
                  : ""
              }`}
            >
              {rows.length > 1 && (
                <button
                  type="button"
                  aria-label={`Reorder ${project.title} — use arrow keys`}
                  onPointerDown={onGripDown(project.id)}
                  onPointerMove={onGripMove}
                  onPointerUp={onGripUp(false)}
                  onPointerCancel={onGripUp(true)}
                  onKeyDown={onGripKeyDown(project.id)}
                  className={`shrink-0 touch-none select-none rounded-md px-1 py-2 font-mono text-sm leading-none text-faint transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent ${
                    draggingId === project.id ? "cursor-grabbing" : "cursor-grab"
                  }`}
                >
                  ⠿
                </button>
              )}
              {liveHref ? (
                <a
                  href={liveHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`${rowClass} transition-colors hover:bg-panel`}
                >
                  {row}
                </a>
              ) : (
                <span className={rowClass}>{row}</span>
              )}
              <Link
                href={`/app/projects/${project.id}`}
                className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-xs text-dim transition-colors hover:border-accent hover:text-accent"
              >
                Edit
              </Link>
              <DeleteProjectButton projectId={project.id} />
            </li>
          );
        })}
      </ul>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  );
};

export { ProjectList };
