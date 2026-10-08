export const getMediaUrl = (media?: string | File): string => {
  if (!media) return "/placeholder.png";
  return typeof media === "string" ? media : URL.createObjectURL(media);
};
