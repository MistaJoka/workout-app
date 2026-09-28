import { describe, expect, it } from 'vitest'
import { dayPart, greeting, longDate } from './greeting'

const at = (h: number) => new Date(2026, 8, 26, h, 30)

describe('dayPart', () => {
  it('splits the day at 5, 12, 17 and 21', () => {
    expect(dayPart(at(4))).toBe('night')
    expect(dayPart(at(5))).toBe('morning')
    expect(dayPart(at(12))).toBe('afternoon')
    expect(dayPart(at(17))).toBe('evening')
    expect(dayPart(at(21))).toBe('night')
  })
})

describe('greeting', () => {
  it('adds a real profile name', () => {
    expect(greeting(at(9), 'Andrae')).toBe('Good morning, Andrae')
  })

  it('leaves out the default "Me" profile name and blanks', () => {
    expect(greeting(at(18), 'Me')).toBe('Good evening')
    expect(greeting(at(14), '  ')).toBe('Good afternoon')
    expect(greeting(at(14))).toBe('Good afternoon')
  })

  it('says good evening late at night', () => {
    expect(greeting(at(23), 'Rae')).toBe('Good evening, Rae')
  })
})

describe('longDate', () => {
  it('names the weekday, month and day', () => {
    expect(longDate(new Date(2026, 8, 28, 10))).toBe('Monday, September 28')
  })
})
