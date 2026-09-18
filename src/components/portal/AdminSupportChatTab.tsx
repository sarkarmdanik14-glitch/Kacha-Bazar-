import React, { useState, useEffect, useRef } from "react";
import { 
  db, 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  getDocs,
  writeBatch
} from "../../lib/firebase";
import { MessageSquare, Send, User, Check, CheckCheck, Shield, Sparkles, ArrowLeft } from "lucide-react";

interface AdminSupportChatTabProps {
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
}

export default function AdminSupportChatTab({ lang, triggerToast }: AdminSupportChatTabProps) {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>("");
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // 1. Listen to all active chats in real time
  useEffect(() => {
    const chatsQuery = query(collection(db, "chats"), orderBy("lastMessageAt", "desc"));
    
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsList: any[] = [];
      snapshot.forEach((doc) => {
        chatsList.push({ id: doc.id, ...doc.data() });
      });
      setChats(chatsList);
      setLoadingChats(false);
    }, (err) => {
      console.error("Error listening to chats: ", err);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen to messages for the selected chat in real time
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesQuery = query(
      collection(db, "chat_messages"),
      where("chatId", "==", selectedChatId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgsList: any[] = [];
      snapshot.forEach((doc) => {
        msgsList.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgsList);
      setLoadingMessages(false);
      
      // Mark customer messages as read when viewed by Support
      markMessagesAsRead(selectedChatId);
    }, (err) => {
      console.error("Error listening to messages: ", err);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedChatId]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark all unread customer messages as read & reset unreadCount
  const markMessagesAsRead = async (chatId: string) => {
    try {
      // 1. Reset unreadCount in the main chat document
      await updateDoc(doc(db, "chats", chatId), {
        unreadCount: 0
      });

      // 2. Batch update customer messages to isRead: true
      const q = query(
        collection(db, "chat_messages"),
        where("chatId", "==", chatId),
        where("senderId", "!=", "support"),
        where("isRead", "==", false)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.update(docSnap.ref, { isRead: true });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  // Trigger Typing Status on input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessageText(e.target.value);

    if (!selectedChatId) return;

    // Set admin typing status to true
    updateDoc(doc(db, "chats", selectedChatId), {
      isTypingSupport: true
    }).catch(err => console.error(err));

    // Reset typing after inactivity timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "chats", selectedChatId), {
        isTypingSupport: false
      }).catch(err => console.error(err));
    }, 2000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedChatId) return;

    const textToSend = newMessageText.trim();
    setNewMessageText("");

    // Clear typing timeout and reset status
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    try {
      // 1. Reset typing status
      await updateDoc(doc(db, "chats", selectedChatId), {
        isTypingSupport: false,
        lastMessage: textToSend,
        lastMessageAt: serverTimestamp()
      });

      // 2. Add message to database
      await addDoc(collection(db, "chat_messages"), {
        chatId: selectedChatId,
        senderId: "support",
        senderName: "Support Staff",
        text: textToSend,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (err) {
      console.error("Error sending chat message:", err);
      triggerToast("বার্তা প্রেরণ ব্যর্থ হয়েছে।", "Failed to send message.");
    }
  };

  // Filter chats by search query
  const filteredChats = chats.filter(c => {
    const name = c.userDisplayName?.toLowerCase() || "";
    const email = c.userEmail?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm h-[75vh] md:h-[70vh] flex flex-col md:flex-row animate-fade-in">
      
      {/* Chats List Sidebar */}
      <div className={`w-full md:w-80 border-r border-slate-150 flex flex-col h-full shrink-0 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h4 className="font-black text-slate-800 text-xs sm:text-sm flex items-center space-x-1.5 uppercase">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>{getTranslation("গ্রাহক আলোচনা সমূহ", "Customer Chat Rooms")}</span>
          </h4>
          <input
            type="text"
            placeholder={getTranslation("গ্রাহকের নাম বা ইমেইল খুঁজুন...", "Search customer name or email...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mt-3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2 space-y-1">
          {loadingChats ? (
            <div className="flex items-center justify-center p-8 text-xs text-slate-400 font-bold uppercase tracking-wider animate-pulse">
              Loading Chats...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-450 font-bold text-xs leading-relaxed">
              {getTranslation("কোনো সক্রিয় সাপোর্ট চ্যাট নেই।", "No active customer chats found.")}
            </div>
          ) : (
            filteredChats.map((c) => {
              const isActive = c.id === selectedChatId;
              const hasUnread = c.unreadCount > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChatId(c.id)}
                  className={`w-full flex items-start space-x-3 p-3 rounded-2xl transition text-left cursor-pointer ${
                    isActive 
                      ? "bg-emerald-50/75 border border-emerald-100/50" 
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                    isActive ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="flex items-center space-x-1.5 truncate">
                        <h5 className="text-xs font-black text-slate-800 truncate">{c.userDisplayName || "Customer User"}</h5>
                        {c.isGuest && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider shrink-0">
                            {getTranslation("গেস্ট", "Guest")}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0 ml-1">
                        {c.lastMessageAt ? new Date(c.lastMessageAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-450 truncate font-semibold">{c.userEmail}</p>
                    <p className={`text-xs mt-1 truncate ${hasUnread ? "font-extrabold text-slate-900" : "text-slate-400 font-medium"}`}>
                      {c.lastMessage || getTranslation("কোন বার্তা নেই", "No messages yet")}
                    </p>
                    {c.isTypingCustomer && (
                      <span className="text-[10px] text-emerald-500 font-bold animate-pulse mt-1 block">
                        ● typing...
                      </span>
                    )}
                  </div>
                  {hasUnread && (
                    <span className="bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full shrink-0">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Message Stream Pane */}
      <div className={`flex-1 flex flex-col bg-slate-50/50 h-full relative ${selectedChatId ? 'flex' : 'hidden md:flex'}`}>
        {selectedChatId ? (
          <>
            {/* Header info */}
            <div className="bg-white border-b border-slate-100 p-3 sm:p-4 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center space-x-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedChatId(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-850 hover:bg-slate-100 cursor-pointer shrink-0"
                  title={getTranslation("তালিকায় ফিরে যান", "Back to Chats")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="truncate">
                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight flex items-center gap-1 truncate">
                    <span className="truncate">{selectedChat?.userDisplayName}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">{selectedChat?.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-600 font-black uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full shrink-0">
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Support Mode</span>
              </div>
            </div>

            {/* Message feed stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0 flex flex-col">
              {loadingMessages && messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-bold uppercase text-[10px] tracking-wider animate-pulse">
                  Loading Messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h5 className="text-xs font-black text-slate-700">{getTranslation("আলাপের সূচনা করুন", "Initiate Conversation")}</h5>
                  <p className="text-[10px] text-slate-400 max-w-xs">{getTranslation("গ্রাহকের প্রশ্নের উত্তর দিতে নিচে আপনার বার্তা লিখুন এবং প্রেরণ করুন।", "Enter your response below to assist the customer directly in real time.")}</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isSupport = m.senderId === "support";
                  return (
                    <div 
                      key={m.id} 
                      className={`flex flex-col max-w-[80%] ${isSupport ? "self-end items-end" : "self-start items-start"}`}
                    >
                      <div className={`p-3 rounded-2xl shadow-sm text-xs font-medium leading-relaxed ${
                        isSupport 
                          ? "bg-emerald-600 text-white rounded-br-none" 
                          : "bg-white text-slate-850 border border-slate-150 rounded-bl-none"
                      }`}>
                        <p>{m.text}</p>
                      </div>
                      <div className="flex items-center space-x-1 mt-1 text-[9px] text-slate-400 font-bold">
                        <span>
                          {m.createdAt ? new Date(m.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                        {isSupport && (
                          <span className="ml-1 shrink-0">
                            {m.isRead ? (
                              <CheckCheck className="w-3 h-3 text-emerald-500 inline-block" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-350 inline-block" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {selectedChat?.isTypingCustomer && (
                <div className="self-start flex items-center space-x-1 bg-white border border-slate-100 p-2.5 rounded-full shadow-sm text-[10px] text-emerald-600 font-bold animate-pulse">
                  <span>● {selectedChat?.userDisplayName} is typing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input send tray */}
            <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-100 p-3 flex items-center space-x-2 shrink-0">
              <input
                type="text"
                placeholder={getTranslation("বার্তা টাইপ করুন...", "Type support response...")}
                value={newMessageText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium transition"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3.5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center animate-pulse">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-slate-800 font-black text-xs sm:text-sm uppercase tracking-wider">{getTranslation("লাইভ সাপোর্ট সেন্টার", "Live Support Workspace")}</h4>
              <p className="text-[10px] sm:text-xs text-slate-405 max-w-sm mt-1 leading-relaxed">
                {getTranslation(
                  "বাম পাশের তালিকা থেকে একটি সক্রিয় আলোচনা নির্বাচন করে সরাসরি কাস্টমারদের সাথে যুক্ত হোন।",
                  "Select an active conversation room from the sidebar queue to start assisting customers directly in real-time."
                )}
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
