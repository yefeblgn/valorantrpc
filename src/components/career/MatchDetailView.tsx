import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Bomb,
  Check,
  Copy,
  Crown,
  Download,
  Flag,
  Image as ImageIcon,
  Loader2,
  Scissors,
  Skull,
  Timer
} from 'lucide-react'
import type {
  HistoryKill,
  HistoryPlayer,
  HistoryRound,
  MatchDetail,
  MatchSummary,
  RoundEnd
} from '@shared/history'
import { acs, pct } from '@shared/history'
import { useT } from '../../lib/i18n'
import { formatDuration } from '../../lib/career'
import {
  agentOf,
  mapOf,
  modeOf,
  seasonLabel,
  tierOf,
  useHistoryStore,
  weaponOf
} from '../../lib/history'
import { FadeImg } from '../ui/FadeImg'
import { Segmented } from '../ui/Segmented'
import { Tip } from '../ui/Tip'
import { RESULT_COLOR, formatDate, formatNumber, signed, useLocale } from './common'
import { Minimap } from './Minimap'

const ALLY = 'var(--color-ally)'
const ENEMY = '#ff4655'
const ABILITY_SLOT: Record<string, number> = {
  grenadeability: 0,
  grenade: 0,
  ability1: 1,
  ability2: 2,
  ultimate: 3
}

type View = 'scoreboard' | 'rounds' | 'map'

const END_ICON: Record<RoundEnd, typeof Skull> = {
  elimination: Skull,
  detonate: Bomb,
  defuse: Scissors,
  time: Timer,
  surrender: Flag,
  other: Flag
}

export function MatchDetailView({
  summary,
  puuid,
  sameMap,
  onBack
}: {
  summary: MatchSummary
  puuid: string
  sameMap: MatchSummary[]
  onBack: () => void
}): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const catalog = useHistoryStore((s) => s.catalog)
  const [detail, setDetail] = useState<MatchDetail | null | undefined>(undefined)
  const [view, setView] = useState<View>('scoreboard')
  const [round, setRound] = useState<number | null>(null)
  const [sharing, setSharing] = useState<'copy' | 'save' | null>(null)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    setDetail(undefined)
    setRound(null)
    void window.api.getMatchDetail(summary.id, puuid).then(setDetail)
  }, [summary.id, puuid])

  const map = mapOf(catalog, summary.map)
  const mode = modeOf(catalog, summary)
  const me = detail ? detail.players.findIndex((p) => p.puuid === puuid) : -1
  const myTeam = detail?.players[me]?.team ?? summary.team

  const share = async (action: 'copy' | 'save'): Promise<void> => {
    setSharing(action)
    const ok = await window.api.shareMatch(summary.id, action, puuid)
    setSharing(null)
    if (ok && action === 'copy') {
      setShared(true)
      setTimeout(() => setShared(false), 1600)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel relative overflow-hidden">
        {map.splash && (
          <FadeImg
            src={map.splash}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-panel via-panel/85 to-panel/40 rtl:bg-gradient-to-l" />
        <div className="relative flex flex-wrap items-end justify-between gap-4 p-5">
          <div className="min-w-0">
            <button onClick={onBack} className="btn btn-ghost mb-4 h-7 px-2.5">
              <ArrowLeft size={13} className="rtl:-scale-x-100" />
              {t('back')}
            </button>
            <div className="flex items-baseline gap-3">
              <span
                className="display text-[34px] leading-none tracking-[0.04em]"
                style={{ color: RESULT_COLOR[summary.result] }}
              >
                {t(`result_${summary.result}`)}
              </span>
              <span className="display text-[30px] leading-none tabular-nums">
                {summary.ally} : {summary.enemy}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span className="display text-[16px] tracking-[0.06em] text-text">{map.name}</span>
              <span className="flex items-center gap-1.5">
                {mode.icon && (
                  <FadeImg
                    src={mode.icon}
                    className="h-4 w-4 opacity-80 [[data-theme=light]_&]:invert"
                  />
                )}
                {mode.name}
              </span>
              <span>{formatDate(locale, summary.start)}</span>
              <span>{formatDuration(summary.length, locale)}</span>
              {seasonLabel(catalog, summary.season) && (
                <span className="text-dim">{seasonLabel(catalog, summary.season)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tip label={t('share_copy')} desc={t('share_copy_desc')} side="top">
              <button
                onClick={() => void share('copy')}
                disabled={!!sharing || !detail}
                className="btn btn-ghost"
              >
                {sharing === 'copy' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : shared ? (
                  <Check size={13} className="text-good" />
                ) : (
                  <ImageIcon size={13} />
                )}
                {shared ? t('copied') : t('share_copy')}
              </button>
            </Tip>
            <button
              onClick={() => void share('save')}
              disabled={!!sharing || !detail}
              className="btn btn-ghost"
              aria-label={t('share_save')}
            >
              {sharing === 'save' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              {t('share_save')}
            </button>
          </div>
        </div>
      </div>

      {detail === undefined ? (
        <div className="panel flex items-center gap-3 px-5 py-6 text-[13px] text-muted">
          <Loader2 size={16} className="animate-spin" />
          {t('loading')}
        </div>
      ) : detail === null || me < 0 ? (
        <div className="panel px-5 py-6 text-[13px] text-muted">{t('detail_missing')}</div>
      ) : (
        <>
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: 'scoreboard', label: t('tab_scoreboard') },
              ...(detail.rounds.length
                ? [{ value: 'rounds' as View, label: t('tab_rounds') }]
                : []),
              ...(detail.rounds.length ? [{ value: 'map' as View, label: t('tab_minimap') }] : [])
            ]}
          />
          {view === 'scoreboard' && <Scoreboard detail={detail} me={me} />}
          {view === 'rounds' && (
            <Rounds detail={detail} me={me} myTeam={myTeam} round={round ?? 0} onRound={setRound} />
          )}
          {view === 'map' && (
            <div className="flex flex-col gap-3">
              <RoundStrip
                detail={detail}
                myTeam={myTeam}
                round={round}
                onRound={setRound}
                allowAll
              />
              <Minimap
                key={detail.id}
                detail={detail}
                map={map}
                me={me}
                round={round}
                sameMap={sameMap}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

const SCORE_COLS =
  'grid grid-cols-[minmax(0,2.4fr)_44px_repeat(3,minmax(0,0.55fr))_minmax(0,0.6fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_minmax(0,0.5fr)_minmax(0,0.5fr)_minmax(0,0.6fr)] items-center gap-x-2'

function Scoreboard({ detail, me }: { detail: MatchDetail; me: number }): JSX.Element {
  const t = useT()
  const myTeam = detail.players[me].team
  const roundBased = detail.teams.length === 2
  const groups = roundBased
    ? [...detail.teams]
        .sort((a, b) => Number(b.id === myTeam) - Number(a.id === myTeam))
        .map((team) => ({
          id: team.id,
          ally: team.id === myTeam,
          rounds: team.rounds,
          players: detail.players
            .map((p, i) => ({ p, i }))
            .filter(({ p }) => p.team === team.id)
            .sort((a, b) => b.p.score - a.p.score)
        }))
    : [
        {
          id: 'all',
          ally: true,
          rounds: 0,
          players: detail.players.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score)
        }
      ]
  const top = Math.max(...detail.players.map((p) => p.score))

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const color = !roundBased ? 'var(--color-muted)' : g.ally ? ALLY : ENEMY
        return (
          <section
            key={g.id}
            className="panel min-w-0 overflow-hidden"
            style={{ borderTop: `2px solid ${color}` }}
          >
            <header className="flex items-center gap-3 border-b border-line px-4 py-2.5">
              <span className="display text-[16px] tracking-[0.1em]" style={{ color }}>
                {!roundBased ? t('team_all') : g.ally ? t('team_ally') : t('team_enemy')}
              </span>
              {roundBased && <span className="display text-[16px] tabular-nums">{g.rounds}</span>}
            </header>
            <div className={`${SCORE_COLS} border-b border-line px-4 py-2`}>
              <span className="label">{t('col_player')}</span>
              <span className="label">{t('col_rank')}</span>
              <Head label="ACS" desc={t('acs_desc')} />
              <span className="label">K</span>
              <span className="label">D</span>
              <span className="label">A</span>
              <Head label="+/-" desc={t('diff_desc')} />
              <Head label="ADR" desc={t('adr_desc')} />
              <span className="label">{t('col_hs')}</span>
              <Head label="FK" desc={t('fk_desc')} />
              <Head label="FD" desc={t('fd_desc')} />
              <Head label="MK" desc={t('mk_desc')} />
            </div>
            <div className="divide-y divide-line">
              {g.players.map(({ p, i }) => (
                <ScoreRow
                  key={p.puuid}
                  player={p}
                  self={i === me}
                  mvp={p.score === top}
                  detail={detail}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function Head({ label, desc }: { label: string; desc: string }): JSX.Element {
  return (
    <Tip label={label} desc={desc} side="top">
      <span className="label w-fit cursor-help">{label}</span>
    </Tip>
  )
}

function ScoreRow({
  player: p,
  self,
  mvp,
  detail
}: {
  player: HistoryPlayer
  self: boolean
  mvp: boolean
  detail: MatchDetail
}): JSX.Element {
  const t = useT()
  const catalog = useHistoryStore((s) => s.catalog)
  const [copied, setCopied] = useState(false)
  const agent = agentOf(catalog, p.agent)
  const tier = tierOf(catalog, p.tier)
  const diff = p.kills - p.deaths
  const party = p.party
    ? detail.players.filter((o) => o.party === p.party && o.team === p.team).length > 1
    : false
  const multi = p.multi[2]
    ? `5K×${p.multi[2]}`
    : p.multi[1]
      ? `4K×${p.multi[1]}`
      : p.multi[0]
        ? `3K×${p.multi[0]}`
        : '—'

  const copy = (): void => {
    window.api.copyText(`${p.name}#${p.tag}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className={`${SCORE_COLS} group px-4 py-2 ${self ? 'bg-accent/[0.07]' : ''}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="h-9 w-9 shrink-0 overflow-hidden border border-line-2 bg-panel-2">
          {agent.icon && <FadeImg src={agent.icon} className="h-full w-full object-cover" />}
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13.5px] font-semibold">
              {p.name || agent.name}
              {p.tag && <span className="font-medium text-dim">#{p.tag}</span>}
            </span>
            {mvp && <Crown size={12} className="shrink-0 text-warn" aria-label={t('mvp_match')} />}
            {p.name && (
              <Tip label={copied ? t('copied') : t('copy_name')} side="top">
                <button
                  onClick={copy}
                  aria-label={t('copy_name')}
                  className="shrink-0 text-dim opacity-0 transition-opacity hover:text-text focus-visible:opacity-100 group-hover:opacity-100"
                >
                  {copied ? <Check size={12} className="text-good" /> : <Copy size={12} />}
                </button>
              </Tip>
            )}
          </div>
          <div className="truncate text-[11px] text-dim">
            {agent.name}
            {party && ` · ${t('in_party')}`}
            {p.level ? ` · ${t('level_short')} ${p.level}` : ''}
          </div>
        </div>
      </div>
      <span className="h-7 w-7">
        {p.tier > 0 && tier.icon && (
          <Tip label={tier.name} side="top">
            <FadeImg src={tier.icon} className="h-7 w-7" />
          </Tip>
        )}
      </span>
      <Num value={acs(p)} strong />
      <Num value={p.kills} />
      <Num value={p.deaths} />
      <Num value={p.assists} />
      <span
        className={`display text-[14px] tabular-nums ${diff > 0 ? 'text-good' : diff < 0 ? 'text-bad' : 'text-muted'}`}
      >
        {signed(diff)}
      </span>
      <Num value={p.rounds ? Math.round(p.damage / p.rounds) : 0} />
      <span className="display text-[14px] tabular-nums">
        {pct(p.head, p.head + p.body + p.leg)}%
      </span>
      <Num value={p.firstKills} />
      <Num value={p.firstDeaths} />
      <span
        dir="ltr"
        className="display text-start text-[13px] tabular-nums text-muted rtl:text-end"
      >
        {multi}
      </span>
    </div>
  )
}

function Num({ value, strong = false }: { value: number; strong?: boolean }): JSX.Element {
  return (
    <span className={`display text-[14px] tabular-nums ${strong ? 'text-text' : 'text-muted'}`}>
      {value}
    </span>
  )
}

function RoundStrip({
  detail,
  myTeam,
  round,
  onRound,
  allowAll = false
}: {
  detail: MatchDetail
  myTeam: string
  round: number | null
  onRound: (n: number | null) => void
  allowAll?: boolean
}): JSX.Element {
  const t = useT()
  const half = detail.queue === 'swiftplay' ? 4 : detail.queue === 'spikerush' ? 3 : 12
  return (
    <div className="panel flex items-stretch gap-1 overflow-x-auto p-2">
      {allowAll && (
        <button
          onClick={() => onRound(null)}
          className={`display shrink-0 border px-2.5 text-[12px] tracking-[0.1em] ${
            round === null ? 'border-accent text-text' : 'border-line text-dim hover:text-muted'
          }`}
        >
          {t('all_rounds')}
        </button>
      )}
      {detail.rounds.map((r) => {
        const won = r.winner === myTeam
        const Icon = END_ICON[r.end]
        const side = r.attacker
          ? r.attacker === myTeam
            ? t('side_attack')
            : t('side_defense')
          : ''
        return (
          <div key={r.n} className="flex shrink-0 items-stretch">
            {r.n === half && <span className="mx-1 w-px bg-line-2" />}
            <Tip
              label={t('round_n').replace('{n}', String(r.n + 1))}
              desc={[t(won ? 'round_won' : 'round_lost'), t(`end_${r.end}`), side]
                .filter(Boolean)
                .join(' · ')}
              side="top"
            >
              <button
                onClick={() => onRound(r.n)}
                aria-label={t('round_n').replace('{n}', String(r.n + 1))}
                className={`flex w-8 flex-col items-center gap-1 border py-1.5 transition-colors ${
                  round === r.n ? 'border-text bg-hover' : 'border-transparent hover:bg-hover'
                }`}
              >
                <Icon size={13} style={{ color: won ? 'var(--color-good)' : 'var(--color-bad)' }} />
                <span className="text-[10.5px] tabular-nums text-dim">{r.n + 1}</span>
              </button>
            </Tip>
          </div>
        )
      })}
    </div>
  )
}

function Rounds({
  detail,
  me,
  myTeam,
  round,
  onRound
}: {
  detail: MatchDetail
  me: number
  myTeam: string
  round: number
  onRound: (n: number | null) => void
}): JSX.Element {
  const r = detail.rounds.find((x) => x.n === round) ?? detail.rounds[0]
  return (
    <div className="flex flex-col gap-3">
      <RoundStrip detail={detail} myTeam={myTeam} round={r.n} onRound={(n) => onRound(n ?? 0)} />
      <RoundDetail detail={detail} round={r} me={me} myTeam={myTeam} />
    </div>
  )
}

function RoundDetail({
  detail,
  round: r,
  me,
  myTeam
}: {
  detail: MatchDetail
  round: HistoryRound
  me: number
  myTeam: string
}): JSX.Element {
  const t = useT()
  const locale = useLocale()
  const catalog = useHistoryStore((s) => s.catalog)
  const won = r.winner === myTeam
  const Icon = END_ICON[r.end]
  const name = (i: number): string => {
    const p = detail.players[i]
    return p ? p.name || agentOf(catalog, p.agent).name : '?'
  }
  const clock = (ms: number): string => {
    const s = Math.max(0, Math.round(ms / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const teams = useMemo(() => {
    const ids = [...new Set(detail.players.map((p) => p.team))].sort(
      (a, b) => Number(b === myTeam) - Number(a === myTeam)
    )
    return ids.map((id) => ({
      id,
      players: detail.players
        .map((p, i) => ({ p, i, row: r.players[i] }))
        .filter((x) => x.p.team === id && x.row)
        .sort((a, b) => (b.row?.score ?? 0) - (a.row?.score ?? 0))
    }))
  }, [detail, r, myTeam])

  return (
    <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="panel min-w-0">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Icon size={16} style={{ color: won ? 'var(--color-good)' : 'var(--color-bad)' }} />
          <span className="display text-[17px] tracking-[0.06em]">
            {t('round_n').replace('{n}', String(r.n + 1))}
          </span>
          <span
            className={`display text-[13px] tracking-[0.1em] ${won ? 'text-good' : 'text-bad'}`}
          >
            {t(won ? 'round_won' : 'round_lost')}
          </span>
          <span className="ms-auto text-[12px] text-dim">
            {t(`end_${r.end}`)}
            {r.attacker && ` · ${r.attacker === myTeam ? t('side_attack') : t('side_defense')}`}
          </span>
        </header>
        <div className="flex flex-col gap-1.5 border-b border-line px-4 py-3 text-[12.5px] text-muted">
          {r.plant ? (
            <span className="flex items-center gap-2">
              <Bomb size={13} className="text-warn" />
              {t('plant_line')
                .replace('{name}', name(r.plant.by))
                .replace('{site}', r.plant.site || '?')
                .replace('{time}', clock(r.plant.t))}
            </span>
          ) : (
            <span className="text-dim">{t('no_plant')}</span>
          )}
          {r.defuse && (
            <span className="flex items-center gap-2">
              <Scissors size={13} className="text-ally" />
              {t('defuse_line')
                .replace('{name}', name(r.defuse.by))
                .replace('{time}', clock(r.defuse.t))}
            </span>
          )}
        </div>
        <div className="divide-y divide-line">
          {r.kills.length === 0 && (
            <div className="px-4 py-3 text-[12.5px] text-dim">{t('no_kills')}</div>
          )}
          {r.kills.map((k, i) => (
            <KillLine
              key={i}
              kill={k}
              detail={detail}
              me={me}
              myTeam={myTeam}
              time={clock(k.t)}
              name={name}
            />
          ))}
        </div>
      </section>

      <section className="panel min-w-0">
        <header className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] gap-x-2 border-b border-line px-4 py-2.5">
          <span className="label">{t('col_player')}</span>
          <span className="label">{t('econ_weapon')}</span>
          <span className="label">{t('econ_loadout')}</span>
          <span className="label">{t('econ_spent')}</span>
          <span className="label">{t('econ_damage')}</span>
        </header>
        {teams.map((team) => (
          <div key={team.id} className="divide-y divide-line border-b border-line last:border-b-0">
            {team.players.map(({ p, i, row }) => {
              const weapon = row?.econ?.weapon ? weaponOf(catalog, row.econ.weapon) : null
              return (
                <div
                  key={p.puuid}
                  className={`grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] items-center gap-x-2 px-4 py-1.5 ${
                    i === me ? 'bg-accent/[0.07]' : ''
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rotate-45"
                      style={{ background: p.team === myTeam ? ALLY : ENEMY }}
                    />
                    <span className="truncate text-[12.5px]">{name(i)}</span>
                  </span>
                  <span className="flex h-5 min-w-0 items-center">
                    {weapon?.kill ? (
                      <Tip label={weapon.name} side="top">
                        <FadeImg
                          src={weapon.kill}
                          className="h-4 max-w-full object-contain opacity-80 [[data-theme=light]_&]:invert"
                        />
                      </Tip>
                    ) : (
                      <span className="truncate text-[11.5px] text-dim">{weapon?.name ?? '—'}</span>
                    )}
                  </span>
                  <span className="text-[12.5px] tabular-nums text-muted">
                    {row?.econ ? formatNumber(locale, row.econ.loadout) : '—'}
                  </span>
                  <span className="text-[12.5px] tabular-nums text-muted">
                    {row?.econ ? formatNumber(locale, row.econ.spent) : '—'}
                  </span>
                  <span className="text-[12.5px] tabular-nums">{row ? row.damage : '—'}</span>
                </div>
              )
            })}
          </div>
        ))}
      </section>
    </div>
  )
}

function KillLine({
  kill: k,
  detail,
  me,
  myTeam,
  time,
  name
}: {
  kill: HistoryKill
  detail: MatchDetail
  me: number
  myTeam: string
  time: string
  name: (i: number) => string
}): JSX.Element {
  const t = useT()
  const catalog = useHistoryStore((s) => s.catalog)
  const killer = detail.players[k.killer]
  const victim = detail.players[k.victim]
  const slot = ABILITY_SLOT[k.weapon]
  const weapon = slot === undefined ? weaponOf(catalog, k.weapon) : null
  const ability =
    slot !== undefined && killer
      ? agentOf(catalog, killer.agent).abilities[slot] || t('kill_ability')
      : k.kind === 'ability'
        ? t('kill_ability')
        : ''
  const how =
    weapon?.name ||
    ability ||
    (k.kind === 'bomb' ? t('kill_spike') : k.kind === 'fall' ? t('kill_fall') : '—')
  const color = (p: HistoryPlayer | undefined): string => (p?.team === myTeam ? ALLY : ENEMY)

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2 text-[12.5px] ${k.killer === me || k.victim === me ? 'bg-accent/[0.05]' : ''}`}
    >
      <span className="w-9 shrink-0 tabular-nums text-dim">{time}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate font-semibold" style={{ color: color(killer) }}>
          {k.killer >= 0 ? name(k.killer) : '—'}
        </span>
        <span className="flex h-5 shrink-0 items-center">
          {weapon?.kill ? (
            <Tip label={how} side="top">
              <FadeImg
                src={weapon.kill}
                className="h-4 max-w-[64px] object-contain opacity-80 rtl:-scale-x-100 [[data-theme=light]_&]:invert"
              />
            </Tip>
          ) : (
            <span className="text-[11px] text-dim">{how}</span>
          )}
        </span>
        <span className="truncate" style={{ color: color(victim) }}>
          {name(k.victim)}
        </span>
      </span>
      {k.assists.length > 0 && (
        <Tip label={t('assists')} desc={k.assists.map(name).join(', ')} side="top">
          <span className="shrink-0 text-[11px] text-dim">+{k.assists.length}</span>
        </Tip>
      )}
    </div>
  )
}
