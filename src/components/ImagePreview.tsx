import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function ImagePreview({
  src,
  file,
  alt,
  onRemove,
  disabled = false,
}: {
  src?: string
  file?: File
  alt: string
  onRemove: () => void
  disabled?: boolean
}) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex h-36 items-center justify-center bg-paper/50 p-3">
        <img src={preview || src} alt={alt} className="h-full max-w-full object-contain" />
      </div>
      <button
        type="button"
        aria-label={`Hapus ${alt}`}
        disabled={disabled}
        onClick={onRemove}
        className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-line px-3 py-2 text-xs font-bold text-danger hover:bg-danger/5 disabled:opacity-50"
      >
        <Trash2 size={15} />
        Hapus gambar
      </button>
    </div>
  )
}
