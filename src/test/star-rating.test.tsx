import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StarRating, { RatingStars } from '../components/StarRating'
import ReviewForm from '../features/ReviewForm'
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  isConfigured: true,
  requireSupabase: () => ({ functions: { invoke: mocks.invoke } }),
}))
vi.mock('../components/Turnstile', () => ({
  default: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken('test-captcha')}>
      Selesaikan verifikasi
    </button>
  ),
}))
function Choice() {
  const [value, setValue] = useState(0)
  return <StarRating value={value} onChange={setValue} />
}
beforeEach(() => {
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-public-sitekey')
  mocks.invoke.mockReset().mockResolvedValue({ data: { success: true }, error: null })
})
afterEach(() => vi.unstubAllEnvs())
describe('star-only rating selection', () => {
  it('starts with five unselected stars and no dropdown', () => {
    render(<Choice />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Penilaian' }).querySelectorAll('svg.fill-yellow-400'),
    ).toHaveLength(0)
  })
  it.each([1, 2, 3, 4, 5])('colors exactly %i stars yellow after selection', (value) => {
    render(<Choice />)
    fireEvent.click(screen.getByRole('radio', { name: `${value} bintang` }))
    const icons = screen.getByRole('group', { name: 'Penilaian' }).querySelectorAll('svg')
    expect(icons).toHaveLength(5)
    icons.forEach((icon, index) =>
      expect(icon).toHaveClass(index < value ? 'fill-yellow-400' : 'fill-transparent'),
    )
    expect(screen.getByRole('radio', { name: `${value} bintang` })).toBeChecked()
  })
  it('clears higher stars when changing from five to one', () => {
    render(<Choice />)
    fireEvent.click(screen.getByRole('radio', { name: '5 bintang' }))
    fireEvent.click(screen.getByRole('radio', { name: '1 bintang' }))
    expect(
      screen.getByRole('group', { name: 'Penilaian' }).querySelectorAll('svg.fill-yellow-400'),
    ).toHaveLength(1)
    expect(screen.getByRole('radio', { name: '5 bintang' })).not.toBeChecked()
  })
  it('shows all five stars on a published one-star review', () => {
    render(<RatingStars value={1} />)
    const rating = screen.getByRole('img', { name: '1 dari 5 bintang' })
    expect(rating.querySelectorAll('svg')).toHaveLength(5)
    expect(rating.querySelectorAll('svg.fill-yellow-400')).toHaveLength(1)
    expect(rating.querySelectorAll('svg.fill-transparent')).toHaveLength(4)
  })
})
async function review() {
  render(
    <MemoryRouter>
      <ReviewForm />
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('Nama tampilan'), { target: { value: 'Customer' } })
  fireEvent.change(screen.getByLabelText('Pengalaman kamu'), {
    target: { value: 'Pengalaman belanja saya sangat baik.' },
  })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Selesaikan verifikasi' }))
}
it('sends the selected star value as a number', async () => {
  await review()
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Penilaian' })).getByRole('radio', {
      name: '3 bintang',
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Kirim ulasan' }))
  await waitFor(() =>
    expect(mocks.invoke).toHaveBeenCalledWith('submit-review', {
      body: expect.objectContaining({ rating: 3 }),
    }),
  )
  expect(
    await screen.findByText('Terima kasih. Ulasan sudah diterima dan menunggu moderasi.'),
  ).toBeInTheDocument()
})
it('requires a star selection before sending a review', async () => {
  await review()
  fireEvent.submit(screen.getByRole('button', { name: 'Kirim ulasan' }).closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('penilaian bintang')
  expect(mocks.invoke).not.toHaveBeenCalled()
})
