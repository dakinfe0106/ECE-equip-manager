import { useState, type FormEvent } from "react";
import "./AddAssetForm.css";

const equipmentTypes: Record<string, string[]> = {
  Electronics: ["Computer", "Monitor", "Printer", "Other"],
  Tools: ["Hand Tool", "Power Tool", "Measuring Tool", "Other"],
  "Lab Equipment": ["Testing Equipment", "Measurement Equipment", "Other"],
  Other: ["Other"],
};

const statuses = [
  "Available",
  "On Loan",
  "Under Maintenance",
  "Retired",
] as const;

type AssetStatus = (typeof statuses)[number];

export interface NewAsset {
  assetId: string;
  name: string;
  category: string;
  equipmentType: string;
  acquisitionDate: string;
  status: AssetStatus;
}

interface AddAssetFormProps {
  onCancel?: () => void;
  onSubmitAsset?: (asset: NewAsset) => void;
}

export default function AddAssetForm({
  onCancel,
  onSubmitAsset,
}: AddAssetFormProps) {
  const [assetId, setAssetId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [status, setStatus] = useState<AssetStatus>("Available");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const cleanedId = assetId.trim();
    const cleanedName = name.trim();

    if (!cleanedId || !cleanedName || !category || !equipmentType) {
      setError("Please complete all required fields.");
      return;
    }

    const newAsset: NewAsset = {
      assetId: cleanedId,
      name: cleanedName,
      category,
      equipmentType,
      acquisitionDate,
      status,
    };

    if (onSubmitAsset) {
      onSubmitAsset(newAsset);
    } else {
      // Frontend demonstration only: this does not save to the backend.
      console.info("Add Asset form submission (not persisted):", newAsset);
    }

    setSuccess(true);
  }

  return (
    <section className="add-asset">
      <header className="add-asset__header">
        <div>
          <p className="add-asset__eyebrow">Equipment Management</p>
          <h1>Add New Asset</h1>
          <p className="add-asset__description">
            Enter the details below to register an equipment asset.
          </p>
        </div>
      </header>

      <form className="add-asset__form" onSubmit={handleSubmit} noValidate>
        <div className="add-asset__grid">
          <div className="add-asset__field">
            <label htmlFor="asset-id">Asset ID <span>*</span></label>
            <input
              id="asset-id"
              name="assetId"
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              placeholder="e.g. ECE-001"
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
              required
            />
          </div>

          <div className="add-asset__field">
            <label htmlFor="asset-category">Category <span>*</span></label>
            <select
              id="asset-category"
              name="category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setEquipmentType("");
              }}
              required
            >
              <option value="">Select a category</option>
              {Object.keys(equipmentTypes).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="add-asset__field">
            <label htmlFor="equipment-type">
              Equipment type <span>*</span>
            </label>
            <select
              id="equipment-type"
              name="equipmentType"
              value={equipmentType}
              onChange={(event) => setEquipmentType(event.target.value)}
              disabled={!category}
              required
            >
              <option value="">
                {category ? "Select an equipment type" : "Select a category first"}
              </option>
              {(equipmentTypes[category] ?? []).map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="add-asset__field">
            <label htmlFor="acquisition-date">Acquisition date</label>
            <input
              id="acquisition-date"
              name="acquisitionDate"
              type="date"
              value={acquisitionDate}
              onChange={(event) => setAcquisitionDate(event.target.value)}
            />
          </div>

          <div className="add-asset__field">
            <label htmlFor="asset-status">Status <span>*</span></label>
            <select
              id="asset-status"
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as AssetStatus)}
              required
            >
              {statuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="add-asset__required">* Required fields</p>

        {error && <p className="add-asset__message add-asset__message--error" role="alert">{error}</p>}
        {success && (
          <p className="add-asset__message add-asset__message--success" role="status">
            Form submitted in this frontend demo. The asset has not been saved to the database.
          </p>
        )}

        <div className="add-asset__actions">
          {onCancel && (
            <button className="add-asset__button add-asset__button--secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="add-asset__button add-asset__button--primary" type="submit">
            Submit Asset
          </button>
        </div>
      </form>
    </section>
  );
}
