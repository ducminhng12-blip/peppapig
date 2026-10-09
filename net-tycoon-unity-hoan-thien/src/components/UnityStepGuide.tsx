import React, { useState } from 'react';
import { unitySteps, troubleshootingList, UnityStep } from '../data/unityGuideData';
import { ScriptConfig } from '../data/csharpScripts';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  MousePointer,
  Box,
  Layers,
  Sparkles,
  Sliders,
  Smartphone,
  Eye,
  Check,
} from 'lucide-react';

interface UnityStepGuideProps {
  config: ScriptConfig;
}

export const UnityStepGuide: React.FC<UnityStepGuideProps> = ({ config }) => {
  const [activeStepId, setActiveStepId] = useState<string>(unitySteps[0].id);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleComplete = (stepId: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const currentStep = unitySteps.find(s => s.id === activeStepId) || unitySteps[0];
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / unitySteps.length) * 100);

  return (
    <div className="space-y-8">
      {/* Overview Card & Progress Tracker */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
              Hướng Dẫn Thao Tác Trực Quan Trong Unity Editor
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Từng Cú Click Chuột Để Gán Script Vào Vật Thể 3D
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Thực hiện lần lượt 5 bước từ lúc tạo file C# cho đến khi hoàn thiện bàn máy tính, tia Raycast góc nhìn thứ nhất và nút bấm cảm ứng cho Mobile.
            </p>
          </div>

          {/* Progress Bar Widget */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 min-w-[220px]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400">Tiến độ thiết lập</span>
              <span className="font-bold text-emerald-400 font-mono">
                {completedCount}/{unitySteps.length} Bước ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step Navigation Sidebar (Steps 1 to 5) */}
        <div className="lg:col-span-4 space-y-2">
          {unitySteps.map(step => {
            const isSelected = step.id === activeStepId;
            const isDone = !!completedSteps[step.id];

            return (
              <div
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950'
                        : isSelected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? '✓' : step.stepNumber}
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
                      {step.badge}
                    </div>
                    <div
                      className={`text-sm font-bold mt-0.5 transition-colors ${
                        isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    toggleComplete(step.id);
                  }}
                  className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
                  title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu đã hoàn thành bước này'}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/10" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Detailed Step Content View */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Step Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  <span>Bước {currentStep.stepNumber}</span>
                  <span>·</span>
                  <span>{currentStep.badge}</span>
                </div>
                <h3 className="text-xl font-black text-white mt-1">{currentStep.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{currentStep.summary}</p>
              </div>

              <button
                onClick={() => toggleComplete(currentStep.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto shrink-0 ${
                  completedSteps[currentStep.id]
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {completedSteps[currentStep.id] ? 'Đã Xong Bước Này' : 'Đánh Dấu Hoàn Thành'}
                </span>
              </button>
            </div>

            {/* Click-by-Click Action List */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-emerald-400" />
                <span>Chi Tiết Từng Cú Click Chuột:</span>
              </h4>

              <div className="space-y-3">
                {currentStep.clicks.map((click, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-emerald-400 shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-white">{click.action}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono px-2 py-0.5 bg-slate-800 text-emerald-300 rounded border border-slate-700">
                            {click.target}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-slate-300 mt-1.5 leading-relaxed">
                          {click.detail}
                        </p>
                        {click.tip && (
                          <div className="mt-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>{click.tip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hierarchy Tree Visualizer (Nếu có) */}
            {currentStep.hierarchyPreview && (
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Cấu Trúc Trong Cửa Sổ Hierarchy (Unity):</span>
                </h4>
                <div className="bg-[#181a1f] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto space-y-1">
                  {currentStep.hierarchyPreview.map((line, lIdx) => (
                    <div
                      key={lIdx}
                      className={line.includes('▶') || line.includes('---') ? 'text-emerald-400 font-bold' : 'text-slate-300'}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inspector Fields Table (Nếu có) */}
            {currentStep.inspectorFields && (
              <div className="space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-300 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Bảng Thông Số Cần Điền Trong Inspector:</span>
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Tên Biến (Inspector Field)</th>
                        <th className="p-3">Kiểu</th>
                        <th className="p-3">Giá Trị Cần Đặt</th>
                        <th className="p-3">Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                      {currentStep.inspectorFields.map((field, fIdx) => (
                        <tr key={fIdx} className="hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-bold text-emerald-300">{field.field}</td>
                          <td className="p-3 font-mono text-slate-400">{field.type}</td>
                          <td className="p-3 font-mono text-amber-300 font-semibold">{field.value}</td>
                          <td className="p-3 text-slate-300">{field.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Warning / Pro Tip */}
            {currentStep.warningNote && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-xs md:text-sm text-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <span>{currentStep.warningNote}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Troubleshooting Matrix Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-rose-400" />
          <h3 className="text-lg font-bold text-white">
            Bảng Tra Cứu Xử Lý Lỗi 100% Gặp Phải Khi Làm Game Net Tycoon
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Nếu trong quá trình test game gặp lỗi, hãy tra cứu nhanh nguyên nhân và cách khắc phục dưới đây:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {troubleshootingList.map((item, i) => (
            <div
              key={i}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-xs"
            >
              <div className="font-bold text-rose-400 flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                <span>{item.issue}</span>
              </div>
              <div className="text-slate-400">
                <strong className="text-slate-300">Nguyên nhân: </strong>
                {item.cause}
              </div>
              <div className="text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                <strong className="text-emerald-300">Cách sửa: </strong>
                {item.solution}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
