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
import { MessageSquare, X, Send, User, Sparkles, LogIn, Check, CheckCheck, Edit2, ShieldCheck } from "lucide-react";

interface CustomerLiveChatProps {
  lang: "bn" | "en";
  onOpenPortal: () => void;
  isOpen?: boolean;
  onToggleOpen?: (open?: boolean) => void;
}

// Helper to get or generate persistent guest chat ID
const getOrInitGuestId = (): string => {
  try {
    let gid = localStorage.getItem("kachabazar_guest_chat_id");
    if (!gid) {
      gid = "guest_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
      localStorage.setItem("kachabazar_guest_chat_id", gid);
    }
    return gid;
  } catch {
    return "guest_" + Date.now().toString(36);
  }
};

const getOrInitGuestName = (): string => {
  try {
    return localStorage.getItem("kachabazar_guest_name") || "";
  } catch {
    return "";
  }
};

export default function CustomerLiveChat({ 
  lang, 
  onOpenPortal,
  isOpen: externalIsOpen,
  onToggleOpen
}: CustomerLiveChatProps) {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  const setIsOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof val === "function" ? val(isOpen) : val;
    if (onToggleOpen) {
      onToggleOpen(nextVal);
    } else {
      setInternalIsOpen(nextVal);
    }
  };

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [guestId, setGuestId] = useState<string>(() => getOrInitGuestId());
  const [guestName, setGuestName] = useState<string>(() => getOrInitGuestName());
  const [isEditingGuestName, setIsEditingGuestName] = useState<boolean>(false);
  const [tempGuestName, setTempGuestName] = useState<string>("");

  const [chatRoom, setChatRoom] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [unreadCountForCustomer, setUnreadCountForCustomer] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Determine current active chat session ID
  const effectiveChatId = currentUser ? currentUser.uid : guestId;
  const isGuest = !currentUser;
  const userDisplayName = currentUser
    ? (currentUser.displayName || currentUser.email?.split("@")[0] || (lang === "bn" ? "সম্মানিত ক্রেতা" : "Customer"))
    : (guestName.trim() || (lang === "bn" ? `অতিথি ক্রেতা #${guestId.slice(-4)}` : `Guest #${guestId.slice(-4)}`));
  const userEmail = currentUser
    ? (currentUser.email || "")
    : (lang === "bn" ? "গেস্ট ভিজিটর" : "Guest Visitor");

  // 1. Monitor auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync with user's chat room & calculate customer-unread support messages
  useEffect(() => {
    if (!effectiveChatId) {
      setUnreadCountForCustomer(0);
      return;
    }

    const chatRef = doc(db, "chats", effectiveChatId);
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
      where("chatId", "==", effectiveChatId),
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
  }, [effectiveChatId]);

  // 3. Listen to messages when the chat widget is open
  useEffect(() => {
    if (!effectiveChatId || !isOpen) return;

    setLoading(true);
    const msgsQuery = query(
      collection(db, "chat_messages"),
      where("chatId", "==", effectiveChatId),
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
      console.warn("LiveChat messages stream notice: ", err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveChatId, isOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Mark support messages as read
  const markSupportMessagesAsRead = async () => {
    if (!effectiveChatId) return;
    try {
      const q = query(
        collection(db, "chat_messages"),
        where("chatId", "==", effectiveChatId),
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
      console.warn("Notice marking support messages as read:", err);
    }
  };

  // Publish typing status
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessageText(e.target.value);
    if (!effectiveChatId) return;

    // Set typing state in Firestore
    updateDoc(doc(db, "chats", effectiveChatId), {
      isTypingCustomer: true
    }).catch(() => {
      // Chat room might not exist yet before first message
    });

    // Reset typing after 2 seconds
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "chats", effectiveChatId), {
        isTypingCustomer: false
      }).catch(() => {});
    }, 2000);
  };

  // Save guest name
  const handleSaveGuestName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempGuestName.trim()) {
      const name = tempGuestName.trim();
      setGuestName(name);
      try {
        localStorage.setItem("kachabazar_guest_name", name);
      } catch {}
      // Update in existing chat room if exists
      if (chatRoom) {
        updateDoc(doc(db, "chats", effectiveChatId), {
          userDisplayName: name
        }).catch(() => {});
      }
    }
    setIsEditingGuestName(false);
  };

  // Submit/Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !effectiveChatId) return;

    const textToSend = newMessageText.trim();
    setNewMessageText("");

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const chatDocRef = doc(db, "chats", effectiveChatId);
      
      // 1. Upsert Chat Room Summary
      await setDoc(chatDocRef, {
        id: effectiveChatId,
        userId: effectiveChatId,
        userEmail: userEmail,
        userDisplayName: userDisplayName,
        isGuest: isGuest,
        lastMessage: textToSend,
        lastMessageAt: serverTimestamp(),
        unreadCount: increment(1),
        isTypingCustomer: false
      }, { merge: true });

      // 2. Add message document
      await addDoc(collection(db, "chat_messages"), {
        chatId: effectiveChatId,
        senderId: effectiveChatId,
        senderName: userDisplayName,
        text: textToSend,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (err) {
      console.error("Error sending client message:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 z-50 flex flex-col items-start">
      
      {/* Expanded Chat Dialog */}
      <div className="bg-white w-[calc(100vw-2rem)] max-w-[360px] sm:w-[380px] h-[500px] sm:h-[530px] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/10 shadow-inner shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center space-x-1.5">
                <h4 className="text-xs sm:text-sm font-black tracking-tight truncate">
                  {getTranslation("তাত্ক্ষণিক গ্রাহক সহায়তা", "Live Support Desk")}
                </h4>
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
              </div>
              <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider truncate">
                {getTranslation("অনলাইনে আমরা আপনার সহায়তায় আছি", "Online & Ready to help")}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full hover:bg-white/20 transition text-white/90 hover:text-white cursor-pointer shrink-0"
            title={getTranslation("বন্ধ করুন", "Close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Identity & Status Sub-bar */}
        <div className="bg-emerald-50/70 border-b border-emerald-100/60 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-700 shrink-0">
          <div className="flex items-center space-x-1.5 min-w-0 truncate">
            {currentUser ? (
              <span className="inline-flex items-center space-x-1 font-bold text-emerald-800 text-[10px] sm:text-[11px] truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{userDisplayName}</span>
              </span>
            ) : (
              <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] font-semibold text-slate-600 truncate">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                {isEditingGuestName ? (
                  <form onSubmit={handleSaveGuestName} className="flex items-center space-x-1">
                    <input
                      type="text"
                      placeholder={getTranslation("আপনার নাম", "Your Name")}
                      value={tempGuestName}
                      onChange={(e) => setTempGuestName(e.target.value)}
                      className="bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-[10px] w-24 outline-none"
                      autoFocus
                    />
                    <button type="submit" className="text-emerald-700 font-bold text-[9px] hover:underline cursor-pointer">
                      {getTranslation("সেভ", "Save")}
                    </button>
                    <button type="button" onClick={() => setIsEditingGuestName(false)} className="text-slate-400 text-[9px] cursor-pointer">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </form>
                ) : (
                  <span className="flex items-center space-x-1 truncate">
                    <span className="truncate">{userDisplayName}</span>
                    <button 
                      onClick={() => {
                        setTempGuestName(guestName);
                        setIsEditingGuestName(true);
                      }} 
                      className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                      title={getTranslation("নাম পরিবর্তন করুন", "Change Name")}
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick optional login link for guests */}
          {!currentUser && (
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenPortal();
              }}
              className="text-emerald-700 hover:text-emerald-900 font-black text-[10px] flex items-center space-x-1 ml-2 shrink-0 hover:underline cursor-pointer"
              title={getTranslation("একাউন্টে লগইন করতে ক্লিক করুন", "Click to sign in")}
            >
              <LogIn className="w-3 h-3" />
              <span>{getTranslation("লগইন", "Login")}</span>
            </button>
          )}
        </div>

        {/* Chat Main Stream */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-slate-50/50 space-y-3 flex flex-col min-h-0">
          {loading && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
              Loading Chat Session...
            </div>
          ) : messages.length === 0 ? (
            // Welcome / empty state
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center animate-bounce shadow-xs">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h5 className="font-black text-slate-800 text-xs sm:text-sm">
                {getTranslation("কাচা বাজার লাইভ সাপোর্টে স্বাগতম!", "Welcome to Live Support!")}
              </h5>
              <p className="text-[11px] text-slate-500 max-w-[220px] leading-relaxed">
                {getTranslation(
                  "যেকোনো প্রশ্ন, পণ্য বা অর্ডার নিয়ে জানতে নিচে লিখুন। আমরা সরাসরি আপনার মেসেজের উত্তর দিব।",
                  "Ask us anything regarding fresh groceries, instant orders, deliveries, or offers. We are ready to assist!"
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
                  <div className={`p-3 rounded-2xl shadow-xs text-xs font-medium leading-relaxed ${
                    isSupport 
                      ? "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-sm" 
                      : "bg-emerald-600 text-white rounded-br-none"
                  }`}>
                    {isSupport && (
                      <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider mb-1">
                        {getTranslation("সাপোর্ট টিম", "Support Agent")}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <div className="flex items-center space-x-1 mt-1 text-[9px] text-slate-400 font-bold px-1">
                    <span>
                      {m.createdAt ? new Date(m.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                    {!isSupport && (
                      <span>
                        {m.isRead ? (
                          <CheckCheck className="w-3 h-3 text-emerald-600 inline-block" />
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

          {/* Support Agent Typing Indicator */}
          {chatRoom?.isTypingSupport && (
            <div className="self-start bg-white border border-slate-200/80 p-2 sm:p-2.5 rounded-full shadow-xs text-[10px] text-emerald-600 font-bold animate-pulse flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{getTranslation("সাপোর্ট এজেন্ট লিখছেন...", "Support Agent is typing...")}</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Form Input Footer - Available for BOTH guest and logged-in user */}
        <form onSubmit={handleSendMessage} className="bg-white border-t border-slate-200/70 p-2.5 sm:p-3 flex items-center space-x-2 shrink-0">
          <input
            type="text"
            placeholder={getTranslation("আপনার প্রশ্ন বা মেসেজ লিখুন...", "Type your message here...")}
            value={newMessageText}
            onChange={handleInputChange}
            className="flex-1 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition font-medium"
            autoFocus={isOpen}
          />
          <button
            type="submit"
            disabled={!newMessageText.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition cursor-pointer disabled:cursor-not-allowed shadow shrink-0"
            title={getTranslation("পাঠান", "Send")}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}

