/**
 * Các script Unity C# của hệ thống Tycoon (đồ ăn, kho, khu vực, mặt bằng, nhân viên, đối thủ, chi nhánh, game loop).
 * Mã nguồn nằm trong src/data/unity/*.cs (file .cs thật, copy thẳng vào Assets/Scripts của Unity).
 * GameData.cs được sinh tự động từ src/game/tycoonData.ts:  npx tsx tools/genUnity.ts
 */
import gameData from './unity/GameData.cs?raw';
import inventory from './unity/InventoryManager.cs?raw';
import foodOrder from './unity/FoodOrderSystem.cs?raw';
import zoneManager from './unity/ZoneManager.cs?raw';
import shopZone from './unity/ShopZone.cs?raw';
import locationManager from './unity/LocationManager.cs?raw';
import staffManager from './unity/StaffManager.cs?raw';
import competitor from './unity/CompetitorManager.cs?raw';
import branch from './unity/BranchManager.cs?raw';
import gameLoop from './unity/GameLoopManager.cs?raw';

export interface ScriptEntry {
  fileName: string;
  path: string;
  title: string;
  description: string;
  code: string;
  highlights: string[];
}

export const tycoonScripts: Record<string, ScriptEntry> = {
  gameData: {
    fileName: 'GameData.cs',
    path: 'Assets/Scripts/Data/GameData.cs',
    title: 'GameData.cs (Dữ Liệu Cân Bằng: Sản Phẩm, Khu Vực, Mặt Bằng, Nhân Viên)',
    description:
      'Một nơi duy nhất chứa mọi con số: giá nhập, giá bán, tồn kho, thời gian dùng, diện tích khu vực, tiền thuê mặt bằng, lương nhân viên. Muốn thêm sản phẩm hay khu mới chỉ cần thêm 1 dòng.',
    code: gameData,
    highlights: [
      '8 sản phẩm: Coca, Nước cam, Cà phê, Mì, Khoai tây, Bánh mì, Snack, Nước tăng lực (+ linh kiện, vật dụng).',
      'Mỗi sản phẩm: giá nhập, giá bán, tồn kho, thời gian dùng, lợi nhuận (Profit).',
      '4 mặt bằng với Rent, Traffic, Area, Competition, CustomerType.',
      'Tự sinh từ bản mô phỏng nên số liệu luôn khớp với Net Tycoon trên web.',
    ],
  },
  inventory: {
    fileName: 'InventoryManager.cs',
    path: 'Assets/Scripts/Managers/InventoryManager.cs',
    title: 'InventoryManager.cs (Hệ Thống Kho & Nhập Hàng)',
    description:
      'Quản lý đồ ăn, nước uống, linh kiện, vật dụng. Có giới hạn sức chứa, phải nhập hàng bằng tiền quán, cảnh báo khi tồn kho thấp.',
    code: inventory,
    highlights: [
      'GetStockLabel("coca") => "Coca: 3 / 50"; GetWarningText() => "⚠ Sắp hết hàng".',
      'TryPurchase / TryFillToMax / RestockLow: nhập hàng, không vượt sức chứa.',
      'Nâng kho 4 cấp: sức chứa x1 / x1.5 / x2 / x3.',
      'Sự kiện OnStockWarning để UI hiện cảnh báo.',
    ],
  },
  food: {
    fileName: 'FoodOrderSystem.cs',
    path: 'Assets/Scripts/Customer/FoodOrderSystem.cs',
    title: 'FoodOrderSystem.cs (Khách Gọi Đồ Ngẫu Nhiên)',
    description:
      'Khách đang chơi gọi đồ dựa trên loại khách, số giờ chơi và giờ trong ngày. Trừ kho, thu tiền, tính lợi nhuận, cộng/trừ điểm hài lòng.',
    code: foodOrder,
    highlights: [
      'Sáng: bánh mì, cà phê. Trưa & tối: mì. Khuya: nước tăng lực.',
      'Hết món: 40% khách đổi món khác, còn lại bực mình (-15 điểm).',
      'Mỗi món tốn thêm 1 ly/hộp đựng (vật dụng trong kho).',
      'Nhân viên phục vụ tăng số lần gọi đồ.',
    ],
  },
  zoneManager: {
    fileName: 'ZoneManager.cs',
    path: 'Assets/Scripts/Managers/ZoneManager.cs',
    title: 'ZoneManager.cs (8 Khu Vực Trong Tiệm, Dễ Mở Rộng Map)',
    description:
      'Khu máy thường, Gaming, VIP, Tournament, Khu ăn uống, Quầy thanh toán, Phòng kỹ thuật, Kho. Mỗi khu chiếm diện tích và chịu giới hạn của mặt bằng.',
    code: zoneManager,
    highlights: [
      'RegisterZone(): thêm khu mới lúc chạy game mà không sửa code khác.',
      'GetBlockReason(): cho biết vì sao chưa mở được (thiếu tiền, diện tích, đánh giá, nhân viên...).',
      'ExtraStationsUnlocked(): Khu Gaming thêm 2 máy cấu hình cao.',
    ],
  },
  shopZone: {
    fileName: 'ShopZone.cs',
    path: 'Assets/Scripts/World/ShopZone.cs',
    title: 'ShopZone.cs (Gắn Lên Từng Khu Trong Cảnh 3D)',
    description:
      'Đặt lên GameObject của mỗi khu. Khi khu được mở khóa, tự bật bàn ghế, máy móc bên trong và tắt rào chắn.',
    code: shopZone,
    highlights: [
      'Kéo thả object vào Enable When Unlocked / Show While Locked.',
      'Extra Station Slots: vị trí đặt máy thêm.',
    ],
  },
  location: {
    fileName: 'LocationManager.cs',
    path: 'Assets/Scripts/Managers/LocationManager.cs',
    title: 'LocationManager.cs (Hệ Thống Vị Trí Mặt Bằng)',
    description:
      'Hẻm nhỏ, Mặt đường, Trung tâm, Khu thương mại. Mua mặt bằng một lần, rồi chuyển tiệm chính hoặc xây chi nhánh.',
    code: locationManager,
    highlights: [
      'Rent, Traffic, Area, Competition, CustomerType cho mỗi địa điểm.',
      'Khu Thương Mại có tiềm năng: lượng khách tăng dần mỗi ngày.',
      'Diện tích mặt bằng giới hạn số khu có thể mở.',
    ],
  },
  staff: {
    fileName: 'StaffManager.cs',
    path: 'Assets/Scripts/Managers/StaffManager.cs',
    title: 'StaffManager.cs (Thuê Nhân Viên)',
    description:
      'Thu ngân, Phục vụ, Kỹ thuật viên, Quản lý. Lương trừ cuối ngày, hiệu quả giảm dần theo số người.',
    code: staffManager,
    highlights: [
      'Thu ngân: khách kiên nhẫn hơn, +8% doanh thu thuê máy.',
      'Kỹ thuật viên: nâng cấp máy rẻ hơn 15%/người.',
      'Quản lý: bắt buộc cho mỗi chi nhánh, giảm sức ép đối thủ.',
    ],
  },
  competitor: {
    fileName: 'CompetitorManager.cs',
    path: 'Assets/Scripts/Managers/CompetitorManager.cs',
    title: 'CompetitorManager.cs (Cạnh Tranh Đối Thủ)',
    description:
      'Đối thủ khai trương từ ngày 4, cướp khách tùy mức Competition của mặt bằng. Đánh giá thấp thì họ mạnh lên nhanh.',
    code: competitor,
    highlights: [
      'Pressure(): % khách bị cướp.',
      'TryBuyOut(): mua lại đối thủ (cần Quản lý).',
      'TotalWeightedStrength() dùng tính thị phần.',
    ],
  },
  branch: {
    fileName: 'BranchManager.cs',
    path: 'Assets/Scripts/Managers/BranchManager.cs',
    title: 'BranchManager.cs (Cyber Gaming & Chi Nhánh)',
    description:
      'Mở Cyber Gaming (cần Gaming + VIP + Tournament, ≥4★) rồi mở thêm chi nhánh tự chạy mỗi ngày.',
    code: branch,
    highlights: [
      'Cyber Gaming: game thủ +25% khách, giá thuê +15%.',
      'Chi nhánh 3 cấp, cần 1 Quản lý mỗi chi nhánh.',
      'SettleDay(): tính lãi/lỗ chi nhánh cuối ngày.',
    ],
  },
  gameLoop: {
    fileName: 'GameLoopManager.cs',
    path: 'Assets/Scripts/Managers/GameLoopManager.cs',
    title: 'GameLoopManager.cs (Game Loop Hoàn Chỉnh: Mở Tiệm → Ông Chủ Cyber Game)',
    description:
      'Trung tâm điều phối: ngày 06:00-24:00, khách đến theo giờ cao điểm, doanh thu, đánh giá sao, chi phí cuối ngày, lợi nhuận, đối thủ, điều kiện thắng game.',
    code: gameLoop,
    highlights: [
      'OpenShop() / EndDay(): chốt sổ, trừ tiền thuê, lương, điện nước, mạng.',
      'SpawnIntervalSeconds(): danh tiếng + chất lượng máy + mặt bằng + đối thủ + giờ cao điểm.',
      'MarketShare() và CheckWin(): ≥3 cơ sở, ≥4.2★, thị phần ≥50%, có Cyber Gaming.',
    ],
  },
};

export const tycoonScriptOrder: { key: string; label: string; color: string }[] = [
  { key: 'gameData', label: '6. GameData.cs', color: 'bg-indigo-600' },
  { key: 'inventory', label: '7. InventoryManager.cs', color: 'bg-orange-600' },
  { key: 'food', label: '8. FoodOrderSystem.cs', color: 'bg-amber-600' },
  { key: 'zoneManager', label: '9. ZoneManager.cs', color: 'bg-violet-600' },
  { key: 'shopZone', label: '10. ShopZone.cs', color: 'bg-violet-600' },
  { key: 'location', label: '11. LocationManager.cs', color: 'bg-teal-600' },
  { key: 'staff', label: '12. StaffManager.cs', color: 'bg-cyan-600' },
  { key: 'competitor', label: '13. CompetitorManager.cs', color: 'bg-rose-600' },
  { key: 'branch', label: '14. BranchManager.cs', color: 'bg-yellow-600' },
  { key: 'gameLoop', label: '15. GameLoopManager.cs', color: 'bg-emerald-600' },
];
