import { useState } from 'react'
import type { FormEvent } from 'react'
import './AddEquipmentForm.css'

type Feedback = { kind: 'success' | 'error'; text: string }

export default function AddEquipmentForm() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('available')
  const [date, setDate] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const cleanName = name.trim().replace(/\s+/g, ' ')
    if (!cleanName) {
      setFeedback({ kind: 'error', text: 'Name is required.' })
      return
    }
    if (!date) {
      setFeedback({ kind: 'error', text: 'Acquisition date is required.' })
      return
    }

    setFeedback({
      kind: 'success',
      text: `Valid! Would add: ${cleanName} (${status}, ${date}). Nothing was saved.`,
    })
  }

  return (
    <form className="equipment-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dell Optiplex 7090"
        />
      </label>

      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="available">Available</option>
          <option value="on_loan">On loan</option>
          <option value="under_maintenance">Under maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </label>

      <label>
        Acquisition date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <button type="submit">Add equipment</button>

      {feedback && (
        <p role="status" className={`form-message ${feedback.kind}`}>
          {feedback.text}
        </p>
      )}
    </form>
  )
}