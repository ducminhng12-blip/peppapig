/**
 * Net Tycoon Unity C# - Tương Tác Bàn Máy Tính & Simulator
 * Full Production C# Scripts, 3D First-Person Sandbox & Customer Satisfaction System
 */

import React, { useState, useCallback } from 'react';
import { defaultScriptConfig, ScriptConfig } from './data/csharpScripts';
import { ThreeSimulator } from './components/ThreeSimulator';
import { ManagementPanel } from './components/ManagementPanel';
import { TycoonEngine } from './game/tycoonEngine';
import { ScriptViewer } from './components/ScriptViewer';
import { UnityStepGuide } from './components/UnityStepGuide';
import { UnityInspectorMockup } from './components/UnityInspectorMockup';
import { CodeConfigurator } from './components/CodeConfigurator';
import {
  SatisfactionDashboard,
  CustomerSatisfactionBreakdown,
} from './components/SatisfactionDashboard';
import {
  Monitor,
  Code2,
  ListOrdered,
  Eye,
  Sliders,
  Sparkles,
  Gamepad2,
  Smile,
  Star,
  Users,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'simulator' | 'satisfaction' | 'scripts' | 'guide' | 'inspector' | 'config'
  >('simulator');
  const [config, setConfig] = useState<ScriptConfig>(defaultScriptConfig);
  // Engine kinh tế dùng chung cho mô phỏng 3D và bảng quản lý (tự lưu vào localStorage)
  const [engine] = useState(() => new TycoonEngine({ useStorage: true }));
  const scrollToManagement = useCallback(() => {
    document.getElementById('management-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const [activeCustomers, setActiveCustomers] = useState<CustomerSatisfactionBreakdown[]>([]);
  const [recentReviews, setRecentReviews] = useState<CustomerSatisfactionBreakdown[]>([]);

  const resetConfig = useCallback(() => {
    setConfig(defaultScriptConfig);
  }, []);

  const handleSatisfactionUpdated = useCallback((
    customers: CustomerSatisfactionBreakdown[],
    reviews: CustomerSatisfactionBreakdown[]
  ) => {
    setActiveCustomers(customers);
    setRecentReviews(reviews);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. TOP BAR CONTRACT: 3 Zones */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <a
              href="/"
              className="text-base md:text-lg font-bold tracking-tight text-white hover:text-emerald-400 transition-colors"
            >
              Net Tycoon Unity Dev Suite
            </a>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-400">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                activeTab === 'simulator' ? 'text-emerald-400 font-semibold' : ''
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Mô Phỏng 3D</span>
            </button>
            <button
              onClick={() => setActiveTab('satisfaction')}
              className={`hover:text-white transition-colors flex items-center gap-1.5 ${
                activeTab === 'satisfaction' ? 'text-emerald-400 font-semibold' : ''
              }`}
            >
              <Smile className="w-3.5 h-3.5 text-pink-400" />
              <span>Điểm Hài Lòng (Base 70)</span>
            </button>
            <button
              onClick={() => setActiveTab('scripts')}
              className={`hover:text-white transition-colors ${
                activeTab === 'scripts' ? 'text-emerald-400 font-semibold' : ''
              }`}
            >
              Bộ Mã Nguồn C#
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`hover:text-white transition-colors ${
                activeTab === 'guide' ? 'text-emerald-400 font-semibold' : ''
              }`}
            >
              Hướng Dẫn Click Unity
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`hover:text-white transition-colors ${
                activeTab === 'inspector' ? 'text-emerald-400 font-semibold' : ''
              }`}
            >
              Unity Inspector
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`hover:text-white transition-colors ${
                activeTab === 'config' ? 'text-emerald-400 font-semibold' : ''
              }`}
            >
              Tùy Biến Code
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('satisfaction')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-pink-600/30 hover:bg-pink-600/50 text-pink-300 border border-pink-500/40 transition-all flex items-center gap-1.5"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Bảng Điểm Hài Lòng</span>
            </button>
            <button
              onClick={() => setActiveTab('scripts')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Xem C# Scripts</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. SUB-HERO & REQUIREMENT RECAP */}
      <div className="border-b border-slate-900 bg-gradient-to-b from-slate-900/60 to-transparent px-4 md:px-8 py-5">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Metadata chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
            <span>Unity 3D First Person</span>
            <span aria-hidden="true">·</span>
            <span className="text-pink-400 font-semibold">
              Hệ Thống Mức Độ Hài Lòng (Base 70 &rarr; 0-100)
            </span>
            <span aria-hidden="true">·</span>
            <span>Customer AI (Học Sinh · Game Thủ · VIP)</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-semibold">
              Chất Lượng Máy (RAM &times; 2, VGA &times; 3, Màn &times; 2)
            </span>
            <span aria-hidden="true">·</span>
            <span>Hàng Đợi Chờ (WaitingQueue)</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Net Tycoon: Hệ Thống Mức Độ Hài Lòng &amp; Nâng Cấp Bàn Máy Tính
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Hệ thống điểm hài lòng khởi điểm <strong className="text-emerald-400">70 điểm</strong>, kết hợp
            chất lượng linh kiện (RAM, VGA, Màn hình), giá thuê, thời gian chờ hàng đợi, internet, điều hòa, đồ ăn để cho ra{' '}
            <strong className="text-pink-400">Final Satisfaction</strong>, 5 mức cảm xúc (😍 🙂 😐 😕 😡) và đánh giá sao (1-5 ⭐).
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold text-base">
                😍
              </div>
              <div>
                <div className="font-bold text-white">5 Mức Độ Hài Lòng &amp; Sao</div>
                <div className="text-slate-400 text-[11px]">
                  80-100 😍 (5⭐), 60-79 🙂 (4⭐), 40-59 😐 (3⭐), 20-39 😕 (2⭐), 0-19 😡 (1⭐)
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                +22đ
              </div>
              <div>
                <div className="font-bold text-white">Điểm Chất Lượng Máy Tính</div>
                <div className="text-slate-400 text-[11px]">
                  RAM (Lvl&times;2) + VGA (Lvl&times;3) + Màn hình (Lvl&times;2)
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                -10đ
              </div>
              <div>
                <div className="font-bold text-white">Hàng Đợi Chờ (WaitingQueue)</div>
                <div className="text-slate-400 text-[11px]">
                  Hết máy khách vào ghế chờ. Chờ lâu trừ 10đ, chờ quá 18s bỏ về
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="px-4 md:px-8 pt-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>1. Trình Mô Phỏng 3D &amp; Badge Cảm Xúc</span>
            </button>

            <button
              onClick={() => setActiveTab('satisfaction')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'satisfaction'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smile className="w-4 h-4 text-pink-300" />
              <span>2. Bảng Tính Điểm Hài Lòng (Live Lab)</span>
            </button>

            <button
              onClick={() => setActiveTab('scripts')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'scripts'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>3. Trọn Bộ C# Scripts Hoàn Chỉnh</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>4. Hướng Dẫn Từng Click Trong Unity</span>
            </button>

            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'inspector'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>5. Mô Phỏng Inspector Unity</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'config'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>6. Tùy Biến Tham Số Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. TAB CONTENTS */}
      <main className="flex-1 px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <ThreeSimulator
                config={config}
                engine={engine}
                onOpenManagement={scrollToManagement}
                onSatisfactionUpdated={handleSatisfactionUpdated}
              />

              <ManagementPanel engine={engine} />

              {/* Guide cards below simulator */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="font-bold text-pink-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-pink-400" />
                    <span>Badge Điểm Cảm Xúc Trên Đầu Khách</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Mỗi khách hàng có badge hiển thị biểu cảm (😍 🙂 😐 😕 😡), điểm số (0-100) và số sao. Click vào
                    badge trên đầu khách để mở phiếu tính điểm chi tiết (Base 70 + Linh kiện + Mạng + Điều hòa...).
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="font-bold text-sky-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>Nâng Cấp Máy &rarr; Tăng Điểm Hài Lòng</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Tiến lại gần bàn máy &lt; 2m, bấm <strong>[{config.interactKey}]</strong> để nâng cấp Monitor, VGA, RAM.
                    Điểm chất lượng máy tăng ngay lập tức (RAM &times; 2, VGA &times; 3, Màn &times; 2)!
                  </p>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="font-bold text-amber-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Hàng Ghế Đợi &amp; Công Tắc Môi Trường</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Thanh điều khiển ở góc trên cho phép bấm đổi gói Mạng 1Gbps/Lag, bật/tắt Điều hòa 22°C, Đồ ăn mì cay,
                    xem phản ứng điểm số khách thay đổi tức thì!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'satisfaction' && (
            <SatisfactionDashboard
              activeCustomers={activeCustomers}
              recentReviews={recentReviews}
            />
          )}

          {activeTab === 'scripts' && <ScriptViewer config={config} />}

          {activeTab === 'guide' && <UnityStepGuide config={config} />}

          {activeTab === 'inspector' && <UnityInspectorMockup config={config} />}

          {activeTab === 'config' && (
            <CodeConfigurator config={config} onChange={setConfig} onReset={resetConfig} />
          )}
        </div>
      </main>

      {/* 5. FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 md:px-8 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>Net Tycoon Unity C# Framework</span>
            <span aria-hidden="true">·</span>
            <span>Customer Satisfaction &amp; Hardware Upgrade System</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('satisfaction')}
              className="hover:text-pink-400 transition-colors"
            >
              Bảng Điểm Hài Lòng
            </button>
            <button
              onClick={() => setActiveTab('scripts')}
              className="hover:text-emerald-400 transition-colors"
            >
              Mã nguồn C#
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className="hover:text-emerald-400 transition-colors"
            >
              Hướng dẫn Unity
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className="hover:text-emerald-400 transition-colors"
            >
              Mô phỏng 3D
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
