import React from 'react';
import { ScriptConfig } from '../data/csharpScripts';
import { Sliders, RefreshCw, Sparkles, Keyboard, DollarSign, Clock, Radio } from 'lucide-react';

interface CodeConfiguratorProps {
  config: ScriptConfig;
  onChange: (newConfig: ScriptConfig) => void;
  onReset: () => void;
}

export const CodeConfigurator: React.FC<CodeConfiguratorProps> = ({ config, onChange, onReset }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
            <Sliders className="w-4 h-4" />
            <span>Tùy Biến Trực Tiếp Cấu Hình Game &amp; C# Scripts</span>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white mt-1">
            Điều Chỉnh Tham Số (Tự Động Cập Nhật Code C# &amp; 3D Simulator)
          </h3>
        </div>

        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          title="Khôi phục lại giá trị mặc định của đề bài"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Mặc Định Đề Bài</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Doanh thu mỗi chu kỳ (+5.000 VNĐ) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Doanh Thu Mỗi Lần Cộng (VNĐ)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="1000"
              min="1000"
              max="500000"
              value={config.revenuePerTick}
              onChange={e => onChange({ ...config, revenuePerTick: Math.max(1000, Number(e.target.value) || 5000) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-400 font-semibold shrink-0">VNĐ</span>
          </div>
          <div className="flex gap-1.5 text-[11px]">
            {[3000, 5000, 10000, 20000].map(val => (
              <button
                key={val}
                onClick={() => onChange({ ...config, revenuePerTick: val })}
                className={`px-2 py-0.5 rounded border ${
                  config.revenuePerTick === val
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {val.toLocaleString('vi-VN')}đ
              </button>
            ))}
          </div>
        </div>

        {/* 2. Chu kỳ đếm giờ (3 giây) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Chu Kỳ Cộng Tiền (Giây)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="1"
              max="60"
              value={config.tickInterval}
              onChange={e => onChange({ ...config, tickInterval: Math.max(0.5, Number(e.target.value) || 3) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500"
            />
            <span className="text-xs text-slate-400 font-semibold shrink-0">Giây</span>
          </div>
          <div className="flex gap-1.5 text-[11px]">
            {[1, 2, 3, 5, 10].map(val => (
              <button
                key={val}
                onClick={() => onChange({ ...config, tickInterval: val })}
                className={`px-2 py-0.5 rounded border ${
                  config.tickInterval === val
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {val}s
              </button>
            ))}
          </div>
        </div>

        {/* 3. Khoảng cách tương tác (< 2m) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-amber-400" />
            <span>Khoảng Cách Tương Tác (Mét)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="1"
              max="10"
              value={config.interactDistance}
              onChange={e => onChange({ ...config, interactDistance: Math.max(0.5, Number(e.target.value) || 2) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-400 font-semibold shrink-0">Mét (m)</span>
          </div>
          <div className="flex gap-1.5 text-[11px]">
            {[1.5, 2.0, 2.5, 3.0].map(val => (
              <button
                key={val}
                onClick={() => onChange({ ...config, interactDistance: val })}
                className={`px-2 py-0.5 rounded border ${
                  config.interactDistance === val
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {val}m
              </button>
            ))}
          </div>
        </div>

        {/* 4. Phím tương tác trên PC (KeyCode.E) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Keyboard className="w-4 h-4 text-purple-400" />
            <span>Phím Bấm Tương Tác Trên PC</span>
          </label>
          <select
            value={config.interactKey}
            onChange={e => onChange({ ...config, interactKey: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-500"
          >
            <option value="E">Phím [E] (Mặc định chuẩn)</option>
            <option value="F">Phím [F] (Tương tác chuẩn FPS)</option>
            <option value="R">Phím [R]</option>
            <option value="Space">Phím [Space] (Dấu cách)</option>
          </select>
          <p className="text-[11px] text-slate-400">
            Tự động sinh mã <code className="text-purple-300">KeyCode.{config.interactKey}</code> trong file PlayerInteraction.cs.
          </p>
        </div>

        {/* 5. Hệ thống Input System */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Hệ Thống Input Trong Unity</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChange({ ...config, useNewInputSystem: false })}
              className={`p-2.5 rounded-lg border text-xs font-semibold transition-all text-left ${
                !config.useNewInputSystem
                  ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold">Legacy Input</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Input.GetKeyDown()</div>
            </button>
            <button
              onClick={() => onChange({ ...config, useNewInputSystem: true })}
              className={`p-2.5 rounded-lg border text-xs font-semibold transition-all text-left ${
                config.useNewInputSystem
                  ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold">New Input System</div>
              <div className="text-[10px] text-slate-400 mt-0.5">UnityEngine.InputSystem</div>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Khuyên dùng <strong>Legacy Input</strong> nếu dự án mới hoặc dùng Unity bản thường.
          </p>
        </div>

        {/* 6. Tự động lưu PlayerPrefs */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Lưu Trữ Dữ Liệu</span>
          </label>
          <label className="flex items-center gap-3 p-2 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoSavePlayerPrefs}
              onChange={e => onChange({ ...config, autoSavePlayerPrefs: e.target.checked })}
              className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-400 bg-slate-800 border-slate-700"
            />
            <div className="text-xs">
              <div className="text-slate-200 font-medium">Tự lưu vào PlayerPrefs</div>
              <div className="text-[10px] text-slate-400">Giữ số tiền khi thoát và mở lại game</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
