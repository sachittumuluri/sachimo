'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type MoodKey = 'great' | 'good' | 'ok' | 'meh' | 'rough'
type Entry = {
  id: string
  created_at: string
  pair_id: string
  user_id: string
  date: string
  author: 'Me' | 'You'
  mood: MoodKey
  text: string
}

const MOODS = [
  { key: 'great', label: 'Great', emoji: '🌈', score: 2 },
  { key: 'good', label: 'Good', emoji: '🙂', score: 1 },
  { key: 'ok', label: 'Okay', emoji: '😌', score: 0 },
  { key: 'meh', label: 'Meh', emoji: '😕', score: -1 },
  { key: 'rough', label: 'Rough', emoji: '🌧️', score: -2 }
] as const

const GOLDEN_PROMPTS = [
  'Tell me one tiny win from today.',
  'What’s something soft you noticed?',
  'What made you feel seen this week?',
  'Name a smell, a color, and a sound from your day.',
  'What do you want future-us to remember about right now?',
  'What’s one thing you handled better than last time?',
  'Share a meme in words. Describe it badly.',
  'What would make tomorrow 1% easier?',
  'Who were you kind to today—include yourself.',
  'Something small that made you smile.'
]

const STOPWORDS = new Set(
  'a,an,and,are,as,at,be,but,by,for,from,has,have,had,he,her,hers,his,i,if,in,into,is,it,its,just,me,my,of,on,or,our,ours,she,so,that,the,their,them,they,this,to,too,very,was,we,were,what,when,where,who,will,with,you,your,yours,im,i\'m,it\'s,ive,i’ve,theres,there\'s,got,like,not,up,down,out,over,under,about,again,also,more,most,less,than,then,now,soon,yeah,yes,no'
    .split(',')
)

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function Journal() {
  const [tab, setTab] = useState<'today' | 'archive' | 'streaks'>('today')
  const [author, setAuthor] = useState<'Me' | 'You'>('Me')
  const [text, setText] = useState('')
  const [mood, setMood] = useState<MoodKey>('ok')
  const [date, setDate] = useState(todayISO())
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [showPrompt, setShowPrompt] = useState(false)
  const [pairId, setPairId] = useState<string | undefined>()

  async function discoverPairId() {
    const { data: u } = await supabase.auth.getUser()
    const uid = u?.user?.id
    if (!uid) return
    // find any pair that this user belongs to (there should be exactly one)
    const { data: rows, error } = await supabase
      .from('pair_members')
      .select('pair_id')
      .eq('user_id', uid)
      .limit(1)
    if (!error && rows && rows.length) setPairId(rows[0].pair_id as string)
  }

  async function loadAll(pid: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('pair_id', pid)
      .order('date', { ascending: false })
    if (!error && data) setEntries(data as Entry[])
    setLoading(false)
  }

  useEffect(() => {
    discoverPairId()
  }, [])

  useEffect(() => {
    if (pairId) loadAll(pairId)
  }, [pairId])

  useEffect(() => {
    setShowPrompt(mood === 'meh' || mood === 'rough')
  }, [mood])

  async function save() {
    if (!text.trim() || !pairId) return
    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData?.user?.id
    if (!user_id) return
    const { error } = await supabase
      .from('entries')
      .insert({ pair_id: pairId, user_id, date, author, mood, text: text.trim() })
    if (!error) {
      setText('')
      setMood('ok')
      loadAll(pairId)
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (!error && pairId) loadAll(pairId)
  }

  const todays = entries.filter((e) => e.date === date)

  const wordCounts = useMemo(() => {
    const counts = new Map<string, number>()
    entries.forEach((e) => {
      e.text
        .toLowerCase()
        .replace(/[^a-z\s']/g, ' ')
        .split(/\s+/)
        .filter((w) => w && !STOPWORDS.has(w))
        .forEach((w) => counts.set(w, (counts.get(w) || 0) + 1))
    })
    return Array.from(counts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
  }, [entries])

  function addDays(base: Date, d: number) {
    const x = new Date(base)
    x.setDate(x.getDate() + d)
    return x
  }
  function dateKey(d: Date) {
    return d.toISOString().slice(0, 10)
  }
  const { personalStreak, togetherStreak } = useMemo(() => {
    const meDays = new Set(entries.filter((e) => e.author === 'Me').map((e) => e.date))
    const youDays = new Set(entries.filter((e) => e.author === 'You').map((e) => e.date))
    const myDays = new Set(entries.filter((e) => e.author === author).map((e) => e.date))

    let personal = 0
    let together = 0
    for (let i = 0; ; i++) {
      const k = dateKey(addDays(new Date(), -i))
      if (myDays.has(k)) personal++
      else break
    }
    for (let i = 0; ; i++) {
      const k = dateKey(addDays(new Date(), -i))
      if (meDays.has(k) && youDays.has(k)) together++
      else break
    }
    return { personalStreak: personal, togetherStreak: together }
  }, [entries, author])

  function startOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }
  function endOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
  }
  const now = new Date()
  const monthDays = (() => {
    const days: Date[] = []
    for (let d = new Date(startOfMonth(now)); d <= endOfMonth(now); d.setDate(d.getDate() + 1))
      days.push(new Date(d))
    return days
  })()

  function scoreColor(score?: number) {
    if (score == null) return 'bg-gray-100'
    if (score >= 1.5) return 'bg-green-500'
    if (score >= 0.5) return 'bg-green-300'
    if (score > -0.5) return 'bg-gray-300'
    if (score > -1.5) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600" />
          <h1 className="font-semibold tracking-tight">One-Line-A-Day</h1>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          {['today', 'archive', 'streaks'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={
                t === tab
                  ? 'px-3 py-1.5 rounded-xl bg-gray-900 text-white'
                  : 'px-3 py-1.5 rounded-xl hover:bg-gray-100'
              }
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'today' && (
        <section className="space-y-4 mt-4">
          <div className="rounded-2xl border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-xl border overflow-hidden">
                <button
                  onClick={() => setAuthor('Me')}
                  className={
                    author === 'Me'
                      ? 'px-3 py-2 text-sm bg-gray-900 text-white'
                      : 'px-3 py-2 text-sm hover:bg-gray-50'
                  }
                >
                  Me
                </button>
                <button
                  onClick={() => setAuthor('You')}
                  className={
                    author === 'You'
                      ? 'px-3 py-2 text-sm bg-gray-900 text-white'
                      : 'px-3 py-2 text-sm hover:bg-gray-50'
                  }
                >
                  You
                </button>
              </div>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 rounded-xl border outline-none focus:ring-2"
              />
              <div className="flex items-center gap-1">
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    title={m.label}
                    onClick={() => setMood(m.key)}
                    className={
                      'px-2.5 py-1.5 rounded-xl text-sm border hover:bg-gray-50 flex items-center gap-1 ' +
                      (mood === m.key ? 'ring-2 ring-gray-300' : '')
                    }
                  >
                    <span>{m.emoji}</span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={save}
                  disabled={!text.trim() || !pairId}
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setText('')}
                  className="px-3 py-2 rounded-xl border text-sm"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-3">
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={220}
                placeholder="One sentence about today…"
                className="w-full resize-none rounded-xl border p-3 outline-none focus:ring-2"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>{220 - text.length} chars left</span>
                {(mood === 'meh' || mood === 'rough') && (
                  <button className="underline" onClick={() => setShowPrompt((s) => !s)}>
                    {showPrompt ? 'Hide' : 'Need a golden prompt?'}
                  </button>
                )}
              </div>
              {showPrompt && (
                <div className="mt-3 rounded-xl border bg-amber-50 text-amber-900 p-3 text-sm">
                  <div className="font-medium">Golden prompt ✨</div>
                  <div className="mt-1">
                    {GOLDEN_PROMPTS[Math.floor(Math.random() * GOLDEN_PROMPTS.length)]}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="font-medium">
              Mood calendar · {new Date().toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                <div key={d} className="text-center text-xs text-gray-500">
                  {d}
                </div>
              ))}
              {(() => {
                const pad = monthDays[0].getDay()
                return Array.from({ length: pad }).map((_, i) => <div key={'pad-' + i} />)
              })()}
              {(() => {
                const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                const nodes: JSX.Element[] = []
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  const k = d.toISOString().slice(0, 10)
                  const todays = entries.filter((e) => e.date === k)
                  const avg = todays.length
                    ? todays.reduce((s, e) => s + (MOODS.find((m) => m.key === e.mood)?.score || 0), 0) /
                      todays.length
                    : undefined
                  const color = scoreColor(avg)
                  nodes.push(
                    <div key={k} className="flex flex-col items-center gap-1">
                      <div
                        className={'w-8 h-8 rounded-lg border ' + color}
                        title={k + (avg != null ? ` · ${avg.toFixed(1)}` : '')}
                      />
                      <div className="text-[10px] text-gray-500">{d.getDate()}</div>
                    </div>
                  )
                }
                return nodes
              })()}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="font-medium mb-2">Today’s entries</div>
            <div className="space-y-2">
              {todays.map((e) => (
                <div key={e.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <div className="text-sm font-medium min-w-14 px-2 py-1 rounded-lg bg-gray-100 text-center">
                    {e.author}
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{MOODS.find((m) => m.key === e.mood)?.emoji}</span>
                      <span className="text-gray-500">{e.date}</span>
                    </div>
                    <div className="mt-1 leading-relaxed">{e.text}</div>
                  </div>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-900 text-white"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {!todays.length && (
                <div className="text-sm text-gray-500">Nothing yet — write one line ✍️</div>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'archive' && <Archive entries={entries} onDelete={(id) => remove(id)} />}

      {tab === 'streaks' && (
        <Streaks
          entries={entries}
          wordCounts={wordCounts}
          personalStreak={personalStreak}
          togetherStreak={togetherStreak}
        />
      )}
    </div>
  )
}

function Archive({
  entries,
  onDelete
}: {
  entries: Entry[]
  onDelete: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [mood, setMood] = useState<'all' | MoodKey>('all')
  const filtered = entries
    .filter((e) => (mood === 'all' ? true : e.mood === mood))
    .filter((e) => (q ? e.text.toLowerCase().includes(q.toLowerCase()) : true))
  return (
    <section className="space-y-4 mt-4">
      <div className="rounded-2xl border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search text…"
            className="px-3 py-2 rounded-xl border outline-none focus:ring-2"
          />
          <select
            value={mood}
            onChange={(e) => setMood(e.target.value as any)}
            className="px-3 py-2 rounded-xl border"
          >
            <option value="all">All moods</option>
            {MOODS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-500 flex items-center">{filtered.length} entries</div>
        </div>
      </div>
      <div className="grid gap-3">
        {filtered
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((e) => (
            <div key={e.id} className="rounded-2xl border p-4 flex items-start gap-3">
              <div className="text-sm min-w-20 text-gray-500">{e.date}</div>
              <div className="text-xl">{MOODS.find((m) => m.key === e.mood)?.emoji}</div>
              <div className="flex-1">
                <div className="text-sm font-medium">{e.author}</div>
                <div className="mt-0.5 leading-relaxed">{e.text}</div>
              </div>
              <button
                onClick={() => onDelete(e.id)}
                className="text-xs px-2 py-1 rounded-lg bg-gray-900 text-white"
              >
                Delete
              </button>
            </div>
          ))}
        {!filtered.length && (
          <div className="text-center text-sm text-gray-500 py-10">No matching entries yet.</div>
        )}
      </div>
    </section>
  )
}

function Streaks({
  entries,
  wordCounts,
  personalStreak,
  togetherStreak
}: {
  entries: Entry[]
  wordCounts: { word: string; count: number }[]
  personalStreak: number
  togetherStreak: number
}) {
  const topWords = wordCounts.slice(0, 40)
  const max = topWords[0]?.count || 1

  const monthlyCounts = Array.from({ length: 12 }).map((_, i) => {
    const y = new Date().getFullYear()
    const m = i
    const yyyy_mm = new Date(y, m, 1).toISOString().slice(0, 7)
    const count = entries.filter((e) => e.date.startsWith(yyyy_mm)).length
    return { month: new Date(y, m, 1).toLocaleString(undefined, { month: 'short' }), count }
  })

  return (
    <section className="space-y-6 mt-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Personal streak</div>
          <div className="text-4xl font-bold mt-1">🔥 {personalStreak} days</div>
          <div className="text-xs text-gray-500 mt-2">Current run of days you wrote something.</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-500">Together streak</div>
          <div className="text-4xl font-bold mt-1">❤️ {togetherStreak} days</div>
          <div className="text-xs text-gray-500 mt-2">Consecutive days with entries from both.</div>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="font-medium">Word cloud</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {topWords.map((w, idx) => (
            <span
              key={w.word + idx}
              className="inline-block leading-none"
              style={{ fontSize: 12 + Math.round((w.count / max) * 26) }}
              title={`${w.word} · ${w.count}`}
            >
              {w.word}
            </span>
          ))}
          {!topWords.length && (
            <div className="text-sm text-gray-500">Write a few days to unlock your cloud ☁️</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="font-medium">Entries this year</div>
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {monthlyCounts.map((m) => (
            <div key={m.month} className="rounded-xl border p-3 text-center">
              <div className="text-xs text-gray-500">{m.month}</div>
              <div className="text-xl font-semibold">{m.count}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
