using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// QUẢN LÝ KHU VỰC TRONG TIỆM:
/// Khu máy thường, Khu Gaming, Phòng VIP, Phòng Tournament, Khu ăn uống, Quầy thanh toán, Phòng kỹ thuật, Kho.
/// Mỗi khu chiếm diện tích (m2) và bị giới hạn bởi diện tích mặt bằng hiện tại.
/// Thiết kế mở rộng map: gọi RegisterZone(new ZoneData(...)) để thêm khu mới (vd: Khu Console, Quầy Bar...)
/// mà không cần sửa code của các hệ thống khác.
/// </summary>
public class ZoneManager : MonoBehaviour
{
    public static ZoneManager Instance { get; private set; }

    private readonly List<ZoneData> zones = new List<ZoneData>();
    private readonly HashSet<ZoneType> unlocked = new HashSet<ZoneType>();

    public event Action<ZoneType> OnZoneUnlocked;

    public IReadOnlyList<ZoneData> Zones => zones;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        foreach (var z in GameData.Zones)
        {
            zones.Add(z);
            if (z.initial) unlocked.Add(z.type);
        }
    }

    /// <summary>Thêm một khu hoàn toàn mới lúc chạy game / khi mở rộng map.</summary>
    public void RegisterZone(ZoneData zone)
    {
        if (zone == null || zones.Exists(z => z.type == zone.type)) return;
        zones.Add(zone);
        if (zone.initial) unlocked.Add(zone.type);
    }

    public bool IsUnlocked(ZoneType type)
    {
        return unlocked.Contains(type);
    }

    public int UsedArea()
    {
        int total = 0;
        foreach (var z in zones)
        {
            if (unlocked.Contains(z.type)) total += z.area;
        }
        return total;
    }

    public int FreeArea()
    {
        int cap = LocationManager.Instance != null ? LocationManager.Instance.Current.area : 60;
        return cap - UsedArea();
    }

    /// <summary>Số máy thêm vào mô phỏng nhờ các khu đã mở (vd Khu Gaming = +2 máy).</summary>
    public int ExtraStationsUnlocked()
    {
        int total = 0;
        foreach (var z in zones)
        {
            if (unlocked.Contains(z.type)) total += z.extraStations;
        }
        return total;
    }

    /// <summary>null = mở được. Ngược lại trả về lý do bị chặn.</summary>
    public string GetBlockReason(ZoneType type)
    {
        ZoneData z = zones.Find(x => x.type == type);
        if (z == null) return "Không tồn tại khu này";
        if (unlocked.Contains(type)) return "Đã mở";

        foreach (var req in z.requiredZones)
        {
            if (!unlocked.Contains(req)) return "Cần mở " + GameData.GetZone(req).displayName + " trước";
        }

        float rating = GameLoopManager.Instance != null ? GameLoopManager.Instance.Rating : 3.5f;
        if (z.minRating > 0f && rating < z.minRating) return "Cần đánh giá từ " + z.minRating.ToString("0.0") + " sao";

        int staff = StaffManager.Instance != null ? StaffManager.Instance.TotalStaff : 0;
        if (z.minStaff > 0 && staff < z.minStaff) return "Cần thuê ít nhất " + z.minStaff + " nhân viên";

        if (FreeArea() < z.area) return "Thiếu diện tích (cần " + z.area + "m2, còn " + FreeArea() + "m2) - hãy chuyển sang mặt bằng lớn hơn";
        return null;
    }

    public bool TryUnlock(ZoneType type)
    {
        ZoneData z = zones.Find(x => x.type == type);
        if (z == null || GetBlockReason(type) != null) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(z.unlockCost)) return false;

        unlocked.Add(type);
        Debug.Log("[Khu vực] Mở rộng: " + z.displayName + " (-" + z.unlockCost.ToString("N0") + "đ)");
        if (OnZoneUnlocked != null) OnZoneUnlocked(type);
        return true;
    }
}
