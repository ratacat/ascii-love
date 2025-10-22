import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CanvasViewport } from './CanvasViewport'
import { BASE_UNIT_PX } from '@shared/constants/canvas'
import { useEditorStore } from '@shared/state/editorStore'

describe('CanvasViewport zoom anchoring', () => {
  const store = useEditorStore

  let zoomSpy: ReturnType<typeof vi.fn>
  let originalZoom: ReturnType<typeof store.getState>['zoomViewport']
  let originalViewport: {
    offset: { x: number; y: number }
    scale: number
  }

  const testViewport = {
    offset: { x: 96, y: -48 },
    scale: 1.5,
  }

  beforeEach(() => {
    const state = store.getState()
    originalZoom = state.zoomViewport
    originalViewport = {
      offset: { ...state.viewport.offset },
      scale: state.viewport.scale,
    }

    zoomSpy = vi.fn()

    act(() => {
      store.setState((draft) => {
        draft.zoomViewport = zoomSpy as typeof draft.zoomViewport
        draft.viewport.offset.x = testViewport.offset.x
        draft.viewport.offset.y = testViewport.offset.y
        draft.viewport.scale = testViewport.scale
      })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    act(() => {
      store.setState((draft) => {
        draft.zoomViewport = originalZoom
        draft.viewport.offset.x = originalViewport.offset.x
        draft.viewport.offset.y = originalViewport.offset.y
        draft.viewport.scale = originalViewport.scale
      })
    })
  })

  it('passes viewport offset into the zoom anchor', () => {
    const { container } = render(<CanvasViewport />)
    const stage = container.querySelector('.canvas-viewport__canvas') as HTMLDivElement | null
    expect(stage).not.toBeNull()

    const rect = {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      toJSON: () => ({}),
    } as DOMRect

    vi.spyOn(stage!, 'getBoundingClientRect').mockReturnValue(rect)

    const docX = 12
    const docY = 5
    const paddingUnits = 200
    const unitSize = BASE_UNIT_PX * testViewport.scale
    const clientX = (docX + paddingUnits) * unitSize + rect.left
    const clientY = (docY + paddingUnits) * unitSize + rect.top

    const wheelEvent = new WheelEvent('wheel', {
      clientX,
      clientY,
      deltaY: -120,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    act(() => {
      stage!.dispatchEvent(wheelEvent)
    })

    expect(zoomSpy).toHaveBeenCalledTimes(1)
    const [scaleFactor, anchor] = zoomSpy.mock.calls[0]!

    expect(scaleFactor).toBeCloseTo(Math.exp(0.18), 5)
    expect(anchor).toMatchObject({
      x: docX * unitSize + testViewport.offset.x,
      y: docY * unitSize + testViewport.offset.y,
    })
  })
})
