import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5EFE6]">
          <div className="w-full max-w-lg bg-[#FFFDF7] border-2 border-[#8B1E27] rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center text-[#8B1E27] border border-red-200">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-heading text-[#4A2E18] mb-2">
              เกิดข้อผิดพลาดในการแสดงผล
            </h2>
            <p className="text-sm text-stone-600 mb-4 leading-relaxed">
              ขออภัยในความไม่สะดวก ระบบได้บันทึกข้อมูลตารางเวรและการตั้งค่าไว้ในพื้นที่จัดเก็บอย่างปลอดภัยแล้ว
            </p>
            {this.state.error && (
              <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl font-mono text-left mb-6 overflow-x-auto max-h-32 border border-red-200">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#8B1E27] hover:bg-[#721820] text-white font-semibold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>รีโหลดหน้าเว็บใหม่</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
