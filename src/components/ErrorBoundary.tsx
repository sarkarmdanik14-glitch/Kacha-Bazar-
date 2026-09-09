import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errMsg = error?.message || "";
    const isTransientStartupError = 
      errMsg.includes("useState") || 
      errMsg.includes("useContext") || 
      errMsg.includes("dispatcher") || 
      errMsg.includes("null (reading 'use");

    if (isTransientStartupError && this.retryCount < this.maxRetries) {
      console.warn("Transient startup state detected, auto-recovering component tree:", errMsg);
      this.retryCount += 1;
      this.setState({ isRecovering: true });
      setTimeout(() => {
        this.setState({ hasError: false, error: null, isRecovering: false });
      }, 100);
      return;
    }

    console.error("Uncaught application error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.retryCount = 0;
    this.setState({ hasError: false, error: null, isRecovering: false });
  };

  public render() {
    if (this.state.isRecovering) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">লোড হচ্ছে...</p>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900">
              কিছু একটা সমস্যা হয়েছে
            </h2>
            
            <p className="text-sm text-slate-600 leading-relaxed">
              একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে পেজটি রিলোড দিন অথবা পুনরায় চেষ্টা করুন।
            </p>

            {this.state.error?.message && (
              <div className="bg-slate-50 rounded-xl p-3 text-left border border-slate-200 overflow-auto max-h-24">
                <p className="text-xs font-mono text-slate-600 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                পুনরায় চেষ্টা করুন
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-emerald-900/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>পেজ রিলোড দিন</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
