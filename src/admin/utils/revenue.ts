export function calcTrend(current: number, previous: number) {
  if (previous === 0 && current === 0)
    return { value: 0, direction: "flat" as const };
  if (previous === 0) return { value: 100, direction: "up" as const };

  const diff = ((current - previous) / previous) * 100;
  const value = Math.round(Math.abs(diff));
  return {
    value,
    direction:
      diff > 0
        ? ("up" as const)
        : diff < 0
        ? ("down" as const)
        : ("flat" as const),
  };
}
