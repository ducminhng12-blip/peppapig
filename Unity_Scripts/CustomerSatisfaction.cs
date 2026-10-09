using UnityEngine;

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
        return $"========================================\n" +
               $"[PHIẾU TRẢI NGHIỆM KHÁCH HÀNG: {customerName}]\n" +
               $"Điểm khởi điểm (Base):      {baseScore}\n" +
               $"Chất lượng máy tính:        +{(computerQualityScore >= 0 ? computerQualityScore.ToString() : computerQualityScore.ToString())}\n" +
               $"Giá thuê máy:               {(priceScore >= 0 ? "+" + priceScore : priceScore.ToString())}\n" +
               $"Thời gian chờ (Queue):      {waitTimePenalty}\n" +
               $"Mạng Internet:              +{(internetBonus >= 0 ? internetBonus.ToString() : internetBonus.ToString())}\n" +
               $"Điều hòa nhiệt độ:          {(acBonus >= 0 ? "+" + acBonus : acBonus.ToString())}\n" +
               $"Đồ ăn & Nước uống:          +{(foodBonus >= 0 ? foodBonus.ToString() : foodBonus.ToString())}\n" +
               $"----------------------------------------\n" +
               $"TỔNG ĐIỂM (FINAL):          {finalScore} / 100\n" +
               $"Trạng thái cảm xúc:         {GetEmoji()}\n" +
               $"Đánh giá:                   {GetReviewStars()} ⭐\n" +
               $"Tỷ lệ quay lại quán:        {GetReturnChancePercent()}%\n" +
               $"========================================";
    }
}