/** The grip to drag a row by (props from useReorder's handle). */
export default function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label="Arrastar para reordenar" className="shrink-0 w-7 h-8 -ml-1 text-muted cursor-grab active:cursor-grabbing select-none" {...props}>
      ⠿
    </button>
  );
}
