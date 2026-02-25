<script>
  import { getContext } from "svelte"

  // Budibase から渡されるJSON文字列
  export let text

  // Budibase固有の context
  const { styleable } = getContext("sdk")
  const component = getContext("component")

  /**
   * CSV文字列を生成する関数の例
   * 必要に応じて列の並びやタイトルを変更してください
   */
  function toCSV(dataArray) {
    // ヘッダー
    const header = [
      `"ステータス"`,
      `"納入企業名"`,
      `"請求金額"`,
      `"申請件数"`,
      `"申請金額"`,
      `"振込件数"`,
      `"振込金額"`,
      `"未振込金額"`,
      `"請求名称"`,
      `"銀行番号"`,
      `"支店番号"`,
      `"預金種目"`,
      `"口座番号"`,
      `"口座名義"`
    ].join(",")

    // 明細行
    const rows = dataArray.map(row => {
      return [
        `"${row.Status || ""}"`,
        `"${row.VendorCompanyName || ""}"`,
        `${row.ChargeAmount ?? 0}`,
        `${row.AcceptedDebt ?? 0}`,
        `${row.TotalApplicationAmount ?? 0}`,
        `${row.TransferredDebt ?? 0}`,
        `${row.TotalAmountTransferred ?? 0}`,
        `${row.RemainingAmount ?? 0}`,
        `"${row.BillingName || ""}"`,
        `"${row.BankNumber || ""}"`,
        `"${row.BranchNumber || ""}"`,
        `"${row.AccountTypeCode || ""}"`,
        `"${row.AccountNumber || ""}"`,
        `"${row.AccountHolderName_kana || ""}"`
      ].join(",")
    })

    // ヘッダー + 明細行を結合
    return [header, ...rows].join("\n")
  }

  /**
   * ボタンクリック時のハンドラ:
   * text を JSON.parse() してCSVをダウンロード
   */
  function downloadCsv() {
    // text が空や null の場合
    if (!text || text.trim().length === 0) {
      alert("データがありません")
      return
    }
    let dataArray = []
    try {
      // text が JSON文字列として渡されていることを想定
      dataArray = JSON.parse(text)
    } catch (error) {
      console.error("JSON parse error:", error)
      alert("JSON解析時にエラーが発生しました。")
      return
    }

    // データが空の場合
    if (!dataArray || !dataArray.length) {
      alert("ダウンロードするデータがありません")
      return
    }

    // CSV文字列生成
    const csvContent = toCSV(dataArray)

    // Blob作成 (文字化けを防ぐために charset=utf-8 を付与)
    // 必要に応じて BOM をつける場合は "\uFEFF" + csvContent とすることも
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" })

    // ダウンロード用URL生成
    const url = URL.createObjectURL(blob)
    
    // aタグを動的に作ってクリック
    const a = document.createElement("a")
    a.href = url
    a.download = "data.csv" // ファイル名
    document.body.appendChild(a)
    a.click()

    // 後始末
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
</script>

<!-- Budibase のコンポーネントスタイル適用 -->
<div use:styleable={$component.styles}>
  <!-- ボタンクリックでCSVを作成・ダウンロード -->
  <button 
    on:click={downloadCsv}
    style="
      background-color: #007bff;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    "
  >
    CSVをダウンロード
  </button>
</div>
