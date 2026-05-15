"use client";
import { useTransition } from "react";
import { undoPackageChange } from "./actions";

export function UndoButton({ historyId }: { historyId: string }) {
  const [isPending, start] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => start(() => undoPackageChange(historyId))}
      className={`text-xs text-accent hover:underline ${isPending ? "opacity-50" : ""}`}
    >
      {isPending ? "…" : "Undo"}
    </button>
  );
}
