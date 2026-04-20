import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Settings, 
  History, 
  User, 
  MoreHorizontal, 
  Moon, 
  Sun,
  Layout,
  MessageSquare,
  Globe,
  PlusCircle,
  Hash,
  Terminal,
  Zap,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  ogData?: {
    url: string;
    title: string;
    description: string;
    image: string;
  };
}

interface Chat {
  id: string;
  name: string;
  icon: React.ReactNode;
  lastMessage: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Welcome to Verdant AI, your personal nursery management assistant. How can I help you grow today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [chats, setChats] = useState<Chat[]>([
    { id: '1', name: 'Spring Hydrangeas', icon: <Leaf size={16} />, lastMessage: 'Watering schedule updated' },
    { id: '2', name: 'Indoor Ferns', icon: <Hash size={16} />, lastMessage: 'Humidity levels optimal' },
    { id: '3', name: 'Succulent Garden', icon: <Terminal size={16} />, lastMessage: 'New growth detected' }
  ]);
  const [activeChatId, setActiveChatId] = useState('1');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I've analyzed the request. The optimal pH for your current nursery section should be maintained between 6.0 and 6.5. Shall I log this to the maintenance schedule?",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };

  const handleCreateChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      name: 'New Nursery Section',
      icon: <PlusCircle size={16} />,
      lastMessage: 'No messages yet'
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setMessages([{
      id: Date.now().toString(),
      text: "Created a new nursery log. What would you like to track here?",
      sender: 'bot',
      timestamp: new Date()
    }]);
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <Zap size={20} fill="white" />
            </div>
            <span className="logo-text">Verdant AI</span>
          </div>
          <button className="new-chat-btn" onClick={handleCreateChat}>
            <Plus size={20} />
          </button>
        </div>

        <div className="sidebar-content">
          <div className="section-label">Inventory Logs</div>
          <div className="chat-list">
            {chats.map(chat => (
              <div 
                key={chat.id} 
                className={`chat-item ${activeChatId === chat.id ? 'active' : ''}`}
                onClick={() => setActiveChatId(chat.id)}
              >
                <div className="chat-item-icon">{chat.icon}</div>
                <div className="chat-item-text">
                  <div className="chat-item-name">{chat.name}</div>
                  <div className="chat-item-last">{chat.lastMessage}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="footer-item">
            <User size={18} />
            <span>Profile</span>
          </div>
          <div className="footer-item" onClick={() => setShowApiKeyModal(true)}>
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="icon-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Layout size={20} />
            </button>
            <h1 className="active-chat-title">{chats.find(c => c.id === activeChatId)?.name || 'Verdant AI'}</h1>
          </div>
          <div className="header-right">
            <button className="icon-button" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="icon-button">
              <History size={20} />
            </button>
            <button className="icon-button">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </header>

        <div className="chat-container">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div 
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`message-wrapper ${message.sender === 'user' ? 'user' : 'bot'}`}
              >
                {message.sender === 'bot' && (
                  <div className="bot-avatar">
                    <Zap size={14} fill="currentColor" />
                  </div>
                )}
                <div className="message-content">
                  <div className="message-text">
                    {message.text}
                  </div>
                  {message.ogData && (
                    <div className="og-card-container" id="ogp">
                      <a href={message.ogData.url} target="_blank" rel="noopener noreferrer" className="og-card">
                        <div className="og-image" style={{ backgroundImage: `url(${message.ogData.image})` }}></div>
                        <div className="og-text">
                          <div className="og-title">{message.ogData.title}</div>
                          <div className="og-description">{message.ogData.description}</div>
                        </div>
                      </a>
                    </div>
                  )}
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-wrapper">
          <div className="chat-input-container">
            <input 
              id="chatInput"
              type="text" 
              placeholder="Ask about your plants..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              id="sendButton" 
              onClick={handleSend}
              disabled={!inputText.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Nursery API Configuration</h2>
            <p>Enter your configuration key to enable advanced botanical AI features.</p>
            <input 
              type="password" 
              placeholder="Enter key..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div className="modal-actions">
              <button className="modal-button secondary-button" onClick={() => setShowApiKeyModal(false)}>Cancel</button>
              <button className="modal-button primary-button" onClick={() => setShowApiKeyModal(false)}>Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
