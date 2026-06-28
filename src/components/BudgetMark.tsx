/**
 * The app's brand mark: a house with a budget fill-meter, echoing the
 * envelope-card fill meters used throughout the app. Self-contained (includes
 * its own rounded tile) so it can be dropped anywhere at any size.
 *
 *  - variant "tint"  (default): teal house on a soft teal-tint tile — for in-app use
 *  - variant "solid": white house on a solid teal tile — for the favicon / dark spots
 */
export default function BudgetMark({
  size = 36,
  variant = "tint",
  className,
}: {
  size?: number;
  variant?: "tint" | "solid";
  className?: string;
}) {
  const solid = variant === "solid";
  const tile = solid ? "#0E7C66" : "#E7F2EE";
  const roof = solid ? "#FFFFFF" : "#0E7C66";
  const bodyFill = solid ? "none" : "#FFFFFF";
  const bodyStroke = solid ? "#FFFFFF" : "#0E7C66";
  const track = solid ? "rgba(255,255,255,0.4)" : "#CFE6DE";
  const fill = solid ? "#FFFFFF" : "#0E7C66";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Household Budget"
      className={className}
    >
      <rect x="2" y="2" width="60" height="60" rx="15" fill={tile} />
      <path d="M11 30 L32 13 L53 30 Z" fill={roof} />
      <rect
        x="17"
        y="29"
        width="30"
        height="21"
        rx="3"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth="2.5"
      />
      <rect x="21" y="42" width="22" height="4" rx="2" fill={track} />
      <rect x="21" y="42" width="13" height="4" rx="2" fill={fill} />
    </svg>
  );
}
