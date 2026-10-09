import React, { useState } from 'react';
import {
  ScriptConfig,
  generateCustomerSatisfactionScript,
  generateCustomerAIFullCycleScript,
  generateWaitingQueueManagerScript,
  generateComputerStationScript,
  generateMoneyManagerScript,
} from '../data/csharpScripts';
import { tycoonScripts, tycoonScriptOrder, ScriptEntry } from '../data/unityScripts';
import { Copy, Check, Download, Users, Network, CheckCircle2, Cpu, Smile, DollarSign } from 'lucide-react';

interface ScriptViewerProps {
  config: ScriptConfig;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<string>('satisfaction');
  const [copied, setCopied] = useState<boolean>(false);

  const scripts: Record<string, ScriptEntry> = {
    ...tycoonScripts,
    satisfaction: {
      fileName: 'CustomerSatisfaction.cs',
      path: 'Assets/Scripts/Customer/CustomerSatisfaction.cs',
      title: 'CustomerSatisfaction.cs (Hệ Thống Điểm Hài Lòng Base 70 & Đánh Giá Sao)',
      description: 'Khởi điểm 70đ. Cộng điểm chất lượng máy (RAM*2, VGA*3, Monitor*2), giá thuê, trừ điểm chờ đợi. Phân loại 5 cấp bậc từ Very Unhappy (0-19 😡) đến Very Happy (80-100 😍).',
      code: generateCustomerSatisfactionScript(),
      highlights: [
        'Khởi điểm 70đ. Giới hạn trong khoảng 0 -> 100 điểm.',
        'Công thức chuẩn: RAM(Lvl*2) + VGA(Lvl*3) + Màn(Lvl*2). Ví dụ: RAM 3, VGA 4, Màn 2 => +22đ!',
        '5 Mức độ: Very Happy 😍 (80-100), Happy 🙂 (60-79), Normal 😐 (40-59), Unhappy 😕 (20-39), Very Unhappy 😡 (0-19).',
        'Tự động xuất báo cáo trải nghiệm và xác suất khách quay lại quán (Return Chance %).',
      ],
    },
    flow: {
      fileName: 'CustomerAI.cs',
      path: 'Assets/Scripts/Customer/CustomerAI.cs',
      title: 'CustomerAI.cs (Tích Hợp CustomerSatisfaction & WaitingQueue)',
      description: 'Khi tìm được máy, tự động áp dụng chất lượng máy vào điểm hài lòng. Nếu hết máy, tự động vào hàng đợi. Khi rời máy, in báo cáo trải nghiệm.',
      code: generateCustomerAIFullCycleScript(),
      highlights: [
        'Tự động thêm component CustomerSatisfaction nếu GameObject chưa có.',
        'Nếu hết máy, tự động gọi WaitingQueueManager.Instance.TryJoinQueue().',
        'Gọi satisfactionSystem.ApplyComputerQuality(assignedPC) ngay khi chọn máy.',
        'In hóa đơn trải nghiệm chi tiết ra Console khi hoàn tất buổi chơi.',
      ],
    },
    station: {
      fileName: 'ComputerStation.cs',
      path: 'Assets/Scripts/Computer/ComputerStation.cs',
      title: 'ComputerStation.cs (Bàn Máy Tính & Nâng Cấp Linh Kiện Cấp 1 -> 5)',
      description: 'Cung cấp điểm số chất lượng máy tính dựa trên cấp độ nâng cấp của RAM, GPU và Màn hình. Quản lý thời gian thuê và tích hợp MoneyManager.',
      code: generateComputerStationScript(config),
      highlights: [
        'RAM Level 1..5: +2, +4, +6, +8, +10',
        'VGA Level 1..5: +3, +6, +9, +12, +15',
        'Monitor Level 1..5: +2, +4, +6, +8, +10',
        'Hàm GetComputerQualityScore() trả về tổng điểm linh kiện.',
      ],
    },
    queue: {
      fileName: 'WaitingQueueManager.cs',
      path: 'Assets/Scripts/Customer/WaitingQueueManager.cs',
      title: 'WaitingQueueManager.cs (Hàng Đợi Dự Phòng Khi Hết Máy)',
      description: 'Khách đứng chờ trong hàng đợi sẽ bị trừ điểm kiên nhẫn vào CustomerSatisfaction. Khi máy trống, khách đầu hàng đợi tự động vào máy.',
      code: generateWaitingQueueManagerScript(),
      highlights: [
        'Cơ chế FIFO: Khách đến trước vào máy trước.',
        'Tự động điều phối vị trí khách tại các ghế chờ.',
        'Trừ điểm hài lòng nếu phải chờ lâu.',
      ],
    },
    money: {
      fileName: 'MoneyManager.cs',
      path: 'Assets/Scripts/Managers/MoneyManager.cs',
      title: 'MoneyManager.cs (Quản Lý Dòng Tiền Tiệm Net)',
      description: 'Singleton quản lý tiền doanh thu từ thuê máy tính và chi tiêu nâng cấp linh kiện an toàn.',
      code: generateMoneyManagerScript(),
      highlights: [
        'Singleton Pattern dễ truy cập toàn cục: MoneyManager.Instance.',
        'Hàm TrySpendMoney(amount) kiểm tra số dư an toàn trước khi trừ tiền.',
        'Sự kiện OnMoneyChanged cập nhật UI tức thì.',
      ],
    },
  };

  const currentScript = scripts[activeTab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentScript.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = currentScript.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentScript.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentScript.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Mã Nguồn C# Trọn Vẹn &bull; Sẵn Sàng Build Trong Unity</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white mt-1">
            Bộ C# Scripts Cho Net Tycoon (15 Scripts: Lõi + Kinh Tế)
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1">
            Đã tích hợp hệ thống điểm hài lòng <strong>Base 70</strong>, nâng cấp linh kiện, hàng đợi, <strong>đồ ăn nước uống, kho, khu vực, mặt bằng, nhân viên, đối thủ, chi nhánh</strong> và game loop hoàn chỉnh. Các file mới là file .cs thật, copy thẳng vào Assets/Scripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
              copied
                ? 'bg-emerald-500 text-white ring-2 ring-emerald-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Đã Sao Chép!' : 'Sao Chép Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            title="Tải file .cs về máy tính"
          >
            <Download className="w-4 h-4" />
            <span>Tải File .cs</span>
          </button>
        </div>
      </div>

      {/* Script Selector Tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('satisfaction')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'satisfaction'
                ? 'bg-pink-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smile className="w-4 h-4" />
            <span>1. CustomerSatisfaction.cs</span>
          </button>

          <button
            onClick={() => setActiveTab('flow')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'flow'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. CustomerAI.cs</span>
          </button>

          <button
            onClick={() => setActiveTab('station')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'station'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>3. ComputerStation.cs</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'queue'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>4. WaitingQueueManager.cs</span>
          </button>

          <button
            onClick={() => setActiveTab('money')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'money'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>5. MoneyManager.cs</span>
          </button>

          {tycoonScriptOrder.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === t.key ? `${t.color} text-white shadow-sm` : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Script Highlights Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-mono">{currentScript.path}</span>
            <span className="text-[11px] text-slate-500 font-mono">C# Source File</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{currentScript.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-900">
            {currentScript.highlights.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] text-emerald-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e] font-mono text-xs">
        <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#3e3e3e] flex items-center justify-between text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 font-bold text-slate-200">{currentScript.fileName}</span>
          </div>
          <span>UTF-8 &bull; C# 9.0+ &bull; Unity 2021/2022/6</span>
        </div>

        <pre className="p-4 md:p-6 text-slate-200 overflow-x-auto max-h-[520px] leading-relaxed selection:bg-emerald-500/30">
          <code>{currentScript.code}</code>
        </pre>
      </div>
    </div>
  );
};
