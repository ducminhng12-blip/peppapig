/**
 * DỮ LIỆU GAME NET TYCOON (nguồn sự thật duy nhất)
 * Mô phỏng 3D, bảng quản lý và code C# Unity đều đọc từ file này,
 * nên số liệu (giá nhập, giá bán, tiền thuê, diện tích...) luôn khớp nhau.
 */

export type CustomerKind = 'HocSinh' | 'GameThu' | 'VIP';
export type ItemCategory = 'drink' | 'food' | 'part' | 'supply';

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  drink: 'Nước uống',
  food: 'Đồ ăn',
  part: 'Linh kiện',
  supply: 'Vật dụng',
};

/** Kỳ vọng của từng loại khách: khách càng sộp càng khó tính (điểm trừ cố định) */
export const KIND_EXPECTATION: Record<CustomerKind, number> = {
  HocSinh: -28,
  GameThu: -45,
  VIP: -62,
};

/** Điểm hài lòng cộng/trừ do đồ ăn: phục vụ được +2 (tối đa +6), hết hàng -15 mỗi lần */
export const FOOD_SATISFACTION = { served: 2, servedCap: 6, failed: -15, floor: -45 };

export const KIND_LABEL: Record<CustomerKind, string> = {
  HocSinh: 'Học Sinh',
  GameThu: 'Game Thủ',
  VIP: 'Khách VIP',
};

/* ------------------------------------------------------------------ */
/* 1. SẢN PHẨM & KHO                                                   */
/* ------------------------------------------------------------------ */

export interface ProductDef {
  id: string;
  name: string;
  emoji: string;
  category: ItemCategory;
  /** Giá nhập (đ / 1 đơn vị) */
  buyPrice: number;
  /** Giá bán cho khách (đ). 0 = không bán (linh kiện, vật dụng) */
  sellPrice: number;
  /** Thời gian khách dùng món này (giây trong game). 0 = không áp dụng */
  useTimeSec: number;
  /** Sức chứa kho ở cấp kho 1 */
  maxStock: number;
  /** Một lần nhập hàng = 1 thùng/lô */
  batchSize: number;
  /** Tồn kho lúc bắt đầu game */
  startStock: number;
  /** Trọng số khách gọi theo loại khách */
  weights: Record<CustomerKind, number>;
  /** Giờ trong ngày làm món này được gọi nhiều hơn: [từ giờ, đến giờ, hệ số] */
  peaks: [number, number, number][];
}

export const PRODUCTS: ProductDef[] = [
  {
    id: 'coca', name: 'Coca', emoji: '🥤', category: 'drink',
    buyPrice: 8000, sellPrice: 15000, useTimeSec: 6, maxStock: 50, batchSize: 12, startStock: 24,
    weights: { HocSinh: 3, GameThu: 3, VIP: 1.5 }, peaks: [[12, 16, 1.4]],
  },
  {
    id: 'orange', name: 'Nước cam', emoji: '🍊', category: 'drink',
    buyPrice: 9000, sellPrice: 18000, useTimeSec: 6, maxStock: 40, batchSize: 12, startStock: 16,
    weights: { HocSinh: 1, GameThu: 1, VIP: 2.5 }, peaks: [[6, 11, 1.6]],
  },
  {
    id: 'coffee', name: 'Cà phê', emoji: '☕', category: 'drink',
    buyPrice: 6000, sellPrice: 15000, useTimeSec: 8, maxStock: 40, batchSize: 12, startStock: 16,
    weights: { HocSinh: 0.3, GameThu: 1.5, VIP: 3 }, peaks: [[6, 10, 2], [22, 24, 1.6]],
  },
  {
    id: 'noodle', name: 'Mì', emoji: '🍜', category: 'food',
    buyPrice: 12000, sellPrice: 25000, useTimeSec: 14, maxStock: 40, batchSize: 10, startStock: 16,
    weights: { HocSinh: 2.5, GameThu: 3, VIP: 1.5 }, peaks: [[11, 13, 1.9], [18, 20, 1.9]],
  },
  {
    id: 'fries', name: 'Khoai tây', emoji: '🍟', category: 'food',
    buyPrice: 10000, sellPrice: 22000, useTimeSec: 10, maxStock: 30, batchSize: 10, startStock: 12,
    weights: { HocSinh: 1.2, GameThu: 2, VIP: 2.5 }, peaks: [[15, 19, 1.3]],
  },
  {
    id: 'bread', name: 'Bánh mì', emoji: '🥖', category: 'food',
    buyPrice: 9000, sellPrice: 20000, useTimeSec: 9, maxStock: 30, batchSize: 10, startStock: 12,
    weights: { HocSinh: 2, GameThu: 1, VIP: 1.5 }, peaks: [[6, 9, 2], [16, 18, 1.5]],
  },
  {
    id: 'snack', name: 'Snack', emoji: '🍿', category: 'food',
    buyPrice: 5000, sellPrice: 12000, useTimeSec: 7, maxStock: 60, batchSize: 20, startStock: 30,
    weights: { HocSinh: 3, GameThu: 1.5, VIP: 1 }, peaks: [[13, 18, 1.2]],
  },
  {
    id: 'energy', name: 'Nước tăng lực', emoji: '⚡', category: 'drink',
    buyPrice: 11000, sellPrice: 20000, useTimeSec: 6, maxStock: 40, batchSize: 12, startStock: 12,
    weights: { HocSinh: 0.4, GameThu: 3, VIP: 2 }, peaks: [[20, 24, 2]],
  },
  // --- Linh kiện: mỗi lần nâng cấp máy tiêu hao 1 bộ ---
  {
    id: 'part_ram', name: 'Bộ RAM nâng cấp', emoji: '🧠', category: 'part',
    buyPrice: 20000, sellPrice: 0, useTimeSec: 0, maxStock: 10, batchSize: 2, startStock: 4,
    weights: { HocSinh: 0, GameThu: 0, VIP: 0 }, peaks: [],
  },
  {
    id: 'part_vga', name: 'Bộ VGA nâng cấp', emoji: '🎮', category: 'part',
    buyPrice: 60000, sellPrice: 0, useTimeSec: 0, maxStock: 8, batchSize: 1, startStock: 3,
    weights: { HocSinh: 0, GameThu: 0, VIP: 0 }, peaks: [],
  },
  {
    id: 'part_monitor', name: 'Bộ Màn hình nâng cấp', emoji: '🖥️', category: 'part',
    buyPrice: 35000, sellPrice: 0, useTimeSec: 0, maxStock: 8, batchSize: 1, startStock: 3,
    weights: { HocSinh: 0, GameThu: 0, VIP: 0 }, peaks: [],
  },
  // --- Vật dụng ---
  {
    id: 'sup_clean', name: 'Bộ vệ sinh máy & ghế', emoji: '🧴', category: 'supply',
    buyPrice: 6000, sellPrice: 0, useTimeSec: 0, maxStock: 60, batchSize: 20, startStock: 40,
    weights: { HocSinh: 0, GameThu: 0, VIP: 0 }, peaks: [],
  },
  {
    id: 'sup_cup', name: 'Ly / hộp đựng', emoji: '🥡', category: 'supply',
    buyPrice: 1500, sellPrice: 0, useTimeSec: 0, maxStock: 150, batchSize: 50, startStock: 80,
    weights: { HocSinh: 0, GameThu: 0, VIP: 0 }, peaks: [],
  },
];

export const PRODUCT_BY_ID: Record<string, ProductDef> = Object.fromEntries(
  PRODUCTS.map(p => [p.id, p])
);

export const SELLABLE_PRODUCTS = PRODUCTS.filter(p => p.sellPrice > 0);

/** Lợi nhuận trên 1 sản phẩm bán ra */
export const unitProfit = (p: ProductDef): number => p.sellPrice - p.buyPrice;

/** Ngưỡng cảnh báo sắp hết hàng (tỷ lệ so với sức chứa) */
export const LOW_STOCK_RATIO = 0.25;

/** Giá + sức chứa theo cấp kho (1..4) */
export const WAREHOUSE_LEVELS = [
  { level: 1, capacityMult: 1.0, upgradeCost: 0 },
  { level: 2, capacityMult: 1.5, upgradeCost: 400000 },
  { level: 3, capacityMult: 2.0, upgradeCost: 1000000 },
  { level: 4, capacityMult: 3.0, upgradeCost: 2500000 },
];

/* ------------------------------------------------------------------ */
/* 2. KHU VỰC TRONG TIỆM (mở rộng bằng cách thêm 1 phần tử vào đây)     */
/* ------------------------------------------------------------------ */

export type ZoneId =
  | 'regular'
  | 'eating'
  | 'counter'
  | 'storage'
  | 'tech'
  | 'gaming'
  | 'vip'
  | 'tournament';

export interface ZoneDef {
  id: ZoneId;
  name: string;
  emoji: string;
  /** Diện tích chiếm dụng (m²) */
  area: number;
  unlockCost: number;
  /** Có sẵn từ đầu game? */
  initial: boolean;
  description: string;
  /** Điều kiện mở khóa (ngoài tiền và diện tích) */
  requires: { zones?: ZoneId[]; minRating?: number; minStaff?: number; label: string };
  /** Số máy thêm vào mô phỏng 3D khi mở khu này */
  extraStations: number;
  /** Màu hiển thị trên bản đồ mặt bằng */
  color: string;
}

export const ZONES: ZoneDef[] = [
  {
    id: 'regular', name: 'Khu Máy Thường', emoji: '🖥️', area: 24, unlockCost: 0, initial: true,
    description: '6 máy cơ bản (Máy 01 → 06). Nền tảng của tiệm.',
    requires: { label: 'Có sẵn' }, extraStations: 0, color: '#38bdf8',
  },
  {
    id: 'eating', name: 'Khu Ăn Uống', emoji: '🍜', area: 12, unlockCost: 0, initial: true,
    description: 'Tủ nước, kệ snack, bếp mì. Cho phép khách gọi đồ.',
    requires: { label: 'Có sẵn' }, extraStations: 0, color: '#f59e0b',
  },
  {
    id: 'counter', name: 'Quầy Thanh Toán', emoji: '💵', area: 6, unlockCost: 0, initial: true,
    description: 'Thu ngân, in hóa đơn, nhận đánh giá của khách.',
    requires: { label: 'Có sẵn' }, extraStations: 0, color: '#10b981',
  },
  {
    id: 'storage', name: 'Kho', emoji: '📦', area: 8, unlockCost: 0, initial: true,
    description: 'Chứa đồ ăn, nước uống, linh kiện, vật dụng.',
    requires: { label: 'Có sẵn' }, extraStations: 0, color: '#a3a3a3',
  },
  {
    id: 'tech', name: 'Phòng Kỹ Thuật', emoji: '🛠️', area: 8, unlockCost: 250000, initial: false,
    description: 'Cho phép thuê Kỹ thuật viên, giảm giá nâng cấp máy.',
    requires: { label: 'Không yêu cầu thêm' }, extraStations: 0, color: '#64748b',
  },
  {
    id: 'gaming', name: 'Khu Gaming', emoji: '🎮', area: 20, unlockCost: 1200000, initial: false,
    description: '+2 máy cấu hình cao (Máy 07, 08). Game thủ trả giá cao hơn.',
    requires: { minRating: 3.2, label: 'Đánh giá từ 3.2★' }, extraStations: 2, color: '#a855f7',
  },
  {
    id: 'vip', name: 'Phòng VIP', emoji: '👑', area: 16, unlockCost: 2500000, initial: false,
    description: 'Khách VIP trả thêm 50% và gọi đồ nhiều hơn. Cần có nhân viên.',
    requires: { minRating: 3.6, minStaff: 1, label: 'Đánh giá từ 3.6★ và có ≥1 nhân viên' },
    extraStations: 0, color: '#eab308',
  },
  {
    id: 'tournament', name: 'Phòng Tournament', emoji: '🏆', area: 24, unlockCost: 3500000, initial: false,
    description: 'Tổ chức giải đấu kéo đông game thủ, tăng danh tiếng.',
    requires: { zones: ['gaming', 'vip'], label: 'Cần Khu Gaming + Phòng VIP' },
    extraStations: 0, color: '#ef4444',
  },
];

export const ZONE_BY_ID: Record<ZoneId, ZoneDef> = Object.fromEntries(
  ZONES.map(z => [z.id, z])
) as Record<ZoneId, ZoneDef>;

/* ------------------------------------------------------------------ */
/* 3. MẶT BẰNG                                                          */
/* ------------------------------------------------------------------ */

export type LocationId = 'alley' | 'street' | 'downtown' | 'mall';

export interface LocationDef {
  id: LocationId;
  name: string;
  emoji: string;
  /** Tiền thuê mỗi ngày */
  rent: number;
  /** Giá mở khóa mặt bằng (một lần) */
  unlockCost: number;
  /** Lưu lượng khách (1.0 = chuẩn) */
  traffic: number;
  /** Diện tích (m²) */
  area: number;
  /** Mức cạnh tranh 0..100 */
  competition: number;
  /** Nhóm khách chủ yếu */
  customerType: string;
  customerMix: Record<CustomerKind, number>;
  /** Hệ số chi tiêu của khách tại khu này */
  spendMult: number;
  /** Tăng trưởng lượng khách mỗi ngày sau khi mở (tiềm năng) và mức tối đa */
  growthPerDay: number;
  growthCap: number;
  description: string;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'alley', name: 'Hẻm Nhỏ', emoji: '🏘️', rent: 50000, unlockCost: 0, traffic: 0.6, area: 60,
    competition: 20, customerType: 'Học sinh – sinh viên khu dân cư',
    customerMix: { HocSinh: 0.65, GameThu: 0.28, VIP: 0.07 }, spendMult: 0.9,
    growthPerDay: 0, growthCap: 0,
    description: 'Giá rẻ, ít khách, ít đối thủ. Chỗ khởi nghiệp an toàn.',
  },
  {
    id: 'street', name: 'Mặt Đường', emoji: '🛣️', rent: 150000, unlockCost: 1500000, traffic: 1.0, area: 100,
    competition: 45, customerType: 'Học sinh, game thủ, người đi đường',
    customerMix: { HocSinh: 0.45, GameThu: 0.38, VIP: 0.17 }, spendMult: 1.0,
    growthPerDay: 0, growthCap: 0,
    description: 'Tiền thuê cao hơn nhưng nhiều khách vãng lai.',
  },
  {
    id: 'downtown', name: 'Trung Tâm', emoji: '🏙️', rent: 280000, unlockCost: 5000000, traffic: 1.5, area: 150,
    competition: 70, customerType: 'Dân văn phòng, game thủ',
    customerMix: { HocSinh: 0.3, GameThu: 0.4, VIP: 0.3 }, spendMult: 1.1,
    growthPerDay: 0, growthCap: 0,
    description: 'Lượng khách lớn, cạnh tranh gắt, giá thuê rất cao.',
  },
  {
    id: 'mall', name: 'Khu Thương Mại', emoji: '🏬', rent: 450000, unlockCost: 12000000, traffic: 2.0, area: 220,
    competition: 85, customerType: 'Khách VIP, du khách, dân văn phòng',
    customerMix: { HocSinh: 0.15, GameThu: 0.35, VIP: 0.5 }, spendMult: 1.25,
    growthPerDay: 0.02, growthCap: 0.5,
    description: 'Chi phí cao nhất nhưng tiềm năng lớn: lượng khách tăng dần mỗi ngày.',
  },
];

export const LOCATION_BY_ID: Record<LocationId, LocationDef> = Object.fromEntries(
  LOCATIONS.map(l => [l.id, l])
) as Record<LocationId, LocationDef>;

/** Phí chuyển tiệm sang mặt bằng khác đã sở hữu */
export const RELOCATE_FEE = 100000;

/* ------------------------------------------------------------------ */
/* 4. NHÂN VIÊN                                                         */
/* ------------------------------------------------------------------ */

export type StaffId = 'cashier' | 'waiter' | 'technician' | 'manager';

export interface StaffDef {
  id: StaffId;
  name: string;
  emoji: string;
  hireFee: number;
  salaryPerDay: number;
  maxCount: number;
  requiresZone?: ZoneId;
  minRating?: number;
  effect: string;
}

export const STAFF: StaffDef[] = [
  {
    id: 'cashier', name: 'Thu Ngân', emoji: '💁', hireFee: 200000, salaryPerDay: 40000, maxCount: 3,
    requiresZone: 'counter',
    effect: 'Khách kiên nhẫn hơn khi xếp hàng (+9 giây), +8% doanh thu thuê máy (đỡ thất thoát).',
  },
  {
    id: 'waiter', name: 'Nhân Viên Phục Vụ', emoji: '🧑‍🍳', hireFee: 150000, salaryPerDay: 40000, maxCount: 3,
    requiresZone: 'eating',
    effect: 'Khách gọi đồ nhiều hơn (+30% mỗi người) và hài lòng hơn khi được phục vụ tận nơi.',
  },
  {
    id: 'technician', name: 'Kỹ Thuật Viên', emoji: '🧑‍🔧', hireFee: 300000, salaryPerDay: 60000, maxCount: 2,
    requiresZone: 'tech',
    effect: 'Giảm 15% chi phí nâng cấp máy cho mỗi người (tối đa 2).',
  },
  {
    id: 'manager', name: 'Quản Lý', emoji: '🧑‍💼', hireFee: 600000, salaryPerDay: 100000, maxCount: 3,
    minRating: 3.5,
    effect: 'Tăng 6% mọi doanh thu, giảm sức ép đối thủ. Cần để mở chi nhánh (1 người / chi nhánh).',
  },
];

export const STAFF_BY_ID: Record<StaffId, StaffDef> = Object.fromEntries(
  STAFF.map(s => [s.id, s])
) as Record<StaffId, StaffDef>;

/* ------------------------------------------------------------------ */
/* 5. CHI PHÍ, GIẢI ĐẤU, ĐỐI THỦ, CHI NHÁNH, CYBER GAMING              */
/* ------------------------------------------------------------------ */

export const GAME_CLOCK = {
  openHour: 6,
  closeHour: 24,
  /** 1 giờ trong game = bao nhiêu giây thật */
  secondsPerGameHour: 10,
};

export const COSTS = {
  /** Điện nước cố định mỗi ngày */
  utilitiesBase: 20000,
  utilitiesPerStation: 4000,
  /** Gói mạng mỗi ngày */
  internet: { gigabit: 30000, normal: 15000, laggy: 0 } as Record<'gigabit' | 'normal' | 'laggy', number>,
  /** Điều hòa mỗi ngày */
  ac: 20000,
  /** Khuyến mãi / quảng cáo */
  promotion: 300000,
  /** Mỗi giải đấu */
  tournament: 400000,
  tournamentCooldownDays: 2,
  /** Mở chi nhánh + nâng cấp chi nhánh */
  branchBuild: 3000000,
  branchUpgrade: [0, 0, 2000000, 5000000],
  /** Cyber Gaming (cơ sở vật chất cao cấp) */
  cyberGaming: 10000000,
  /** Sàn phá sản */
  bankruptcyFloor: -300000,
};

export const CYBER_REQUIREMENTS = {
  zones: ['gaming', 'vip', 'tournament'] as ZoneId[],
  minRating: 4.0,
};

export const RIVAL_NAMES = [
  'Cyber Sao Việt',
  'Net Rồng Xanh',
  'GameZone 24h',
  'Esport Arena',
  'Thiên Long Cyber',
];

export const WIN_CONDITION = {
  minMarketShare: 0.5,
  minShops: 3, // tiệm chính + chi nhánh
  minRating: 4.2,
};
