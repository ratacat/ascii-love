/*
 * Development-only console relay. Mirrors console errors/warnings and runtime
 * exceptions to the Vite dev server so they can be persisted to disk. Useful
 * when remote automation cannot easily read the browser console directly.
 */

const setupConsoleRelay = () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return
  }

  const flag = '__asciiConsoleRelayInstalled__'
  if ((window as unknown as Record<string, unknown>)[flag]) {
    return
  }
  ;(window as unknown as Record<string, unknown>)[flag] = true

  const transmit = (line: string) => {
    const payload = `${line}\n`

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'text/plain' })
      navigator.sendBeacon('/__console-relay', blob)
      return
    }

    fetch('/__console-relay', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Ignored: the dev server may be restarting or unavailable.
    })
  }

  const formatArgs = (args: unknown[]): string =>
    args
      .map((arg) => {
        if (typeof arg === 'string') {
          return arg
        }
        try {
          return JSON.stringify(arg)
        } catch (error) {
          return String(arg)
        }
      })
      .join(' ')

  const logLine = (level: string, args: unknown[], stack?: string) => {
    const timestamp = new Date().toISOString()
    const message = formatArgs(args)
    const pieces = [`[${timestamp}]`, level.toUpperCase(), message]
    if (stack) {
      pieces.push('\n', stack)
    }
    transmit(pieces.join(' '))
  }

  ;(['error', 'warn'] as const).forEach((level) => {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      logLine(level, args)
    }
  })

  window.addEventListener('error', (event) => {
    logLine('error', [event.message, `@ ${event.filename}:${event.lineno}:${event.colno}`], event.error?.stack)
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const args = ['Unhandled promise rejection', reason]
    const stack = typeof reason === 'object' && reason ? (reason as Error).stack : undefined
    logLine('error', args, stack)
  })
}

setupConsoleRelay()

export {}
