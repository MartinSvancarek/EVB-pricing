"use client";
import { useTransition } from "react";
import { deleteUser } from "../actions";

export function DeleteUserButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-danger text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm("Smazat uživatele?")) return;
        start(async () => deleteUser(id));
      }}
    >
      Smazat
    </button>
  );
}
