<script>
  import { getContext } from "svelte"

  export let mappingJson = ""
  export let onImport // settingsで定義したイベントはプロパティとして関数が渡されます

  const { styleable } = getContext("sdk")
  const component = getContext("component")

  let isDragging = false
  let jsonResult = ""
  let useShiftJIS = false

  // ヘッダー変換用マッピング定義
  let headerMapping = {}

  // デフォルトのマッピング定義（設定が空の場合に使用）
  const defaultMapping = {
    "ステータス": "status",
    "#通番": "serial_number",
    "顧客名": "customer_name",
    "サブスク事業者": "subscription_company_key",
    "月額料金（税抜き）": "monthly_fee",
    "譲渡月数": "transfer_months",
    "契約/申込書": "contract_and_application_form",
    "初期費用": "Initial_cost",
    "申込日": "application_date",
    "サービス/課金開始日": "service_and_billing_start_date",
    "譲渡申込期日": "transfer_application_deadline",
    "譲渡実行日": "transfer_execution_date",
    "失注理由": "reason_for_loss_order",
    "説明": "explanation"
  }

  // 設定値(mappingJson)が変更されたら自動的にオブジェクトに変換する
  $: {
    try {
      headerMapping = mappingJson ? JSON.parse(mappingJson) : defaultMapping
    } catch (e) {
      console.error("マッピングJSONのパースに失敗しました", e)
      headerMapping = defaultMapping
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    isDragging = true
  }

  const handleDragLeave = () => {
    isDragging = false
  }

  const handleDrop = (e) => {
    e.preventDefault()
    isDragging = false

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      // CSVファイルかどうかの簡易チェック
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const text = event.target.result
          jsonResult = csvToJson(text)
        }
        reader.readAsText(file, useShiftJIS ? "Shift-JIS" : "UTF-8")
      } else {
        alert("CSVファイルをドロップしてください")
      }
    }
  }

  // 簡易的なCSVパーサー
  const csvToJson = (csv) => {
    const lines = csv.trim().split(/\r?\n/)
    if (lines.length < 2) return "[]"

    // 1行目を読み込み、マッピング定義に従ってキーを変換する
    const rawHeaders = parseCSVLine(lines[0])
    const headers = rawHeaders.map(header => headerMapping[header] || null)

    const result = lines.slice(1).map((line) => {
      if (!line.trim()) return null
      const values = parseCSVLine(line)
      const obj = {}
      headers.forEach((header, i) => {
        if (header) {
          obj[header] = values[i] || ""
        }
      })
      return obj
    }).filter(Boolean)
    return JSON.stringify(result, null, 2)
  }

  // Excel等のダブルクォート囲みに対応した行パーサー
  const parseCSVLine = (text) => {
    const result = []
    let startValueIndex = 0
    let inQuotes = false
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(unescapeCSVValue(text.substring(startValueIndex, i)))
        startValueIndex = i + 1
      }
    }
    result.push(unescapeCSVValue(text.substring(startValueIndex)))
    return result
  }

  const unescapeCSVValue = (val) => {
    let v = val.trim()
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1).replace(/""/g, '"')
    }
    return v
  }

  const handleImport = () => {
    // プロパティとして渡された関数を実行する
    if (onImport) {
      onImport({ json: jsonResult })
    }
  }
</script>

<div use:styleable={$component.styles}>
  <div style="margin-bottom: 10px;">
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
      <input type="checkbox" bind:checked={useShiftJIS} />
      <span style="font-size: 14px; color: #333;">日本語Excel (Shift-JIS) として読み込む</span>
    </label>
  </div>

  <div
    role="region"
    aria-label="CSV Drop Zone"
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    style="
      border: 2px dashed {isDragging ? '#2D7FF9' : '#ccc'};
      padding: 20px;
      text-align: center;
      background: {isDragging ? '#eef4ff' : 'transparent'};
      border-radius: 8px;
      transition: all 0.2s;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    "
  >
    {#if jsonResult}
      <div style="width: 100%; text-align: left; max-height: 300px; overflow: auto; background: #f5f5f5; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
        <pre style="margin: 0; font-size: 12px;">{jsonResult}</pre>
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button 
          on:click={() => (jsonResult = "")} 
          style="padding: 8px 16px; cursor: pointer; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;"
        >
          クリア
        </button>
        <button 
          on:click={handleImport} 
          style="padding: 8px 16px; cursor: pointer; background: #2D7FF9; color: white; border: none; border-radius: 4px; font-weight: bold;"
        >
          インポート実行
        </button>
      </div>
    {:else}
      <p style="color: #666; pointer-events: none; margin: 0;">
        CSVファイルをここにドラッグ＆ドロップしてください
      </p>
    {/if}
  </div>
</div>
