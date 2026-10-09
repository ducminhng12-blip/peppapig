/**
 * C# Scripts for NetTycoon - TRỌN BỘ MÃ NGUỒN CHUẨN UNITY (PC & MOBILE)
 * Hệ Thống Mức Độ Hài Lòng (Base 70), Nâng Cấp Linh Kiện & Hàng Đợi Chờ
 */

export interface ScriptConfig {
  revenuePerTick: number;
  tickInterval: number;
  interactDistance: number;
  interactKey: string;
  useNewInputSystem: boolean;
  currencySymbol: string;
  autoSavePlayerPrefs: boolean;
  stationNamePrefix: string;
}

export const defaultScriptConfig: ScriptConfig = {
  revenuePerTick: 5000,
  tickInterval: 3,
  interactDistance: 2.0,
  interactKey: 'E',
  useNewInputSystem: false,
  currencySymbol: 'VNĐ',
  autoSavePlayerPrefs: true,
  stationNamePrefix: 'Bàn Máy ',
};

/**
 * 1. CustomerSatisfaction.cs
 * Hệ thống tính điểm trải nghiệm (0 -> 100) khởi điểm 70 điểm.
 */
export function generateCustomerSatisfactionScript(): string {
  return `using UnityEngine;

/// <summary>
/// HỆ THỐNG TÍNH ĐIỂM HÀI LÒNG CỦA KHÁCH HÀNG (CUSTOMER SATISFACTION)
/// Thang điểm chuẩn: 0 -> 100
/// 80 - 100: Very Happy 😍 (5 sao - Tỷ lệ quay lại 95%)
/// 60 - 79:  Happy 🙂      (4 sao - Tỷ lệ quay lại 75%)
/// 40 - 59:  Normal 😐     (3 sao - Tỷ lệ quay lại 45%)
/// 20 - 39:  Unhappy 😕    (2 sao - Tỷ lệ quay lại 15%)
/// 0 - 19:   Very Unhappy 😡 (1 sao - Khách tức giận bỏ về)
/// </summary>
public class CustomerSatisfaction : MonoBehaviour
{
    public enum SatisfactionTier
    {
        VeryUnhappy, // 0 - 19  😡 (1 sao)
        Unhappy,     // 20 - 39 😕 (2 sao)
        Normal,      // 40 - 59 😐 (3 sao)
        Happy,       // 60 - 79 🙂 (4 sao)
        VeryHappy    // 80 - 100 😍 (5 sao)
    }

    [Header("Điểm Khởi Điểm")]
    [SerializeField] private int baseScore = 70;

    [Header("Chi Tiết Các Thành Phần")]
    [SerializeField] private int computerQualityScore = 0; // RAM*2 + VGA*3 + Màn*2
    [SerializeField] private int priceScore = 5;           // Giá thuê hợp lý (+5), rẻ (+10), đắt (-10)
    [SerializeField] private int waitTimePenalty = 0;      // Chờ đợi lâu (-10 đến -15)
    [SerializeField] private int internetBonus = 10;       // Mạng 1Gbps (+10), lag (-15)
    [SerializeField] private int acBonus = 8;              // Điều hòa 22°C (+8), nóng (-10)
    [SerializeField] private int foodBonus = 10;           // Phục vụ mì cay & nước (+10)
    [SerializeField] private int foodExtra = 0;            // Gọi đồ được phục vụ (+2/món, tối đa +6) hoặc hết hàng (-15/lần)
    [SerializeField] private int expectationScore = 0;     // Kỳ vọng theo loại khách (HS -28, Game thủ -45, VIP -62) + tâm trạng

    [Header("Kết Quả Cuối Cùng")]
    [SerializeField] private int finalScore = 70;
    [SerializeField] private SatisfactionTier currentTier = SatisfactionTier.Happy;

    public int FinalScore => finalScore;
    public SatisfactionTier CurrentTier => currentTier;

    private void Start()
    {
        CalculateFinalScore();
    }

    /// <summary>
    /// Tính toán điểm chất lượng máy tính từ cấp độ RAM, VGA, Màn hình:
    /// - RAM: Level * 2 (L1=+2, L2=+4, L3=+6, L4=+8, L5=+10)
    /// - VGA: Level * 3 (L1=+3, L2=+6, L3=+9, L4=+12, L5=+15)
    /// - Màn hình: Level * 2 (L1=+2, L2=+4, L3=+6, L4=+8, L5=+10)
    /// </summary>
    public void ApplyComputerQuality(ComputerStation pc)
    {
        if (pc == null) return;

        computerQualityScore = pc.GetComputerQualityScore();
        CalculateFinalScore();

        Debug.Log($"[Satisfaction] Khách ngồi máy {pc.name} => Chất lượng máy: +{computerQualityScore} điểm (RAM {pc.ramLevel}, VGA {pc.gpuLevel}, Màn {pc.monitorLevel})");
    }

    /// <summary>
    /// Trừ điểm nếu khách phải đứng chờ trong hàng đợi
    /// </summary>
    public void ApplyWaitTimePenalty(float waitSeconds)
    {
        if (waitSeconds > 8f)
        {
            waitTimePenalty = -15; // Chờ quá lâu
        }
        else if (waitSeconds > 3f)
        {
            waitTimePenalty = -10; // Chờ lâu
        }
        else
        {
            waitTimePenalty = 0;   // Có máy ngay
        }

        CalculateFinalScore();
    }

    /// <summary>
    /// Áp dụng điểm số từ giá thuê giờ chơi
    /// </summary>
    public void ApplyPriceFactor(float pricePerHour)
    {
        if (pricePerHour <= 6000f)
        {
            priceScore = 10; // Rẻ
        }
        else if (pricePerHour <= 12000f)
        {
            priceScore = 5;  // Hợp lý
        }
        else
        {
            priceScore = -10; // Đắt
        }

        CalculateFinalScore();
    }

    /// <summary>
    /// Cập nhật các tiện ích quán net (Mạng, Điều hòa, Đồ ăn)
    /// </summary>
    public void SetAmenities(int internet, int ac, int food)
    {
        internetBonus = internet;
        acBonus = ac;
        foodBonus = food;
        CalculateFinalScore();
    }

    /// <summary>
    /// Điểm cộng/trừ từ đồ ăn: được phục vụ (+), hết hàng (-), thiếu bộ vệ sinh (-4)
    /// </summary>
    public void SetFoodExtra(int value)
    {
        foodExtra = value;
        CalculateFinalScore();
    }

    /// <summary>
    /// Kỳ vọng của loại khách: khách càng sộp càng khó tính. Cộng thêm tâm trạng ngẫu nhiên từng người.
    /// </summary>
    public void SetExpectation(int value)
    {
        expectationScore = value;
        CalculateFinalScore();
    }

    /// <summary>
    /// Chính sách giá của quán: Rẻ (+10), Chuẩn (+5), Đắt (-10)
    /// </summary>
    public void ApplyPricingPolicy(PricingPolicy policy)
    {
        priceScore = policy == PricingPolicy.Cheap ? 10 : policy == PricingPolicy.Standard ? 5 : -10;
        CalculateFinalScore();
    }

    /// <summary>
    /// Tính tổng điểm và phân loại 5 cấp bậc cảm xúc
    /// </summary>
    public int CalculateFinalScore()
    {
        finalScore = baseScore + computerQualityScore + priceScore + waitTimePenalty + internetBonus + acBonus + foodBonus + foodExtra + expectationScore;
        finalScore = Mathf.Clamp(finalScore, 0, 100);

        if (finalScore >= 80)
        {
            currentTier = SatisfactionTier.VeryHappy;
        }
        else if (finalScore >= 60)
        {
            currentTier = SatisfactionTier.Happy;
        }
        else if (finalScore >= 40)
        {
            currentTier = SatisfactionTier.Normal;
        }
        else if (finalScore >= 20)
        {
            currentTier = SatisfactionTier.Unhappy;
        }
        else
        {
            currentTier = SatisfactionTier.VeryUnhappy;
        }

        return finalScore;
    }

    /// <summary>
    /// Quy đổi ra số sao đánh giá (1 -> 5 ⭐)
    /// </summary>
    public int GetReviewStars()
    {
        switch (currentTier)
        {
            case SatisfactionTier.VeryHappy: return 5;
            case SatisfactionTier.Happy:     return 4;
            case SatisfactionTier.Normal:    return 3;
            case SatisfactionTier.Unhappy:   return 2;
            case SatisfactionTier.VeryUnhappy: return 1;
            default: return 3;
        }
    }

    /// <summary>
    /// Biểu tượng cảm xúc
    /// </summary>
    public string GetEmoji()
    {
        switch (currentTier)
        {
            case SatisfactionTier.VeryHappy: return "😍 Very Happy";
            case SatisfactionTier.Happy:     return "🙂 Happy";
            case SatisfactionTier.Normal:    return "😐 Normal";
            case SatisfactionTier.Unhappy:   return "😕 Unhappy";
            case SatisfactionTier.VeryUnhappy: return "😡 Very Unhappy";
            default: return "😐 Normal";
        }
    }

    /// <summary>
    /// Tỷ lệ quay lại quán (%)
    /// </summary>
    public float GetReturnChancePercent()
    {
        switch (currentTier)
        {
            case SatisfactionTier.VeryHappy: return 95f;
            case SatisfactionTier.Happy:     return 75f;
            case SatisfactionTier.Normal:    return 45f;
            case SatisfactionTier.Unhappy:   return 15f;
            case SatisfactionTier.VeryUnhappy: return 2f;
            default: return 50f;
        }
    }

    /// <summary>
    /// Xuất hóa đơn trải nghiệm chi tiết ra Console Unity
    /// </summary>
    public string GenerateSummaryReport(string customerName)
    {
        return $"========================================\\n" +
               $"[PHIẾU TRẢI NGHIỆM KHÁCH HÀNG: {customerName}]\\n" +
               $"Điểm khởi điểm (Base):      {baseScore}\\n" +
               $"Chất lượng máy tính:        +{(computerQualityScore >= 0 ? computerQualityScore.ToString() : computerQualityScore.ToString())}\\n" +
               $"Giá thuê máy:               {(priceScore >= 0 ? "+" + priceScore : priceScore.ToString())}\\n" +
               $"Thời gian chờ (Queue):      {waitTimePenalty}\\n" +
               $"Mạng Internet:              +{(internetBonus >= 0 ? internetBonus.ToString() : internetBonus.ToString())}\\n" +
               $"Điều hòa nhiệt độ:          {(acBonus >= 0 ? "+" + acBonus : acBonus.ToString())}\\n" +
               $"Đồ ăn & Nước uống:          +{(foodBonus >= 0 ? foodBonus.ToString() : foodBonus.ToString())}\\n" +
               $"----------------------------------------\\n" +
               $"TỔNG ĐIỂM (FINAL):          {finalScore} / 100\\n" +
               $"Trạng thái cảm xúc:         {GetEmoji()}\\n" +
               $"Đánh giá:                   {GetReviewStars()} ⭐\\n" +
               $"Tỷ lệ quay lại quán:        {GetReturnChancePercent()}%\\n" +
               $"========================================";
    }
}`;
}

/**
 * 2. ComputerStation.cs
 * Bàn máy tính hỗ trợ nâng cấp Monitor, VGA, RAM (Cấp 1 -> 5) và trả về điểm chất lượng máy.
 */
export function generateComputerStationScript(config: ScriptConfig = defaultScriptConfig): string {
  return `using UnityEngine;

/// <summary>
/// BÀN MÁY TÍNH (COMPUTER STATION)
/// Quản lý thuê máy, đếm ngược thời gian, nâng cấp linh kiện và tính điểm chất lượng máy.
/// </summary>
public class ComputerStation : MonoBehaviour
{
    [Header("Cấu Hình Bàn Máy")]
    public string stationName = "${config.stationNamePrefix}01";
    public bool isOccupied = false;
    public Transform sitPoint;
    public float timeRemaining = 0f;

    [Header("Cấp Độ Nâng Cấp Linh Kiện (Cấp 1 -> 5)")]
    [Range(1, 5)] public int monitorLevel = 1; // L1=+2, L2=+4, L3=+6, L4=+8, L5=+10
    [Range(1, 5)] public int gpuLevel = 1;     // L1=+3, L2=+6, L3=+9, L4=+12, L5=+15
    [Range(1, 5)] public int ramLevel = 1;     // L1=+2, L2=+4, L3=+6, L4=+8, L5=+10

    [Header("Chi Phí Nâng Cấp (Cấp 1 -> 5)")]
    public long[] monitorCosts = { 0, 50000, 120000, 250000, 500000 };
    public long[] gpuCosts = { 0, 80000, 200000, 450000, 900000 };
    public long[] ramCosts = { 0, 30000, 75000, 150000, 300000 };

    [Header("Hiển Thị Đồ Họa 3D")]
    [SerializeField] private MeshRenderer screenRenderer;
    [SerializeField] private Light screenLight;
    [SerializeField] private Material screenOnMaterial;
    [SerializeField] private Material screenOffMaterial;

    private void Update()
    {
        if (isOccupied && timeRemaining > 0f)
        {
            // RAM cao giúp tối ưu hóa giảm độ trễ
            float speedMultiplier = 1f + (ramLevel - 1) * 0.15f;
            timeRemaining -= Time.deltaTime * speedMultiplier;

            if (timeRemaining <= 0f)
            {
                EndRent();
            }
        }
    }

    /// <summary>
    /// Công thức tính điểm chất lượng máy tính:
    /// RAM*2 + VGA*3 + Màn hình*2
    /// Ví dụ: RAM 3 (+6), VGA 4 (+12), Màn 2 (+4) => 22 Điểm!
    /// </summary>
    public int GetComputerQualityScore()
    {
        int ramPoints = ramLevel * 2;
        int vgaPoints = gpuLevel * 3;
        int monitorPoints = monitorLevel * 2;

        return ramPoints + vgaPoints + monitorPoints;
    }

    /// <summary>
    /// Bắt đầu thuê máy
    /// </summary>
    public void RentComputer(float hours, float pricePerHour)
    {
        isOccupied = true;
        timeRemaining = hours * 10f; // Mỗi giờ chơi quy đổi 10 giây trong game

        // Doanh thu đã gồm chính sách giá, mặt bằng, thu ngân... (GameLoopManager tính & ghi sổ)
        long earnings = Mathf.RoundToInt(hours * pricePerHour);
        if (GameLoopManager.Instance != null)
        {
            earnings = GameLoopManager.Instance.RentalRevenue(hours, pricePerHour);
            GameLoopManager.Instance.RecordCustomerStart(earnings);
        }
        else if (MoneyManager.Instance != null)
        {
            MoneyManager.Instance.AddMoney(earnings);
        }

        UpdateVisuals(true);
        Debug.Log($"[{stationName}] Bắt đầu thuê máy ({hours}h). Thu: {earnings:N0} VNĐ.");
    }

    /// <summary>
    /// Kết thúc thời gian thuê
    /// </summary>
    public void EndRent()
    {
        isOccupied = false;
        timeRemaining = 0f;
        UpdateVisuals(false);

        // Báo cho Hàng đợi để mời khách tiếp theo vào
        if (WaitingQueueManager.Instance != null)
        {
            WaitingQueueManager.Instance.TryAssignEmptyStation(this);
        }
    }

    public bool TryUpgradeMonitor()
    {
        if (monitorLevel >= 5) return false;
        long cost = monitorCosts[monitorLevel];

        if (TryPayUpgrade(cost, "part_monitor"))
        {
            monitorLevel++;
            Debug.Log($"[{stationName}] Nâng cấp Màn hình lên Cấp {monitorLevel} (Cộng +{monitorLevel * 2}đ)!");
            return true;
        }
        return false;
    }

    public bool TryUpgradeGPU()
    {
        if (gpuLevel >= 5) return false;
        long cost = gpuCosts[gpuLevel];

        if (TryPayUpgrade(cost, "part_vga"))
        {
            gpuLevel++;
            Debug.Log($"[{stationName}] Nâng cấp GPU lên Cấp {gpuLevel} (Cộng +{gpuLevel * 3}đ)!");
            return true;
        }
        return false;
    }

    public bool TryUpgradeRAM()
    {
        if (ramLevel >= 5) return false;
        long cost = ramCosts[ramLevel];

        if (TryPayUpgrade(cost, "part_ram"))
        {
            ramLevel++;
            Debug.Log($"[{stationName}] Nâng cấp RAM lên Cấp {ramLevel} (Cộng +{ramLevel * 2}đ)!");
            return true;
        }
        return false;
    }

    /// <summary>
    /// Nâng cấp tốn tiền công (giảm 15%/Kỹ thuật viên) + 1 bộ linh kiện trong Kho.
    /// Hết linh kiện -> phải nhập thêm ở InventoryManager.
    /// </summary>
    private bool TryPayUpgrade(long baseCost, string partId)
    {
        float mult = StaffManager.Instance != null ? StaffManager.Instance.UpgradeCostMultiplier() : 1f;
        long cost = Mathf.RoundToInt(baseCost * mult);

        InventoryManager inv = InventoryManager.Instance;
        if (inv != null && inv.GetStock(partId) <= 0)
        {
            Debug.LogWarning($"[{stationName}] Hết linh kiện {partId}! Hãy nhập hàng trong Kho.");
            return false;
        }
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(cost)) return false;

        if (inv != null) inv.TryConsume(partId, 1);
        return true;
    }

    private void UpdateVisuals(bool isOn)
    {
        if (screenRenderer != null)
        {
            screenRenderer.material = isOn ? screenOnMaterial : screenOffMaterial;
        }
        if (screenLight != null)
        {
            screenLight.enabled = isOn;
        }
    }
}`;
}

/**
 * 3. CustomerAI.cs
 * Trọn vòng đời khách: Vào quán -> Tìm máy -> Nếu hết máy: Vào hàng đợi -> Ngồi máy -> Tính điểm hài lòng -> Rời đi.
 */
export function generateCustomerAIFullCycleScript(): string {
  return `using UnityEngine;

/// <summary>
/// CUSTOMER AI (TÍCH HỢP HỆ THỐNG ĐIỂM HÀI LÒNG & HÀNG ĐỢI)
/// </summary>
public class CustomerAI : MonoBehaviour
{
    public enum CustomerState
    {
        Spawn,
        EnterShop,
        FindComputer,
        InWaitingQueue,
        WalkToSeatPoint,
        SitDown,
        Playing,
        FinishPlaying,
        LeaveShop
    }

    [Header("Cài Đặt Di Chuyển")]
    [SerializeField] private float moveSpeed = 3.0f;
    [SerializeField] private float stopDistance = 0.25f;

    [Header("Thời Gian Chờ & Hệ Thống Hài Lòng")]
    [SerializeField] private CustomerSatisfaction satisfactionSystem;
    [SerializeField] private float waitSeconds = 0f;

    [Header("Điểm Đến")]
    [SerializeField] private Transform targetPoint;
    [SerializeField] private Transform exitPoint;

    [Header("Trạng Thái Hiện Tại")]
    [SerializeField] private CustomerState currentState = CustomerState.Spawn;
    [SerializeField] private ComputerStation assignedPC;

    [Header("Loại Khách & Gọi Đồ")]
    [SerializeField] private CustomerKind kind = CustomerKind.HocSinh;
    [SerializeField] private float rentHours = 2f;
    [SerializeField] private float pricePerHour = 10000f;
    private FoodOrderSystem foodSystem;
    private float sessionSeconds = 20f;

    /// <summary>GameLoopManager gọi ngay sau khi tạo khách: loại khách, số giờ chơi, giá thuê/giờ.</summary>
    public void Configure(CustomerKind customerKind, float hours, float price)
    {
        kind = customerKind;
        rentHours = hours;
        pricePerHour = price;
    }

    private void Awake()
    {
        satisfactionSystem = GetComponent<CustomerSatisfaction>();
        if (satisfactionSystem == null)
        {
            satisfactionSystem = gameObject.AddComponent<CustomerSatisfaction>();
        }

        foodSystem = GetComponent<FoodOrderSystem>();
        if (foodSystem == null)
        {
            foodSystem = gameObject.AddComponent<FoodOrderSystem>();
        }
    }

    private void Start()
    {
        ChangeState(CustomerState.EnterShop);
    }

    private void Update()
    {
        switch (currentState)
        {
            case CustomerState.EnterShop:
                MoveTowards(targetPoint, onArrived: () => ChangeState(CustomerState.FindComputer));
                break;

            case CustomerState.FindComputer:
                LookForAvailableComputer();
                break;

            case CustomerState.InWaitingQueue:
                HandleWaitingQueue();
                break;

            case CustomerState.WalkToSeatPoint:
                MoveTowards(targetPoint, onArrived: () => ChangeState(CustomerState.SitDown));
                break;

            case CustomerState.SitDown:
                HandleSitDown();
                break;

            case CustomerState.Playing:
                MonitorRentSession();
                break;

            case CustomerState.FinishPlaying:
                StandUpAndLeave();
                break;

            case CustomerState.LeaveShop:
                MoveTowards(exitPoint, onArrived: () => Destroy(gameObject, 0.5f));
                break;
        }
    }

    public void ChangeState(CustomerState newState)
    {
        currentState = newState;

        if (newState == CustomerState.LeaveShop && exitPoint == null)
        {
            GameObject spawnPoint = GameObject.Find("CustomerSpawnPoint");
            if (spawnPoint != null) exitPoint = spawnPoint.transform;
        }
    }

    private void LookForAvailableComputer()
    {
        ComputerStation[] allPCs = FindObjectsOfType<ComputerStation>();
        ComputerStation chosen = null;

        foreach (var pc in allPCs)
        {
            if (pc != null && !pc.isOccupied)
            {
                chosen = pc;
                break;
            }
        }

        if (chosen != null)
        {
            AssignToComputer(chosen);
        }
        else
        {
            // Hết máy! Thử tham gia vào Hàng đợi
            if (WaitingQueueManager.Instance != null && WaitingQueueManager.Instance.TryJoinQueue(this))
            {
                ChangeState(CustomerState.InWaitingQueue);
                Debug.Log($"[{gameObject.name}] Hết máy! Khách vào hàng đợi chờ máy trống.");
            }
            else
            {
                // Hàng đợi cũng đầy -> Khách bực tức bỏ về
                if (satisfactionSystem != null)
                {
                    satisfactionSystem.ApplyWaitTimePenalty(20f);
                }
                if (GameLoopManager.Instance != null)
                {
                    GameLoopManager.Instance.RecordWalkout();
                    GameLoopManager.Instance.RecordReview(2);
                }
                Debug.LogWarning($"[{gameObject.name}] Quán và hàng đợi đều kín! Khách bỏ về.");
                ChangeState(CustomerState.LeaveShop);
            }
        }
    }

    public void AssignToComputer(ComputerStation pc)
    {
        assignedPC = pc;
        assignedPC.isOccupied = true;

        if (satisfactionSystem != null)
        {
            satisfactionSystem.ApplyWaitTimePenalty(waitSeconds);
            satisfactionSystem.ApplyComputerQuality(assignedPC);

            // Tiện ích quán (mạng, điều hòa, đồ ăn, chính sách giá) + kỳ vọng riêng của loại khách
            if (GameLoopManager.Instance != null) GameLoopManager.Instance.ApplyAmenities(satisfactionSystem);
            satisfactionSystem.SetExpectation(GameBalance.KindExpectation[(int)kind] + Random.Range(-8, 5));
        }

        targetPoint = assignedPC.sitPoint != null ? assignedPC.sitPoint : assignedPC.transform;
        ChangeState(CustomerState.WalkToSeatPoint);
    }

    private void HandleWaitingQueue()
    {
        waitSeconds += Time.deltaTime;

        // Chờ quá lâu mà không có máy -> Bực tức bỏ về (Thu ngân giúp khách kiên nhẫn hơn)
        float patience = StaffManager.Instance != null ? StaffManager.Instance.QueuePatienceSeconds() : 18f;
        if (waitSeconds > patience)
        {
            if (WaitingQueueManager.Instance != null)
            {
                WaitingQueueManager.Instance.LeaveQueue(this);
            }
            if (satisfactionSystem != null)
            {
                satisfactionSystem.ApplyWaitTimePenalty(waitSeconds);
            }
            if (GameLoopManager.Instance != null)
            {
                GameLoopManager.Instance.RecordWalkout();
                GameLoopManager.Instance.RecordReview(1);
            }
            Debug.Log($"[{gameObject.name}] Chờ quá lâu! Khách bỏ về với 1 sao 😡.");
            ChangeState(CustomerState.LeaveShop);
        }
    }

    private void HandleSitDown()
    {
        if (assignedPC != null && assignedPC.sitPoint != null)
        {
            transform.position = assignedPC.sitPoint.position;
            transform.rotation = assignedPC.sitPoint.rotation;
        }

        ChangeState(CustomerState.Playing);
        if (assignedPC != null)
        {
            assignedPC.RentComputer(rentHours, pricePerHour);
            sessionSeconds = rentHours * 10f; // 1 giờ chơi = 10 giây trong game
            if (foodSystem != null) foodSystem.BeginSession(kind, rentHours);
        }
    }

    private void MonitorRentSession()
    {
        // Khách gọi đồ ăn / nước theo tiến độ buổi chơi (0 -> 1)
        if (foodSystem != null && assignedPC != null && sessionSeconds > 0f)
        {
            foodSystem.UpdateProgress(1f - assignedPC.timeRemaining / sessionSeconds);
        }

        if (assignedPC == null || assignedPC.timeRemaining <= 0.05f || !assignedPC.isOccupied)
        {
            ChangeState(CustomerState.FinishPlaying);
        }
    }

    private void StandUpAndLeave()
    {
        // 1. Giải phóng bàn máy tính cho khách hàng tiếp theo
        if (assignedPC != null)
        {
            assignedPC.EndRent();
            assignedPC = null;
        }

        // 2. Kích hoạt Animator đứng dậy và bước đi
        Animator anim = GetComponentInChildren<Animator>();
        if (anim != null)
        {
            anim.SetBool("IsPlaying", false);
            anim.SetBool("IsWalking", true);
        }

        // 3. In báo cáo trải nghiệm & điểm đánh giá
        if (satisfactionSystem != null)
        {
            Debug.Log(satisfactionSystem.GenerateSummaryReport(gameObject.name));

            // Đánh giá của khách -> điểm uy tín của quán (ảnh hưởng lượng khách, mở khu VIP, Cyber Gaming...)
            if (GameLoopManager.Instance != null)
            {
                GameLoopManager.Instance.RecordReview(satisfactionSystem.GetReviewStars());
            }
        }

        // 4. Tìm điểm cửa ra vào để bước ra ngoài
        if (exitPoint == null)
        {
            GameObject exitObj = GameObject.Find("CustomerExitPoint");
            if (exitObj == null) exitObj = GameObject.Find("CustomerSpawnPoint");
            if (exitObj != null) exitPoint = exitObj.transform;
        }

        Debug.Log($"[{gameObject.name}] Chơi xong! Đứng dậy khỏi ghế và bước ra cửa về.");
        ChangeState(CustomerState.LeaveShop);
    }

    private void MoveTowards(Transform target, System.Action onArrived)
    {
        if (target == null) return;

        Vector3 direction = target.position - transform.position;
        direction.y = 0f;

        if (direction.magnitude <= stopDistance)
        {
            onArrived?.Invoke();
            return;
        }

        direction.Normalize();
        transform.position += direction * moveSpeed * Time.deltaTime;

        if (direction != Vector3.zero)
        {
            Quaternion rot = Quaternion.LookRotation(direction);
            transform.rotation = Quaternion.Slerp(transform.rotation, rot, 10f * Time.deltaTime);
        }
    }

    public void SetTarget(Transform target) => targetPoint = target;
}`;
}

/**
 * 4. WaitingQueueManager.cs
 * Quản lý hàng đợi khi hết máy (FIFO: First-In, First-Out).
 */
export function generateWaitingQueueManagerScript(): string {
  return `using System.Collections.Generic;
using UnityEngine;

public class WaitingQueueManager : MonoBehaviour
{
    public static WaitingQueueManager Instance { get; private set; }

    [Header("Cấu Hình Hàng Đợi")]
    [SerializeField] private int maxQueueCapacity = 4;
    [SerializeField] private Transform[] queueSlots;

    private readonly List<CustomerAI> waitingCustomers = new List<CustomerAI>();

    public int CurrentWaitingCount => waitingCustomers.Count;
    public bool HasAvailableSlot => waitingCustomers.Count < maxQueueCapacity && (queueSlots == null || waitingCustomers.Count < queueSlots.Length);

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    public bool TryJoinQueue(CustomerAI customer)
    {
        if (!HasAvailableSlot || customer == null) return false;

        waitingCustomers.Add(customer);
        int slotIndex = waitingCustomers.Count - 1;

        if (queueSlots != null && slotIndex < queueSlots.Length)
        {
            customer.SetTarget(queueSlots[slotIndex]);
        }
        return true;
    }

    public void LeaveQueue(CustomerAI customer)
    {
        if (waitingCustomers.Contains(customer))
        {
            waitingCustomers.Remove(customer);
            UpdateQueueSlots();
        }
    }

    public bool TryAssignEmptyStation(ComputerStation emptyPC)
    {
        if (waitingCustomers.Count == 0 || emptyPC == null || emptyPC.isOccupied) return false;

        CustomerAI nextCustomer = waitingCustomers[0];
        waitingCustomers.RemoveAt(0);

        nextCustomer.AssignToComputer(emptyPC);
        UpdateQueueSlots();
        return true;
    }

    private void UpdateQueueSlots()
    {
        if (queueSlots == null) return;

        for (int i = 0; i < waitingCustomers.Count; i++)
        {
            if (waitingCustomers[i] != null && i < queueSlots.Length)
            {
                waitingCustomers[i].SetTarget(queueSlots[i]);
            }
        }
    }
}`;
}

/**
 * 5. MoneyManager.cs
 * Quản lý dòng tiền tiệm net, hỗ trợ TrySpendMoney an toàn.
 */
export function generateMoneyManagerScript(): string {
  return `using UnityEngine;

public class MoneyManager : MonoBehaviour
{
    public static MoneyManager Instance { get; private set; }

    [Header("Quỹ Tiền Của Quán")]
    [SerializeField] private long currentMoney = GameBalance.StartMoney; // 200.000đ (xem GameData.cs)

    public long CurrentMoney => currentMoney;

    public delegate void MoneyChangedDelegate(long newAmount);
    public event MoneyChangedDelegate OnMoneyChanged;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    public void AddMoney(long amount)
    {
        if (amount <= 0) return;
        currentMoney += amount;
        OnMoneyChanged?.Invoke(currentMoney);
    }

    /// <summary>
    /// Chi phí bắt buộc cuối ngày (tiền thuê, lương, điện nước): cho phép âm tiền (nợ).
    /// Nợ vượt GameBalance.BankruptcyFloor thì phá sản.
    /// </summary>
    public void ForceSpend(long amount)
    {
        if (amount <= 0) return;
        currentMoney -= amount;
        OnMoneyChanged?.Invoke(currentMoney);
    }

    public bool TrySpendMoney(long amount)
    {
        if (amount < 0) return false;
        if (currentMoney >= amount)
        {
            currentMoney -= amount;
            OnMoneyChanged?.Invoke(currentMoney);
            return true;
        }
        return false;
    }
}`;
}
