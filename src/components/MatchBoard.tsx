import { Users } from 'lucide-react'
import type { MatchPlayer, MatchReport, MatchTeam, PlayerStats } from '@shared/types'
import { useT } from '../lib/i18n'
import { FadeImg } from './ui/FadeImg'
import { Tip } from './ui/Tip'

const SAMPLE = 3
const ALLY = 'var(--color-ally)'
const ENEMY = '#ff4655'
const COLS =
  'grid grid-cols-[minmax(0,2.3fr)_minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1.15fr)_minmax(0,0.6fr)_minmax(0,0.6fr)_minmax(0,0.6fr)] items-center gap-x-3'

export function MatchBoard({ report }: { report: MatchReport }): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 min-[1500px]:grid-cols-2">
      {report.teams.map((team) => (
        <TeamTable key={team.id} team={team} />
      ))}
    </div>
  )
}

function TeamTable({ team }: { team: MatchTeam }): JSX.Element {
  const t = useT()
  const color = team.id === 'all' ? 'var(--color-muted)' : team.ally ? ALLY : ENEMY
  const label = team.id === 'all' ? t('team_all') : team.ally ? t('team_ally') : t('team_enemy')
  const n = String(SAMPLE)

  return (
    <section className="panel min-w-0 overflow-hidden" style={{ borderTop: `2px solid ${color}` }}>
      <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="display text-[17px] tracking-[0.1em]" style={{ color }}>
          {label}
        </span>
        <span className="label">{team.players.length}</span>
        {team.avgRank && (
          <span className="ml-auto flex items-center gap-2">
            <span className="label">{t('avg_rank')}</span>
            {team.avgRank.icon && <FadeImg src={team.avgRank.icon} className="h-6 w-6" />}
            <span className="display text-[14px]">{team.avgRank.name}</span>
          </span>
        )}
      </header>

      <div className={`${COLS} border-b border-line px-4 py-2`}>
        <span className="label">{t('col_player')}</span>
        <span className="label">{t('col_rank')}</span>
        <HeadTip label={t('col_peak')} desc={t('col_peak_desc')} />
        <HeadTip label={t('col_season')} desc={t('col_season_desc')} />
        <HeadTip label={t('col_kda')} desc={t('col_kda_desc').replace('{n}', n)} />
        <HeadTip label={t('col_kd')} desc={t('col_kd_desc').replace('{n}', n)} />
        <HeadTip label={t('col_hs')} desc={t('col_hs_desc').replace('{n}', n)} />
      </div>

      <div className="divide-y divide-line">
        {team.players.map((player) => (
          <PlayerRow key={player.puuid} player={player} />
        ))}
      </div>
    </section>
  )
}

function HeadTip({ label, desc }: { label: string; desc: string }): JSX.Element {
  return (
    <Tip label={label} desc={desc} side="top">
      <span className="label w-fit cursor-help">{label}</span>
    </Tip>
  )
}

function PlayerRow({ player }: { player: MatchPlayer }): JSX.Element {
  const t = useT()
  const { stats, statsState } = player
  const subtitle = [
    player.agentName || (player.locked ? '' : t('picking')),
    player.level !== null ? `${t('level_short')} ${player.level}` : ''
  ].filter(Boolean)

  return (
    <div className={`${COLS} px-4 py-2.5 ${player.isSelf ? 'bg-accent/[0.07]' : ''}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border bg-panel-2 ${
            player.locked ? 'border-line-2' : 'border-dashed border-line-2'
          }`}
        >
          {player.agentIcon ? (
            <FadeImg
              src={player.agentIcon}
              className={`h-full w-full object-cover ${player.locked ? '' : 'opacity-50 grayscale'}`}
            />
          ) : (
            <Users size={16} className="text-dim" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            {player.hidden ? (
              <span className="truncate text-[14px] italic text-muted">{t('hidden_player')}</span>
            ) : (
              <span className="truncate text-[14px] font-semibold text-text">
                {player.name || '—'}
                {player.tag && <span className="font-medium text-dim">#{player.tag}</span>}
              </span>
            )}
            {player.isSelf && <Badge tone="accent">{t('you')}</Badge>}
            {player.inParty && <Badge tone="ally">{t('in_party')}</Badge>}
          </div>
          {subtitle.length > 0 && (
            <div className="mt-0.5 truncate text-[12px] text-dim">{subtitle.join(' · ')}</div>
          )}
        </div>
      </div>

      {statsState === 'loading' ? (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-3.5 w-3/4 animate-pulse bg-panel-2" />
          ))}
        </>
      ) : statsState === 'error' || !stats ? (
        <div className="col-span-6 text-[12.5px] italic text-dim">{t('stats_failed')}</div>
      ) : (
        <StatCells stats={stats} />
      )}
    </div>
  )
}

function StatCells({ stats }: { stats: PlayerStats }): JSX.Element {
  const t = useT()
  const losses = Math.max(stats.games - stats.wins, 0)
  const winRate = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0

  return (
    <>
      <RankCell
        icon={stats.rankIcon}
        name={stats.rankTier ? stats.rankName : t('unranked')}
        sub={stats.rr !== null ? `${stats.rr} RR` : ''}
      />
      <RankCell
        icon={stats.peakTier ? stats.peakIcon : null}
        name={stats.peakTier ? stats.peakName : '—'}
        sub={stats.peakAct}
      />
      {stats.games ? (
        <div className="min-w-0">
          <div className="display text-[15px] tracking-[0.04em]">
            <span className="text-good">
              {stats.wins}
              {t('wins_short')}
            </span>{' '}
            <span className="text-bad">
              {losses}
              {t('losses_short')}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-[3px] w-12 shrink-0 bg-bad/35">
              <div className="h-full bg-good" style={{ width: `${winRate}%` }} />
            </div>
            <span className="text-[11.5px] text-muted">
              {t('pct').replace('{n}', String(winRate))}
            </span>
          </div>
        </div>
      ) : (
        <span className="text-[12px] text-dim">{t('no_games')}</span>
      )}
      <Num value={stats.kda} good={2} bad={1.3} />
      <Num value={stats.kd} good={1.15} bad={0.9} />
      <Num value={stats.hs} good={25} bad={15} format={(v) => t('pct').replace('{n}', String(v))} />
    </>
  )
}

function RankCell({
  icon,
  name,
  sub
}: {
  icon: string | null
  name: string
  sub: string
}): JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="h-8 w-8 shrink-0">
        {icon && <FadeImg src={icon} className="h-full w-full object-contain" />}
      </div>
      <div className="min-w-0">
        <div className="display truncate text-[14px] tracking-[0.03em]">{name}</div>
        {sub && <div className="truncate text-[11px] text-dim">{sub}</div>}
      </div>
    </div>
  )
}

function Num({
  value,
  good,
  bad,
  format = (v) => v.toFixed(2)
}: {
  value: number | null
  good: number
  bad: number
  format?: (v: number) => string
}): JSX.Element {
  if (value === null) return <span className="display text-[15px] text-dim">—</span>
  const tone = value >= good ? 'text-good' : value < bad ? 'text-bad' : 'text-text'
  return <span className={`display text-[15px] tabular-nums ${tone}`}>{format(value)}</span>
}

function Badge({ tone, children }: { tone: 'accent' | 'ally'; children: string }): JSX.Element {
  const style =
    tone === 'accent'
      ? 'border-accent/60 bg-accent/15 text-accent'
      : 'border-ally/50 bg-ally/10 text-ally'
  return (
    <span
      className={`display shrink-0 border px-1.5 py-px text-[10.5px] tracking-[0.12em] ${style}`}
    >
      {children}
    </span>
  )
}
