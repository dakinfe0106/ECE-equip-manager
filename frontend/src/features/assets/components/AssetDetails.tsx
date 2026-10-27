import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import {
  AssetLookupError,
  updateAsset,
  fetchCategories,
  fetchEquipmentTypes,
  type AssetRecord,
  type CategoryOption,
  type EquipmentTypeOption,
} from '../api'

interface AssetDetailsProps {
  asset: AssetRecord
  onClose: () => void
  onAssetUpdated: (asset: AssetRecord) => void
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AssetLookupError && error.status === 403) {
    return 'You are not authorized to edit this asset. Sign in with your EMS account and try again.'
  }
  return error instanceof Error ? error.message : 'Could not save asset changes.'
}

export default function AssetDetails({
  asset,
  onClose,
  onAssetUpdated,
}: AssetDetailsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  
  // UI States
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  
  // ISSUE #69: Track if the user has modified the form without saving
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Draft state for form fields
  const [draft, setDraft] = useState({
  name: asset.name,
  acquisition_date: asset.acquisition_date,
  serial_number: '', 
  certifications: asset.equipment_type.required_certifications?.map(c => c.name).join(', ') || '',
  category_id: asset.equipment_type.category.category_id,
  type_id: asset.equipment_type.type_id, 
 })

  // Dropdown states
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentTypeOption[]>([])
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newTypeName, setNewTypeName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isCreatingType, setIsCreatingType] = useState(false)
  const [taxonomyError, setTaxonomyError] = useState('')

  // Fetch categories when modal opens
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal()
      
      // Fetch dropdown options when modal opens
      setIsLoadingOptions(true)
      fetchCategories()
        .then(setCategories)
        .catch(console.error)
        .finally(() => setIsLoadingOptions(false))
    }
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  // Fetch equipment types when category changes
  const handleCategoryChange = (categoryId: number) => {
    setDraft(prev => ({ ...prev, category_id: categoryId, type_id: 0 }))
    setEquipmentTypes([]) // Clear previous types
    
    // Fetch equipment types for this category
    setIsLoadingOptions(true)
    fetchEquipmentTypes(categoryId)
      .then(setEquipmentTypes)
      .catch(console.error)
      .finally(() => setIsLoadingOptions(false))
  }

  // ISSUE #69: Intercept close attempts to warn about unsaved changes
  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      )
      if (!confirmClose) return
    }
    onClose()
  }

  const closeOnBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      handleAttemptClose()
    }
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    setStatusMessage('')
    setTaxonomyError('')

    try {
      // Validate taxonomy if creating new (UI-only for now)
      if (isCreatingCategory && newCategoryName.trim()) {
        const exists = categories.some(c => 
          c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
        )
        if (exists) {
          setTaxonomyError('A category with this name already exists.')
          setIsSaving(false)
          return
        }
        // For now, just update local state for UI consistency
        setCategories(prev => [...prev, { 
          category_id: Date.now(), 
          name: newCategoryName.trim() 
        }])
      }

      if (isCreatingType && newTypeName.trim()) {
        const categoryTypes = equipmentTypes.filter(t => t.category_id === draft.category_id)
        const exists = categoryTypes.some(t => 
          t.name.toLowerCase() === newTypeName.trim().toLowerCase()
        )
        if (exists) {
          setTaxonomyError('This equipment type already exists in this category.')
          setIsSaving(false)
          return
        }
        // TODO: Call POST /api/equipment-types/ to create it in future sprint
        setEquipmentTypes(prev => [...prev, {
          type_id: Date.now(),
          name: newTypeName.trim(),
          description: '',
          category_id: draft.category_id!,
          category: categories.find(c => c.category_id === draft.category_id)!,
        }])
      }

      // Save asset with supported fields only (per backend limits)
      const updatedAsset = await updateAsset(asset.asset_id, {
        name: draft.name,
        acquisition_date: draft.acquisition_date,
      })
      
      onAssetUpdated(updatedAsset)
      setHasUnsavedChanges(false)
      setStatusMessage(`Changes saved for ${updatedAsset.asset_identifier}.`)
      setIsCreatingCategory(false)
      setIsCreatingType(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  // Helper for status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800 border-green-200';
      case 'On_Loan': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Under_Maintenance': return 'bg-red-100 text-red-800 border-red-200';
      case 'Retired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get current category/type names for display
  const currentCategory = categories.find(c => c.category_id === draft.category_id)?.name || ''
  const currentType = equipmentTypes.find(t => t.type_id === draft.type_id)?.name || ''

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-48px)] w-[min(720px,calc(100vw-32px))] overflow-y-auto rounded-[10px] border-0 bg-white px-6 pb-[18px] pt-[22px] shadow-[0_24px_60px_rgb(15_27_45_/_28%)] backdrop:bg-[rgb(20_33_54_/_45%)]"
      id="asset-details"
      aria-labelledby="details-title"
      onCancel={(event) => {
        event.preventDefault()
        handleAttemptClose()
      }}
      onClick={closeOnBackdropClick}
    >
      {/* HEADER */}
      <header className="flex items-start justify-between gap-3 border-b border-[#e8edf3] pb-4 mb-6">
        <div>
          <p className="mb-[6px] text-[11px] font-bold tracking-wide text-blue-600 uppercase">
            ASSET DETAILS · {asset.asset_identifier}
          </p>
          <h2 className="m-0 text-[20px] font-[650] text-[#26344a]" id="details-title">
            {asset.name}
          </h2>
        </div>
        <button
          className="rounded-[5px] border border-[#dce3ed] bg-white px-[10px] py-[6px] text-[14px] text-[#59677a] hover:bg-gray-50"
          type="button"
          onClick={handleAttemptClose}
          aria-label="Close asset details"
        >
          ×
        </button>
      </header>

      {/* STATUS BADGE */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(asset.status)}`}>
          <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
          {asset.status.replaceAll('_', ' ')}
        </span>
      </div>

      {/* FORM */}
      <form className="pt-[15px]" onSubmit={handleSave} aria-busy={isSaving}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          
          {/* Row 1: Read Only Fields */}
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Asset ID · Read only</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value={asset.asset_identifier}
              readOnly
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Current Status · Read only</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-[#f1f3f6] px-3 py-2 text-[12px] text-[#68768a] cursor-not-allowed"
              value={asset.status.replaceAll('_', ' ')}
              readOnly
            />
          </label>

          {/* Row 2: Editable Name & Serial Number */}
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Asset Name *</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
              required
              maxLength={255}
              value={draft.name}
              onChange={(event) => {
                setDraft((current) => ({ ...current, name: event.target.value }))
                setHasUnsavedChanges(true)
              }}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Serial Number</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
              value={draft.serial_number}
              onChange={(event) => {
                setDraft((current) => ({ ...current, serial_number: event.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="e.g., FLK-87V-12345"
            />
          </label>

          {/* Row 3: Category & Equipment Type Dropdowns (REAL DATA) */}
          <div className="relative">
            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">Category *</span>
              <button
                type="button"
                className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] text-left focus:border-blue-500 focus:outline-none flex justify-between items-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                onClick={() => !isCreatingCategory && setShowCategoryDropdown(!showCategoryDropdown)}
                disabled={isLoadingOptions}
              >
                {currentCategory || 'Select a category'}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </label>
            
            {/* Category Dropdown Menu */}
            {showCategoryDropdown && !isCreatingCategory && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-[#dce3ed] rounded-[5px] shadow-lg max-h-60 overflow-y-auto">
                {categories.map(cat => (
                  <button
                    key={cat.category_id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50 ${
                      draft.category_id === cat.category_id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-[#39465a]'
                    }`}
                    onClick={() => {
                      handleCategoryChange(cat.category_id)
                      setShowCategoryDropdown(false)
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-[12px] text-blue-600 hover:bg-blue-50 border-t border-[#e8edf3] font-semibold"
                  onClick={() => {
                    setIsCreatingCategory(true)
                    setShowCategoryDropdown(false)
                  }}
                >
                  + Create New Category
                </button>
              </div>
            )}

            {/* Create New Category Input */}
            {isCreatingCategory && (
              <div className="mt-2">
                <input
                  type="text"
                  className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
                  placeholder="Enter new category name..."
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value)
                    setTaxonomyError('')
                  }}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="px-3 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => {
                      if (newCategoryName.trim()) {
                        setDraft(prev => ({ ...prev, category_id: Date.now() }))
                        setIsCreatingCategory(false)
                        setNewCategoryName('')
                      }
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-[10px] border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => {
                      setIsCreatingCategory(false)
                      setNewCategoryName('')
                      setTaxonomyError('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <label className="flex min-w-0 flex-col gap-[6px]">
              <span className="text-[10px] font-[650] text-[#8792a2]">Equipment Type *</span>
              <button
                type="button"
                className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] text-left focus:border-blue-500 focus:outline-none flex justify-between items-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                onClick={() => draft.category_id && !isCreatingType && setShowTypeDropdown(!showTypeDropdown)}
                disabled={!draft.category_id || isLoadingOptions}
              >
                {currentType || (draft.category_id ? 'Select a type' : 'Select a category first')}
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </label>
            
            {/* Equipment Type Dropdown Menu */}
            {showTypeDropdown && draft.category_id && !isCreatingType && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-[#dce3ed] rounded-[5px] shadow-lg max-h-60 overflow-y-auto">
                {equipmentTypes.map(type => (
                  <button
                    key={type.type_id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-[12px] hover:bg-blue-50 ${
                      draft.type_id === type.type_id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-[#39465a]'
                    }`}
                    onClick={() => {
                      setDraft(prev => ({ ...prev, type_id: type.type_id }))
                      setShowTypeDropdown(false)
                    }}
                  >
                    {type.name}
                  </button>
                ))}
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-[12px] text-blue-600 hover:bg-blue-50 border-t border-[#e8edf3] font-semibold"
                  onClick={() => {
                    setIsCreatingType(true)
                    setShowTypeDropdown(false)
                  }}
                >
                  + Create New Equipment Type
                </button>
              </div>
            )}

            {/* Create New Type Input */}
            {isCreatingType && (
              <div className="mt-2">
                <input
                  type="text"
                  className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
                  placeholder="Enter new equipment type name..."
                  value={newTypeName}
                  onChange={(e) => {
                    setNewTypeName(e.target.value)
                    setTaxonomyError('')
                  }}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="px-3 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => {
                      if (newTypeName.trim()) {
                        setDraft(prev => ({ ...prev, type_id: Date.now() }))
                        setIsCreatingType(false)
                        setNewTypeName('')
                      }
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-[10px] border border-gray-300 rounded hover:bg-gray-50"
                    onClick={() => {
                      setIsCreatingType(false)
                      setNewTypeName('')
                      setTaxonomyError('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Acquisition Date & Required Certifications */}
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Acquisition Date</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
              type="date"
              value={draft.acquisition_date ?? ''}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  acquisition_date: event.target.value || null,
                }))
                setHasUnsavedChanges(true)
              }}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[6px]">
            <span className="text-[10px] font-[650] text-[#8792a2]">Required Certifications</span>
            <input
              className="w-full rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[12px] text-[#39465a] focus:border-blue-500 focus:outline-none"
              value={draft.certifications}
              onChange={(event) => {
                setDraft((current) => ({ ...current, certifications: event.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="e.g., Lab Safety, Electrical Safety"
            />
          </label>

          {/* Taxonomy Error Display */}
          {taxonomyError && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-[5px]">
              <p className="text-[10px] text-red-600 font-medium">{taxonomyError}</p>
            </div>
          )}
        </div>

        {/* History Links */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#e8edf3] pt-4">
           <button
            type="button"
            className="rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[11px] font-[650] text-[#2672e8] hover:bg-[#f1f4f9] flex justify-between items-center"
            onClick={() => alert('Lending History feature coming in a future sprint!')}
          >
            View Lending History <span>→</span>
          </button>
          <button
            type="button"
            className="rounded-[5px] border border-[#dce3ed] bg-white px-3 py-2 text-[11px] font-[650] text-[#2672e8] hover:bg-[#f1f4f9] flex justify-between items-center"
            onClick={() => alert('Maintenance History feature coming in a future sprint!')}
          >
            View Maintenance History <span>→</span>
          </button>
        </div>

        {/* Lifecycle Safeguards */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-[5px]">
          <h4 className="text-[11px] font-bold text-gray-800 mb-1">Lifecycle safeguards</h4>
          <p className="text-[10px] text-gray-600">
            Operational actions are disabled while the asset has an active loan, maintenance record, or retired status.
          </p>
        </div>

        {/* Footer Buttons */}
        <div className="mt-6 flex items-center justify-between border-t border-[#e8edf3] pt-4">
          {/* Left Side: Archive */}
          <button
            className="rounded-[5px] border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50"
            type="button"
            disabled
          >
            Archive Asset
          </button>

          {/* Right Side: Actions */}
          <div className="flex items-center gap-2">
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-4 py-2 text-[12px] font-semibold text-[#59677a] hover:bg-gray-50"
              type="button"
              disabled
            >
              Checkout
            </button>
            <button
              className="rounded-[5px] border border-[#dce3ed] bg-white px-4 py-2 text-[12px] font-semibold text-[#59677a] hover:bg-gray-50"
              type="button"
              disabled
            >
              Start Maintenance
            </button>
            <button
              className="rounded-[5px] border border-[#2672e8] bg-[#2672e8] px-4 py-2 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              type="submit"
              disabled={isSaving || isLoadingOptions}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
        
        {errorMessage && (
           <p className="mt-2 text-[10px] text-[#b42332]" role="alert">
             {errorMessage}
           </p>
        )}
        {statusMessage && (
           <p className="mt-2 text-[10px] text-[#087443]" role="status">
             {statusMessage}
           </p>
        )}
      </form>
    </dialog>
  )
}
