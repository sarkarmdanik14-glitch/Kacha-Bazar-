import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, X, Loader2, ShieldAlert, Archive, CheckCircle2, Package } from "lucide-react";
import { checkProductOrderUsage, executeDeleteProduct, OrderUsageCheckResult } from "../../lib/productDeleteService";
import { toBnNum } from "../../lib/productWeightUtils";
import { SAFE_PRODUCT_PLACEHOLDER } from "../../lib/masterImageRegistry";

interface DeleteProductConfirmModalProps {
  isOpen: boolean;
  product: any | null;
  orders?: any[];
  user?: any;
  lang: "bn" | "en";
  onClose: () => void;
  onSuccess: (deletedProductId: string, mode: "permanent" | "soft_delete") => void;
  triggerToast: (bn: string, en: string) => void;
}

export default function DeleteProductConfirmModal({
  isOpen,
  product,
  orders = [],
  user,
  lang,
  onClose,
  onSuccess,
  triggerToast
}: DeleteProductConfirmModalProps) {
  const [checking, setChecking] = useState<boolean>(true);
  const [orderCheck, setOrderCheck] = useState<OrderUsageCheckResult>({ hasOrders: false, orderCount: 0 });
  const [deleting, setDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getTranslation = (bn: string, en: string) => (lang === "bn" ? bn : en);

  // Analyze whether the product was used in orders upon modal open
  useEffect(() => {
    let isMounted = true;

    if (isOpen && product) {
      setChecking(true);
      setErrorMsg(null);

      checkProductOrderUsage(product.id, product.sku, orders)
        .then((res) => {
          if (isMounted) {
            setOrderCheck(res);
            setChecking(false);
          }
        })
        .catch((err) => {
          console.warn("Failed to check product orders:", err);
          if (isMounted) {
            setOrderCheck({ hasOrders: false, orderCount: 0 });
            setChecking(false);
          }
        });
    } else {
      setChecking(false);
      setOrderCheck({ hasOrders: false, orderCount: 0 });
      setErrorMsg(null);
      setDeleting(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, product, orders]);

  // Escape key handler to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !deleting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleting, onClose]);

  if (!isOpen || !product) return null;

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setErrorMsg(null);

    try {
      const result = await executeDeleteProduct(product.id, {
        hasOrders: orderCheck.hasOrders,
        user: user
      });

      if (result.success) {
        triggerToast(result.messageBn, result.messageEn);
        onSuccess(product.id, result.mode);
        onClose();
      } else {
        throw new Error("Deletion failed");
      }
    } catch (err: any) {
      console.error("Delete product error:", err);
      const msg = err?.message || getTranslation("পণ্য ডিলিট করতে সমস্যা হয়েছে।", "Failed to delete product.");
      setErrorMsg(msg);
      triggerToast("পণ্য ডিলিট ব্যর্থ হয়েছে", "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) {
          onClose();
        }
      }}
    >
      <div 
        className="max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${orderCheck.hasOrders ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
              {orderCheck.hasOrders ? (
                <Archive className="w-5 h-5" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {getTranslation("পণ্য ডিলিট নিশ্চিতকরণ", "Confirm Product Deletion")}
              </h3>
              <p className="text-xs text-slate-500">
                {orderCheck.hasOrders 
                  ? getTranslation("অর্ডার হিস্ট্রি থাকায় সফট ডিলিট / নিষ্ক্রিয় হবে", "Soft Delete / Inactivation due to order history")
                  : getTranslation("ডাটাবেজ ও ইনভেন্টরি থেকে স্থায়ীভাবে মুছে যাবে", "Permanent deletion from catalog & database")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          
          {/* Product Summary Card */}
          <div className="flex items-center space-x-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <img 
              src={product.image || product.imageUrl || SAFE_PRODUCT_PLACEHOLDER} 
              alt={product.nameEn || "Product"} 
              className="w-16 h-16 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
              onError={(e) => {
                const target = (e.currentTarget || e.target) as HTMLImageElement;
                target.onerror = null;
                if (target.dataset.triedFallback === "true") return;
                target.dataset.triedFallback = "true";
                target.src = SAFE_PRODUCT_PLACEHOLDER;
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {product.category || "General"}
                </span>
                {product.sku && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    SKU: {product.sku}
                  </span>
                )}
              </div>
              <h4 className="font-bold text-slate-800 text-sm mt-0.5 truncate">
                {product.nameBn || product.nameEn}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {product.nameEn}
              </p>
              <div className="flex items-center space-x-3 mt-1 text-xs text-slate-600">
                <span>মূল্য: ৳{toBnNum(product.price || 0)} / {product.unitBn || product.unitEn || "১ কেজি"}</span>
                <span>•</span>
                <span>স্টক: {toBnNum(product.stock || 0)} টি</span>
              </div>
            </div>
          </div>

          {/* Dynamic Order History Status Card */}
          {checking ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center space-x-2 text-slate-600 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>{getTranslation("অর্ডারের ইতিহাস যাচাই করা হচ্ছে...", "Checking order history across database...")}</span>
            </div>
          ) : orderCheck.hasOrders ? (
            <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {getTranslation(
                    `এই পণ্যটি ${toBnNum(orderCheck.orderCount)} টি অর্ডারে ব্যবহৃত হয়েছে (সফট ডিলিট হবে)`,
                    `Product was used in ${orderCheck.orderCount} order(s) (Soft Delete applied)`
                  )}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-amber-800/90">
                {getTranslation(
                  "অতীতের গ্রাহক অর্ডার, ইনভয়েস ও মেমোর সঠিকতা রক্ষার্থে এটি ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হবে না। বরং এটিকে 'সফট ডিলিট / নিষ্ক্রিয়' করা হবে। ফলে এটি সক্রিয় ইনভেন্টরি ও স্টোর ক্যাটালগ থেকে সাথে সাথে অদৃশ্য হয়ে যাবে।",
                  "To protect past customer invoices and accounting history, this product will not be permanently deleted. Instead, it will be safely soft-deleted/inactivated and immediately hidden from active inventory and the store catalog."
                )}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl text-red-900 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  {getTranslation("কোনো অতীত অর্ডারে ব্যবহৃত হয়নি (Permanent Delete)", "No past order history found (Permanent Delete)")}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-red-800/90">
                {getTranslation(
                  "এই পণ্যটি অতীতে কোনো অর্ডারে যুক্ত হয়নি। কনফার্ম করলে ডাটাবেজ এবং ইনভেন্টরি তালিকা থেকে পণ্যটি চিরতরে মুছে ফেলা হবে।",
                  "This item has never been purchased in any past orders. Confirming will permanently remove it from the database and inventory."
                )}
              </p>
            </div>
          )}

          {/* Error Message Display */}
          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {getTranslation("বাতিল করুন", "Cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting || checking}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition flex items-center space-x-2 cursor-pointer disabled:opacity-50 ${
              orderCheck.hasOrders 
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" 
                : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
            }`}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{getTranslation("ডিলিট করা হচ্ছে...", "Deleting...")}</span>
              </>
            ) : orderCheck.hasOrders ? (
              <>
                <Archive className="w-4 h-4" />
                <span>{getTranslation("সফট ডিলিট কনফার্ম করুন", "Confirm Soft Delete")}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{getTranslation("স্থায়ীভাবে ডিলিট করুন", "Confirm Permanent Delete")}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
