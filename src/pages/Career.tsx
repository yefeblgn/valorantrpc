import { useEffect, useMemo, useState } from 'react'
import * as RTabs from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import { History, Loader2, RefreshCw, Swords } from 'lucide-react'
import { PageHeader } from '../components/Card'
import { Select } from '../components/ui/Select'
import { Tip } from '../components/ui/Tip'
import { FilterBar } from '../components/career/FilterBar'
import { MatchList } from '../components/career/MatchList'
import { MatchDetailView } from '../components/career/MatchDetailView'
import { AgentsTab } from '../components/career/AgentsTab'
import { WeaponsTab } from '../components/career/WeaponsTab'
import { AnalysisTab } from '../components/career/AnalysisTab'
import { RankTab } from '../components/career/RankTab'
import {
  Empty,
  StatTile,
  TileGrid,
  formatDate,
  rateTone,
  useLocale
} from '../components/career/common'
import { useStore } from '../store'
import { useDir, useT } from '../lib/i18n'
import { DEFAULT_FILTER, derive, filterMatches, totalsOf, type CareerFilter } from '../lib/career'
import { useHistory } from '../lib/history'

const TABS = ['matches', 'agents', 'weapons', 'analysis', 'rank'] as const
type Tab = (typeof TABS)[number]

export function Career(): JSX.Element {
  const t = useT()
  const dir = useDir()
  const locale = useLocale()
  const enabled = useStore((s) => s.settings?.historyEnabled ?? true)
  const patch = useStore((s) => s.patch)
  const { status, data, account, openMatch, setAccount, setOpenMatch } = useHistory()
  const [tab, setTab] = useState<Tab>('matches')
  const [filter, setFilter] = useState<CareerFilter>(DEFAULT_FILTER)

  const matches = data?.matches ?? []
  const filtered = useMemo(() => filterMatches(matches, filter), [matches, filter])
  const stats = useMemo(() => derive(totalsOf(filtered)), [filtered])
  const totals = useMemo(() => totalsOf(filtered), [filtered])
  const opened = openMatch ? matches.find((m) => m.id === openMatch) : undefined
  const puuid = data?.puuid ?? status?.puuid ?? ''

  useEffect(() => {
    setFilter(DEFAULT_FILTER)
  }, [puuid])

  const accounts = status?.accounts ?? []
  const syncing = !!status?.syncing

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 text-[12.5px] text-muted">
        {syncing ? (
          <Loader2 size={14} className="animate-spin text-accent" />
        ) : (
          <span
            className="h-2 w-2 rotate-45"
            style={{ background: status?.connected ? 'var(--color-good)' : 'var(--color-dim)' }}
          />
        )}
        <span>
          {syncing
            ? t('history_syncing')
            : status?.lastSync
              ? t('history_synced').replace('{time}', formatDate(locale, status.lastSync))
              : t(status?.connected ? 'history_never' : 'history_offline')}
        </span>
        <span className="text-dim">· {t('matches_n').replace('{n}', String(matches.length))}</span>
      </div>
      <div className="flex items-center gap-2">
        {accounts.length > 1 && (
          <Select
            value={account || status?.puuid || ''}
            minWidth={180}
            options={accounts.map((a) => ({
              value: a.puuid,
              label: a.name ? `${a.name}#${a.tag}` : a.puuid.slice(0, 8)
            }))}
            onChange={(v) => setAccount(v === status?.puuid ? '' : v)}
          />
        )}
        <Tip
          label={t('history_refresh')}
          desc={status?.connected ? undefined : t('history_offline_desc')}
          side="top"
        >
          <button
            onClick={() => window.api.syncHistory()}
            disabled={syncing || !status?.connected}
            className="btn btn-ghost"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {t('history_refresh')}
          </button>
        </Tip>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 p-6">
      <PageHeader title={t('nav_career')} desc={t('career_desc')} />

      {!enabled ? (
        <Empty
          icon={<History size={26} />}
          title={t('history_off_title')}
          desc={t('history_off_desc')}
          action={
            <button
              onClick={() => void patch({ historyEnabled: true })}
              className="btn btn-primary"
            >
              {t('enable')}
            </button>
          }
        />
      ) : opened ? (
        <MatchDetailView
          summary={opened}
          puuid={puuid}
          sameMap={matches.filter((m) => m.map === opened.map)}
          onBack={() => setOpenMatch(null)}
        />
      ) : (
        <>
          {header}
          {!matches.length ? (
            <Empty
              icon={syncing ? <Loader2 size={26} className="animate-spin" /> : <Swords size={26} />}
              title={t(syncing ? 'history_first_sync' : 'no_matches')}
              desc={t(
                syncing
                  ? 'history_first_sync_desc'
                  : status?.connected
                    ? 'no_matches_desc'
                    : 'history_offline_desc'
              )}
            />
          ) : (
            <>
              <FilterBar matches={matches} value={filter} onChange={setFilter} />
              <TileGrid>
                <StatTile
                  label={t('matches')}
                  value={totals.matches}
                  sub={`${totals.wins}${t('wins_short')} ${totals.losses}${t('losses_short')}`}
                />
                <StatTile
                  label={t('win_rate')}
                  value={`${stats.winRate}%`}
                  tone={rateTone(stats.winRate, 52, 48)}
                />
                <StatTile
                  label={t('col_kd')}
                  value={stats.kd.toFixed(2)}
                  sub={`${t('col_kda')} ${stats.kda.toFixed(2)}`}
                />
                <StatTile label={t('acs')} value={stats.acs} hint={t('acs_desc')} />
                <StatTile label="ADR" value={stats.adr} hint={t('adr_desc')} />
                <StatTile label={t('col_hs')} value={`${stats.hs}%`} />
              </TileGrid>

              <RTabs.Root value={tab} onValueChange={(v) => setTab(v as Tab)} dir={dir}>
                <RTabs.List className="mb-4 flex flex-wrap gap-x-6 border-b border-line">
                  {TABS.map((tb) => (
                    <RTabs.Trigger
                      key={tb}
                      value={tb}
                      className="display relative shrink-0 pb-2.5 text-[15px] tracking-[0.1em] text-dim outline-none transition-colors hover:text-muted data-[state=active]:text-text"
                    >
                      {t(`career_${tb}`)}
                      <span
                        className={`absolute inset-x-0 -bottom-px h-[2px] origin-left bg-accent transition-transform duration-200 ease-out rtl:origin-right ${
                          tab === tb ? 'scale-x-100' : 'scale-x-0'
                        }`}
                      />
                    </RTabs.Trigger>
                  ))}
                </RTabs.List>
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  {tab === 'matches' && (
                    <div className="flex flex-col gap-4">
                      {filtered.length ? (
                        <MatchList matches={filtered} onOpen={setOpenMatch} />
                      ) : (
                        <Empty
                          icon={<Swords size={26} />}
                          title={t('no_matches')}
                          desc={t('no_matches_filter')}
                        />
                      )}
                      {status?.canBackfill && !account && (
                        <button
                          onClick={() => window.api.loadOlderHistory()}
                          disabled={syncing || !status.connected}
                          className="btn btn-ghost self-center"
                        >
                          <History size={13} />
                          {t('history_older')}
                        </button>
                      )}
                    </div>
                  )}
                  {tab === 'agents' && (
                    <AgentsTab
                      matches={filtered}
                      onAgent={(agent) => {
                        setFilter({ ...filter, agent })
                        setTab('matches')
                      }}
                    />
                  )}
                  {tab === 'weapons' && <WeaponsTab matches={filtered} />}
                  {tab === 'analysis' && <AnalysisTab matches={filtered} onOpen={setOpenMatch} />}
                  {tab === 'rank' && <RankTab entries={data?.rr ?? []} season={filter.season} />}
                </motion.div>
              </RTabs.Root>
            </>
          )}
        </>
      )}
    </div>
  )
}
