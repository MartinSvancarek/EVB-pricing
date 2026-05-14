"use client";
import { useTransition } from "react";
import { setFunctionDataSource } from "../actions";

export function DataSourceSelect({ id, value }: { id: string; value: "manual" | "grafana" | "api" | "missing" }) {
  const [pending, start] = useTransition();
  return (
    <select
      className={`input text-xs ${pending ? "opacity-50" : ""}`}
      defaultValue={value}
      onChange={(e) => {
        const v = e.target.value as any;
        start(async () => {
          await setFunctionDataSource(id, v);
        });
      }}
    >
      <option value="manual">manual</option>
      <option value="grafana">grafana</option>
      <option value="api">api</option>
      <option value="missing">missing</option>
    </select>
  );
}
