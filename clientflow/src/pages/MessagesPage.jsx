/**
 * DZ-RentIt — Messages Page
 * ===========================
 * Full messaging interface: conversation list + message thread.
 * Linked to bookings for context.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, ArrowLeft, Search, User, Package, Clock, ChevronRight } from 'lucide-react';
import PageTransition from '../components/ui/PageTransition.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useMessages from '../hooks/useMessages.js';
import { format, parseISO } from 'date-fns';

export default function MessagesPage() {
  const { user } = useAuth();
  const {
    conversations, messages, activeConversation, activeConversationId,
    totalUnread, loading, fetchConversations, openConversation, sendMessage,
    setActiveConversationId,
  } = useMessages(user?.id);

  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      await sendMessage(messageText);
      setMessageText('');
    } catch { /* toast handled in hook */ }
  };

  const handleConversationClick = (convId) => {
    openConversation(convId);
    setMobileShowThread(true);
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.participants?.some((p) => typeof p === 'string' && p.toLowerCase().includes(q));
  });

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark pt-20 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Messages</h1>
            {totalUnread > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Layout: sidebar + thread */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border shadow-card overflow-hidden"
            style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}
          >
            <div className="flex h-full">

              {/* ── Conversation List ─────────────────────────────────── */}
              <div className={`w-full md:w-[360px] md:min-w-[360px] border-r border-gray-200 dark:border-dark-border flex flex-col
                ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-dark-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-dark-50 border-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Start a conversation by contacting an item owner
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <motion.button
                        key={conv.id}
                        onClick={() => handleConversationClick(conv.id)}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-start gap-3 p-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-50 transition-colors text-left
                          ${activeConversationId === conv.id ? 'bg-brand-50/50 dark:bg-brand-900/10 border-l-2 border-l-brand-500' : ''}`}
                      >
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900 dark:to-accent-900 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {conv.participants?.find((p) => p !== user?.id) || 'User'}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {conv.updatedAt ? format(parseISO(conv.updatedAt), 'HH:mm') : ''}
                            </span>
                          </div>
                          {conv.lastMessage && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {conv.lastMessage.senderId === user?.id ? 'You: ' : ''}{conv.lastMessage.text}
                            </p>
                          )}
                          {conv.itemId && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Package className="w-3 h-3 text-gray-400" />
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Item #{conv.itemId}</span>
                            </div>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </motion.button>
                    ))
                  )}
                </div>
              </div>

              {/* ── Message Thread ────────────────────────────────────── */}
              <div className={`flex-1 flex flex-col
                ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>

                {!activeConversation ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-dark-50 flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                      Choose a conversation from the list or contact an item owner to start chatting.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Thread header */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-dark-border">
                      <button
                        onClick={() => { setMobileShowThread(false); setActiveConversationId(null); }}
                        className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-100 to-accent-100 dark:from-brand-900 dark:to-accent-900 flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          {activeConversation.participants?.find((p) => p !== user?.id) || 'User'}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Usually responds within 1h
                        </p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-center">
                          <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isMine = msg.senderId === user?.id;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                                ${isMine
                                  ? 'bg-brand-500 text-white rounded-br-md'
                                  : 'bg-gray-100 dark:bg-dark-50 text-gray-900 dark:text-white rounded-bl-md'
                                }`}>
                                <p>{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${isMine ? 'text-brand-200' : 'text-gray-400'}`}>
                                  {msg.createdAt ? format(parseISO(msg.createdAt), 'HH:mm') : ''}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-dark-border">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-dark-50 border-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                        <motion.button
                          type="submit"
                          whileTap={{ scale: 0.9 }}
                          disabled={!messageText.trim()}
                          className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white flex items-center justify-center shadow-glow disabled:opacity-50 disabled:shadow-none transition-opacity"
                        >
                          <Send className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
