using UnityEngine;

/// <summary>
/// BÀN MÁY TÍNH (COMPUTER STATION)
/// Quản lý thuê máy, đếm ngược thời gian, nâng cấp linh kiện và tính điểm chất lượng máy.
/// </summary>
public class ComputerStation : MonoBehaviour
{
    [Header("Cấu Hình Bàn Máy")]
    public string stationName = "Bàn Máy 01";
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
}