# 設定機能

## 概要

`SettingsContext`（`src/contexts/SettingsContext.tsx`）が全ユーザ設定を管理する。localStorage の `app_settings` キーに JSON で永続化。

---

## 設定項目

| フィールド | 型 | デフォルト | 説明 |
|---|---|---|---|
| `defaultPosterName` | `string` | `""` | 書き込みフォームのデフォルト投稿者名 |
| `defaultPosterSubInfo` | `string` | `""` | デフォルトメール欄（sage など） |
| `historyMaxCount` | `number` | `1000` | 閲覧履歴の最大保存件数 |
| `gestureSensitivity` | `"strong" \| "medium" \| "weak"` | `"medium"` | スワイプジェスチャー感度 |
| `ng.id` | `string` | `""` | NG ID（改行区切り） |
| `ng.name` | `string` | `""` | NG 名前（改行区切り） |
| `ng.body` | `string` | `""` | NG 本文（改行区切り、正規表現） |
| `ng.title` | `string` | `""` | NG スレタイ（改行区切り、正規表現） |

---

## useSettings フック

```typescript
const {
  defaultPosterName, setDefaultPosterName,
  defaultPosterSubInfo, setDefaultPosterSubInfo,
  historyMaxCount, setHistoryMaxCount,
  gestureSensitivity, setGestureSensitivity,
  ng, updateNG,
} = useSettings();
```

---

## 設定画面（/settings）

`src/pages/SettingsPage.tsx` が設定 UI を提供する。

### セクション構成

1. **ユーザ情報**（ログイン時のみ）: プロフィール編集・パスワード変更
2. **テーマ**: light / light-gray / dark / gray / system
3. **ジェスチャー感度**: 強 / 中 / 弱
4. **書き込みデフォルト設定**: 投稿者名・メール欄
5. **閲覧履歴**: 最大保存件数
6. **NGワード設定**: ID・名前・本文・スレタイ
7. **Turnstile トークン**: 手動設定・自動取得リンク
