import { Construction } from "lucide-react";
import type { ModuleDefinition } from "@/features/registry";
import { Card } from "./ui/card";
export function ModulePlaceholder({ module }: { module: ModuleDefinition }) {
  return (
    <section aria-labelledby="module-title">
      <p className="eyebrow mb-3">Workspace module</p>
      <h1 id="module-title" className="text-3xl font-semibold">
        {module.title}
      </h1>
      <p className="my-5 max-w-2xl text-sm leading-7 text-muted-foreground">
        {module.summary}
      </p>
      <Card className="max-w-2xl">
        <Construction className="mb-4 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Not implemented</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          This module’s full workflow is planned. No action is available here
          yet.
        </p>
      </Card>
    </section>
  );
}
