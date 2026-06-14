import { motion } from 'framer-motion'
import { Download, RefreshCw, RotateCw } from 'lucide-react'
import { useT } from '../lib/i18n'
import { useUpdates } from '../lib/useUpdates'

export function UpdatePanel(): JSX.Element {
  const t = useT()
  const { info, check, start } = useUpdates()

  const downloading = !!info?.downloading
  const downloaded = !!info?.downloaded
  const available = !!info?.available
  const speedMb = info ? (info.bytesPerSecond / 1024 / 1024).toFixed(1) : '0'

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-medium">{t('current_version')}</div>
          <div className="mt-0.5 text-[12px] text-dim">v{info?.currentVersion ?? '—'}</div>
        </div>
        {!downloading && !downloaded && (
          <button
            onClick={check}
            className="glass-subtle glass-hover flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold text-muted transition hover:text-white"
          >
            <RefreshCw size={13} />
            {t('check_update')}
          </button>
        )}
      </div>

      <div className="mt-3 pt-3">
        {downloaded ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] text-good">
              {t('update_available')} (v{info?.latestVersion})
            </span>
            <button
              onClick={start}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-hover"
            >
              <RotateCw size={13} />
              {t('restart_install')}
            </button>
          </div>
        ) : downloading ? (
          <div>
            <div className="mb-1.5 flex justify-between text-[11.5px] text-muted">
              <span>{t('updating')}…</span>
              <span>
                {Math.round((info?.progress ?? 0) * 100)}% · {speedMb} MB/s
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${(info?.progress ?? 0) * 100}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
          </div>
        ) : available ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12.5px] font-medium text-warn">
              {t('update_available')} (v{info?.latestVersion})
            </span>
            <button
              onClick={start}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-accent-hover"
            >
              <Download size={13} />
              {t('download_install')}
            </button>
          </div>
        ) : info?.error ? (
          <span className="text-[12px] text-accent">{t('update_failed')}</span>
        ) : (
          <span className="text-[12.5px] text-good">{t('up_to_date')}</span>
        )}
      </div>
    </div>
  )
}
