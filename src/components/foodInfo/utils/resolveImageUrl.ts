// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolveImageUrl = (image: string | any) => {
  return typeof image === "string" ? image : "";
};
