import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BrandMarquee from '../components/BrandMarquee'

const preferences = vi.hoisted(() => ({ reduced: false }))
vi.mock('motion/react', () => ({ useReducedMotion: () => preferences.reduced }))

function Location() {
  const location = useLocation()
  return (
    <output aria-label="Current location">
      {location.pathname}
      {location.search}
    </output>
  )
}
function setup() {
  render(
    <MemoryRouter>
      <BrandMarquee brands={[]} />
      <Location />
    </MemoryRouter>,
  )
  const region = screen.getByRole('region', { name: /Daftar brand/ })
  region.setPointerCapture = vi.fn()
  region.hasPointerCapture = vi.fn(() => true)
  region.releasePointerCapture = vi.fn()
  return region
}

class TestPointerEvent extends MouseEvent {
  pointerId: number
  isPrimary: boolean
  constructor(type: string, options: PointerEventInit = {}) {
    super(type, options)
    this.pointerId = options.pointerId ?? 1
    this.isPrimary = options.isPrimary ?? true
  }
}

let frames: FrameRequestCallback[]
beforeEach(() => {
  preferences.reduced = false
  frames = []
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1500)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function advanceFrame(time: number) {
  act(() => {
    frames.shift()!(time)
  })
}

describe('brand marquee interactions', () => {
  it('continues moving while the pointer hovers over logos', () => {
    const region = setup()
    fireEvent.pointerEnter(region)
    const before = region.scrollLeft
    advanceFrame(100)
    advanceFrame(150)
    expect(region.scrollLeft).toBeGreaterThan(before)
  })

  it('supports dragging in both directions and resumes movement after release', () => {
    const region = setup()
    fireEvent.pointerDown(region, { clientX: 200, pointerId: 1, button: 0 })
    fireEvent.pointerMove(region, { clientX: 100, pointerId: 1 })
    expect(region.scrollLeft).toBe(1600)
    fireEvent.pointerMove(region, { clientX: 250, pointerId: 1 })
    expect(region.scrollLeft).toBe(1450)
    fireEvent.scroll(region)
    expect(region.scrollLeft).toBe(2950)
    fireEvent.pointerUp(window, { pointerId: 1 })
    advanceFrame(100)
    advanceFrame(150)
    expect(region.scrollLeft).toBeGreaterThan(2950)
  })

  it('opens brand links on a click but prevents accidental navigation after a swipe', () => {
    const region = setup()
    const link = screen.getAllByRole('link')[0]
    fireEvent.pointerDown(link, { clientX: 200, pointerId: 1, button: 0 })
    fireEvent.pointerMove(region, { clientX: 100, pointerId: 1 })
    fireEvent.pointerUp(region, { pointerId: 1 })
    fireEvent.click(link)
    expect(screen.getByLabelText('Current location')).toHaveTextContent(/^\/$/)
    fireEvent.pointerDown(link, { clientX: 200, pointerId: 2, button: 0 })
    fireEvent.pointerUp(link, { pointerId: 2 })
    fireEvent.click(link)
    expect(screen.getByLabelText('Current location')).toHaveTextContent('/gadget?brand=')
  })

  it('allows keyboard scrolling without autoplay for reduced motion', () => {
    preferences.reduced = true
    const region = setup()
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(region.scrollLeft).toBe(144)
    fireEvent.keyDown(region, { key: 'ArrowLeft' })
    expect(region.scrollLeft).toBe(0)
    expect(region.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })
})
