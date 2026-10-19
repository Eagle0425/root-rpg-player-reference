# 茂林旅人 · Root RPG 玩家手冊

供手機與桌上遊戲查閱的繁體中文靜態網站。

預定網址：**https://eagle0425.github.io/root-rpg-player-reference/**

## 內容

- 9 個基本動作、13 個武器動作、2 個旅行動作、6 個名聲動作。
- 9 項遊俠專長與 8 種風險。
- 45 個裝備標籤（35 正面、10 負面）及 6 件範例裝備。
- 19 種角色、起始技能、天性、動機與角色專屬動作。
- 12 步創角、成長與聚會流程、104 個中英名字、6 種關係。
- GM 目標、原則與動作，以及 NPC／傷害附錄。
- 玩家參考 PDF、列印角色卡、可填寫角色卡。

支援中英全文搜尋、效果關鍵字搜尋、裝備正負面分類、條目永久連結與瀏覽器本機收藏。無登入、無追蹤、無外部字體服務。

## 維護資料

網站直接發布 `site/`，不需安裝套件或建置。

1. 修改 `scripts/reference.json` 中對應的條目。
2. 在儲存庫目錄執行 `node scripts/sync-data.mjs`，同步 `site/data.js`。
3. 執行 `node scripts/validate.mjs` 檢查資料與下載檔案。
4. 推送至 `main`，GitHub Actions 自動更新網站。

PDF 是獨立排版的發行檔，**不會因修改網站資料而自動重新排版**。有規則修訂時，須更新 PDF 後替換 `site/downloads/` 中對應檔案。網頁與 PDF 的當前整理來源均保存在工作區。

## GitHub Pages 設定

本儲存庫包含 `.github/workflows/pages.yml`。首次部署需在 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**，然後執行 **Actions → Publish player reference → Run workflow**，或推送一次變更。

使用 GitHub Free 時，採用公開儲存庫。所有網站資源使用相對路徑，可在 `/root-rpg-player-reference/` 下正常運作；路由使用網址片段，不需伺服器重寫。

## 本機預覽

在儲存庫目錄執行：

```text
python -m http.server 8765 --directory site
```

開啟 `http://localhost:8765/`。不連網也能查閱已下載的網站檔案；PDF 下載不會在首頁自動載入。

## 權利與來源

Root 與角色原繪 © Leder Games；遊戲文字與設計 © Magpie Games；原繪 Kyle Ferrin。既有中文翻譯參考 Mori、空空、阿羊，以及 [茂林源記：中文網站](https://ps-cheng.github.io/root-rpg-zh/)。

本資料庫為非官方繁體中文參考整理，不代表官方授權譯本。原作文字、圖像及商標的權利屬各權利人所有；本儲存庫未將其宣告為開源授權。中文音譯僅為參考。

收藏只儲存在使用者瀏覽器的 `localStorage`，不會上傳至 GitHub 或其他伺服器。
