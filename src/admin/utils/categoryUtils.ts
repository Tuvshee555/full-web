export type CategoryNode = {
  id: string;
  categoryName: string;
  parentId: string | null;
  children?: CategoryNode[];
  foodCount?: number;
};

/**
 * Flattens a nested category tree into a single-level array.
 * The resulting order is depth-first (parent before children).
 */
export function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  const walk = (node: CategoryNode) => {
    result.push(node);
    node.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return result;
}
