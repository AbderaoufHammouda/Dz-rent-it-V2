/**
 * DZ-RentIt — useItems Hook
 * ==============================
 * 
 * CRUD operations for items (objects for rent).
 * Provides fetching, creation, editing, and deletion.
 */

import { useState, useCallback } from 'react';
import { itemsAPI } from '../services/api.js';

export default function useItems() {
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch all items ──────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items: data } = await itemsAPI.getAll();
      setItems(data);
      return data;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch single item ────────────────────────────────────────────────────
  const fetchItem = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const { item } = await itemsAPI.getById(id);
      setCurrentItem(item);
      return item;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Create item ──────────────────────────────────────────────────────────
  const createItem = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const { item } = await itemsAPI.create(data);
      setItems((prev) => [item, ...prev]);
      return item;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Update item ──────────────────────────────────────────────────────────
  const updateItem = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const { item } = await itemsAPI.update(id, data);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...item } : i)));
      setCurrentItem((prev) => (prev?.id === id ? { ...prev, ...item } : prev));
      return item;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Delete item ──────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await itemsAPI.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (currentItem?.id === id) setCurrentItem(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentItem]);

  // ── Get items owned by a specific user ─────────────────────────────────
  const getOwnerItems = useCallback(
    (ownerId) => items.filter((i) => i.owner?.id === ownerId || i.ownerId === ownerId),
    [items]
  );

  return {
    items,
    currentItem,
    loading,
    error,
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    getOwnerItems,
  };
}
