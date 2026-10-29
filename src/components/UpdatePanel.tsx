import { motion } from 'framer-motion'
import { Download, ExternalLink, Loader2, RefreshCw, RotateCw } from 'lucide-react'
import { useT } from '../lib/i18n'
import { useUpdates } from '../lib/useUpdates'

export function UpdatePanel(): JSX.Element {
  const t = useT()
  const { info, check, start } = useUpdates()

  const checking = !info || info.checking
  const downloading = !!info?.downloading
  const downloaded = !!info?.downloaded
  const available = !!info?.available
  const portable = !!info?.portable
  const speedMb = info ? (info.bytesPerSecond / 1024 / 1024).toFixed(1) : '0'

  return (
    <div className="panel">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5">
        <div>
          <div className="label">{t('current_version')}</div>
          <div className="display mt-1.5 text-[22px] normal-case">
            v{info?.currentVersion ?? '—'}
          </div>
        </div>
        {!downloading && !downloaded && (
          <button onClick={check} disabled={checking} className="btn btn-ghost">
            <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
            {t('check_update')}
          </button>
        )}
      </div>

      <div className="px-4 py-3.5">
        {downloaded ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13.5px] font-medium text-good">
              {t('update_available')} (v{info?.latestVersion})
            </span>
            <button onClick={start} className="btn btn-primary">
              <RotateCw size={13} />
              {t('restart_install')}
            </button>
          </div>
        ) : downloading ? (
          <div>
            <div className="mb-2 flex justify-between text-[12.5px] text-muted">
              <span>{t('updating')}…</span>
              <span className="tabular-nums">
                {Math.round((info?.progress ?? 0) * 100)}% · {speedMb} MB/s
              </span>
            </div>
            <div className="h-[3px] overflow-hidden bg-line-2">
              <motion.div
                className="h-full bg-accent"
                animate={{ width: `${(info?.progress ?? 0) * 100}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
          </div>
        ) : checking ? (
          <span className="flex items-center gap-2 text-[13.5px] text-muted">
            <Loader2 size={14} className="animate-spin" />
            {t('checking')}
          </span>
        ) : available ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13.5px] font-medium text-warn">
                {t('update_available')} (v{info?.latestVersion})
              </div>
              {portable && (
                <div className="mt-1 text-[12.5px] text-dim">{t('portable_update_desc')}</div>
              )}
            </div>
            <button onClick={start} className="btn btn-primary">
              {portable ? <ExternalLink size={13} /> : <Download size={13} />}
              {portable ? t('open_release_page') : t('download_install')}
            </button>
          </div>
        ) : info?.error ? (
          <span className="text-[13.5px] text-accent">{t('update_failed')}</span>
        ) : (
          <span className="text-[13.5px] text-good">{t('up_to_date')}</span>
        )}
      </div>
    </div>
  )
}
