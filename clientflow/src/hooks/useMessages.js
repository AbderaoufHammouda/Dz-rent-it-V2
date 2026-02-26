/**
 * DZ-RentIt — useMessages Hook
 * ==============================
 * 
 * Messaging system logic:
 * - Fetch conversation list
 * - Fetch messages for a conversation
 * - Send message
 * - Mark as read
 * - Linked to bookingId for context
 * 
 * ARCHITECTURE: Structured for future WebSocket upgrade.
 * Currently polling-based, but the interface supports real-time injection.
 */

import { useState, useCallback, useMemo } from 'react';
import { messagesAPI } from '../services/api.js';

export default function useMessages(currentUserId) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch all conversations ──────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { conversations: data } = await messagesAPI.getConversations();
      setConversations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Open a conversation and load messages ────────────────────────────────
  const openConversation = useCallback(async (conversationId) => {
    setActiveConversationId(conversationId);
    setLoading(true);
    try {
      const { messages: data } = await messagesAPI.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Send a message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!activeConversationId || !text.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const { message } = await messagesAPI.sendMessage(activeConversationId, {
        senderId: currentUserId,
        text: text.trim(),
      });

      // Optimistic — prepend to messages
      setMessages((prev) => [...prev, message]);

      // Update conversation's lastMessage
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessage: message, updatedAt: message.createdAt }
            : c
        )
      );

      return message;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [activeConversationId, currentUserId]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId]
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  /**
   * Start or find a conversation with a specific user about an item/booking.
   * If conversation exists → open it. Otherwise → create new.
   */
  const startConversation = useCallback(async (otherUserId, itemId, bookingId) => {
    // Check if conversation already exists
    const existing = conversations.find((c) =>
      c.participants?.includes(otherUserId) &&
      (c.itemId === itemId || c.bookingId === bookingId)
    );

    if (existing) {
      await openConversation(existing.id);
      return existing;
    }

    // Create new conversation (mock)
    const newConvo = {
      id: 'conv-' + Date.now(),
      participants: [currentUserId, otherUserId],
      itemId,
      bookingId,
      lastMessage: null,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };

    setConversations((prev) => [newConvo, ...prev]);
    setActiveConversationId(newConvo.id);
    setMessages([]);

    return newConvo;
  }, [conversations, currentUserId, openConversation]);

  return {
    conversations,
    messages,
    activeConversation,
    activeConversationId,
    totalUnread,
    loading,
    error,
    fetchConversations,
    openConversation,
    sendMessage,
    startConversation,
    setActiveConversationId,
  };
}
