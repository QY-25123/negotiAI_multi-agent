interface Props { name: string; initials: string; color: string; size?: "sm" | "md" | "lg"; }
const SIZES = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
export function CompanyAvatar({ name, initials, color, size = "md" }: Props) {
  return (
    <div
      title={name}
      className={`${SIZES[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none`}
      style={{ backgroundColor: color }}
    >
      {initials || name.slice(0, 2).toUpperCase()}
    </div>
  );
}
