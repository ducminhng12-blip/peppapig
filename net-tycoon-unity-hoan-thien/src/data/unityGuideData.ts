/**
 * Step-by-step Unity Inspector and Setup guide for Net Tycoon:
 * Upgrades (Monitor, GPU, RAM) & Customer AI (NavMesh)
 */

export interface UnityStep {
  id: string;
  stepNumber: number;
  title: string;
  badge: string;
  summary: string;
  clicks: {
    action: string;
    target: string;
    detail: string;
    tip?: string;
  }[];
  inspectorFields?: {
    field: string;
    type: string;
    value: string;
    note: string;
  }[];
  hierarchyPreview?: string[];
  warningNote?: string;
}

export const unitySteps: UnityStep[] = [
  {
    id: 'step-navmesh',
    stepNumber: 1,
    title: 'Nướng NavMesh & Tạo Ghế Ngồi (sitPoint)',
    badge: 'AI Navigation & Scene',
    summary: 'Tạo đường đi thông minh để khách hàng có thể tự động bước tới bàn máy tính.',
    hierarchyPreview: [
      '▶ BanMayTinh_01',
      '  ├── Box Collider (Collider bàn máy)',
      '  ├── ComputerStation (Script đã cập nhật hệ thống nâng cấp)',
      '  └── sitPoint (Empty GameObject đặt ngay trước ghế ngồi)',
    ],
    clicks: [
      {
        action: 'Mở cửa sổ Navigation trong Unity',
        target: 'Window > AI > Navigation (hoặc Package NavMesh)',
        detail: 'Chọn sàn nhà của quán net, tích "Navigation Static", sau đó bấm tab "Bake" -> click nút "Bake" để tạo bản đồ di chuyển màu xanh dương.',
      },
      {
        action: 'Tạo điểm ghế ngồi cho bàn máy',
        target: 'Hierarchy > BanMayTinh_01 > Click phải > Create Empty',
        detail: 'Đặt tên là "sitPoint". Di chuyển vị trí sitPoint đặt ngay trước mặt ghế ngồi (khoảng Y = 0 trên sàn nhà).',
        tip: 'Kéo sitPoint này vào ô "Sit Point" trong Inspector của ComputerStation để khách biết đích đến.',
      },
    ],
  },
  {
    id: 'step-customer-prefab',
    stepNumber: 2,
    title: 'Tạo Prefab Khách Hàng — Tay Chân, Quần Áo & Phụ Kiện 3D',
    badge: 'Humanoid Prefab & 3D Limbs',
    summary: 'Tạo nhân vật khách có đầy đủ tay chân cử động, trang phục (áo sơ mi, hoodie, vest) và phụ kiện (balo, tai nghe RGB, kính VIP).',
    hierarchyPreview: [
      '▶ Customer_Prefab',
      '  ├── NavMeshAgent (Tốc độ Speed: 3.0, Stopping Distance: 0.3)',
      '  ├── CustomerAI (Điều khiển State Machine & Animation)',
      '  ├── CustomerSatisfaction (Hệ thống tính điểm Base 70đ)',
      '  └── Humanoid_Model (Model nhân vật hoặc Ghép Primitive Parts)',
      '      ├── Torso (Thân áo: Sơ mi trắng / Hoodie đen / Vest tím)',
      '      ├── Head (Khuôn mặt, Tóc, Tai nghe RGB / Kính râm VIP)',
      '      ├── Left_Arm & Right_Arm (Cánh tay áo, cẳng tay & bàn tay)',
      '      └── Left_Leg & Right_Leg (Đùi quần, ống chân & Giày sneaker)',
    ],
    clicks: [
      {
        action: 'Tạo cấu trúc cơ thể nhân vật',
        target: 'Hierarchy > 3D Object > Empty GameObject: Customer_Prefab',
        detail: 'Tạo các child GameObject đại diện cho Torso (Áo), Left/Right Arm (Tay), Left/Right Leg (Chân) và Head (Đầu) hoặc import file 3D model FBX có bộ xương Humanoid.',
        tip: 'Khớp hông đặt ở Y=0.7, chân chạm sàn Y=0, tay gắn ở vai để vung tự nhiên khi bước đi.',
      },
      {
        action: 'Tạo và gán Material trang phục theo loại khách',
        target: 'Assets/Materials > Create Material',
        detail: 'Tạo 3 bộ trang phục: (1) Học Sinh: Shirt_White + Pants_Navy + Backpack_Red; (2) Game Thủ: Hoodie_Black + Neon_Cyan (Emissive) + Gaming_Headset; (3) Khách VIP: Suit_Purple + Tie_Gold + Leather_Shoes.',
      },
      {
        action: 'Cài đặt Animator hoặc Script cử động tay chân',
        target: 'Inspector > Add Component > Animator (hoặc CustomerAI)',
        detail: 'Gán các Animation Clip: Walk (vung tay chân bước đi), SitDown (ngồi gập chân 90 độ), Playing (2 tay đặt lên bàn phím & chuột máy tính), StandUp & Leave (khi hết giờ chơi thì đứng dậy khỏi ghế và bước ra cửa tiệm để về).',
      },
      {
        action: 'Lưu thành Prefab tái sử dụng',
        target: 'Kéo thả Customer_Prefab vào thư mục Assets/Prefabs',
        detail: 'Prefab đã có đầy đủ visual ngoại hình, tay chân cử động và logic AI tìm máy tự động.',
      },
    ],
  },
  {
    id: 'step-customer-manager',
    stepNumber: 3,
    title: 'Setup Người Quản Lý Cửa (CustomerManager)',
    badge: 'Doorway & Spawner',
    summary: 'Đặt Spawner ở cửa quán, tự động sinh khách sau mỗi 10 giây.',
    hierarchyPreview: [
      '▶ Doorway_Entrance',
      '  └── CustomerManager (Gán script CustomerManager.cs)',
      '      ├── Customer Prefab (Kéo Customer_Prefab vào)',
      '      ├── Spawn Point (Chính Transform này)',
      '      └── Spawn Interval: 10 (giây)',
    ],
    clicks: [
      {
        action: 'Tạo Spawner ở cửa',
        target: 'Hierarchy > Create Empty > Đổi tên CustomerManager',
        detail: 'Kéo vị trí GameObject này đặt ngay tại cửa ra vào của quán net.',
      },
      {
        action: 'Gán script CustomerManager',
        target: 'Inspector > Add Component > CustomerManager',
        detail: 'Kéo Customer_Prefab vừa tạo ở Bước 2 vào ô "Customer Prefab". Kéo chính GameObject CustomerManager vào ô "Spawn Point".',
      },
      {
        action: 'Chỉnh thời gian sinh khách',
        target: 'Spawn Interval = 10',
        detail: 'Cứ mỗi 10 giây sẽ có 1 khách mới bước vào quán.',
      },
    ],
  },
  {
    id: 'step-upgrade-ui',
    stepNumber: 4,
    title: 'Setup Popup Giao Diện Nâng Cấp (StationUpgradeUI)',
    badge: 'Canvas UI & Menu',
    summary: 'Tạo bảng Menu Nâng Cấp Màn hình, GPU, RAM xuất hiện khi người chơi đến gần < 2m bấm E.',
    hierarchyPreview: [
      '▶ Canvas_HUD',
      '  └── Panel_StationUpgrade (Mặc định SetActive: False)',
      '      ├── Text_Title ("CẤU HÌNH & NÂNG CẤP BÀN MÁY")',
      '      ├── Row_Monitor (Text tên màn hình + Button "Nâng Cấp")',
      '      ├── Row_GPU (Text tên Card đồ họa + Button "Nâng Cấp")',
      '      ├── Row_RAM (Text tên RAM + Button "Nâng Cấp")',
      '      └── Btn_Close (Nút đóng X hoặc ESC)',
    ],
    clicks: [
      {
        action: 'Tạo Panel UI Nâng Cấp',
        target: 'Hierarchy > Canvas > UI > Panel',
        detail: 'Đặt tên là "Panel_StationUpgrade". Thêm 3 hàng (Row) đại diện cho Màn hình, Card đồ họa và RAM. Mỗi hàng gồm 1 Text tên linh kiện và 1 Button.',
      },
      {
        action: 'Gán script StationUpgradeUI',
        target: 'Panel_StationUpgrade > Add Component > StationUpgradeUI',
        detail: 'Kéo các TextMeshProUGUI và Button tương ứng vào các ô Monitor, GPU, RAM của script.',
      },
      {
        action: 'Cơ chế hoạt động khi bấm phím E',
        target: 'PlayerInteraction.cs',
        detail: 'Khi người chơi đến gần bàn máy < 2m và bấm phím E, script sẽ tự động gọi StationUpgradeUI.Instance.OpenPanel(thisStation) và mở khóa chuột.',
      },
    ],
  },
  {
    id: 'step-custom-options',
    stepNumber: 5,
    title: 'Cách Tự Thêm Tùy Chọn Nâng Cấp Mới (CPU, Bàn Phím, Chuột)',
    badge: 'Mở Rộng Gameplay',
    summary: 'Hướng dẫn bổ sung thêm các linh kiện nâng cấp khác trong tương lai chỉ với vài dòng code.',
    clicks: [
      {
        action: 'Bước A: Mở file ComputerStation.cs',
        target: 'Khai báo biến level và giá tiền mới',
        detail: 'Ví dụ thêm Ghế Gaming: thêm "public int chairLevel = 1;" và mảng giá "public long[] chairCosts = { 0, 40000, 120000 };".',
      },
      {
        action: 'Bước B: Tạo hàm TryUpgradeChair()',
        target: 'ComputerStation.cs',
        detail: 'Kiểm tra MoneyManager.Instance.TrySpendMoney(cost), nếu thành công thì chairLevel++ và cập nhật visual ghế.',
      },
      {
        action: 'Bước C: Thêm nút trên StationUpgradeUI',
        target: 'StationUpgradeUI.cs',
        detail: 'Tạo thêm 1 hàng UI Ghế Gaming và gán sự kiện onClick gọi TryUpgradeChair(). Khách VIP sẽ ưu tiên quán có ghế êm hơn!',
      },
    ],
  },
  {
    id: 'step-satisfaction-system',
    stepNumber: 6,
    title: 'Gán CustomerSatisfaction & Thiết Lập Hàng Đợi (WaitingQueue)',
    badge: 'Hệ Thống Hài Lòng & Hàng Đợi',
    summary: 'Tích hợp thang điểm hài lòng Base 70đ, tính điểm cấu hình máy và hàng ghế chờ dự phòng khi hết máy.',
    hierarchyPreview: [
      '▶ Customer_Prefab',
      '  ├── CustomerAI.cs (Quản lý di chuyển & thuê máy)',
      '  └── CustomerSatisfaction.cs (Khởi điểm 70đ, tự cộng RAM*2, VGA*3, Màn*2, trừ chờ đợi)',
      '▶ WaitingQueueArea',
      '  ├── WaitingQueueManager.cs (Quản lý hàng đợi FIFO)',
      '  ├── Slot_01 (Ghế chờ số 1)',
      '  └── Slot_02 (Ghế chờ số 2)',
    ],
    clicks: [
      {
        action: 'Gán CustomerSatisfaction vào Customer_Prefab',
        target: 'Customer_Prefab > Add Component > CustomerSatisfaction',
        detail: 'Đặt Base Score = 70. Script sẽ tự động lắng nghe ComputerStation để cộng điểm cấu hình máy khi khách ngồi vào ghế.',
      },
      {
        action: 'Tạo khu vực hàng đợi chờ máy',
        target: 'Hierarchy > Create Empty > Đổi tên WaitingQueueArea',
        detail: 'Thêm component WaitingQueueManager. Tạo 2 GameObject con làm vị trí ghế chờ (Slot_01, Slot_02) và kéo vào mảng Queue Slots của script.',
      },
      {
        action: 'Kiểm tra điểm số khi chạy game (Play Mode)',
        target: 'Console & Inspector',
        detail: 'Khi hết máy, khách sẽ tự vào ghế chờ và bị trừ -10đ nếu đợi lâu. Khi máy trống, khách vào máy và xuất hóa đơn trải nghiệm cùng đánh giá 1-5 sao!',
      },
    ],
  },
  {
    id: 'step-economy-managers',
    stepNumber: 7,
    title: 'Dựng Bộ Manager Kinh Tế (Kho, Khu Vực, Mặt Bằng, Nhân Viên, Game Loop)',
    badge: 'Hệ Thống Tycoon',
    summary: 'Gắn 7 manager lên 1 GameObject "Managers" để có kho, khu vực, mặt bằng, nhân viên, đối thủ, chi nhánh và vòng lặp ngày.',
    hierarchyPreview: [
      '▶ Managers',
      '  ├── MoneyManager',
      '  ├── InventoryManager',
      '  ├── ZoneManager',
      '  ├── LocationManager',
      '  ├── StaffManager',
      '  ├── CompetitorManager',
      '  ├── BranchManager',
      '  └── GameLoopManager (kéo Customer Prefab + Spawn Point)',
    ],
    clicks: [
      {
        action: 'Copy toàn bộ file .cs mới vào dự án',
        target: 'Project > Assets/Scripts',
        detail: 'Tab "Xem Code C#" có 10 file mới (GameData → GameLoopManager). Bấm "Tải File .cs" hoặc copy thư mục src/data/unity. Cần Unity 2022.3 trở lên (dùng FindObjectsByType).',
        tip: 'GameData.cs là nơi duy nhất chứa số liệu. Đừng tạo trùng enum CustomerKind trong file khác.',
      },
      {
        action: 'Tạo GameObject Managers và thêm 8 component',
        target: 'Hierarchy > Create Empty > "Managers" > Add Component',
        detail: 'Thêm MoneyManager, InventoryManager, ZoneManager, LocationManager, StaffManager, CompetitorManager, BranchManager, GameLoopManager. Mỗi script là Singleton nên chỉ cần 1 bản.',
      },
      {
        action: 'Gán Customer Prefab cho GameLoopManager',
        target: 'GameLoopManager > Customer Prefab / Spawn Point',
        detail: 'Kéo prefab khách (đã có CustomerAI) và điểm CustomerSpawnPoint. GameLoopManager sẽ tự sinh khách theo nhịp của danh tiếng, mặt bằng và giờ cao điểm.',
      },
      {
        action: 'Mở tiệm',
        target: 'Console / UI Button',
        detail: 'Gọi GameLoopManager.Instance.OpenShop() từ một nút UI. Hết ngày (24:00) quán tự đóng và in báo cáo lợi nhuận ra Console (sự kiện OnDayEnded).',
      },
    ],
    inspectorFields: [
      { field: 'Customer Prefab', type: 'GameObject', value: 'CustomerPrefab', note: 'Prefab khách có CustomerAI + CustomerSatisfaction.' },
      { field: 'Food Service Enabled', type: 'bool', value: 'true', note: 'Tắt thì khách không gọi đồ và không được +10 điểm đồ ăn.' },
      { field: 'Internet Plan', type: 'enum', value: 'Gigabit', note: 'Gigabit +10 điểm (30.000đ/ngày), Normal +5 (15.000đ), Laggy -15 (miễn phí).' },
      { field: 'Pricing Policy', type: 'enum', value: 'Standard', note: 'Cheap x0.8 giá (+10 điểm), Standard x1 (+5), Expensive x1.3 (-10).' },
    ],
  },
  {
    id: 'step-food-inventory',
    stepNumber: 8,
    title: 'Đồ Ăn, Nước Uống & Kho Hàng',
    badge: 'Food & Inventory',
    summary: 'Khách gọi đồ khi đang chơi, bạn phải nhập hàng và giữ kho đủ để khách hài lòng.',
    clicks: [
      {
        action: 'Thêm FoodOrderSystem vào prefab khách',
        target: 'CustomerPrefab > Add Component > FoodOrderSystem',
        detail: 'CustomerAI cũng tự thêm nếu thiếu. Khi khách ngồi máy, CustomerAI gọi BeginSession() và mỗi frame gọi UpdateProgress() để khách gọi món đúng lúc.',
      },
      {
        action: 'Hiển thị cảnh báo tồn kho trên UI',
        target: 'UI Text + InventoryManager.OnStockWarning',
        detail: 'Dùng GetStockLabel("coca") để hiện "Coca: 3 / 50" và GetWarningText("coca") để hiện "⚠ Sắp hết hàng". Cảnh báo bật khi tồn kho còn dưới 25% sức chứa.',
      },
      {
        action: 'Nút nhập hàng',
        target: 'UI Button > OnClick',
        detail: 'InventoryManager.TryPurchase("coca", 12) nhập 1 lô. TryFillToMax("coca") nhập đầy kho. RestockLow() nhập bù mọi món đang thấp.',
      },
    ],
    inspectorFields: [
      { field: 'Warehouse Level', type: 'int (1-4)', value: '1', note: 'Sức chứa x1 / x1.5 / x2 / x3. Nâng bằng TryUpgradeWarehouse().' },
    ],
    warningNote: 'Mỗi món gọi tốn thêm 1 "Ly / hộp đựng" và mỗi khách rời máy tốn 1 "Bộ vệ sinh". Hết 2 vật dụng này khách sẽ bực mình, nên nhớ nhập đủ!',
  },
  {
    id: 'step-zones-locations',
    stepNumber: 9,
    title: 'Khu Vực, Mặt Bằng, Nhân Viên, Đối Thủ & Chi Nhánh',
    badge: 'Expansion',
    summary: 'Mở rộng tiệm theo lộ trình: khu mới, mặt bằng lớn hơn, nhân viên, khu VIP, Cyber Gaming, chi nhánh.',
    clicks: [
      {
        action: 'Tạo các khu trong cảnh và gắn ShopZone',
        target: 'Hierarchy > Zone_Gaming > Add Component > ShopZone',
        detail: 'Chọn Zone Type, kéo máy/bàn ghế vào "Enable When Unlocked" và rào chắn vào "Show While Locked". Khi bạn gọi ZoneManager.Instance.TryUnlock(ZoneType.Gaming) khu sẽ tự mở.',
        tip: 'Muốn thêm khu mới (vd Khu Console): thêm 1 dòng trong GameData.Zones hoặc gọi ZoneManager.RegisterZone().',
      },
      {
        action: 'Mua mặt bằng và chuyển tiệm',
        target: 'LocationManager.TryUnlock / TrySwitch',
        detail: 'Hẻm nhỏ (60m²) chỉ đủ 7 khu cơ bản. Muốn mở Khu Gaming (20m²) phải chuyển sang Mặt đường (100m²), Phòng Tournament cần Trung tâm (150m²).',
      },
      {
        action: 'Thuê nhân viên, mở Cyber Gaming, xây chi nhánh',
        target: 'StaffManager.TryHire / BranchManager.TryUnlockCyberGaming / TryOpenBranch',
        detail: 'Mỗi chi nhánh cần 1 Quản lý. Thắng game khi có Cyber Gaming, ≥3 cơ sở, ≥4.2★ và thị phần ≥50%.',
      },
    ],
  },
];

export const troubleshootingList = [
  {
    issue: 'Khách hàng sinh ra nhưng đứng yên ở cửa, không đi tới bàn máy',
    cause: 'Sàn nhà chưa được Nướng (Bake) NavMesh, hoặc bàn máy chưa được gán sitPoint.',
    solution: 'Mở cửa sổ Window > AI > Navigation, chọn sàn và bấm Bake. Kiểm tra trong Inspector của ComputerStation ô "Sit Point" đã kéo GameObject vào chưa.',
  },
  {
    issue: 'Nâng cấp xong nhưng tiền không trừ hoặc trừ sai',
    cause: 'MoneyManager chưa có hàm TrySpendMoney() hoặc chưa có đủ số dư.',
    solution: 'Kiểm tra file MoneyManager.cs đã cập nhật hàm TrySpendMoney(long cost). Kiểm tra log Console xem có báo "Không đủ tiền" hay không.',
  },
  {
    issue: 'Khách gọi đồ nhưng kho không giảm / không thu tiền',
    cause: 'Chưa có InventoryManager hoặc khu Ăn Uống (ZoneType.Eating) chưa mở, hoặc Food Service Enabled đang tắt.',
    solution: 'Thêm InventoryManager + ZoneManager vào GameObject Managers, bật Food Service Enabled trong GameLoopManager.',
  },
  {
    issue: 'Báo lỗi "CustomerKind không tồn tại" hoặc trùng tên',
    cause: 'Thiếu GameData.cs hoặc có enum CustomerKind khai báo ở file khác.',
    solution: 'Copy GameData.cs vào Assets/Scripts và xóa các enum trùng tên cũ. Cần Unity 2022.3+ cho FindObjectsByType.',
  },
  {
    issue: 'Khách VIP không chọn máy xịn mà ngồi máy cùi bắp',
    cause: 'Customer.cs chưa gọi hàm FindBestAvailableComputer() hoặc GetTotalScore().',
    solution: 'Đảm bảo Customer.cs sử dụng logic chấm điểm GetTotalScore() trong phiên bản code mới nhất.',
  },
];
