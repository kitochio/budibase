<script>
  import { getContext } from "svelte"

  export let jsonData
  export let collectionDate
  export let onCalculated

  const { styleable } = getContext("sdk")
  const component = getContext("component")

  $: groups = (() => {
    if (!jsonData) return []
    let rows
    try {
      rows = JSON.parse(jsonData)
    } catch {
      return []
    }
    if (!Array.isArray(rows)) return []

    const map = new Map()
    for (const row of rows) {
      const key = `${row.transfer_execution_date}__${row.transfer_months}`
      if (!map.has(key)) {
        map.set(key, {
          transfer_execution_date: row.transfer_execution_date,
          transfer_months: row.transfer_months,
          collection_completion_month: row.collection_completion_month,
          count: 0,
          total_transfer_amount_tax_included: 0,
          total_monthly_fee_tax_included: 0,
        })
      }
      const g = map.get(key)
      g.count += 1
      g.total_transfer_amount_tax_included += row.transfer_amount_tax_included || 0
      g.total_monthly_fee_tax_included += row.monthly_fee_tax_included || 0
    }

    return [...map.values()].sort((a, b) => {
      const dateCompare = (a.transfer_execution_date || "").localeCompare(b.transfer_execution_date || "")
      if (dateCompare !== 0) return dateCompare
      return (a.transfer_months || 0) - (b.transfer_months || 0)
    })
  })()

  $: parseError = (() => {
    if (!jsonData) return null
    try {
      const parsed = JSON.parse(jsonData)
      if (!Array.isArray(parsed)) return "JSONが配列ではありません"
      return null
    } catch {
      return "JSONの解析に失敗しました"
    }
  })()

  // 参考コードと同じロジック：回収完了月と回収日から残り月数を計算し、
  // 何回目かを算出する
  function calcCurrentPayment(completionMonthStr, transferMonths, baseDateStr) {
    if (!baseDateStr || !completionMonthStr) return null

    const baseDate = new Date(baseDateStr)
    const limitDate = new Date(completionMonthStr)

    if (isNaN(baseDate) || isNaN(limitDate) || baseDate > limitDate) return null

    const yearsDiff = limitDate.getUTCFullYear() - baseDate.getUTCFullYear()
    const monthsDiff = limitDate.getUTCMonth() - baseDate.getUTCMonth()
    const remaining = yearsDiff * 12 + monthsDiff + 1
    const cappedRemaining = Math.min(remaining, transferMonths)

    const current = transferMonths - cappedRemaining + 1
    return Math.max(1, Math.min(current, transferMonths))
  }

  function formatMonths(g) {
    const current = calcCurrentPayment(g.collection_completion_month, g.transfer_months, collectionDate)
    if (current === null) return `${g.transfer_months}ヶ月`
    return `${current}/${g.transfer_months}ヶ月目`
  }

  function formatCurrency(amount) {
    return "¥" + amount.toLocaleString("ja-JP")
  }

  $: if (groups.length > 0 && onCalculated) {
    const summaryJson = JSON.stringify(
      groups.map(g => ({
        transfer_execution_date: g.transfer_execution_date,
        total_transfer_amount_tax_included: g.total_transfer_amount_tax_included,
        count: g.count,
        format_months: formatMonths(g),
        total_monthly_fee_tax_included: g.total_monthly_fee_tax_included,
      }))
    )
    onCalculated({ summaryJson })
  }
</script>

<div use:styleable={$component.styles}>
  {#if parseError}
    <p class="error">{parseError}</p>
  {:else if groups.length === 0}
    <p class="empty">データがありません</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>譲渡実行日</th>
          <th>月数</th>
          <th>件数</th>
          <th>譲渡金額合計（税込）</th>
          <th>今月の支払い合計額（税込）</th>
        </tr>
      </thead>
      <tbody>
        {#each groups as g}
          <tr>
            <td>{g.transfer_execution_date || "—"}</td>
            <td class="num">{formatMonths(g)}</td>
            <td class="num">{g.count}件</td>
            <td class="num">{formatCurrency(g.total_transfer_amount_tax_included)}</td>
            <td class="num">{formatCurrency(g.total_monthly_fee_tax_included)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  div {
    font-family: sans-serif;
    font-size: 14px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 8px 12px;
    border: 1px solid #ddd;
    white-space: nowrap;
  }

  th {
    background-color: #f0f4f8;
    font-weight: 600;
    text-align: center;
  }

  td.num {
    text-align: right;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  tr:hover {
    background-color: #eef4fb;
  }

  .error {
    color: #c0392b;
    font-weight: bold;
  }

  .empty {
    color: #888;
  }
</style>