import { Star } from 'lucide-react';

export default function StarRating({ rating, count, size = 'sm', showCount = true }) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const textSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizes[size]} ${
              star <= Math.floor(rating)
                ? 'text-amber-400 fill-amber-400'
                : star - 0.5 <= rating
                ? 'text-amber-400 fill-amber-400/50'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
      <span className={`${textSizes[size]} font-semibold text-gray-900 dark:text-white ml-0.5`}>
        {rating}
      </span>
      {showCount && count !== undefined && (
        <span className={`${textSizes[size]} text-gray-500 dark:text-gray-400`}>
          ({count})
        </span>
      )}
    </div>
  );
}
