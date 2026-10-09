using UnityEngine;

/// <summary>
/// Đặt lên GameObject đại diện cho 1 khu trong cảnh (vd "Zone_Gaming").
/// Khi khu được mở khóa: bật các object bên trong (máy, bàn ghế, đèn...), tắt lớp "đang khóa".
/// Muốn mở rộng map: tạo thêm khu mới, kéo ZoneType + các object vào đây.
/// </summary>
public class ShopZone : MonoBehaviour
{
    [Header("Khu vực")]
    [SerializeField] private ZoneType zoneType = ZoneType.Gaming;

    [Header("Bật khi khu được mở khóa")]
    [SerializeField] private GameObject[] enableWhenUnlocked;

    [Header("Hiển thị khi còn khóa (rào chắn, biển 'Sắp khai trương'...)")]
    [SerializeField] private GameObject[] showWhileLocked;

    [Header("Điểm xuất hiện của máy thêm (nếu khu có extraStations)")]
    [SerializeField] private Transform[] extraStationSlots;

    public ZoneType Type => zoneType;
    public Transform[] ExtraStationSlots => extraStationSlots;

    private void Start()
    {
        if (ZoneManager.Instance != null)
        {
            ZoneManager.Instance.OnZoneUnlocked += HandleZoneUnlocked;
            Apply(ZoneManager.Instance.IsUnlocked(zoneType));
        }
    }

    private void OnDestroy()
    {
        if (ZoneManager.Instance != null) ZoneManager.Instance.OnZoneUnlocked -= HandleZoneUnlocked;
    }

    private void HandleZoneUnlocked(ZoneType type)
    {
        if (type == zoneType) Apply(true);
    }

    private void Apply(bool isUnlocked)
    {
        foreach (var go in enableWhenUnlocked) if (go != null) go.SetActive(isUnlocked);
        foreach (var go in showWhileLocked) if (go != null) go.SetActive(!isUnlocked);
    }
}
