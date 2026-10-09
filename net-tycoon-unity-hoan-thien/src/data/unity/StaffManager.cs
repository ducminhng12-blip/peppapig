using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// THUÊ NHÂN VIÊN: Thu ngân, Phục vụ, Kỹ thuật viên, Quản lý.
/// Hiệu quả của nhóm: 1 người = 45%, 2 người = 70%, 3 người = 83% (giảm dần).
/// Lương trừ vào cuối mỗi ngày (GameLoopManager).
/// </summary>
public class StaffManager : MonoBehaviour
{
    public static StaffManager Instance { get; private set; }

    private readonly Dictionary<StaffRole, int> counts = new Dictionary<StaffRole, int>();

    public int TotalStaff
    {
        get
        {
            int total = 0;
            foreach (var kv in counts) total += kv.Value;
            return total;
        }
    }

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        foreach (var s in GameData.Staff) counts[s.role] = 0;
    }

    public int Count(StaffRole role)
    {
        int n;
        return counts.TryGetValue(role, out n) ? n : 0;
    }

    public float Efficiency(StaffRole role)
    {
        return 1f - Mathf.Pow(0.55f, Count(role));
    }

    public string GetBlockReason(StaffRole role)
    {
        StaffData s = GameData.GetStaff(role);
        if (Count(role) >= s.maxCount) return "Đã đạt số lượng tối đa";
        if (s.requiredZone >= 0 && ZoneManager.Instance != null && !ZoneManager.Instance.IsUnlocked((ZoneType)s.requiredZone))
            return "Cần mở " + GameData.GetZone((ZoneType)s.requiredZone).displayName;
        float rating = GameLoopManager.Instance != null ? GameLoopManager.Instance.Rating : 3.5f;
        if (s.minRating > 0f && rating < s.minRating) return "Cần đánh giá từ " + s.minRating.ToString("0.0") + " sao";
        return null;
    }

    public bool TryHire(StaffRole role)
    {
        if (GetBlockReason(role) != null) return false;
        StaffData s = GameData.GetStaff(role);
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(s.hireFee)) return false;
        counts[role] = Count(role) + 1;
        Debug.Log("[Nhân sự] Thuê " + s.displayName + " (lương " + s.salaryPerDay.ToString("N0") + "đ/ngày)");
        return true;
    }

    public bool TryFire(StaffRole role)
    {
        if (Count(role) <= 0) return false;
        if (role == StaffRole.Manager && BranchManager.Instance != null && Count(role) <= BranchManager.Instance.BranchCount) return false;
        counts[role] = Count(role) - 1;
        return true;
    }

    public long TotalSalariesPerDay()
    {
        long total = 0;
        foreach (var s in GameData.Staff) total += s.salaryPerDay * Count(s.role);
        return total;
    }

    /// <summary>Kỹ thuật viên giảm 15% chi phí nâng cấp máy mỗi người (tối đa 2 người).</summary>
    public float UpgradeCostMultiplier()
    {
        return 1f - 0.15f * Mathf.Min(2, Count(StaffRole.Technician));
    }

    /// <summary>Thời gian khách chịu xếp hàng chờ máy (giây).</summary>
    public float QueuePatienceSeconds()
    {
        return 18f + 6f * Efficiency(StaffRole.Cashier) * 1.5f;
    }
}
