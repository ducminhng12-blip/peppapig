using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// HỆ THỐNG VỊ TRÍ MẶT BẰNG: Hẻm nhỏ / Mặt đường / Trung tâm / Khu thương mại.
/// Mỗi mặt bằng có Rent, Traffic, Area, Competition, CustomerType (xem GameData.cs).
/// - Mua (mở khóa) mặt bằng một lần, sau đó chuyển tiệm chính sang đó hoặc xây chi nhánh.
/// - Diện tích mặt bằng giới hạn số khu vực có thể mở (ZoneManager).
/// </summary>
public class LocationManager : MonoBehaviour
{
    public static LocationManager Instance { get; private set; }

    [SerializeField] private LocationId activeLocation = LocationId.Alley;

    private readonly HashSet<LocationId> owned = new HashSet<LocationId>();
    private readonly Dictionary<LocationId, int> ageDays = new Dictionary<LocationId, int>();

    public event Action<LocationId> OnLocationChanged;

    public LocationData Current => GameData.GetLocation(activeLocation);
    public LocationId ActiveId => activeLocation;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        owned.Add(LocationId.Alley);
        ageDays[LocationId.Alley] = 0;
    }

    public bool IsOwned(LocationId id)
    {
        return owned.Contains(id);
    }

    public bool TryUnlock(LocationId id)
    {
        LocationData l = GameData.GetLocation(id);
        if (l == null || owned.Contains(id)) return false;
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(l.unlockCost)) return false;

        owned.Add(id);
        ageDays[id] = 0;
        Debug.Log("[Mặt bằng] Mua " + l.displayName + " (-" + l.unlockCost.ToString("N0") + "đ)");
        return true;
    }

    /// <summary>Chuyển tiệm chính. Chỉ khi đã đóng cửa và diện tích đủ cho các khu đang dùng.</summary>
    public bool TrySwitch(LocationId id)
    {
        if (!owned.Contains(id) || id == activeLocation) return false;
        if (GameLoopManager.Instance != null && GameLoopManager.Instance.IsOpen) return false;
        if (BranchManager.Instance != null && BranchManager.Instance.HasBranchAt(id)) return false;

        LocationData l = GameData.GetLocation(id);
        if (ZoneManager.Instance != null && ZoneManager.Instance.UsedArea() > l.area)
        {
            Debug.LogWarning("[Mặt bằng] " + l.displayName + " chỉ rộng " + l.area + "m2, không đủ cho các khu đang dùng.");
            return false;
        }
        if (MoneyManager.Instance == null || !MoneyManager.Instance.TrySpendMoney(GameBalance.RelocateFee)) return false;

        activeLocation = id;
        if (OnLocationChanged != null) OnLocationChanged(id);
        Debug.Log("[Mặt bằng] Chuyển tiệm chính sang " + l.displayName);
        return true;
    }

    /// <summary>Khu Thương Mại: lượng khách tăng dần mỗi ngày (tiềm năng lớn).</summary>
    public float GrowthBonus()
    {
        LocationData l = Current;
        int age;
        ageDays.TryGetValue(l.id, out age);
        return Mathf.Min(l.growthCap, age * l.growthPerDay);
    }

    public void OnDayEnded()
    {
        int age;
        ageDays.TryGetValue(activeLocation, out age);
        ageDays[activeLocation] = age + 1;
    }
}
