import React, { useState, useEffect, useRef } from "react";
import { 
  auth, 
  db, 
  doc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  increment,
  getDocs,
  writeBatch
} from "../lib/firebase";
import { MessageSquare, X, Send, User, ChevronDown, Sparkles, LogIn } from "lucide-react";

interface CustomerLiveChatProps {
  lang: "bn" | "en";
  onOpenPortal: () => void;
}

export default function CustomerLiveChat({ lang, onOpenPortal }: CustomerLiveChatProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [chatRoom, setChatRoom] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [unreadCountForCustomer, setUnreadCountForCustomer] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // 1. Monitor auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        setChatRoom(null);
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync with user's chat room & calculate customer-unread support messages
  useEffect(() => {
    if (!currentUser) {
      setUnreadCountForCustomer(0);
      return;
    }

    const chatRef = doc(db, "chats", currentUser.uid);
    const unsubChat = onSnapshot(
      chatRef, 
      (snap) => {
        if (snap.exists()) {
          setChatRoom(snap.data());
        } else {
          setChatRoom(null);
        }
      },
      (err) => console.warn("LiveChat room sync notice:", err.message)
    );

    // Real-time query to count unread messages from support
    const unreadQuery = query(
      collection(db, "chat_messages"),
      where("chatId", "==", currentUser.uid),
      where("senderId", "==", "support"),
      where("isRead", "==", false)
    );

    const unsubUnread = onSnapshot(
      unreadQuery, 
      (snap) => {
        setUnreadCountForCustomer(snap.size);
      },
      (err) => console.warn("LiveChat unread sync notice:", err.message)
    );

    return () => {
      unsubChat();
      unsubUnread();
    };
  }, [currentUser]);

  // 3. Listen to messages when the chat widget is open
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    setLoading(true);
    const msgsQuery = query(
      collection(db, "chat_messages"),
      where("chatId", "==", currentUser.uid),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(msgsQuery, (snapshot) => {
      const msgsList: any[] = [];
      snapshot.forEach((doc) => {
        msgsList.push({ id: doc.id, ...doc.data() });
      });
      setMessages(msgsList);
      setLoading(false);

      // Mark support messages as read
      markSupportMessagesAsRead();
    }, (err) => {
      console.error("Error loading chat messages: ", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Mark support messages as read
  const markSupportMessagesAsRead = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, "chat_messages"),
        where("chatId", "==", currentUser.uid),
        where("senderId", "==", "support"),
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
      console.error("Error marking messages as read: ", err);
    }
  };

  // Publish Customer typing status
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessageText(e.target.value);
    if (!currentUser) return;

    // Set typing state to true in Firestore
    updateDoc(doc(db, "chats", currentUser.uid), {
      isTypingCustomer: true
    }).catch(() => {
      // Chat room might not exist yet, which is fine
    });

    // Reset typing after 2 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "chats", currentUser.uid), {
        isTypingCustomer: false
      }).catch(() => {});
    }, 2000);
  };

  // Submit/Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !currentUser) return;

    const textToSend = newMessageText.trim();
    setNewMessageText("");

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const chatDocRef = doc(db, "chats", currentUser.uid);
      
      // 1. Upsert Chat Room Summary
      await setDoc(chatDocRef, {
        id: currentUser.uid,
        userId: currentUser.uid,
        userEmail: currentUser.email || "anonymous",
        userDisplayName: currentUser.displayName || currentUser.email?.split("@")[0] || "Customer",
        lastMessage: textToSend,
        lastMessageAt: serverTimestamp(),
        unreadCount: increment(1),
        isTypingCustomer: false
      }, { merge: true });

      // 2. Add message document
      await addDoc(collection(db, "chat_messages"), {
        chatId: currentUser.uid,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Customer",
        text: textToSend,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (err) {
      console.error("Error sending client message:", err);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start">
      
      {/* Expanded Chat Dialog */}
      {isOpen && (
        <div className="bg-white w-[340px] sm:w-[380px] h-[500px] rounded-3xl shadow-2xl border border-slate-150 flex flex-col overflow-hidden mb-4 animate-scale-up">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/10 shadow-inner">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black tracking-tight">
                  {getTranslation("তাত্ক্ষণিক গ্রাহক সহায়তা", "Live Support Desk")}
                </h4>
                <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">
                  {getTranslation("অনলাইনে আমরা আপনার সহায়তায় আছি", "We are online and ready to help")}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/15 transition text-white/80 hover:text-white cursor-pointer"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Main Stream */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-3 flex flex-col min-h-0">
            {!currentUser ? (
              // Auth required state
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wide">
                    {getTranslation("লগইন করা প্রয়োজন", "Authentication Required")}
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                    {getTranslation(
                      "আমাদের অনলাইন সাপোর্ট এজেন্টের সাথে কথা বলতে আপনার একাউন্টে লগইন করুন বা রেজিস্ট্রেশন করুন।",
                      "Please sign in or create an account to start chatting with our customer support representatives."
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenPortal();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{getTranslation("লগইন করুন", "Login Now")}</span>
                </button>
              </div>
            ) : loading && messages.length === 0 ? (
              // Loading state
              <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                Loading Chat Session...
              </div>
            ) : messages.length === 0 ? (
              // Welcome / empty state
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-450 animate-bounce">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h5 className="font-black text-slate-700 text-xs sm:text-sm">
                  {getTranslation("আমাদের জিজ্ঞাসা করুন!", "How can we help you?")}
                </h5>
                <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                  {getTranslation(
                    "পণ্য, ডেলিভারি বা পেমেন্ট সংক্রান্ত যেকোনো জিজ্ঞাসা থাকলে নিচে লিখুন। আমরা আপনাকে তাৎক্ষনিক সহায়তা করব!",
                    "Ask us anything regarding your orders, fresh products, deliveries, or payments. Our team is online!"
                  )}
                </p>
              </div>
            ) : (
              // Message list
              messages.map((m) => {
                const isSupport = m.senderId === "support";
                return (
                  <div 
                    key={m.id} 
                    className={`flex flex-col max-w-[85%] ${isSupport ? "self-start items-start" : "self-end items-end"}`}
                  >
                    <div className={`p-3 rounded-2xl shadow-sm text-xs font-medium leading-relaxed ${
                      isSupport 
                        ? "bg-white text-slate-850 border border-slate-150 rounded-bl-none" 
                        : "bg-emerald-600 text-white rounded-br-none"
                    }`}>
                      <p>{m.text}</p>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold mt-1">
                      {m.createdAt ? new Date(m.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                );
              })
            )}

            {/* Support Agent Typing Indicator */}
            {chatRoom?.isTypingSupport && (
              <div className="self-start bg-white border border-slate-150 p-2.5 rounded-full shadow-sm text-[10px] text-emerald-600 font-bold animate-pulse flex items-center space-x-1">
                <span>● Support Agent is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input Footer */}
          {currentUser && (
            <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-100 p-3 flex items-center space-x-2 shrink-0">
              <input
                type="text"
                placeholder={getTranslation("আপনার প্রশ্নটি লিখুন...", "Type your message...")}
                value={newMessageText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-medium"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed shadow shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>
      )}

      {/* Floating Launcher Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer border border-emerald-500 relative"
      >
        {isOpen ? (
          <X className="w-6 h-6 animate-spin-once" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6 animate-pulse" />
            
            {/* Unread Message Badge Indicator */}
            {unreadCountForCustomer > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow animate-bounce">
                {unreadCountForCustomer}
              </span>
            )}
          </>
        )}
      </button>

    </div>
  );
}
