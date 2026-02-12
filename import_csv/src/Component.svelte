<script>
  import { getContext } from "svelte"
  import { defaultMapping, parseCsv, checkDuplicates, validateData } from "./utils.js"

  export let mappingJson = ""
  export let tableId = ""
  export let onImport // settingsで定義したイベントはプロパティとして関数が渡されます

  const { styleable, API } = getContext("sdk")
  const component = getContext("component")

  let isDragging = false
  let jsonResult = ""
  let useShiftJIS = true
  let validationWarning = ""
  let isChecking = false
  let previewData = []
  let fileInput

  // ヘッダー変換用マッピング定義
  let headerMapping = {}

  // 設定値(mappingJson)を初回のみオブジェクトに変換する
  try {
    headerMapping = mappingJson ? JSON.parse(mappingJson) : defaultMapping
  } catch (e) {
    console.error("マッピングJSONのパースに失敗しました", e)
    headerMapping = defaultMapping
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    isDragging = true
  }

  const handleDragLeave = () => {
    isDragging = false
  }

  const loadFile = (file) => {
    // CSVファイルかどうかの簡易チェック
    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target.result
        try {
          isChecking = true
          let data = parseCsv(text, headerMapping)
          
          // 重複チェック実行
          data = await checkDuplicates(data, tableId, API)

          // 表示用にキーを元のヘッダー名に戻すためのマッピングを作成
          const reverseMapping = Object.entries(headerMapping).reduce((acc, [key, value]) => {
            acc[value] = key
            return acc
          }, {})

          const validatedData = validateData(data, reverseMapping)

          const displayData = validatedData.map(row => {
            const newRow = {}
            Object.keys(row).forEach(key => {
              const originalKey = reverseMapping[key] || key
              newRow[originalKey] = row[key]
            })
            return newRow
          })

          previewData = displayData
          jsonResult = JSON.stringify(validatedData, null, 2)

          const errorCount = validatedData.filter(row => row.validation_result && row.validation_result !== "OK").length
          if (errorCount > 0) {
            validationWarning = `${errorCount}件のデータが取込対象外です。赤くなった行のバリデーション結果を確認してください。`
          }
        } catch (e) {
          alert(e.message)
          jsonResult = ""
          previewData = []
          validationWarning = ""
        } finally {
          isChecking = false
        }
      }
      reader.readAsText(file, useShiftJIS ? "Shift-JIS" : "UTF-8")
    } else {
      alert("CSVファイルを選択してください")
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    isDragging = false

    const files = e.dataTransfer.files
    if (files.length > 0) {
      loadFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      loadFile(files[0])
    }
    e.target.value = ""
  }

  const handleImport = () => {
    const hasErrors = previewData.some(row => row.validation_result && row.validation_result !== "OK")
    if (hasErrors) {
      if (!confirm("取込対象外のデータがあります、取込対象外のデータは取り込まれませんがインポートを実行しますか？")) {
        return
      }
    }

    // プロパティとして渡された関数を実行する
    if (onImport) {
      onImport({ json: jsonResult })
    }
  }
</script>

<div use:styleable={$component.styles}>
  {#if isChecking || !jsonResult}
  <div style="margin-bottom: 10px;">
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
      <input type="checkbox" bind:checked={useShiftJIS} />
      <span style="font-size: 14px; color: #333;">日本語Excel (Shift-JIS) として読み込む</span>
    </label>
  </div>
  {/if}

  <input
    type="file"
    accept=".csv"
    style="display: none;"
    bind:this={fileInput}
    on:change={handleFileSelect}
  />

  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div
    role="region"
    aria-label="CSV Drop Zone"
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    on:click={() => !jsonResult && !isChecking && fileInput.click()}
    on:keydown={(e) => !jsonResult && !isChecking && (e.key === 'Enter' || e.key === ' ') && fileInput.click()}
    tabindex={!jsonResult && !isChecking ? 0 : -1}
    style="
      border: {!isChecking && jsonResult ? 'none' : `2px dashed ${isDragging ? '#2D7FF9' : '#ccc'}`};
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
      cursor: {!isChecking && !jsonResult ? 'pointer' : 'default'};
    "
  >
    {#if isChecking}
      <p style="color: #666; margin: 0;">
        データをチェック中...
      </p>
    {:else if jsonResult}
      {#if validationWarning}
        <div style="width: 100%; text-align: left; background: #fff1f0; border: 1px solid #ffccc7; padding: 10px; border-radius: 4px; margin-bottom: 10px; color: #333;">
          ⚠️ {validationWarning}
        </div>
      {/if}

      <div style="width: 100%; text-align: left; max-height: 300px; overflow: auto; background: #fff; border: 1px solid #eee; border-radius: 4px; margin-bottom: 10px;">
        {#if previewData.length > 0}
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead style="position: sticky; top: 0; background: #f5f5f5; z-index: 1;">
              <tr>
                {#each Object.keys(previewData[0]) as header}
                  <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: left; white-space: nowrap;">{header === 'validation_result' ? 'バリデーション結果' : header}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each previewData as row}
                <tr style="border-bottom: 1px solid #eee; background-color: {row.validation_result && row.validation_result !== 'OK' ? '#fff1f0' : 'transparent'};">
                  {#each Object.keys(previewData[0]) as key}
                    <td style="padding: 8px; white-space: nowrap;">{row[key]}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <pre style="margin: 0; font-size: 12px; padding: 10px;">{jsonResult}</pre>
        {/if}
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button 
          on:click|stopPropagation={() => { jsonResult = ""; previewData = []; validationWarning = ""; }} 
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
        CSVファイルをドラッグ＆ドロップ、またはクリックして選択してください
      </p>
    {/if}
  </div>
</div>
