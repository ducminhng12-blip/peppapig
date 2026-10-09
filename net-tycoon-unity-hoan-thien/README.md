<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/10c6d5c9-b60c-4932-b0ca-38876b0fb6b1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Hệ thống Tycoon (bản hoàn thiện)

Đã bổ sung đầy đủ: đồ ăn & nước uống, kho, khu vực, mặt bằng, nhân viên, đối thủ, Cyber Gaming, chi nhánh và game loop hoàn chỉnh.

| Thành phần | File web (mô phỏng) | File Unity C# |
|---|---|---|
| Dữ liệu cân bằng | `src/game/tycoonData.ts` | `src/data/unity/GameData.cs` (tự sinh) |
| Engine kinh tế | `src/game/tycoonEngine.ts` | `GameLoopManager.cs`, `InventoryManager.cs`, `ZoneManager.cs`, `LocationManager.cs`, `StaffManager.cs`, `CompetitorManager.cs`, `BranchManager.cs` |
| Khách gọi đồ | `ThreeSimulator.tsx` (handleCustomerOrder) | `FoodOrderSystem.cs` |
| Bảng quản lý | `src/components/ManagementPanel.tsx`, `FloorPlan.tsx` | — |

- Sinh lại `GameData.cs` sau khi sửa số liệu: `npx tsx tools/genUnity.ts`
- Game tự lưu vào localStorage (key `nettycoon.save.v2`), nút "Chơi lại từ đầu" trong tab Tổng quan.
- Thêm sản phẩm / khu / mặt bằng mới: thêm 1 phần tử vào mảng tương ứng trong `tycoonData.ts` rồi chạy lại lệnh sinh C#.
