<script>
  import { getContext } from "svelte";

  // Budibase固有の context
  const { API, styleable } = getContext("sdk");
  const component = getContext("component")

  export let json;
  export let json2;
  export let exUser;

  /**
  * 処理完了フラグを更新する
  */
  async function addEmployee(dataArray2) {
    for (const row of dataArray2) {
      const targetId = row._id;
      try {
        const result = await API.saveRow({
          tableId: "ta_55973c2ba9164102b7e1cb9868de2750",
          _id: targetId,
          Status: "通常振込済",
          PaymentCompleted: "済",
          UpdatedBy: exUser
        });
        console.log("保存成功:", targetId, result);
      } catch (error) {
        console.error("保存エラー:", targetId, error);
      }
    }
  }

  function getJapanDateMMDD() {
    const now = new Date();

    // Intl.DateTimeFormatで月と日を直接JSTで取得
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "2-digit",
      day: "2-digit"
    });

    // "08/27" のような文字列になるので "/" を消す
    const [month, day] = formatter.format(now).split("/");

    return month + day;
  }

  function toCSV(dataArray, dataArray2) {
    const header = dataArray;
    const rowsDataCategory2 = dataArray2;
    const transferDate = getJapanDateMMDD();

    // 1行目の作成
    const line1 = [
      1,
      header.TypeCode,
      header.CodeDivision,
      "",
      header.TransferRequester,
      transferDate,
      header.SendingBankNumber,
      "",
      header.SendingBranchNumber,
      "",
      header.AccountType,
      header.AccountNumber
    ].join(",");

    // DataCategory=2 の行を生成する
    // 合計行作成用に「件数(count)」「合計金額(totalAmount)」をカウントしておく
    let countDataCategory2 = 0;
    let totalTransferAmount = 0;

    // DataCategory=2 行を全て処理して配列化
    const detailLines = rowsDataCategory2
      .map(r => {
        countDataCategory2++;
        totalTransferAmount += r.RemainingAmount;

        // AccountNumber を7桁ゼロ埋め
        const paddedAccountNumber = String(r.AccountNumber).padStart(7, "0");

        return [
          2,
          r.BankNumber,
          "",
          r.BranchNumber,
          "",
          "",
          r.AccountTypeCode,
          paddedAccountNumber,
          r.AccountHolderName_kana,
          r.RemainingAmount,
          0,
          r.InvoiceId,
          "",
          7,
          " ",
        ];
      });

    // データ区分８ (DataCategory=2 の合計行)
    // 形式: "8,件数,合計金額"
    const line8 = ["8", countDataCategory2, totalTransferAmount].join(",");

    // データ区分９
    const line9 = "9";

    // すべて改行でつなげて完成
    // 質問文の出力例に合わせて行ごとに改行する
    const outputLines = [
      line1,
      ...detailLines,
      line8,
      line9
    ];
    const output = outputLines.join("\n");

    return output;
  }

  /**
   * ボタンクリック時のハンドラ:
   * json を JSON.parse() してCSVをダウンロード
   */
  function downloadCsv() {
    // 確認ダイアログ
    if (!confirm("全銀データを出力し、ステータスを通常振込済にしますか？")) {
      return; // キャンセルされた場合は処理を中断
    }

    // 空や null の場合
    if (!json || json.trim().length === 0 || !json2 || json2.trim().length === 0) {
      alert("データがありません")
      return
    }
    let dataArray = []
    let dataArray2 = []
    try {
      // JSON文字列として渡されていることを想定
      dataArray = JSON.parse(json)
      dataArray2  = JSON.parse(json2)
    } catch (error) {
      console.error("JSON parse error:", error)
      alert("JSON解析時にエラーが発生しました。")
      return
    }

    // データが空の場合
    if (!dataArray || !dataArray2 || !dataArray2.length) {
      alert("ダウンロードするデータがありません")
      return
    }

    // CSV文字列生成
    const csvContent = toCSV(dataArray,dataArray2)

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

    addEmployee(dataArray2)
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
    全銀出力
  </button>
</div>
