export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'skeleton animate-pulse';
  const variants = {
    rect: `${base} ${className}`,
    circle: `${base} rounded-full ${className}`,
    text: `${base} h-4 rounded ${className}`,
  };

  return <div className={variants[variant]} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-0 overflow-hidden">
      <Skeleton className="w-full h-48" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-20 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 card">
          <Skeleton variant="circle" className="w-12 h-12" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
