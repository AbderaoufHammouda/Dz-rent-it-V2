/**
 * DZ-RentIt — useMessages Hook
 * ==============================
 *
 * Messaging system logic:
 * - Fetch conversation list
 * - Fetch messages for a conversation (via its booking ID)
 * - Send message
 * - Linked to bookingId for context
 *
 * BACKEND PATTERN:
 * The API uses "by-booking/{bookingId}" endpoints.
 * openConversation() accepts a conversationId, looks up the
 * associated bookingId from the conversations list, and uses
 * the by-booking endpoint to fetch messages.
 */

import { useState, useCallback, useMemo } from 'react';
import { messagesAPI } from '../services/api.js';

export default function useMessages(currentUserId) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeBookingId, setActiveBookingId] = useState(null);
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
  // Accepts a conversationId, looks up the bookingId, uses by-booking endpoint
  const openConversation = useCallback(async (conversationId) => {
    setActiveConversationId(conversationId);
    setLoading(true);
    try {
      // Find the conversation to get its bookingId
      const conv = conversations.find((c) => c.id === conversationId);
      const bookingId = conv?.bookingId;

      if (!bookingId) {
        setMessages([]);
        setActiveBookingId(null);
        return;
      }

      setActiveBookingId(bookingId);
      const { messages: data } = await messagesAPI.getByBooking(bookingId);
      setMessages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversations]);

  // ── Send a message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!activeBookingId || !text.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const { message } = await messagesAPI.sendMessage(activeBookingId, {
        content: text.trim(),
      });

      // Append to messages
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
  }, [activeBookingId, activeConversationId]);

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
   * Start or find a conversation with a specific user about a booking.
   * If conversation exists → open it. Otherwise → open via booking endpoint.
   */
  const startConversation = useCallback(async (otherUserId, itemId, bookingId) => {
    // Check if conversation already exists for this booking
    const existing = conversations.find((c) =>
      c.bookingId === bookingId ||
      (c.participants?.includes(otherUserId) &&
        (c.itemId === itemId || c.bookingId === bookingId))
    );

    if (existing) {
      await openConversation(existing.id);
      return existing;
    }

    // For a new conversation, use the by-booking endpoint directly
    if (bookingId) {
      setActiveBookingId(bookingId);
      setLoading(true);
      try {
        const { conversation, messages: msgs } = await messagesAPI.getByBooking(bookingId);
        setConversations((prev) => [conversation, ...prev]);
        setActiveConversationId(conversation.id);
        setMessages(msgs);
        return conversation;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }

    return null;
  }, [conversations, openConversation]);

  return {
    conversations,
    messages,
    activeConversation,
    activeConversationId,
    activeBookingId,
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
