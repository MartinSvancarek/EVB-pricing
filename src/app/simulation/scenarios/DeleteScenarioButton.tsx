"use client";
import { useTransition } from "react";
import { deleteScenario } from "../actions";

export function DeleteScenarioButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-danger text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm("Smazat scénář?")) return;
        start(async () => {
          const fd = new FormData();
          fd.set("id", id);
          await deleteScenario(fd);
        });
      }}
    >
      Smazat
    </button>
  );
}
