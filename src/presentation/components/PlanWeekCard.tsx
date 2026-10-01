import { Link } from 'react-router-dom'

// Offered on Today until any day is planned (shouldOfferPlanWeek): the
// weekly goal and Calendar reminders both follow the plan. It sits right
// under WeekBlooms, whose seven pots already show the week, so it is just a
// line and a button; Rae stars in the room above, so no second Rae here.
export function PlanWeekCard() {
  return (
    <section aria-labelledby="plan-week-title" className="field-calm space-y-3 p-4">
      <div>
        <h2 id="plan-week-title" className="font-bold">
          Plan your week
        </h2>
        <p className="text-sm">Pick your workout days. Your goal and reminders follow along.</p>
      </div>
      <Link to="/schedule" className="btn-primary w-full">
        Plan my week
      </Link>
    </section>
  )
}
