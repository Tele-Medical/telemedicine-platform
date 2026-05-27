import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, User } from 'lucide-react';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface InCallChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserId: string;
}

const InCallChat: React.FC<InCallChatProps> = ({ messages, onSendMessage, currentUserId }) => {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden font-sans">
      <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
        <h3 className="text-sm font-bold text-neutral-800 tracking-wide">{t('clinical.in_call_chat', 'In-Call Chat')}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-neutral-400">
            <p className="text-sm">{t('clinical.no_messages', 'No messages yet')}</p>
            <p className="text-xs mt-1 text-center">{t('clinical.chat_encrypted_notice', 'Messages are end-to-end encrypted and not saved after the call.')}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!isMe && <div className="w-5 h-5 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-[9px] font-bold">
                    <User size={12} />
                  </div>}
                  <span className="text-[10px] font-semibold text-neutral-500">{isMe ? t('common.you', 'You') : msg.senderName}</span>
                  <span className="text-[9px] text-neutral-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`px-3.5 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-neutral-100 text-neutral-800 rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-neutral-100 bg-white flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('clinical.type_message', 'Type a message...')}
          className="flex-1 bg-neutral-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all border border-transparent focus:border-primary/30 text-neutral-800"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Send size={16} className="-ml-0.5" />
        </button>
      </form>
    </div>
  );
};

export default InCallChat;
