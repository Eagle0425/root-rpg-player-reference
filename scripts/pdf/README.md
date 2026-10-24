# PDF 產製來源

這三個版型自既有已驗證的產製工具保存，從工作區根目錄執行。玩家規則與角色資料讀取 `website/root-rpg-player-reference/scripts/reference.json`，不再獨立維護另一份動作正文。

- `build-reference.py`：十頁 A4 核心速查。範例裝備刻意選錄六件以保留既有頁數，完整 17 件核心及 29 件擴充範例在網站查閱。GM 簡表與名字清單仍使用工作區舊版型的選錄資料；屬速查摘要，不是 GM 全文譯本。
- `build-playbooks.py`：十九種角色、各兩頁的列印卡。
- `build-fillable.py`：沿用相同版型建立可輸入文字與勾選的表單。

執行前需要工作區原有字型（`翻譯/字體/JasonHandWritingFonts`）、角色圖與版型附屬資料，及 ReportLab、Pillow、pypdf。它們不會在網站部署時執行。先在工作區保存舊版，再產製到 `output/pdf/`，完成文字、溢出與圖像檢查後才更新 `site/downloads/`。

可填寫卡的驗證必須同時檢查 AcroForm 欄位樹與各頁 Widget；只看畫面有核取方塊，不代表可以填寫。2026-10-24 檢查：合訂版與十九份分冊各自均無游離欄位，合訂版 4,385 欄位與 Widget 相符；原始欄位資料沒有變更。

舊的 `tmp/` 產物屬工作快照。更改規則應先修唯一正文，再重新生成，不以舊快照覆寫正文。
