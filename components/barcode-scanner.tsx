'use client'

import { Banner, Button, TextField } from '@xco-agency/corex-ui'
import { Camera, CameraOff, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n'

/**
 * Camera barcode / QR scanner (ZXing) with a manual-entry fallback, so USB/Bluetooth scanners (keyboard wedge) work too.
 * `onScan` is called once per distinct code in a short window.
 */
export function BarcodeScanner({ onScan, autoStart = false }: { onScan: (code: string) => void; autoStart?: boolean }) {
  const t = useT()
  const video = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const last = useRef<{ code: string; at: number } | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  const emit = useCallback((code: string) => {
    const now = Date.now()
    if (last.current && last.current.code === code && now - last.current.at < 2000) return
    last.current = { code, at: now }
    if ('vibrate' in navigator) navigator.vibrate?.(60)
    onScan(code)
  }, [onScan])

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setActive(false)
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video.current ?? undefined, (result) => {
        if (result) emit(result.getText())
      })
      stopRef.current = () => controls.stop()
      setActive(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Caméra indisponible.')
      setActive(false)
    }
  }, [emit])

  useEffect(() => {
    if (autoStart) queueMicrotask(() => void start())
    return () => stopRef.current?.()
  }, [autoStart, start])

  return (
    <div className="space-y-3">
      {error && <Banner tone="warning">{t('Caméra indisponible')} : {error}</Banner>}
      <div className="relative overflow-hidden rounded-xl border bg-black">
        <video ref={video} className="aspect-video w-full object-cover" muted playsInline />
        {!active && <div className="absolute inset-0 grid place-items-center text-sm text-white/70"><ScanLine className="size-10" /></div>}
      </div>
      <div className="flex gap-2">
        {active
          ? <Button variant="secondary" onClick={stop}><span className="inline-flex items-center gap-1.5"><CameraOff className="size-4" /> {t('Arrêter la caméra')}</span></Button>
          : <Button variant="primary" onClick={start}><span className="inline-flex items-center gap-1.5"><Camera className="size-4" /> {t('Activer la caméra')}</span></Button>}
      </div>
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { emit(manual.trim()); setManual('') } }}>
        <div className="flex-1"><TextField label={t('Saisie manuelle / douchette')} value={manual} onChange={setManual} autoComplete="off" /></div>
        <Button variant="secondary" submit disabled={!manual.trim()}>{t('Valider')}</Button>
      </form>
    </div>
  )
}
