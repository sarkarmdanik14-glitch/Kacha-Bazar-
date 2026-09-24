import React, { useState, useEffect, useRef } from "react";
import { X, Send, User, MessageSquare, Phone, Check, ShieldCheck } from "lucide-react";
import { db, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion } from "../../lib/firebase";
import { BuySellListing, BuySellChat, BuySellChatMessage } from "../../types/buySell";

interface BuySellChatModalProps {
  listing: BuySellListing;
  currentUser: any;
  lang: "bn" | "en";
  onClose: () => void;
  triggerToast: (bn: string, en: string) => void;
}

export default function BuySellChatModal({
  listing,
  currentUser,
  lang,
  onClose,
  triggerToast
}: BuySellChatModalProps) {
  const [messages, setMessages] = useState<BuySellChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate deterministic chat ID based on listing and buyer UID
  const isSeller = currentUser?.uid === listing.sellerUid;
  // If user is buyer: chatId = `${listing.id}_${currentUser.uid}`
  // If seller opened the chat directly, we need buyerUid or default to a direct thread
  const chatId = `${listing.id}_${currentUser?.uid || "guest"}`;

  useEffect(() => {
    if (!currentUser?.uid) return;

    const chatRef = doc(db, "buy_sell_chats", chatId);
    const unsubscribe = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as BuySellChat;
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    }, (err) => {
      console.warn("BuySell chat error:", err);
    });

    return () => unsubscribe();
  }, [chatId, currentUser?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || !currentUser?.uid) return;

    setSending(true);
    try {
      const chatRef = doc(db, "buy_sell_chats", chatId);
      const chatSnap = await getDoc(chatRef);

      const newMessage: BuySellChatMessage = {
        id: `msg_${Date.now()}`,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || (lang === "bn" ? "ব্যবহারকারী" : "User"),
        text,
        createdAt: new Date().toISOString()
      };

      if (!chatSnap.exists()) {
        const initialChatData: BuySellChat = {
          id: chatId,
          listingId: listing.id,
          listingTitle: listing.title,
          listingPrice: listing.price,
          listingImage: listing.images?.[0] || "",
          sellerUid: listing.sellerUid,
          sellerName: listing.sellerName,
          buyerUid: currentUser.uid,
          buyerName: currentUser.displayName || (lang === "bn" ? "ক্রেতা" : "Buyer"),
          lastMessage: text,
          lastMessageAt: new Date(),
          messages: [newMessage]
        };
        await setDoc(chatRef, initialChatData);
      } else {
        await updateDoc(chatRef, {
          lastMessage: text,
          lastMessageAt: new Date(),
          messages: arrayUnion(newMessage)
        });
      }

      setInputText("");
    } catch (err) {
      console.error("Error sending message:", err);
      triggerToast("মেসেজ পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।", "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 h-[600px]">
        {/* Header */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
              {isSeller ? (
                <User className="w-5 h-5" />
              ) : (
                listing.sellerName ? listing.sellerName.charAt(0).toUpperCase() : "S"
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-800 truncate">
                {isSeller ? (lang === "bn" ? "ক্রেতার সাথে চ্যাট" : "Chat with Buyer") : listing.sellerName}
              </h4>
              <p className="text-[11px] text-emerald-600 font-medium truncate flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{listing.title} • ৳{listing.price.toLocaleString("bn-BD")}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Snapshot banner */}
        <div className="flex-shrink-0 px-4 py-2 bg-emerald-50/60 border-b border-emerald-100/60 flex items-center justify-between text-xs">
          <span className="text-emerald-900 font-medium truncate">
            {lang === "bn" ? "পণ্য:" : "Item:"} <span className="font-bold">{listing.title}</span>
          </span>
          <span className="text-emerald-700 font-black shrink-0 ml-2">
            ৳{listing.price.toLocaleString("bn-BD")} {listing.isNegotiable && (lang === "bn" ? "(আলোচনা সাপেক্ষে)" : "(Negotiable)")}
          </span>
        </div>

        {/* Message Thread */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 bg-slate-50/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <MessageSquare className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-600 mb-1">
                {lang === "bn" ? "কোনো মেসেজ পাঠানো হয়নি" : "No messages yet"}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                {lang === "bn"
                  ? "সেলারকে দাম বা পণ্য সম্পর্কে যেকোনো প্রশ্ন সরাসরি মেসেজ করে জানতে পারেন।"
                  : "Say hello and ask about availability, condition, or price negotiation."}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderUid === currentUser?.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                    {isMine ? (lang === "bn" ? "আপনি" : "You") : msg.senderName}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs ${
                      isMine
                        ? "bg-emerald-600 text-white rounded-tr-xs"
                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-xs"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSendMessage} className="flex-shrink-0 p-3 sm:p-4 bg-gray-50/50 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={lang === "bn" ? "মেসেজ লিখুন..." : "Type your message..."}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-full border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-40 transition cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
