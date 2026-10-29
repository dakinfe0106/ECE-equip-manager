import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  AssetLookupError,
  createAsset,
  fetchCategories,
  fetchEquipmentTypes,
  type CategoryOption,
  type AssetRecord,
  type EquipmentTypeOption,
} from '../api'
import './AddAssetForm.css'

interface AddAssetFormProps {
  onCancel?: () => void
  onCreated?: (asset: AssetRecord) => void
  onSubmittingChange?: (isSubmitting: boolean) => void
  isModal?: boolean
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AssetLookupError && error.status === 403) {
    if (error.message.toLowerCase().includes('csrf')) {
      return 'The request could not be verified. Refresh the page and try again.'
    }
    return 'Your account does not have permission to add assets.'
  }
  if (error instanceof AssetLookupError) {
    return error.message
  }
  return 'Could not connect to equipment records. Please try again.'
}

export default function AddAssetForm({
  onCancel,
  onCreated,
  onSubmittingChange,
  isModal = false,
}: AddAssetFormProps) {
  const navigate = useNavigate()
  const [assetIdentifier, setAssetIdentifier] = useState('')
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [equipmentTypeId, setEquipmentTypeId] = useState('')
  const [acquisitionDate, setAcquisitionDate] = useState('')
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeOption[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isCurrent = true
    fetchCategories()
      .then((items) => {
        if (isCurrent) setCategories(items)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (isCurrent) setIsLoadingCategories(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (!categoryId) {
      return
    }

    let isCurrent = true
    fetchEquipmentTypes(Number(categoryId))
      .then((items) => {
        if (isCurrent) setEquipmentTypes(items)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (isCurrent) setIsLoadingTypes(false)
      })

    return () => {
      isCurrent = false
    }
  }, [categoryId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!assetIdentifier.trim() || !name.trim() || !categoryId || !equipmentTypeId) {
      setError('Please complete all required fields.')
      return
    }

    setIsSubmitting(true)
    onSubmittingChange?.(true)
    try {
      const asset = await createAsset({
        asset_identifier: assetIdentifier.trim(),
        name: name.trim(),
        equipment_type_id: Number(equipmentTypeId),
        acquisition_date: acquisitionDate || null,
      })
      if (onCreated) {
        onCreated(asset)
        return
      }
      setSuccessMessage(`Asset ${asset.asset_identifier} was added successfully.`)
      setAssetIdentifier('')
      setName('')
      setCategoryId('')
      setEquipmentTypeId('')
      setEquipmentTypes([])
      setAcquisitionDate('')
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError))
    } finally {
      setIsSubmitting(false)
      onSubmittingChange?.(false)
    }
  }

  return (
    <section className={`add-asset${isModal ? ' add-asset--modal' : ''}`} aria-labelledby="add-asset-title">
      <header className="add-asset__header">
        <div>
          <p className="add-asset__eyebrow">New record</p>
          {isModal
            ? <h2 id="add-asset-title">Add Asset</h2>
            : <h1 id="add-asset-title">Add New Asset</h1>}
          <p className="add-asset__description">
            Enter the details below to register an equipment asset.
          </p>
        </div>
        {isModal && onCancel && (
          <button
            className="add-asset__close"
            type="button"
            aria-label="Close add asset dialog"
            disabled={isSubmitting}
            onClick={onCancel}
          >×</button>
        )}
      </header>

      <form className="add-asset__form" onSubmit={handleSubmit} noValidate>
        <div className="add-asset__grid">
          <div className="add-asset__field">
            <label htmlFor="asset-id">Asset ID <span>*</span></label>
            <input
              id="asset-id"
              name="asset_identifier"
              value={assetIdentifier}
              onChange={(event) => setAssetIdentifier(event.target.value)}
              placeholder="e.g. ECE-001"
              maxLength={100}
              autoFocus={isModal}
              required
            />
          </div>

          <div className="add-asset__field">
            <label htmlFor="asset-name">Asset name <span>*</span></label>
            <input
              id="asset-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Digital Multimeter"
              maxLength={255}
              required
            />
          </div>

          <div className="add-asset__field">
            <label htmlFor="asset-category">Category <span>*</span></label>
            <select
              id="asset-category"
              name="category_id"
              value={categoryId}
              onChange={(event) => {
                const nextCategoryId = event.target.value
                setCategoryId(nextCategoryId)
                setEquipmentTypes([])
                setEquipmentTypeId('')
                setIsLoadingTypes(Boolean(nextCategoryId))
                setError('')
              }}
              disabled={isLoadingCategories || categories.length === 0}
              required
            >
              <option value="">
                {isLoadingCategories ? 'Loading categories…' : 'Select a category'}
              </option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="add-asset__field">
            <label htmlFor="equipment-type">Equipment type <span>*</span></label>
            <select
              id="equipment-type"
              name="equipment_type_id"
              value={equipmentTypeId}
              onChange={(event) => setEquipmentTypeId(event.target.value)}
              disabled={!categoryId || isLoadingTypes || equipmentTypes.length === 0}
              required
            >
              <option value="">
                {!categoryId
                  ? 'Select a category first'
                  : isLoadingTypes
                    ? 'Loading equipment types…'
                    : 'Select an equipment type'}
              </option>
              {equipmentTypes.map((equipmentType) => (
                <option key={equipmentType.type_id} value={equipmentType.type_id}>
                  {equipmentType.name}
                </option>
              ))}
            </select>
          </div>

          <div className="add-asset__field">
            <label htmlFor="acquisition-date">Acquisition date</label>
            <input
              id="acquisition-date"
              name="acquisition_date"
              type="date"
              value={acquisitionDate}
              onChange={(event) => setAcquisitionDate(event.target.value)}
            />
          </div>
        </div>

        <p className="add-asset__required">
          * Required fields. New assets start with Available status.
        </p>
        {!isLoadingCategories && categories.length === 0 && !error && (
          <p className="add-asset__message add-asset__message--error" role="status">
            No active categories are set up yet. Ask an administrator to add categories and equipment types.
          </p>
        )}
        {categoryId && !isLoadingTypes && equipmentTypes.length === 0 && !error && (
          <p className="add-asset__message" role="status">
            No active equipment types are available for this category.
          </p>
        )}
        {error && <p className="add-asset__message add-asset__message--error" role="alert">{error}</p>}
        {successMessage && (
          <p className="add-asset__message add-asset__message--success" role="status">
            {successMessage} <Link to="/assets">View assets</Link>
          </p>
        )}

        <div className="add-asset__actions">
          {onCancel ? (
            <button
              className="add-asset__button add-asset__button--secondary"
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : (
            <button
              className="add-asset__button add-asset__button--secondary"
              type="button"
              disabled={isSubmitting}
              onClick={() => navigate('/assets')}
            >
              Cancel
            </button>
          )}
          <button
            className="add-asset__button add-asset__button--primary"
            type="submit"
            disabled={isSubmitting || isLoadingCategories || categories.length === 0}
          >
            {isSubmitting ? 'Saving…' : isModal ? 'Save Asset' : 'Submit Asset'}
          </button>
        </div>
      </form>
    </section>
  )
}
