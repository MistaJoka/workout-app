import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canInstall, listenForInstallPrompt, promptInstall, resetInstallPromptForTests, subscribeInstall } from './installPrompt'

function fakeWindow() {
  const handlers = new Map<string, (e: Event) => void>()
  return {
    addEventListener: (type: string, fn: (e: Event) => void) => handlers.set(type, fn),
    fire: (type: string, event: Event) => handlers.get(type)?.(event),
  }
}

function installEvent(outcome: 'accepted' | 'dismissed') {
  return Object.assign(new Event('beforeinstallprompt'), {
    preventDefault: vi.fn(),
    prompt: vi.fn(async () => undefined),
    userChoice: Promise.resolve({ outcome }),
  })
}

beforeEach(() => resetInstallPromptForTests())

describe('install prompt', () => {
  it('holds Chrome’s offer and tells subscribers', () => {
    const win = fakeWindow()
    listenForInstallPrompt(win as unknown as Window)
    const seen: boolean[] = []
    subscribeInstall((v) => seen.push(v))
    const e = installEvent('accepted')
    win.fire('beforeinstallprompt', e)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(canInstall()).toBe(true)
    expect(seen).toEqual([false, true])
  })

  it('prompts once, then the offer is spent', async () => {
    const win = fakeWindow()
    listenForInstallPrompt(win as unknown as Window)
    const e = installEvent('accepted')
    win.fire('beforeinstallprompt', e)
    expect(await promptInstall()).toBe('accepted')
    expect(e.prompt).toHaveBeenCalledTimes(1)
    expect(canInstall()).toBe(false)
    expect(await promptInstall()).toBe('unavailable')
  })

  it('forgets the offer once the app is installed', () => {
    const win = fakeWindow()
    listenForInstallPrompt(win as unknown as Window)
    win.fire('beforeinstallprompt', installEvent('dismissed'))
    win.fire('appinstalled', new Event('appinstalled'))
    expect(canInstall()).toBe(false)
  })
})
