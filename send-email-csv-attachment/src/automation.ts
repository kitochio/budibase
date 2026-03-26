import { AutomationStepInputBase } from "@budibase/types"

export default async function run({
  inputs,
}: AutomationStepInputBase & { inputs: Record<string, any> }) {
  try {
    // 入力値の取得（不要になったSMTP設定の代わりにAPI Tokenを取得）
    const {
      apiToken,     // blastengineのAPIキー
      from,
      to,
      subject,
      bodyText,
      csvData,
    } = inputs

    // 必須項目のバリデーション
    if (!apiToken || !from || !to || !csvData) {
      throw new Error(
        "Missing required inputs: apiToken, from, to, and csvData are required."
      )
    }
    // 1. FormDataの作成（multipart/form-data形式）
    // Node.js環境（Budibase Automation）では標準のFormDataが利用可能です
    const formData = new FormData()
    formData.append("from", from)
    formData.append("to", to)
    formData.append("subject", subject)
    formData.append("text_part", bodyText || "")

    // 2. CSV文字列をファイル（Blob）として追加
    // Node.jsのBlobを利用して、ファイル名「data.csv」を指定します
    const csvBlob = new Blob([csvData], { type: 'text/csv' })
    formData.append("attachments", csvBlob, "data.csv")

    // 3. blastengine APIへリクエスト送信
    const url = "https://ap.blastengine.jp/v1/deliveries/transaction"
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        // Content-Typeは設定しないでください。FormDataを渡すと自動で設定されます。
      },
      body: formData
    })

    const result = await response.json() as Record<string, any>

    if (!response.ok) {
      throw new Error(`blastengine error: ${JSON.stringify(result)}`)
    }

    const message = `Email sent successfully via API to: ${to}`
    console.log(message, result)

    return {
      success: true,
      message,
      delivery_id: result.delivery_id // blastengineが返すID
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(errorMessage)
    return {
      success: false,
      message: errorMessage
    }
  }
}