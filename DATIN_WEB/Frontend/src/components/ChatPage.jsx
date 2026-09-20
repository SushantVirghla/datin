import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { sendQueryStream } from '../api/rag';
import { AUTH_BASE_URL } from '../api/config';
import { getToken, isAuthenticated } from '../api/auth';
import ChatBar from './ChatBar';
import './ChatPage.css';

const ChatPage = ({ user, onChatSaved }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [chatTitle, setChatTitle] = useState('');
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Load existing chat if ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && isAuthenticated()) {
      loadChat(id);
    }
  }, [searchParams]);

  // Handle initial message from HomePage
  useEffect(() => {
    if (!hasInitialized.current && location.state?.initialMessage) {
      hasInitialized.current = true;
      handleSend(location.state.initialMessage);
      window.history.replaceState({}, document.title);
    }
  }, []);

  const loadChat = async (id) => {
    try {
      const { data } = await axios.get(`${AUTH_BASE_URL}/chats/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (data.success) {
        setChatId(data.chat.chatId);
        setChatTitle(data.chat.title);
        setMessages(data.chat.messages || []);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  };

  const saveChat = useCallback(async (msgs, title) => {
    if (!isAuthenticated() || msgs.length === 0) return;
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (chatId) {
        // Update existing chat
        await axios.put(`${AUTH_BASE_URL}/chats/${chatId}`, {
          title, messages: msgs
        }, { headers });
      } else {
        // Create new chat
        const { data } = await axios.post(`${AUTH_BASE_URL}/chats`, {
          title, messages: msgs
        }, { headers });
        if (data.success) {
          setChatId(data.chat.chatId);
        }
      }
      onChatSaved?.();
    } catch (err) {
      console.error('Failed to save chat:', err);
    }
  }, [chatId, onChatSaved]);

  const formatResponse = (text) => {
    if (!text) return '';
    let f = text;
    f = f.replace(/\*([\w\s-]+):\*/g, '<strong>$1:</strong>');
    f = f.replace(/\*/g, '');
    f = f.replace(/\n\n/g, '<br/><br/>');
    f = f.replace(/\n/g, ' ');
    return f;
  };

  const handleSend = async (message) => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      content: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Set title from first message
    const title = chatTitle || message.slice(0, 50) + (message.length > 50 ? '...' : '');
    if (!chatTitle) setChatTitle(title);

    const aiMsgId = Date.now() + 1;
    let accumulatedText = '';

    // Add streaming AI placeholder
    const streamingAiMsg = {
      id: aiMsgId,
      sender: 'ai',
      content: '',
      isStreaming: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHTML: true,
    };
    setMessages([...newMessages, streamingAiMsg]);

    try {
      const finalResponse = await sendQueryStream(message, (fullText) => {
        accumulatedText = fullText;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: formatResponse(fullText), isStreaming: true }
              : m
          )
        );
      });

      const finalAiMsg = {
        id: aiMsgId,
        sender: 'ai',
        content: formatResponse(finalResponse || accumulatedText),
        isStreaming: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isHTML: true,
      };

      const allMessages = [...newMessages, finalAiMsg];
      setMessages(allMessages);
      saveChat(allMessages, title);
    } catch (error) {
      let errCode = error?.code;
      if (!errCode && error?.status) {
        errCode = `HTTP_${error.status}`;
      } else if (!errCode && error?.response?.status) {
        errCode = `HTTP_${error.response.status}`;
      } else if (!errCode) {
        errCode = 'ERR_CONNECTION_REFUSED';
      }

      let errDetail = error?.detail || error?.response?.data?.detail || error?.message || 'Connection refused';

      const errMsg = {
        id: aiMsgId,
        sender: 'ai',
        isError: true,
        content: 'DATIN not online',
        errorCode: errCode,
        errorDetail: errDetail,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== aiMsgId);
        return [...filtered, errMsg];
      });
      saveChat([...newMessages, errMsg], title);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chatpage">
      {/* Blurry frosted glass backdrop lens over the Spline 3D robot */}
      <div className="chatpage-glass-backdrop" aria-hidden="true" />

      <div className="chatpage-messages">
        {messages.length === 0 && !isLoading && (
          <div className="chatpage-empty">
            <div className="chatpage-empty-glass">
              <div className="chatpage-empty-icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="8" width="16" height="12" rx="3" />
                  <circle cx="9" cy="14" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="14" r="1.5" fill="currentColor" />
                  <path d="M12 4V8" />
                  <circle cx="12" cy="3" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <h2>Ask DATIN anything</h2>
              <p>Your AI cybersecurity assistant is ready</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => {
            const isErrorMsg = msg.isError || msg.content === 'DATIN not online';
            return (
              <motion.div
                key={msg.id}
                className={`chatpage-msg chatpage-msg-${msg.sender}`}
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {msg.sender === 'ai' && (
                  <div className={`chatpage-msg-avatar ${isErrorMsg ? 'chatpage-avatar-error' : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="8" width="16" height="12" rx="3" />
                      <circle cx="9" cy="14" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="14" r="1.5" fill="currentColor" />
                      <path d="M12 4V8" />
                      <circle cx="12" cy="3" r="1.5" fill="currentColor" />
                    </svg>
                  </div>
                )}
                <div className={`chatpage-msg-bubble ${isErrorMsg ? 'chatpage-msg-bubble-error' : ''}`}>
                  {isErrorMsg ? (
                    <div className="chatpage-error-block">
                      <span className="chatpage-error-title">DATIN not online</span>
                      <span className="chatpage-error-code">
                        Error: {msg.errorDetail || 'Connection refused'} {msg.errorCode ? `(${msg.errorCode})` : ''}
                      </span>
                    </div>
                  ) : msg.isStreaming && !msg.content ? (
                    <div className="chatpage-msg-loading" style={{ padding: '0.2rem 0' }}>
                      <span className="chatpage-dot" />
                      <span className="chatpage-dot" />
                      <span className="chatpage-dot" />
                    </div>
                  ) : msg.isHTML ? (
                    <div className="chatpage-msg-html" dangerouslySetInnerHTML={{ __html: msg.content }} />
                  ) : (
                    <p className="chatpage-msg-text">{msg.content}</p>
                  )}
                  <span className="chatpage-msg-time">
                    {msg.sender === 'user' ? 'You' : 'DATIN AI'} • {msg.time}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <ChatBar onSend={handleSend} isLoading={isLoading} />
    </div>
  );
};

export default ChatPage;
