/**
 * DZ-RentIt — useSearch Hook
 * ==============================
 * 
 * Encapsulates all search, filter, and sort logic.
 * Supports hierarchical category filtering.
 * 
 * ARCHITECTURE: Pure data transformation — no API calls.
 * Receives the full item list and returns filtered/sorted results.
 * When backend search is implemented, this can be swapped to API-driven.
 */

import { useState, useMemo, useCallback } from 'react';

/**
 * Build a category tree from a flat array with parentId.
 * @param {import('../types/index.js').Category[]} categories
 * @returns {import('../types/index.js').Category[]}
 */
export function buildCategoryTree(categories) {
  const map = {};
  const roots = [];

  // First pass — create map
  for (const cat of categories) {
    map[cat.id] = { ...cat, children: [] };
  }

  // Second pass — build tree
  for (const cat of categories) {
    if (cat.parentId && map[cat.parentId]) {
      map[cat.parentId].children.push(map[cat.id]);
    } else {
      roots.push(map[cat.id]);
    }
  }

  return roots;
}

/**
 * Get all descendant category IDs (for filtering by parent category).
 * @param {string} categoryId
 * @param {import('../types/index.js').Category[]} tree
 * @returns {string[]}
 */
export function getCategoryDescendants(categoryId, tree) {
  const ids = [categoryId];

  function collect(nodes) {
    for (const node of nodes) {
      if (ids.includes(node.id)) {
        node.children?.forEach((child) => {
          ids.push(child.id);
          if (child.children?.length) collect([child]);
        });
      } else if (node.children?.length) {
        collect(node.children);
      }
    }
  }

  collect(tree);
  return ids;
}

const DEFAULT_FILTERS = {
  query: '',
  categoryId: null,
  priceRange: [0, 50000],
  availableOnly: false,
  sortBy: 'relevance',
};

/**
 * @param {import('../types/index.js').Item[]} items
 * @param {import('../types/index.js').Category[]} categories
 */
export default function useSearch(items = [], categories = []) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Build category tree once
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  // Apply filters & sort
  const results = useMemo(() => {
    let filtered = [...items];

    // Text search
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q)
      );
    }

    // Category filter (includes subcategories)
    if (filters.categoryId) {
      const ids = getCategoryDescendants(filters.categoryId, categoryTree);
      filtered = filtered.filter(
        (item) => ids.includes(item.categoryId) || ids.includes(item.category)
      );
    }

    // Price range
    filtered = filtered.filter(
      (item) => item.price >= filters.priceRange[0] && item.price <= filters.priceRange[1]
    );

    // Availability
    if (filters.availableOnly) {
      filtered = filtered.filter((item) => item.available);
    }

    // Sort
    switch (filters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.listed || b.createdAt) - new Date(a.listed || a.createdAt));
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'relevance':
      default:
        // Relevance: boosted by rating + availability
        if (filters.query.trim()) {
          const q = filters.query.toLowerCase();
          filtered.sort((a, b) => {
            const aTitle = a.title.toLowerCase().includes(q) ? 2 : 0;
            const bTitle = b.title.toLowerCase().includes(q) ? 2 : 0;
            return (bTitle + b.rating) - (aTitle + a.rating);
          });
        }
        break;
    }

    return filtered;
  }, [items, filters, categoryTree]);

  // Actions
  const setQuery = useCallback((query) => setFilters((f) => ({ ...f, query })), []);
  const setCategory = useCallback((categoryId) => setFilters((f) => ({ ...f, categoryId })), []);
  const setPriceRange = useCallback((priceRange) => setFilters((f) => ({ ...f, priceRange })), []);
  const setAvailableOnly = useCallback((availableOnly) => setFilters((f) => ({ ...f, availableOnly })), []);
  const setSortBy = useCallback((sortBy) => setFilters((f) => ({ ...f, sortBy })), []);
  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.query.trim() !== '' ||
      filters.categoryId !== null ||
      filters.priceRange[0] !== 0 ||
      filters.priceRange[1] !== 50000 ||
      filters.availableOnly !== false
    );
  }, [filters]);

  return {
    results,
    filters,
    categoryTree,
    hasActiveFilters,
    totalResults: results.length,
    setQuery,
    setCategory,
    setPriceRange,
    setAvailableOnly,
    setSortBy,
    clearFilters,
  };
}
