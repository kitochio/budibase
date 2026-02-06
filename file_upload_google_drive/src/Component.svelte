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
      droppedFile = e.dataTransfer.files[0]
      prepareFileForApi(droppedFile)
    }
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

<div
  role="region"
  aria-label="File upload drop zone"
  use:styleable={$component.styles}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  style="border: 2px dashed {isDragging ? '#1a73e8' : '#ccc'}; padding: 20px; text-align: center; transition: border 0.2s;"
>
  {#if droppedFile}
    <p>File ready: <strong>{droppedFile.name}</strong></p>
  {:else}
    <p>Drag & Drop file here</p>
  {/if}
</div>
