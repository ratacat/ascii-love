import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PanelChrome } from '../PanelChrome'

describe('PanelChrome', () => {
  afterEach(() => {
    cleanup()
  })

  it('collapses the panel body when toggled', () => {
    render(
      <PanelChrome id="palette" title="Palette Manager">
        <div data-testid="panel-body">Panel content</div>
      </PanelChrome>,
    )

    const toggle = screen.getByRole('button', { name: /palette manager/i })
    const body = screen.getByTestId('panel-body')

    expect(body).toBeVisible()

    fireEvent.click(toggle)

    expect(body.closest('.panel__body')).not.toBeVisible()

    fireEvent.click(toggle)

    expect(body.closest('.panel__body')).toBeVisible()
  })
})
