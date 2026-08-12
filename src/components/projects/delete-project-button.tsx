"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";

// Two-step inline confirm instead of window.confirm: no blocking browser
// dialog, and the destructive action needs a second deliberate click.
const DeleteProjectButton = ({ projectId }: { projectId: string }) => {
  const router = useRouter();
  const [arming, setArming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDelete = async () => {
    setDeleting(true);
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setDeleting(false);
      setArming(false);
    }
  };

  if (!arming) {
    return (
      <button
        onClick={() => setArming(true)}
        className="shrink-0 rounded-md border border-edge px-3 py-1.5 text-xs text-dim transition-colors hover:border-danger hover:text-danger"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button
        onClick={onDelete}
        disabled={deleting}
        className="rounded-md bg-danger px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {deleting ? "Deleting…" : "Confirm"}
      </button>
      <button
        onClick={() => setArming(false)}
        disabled={deleting}
        className="rounded-md border border-edge px-3 py-1.5 text-xs text-dim"
      >
        Cancel
      </button>
    </span>
  );
};

export { DeleteProjectButton };
