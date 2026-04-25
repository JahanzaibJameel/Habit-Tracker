import type React from 'react';
import { useCallback, useRef, useState } from 'react';

interface DragAndDropProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  getItemId?: (item: T) => string;
  children?: (items: T[]) => React.ReactNode;
}

export function useDragAndDrop<T extends { id: string }>({
  items = [],
  onReorder,
  getItemId,
  children: _children,
}: DragAndDropProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const _lastItemsRef = useRef(items);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragStart = useCallback((itemId: string) => {
    setActiveId(itemId);
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(
    (itemId: string, newIndex: number) => {
      if (!isDraggingRef.current) {
        return;
      }

      const oldIndex = items.findIndex((item) =>
        getItemId ? getItemId(item) === itemId : item.id === itemId
      );

      if (oldIndex !== -1 && oldIndex !== newIndex) {
        const newItems = [...items];
        const movedItem = newItems.splice(oldIndex, 1)[0];
        if (movedItem) {
          newItems.splice(newIndex, 0, movedItem);
        }

        // Debounce the reorder call
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          onReorder(newItems);
        }, 100);
      }

      setActiveId(null);
      isDraggingRef.current = false;
    },
    [items, onReorder, getItemId]
  );

  const handleDragOver = useCallback((_itemId: string, _targetIndex: number) => {
    // Handle drag over logic if needed
  }, []);

  const reset = useCallback(() => {
    setActiveId(null);
    isDraggingRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  return {
    activeId,
    isDragging: isDraggingRef.current,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    reset,
    items,
  };
}
