import React, { useCallback, useRef, useState } from 'react';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

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
  children,
}: DragAndDropProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const lastItemsRef = useRef(items);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!event?.active?.id) return;

    setActiveId(event.active.id as string);
    isDraggingRef.current = true;
    lastItemsRef.current = [...items];
  };

  const debouncedReorder = useCallback(
    (newItems: T[]) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        // Validate that items haven't changed since drag started
        const currentIds = items?.map((item) => item?.id).filter(Boolean) || [];
        const lastIds = lastItemsRef.current?.map((item) => item?.id).filter(Boolean) || [];

        if (JSON.stringify(currentIds) === JSON.stringify(lastIds) && onReorder) {
          onReorder(newItems);
        }
        debounceTimerRef.current = null;
      }, 100);
    },
    [items, onReorder]
  );

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!isDraggingRef.current || !active?.id || !over?.id || active.id === over.id) {
      return;
    }

    const activeIndex = items?.findIndex((item) => item?.id === active.id) ?? -1;
    const overIndex = items?.findIndex((item) => item?.id === over.id) ?? -1;

    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      const newItems = arrayMove(items || [], activeIndex, overIndex);
      debouncedReorder(newItems);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    isDraggingRef.current = false;
    setActiveId(null);

    if (!over?.id) {
      return;
    }

    if (active?.id && over.id && active.id !== over.id) {
      const activeIndex = items?.findIndex((item) => item?.id === active.id) ?? -1;
      const overIndex = items?.findIndex((item) => item?.id === over.id) ?? -1;

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newItems = arrayMove(items || [], activeIndex, overIndex);

        // Clear any pending debounced calls and execute immediately
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }

        onReorder?.(newItems);
      }
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  return {
    activeId,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

export { closestCenter, DndContext, SortableContext };
