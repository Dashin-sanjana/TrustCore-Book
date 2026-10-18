import Link from "next/link";
import { Layers2 } from "lucide-react";
export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-bold tracking-tight text-xl"
      aria-label="TrustCore Book home"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Layers2 size={21} />
      </span>
      <span>
        TrustCore{" "}
        <span className="font-normal text-muted-foreground">Book</span>
      </span>
    </Link>
  );
}
