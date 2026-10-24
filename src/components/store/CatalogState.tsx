"use client";

import { PackageSearch } from "lucide-react";
import { useStoreT } from "./lib/useStoreT";

export function CatalogState({
  error = false,
  filtered = false,
  onAction,
}: {
  error?: boolean;
  filtered?: boolean;
  onAction?: () => void;
}) {
  const { st } = useStoreT();
  return (
    <div role={error ? "alert" : "status"} className="catalog-state">
      <PackageSearch
        className="mx-auto h-7 w-7 text-taupe"
        strokeWidth={1.2}
        aria-hidden
      />
      <h2 className="mt-4 text-xl font-medium text-ink">
        {st(
          error
            ? "catalogue_error_title"
            : filtered
              ? "no_matches_title"
              : "catalogue_empty_title",
        )}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-taupe">
        {st(
          error
            ? "catalogue_error"
            : filtered
              ? "no_matches_body"
              : "catalogue_empty_body",
        )}
      </p>
      {onAction && (
        <button type="button" onClick={onAction} className="btn-secondary mt-5">
          {st(error ? "retry" : "clear_all")}
        </button>
      )}
    </div>
  );
}
