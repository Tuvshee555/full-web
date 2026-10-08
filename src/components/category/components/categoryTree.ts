/* eslint-disable @typescript-eslint/no-unused-expressions */
export type Category = {
  id: string;
  categoryName: string;
  parentId: string | null;
};

export type CategoryNode = Category & {
  children: CategoryNode[];
};

export function buildTree(flat: Category[] = []) {
  const map = new Map<string, CategoryNode>();
  for (const c of flat) map.set(c.id, { ...c, children: [] });

  const roots: CategoryNode[] = [];

  for (const c of flat) {
    const node = map.get(c.id);
    if (!node) continue;

    if (c.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(c.parentId);
      parent ? parent.children.push(node) : roots.push(node);
    }
  }

  return { roots };
}
