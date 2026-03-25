"use client";

import { useEffect, useRef, useState } from "react";

import type { Store } from "@/lib/types";

export function StoreMultiSelect({
  stores,
  defaultSelectedIds,
  name,
  emptyLabel = "Select cafes",
  helperText
}: {
  stores: Store[];
  defaultSelectedIds: string[];
  name: string;
  emptyLabel?: string;
  helperText?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedIds(defaultSelectedIds);
  }, [defaultSelectedIds]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedStores = stores.filter((store) => selectedIds.includes(store.id));
  const summary =
    selectedStores.length > 0
      ? selectedStores.map((store) => store.name).join(", ")
      : emptyLabel;

  function toggleStore(storeId: string) {
    setSelectedIds((current) =>
      current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]
    );
  }

  return (
    <div ref={rootRef} className={`multi-select${isOpen ? " open" : ""}`}>
      {selectedIds.map((storeId) => (
        <input key={storeId} type="hidden" name={name} value={storeId} />
      ))}

      <button
        type="button"
        className="multi-select-trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={`multi-select-summary${selectedStores.length === 0 ? " placeholder" : ""}`}>{summary}</span>
        <span className="multi-select-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="multi-select-menu">
          <div className="multi-select-options" role="listbox" aria-multiselectable="true">
            {stores.map((store) => {
              const checked = selectedIds.includes(store.id);

              return (
                <label key={store.id} className={`multi-select-option${checked ? " selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStore(store.id)}
                    aria-label={`${store.name} (${store.code})`}
                  />
                  <span className="multi-select-option-copy">
                    <strong>{store.name}</strong>
                    <span>
                      {store.code} • {store.region}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {helperText ? <div className="multi-select-helper">{helperText}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
