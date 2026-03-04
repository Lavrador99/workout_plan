interface ProgressBarProps {
  done: number
  total: number
  className?: string
}

export function ProgressBar({ done, total, className = '' }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const complete = done === total && total > 0

  return (
    <div className={className}>
      <div className="flex justify-between text-[12px] text-muted mb-1">
        <span>Progresso da sessão</span>
        <span>{done}/{total} séries</span>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${complete ? 'bg-success' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
