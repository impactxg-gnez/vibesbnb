type Props = {
  className?: string;
};

/** Guest-facing chip when the host selected Balcony as an amenity. */
export function BalconyAvailableTag({ className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#0E7490]/35 bg-[#CFFAFE] px-2.5 py-0.5 text-xs font-semibold text-[#155E75] dark:border-sky-400/35 dark:bg-sky-500/15 dark:text-sky-100 ${className}`}
      title="This property has a balcony"
    >
      <span aria-hidden>🏙</span>
      Balcony available
    </span>
  );
}
