export default function Loading() {
  return (
    <div className="max-w-4xl" role="status" aria-live="polite">
      <h1 className="text-3xl font-semibold">Members</h1>
      <p className="mt-7 text-sm text-muted-foreground">Loading members...</p>
    </div>
  );
}
