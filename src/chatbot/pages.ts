// Only full-web configuration is allowed here; client page ids are never copied.
export function getPageDisplayName(pageId: string) { return pageId === process.env.META_PAGE_ID ? "Lorentz" : pageId; }
