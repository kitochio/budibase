<script>
  import { getContext } from "svelte"

  export let onUpload
  export let triggerText

  const { styleable } = getContext("sdk")
  const component = getContext("component")

  let isDragging = false
  let droppedFile = null
  let fileData = null
  let previousTriggerText = ""
  let fileInput
  let errorMessage = ""
  const MAX_SIZE_MB = 5 // 制限サイズ (MB)

  const onDragOver = (e) => {
    e.preventDefault()
    isDragging = true
  }

  const onDragLeave = () => {
    isDragging = false
  }

  const onDrop = (e) => {
    e.preventDefault()
    isDragging = false
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = (file) => {
    errorMessage = ""
    // サイズチェック (バイト単位)
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      errorMessage = `ファイルサイズは${MAX_SIZE_MB}MB以下にしてください。`
      droppedFile = null
      fileData = null
      return
    }
    droppedFile = file
    prepareFileForApi(file)
  }

  const onClick = () => {
    fileInput.click()
  }

  const prepareFileForApi = (file) => {
    // ファイルをJSONで扱えるBase64形式に変換
    const reader = new FileReader()
    reader.onload = (e) => {
      fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        base64: e.target.result
      }
      console.log("File ready for JSON API:", fileData)
    }
    reader.readAsDataURL(file)
  }

  $: {
    if (triggerText === "run" && previousTriggerText !== "run" && fileData && onUpload) {
      onUpload({ file: fileData })
    }
    previousTriggerText = triggerText
  }
</script>

<div use:styleable={$component.styles}>
  <input type="file" bind:this={fileInput} on:change={onFileSelect} style="display: none;" />
  <div
    role="button"
    aria-label="File upload drop zone"
    on:dragover={onDragOver}
    on:dragleave={onDragLeave}
    on:drop={onDrop}
    on:click={onClick}
    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
    tabindex="0"
    style="border: 2px dashed {isDragging ? '#1a73e8' : '#888'}; background-color: {isDragging ? '#f0f8ff' : '#fafafa'}; border-radius: 8px; padding: 32px; text-align: center; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;"
  >
    {#if droppedFile}
      <p>準備完了: <strong>{droppedFile.name}</strong></p>
    {:else}
      <p style="margin: 0; color: #666; font-weight: 500;">クリックまたはファイルをドラッグ＆ドロップしてください</p>
    {/if}
    {#if errorMessage}
      <p style="margin: 8px 0 0 0; color: #d32f2f; font-size: 0.9em;">{errorMessage}</p>
    {/if}
  </div>
</div>
