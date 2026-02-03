<script>
  import { getContext } from "svelte"

  export let text
  export let onUpload

  const { styleable } = getContext("sdk")
  const component = getContext("component")

  let isDragging = false
  let droppedFile = null
  let fileData = null

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

  const handleUploadClick = () => {
    if (onUpload && fileData) {
      onUpload({ file: fileData })
    }
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
    <p>{text || "Drag & Drop file here"}</p>
  {/if}
</div>

<button on:click={handleUploadClick} disabled={!fileData} style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">
  Upload
</button>
