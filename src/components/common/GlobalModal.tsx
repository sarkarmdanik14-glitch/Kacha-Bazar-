import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface GlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string; // defaults to "max-w-2xl"
  customHeader?: React.ReactNode;
  hideHeader?: boolean;
  contentClassName?: string;
  className?: string;
  zIndexClass?: string;
}

/**
 * Standard Global Modal component enforcing the universal layout:
 * - Backdrop: fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto
 * - Card: max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden
 * - Header: flex-shrink-0
 * - Body: overflow-y-auto flex-1 p-6 space-y-4
 * - Footer: flex-shrink-0 p-4 border-t flex flex-wrap gap-2 justify-end bg-gray-50/50
 */
export const GlobalModal: React.FC<GlobalModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerRight,
  children,
  footer,
  maxWidthClass = "max-w-2xl",
  customHeader,
  hideHeader = false,
  contentClassName = "overflow-y-auto flex-1 p-6 space-y-4",
  className = "",
  zIndexClass = "z-50"
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[85vh] sm:max-h-[90vh] flex flex-col w-full ${maxWidthClass} bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Fixed Header */}
        {!hideHeader && (
          customHeader || (
            <div className="flex-shrink-0 p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  {title && (
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-xs text-slate-500 font-medium truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {headerRight}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )
        )}

        {/* Scrollable Body */}
        <div className={contentClassName}>
          {children}
        </div>

        {/* Fixed Bottom Footer */}
        {footer && (
          <div className="flex-shrink-0 p-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end bg-gray-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalModal;
