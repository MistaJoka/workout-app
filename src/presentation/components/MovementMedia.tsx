import { useTheme } from '../theme/ThemeContext'

type Props = {
  name: string
  start?: string
  finish?: string
}

// Two-frame movement loop from the exercise's start/finish photos. With
// motion 'full' the frames alternate; with 'reduced'/'off' both frames sit
// side by side so the movement is still fully visible without animation
// (SOURCE_OF_TRUTH_V06.md §11: motion preference must not remove information).
export function MovementMedia({ name, start, finish }: Props) {
  const { motion } = useTheme()

  if (!start || !finish) return null

  if (motion !== 'full') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <img src={start} alt={`${name} — start position`} className="w-full rounded-panel object-cover" />
        <img src={finish} alt={`${name} — end position`} className="w-full rounded-panel object-cover" />
      </div>
    )
  }

  return (
    <div className="movement-loop relative w-full overflow-hidden rounded-panel" aria-label={`${name} movement`}>
      <img src={start} alt={`${name} — start position`} className="max-h-[34vh] w-full object-cover" />
      <img
        src={finish}
        alt=""
        aria-hidden="true"
        className="movement-loop__finish absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}
