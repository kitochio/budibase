// デフォルトのマッピング定義
export const defaultMapping = {
  "ステータス": "status",
  "#通番": "serial_number",
  "顧客名": "customer_name",
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

// 簡易的なCSVパーサー
export const parseCsv = (csv, headerMapping) => {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // 1行目を読み込み、マッピング定義に従ってキーを変換する
  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(header => headerMapping[header] || null)

  if (headers.every(h => !h)) {
    throw new Error("有効なヘッダーが見つかりませんでした。CSVのヘッダー名、または「日本語Excel (Shift-JIS) として読み込む」のチェックボックスを確認してください。")
  }

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
  return result
}

// データベースとの重複チェック
export const checkDuplicates = async (data, tableId, API) => {
  if (!tableId || !API) return data

  // 各行についてデータベースを検索
  const checkedData = await Promise.all(data.map(async (row) => {
    if (row.serial_number) {
      try {
        const response = await API.searchTable(tableId, {
          query: {
            equal: { "serial_number": row.serial_number }
          },
          limit: 1
        })
        const rows = response.rows || []
        if (rows.length > 0) {
          row._is_duplicate = true
        }
      } catch (e) {
        console.error("Duplicate check failed for row:", row, e)
      }
    }
    return row
  }))
  return checkedData
}

// バリデーション設定（ルール変更時はここを修正）
const VALIDATION_CONFIG = {
  dateFields: ["application_date", "service_and_billing_start_date", "transfer_application_deadline"],
  pastLimitMonths: 3,
  transferOffsetMonths: 2
}

// 個別のチェック処理：日付フィールド
const checkDateFields = (row, getLabel, now, pastLimit) => {
  const errors = []
  VALIDATION_CONFIG.dateFields.forEach(field => {
    if (row[field]) {
      const d = new Date(row[field])
      const label = getLabel(field)
      if (isNaN(d.getTime())) {
        errors.push(`${label}: 日付不正`)
      } else if (d < pastLimit) {
        errors.push(`${label}: ${VALIDATION_CONFIG.pastLimitMonths}ヶ月以前`)
      } else if (d > now) {
        errors.push(`${label}: 未来日付`)
      }
    }
  })
  return errors
}

// 個別のチェック処理：譲渡日とサービス開始日の相関
const checkTransferCorrelation = (row, getLabel) => {
  const errors = []
  if (row.transfer_execution_date && row.service_and_billing_start_date) {
    const transferDate = new Date(row.transfer_execution_date)
    const serviceDate = new Date(row.service_and_billing_start_date)

    if (!isNaN(transferDate.getTime()) && !isNaN(serviceDate.getTime())) {
      const minTransferDate = new Date(serviceDate)
      minTransferDate.setMonth(minTransferDate.getMonth() + VALIDATION_CONFIG.transferOffsetMonths)

      if (transferDate < minTransferDate) {
        const labelTransfer = getLabel("transfer_execution_date")
        const labelService = getLabel("service_and_billing_start_date")
        errors.push(`${labelTransfer}: ${labelService}の${VALIDATION_CONFIG.transferOffsetMonths}ヶ月後以降`)
      }
    }
  }
  return errors
}

// バリデーション処理
export const validateData = (data, labelMap = {}) => {
  const now = new Date()
  const pastLimit = new Date()
  pastLimit.setMonth(now.getMonth() - VALIDATION_CONFIG.pastLimitMonths)
  
  const getLabel = (key) => labelMap[key] || key

  // ファイル内でのserial_number重複カウント
  const serialCounts = data.reduce((acc, row) => {
    if (row.serial_number) {
      acc[row.serial_number] = (acc[row.serial_number] || 0) + 1
    }
    return acc
  }, {})

  return data.map(originalRow => {
    // 副作用を避けるため、元のデータをコピーして使用する
    const row = { ...originalRow }
    const errors = []

    // 分割したチェック関数を呼び出す
    errors.push(...checkDateFields(row, getLabel, now, pastLimit))
    errors.push(...checkTransferCorrelation(row, getLabel))

    if (row.serial_number && serialCounts[row.serial_number] > 1) {
      errors.push(`${getLabel("serial_number")}: ファイル内で重複`)
    }

    if (row._is_duplicate) {
      errors.push(`${getLabel("serial_number")}: 登録済`)
      // エラーメッセージ生成後は不要なので削除（表示から消すため）
      delete row._is_duplicate
    }

    row.validation_result = errors.length > 0 ? errors.join(", ") : "OK"
    return row
  })
}