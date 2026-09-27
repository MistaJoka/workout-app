import { countLabel } from '../format'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ROTATION,
  foundationStrengthStarterTemplates,
  templateById,
} from '../../domain/content/fixtures/foundationStrengthStarter'
import { getTemplate } from '../../domain/content/catalog'
import { getInProgressSessions, getPlan } from '../../infrastructure/db/repositories/sessionRepository'
import { listCustomTemplates } from '../../infrastructure/db/repositories/customTemplateRepository'
import { getWeeklySchedule } from '../../infrastructure/db/repositories/scheduleRepository'
import { db } from '../../infrastructure/db/schema'
import type { SessionPlan } from '../../domain/session/types'
import type { WorkoutTemplate } from '../../domain/content/types'
import { WEEKDAY_LABELS, isScheduleSet, resolveToday, type TodayResolution, type Weekday } from '../../domain/schedule/weeklySchedule'
import { WelcomeCard } from '../components/WelcomeCard'
import { RaeHero } from '../components/RaeHero'
import { dayPart, greeting } from '../greeting'
import { activeProfile } from '../../infrastructure/profiles'

function estimateMinutes(template: WorkoutTemplate | undefined): number {
  if (!template) return 0
  // ~3s per rep, plus ~15s per set to get into position; rounded up to 5 min.
  const seconds = template.exercises.reduce((sum, e) => {
    const work = e.prescription.timeSeconds ?? (e.prescription.reps ?? 0) * 3
    return sum + e.prescription.sets * (work + e.prescription.restSeconds + 15)
  }, 0)
  return Math.max(5, Math.ceil(seconds / 60 / 5) * 5)
}

type Plan = {
  today: TodayResolution
  scheduledTemplate: WorkoutTemplate | undefined
  hasSchedule: boolean
}

export function TodayScreen() {
  const [inProgress, setInProgress] = useState<SessionPlan[] | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [custom, setCustom] = useState<WorkoutTemplate[]>([])
  const [profile] = useState(() => activeProfile())
  const [now] = useState(() => new Date())

  useEffect(() => {
    getInProgressSessions().then(setInProgress)
    resolve().then(setPlan)
    listCustomTemplates().then(setCustom)
  }, [])

  async function suggestNext(): Promise<string> {
    const results = await db.sessionResults.toArray()
    const latest = [...results].sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    for (const result of latest) {
      const sessionPlan = await getPlan(result.planId)
      const index = sessionPlan ? ROTATION.indexOf(sessionPlan.templateId) : -1
      if (index >= 0) return ROTATION[(index + 1) % ROTATION.length]
    }
    return ROTATION[0]
  }

  async function resolve(): Promise<Plan> {
    const [schedule, suggestion] = await Promise.all([getWeeklySchedule(), suggestNext()])
    const today = resolveToday(schedule, new Date(), suggestion)
    const scheduledTemplate = today.kind === 'scheduled' ? await getTemplate(today.templateId) : undefined
    // A scheduled routine that no longer exists (deleted custom) falls back to rotation.
    const effective: TodayResolution =
      today.kind === 'scheduled' && !scheduledTemplate ? { kind: 'unscheduled', templateId: suggestion } : today
    return { today: effective, scheduledTemplate, hasSchedule: isScheduleSet(schedule) }
  }

  const suggestedId = plan?.today.kind === 'unscheduled' ? plan.today.templateId : null
  const weekday = WEEKDAY_LABELS[new Date().getDay() as Weekday]
  const ordered = [...foundationStrengthStarterTemplates].sort((a, b) =>
    a.id === suggestedId ? -1 : b.id === suggestedId ? 1 : 0
  )
  const scheduledId = plan?.today.kind === 'scheduled' ? plan.today.templateId : null

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">{greeting(now, profile.name)}</h1>

      <RaeHero part={dayPart(now)} />

      <WelcomeCard />

      {inProgress === null && <p className="text-ink-muted">Loading…</p>}

      {inProgress && inProgress.length > 0 && (
        <Link to={`/session/${inProgress[0].id}`} className="block field-calm p-4">
          <p className="font-bold">Resume workout</p>
          <p className="text-sm text-ink-muted">You have one in progress</p>
        </Link>
      )}

      {plan?.today.kind === 'scheduled' && plan.scheduledTemplate && (
        <Link to={`/checkin/${plan.scheduledTemplate.id}`} className="block field-primary p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold">{plan.scheduledTemplate.name}</p>
            <span className="badge-primary">{weekday}</span>
          </div>
          <p className="text-sm text-ink-muted">
            {countLabel(plan.scheduledTemplate.exercises.length, 'exercise')}, about{' '}
            {estimateMinutes(plan.scheduledTemplate)} min
          </p>
        </Link>
      )}

      {plan?.today.kind === 'rest' && (
        <div className="field-calm p-4">
          <p className="text-lg font-bold">Rest day</p>
          <p className="text-sm text-ink-muted">Nothing planned for {weekday}. Any routine below is still one tap away.</p>
        </div>
      )}

      {ordered
        .filter((template) => template.id !== scheduledId)
        .map((template) => {
          const suggested = template.id === suggestedId
          return (
            <Link
              key={template.id}
              to={`/checkin/${template.id}`}
              className={`block p-4 ${suggested ? 'field-primary' : 'card'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold">{template.name}</p>
                {suggested && <span className="badge-primary">Up next</span>}
              </div>
              <p className="text-sm text-ink-muted">
                {countLabel(template.exercises.length, 'exercise')}, about {estimateMinutes(templateById.get(template.id))} min
              </p>
            </Link>
          )
        })}

      {custom.filter((template) => template.id !== scheduledId).length > 0 && (
        <>
          <p className="pt-2 text-sm font-semibold text-ink-muted">Your routines</p>
          {custom
            .filter((template) => template.id !== scheduledId)
            .map((template) => (
              <Link key={template.id} to={`/checkin/${template.id}`} className="block card p-4">
                <p className="text-lg font-semibold">{template.name}</p>
                <p className="text-sm text-ink-muted">
                  {countLabel(template.exercises.length, 'exercise')}, about {estimateMinutes(template)} min
                </p>
              </Link>
            ))}
        </>
      )}

      {/* The one way into the weekly schedule (Library used to have a
          second, differently named link). */}
      {plan && (
        <Link to="/schedule" className="block text-center text-sm font-semibold text-primary">
          {plan.hasSchedule ? 'Edit your week' : 'Set up your week'}
        </Link>
      )}
    </div>
  )
}
