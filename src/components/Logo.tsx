export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">知</span>
      {compact ? null : <span>知识管理</span>}
    </div>
  );
}
