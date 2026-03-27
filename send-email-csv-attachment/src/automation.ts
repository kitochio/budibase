import { AutomationStepInputBase } from "@budibase/types"

export default async function run({
  inputs,
}: AutomationStepInputBase & { inputs: Record<string, any> }) {
  try {
    const { apiToken, from, to, subject, bodyText, csvData } = inputs

    const formData = new FormData()

    // 1. 成功した形式（toを文字列）でペイロードを作成
    const dataPayload = {
      from: { email: from },
      to: to, // ★ここを [ {email: to} ] にせず、そのまま文字列にする
      subject: subject || "CSV Report",
      text_part: bodyText || " "
    }

    // 2. dataパートをBlobとして追加（ファイル名は指定しないのが無難）
    const dataBlob = new Blob([JSON.stringify(dataPayload)], { type: 'application/json' });
    formData.append("data", dataBlob);

    // 3. 添付ファイルを追加
    if (csvData) {
      // csvDataが文字列の場合はBlobに変換
      const csvBlob = new Blob([csvData], { type: 'text/csv' });
      formData.append("file", csvBlob, "data.csv");
    }

    const response = await fetch("https://app.engn.jp/api/v1/deliveries/transaction", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`
        // Content-Typeは指定せず、fetchに任せる
      },
      body: formData
    })

    const responseText = await response.text()
    let result: Record<string, any> = {}
    try {
      result = JSON.parse(responseText)
    } catch {
      // JSONでない場合はそのままtextを返す
    }

    if (!response.ok) {
      return {
        success: false,
        message: `API error: ${response.status}`,
        responseText,
        details: result
      }
    }

    return {
      success: true,
      delivery_id: result.delivery_id
    }

  } catch (error: any) {
    return {
      success: false,
      message: error.message
    }
  }
}