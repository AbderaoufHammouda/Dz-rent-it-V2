import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Star, Clock } from 'lucide-react';

export default function ItemCard({ item, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
    >
      <Link to={`/item/${item.id}`} className="group block">
        <div className="card-interactive overflow-hidden">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={item.images[0]}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Availability badge */}
            <div className="absolute top-3 left-3">
              {item.available ? (
                <span className="badge-success text-xs backdrop-blur-md bg-emerald-500/90 text-white border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Available
                </span>
              ) : (
                <span className="badge bg-gray-900/70 text-white text-xs backdrop-blur-md border-0">
                  Rented
                </span>
              )}
            </div>

            {/* Price overlay */}
            <div className="absolute bottom-3 right-3">
              <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-dark-100/90 backdrop-blur-md shadow-lg">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {item.price} DA
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">/day</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
              {item.title}
            </h3>

            <div className="mt-2 flex items-center gap-3">
              {/* Rating */}
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.rating}
                </span>
                <span className="text-xs text-gray-400">({item.reviewCount})</span>
              </div>

              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />

              {/* Location */}
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <MapPin className="w-3 h-3" />
                <span className="text-xs truncate">{item.location}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={item.owner.avatar}
                  alt={item.owner.name}
                  className="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-dark-100"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.owner.name}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                <Clock className="w-3 h-3" />
                <span className="text-xs">{item.listed}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
