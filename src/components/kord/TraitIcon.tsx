export function TraitIcon({ id, className }: { id: string; className?: string }) {
  return (
    <span
      className={className}
      style={{
        WebkitMaskImage: `url(/kord/icons/${id}.png)`,
        maskImage: `url(/kord/icons/${id}.png)`,
      }}
      aria-hidden="true"
    />
  );
}
