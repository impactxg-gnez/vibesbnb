'use client';

export function UnreadMessageBadge({
  count,
  className = '',
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center shadow-[0_2px_8px_rgba(239,68,68,0.55)] ring-2 ring-white dark:ring-[#193F25] ${className}`}
      aria-label={`${count} new message${count === 1 ? '' : 's'}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}
