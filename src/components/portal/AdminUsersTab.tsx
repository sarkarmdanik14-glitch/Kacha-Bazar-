import React, { useState } from "react";
import { 
  User, Store, Bike, DollarSign, Check, X, RefreshCw, 
  Award, FileText, Gift, PlusCircle, ArrowRight 
} from "lucide-react";
import { db, doc, setDoc, updateDoc, collection, serverTimestamp } from "../../lib/firebase";

interface AdminUsersTabProps {
  users: any[];
  transactions: any[];
  referrals: any[];
  lang: "bn" | "en";
  triggerToast: (bn: string, en: string) => void;
  currentUser: any;
}

export default function AdminUsersTab({ users, transactions, referrals, lang, triggerToast, currentUser }: AdminUsersTabProps) {
  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const [activeUserSubTab, setActiveUserSubTab] = useState<"roster" | "referrals" | "transactions">("roster");
  const [activeFilterRole, setActiveFilterRole] = useState<"all" | "customer" | "seller" | "rider" | "admin" | "founder">("all");
  
  // Wallet Adjust state
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<"deposit" | "withdraw">("deposit");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [savingWallet, setSavingWallet] = useState<boolean>(false);

  // Filter roster
  const filteredUsers = users.filter((u) => {
    if (activeFilterRole === "all") return true;
    if (activeFilterRole === "customer") return u.role === "customer" || !u.role;
    return u.role === activeFilterRole;
  });

  // Approved status triggers
  const handleSetSellerStatus = async (sellerId: string, nextStatus: "pending" | "approved" | "rejected" | "suspended") => {
    try {
      await updateDoc(doc(db, "sellers", sellerId), {
        status: nextStatus
      });
      // also update in main users collection
      await updateDoc(doc(db, "users", sellerId), {
        status: nextStatus,
        sellerStatus: nextStatus
      });
      triggerToast(
        `সেলার স্ট্যাটাস আপডেট সম্পন্ন হয়েছে!`,
        `Seller profile registration status set to ${nextStatus} successfully!`
      );
    } catch (err) {
      console.error(err);
      triggerToast("স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।", "Failed to update seller status.");
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      triggerToast(
        `রোল পরিবর্তন সম্পন্ন হয়েছে!`,
        `User role updated to ${newRole} successfully!`
      );
    } catch (err) {
      console.error(err);
      triggerToast("রোল পরিবর্তন ব্যর্থ হয়েছে।", "Failed to update user role.");
    }
  };

  const handleSetRiderStatus = async (riderId: string, nextStatus: "pending" | "approved" | "rejected" | "suspended") => {
    try {
      await updateDoc(doc(db, "riders", riderId), {
        status: nextStatus
      });
      // also update in main users collection
      await updateDoc(doc(db, "users", riderId), {
        status: nextStatus,
        riderStatus: nextStatus
      });
      triggerToast(
        `রাইডার স্ট্যাটাস আপডেট সম্পন্ন হয়েছে!`,
        `Rider profile registration status set to ${nextStatus} successfully!`
      );
    } catch (err) {
      console.error(err);
      triggerToast("স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।", "Failed to update rider status.");
    }
  };

  // Adjust Wallet action
  const handleOpenWalletAdjustment = (user: any) => {
    setSelectedUser(user);
    setAdjustAmount(0);
    setAdjustType("deposit");
    setAdjustReason("");
    setShowWalletModal(true);
  };

  const handleSaveWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || adjustAmount <= 0) {
      triggerToast("সঠিক পরিমাণ প্রদান করুন।", "Please enter a valid monetary amount.");
      return;
    }

    setSavingWallet(true);
    try {
      const uId = selectedUser.uid || selectedUser.id;
      const currentBalance = Number(selectedUser.balance) || 0;
      
      const multiplier = adjustType === "deposit" ? 1 : -1;
      const amountToApply = adjustAmount * multiplier;
      const finalBalance = currentBalance + amountToApply;

      if (finalBalance < 0) {
        triggerToast("অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!", "User has insufficient balance for withdrawal!");
        setSavingWallet(false);
        return;
      }

      // 1. Update wallet balance in primary users collection
      await updateDoc(doc(db, "users", uId), {
        balance: finalBalance
      });

      // 2. Also try updating role specific sub-collections
      if (selectedUser.role === "seller") {
        await updateDoc(doc(db, "sellers", uId), { balance: finalBalance }).catch(() => {});
      } else if (selectedUser.role === "rider") {
        await updateDoc(doc(db, "riders", uId), { balance: finalBalance }).catch(() => {});
      }

      // 3. Update dedicated wallet doc
      await setDoc(doc(db, "wallet", uId), {
        userId: uId,
        balance: finalBalance,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 4. Log custom transaction record for audit trails
      const txId = "tx_admin_" + Date.now().toString(36);
      await setDoc(doc(db, "transactions", txId), {
        id: txId,
        userId: uId,
        userName: selectedUser.displayName || "User",
        type: adjustType,
        amount: adjustAmount,
        description: adjustReason || getTranslation("এডমিন দ্বারা ওয়ালেট সমন্বয়", "Admin manual wallet adjustment"),
        createdAt: serverTimestamp()
      });

      triggerToast("ওয়ালেট ব্যালেন্স আপডেট হয়েছে!", "Wallet balance adjusted and audited successfully!");
      setShowWalletModal(false);
    } catch (err) {
      console.error("Wallet save error:", err);
      triggerToast("ব্যালেন্স আপডেট ব্যর্থ হয়েছে।", "Failed to update wallet balances.");
    } finally {
      setSavingWallet(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-700">
      
      {/* User subtabs */}
      <div className="flex border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveUserSubTab("roster")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap ${
            activeUserSubTab === "roster" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {getTranslation("রস্টার ও অনুমোদন", "User Roster & Approvals")}
        </button>
        <button 
          onClick={() => setActiveUserSubTab("referrals")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap ${
            activeUserSubTab === "referrals" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {getTranslation("রেফারেল ইতিহাস", "Referral History Ledger")}
        </button>
        <button 
          onClick={() => setActiveUserSubTab("transactions")}
          className={`px-5 py-2.5 text-xs font-black cursor-pointer uppercase tracking-wider border-b-2 shrink-0 whitespace-nowrap ${
            activeUserSubTab === "transactions" ? "border-emerald-600 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          {getTranslation("লেনদেন বিবরণী", "Wallet Audit Ledger")}
        </button>
      </div>

      {activeUserSubTab === "roster" && (
        <div className="space-y-4">
          
          {/* Filter roles */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(currentUser?.role === "founder" 
              ? ["all", "customer", "seller", "rider", "admin", "founder"] 
              : ["all", "customer", "seller", "rider"]
            ).map((r) => (
              <button
                key={r}
                onClick={() => setActiveFilterRole(r as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase cursor-pointer transition ${
                  activeFilterRole === r 
                    ? "bg-slate-800 text-white shadow-sm" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {r === "all" ? getTranslation("সব একাউন্ট", "All Roster") : getTranslation(r === "customer" ? "কাস্টমার" : r === "seller" ? "সেলার" : r === "rider" ? "রাইডার" : r === "admin" ? "এডমিন" : "ফাউন্ডার", r)}
              </button>
            ))}
          </div>

          {/* Roster table */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                    <th className="p-4">{getTranslation("ব্যবহারকারী", "User Account")}</th>
                    <th className="p-4">{getTranslation("রোল / তথ্য", "System Role")}</th>
                    <th className="p-4">{getTranslation("ওয়ালেট ব্যালেন্স", "Wallet Balance")}</th>
                    <th className="p-4">{getTranslation("অনুমোদন স্ট্যাটাস", "Approval Status")}</th>
                    <th className="p-4 text-center">{getTranslation("অ্যাকশন", "Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-slate-400 font-bold">
                        {getTranslation("কোন ইউজার রেকর্ড পাওয়া যায়নি।", "No matching user logs found.")}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid || u.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-extrabold text-slate-800">{u.displayName || "Kacha Bazar User"}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{u.email}</div>
                          <div className="text-[10px] text-indigo-500 font-bold">{u.phoneNumber || u.phone}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              u.role === "founder" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                              u.role === "admin" ? "bg-red-50 text-red-600 border border-red-200" :
                              u.role === "seller" ? "bg-amber-50 text-amber-600" :
                              u.role === "rider" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                            }`}>
                              {u.role || "customer"}
                            </span>
                            {currentUser?.role === "founder" && (u.uid || u.id) !== currentUser?.uid && (
                              <select
                                value={u.role || "customer"}
                                onChange={(e) => handleUpdateUserRole(u.uid || u.id, e.target.value)}
                                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold outline-none focus:border-emerald-500 text-slate-700 mt-1"
                              >
                                <option value="customer">Customer</option>
                                <option value="seller">Seller</option>
                                <option value="rider">Rider</option>
                                <option value="admin">Admin</option>
                                <option value="founder">Founder</option>
                              </select>
                            )}
                          </div>
                          {u.shopName && <div className="text-[10px] text-slate-400 font-bold mt-1 capitalize">Shop: {u.shopName}</div>}
                          {u.vehicleType && <div className="text-[10px] text-slate-400 font-bold mt-1">Vehicle: {u.vehicleType}</div>}
                        </td>
                        <td className="p-4">
                          <div className="font-extrabold text-slate-800">৳{Number(u.balance) || 0}</div>
                          <button 
                            onClick={() => handleOpenWalletAdjustment(u)}
                            className="text-[10px] font-black uppercase text-emerald-600 hover:underline mt-1 block cursor-pointer"
                          >
                            {getTranslation("ব্যালেন্স সমন্বয়", "Adjust Wallet")}
                          </button>
                        </td>
                        <td className="p-4">
                          {u.role === "seller" && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              (u.sellerStatus || u.status || "pending") === "approved" ? "bg-emerald-50 text-emerald-600" :
                              (u.sellerStatus || u.status || "pending") === "rejected" ? "bg-red-50 text-red-600" :
                              (u.sellerStatus || u.status || "pending") === "suspended" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                              "bg-amber-50 text-amber-600 animate-pulse"
                            }`}>
                              {u.sellerStatus || u.status || "pending"}
                            </span>
                          )}
                          {u.role === "rider" && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              (u.riderStatus || u.status || "pending") === "approved" || (u.riderStatus || u.status || "pending") === "active" ? "bg-emerald-50 text-emerald-600" :
                              (u.riderStatus || u.status || "pending") === "rejected" ? "bg-red-50 text-red-600" :
                              (u.riderStatus || u.status || "pending") === "suspended" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                              "bg-amber-50 text-amber-600 animate-pulse"
                            }`}>
                              {u.riderStatus || u.status || "pending"}
                            </span>
                          )}
                          {(u.role === "customer" || !u.role) && (
                            <span className="text-[10px] font-bold text-slate-400">{getTranslation("স্বয়ংক্রিয় সক্রিয়", "Auto-active")}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {u.role === "seller" && (
                              <select
                                value={u.sellerStatus || u.status || "pending"}
                                onChange={(e) => handleSetSellerStatus(u.uid || u.id, e.target.value as any)}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[11px] font-bold outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            )}
                            {u.role === "rider" && (
                              <select
                                value={u.riderStatus || u.status || "pending"}
                                onChange={(e) => handleSetRiderStatus(u.uid || u.id, e.target.value as any)}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-2 py-1 text-[11px] font-bold outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeUserSubTab === "referrals" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            {getTranslation("রেফারেল ট্র্যাকিং লেজার", "Referral Connections Ledger")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[580px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                  <th className="p-4">{getTranslation("রেফারার ইউজার আইডি", "Referrer User ID")}</th>
                  <th className="p-4 text-center"></th>
                  <th className="p-4">{getTranslation("আমন্ত্রিত ইউজার আইডি", "Referred User ID")}</th>
                  <th className="p-4">{getTranslation("স্ট্যাটাস", "Status")}</th>
                  <th className="p-4">{getTranslation("বোনাস বিতরণ", "Reward Disbursed")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-slate-400 font-bold">
                      {getTranslation("কোন রেফারেল ডাটা নেই।", "No client referrals tracked yet.")}
                    </td>
                  </tr>
                ) : (
                  referrals.map((ref) => (
                    <tr key={ref.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-indigo-600">{ref.referrerId}</td>
                      <td className="p-4 text-center">
                        <ArrowRight className="w-4 h-4 text-slate-350 inline-block" />
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-500">{ref.referredId}</td>
                      <td className="p-4 capitalize">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ref.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {ref.status || "pending"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`font-black ${ref.bonusPaid ? "text-emerald-600" : "text-slate-400"}`}>
                          {ref.bonusPaid ? getTranslation("হ্যাঁ (বিতরণ সম্পন্ন)", "Paid (৳Reward sent)") : getTranslation("অপেক্ষমান", "No")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeUserSubTab === "transactions" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-5">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            {getTranslation("ওয়ালেট ক্যাশ ট্রানজেকশন অডিট লেজার", "Financial Transactions Audit Log")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[580px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                  <th className="p-4">{getTranslation("আইডি", "Transaction ID")}</th>
                  <th className="p-4">{getTranslation("ব্যবহারকারী আইডি", "Beneficiary ID")}</th>
                  <th className="p-4">{getTranslation("ধরণ", "Action")}</th>
                  <th className="p-4">{getTranslation("পরিমাণ", "Amount")}</th>
                  <th className="p-4">{getTranslation("বিবরণ", "Audit Reason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-slate-400 font-bold">
                      {getTranslation("কোন লেনদেন সম্পন্ন হয়নি।", "No system financial logs created yet.")}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-slate-400">{tx.id}</td>
                      <td className="p-4 font-mono font-bold text-slate-500">{tx.userId}</td>
                      <td className="p-4 font-black">
                        <span className={`uppercase text-[10px] px-2 py-0.5 rounded-full ${
                          tx.type === "deposit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-black text-slate-800">৳{tx.amount}</td>
                      <td className="p-4 text-xs font-bold text-slate-500">{tx.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Wallet Adjustment Modal */}
      {showWalletModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up text-slate-700">
            {/* Header */}
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100 shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    {getTranslation("ওয়ালেট তহবিল সমন্বয়", "Adjust User Wallet Funds")}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {selectedUser.displayName || selectedUser.email}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWalletAdjustment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-6 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold">
                  <div>Name: {selectedUser.displayName}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Current Balance: ৳{selectedUser.balance || 0}</div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button" 
                      onClick={() => setAdjustType("deposit")}
                      className={`py-2 rounded-xl text-xs font-black cursor-pointer uppercase ${
                        adjustType === "deposit" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {getTranslation("আমানত (Deposit)", "Deposit")}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setAdjustType("withdraw")}
                      className={`py-2 rounded-xl text-xs font-black cursor-pointer uppercase ${
                        adjustType === "withdraw" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {getTranslation("উত্তোলন (Withdraw)", "Withdraw")}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Amount (৳)</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    value={adjustAmount} 
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Audit Trail Reason / Notes</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Campaign winner prize, Delivery compensation" 
                    value={adjustReason} 
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500" 
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
                <button 
                  type="button"
                  onClick={() => setShowWalletModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {getTranslation("বাতিল", "Cancel")}
                </button>
                <button 
                  type="submit"
                  disabled={savingWallet}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingWallet && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{getTranslation("সমন্বয় নিশ্চিত করুন", "Confirm Balance Change")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
