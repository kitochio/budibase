// automation.ts
import { AutomationStepInputBase } from "@budibase/types"
import nodemailer from "nodemailer"
import iconv from "iconv-lite"

export default async function run({
  inputs,
}: AutomationStepInputBase & { inputs: Record<string, any> }) {
  try {
    // 入力値の取得
    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      from,
      to,
      subject,
      bodyText,
      csvData,
    } = inputs

    // nodemailerでトランスポーターを作成
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false, // SSL/TLSの場合や465番ポートならtrue
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // 証明書検証を無視する
        rejectUnauthorized: false,
      },
    })

    // メール送信設定
    const mailOptions = {
      from,
      to,       // カンマ区切りで複数メールアドレス可
      subject,
      text: bodyText || "",
      attachments: [
        {
          filename: "data.csv",
          content: csvData,
          contentType: "text/csv" // MIMEタイプ
        },
      ],
    }

    // メール送信
    const info = await transporter.sendMail(mailOptions)
    const message = `Email sent successfully to: ${to}`

    console.log(message)
    console.log("nodemailer info:", info)

    // Automationの戻り値
    return {
      success: true,
      message,
      info,
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
      return {
        success: false,
        message: error.message
      }
    } else {
      console.error(error)
      return {
        success: false,
        message: String(error)
      }
    }
  }
}
