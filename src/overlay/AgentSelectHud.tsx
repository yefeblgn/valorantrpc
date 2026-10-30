import { Users } from 'lucide-react'
import type { MapAgentStat, MapStats, MatchPlayer, MatchReport } from '@shared/types'
import { AppLogo } from '../components/brand'
import { FadeImg } from '../components/ui/FadeImg'
import { Keys } from '../components/ui/Keys'
import { useT } from '../lib/i18n'

const MAX_ROWS = 5

function winRate(wins: number, games: number): number {
  return games ? Math.round((wins / games) * 100) : 0
}

function rateTone(rate: number): string {
  return rate >= 55 ? 'text-good' : rate < 45 ? 'text-bad' : 'text-text'
}

export function AgentSelectHud({
  report,
  hotkey
}: {
  report: MatchReport
  hotkey: string
}): JSX.Element {
  const t = useT()
  const team = report.teams.find((tm) => tm.ally) ?? report.teams[0]
  const players = (team?.players ?? []).slice(0, MAX_ROWS)

  return (
    <div className="absolute right-10 top-[17%] w-[360px] overflow-hidden border border-line-2 border-t-2 border-t-accent bg-[rgba(9,12,17,0.88)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
      <header className="relative h-[68px] overflow-hidden border-b border-line">
        {report.mapIcon && (
          <FadeImg
            src={report.mapIcon}
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(9,12,17,0.95)] via-[rgba(9,12,17,0.55)] to-transparent" />
        <div className="relative flex h-full items-end justify-between gap-3 px-3.5 pb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <AppLogo size={14} />
              <span className="label text-[10.5px] text-muted">{t('phase_pregame')}</span>
            </div>
            <div className="display mt-0.5 truncate text-[22px] leading-none tracking-[0.06em]">
              {report.mapName || '—'}
            </div>
          </div>
          {report.modeName && (
            <span className="flex shrink-0 items-center gap-1.5 pb-0.5">
              {report.modeIcon && (
                <FadeImg src={report.modeIcon} className="h-4 w-4 object-contain opacity-80" />
              )}
              <span className="display text-[12.5px] tracking-[0.12em] text-muted">
                {report.modeName}
              </span>
            </span>
          )}
        </div>
      </header>

      <section className="border-b border-line">
        <div className="flex items-center justify-between gap-2 px-3.5 pb-1.5 pt-2.5">
          <span className="label text-[10.5px] text-ally">{t('team_ally')}</span>
          {team?.avgRank && (
            <span className="flex items-center gap-1.5">
              <span className="label text-[10px]">{t('avg_rank')}</span>
              {team.avgRank.icon && <FadeImg src={team.avgRank.icon} className="h-4 w-4" />}
              <span className="display text-[12px]">{team.avgRank.name}</span>
            </span>
          )}
        </div>
        <div className="pb-1.5">
          {players.map((player) => (
            <PlayerLine key={player.puuid} player={player} />
          ))}
        </div>
      </section>

      {report.mapStats && <BestAgents stats={report.mapStats} mapName={report.mapName} />}

      <footer className="flex items-center gap-2 px-3.5 py-2 text-[11.5px] text-dim">
        <Keys value={hotkey} size="sm" />
        <span>{t('hud_tracker')}</span>
      </footer>
    </div>
  )
}

function PlayerLine({ player }: { player: MatchPlayer }): JSX.Element {
  const t = useT()
  const stats = player.stats
  const rate = stats?.games ? winRate(stats.wins, stats.games) : null

  return (
    <div
      className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 px-3.5 py-[5px] ${
        player.isSelf ? 'bg-accent/[0.09]' : ''
      }`}
    >
      <div
        className={`flex h-7 w-7 items-center justify-center overflow-hidden border bg-panel-2 ${
          player.locked ? 'border-line-2' : 'border-dashed border-line-2'
        }`}
      >
        {player.agentIcon ? (
          <FadeImg
            src={player.agentIcon}
            className={`h-full w-full object-cover ${player.locked ? '' : 'opacity-50 grayscale'}`}
          />
        ) : (
          <Users size={12} className="text-dim" />
        )}
      </div>
      <div className="min-w-0">
        {player.hidden ? (
          <div className="truncate text-[12.5px] italic text-muted">{t('hidden_player')}</div>
        ) : (
          <div className="truncate text-[12.5px] font-semibold text-text">
            {player.name || '—'}
            {player.tag && <span className="font-medium text-dim">#{player.tag}</span>}
          </div>
        )}
        <div className="truncate text-[10.5px] text-dim">
          {player.agentName || (player.locked ? '' : t('picking'))}
        </div>
      </div>
      {player.statsState === 'loading' ? (
        <div className="h-3 w-24 animate-pulse bg-panel-2" />
      ) : !stats ? (
        <span className="text-[11px] italic text-dim">—</span>
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5">
            <span className="h-5 w-5 shrink-0">
              {stats.rankIcon && (
                <FadeImg src={stats.rankIcon} className="h-full w-full object-contain" />
              )}
            </span>
            <span className="display w-[74px] truncate text-[12px] tracking-[0.03em]">
              {stats.rankTier ? stats.rankName : t('unranked')}
            </span>
          </span>
          <span
            className={`display w-9 text-end text-[12.5px] tabular-nums ${
              rate === null ? 'text-dim' : rateTone(rate)
            }`}
          >
            {rate === null ? '—' : t('pct').replace('{n}', String(rate))}
          </span>
          <span className="display w-8 text-end text-[12.5px] tabular-nums text-muted">
            {stats.kd === null ? '—' : stats.kd.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}

function BestAgents({ stats, mapName }: { stats: MapStats; mapName: string }): JSX.Element {
  const t = useT()
  const title = mapName ? t('hud_best_on').replace('{map}', mapName) : t('hud_best')

  return (
    <section className="border-b border-line px-3.5 pb-2.5 pt-2.5">
      <div className="label mb-2 text-[10.5px] text-accent">{title}</div>
      {stats.agents.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {stats.agents.map((agent) => (
            <AgentLine key={agent.uuid} agent={agent} />
          ))}
        </div>
      ) : stats.state === 'syncing' ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-7 animate-pulse bg-panel-2/70" />
          ))}
          <div className="mt-0.5 text-[11px] text-dim">{t('hud_syncing')}</div>
        </div>
      ) : (
        <div className="text-[11.5px] text-dim">{t('hud_no_games')}</div>
      )}
      {stats.agents.length > 0 && stats.sample > 0 && (
        <div className="mt-2 text-[10.5px] text-dim">
          {t('hud_sample').replace('{n}', String(stats.sample))}
        </div>
      )}
    </section>
  )
}

function AgentLine({ agent }: { agent: MapAgentStat }): JSX.Element {
  const t = useT()
  const rate = winRate(agent.wins, agent.games)
  const games = t(agent.games === 1 ? 'hud_games_one' : 'hud_games').replace(
    '{n}',
    String(agent.games)
  )

  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5">
      <div className="h-7 w-7 overflow-hidden border border-line-2 bg-panel-2">
        {agent.icon && <FadeImg src={agent.icon} className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0">
        <div className="display truncate text-[13.5px] leading-tight tracking-[0.04em]">
          {agent.name || '—'}
        </div>
        <div className="text-[10.5px] text-dim">{games}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[3px] w-14 bg-bad/35">
          <div className="h-full bg-good" style={{ width: `${rate}%` }} />
        </div>
        <span className={`display w-10 text-end text-[14px] tabular-nums ${rateTone(rate)}`}>
          {t('pct').replace('{n}', String(rate))}
        </span>
      </div>
    </div>
  )
}
