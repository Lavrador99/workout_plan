import { useRef, useState, type PointerEvent } from "react";

/**
 * Drag-to-reorder with a handle (works with touch: the handle captures the
 * pointer and blocks scrolling). The order is previewed while dragging and
 * committed on release.
 */
export function useReorder<T extends { id: string }>(items: T[], commit: (next: T[]) => void) {
  const nodes = useRef(new Map<string, HTMLElement | null>());
  const [drag, setDrag] = useState<{ id: string; order: string[] } | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = drag ? drag.order.map((id) => byId.get(id)).filter((i): i is T => !!i) : items;

  const ref = (id: string) => (el: HTMLElement | null) => {
    nodes.current.set(id, el);
  };

  const handle = (id: string) => ({
    style: { touchAction: "none" as const },
    onPointerDown(e: PointerEvent<HTMLElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ id, order: items.map((i) => i.id) });
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (!drag) return;
      const others = drag.order.filter((x) => x !== id);
      let at = others.findIndex((x) => {
        const r = nodes.current.get(x)?.getBoundingClientRect();
        return r && e.clientY < r.top + r.height / 2;
      });
      if (at < 0) at = others.length;
      const order = [...others.slice(0, at), id, ...others.slice(at)];
      if (order.join() !== drag.order.join()) setDrag({ id, order });
    },
    onPointerUp() {
      if (!drag) return;
      const moved = drag.order.join() !== items.map((i) => i.id).join();
      setDrag(null);
      if (moved) commit(ordered);
    },
    onPointerCancel() {
      setDrag(null);
    },
  });

  return { ordered, ref, handle, dragging: drag?.id ?? null };
}
