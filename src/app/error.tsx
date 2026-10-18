"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold">We couldn’t load this page.</h1>
      <p className="my-5 text-sm leading-7 text-muted-foreground">
        Please try again. If you’re setting up TrustCore Book, check the server
        environment and database connection.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
