export default function Loading() {
  return (
    <main
      id="main"
      className="mx-auto max-w-5xl p-8"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <p className="mb-6 text-sm text-muted-foreground" role="status">
        Loading your workspace…
      </p>
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-2/3 rounded-lg bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    </main>
  );
}
