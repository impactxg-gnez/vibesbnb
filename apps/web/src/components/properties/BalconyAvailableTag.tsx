type Props = {
  className?: string;
};

/** Guest-facing chip when the host selected Balcony as an amenity. */
export function BalconyAvailableTag({ className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-100 ${className}`}
      title="This property has a balcony"
    >
      <span aria-hidden>🏙</span>
      Balcony available
    </span>
  );
}
