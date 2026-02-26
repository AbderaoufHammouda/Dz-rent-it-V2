import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, SlidersHorizontal, X, ChevronDown, MapPin, Grid3X3, List, Map,
  ArrowUpDown, ChevronRight,
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import ItemCard from '../components/ui/ItemCard';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import useSearch from '../hooks/useSearch';
import { items, categories } from '../data/mockData';
import { formatPrice } from '../utils/pricing';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [showSort, setShowSort] = useState(false);

  // ── useSearch hook: all filtering/sorting/category tree logic extracted ──
  const {
    results: filteredItems,
    filters,
    categoryTree,
    hasActiveFilters,
    totalResults,
    setQuery,
    setCategory: setSelectedCategory,
    setPriceRange,
    setAvailableOnly,
    setSortBy,
    clearFilters,
  } = useSearch(items, categories);

  // Sync URL params → hook state on mount
  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('category');
    if (q) setQuery(q);
    if (cat) setCategory(cat);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilterCount = [filters.categoryId, filters.availableOnly, filters.priceRange[0] > 0, filters.priceRange[1] < 50000].filter(Boolean).length;

  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark">
        {/* Search Header */}
        <div className="sticky top-16 lg:top-[72px] z-30 bg-white/80 dark:bg-dark/80 backdrop-blur-2xl border-b border-gray-200 dark:border-dark-border">
          <div className="section py-4">
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                <input
                  type="text"
                  value={filters.query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items, categories, locations..."
                  className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-dark-50 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-dark-100 transition-all"
                />
                {filters.query && (
                  <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-50">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  relative flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${showFilters
                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20'
                    : 'bg-gray-100 dark:bg-dark-50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-50'
                  }
                `}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Sort */}
              <div className="relative">
                <button
                  onClick={() => setShowSort(!showSort)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-gray-100 dark:bg-dark-50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-50 transition-all"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Sort</span>
                </button>

                <AnimatePresence>
                  {showSort && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-dark-100 rounded-xl shadow-elevated border border-gray-200 dark:border-dark-border overflow-hidden z-50"
                    >
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                          className={`
                            w-full text-left px-4 py-2.5 text-sm transition-colors
                            ${filters.sortBy === opt.value
                              ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-50'
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* View mode (desktop) */}
              <div className="hidden md:flex items-center rounded-xl bg-gray-100 dark:bg-dark-50 p-1">
                {[
                  { mode: 'grid', icon: Grid3X3 },
                  { mode: 'list', icon: List },
                ].map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === mode
                        ? 'bg-white dark:bg-dark-100 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="section py-6">
          <div className="flex gap-6">
            {/* Sidebar Filters (Desktop) */}
            <AnimatePresence>
              {showFilters && (
                <motion.aside
                  initial={{ opacity: 0, width: 0, marginRight: 0 }}
                  animate={{ opacity: 1, width: 280, marginRight: 0 }}
                  exit={{ opacity: 0, width: 0, marginRight: 0 }}
                  transition={{ duration: 0.3 }}
                  className="hidden md:block flex-shrink-0 overflow-hidden"
                >
                  <div className="w-[280px] sticky top-[140px]">
                    <div className="card p-5 space-y-6">
                      {/* Category */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Category</h3>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          <button
                            onClick={() => setSelectedCategory('')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              !filters.categoryId
                                ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-50'
                            }`}
                          >
                            All Categories
                          </button>
                          {categories.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                                filters.categoryId === cat.id
                                  ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-medium'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-50'
                              }`}
                            >
                              {cat.name}
                              <span className="text-xs text-gray-400">{cat.count}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Price Range */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Price per day</h3>
                        <div className="px-1">
                          <input
                            type="range"
                            min={0}
                            max={50000}
                            step={500}
                            value={filters.priceRange[1]}
                            onChange={(e) => setPriceRange([filters.priceRange[0], parseInt(e.target.value)])}
                            className="w-full"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-500">{formatPrice(filters.priceRange[0])}</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{formatPrice(filters.priceRange[1])}</span>
                          </div>
                        </div>
                      </div>

                      {/* Availability */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={filters.availableOnly}
                              onChange={(e) => setAvailableOnly(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-6 rounded-full bg-gray-200 dark:bg-dark-50 peer-checked:bg-brand-500 transition-colors" />
                            <div className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">Available only</span>
                        </label>
                      </div>

                      {/* Clear */}
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearFilters}
                          className="w-full text-center text-sm font-medium text-red-500 hover:text-red-600 transition-colors py-2"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Results count */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{totalResults}</span>
                    {' '}items found
                    {filters.query && <> for "<span className="font-medium text-gray-700 dark:text-gray-300">{filters.query}</span>"</>}
                    {filters.categoryId && (
                      <> in <span className="font-medium text-brand-600 dark:text-brand-400">{categories.find(c => c.id === filters.categoryId)?.name}</span></>
                    )}
                  </p>
                </div>
              </div>

              {/* Active filters pills (mobile) */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 md:hidden">
                  {filters.categoryId && (
                    <span className="badge-brand flex items-center gap-1">
                      {categories.find(c => c.id === filters.categoryId)?.name}
                      <button onClick={() => setSelectedCategory('')}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {filters.availableOnly && (
                    <span className="badge-success flex items-center gap-1">
                      Available only
                      <button onClick={() => setAvailableOnly(false)}><X className="w-3 h-3" /></button>
                    </span>
                  )}
                </div>
              )}

              {/* Grid */}
              {filteredItems.length > 0 ? (
                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'space-y-4'
                }>
                  {filteredItems.map((item, i) => (
                    <ItemCard key={item.id} item={item} index={i} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No items found"
                  description="Try adjusting your filters or search for something else."
                  action={clearFilters}
                  actionLabel="Clear filters"
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Filter Sheet */}
        <AnimatePresence>
          {showFilters && (
            <div className="fixed inset-0 z-50 md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilters(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-100 rounded-t-3xl max-h-[80vh] overflow-y-auto"
              >
                <div className="sticky top-0 bg-white dark:bg-dark-100 px-6 py-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                  <button onClick={() => setShowFilters(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  {/* Category */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Category</h4>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory('')}
                        className={`px-3 py-1.5 rounded-lg text-sm ${!filters.categoryId ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-dark-50 text-gray-600 dark:text-gray-400'}`}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm ${filters.categoryId === cat.id ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-dark-50 text-gray-600 dark:text-gray-400'}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Price */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Max Price: {formatPrice(filters.priceRange[1])}/day</h4>
                    <input type="range" min={0} max={50000} step={500} value={filters.priceRange[1]} onChange={(e) => setPriceRange([0, parseInt(e.target.value)])} className="w-full" />
                  </div>
                  {/* Available */}
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={filters.availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Available only</span>
                  </label>
                </div>
                <div className="sticky bottom-0 bg-white dark:bg-dark-100 px-6 py-4 border-t border-gray-100 dark:border-dark-border flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={clearFilters}>Clear</Button>
                  <Button variant="primary" className="flex-1" onClick={() => setShowFilters(false)}>Show {filteredItems.length} results</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
