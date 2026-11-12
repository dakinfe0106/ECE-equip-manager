import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Page = "Dashboard" | "Assets" | "Lending" | "Borrowers" | "Maintenance" | "Analytics" | "Import & Export" | "Users & Access";
type Role = "Administrator" | "Technician";
type ModalKind = "asset" | "loan" | "borrower" | "maintenance" | "return" | "delete" | null;

const icons: Record<string, string> = {
  Dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  Assets: "M6 3h12v18H6zM9 7h6M9 11h6",
  Lending: "M4 8h16M7 4h10l3 4H4zM6 12v7M18 12v7M3 20h18",
  Borrowers: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87",
  Maintenance: "M14.7 6.3a4 4 0 01-5 5L4 17l3 3 5.7-5.7a4 4 0 005-5l-3 1-2-2 1-3z",
  Analytics: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  "Import & Export": "M12 3v12M8 7l4-4 4 4M5 21h14a2 2 0 002-2v-4M3 15v4a2 2 0 002 2",
  Search: "M21 21l-4.35-4.35M19 11a8 8 0 11-16 0 8 8 0 0116 0z",
  Plus: "M12 5v14M5 12h14", Bell: "M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  Menu: "M4 6h16M4 12h16M4 18h16", X: "M18 6L6 18M6 6l12 12", Chevron: "M9 18l6-6-6-6",
  Filter: "M4 5h16l-6 7v5l-4 2v-7z",
  "Users & Access": "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM17 8h5M19.5 5.5v5",
};

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]} /></svg>;
}

type DropdownOption = string | { label: string; value: string; action?: boolean };

function Dropdown({ options, value, defaultValue, placeholder, disabled = false, label, onChange, className = "" }: { options: DropdownOption[]; value?: string; defaultValue?: string; placeholder?: string; disabled?: boolean; label?: string; onChange?: (value: string) => void; className?: string }) {
  const normalized = options.map((option) => typeof option === "string" ? { label: option, value: option, action: false } : option);
  const [internalValue, setInternalValue] = useState(defaultValue ?? normalized[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selectedValue = value ?? internalValue;
  const selected = normalized.find((option) => option.value === selectedValue);
  useEffect(() => {
    if (!open) return;
    const closeMenu = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [open]);
  const choose = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };
  return <div ref={root} className={`custom-select ${label ? "labeled-select" : ""} ${open ? "open" : ""} ${disabled ? "disabled" : ""} ${className}`}>{label && <span className="select-label">{label}</span>}<button type="button" className="select-trigger" disabled={disabled} onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open}><span className={!selected ? "placeholder" : ""}>{selected?.label || placeholder || "Select an option"}</span><Icon name="Chevron" size={14} /></button>{open && <div className="select-popover" role="listbox">{normalized.map((option) => <button type="button" key={option.value} role="option" aria-selected={selectedValue === option.value} className={`${selectedValue === option.value ? "selected" : ""} ${option.action ? "create-option" : ""}`} onClick={() => choose(option.value)}><span>{option.label}</span>{selectedValue === option.value && <i>Selected</i>}</button>)}</div>}</div>;
}

const certificationOptions = ["Lab Safety", "Electrical", "Fiber Safety"];

function CertificationMultiSelect({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const toggle = (certification: string) => onChange(value.includes(certification) ? value.filter((item) => item !== certification) : [...value, certification]);
  return <div className="certification-select">{certificationOptions.map((certification) => <button type="button" key={certification} className={value.includes(certification) ? "selected" : ""} aria-pressed={value.includes(certification)} onClick={() => toggle(certification)}><i />{certification}</button>)}</div>;
}

const navItems: Page[] = ["Dashboard", "Assets", "Lending", "Borrowers", "Maintenance", "Analytics", "Import & Export"];
const initialAssets = [
  { id: "ECE-001", serial: "FLK-87V-12345", name: "Fluke 87V Multimeter", category: "Test Equipment", type: "Multimeter", status: "Available", acquired: "2024-03-12", certifications: "Lab Safety, Electrical Safety", archived: false },
  { id: "ECE-002", serial: "PF-3A92K1", name: "ThinkPad T14", category: "Computing", type: "Laptop", status: "On Loan", acquired: "2024-02-08", certifications: "Lab Safety", archived: false },
  { id: "ECE-003", serial: "FS-90S-88412", name: "Fusion Splicer 90S+", category: "Communications", type: "Splicer", status: "Under Maintenance", acquired: "2024-01-21", certifications: "Lab Safety, Fiber Safety", archived: false },
  { id: "ECE-004", serial: "TBS1K-24018", name: "Tektronix TBS1102C", category: "Test Equipment", type: "Oscilloscope", status: "Available", acquired: "2023-12-15", certifications: "Lab Safety, Electrical Safety", archived: false },
  { id: "ECE-005", serial: "GLM50-11942", name: "Bosch GLM 50 C", category: "Tools", type: "Laser Measure", status: "Retired", acquired: "2023-11-02", certifications: "Lab Safety", archived: false },
];
const dateFromToday = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const loans = [
  { assetId: "ECE-002", asset: "ThinkPad T14", borrowerId: "0000101", borrower: "Alex Example", checkout: "2024-05-18", due: dateFromToday(1), status: "Active" },
  { assetId: "ECE-018", asset: "Spectrum Analyzer", borrowerId: "0000102", borrower: "Blair Example", checkout: "2024-05-08", due: dateFromToday(3), status: "Active" },
  { assetId: "ECE-021", asset: "Thermal Camera", borrowerId: "0000103", borrower: "Casey Example", checkout: "2024-04-02", due: dateFromToday(-2), status: "Overdue" },
  { assetId: "ECE-031", asset: "Network Tester", borrowerId: "0000104", borrower: "Dana Example", checkout: "2024-03-22", due: "2024-04-22", status: "Completed" },
];
const borrowers = [
  { id: "0000101", name: "Alex Example", eligibility: "Eligible", standing: "Good", active: 1, overdue: 0, damageFlags: 0, certs: "Lab Safety, Electrical" },
  { id: "0000102", name: "Blair Example", eligibility: "Eligible", standing: "Good", active: 1, overdue: 0, damageFlags: 0, certs: "Lab Safety" },
  { id: "0000103", name: "Casey Example", eligibility: "Eligible", standing: "Overdue", active: 1, overdue: 1, damageFlags: 0, certs: "Electrical" },
  { id: "0000104", name: "Dana Example", eligibility: "Ineligible", standing: "Damage flag", active: 0, overdue: 0, damageFlags: 1, certs: "None" },
  { id: "0000105", name: "Emery Example", eligibility: "Eligible", standing: "Good", active: 0, overdue: 0, damageFlags: 0, certs: "Lab Safety" },
  { id: "0000106", name: "Finley Example", eligibility: "Eligible", standing: "Good", active: 2, overdue: 0, damageFlags: 0, certs: "Lab Safety, Electrical" },
  { id: "0000107", name: "Gray Example", eligibility: "Eligible", standing: "Good", active: 0, overdue: 0, damageFlags: 0, certs: "Electrical" },
  { id: "0000108", name: "Harper Example", eligibility: "Eligible", standing: "Overdue", active: 1, overdue: 1, damageFlags: 0, certs: "Lab Safety" },
  { id: "0000109", name: "Indigo Example", eligibility: "Eligible", standing: "Good", active: 0, overdue: 0, damageFlags: 0, certs: "Lab Safety, Electrical" },
  { id: "0000110", name: "Jesse Example", eligibility: "Ineligible", standing: "Good", active: 0, overdue: 0, damageFlags: 0, certs: "None" },
  { id: "0000111", name: "Kai Example", eligibility: "Eligible", standing: "Good", active: 1, overdue: 0, damageFlags: 0, certs: "Lab Safety" },
  { id: "0000112", name: "Logan Example", eligibility: "Eligible", standing: "Good", active: 0, overdue: 0, damageFlags: 0, certs: "Electrical" },
];

function BorrowerAutocomplete({ records }: { records: typeof borrowers }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const matches = records.filter((borrower) => `${borrower.name} ${borrower.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!open) return;
    const closeMenu = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [open]);
  const choose = (borrower: typeof borrowers[number]) => {
    setQuery(`${borrower.name} · ${borrower.id}`);
    setOpen(false);
  };
  return <div ref={root} className={`borrower-combobox ${open ? "open" : ""}`}><div className="borrower-search"><Icon name="Search" size={15} /><input required value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} placeholder="Search name or UNB ID..." role="combobox" aria-autocomplete="list" aria-expanded={open} /></div>{open && <div className="borrower-suggestions" role="listbox">{matches.length ? matches.map((borrower) => <button type="button" key={borrower.id} role="option" disabled={borrower.eligibility !== "Eligible"} onClick={() => choose(borrower)}><span><strong>{borrower.name}</strong><small>UNB ID {borrower.id}</small></span><i className={borrower.eligibility === "Eligible" ? "eligible" : "ineligible"}>{borrower.eligibility}</i></button>) : <div className="no-suggestions"><strong>No borrowers found</strong><span>Try a different name or UNB ID.</span></div>}</div>}</div>;
}

const maintenance = [
  { id: "MNT-001", assetId: "ECE-003", assetName: "Fusion Splicer 90S+", asset: "ECE-003 · Fusion Splicer 90S+", type: "Calibration", priority: "High", technician: "Morgan Sample", start: "2024-05-20", status: "In Progress", notes: "Annual calibration and optical alignment check.", completionDate: "", resolution: "" },
  { id: "MNT-002", assetId: "ECE-021", assetName: "Thermal Camera", asset: "ECE-021 · Thermal Camera", type: "Repair", priority: "Urgent", technician: "Morgan Sample", start: "2024-05-19", status: "In Progress", notes: "Investigate intermittent power loss.", completionDate: "", resolution: "" },
  { id: "MNT-003", assetId: "ECE-044", assetName: "Oscilloscope", asset: "ECE-044 · Oscilloscope", type: "Preventative Care", priority: "Medium", technician: "Riley Sample", start: "2024-05-12", status: "Completed", notes: "Routine inspection and cleaning.", completionDate: "2024-05-15", resolution: "Service completed and function verified." },
];
const initialUsers = [
  { id: "USR-001", firstName: "Admin", lastName: "User", username: "admin", unbId: "0000901", role: "Administrator", status: "Active" },
  { id: "USR-002", firstName: "Morgan", lastName: "Sample", username: "technician", unbId: "0000902", role: "Technician", status: "Active" },
  { id: "USR-003", firstName: "Riley", lastName: "Sample", username: "rsample", unbId: "0000903", role: "Technician", status: "Active" },
  { id: "USR-004", firstName: "Quinn", lastName: "Sample", username: "qsample", unbId: "0000904", role: "Faculty", status: "Inactive" },
];
const categories: Record<string, string[]> = { "Test Equipment": ["Multimeter", "Oscilloscope"], Computing: ["Laptop"], Communications: ["Splicer"], Tools: ["Laser Measure"] };

function Badge({ value }: { value: string }) {
  const red = ["Overdue", "Urgent", "Ineligible", "Damage flag", "Under Maintenance"].includes(value);
  const amber = ["On Loan", "High", "In Progress"].includes(value);
  const gray = ["Completed", "Retired", "Archived", "Inactive", "Faculty"].includes(value);
  return <span className={`badge ${red ? "red" : amber ? "amber" : gray ? "gray" : "green"}`}><i />{value}</span>;
}

function Login({ onLogin, users }: { onLogin: (role: Role) => void; users: typeof initialUsers }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const validDemo = (username === "admin" && password === "admin") || (username === "technician" && password === "technician");
    const account = users.find((user) => user.username === username);
    if (validDemo && account?.status === "Active") onLogin(username === "admin" ? "Administrator" : "Technician");
    else if (validDemo && account?.status === "Inactive") setError("This account is inactive. Contact an administrator.");
    else setError("Incorrect username or password. Try one of the demo accounts.");
  };
  return <div className="login-screen"><div className="login-card"><div className="login-brand"><div className="brandmark">E</div><div><strong>ECE Equipment Manager</strong><span>Secure equipment operations</span></div></div><div className="login-copy"><p>Welcome back</p><h1>Sign in to your workspace</h1><span>Enter the credentials shared with you by your team administrator.</span></div><form onSubmit={submit} className="login-form"><label><span>Username</span><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoFocus /></label><label><span>Password</span><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Enter password" /></label>{error && <div className="form-error">{error}</div>}<button className="primary">Sign in</button></form></div></div>;
}

function Sidebar({ page, role, open, navigate, logout }: { page: Page; role: Role; open: boolean; navigate: (p: Page) => void; logout: () => void }) {
  return <><aside className={`sidebar ${open ? "open" : ""}`}><div className="brand"><div className="brandmark">E</div><div><strong>ECE Equipment</strong><span>Manager</span></div></div><nav><p className="nav-label">Workspace</p>{navItems.map((item) => <button key={item} className={page === item ? "active" : ""} onClick={() => navigate(item)}><Icon name={item} /><span>{item}</span></button>)}{role === "Administrator" && <div className="admin-nav"><p className="nav-label">Administration</p><button className={page === "Users & Access" ? "active" : ""} onClick={() => navigate("Users & Access")}><Icon name="Users & Access" /><span>Users & Access</span></button></div>}</nav><div className="profile"><div className="avatar">{role === "Administrator" ? "AD" : "TC"}</div><div><strong>{role === "Administrator" ? "Admin User" : "Morgan Sample"}</strong><span>{role}</span></div><button className="signout" onClick={logout}>Sign out</button></div></aside>{open && <div className="overlay" onClick={() => navigate(page)} />}</>;
}

function Header({ page, role, openNav }: { page: Page; role: Role; openNav: () => void }) {
  return <header><button className="icon-btn menu-btn" onClick={openNav}><Icon name="Menu" /></button><div className="breadcrumbs"><span>ECE Equipment Manager</span><b>/</b><strong>{page}</strong></div><div className="header-actions"><span className="role-chip">{role}</span><button className="icon-btn notification"><Icon name="Bell" /><i /></button><div className="header-avatar" aria-label={`Signed in as ${role}`}>{role === "Administrator" ? "AD" : "TC"}</div></div></header>;
}

function PageIntro({ eyebrow, title, text, action, onAction, extra, showEyebrow = false }: { eyebrow: string; title: string; text: string; action?: string; onAction?: () => void; extra?: ReactNode; showEyebrow?: boolean }) {
  return <div className="page-intro"><div>{showEyebrow && <p>{eyebrow}</p>}<h1>{title}</h1><span>{text}</span></div><div className="intro-actions">{extra}{action && <button className="primary" onClick={onAction}><Icon name="Plus" size={16} />{action}</button>}</div></div>;
}

function Filters({ query, setQuery, placeholder, children }: { query: string; setQuery: (q: string) => void; placeholder: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="table-tools filter-tools"><label className="search"><Icon name="Search" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} /></label><div className="filter-menu"><button className={`filter-trigger ${open ? "active" : ""}`} onClick={() => setOpen(!open)}><Icon name="Filter" size={15} />Filters<span className="filter-count">All</span></button>{open && <div className="filter-popover"><div className="filter-popover-head"><strong>Filter records</strong><button onClick={() => setOpen(false)}><Icon name="X" size={15} /></button></div><div className="filter-row">{children}<Dropdown options={["All statuses", "Available", "On Loan", "Overdue"]} /></div><div className="filter-popover-actions"><button className="link">Reset</button><button className="primary" onClick={() => setOpen(false)}>Apply Filters</button></div></div>}</div></div>;
}

function Dashboard({ navigate, openLoan }: { navigate: (p: Page, filter?: string) => void; openLoan: (loan: typeof loans[number]) => void }) {
  const cards = [["Total Assets", "450", "Assets", ""], ["Available Assets", "310", "Assets", "Available"], ["Assets On Loan", "75", "Lending", "Active"], ["Under Maintenance", "40", "Maintenance", "In Progress"], ["Overdue Loans", "8", "Lending", "Overdue"]];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = loans.filter((loan) => { const due = new Date(`${loan.due}T00:00:00`); const days = Math.ceil((due.getTime() - today.getTime()) / 86400000); return loan.status === "Active" && days >= 0 && days <= 7; }).sort((a, b) => a.due.localeCompare(b.due));
  const remaining = (due: string) => { const days = Math.ceil((new Date(`${due}T00:00:00`).getTime() - today.getTime()) / 86400000); return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`; };
  return <><PageIntro eyebrow="Overview" title="Equipment operations" text="A live overview of inventory health and lending activity." showEyebrow /><section className="metric-grid dashboard-metrics">{cards.map(([label, value, page, filter], i) => <button className="metric-card" key={label} onClick={() => navigate(page as Page, filter)}><div className={`metric-icon ${["blue", "teal", "violet", "amber", "red"][i]}`}><Icon name={page === "Lending" ? "Lending" : page} /></div><div><p>{label}</p><strong>{value}</strong><span>View detailed records →</span></div></button>)}</section><div className="dashboard-overview-grid"><section className="panel availability-panel"><div className="panel-head"><div><h2>Equipment availability</h2><p>Current status distribution</p></div></div><div className="status-chart"><div className="donut"><div><strong>450</strong><span>assets</span></div></div><div className="legend">{[["Available", "310", "green"], ["On Loan", "75", "blue"], ["Maintenance", "40", "amber"], ["Retired", "25", "gray"]].map((x) => <div key={x[0]}><i className={x[2]} /><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div></div></section><section className="panel upcoming-panel"><div className="panel-head"><div><h2>Upcoming returns</h2><p>Active loans due within seven days</p></div></div>{upcoming.length ? <div className="upcoming-list">{upcoming.map((loan) => <button key={loan.assetId} onClick={() => { navigate("Lending", loan.assetId); openLoan(loan); }}><span><strong>{loan.asset}</strong><small>{loan.borrower}</small></span><span><b>{loan.due}</b><small>{remaining(loan.due)}</small></span></button>)}</div> : <div className="empty-state">No equipment due soon.</div>}</section></div><section className="panel"><div className="panel-head"><div><h2>Recent lending activity</h2><p>Click a transaction to view its complete record</p></div><button className="link" onClick={() => navigate("Lending")}>View all <Icon name="Chevron" size={14} /></button></div><LoanTable rows={loans.slice(0, 4)} onRow={openLoan} /></section></>;
}

function LoanTable({ rows, onRow }: { rows: typeof loans; onRow: (l: typeof loans[number]) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Borrower</th><th>Checkout Date</th><th>Expected Return</th><th>Status</th></tr></thead><tbody>{rows.map((l) => <tr key={l.asset} onClick={() => onRow(l)} className="clickable"><td><strong>{l.asset}</strong></td><td>{l.borrower}</td><td>{l.checkout}</td><td>{l.due}</td><td><Badge value={l.status} /></td></tr>)}</tbody></table></div>;
}

function Assets({ role, initialFilter, assets, openModal, openDrawer }: { role: Role; initialFilter: string; assets: typeof initialAssets; openModal: () => void; openDrawer: (a: typeof initialAssets[number]) => void }) {
  const [query, setQuery] = useState(""); const [viewBy, setViewBy] = useState("List"); const [includeArchived, setIncludeArchived] = useState(false); const [filter] = useState(initialFilter);
  const rows = useMemo(() => assets.filter((a) => (!a.archived || (role === "Administrator" && includeArchived)) && (!filter || a.status === filter) && (`${a.id} ${a.name}`).toLowerCase().includes(query.toLowerCase())), [query, filter, assets, includeArchived, role]);
  const grouped = (key: "category" | "type") => Object.entries(rows.reduce<Record<string, typeof rows>>((all, asset) => ({ ...all, [asset[key]]: [...(all[asset[key]] || []), asset] }), {}));
  const groups = viewBy === "Category" ? grouped("category") : viewBy === "Equipment Type" ? grouped("type") : [["All Assets", rows] as const];
  return <><PageIntro eyebrow="Inventory" title="Assets" text="Manage inventory and view equipment by category or equipment type." action="Add Asset" onAction={openModal} extra={<Dropdown label="View by" className="view-by" options={["List", "Category", "Equipment Type"]} value={viewBy} onChange={setViewBy} />} /><section className="panel">{role === "Administrator" && <label className="archive-toggle"><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /><span>Include Archived</span></label>}<Filters query={query} setQuery={setQuery} placeholder="Search asset ID or name..."><Dropdown options={["All categories", ...Object.keys(categories)]} /><Dropdown options={["All equipment types"]} /></Filters>{groups.map(([group, items]) => <div className="asset-group" key={group}><div className={`group-heading ${viewBy === "List" ? "hidden" : ""}`}><strong>{group}</strong><span>{items?.length || 0} assets</span></div><div className="table-wrap"><table><thead><tr><th>Asset ID</th><th>Asset Name</th><th>Category</th><th>Equipment Type</th><th>Status</th></tr></thead><tbody>{items?.map((a) => <tr key={a.id} onClick={() => openDrawer(a)} className={`clickable ${a.archived ? "archived-row" : ""}`}><td className="mono">{a.id}</td><td><strong>{a.name}</strong></td><td>{a.category}</td><td>{a.type}</td><td><Badge value={a.archived ? "Archived" : a.status} /></td></tr>)}</tbody></table></div></div>)}</section></>;
}

function CategoryManager({ type }: { type: string }) {
  const rows = type === "Categories" ? Object.keys(categories).map((x) => [x, categories[x].length]) : Object.entries(categories).flatMap(([c, ts]) => ts.map((t) => [t, c]));
  return <section className="panel"><div className="table-tools"><div className="result-count">{rows.length} {type.toLowerCase()}</div><button className="primary"><Icon name="Plus" size={15} />Create {type === "Categories" ? "Category" : "Equipment Type"}</button></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>{type === "Categories" ? "Equipment Types" : "Category"}</th><th>Status</th></tr></thead><tbody>{rows.map((r) => <tr key={r[0]}><td><strong>{r[0]}</strong></td><td>{r[1]}</td><td><Badge value="Active" /></td></tr>)}</tbody></table></div></section>;
}

function Lending({ initialFilter, openModal, openDrawer }: { initialFilter: string; openModal: () => void; openDrawer: (l: typeof loans[number]) => void }) {
  const [query, setQuery] = useState(""); const [activeFilter, setActiveFilter] = useState(initialFilter);
  useEffect(() => setActiveFilter(initialFilter), [initialFilter]);
  const statusFilter = ["Active", "Overdue", "Completed"].includes(activeFilter);
  const rows = loans.filter((loan) => (!activeFilter || (statusFilter ? loan.status === activeFilter : `${loan.assetId} ${loan.asset} ${loan.borrowerId}`.includes(activeFilter))) && `${loan.assetId} ${loan.asset} ${loan.borrowerId} ${loan.borrower}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageIntro eyebrow="Circulation" title="Lending" text="Manage checkouts, returns, and complete lending history." action="New Loan" onAction={openModal} /><section className="panel">{activeFilter && <div className="active-record-filter"><span>Filtered records</span><strong>{activeFilter}</strong><button className="link" onClick={() => setActiveFilter("")}>Clear filter</button></div>}<Filters query={query} setQuery={setQuery} placeholder="Search asset, borrower, or ID..."><Dropdown options={["All loan states", "Active", "Overdue", "Completed"]} /><input className="date-filter" type="date" /></Filters><LoanTable rows={rows} onRow={openDrawer} /></section></>;
}

function Borrowers({ records, openModal, openDrawer }: { records: typeof borrowers; openModal: () => void; openDrawer: (b: typeof borrowers[number]) => void }) {
  const [query, setQuery] = useState(""); const rows = records.filter((b) => `${b.name} ${b.id}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageIntro eyebrow="Eligibility" title="Borrowers" text="Manage term-based eligibility, certifications, standing, and borrowing records." action="Add Borrower" onAction={openModal} /><section className="panel"><Filters query={query} setQuery={setQuery} placeholder="Search name or UNB ID..."><Dropdown options={["All eligibility", "Eligible", "Ineligible"]} /><Dropdown options={["All standing", "Good", "Overdue", "Damage flag"]} /></Filters><div className="table-wrap"><table><thead><tr><th>UNB ID</th><th>Borrower Name</th><th>Eligibility Status</th><th>Standing</th><th>Active Loans</th></tr></thead><tbody>{rows.map((b) => <tr key={b.id} className="clickable" onClick={() => openDrawer(b)}><td className="mono">{b.id}</td><td><strong>{b.name}</strong></td><td><Badge value={b.eligibility} /></td><td><Badge value={b.standing} /></td><td>{b.active}</td></tr>)}</tbody></table></div></section></>;
}

function Maintenance({ initialFilter, records, openModal, openDrawer }: { initialFilter: string; records: typeof maintenance; openModal: () => void; openDrawer: (m: typeof maintenance[number]) => void }) {
  const [query, setQuery] = useState(""); const rows = records.filter((m) => (!initialFilter || `${m.assetId} ${m.assetName}`.includes(initialFilter)) && `${m.assetId} ${m.assetName}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageIntro eyebrow="Asset care" title="Maintenance" text="Plan, assign, and preserve service history for every asset." action="New Maintenance" onAction={openModal} /><section className="panel"><Filters query={query} setQuery={setQuery} placeholder="Search asset ID or name..."><Dropdown options={["All types", "Inspection", "Repair", "Calibration"]} /><Dropdown options={["All priorities", "Urgent", "High"]} /><Dropdown options={["All technicians", "Morgan Sample", "Riley Sample"]} /></Filters><div className="table-wrap"><table><thead><tr><th>Asset</th><th>Maintenance Type</th><th>Priority</th><th>Responsible Technician</th><th>Start Date</th><th>Status</th></tr></thead><tbody>{rows.map((m) => <tr key={m.id} className="clickable" onClick={() => openDrawer(m)}><td><strong>{m.asset}</strong></td><td>{m.type}</td><td><Badge value={m.priority} /></td><td>{m.technician}</td><td>{m.start}</td><td><Badge value={m.status} /></td></tr>)}</tbody></table></div></section></>;
}

function UsersAccess({ users, addUser, openUser }: { users: typeof initialUsers; addUser: () => void; openUser: (user: typeof initialUsers[number]) => void }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const rows = users.filter((user) => (roleFilter === "All roles" || user.role === roleFilter) && (statusFilter === "All statuses" || user.status === statusFilter) && `${user.firstName} ${user.lastName} ${user.username} ${user.unbId}`.toLowerCase().includes(query.toLowerCase()));
  return <><PageIntro eyebrow="Administration" title="Users & Access" text="Manage personnel authorized to access the equipment manager." action="Add User" onAction={addUser} /><section className="panel user-access-panel"><div className="table-tools user-tools"><label className="search"><Icon name="Search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username, or UNB ID..." /></label><div className="filter-row"><Dropdown options={["All roles", "Administrator", "Technician", "Faculty"]} value={roleFilter} onChange={setRoleFilter} /><Dropdown options={["All statuses", "Active", "Inactive"]} value={statusFilter} onChange={setStatusFilter} /></div></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>UNB ID</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((user) => <tr key={user.id} className="clickable" onClick={() => openUser(user)}><td><strong>{user.firstName} {user.lastName}</strong></td><td className="mono">{user.username}</td><td className="mono">{user.unbId}</td><td>{user.role}</td><td><Badge value={user.status} /></td><td><button className="link" onClick={(event) => { event.stopPropagation(); openUser(user); }}>Manage</button></td></tr>)}</tbody></table></div></section></>;
}

function AddUserModal({ users, close, onCreate }: { users: typeof initialUsers; close: () => void; onCreate: (user: typeof initialUsers[number]) => void }) {
  const [firstName, setFirstName] = useState(""); const [lastName, setLastName] = useState(""); const [username, setUsername] = useState(""); const [unbId, setUnbId] = useState(""); const [role, setRole] = useState("Technician"); const [status, setStatus] = useState("Active"); const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (users.some((user) => user.username.toLowerCase() === username.trim().toLowerCase())) { setError("This username is already in use."); return; }
    if (users.some((user) => user.unbId === unbId.trim())) { setError("This UNB ID is already associated with an account."); return; }
    const nextId = `USR-${String(users.length + 1).padStart(3, "0")}`;
    onCreate({ id: nextId, firstName: firstName.trim(), lastName: lastName.trim(), username: username.trim(), unbId: unbId.trim(), role, status });
  };
  return <div className="modal-backdrop operation-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><form className="modal modal-wide" onSubmit={submit}><div className="modal-head"><div><p>Administration</p><h2>Add user</h2></div><button type="button" className="icon-btn" onClick={close}><Icon name="X" /></button></div><div className="form-grid two-col"><label><span>First Name *</span><input required value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="e.g., Morgan" /></label><label><span>Last Name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="e.g., Sample" /></label><label><span>Username *</span><input required value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} placeholder="e.g., msample" /></label><label><span>UNB ID *</span><input required value={unbId} onChange={(event) => { setUnbId(event.target.value); setError(""); }} placeholder="e.g., 0000902" /></label><label><span>Role *</span><Dropdown options={["Administrator", "Technician", "Faculty"]} value={role} onChange={setRole} /></label><label><span>Account Status</span><Dropdown options={["Active", "Inactive"]} value={status} onChange={setStatus} /></label>{error && <div className="validation-block full"><strong>Unable to create user</strong><span>{error}</span></div>}<div className="security-note full">Account provisioning is simulated in this prototype. Production authentication must use a secure identity workflow and must never expose plaintext passwords.</div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Create User</button></div></form></div>;
}

function UserDetailsModal({ user, close, onSave }: { user: typeof initialUsers[number]; close: () => void; onSave: (user: typeof initialUsers[number]) => void }) {
  const [firstName, setFirstName] = useState(user.firstName); const [lastName, setLastName] = useState(user.lastName); const [role, setRole] = useState(user.role); const [status, setStatus] = useState(user.status); const [saved, setSaved] = useState(false);
  const isCurrentAdmin = user.username === "admin";
  const dirty = firstName !== user.firstName || lastName !== user.lastName || role !== user.role || status !== user.status;
  const requestClose = () => { if (!dirty || window.confirm("You have unsaved changes. Close without saving?")) close(); };
  const save = () => {
    if (!firstName.trim()) return;
    if (isCurrentAdmin && status === "Inactive") { window.alert("You cannot deactivate your own administrator account."); setStatus("Active"); return; }
    if (user.status === "Active" && status === "Inactive" && !window.confirm("Deactivate this account? The user will no longer be able to sign in, but historical records will be preserved.")) return;
    onSave({ ...user, firstName: firstName.trim(), lastName: lastName.trim(), role, status }); setSaved(true);
  };
  const toggleStatus = () => {
    if (isCurrentAdmin) { window.alert("You cannot deactivate your own administrator account."); return; }
    const nextStatus = user.status === "Active" ? "Inactive" : "Active";
    if (nextStatus === "Inactive" && !window.confirm("Deactivate this account? Historical maintenance and lending records will be preserved.")) return;
    onSave({ ...user, status: nextStatus }); setStatus(nextStatus); setSaved(true);
  };
  return <div className="modal-backdrop record-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}><section className="modal record-detail-modal"><div className="modal-head"><div><p>User account · {user.username}</p><h2>{user.firstName} {user.lastName}</h2></div><button type="button" className="icon-btn" onClick={requestClose}><Icon name="X" /></button></div><div className="record-detail-body">{saved && !dirty && <div className="success-message"><strong>User updated</strong><span>Account changes have been saved successfully.</span></div>}<div className="detail-status"><Badge value={user.status} /><Badge value={user.role} /></div><div className="form-grid two-col direct-edit-form"><label><span>Username · Read only</span><input value={user.username} readOnly /></label><label><span>UNB ID · Read only</span><input value={user.unbId} readOnly /></label><label><span>First Name *</span><input required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label><span>Last Name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label><label><span>Role *</span><Dropdown options={["Administrator", "Technician", "Faculty"]} value={role} onChange={setRole} /></label><label><span>Account Status *</span><Dropdown options={isCurrentAdmin ? ["Active"] : ["Active", "Inactive"]} value={status} onChange={setStatus} /></label>{isCurrentAdmin && <div className="security-note full">Your current administrator account cannot be deactivated.</div>}</div></div><div className="modal-actions record-detail-actions">{!isCurrentAdmin && <button className={user.status === "Active" ? "danger" : "secondary"} onClick={toggleStatus}>{user.status === "Active" ? "Deactivate Account" : "Reactivate Account"}</button>}<div className="action-spacer" /><button className="secondary" onClick={requestClose}>Close</button><button className="primary" disabled={!dirty || !firstName.trim()} onClick={save}>Save Changes</button></div></section></div>;
}

function Analytics() {
  const [tab, setTab] = useState("Equipment Availability");
  const tabs = ["Equipment Availability", "Equipment Utilization", "Borrowing Activity", "Borrower Activity"];
  return <><PageIntro eyebrow="Reporting" title="Analytics" text="Understand availability, utilization, lending trends, and borrower activity." extra={<><button className="secondary">Reset Filters</button><button className="primary">Export to Excel</button></>} /><div className="tabs analytics-tabs">{tabs.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</div><section className="panel analytics-panel"><div className="table-tools"><div className="filter-row"><Dropdown options={["All categories"]} /><Dropdown options={["All equipment types"]} /><Dropdown options={["2024", "2023"]} /><button className="primary">Apply Filters</button></div></div><div className="panel-head"><div><h2>{tab}</h2><p>{tab === "Equipment Availability" ? "Asset status by equipment type" : "Annual operational trends and supporting counts"}</p></div></div><div className="stacked-chart">{["Multimeters", "Laptops", "Oscilloscopes", "Splicers", "Hand Tools"].map((x, i) => <div key={x}><label>{x}</label><span><i className="seg available" style={{ width: `${45 + i * 5}%` }} /><i className="seg loaned" style={{ width: "25%" }} /><i className="seg maintained" style={{ width: "15%" }} /><i className="seg retired" /></span></div>)}</div><div className="analytics-kpis">{[["Transactions", "1,284"], ["Total loan days", "8,420"], ["Average duration", "6.6 days"], ["Overdue rate", "4.2%"]].map((x) => <div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div></section></>;
}

function ImportExport() {
  const [tab, setTab] = useState("Import Records"); const [file, setFile] = useState(""); const [recordType, setRecordType] = useState("Assets");
  const borrowerImport = recordType === "Eligible Borrowers — New Term";
  return <><PageIntro eyebrow="Data tools" title="Import & Export" text="Move validated operational records in and out of the equipment manager." /><div className="tabs"><button className={tab === "Import Records" ? "active" : ""} onClick={() => setTab("Import Records")}>Import Records</button><button className={tab === "Export Records" ? "active" : ""} onClick={() => setTab("Export Records")}>Export Records</button></div>{tab === "Import Records" ? <section className="panel import-panel"><div className="stepper"><b>1</b><span>Select type</span><b>2</b><span>Upload</span><b>3</b><span>Validate</span><b>4</b><span>Import</span></div><div className="import-form"><label><span>Record type</span><Dropdown options={["Assets", "Eligible Borrowers — New Term"]} value={recordType} onChange={setRecordType} /></label>{borrowerImport && <><label className="term-field"><span>Academic term</span><Dropdown options={["Fall 2024", "Winter 2025", "Summer 2025"]} defaultValue="Fall 2024" /></label><div className="import-note"><strong>Update eligible borrower records</strong><span>This updates term eligibility only. Lending history, outstanding obligations, certifications, and restrictions remain unchanged.</span></div></>}<label className="upload-box"><input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0]?.name || "")} /><Icon name="Import & Export" size={28} /><strong>{file || "Upload Excel or CSV"}</strong><span>Choose a file to preview and validate records</span></label><div className="modal-actions"><button className="secondary">Cancel</button><button className="secondary" disabled={!file}>Validate</button><button className="primary" disabled={!file}>Confirm Import</button></div></div></section> : <section className="panel export-grid">{["Inventory", "Lending Records", "Borrowers", "Maintenance Records", "Equipment Availability Analysis", "Equipment Utilization Analysis", "Borrowing Activity Analysis", "Borrower Activity Analysis"].map((x) => <label key={x}><input type="checkbox" /><span><strong>{x}</strong><small>Export current filtered records</small></span></label>)}<div className="export-actions"><input type="date" /><input type="date" /><button className="primary">Export to Excel</button></div></section>}</>;
}
function Drawer({ title, eyebrow, close, children, actions }: { title: string; eyebrow: string; close: () => void; children: ReactNode; actions: ReactNode }) {
  return <div className="modal-backdrop record-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><section className="modal record-detail-modal"><div className="modal-head"><div><p>{eyebrow}</p><h2>{title}</h2></div><button type="button" className="icon-btn" onClick={close}><Icon name="X" /></button></div><div className="record-detail-body">{children}</div><div className="modal-actions record-detail-actions">{actions}</div></section></div>;
}

function AssetDetailsModal({ item, role, close, navigate, openOperational, onSave, onRestore }: { item: typeof initialAssets[number]; role: Role; close: () => void; navigate: (page: Page, filter?: string) => void; openOperational: (kind: ModalKind, asset: typeof initialAssets[number]) => void; onSave: (asset: typeof initialAssets[number]) => void; onRestore: (asset: typeof initialAssets[number]) => void }) {
  const [name, setName] = useState(item.name);
  const [serial, setSerial] = useState(item.serial);
  const [acquired, setAcquired] = useState(item.acquired);
  const [category, setCategory] = useState(item.category);
  const [equipmentType, setEquipmentType] = useState(item.type);
  const [certifications, setCertifications] = useState(item.certifications);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingType, setCreatingType] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState("");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [saved, setSaved] = useState(false);
  const resolvedCategory = creatingCategory ? newCategory.trim() : category;
  const resolvedType = creatingType ? newType.trim() : equipmentType;
  const dirty = name !== item.name || serial !== item.serial || acquired !== item.acquired || resolvedCategory !== item.category || resolvedType !== item.type || certifications !== item.certifications;
  const requestClose = () => {
    if (!dirty || window.confirm("You have unsaved changes. Close without saving?")) close();
  };
  const goTo = (page: Page) => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them and continue?")) return;
    close(); navigate(page, item.id);
  };
  const runOperational = (kind: ModalKind) => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them and continue?")) return;
    openOperational(kind, item);
  };
  const restore = () => {
    if (window.confirm(`Restore ${item.id} to inventory with its existing ${item.status} status?`)) onRestore(item);
  };
  const available = !item.archived && item.status === "Available";
  const maintenanceAllowed = !item.archived && !["On Loan", "Under Maintenance", "Retired"].includes(item.status);
  const chooseCategory = (value: string) => {
    setTaxonomyError(""); setEquipmentType(""); setNewType("");
    if (value === "__new__") { setCreatingCategory(true); setCreatingType(true); setNewCategory(""); }
    else { setCategory(value); setCreatingCategory(false); setCreatingType(false); }
  };
  const chooseType = (value: string) => {
    setTaxonomyError("");
    if (value === "__new__") { setCreatingType(true); setNewType(""); }
    else { setEquipmentType(value); setCreatingType(false); }
  };
  const cancelNewCategory = () => { setCategory(item.category); setEquipmentType(item.type); setCreatingCategory(false); setCreatingType(false); setNewCategory(""); setNewType(""); setTaxonomyError(""); };
  const cancelNewType = () => { setEquipmentType(""); setCreatingType(false); setNewType(""); setTaxonomyError(""); };
  const save = () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (creatingCategory && Object.keys(categories).some((existing) => existing.toLowerCase() === resolvedCategory.toLowerCase())) { setTaxonomyError("A category with this name already exists."); return; }
    if (!resolvedCategory) { setTaxonomyError("Select or create a category."); return; }
    if (creatingType && (categories[resolvedCategory] || []).some((existing) => existing.toLowerCase() === resolvedType.toLowerCase())) { setTaxonomyError("This equipment type already exists in the selected category."); return; }
    if (!resolvedType) { setTaxonomyError("Select or create an equipment type."); return; }
    if (creatingCategory) categories[resolvedCategory] = [resolvedType];
    else if (creatingType) categories[resolvedCategory] = [...(categories[resolvedCategory] || []), resolvedType];
    onSave({ ...item, name: cleanName, serial: serial.trim(), acquired, category: resolvedCategory, type: resolvedType, certifications: certifications.trim() });
    setCreatingCategory(false); setCreatingType(false); setCategory(resolvedCategory); setEquipmentType(resolvedType); setTaxonomyError(""); setSaved(true);
  };
  return <div className="modal-backdrop asset-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}><section className="modal asset-detail-modal"><div className="modal-head"><div><p>Asset details · {item.id}</p><h2>{item.name}</h2></div><button type="button" className="icon-btn" onClick={requestClose}><Icon name="X" /></button></div><div className="asset-detail-scroll">{saved && !dirty && <div className="success-message"><strong>Asset updated</strong><span>Your changes have been saved successfully.</span></div>}<div className="detail-status"><Badge value={item.archived ? "Archived" : item.status} />{item.status === "On Loan" && <span>Borrowed by Alex Example · expected return Jun 18</span>}</div><div className="form-grid two-col asset-detail-form"><label><span>Asset ID · Read only</span><input value={item.id} readOnly /></label><label><span>Current Status · Read only</span><input value={item.status} readOnly /></label>{item.status === "On Loan" && <label className="full"><span>Current Borrower and Loan · Read only</span><input value="Alex Example · Expected return Jun 18" readOnly /></label>}<label><span>Asset Name *</span><input required disabled={item.archived} value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>Serial Number</span><input disabled={item.archived} value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="e.g., FLK-87V-12345" /></label><label><span>Category *</span><Dropdown disabled={item.archived} value={creatingCategory ? "__new__" : category} onChange={chooseCategory} options={[...Object.keys(categories), { label: "+ Create New Category", value: "__new__", action: true }]} /></label>{creatingCategory && <label className="inline-create"><span>Category Name *</span><input required value={newCategory} onChange={(event) => { setNewCategory(event.target.value); setTaxonomyError(""); }} placeholder="e.g., Test Equipment" /><button type="button" className="link" onClick={cancelNewCategory}>Cancel new category</button></label>}{!creatingCategory && <label><span>Equipment Type *</span><Dropdown disabled={item.archived} value={creatingType ? "__new__" : equipmentType} onChange={chooseType} options={[...(categories[category] || []), { label: "+ Create New Equipment Type", value: "__new__", action: true }]} /></label>}{creatingType && <label className={creatingCategory ? "" : "inline-create"}><span>Equipment Type Name *</span><input required value={newType} onChange={(event) => { setNewType(event.target.value); setTaxonomyError(""); }} placeholder="e.g., Digital Multimeter" />{!creatingCategory && <button type="button" className="link" onClick={cancelNewType}>Cancel new equipment type</button>}</label>}{creatingType && <label className="category-context"><span>Associated Category</span><input readOnly value={creatingCategory ? newCategory || "New category" : category} /></label>}<label><span>Acquisition Date</span><input disabled={item.archived} type="date" value={acquired} onChange={(event) => setAcquired(event.target.value)} /></label><label className="full"><span>Required Certifications</span><input disabled={item.archived} value={certifications} onChange={(event) => setCertifications(event.target.value)} placeholder="e.g., Lab Safety, Electrical Safety" /></label>{taxonomyError && <div className="validation-block taxonomy-error"><strong>Unable to save changes</strong><span>{taxonomyError}</span></div>}</div><div className="history-links"><button onClick={() => goTo("Lending")}>View Lending History <Icon name="Chevron" size={14} /></button><button onClick={() => goTo("Maintenance")}>View Maintenance History <Icon name="Chevron" size={14} /></button></div><div className="history-note"><strong>Lifecycle safeguards</strong><span>{item.archived ? "Archived assets remain available for historical review but cannot be loaned or maintained." : "Operational actions are disabled while the asset has an active loan, maintenance record, or retired status."}</span></div></div><div className="modal-actions asset-detail-actions">{item.archived ? <><div /><button className="secondary" onClick={requestClose}>Close</button>{role === "Administrator" && <button className="primary" onClick={restore}>Restore Asset</button>}</> : <><button className="danger" onClick={() => runOperational("delete")} disabled={role !== "Administrator" || item.status === "On Loan" || item.status === "Under Maintenance"}>Archive Asset</button><div /><button className="secondary" disabled={!available} onClick={() => runOperational("loan")}>Checkout</button><button className="secondary" disabled={!maintenanceAllowed} onClick={() => runOperational("maintenance")}>Start Maintenance</button><button className="primary" disabled={!dirty || !name.trim()} onClick={save}>Save Changes</button></>}</div></section></div>;
}

function LoanDetailsModal({ item, close, processReturn }: { item: typeof loans[number]; close: () => void; processReturn: () => void }) {
  return <Drawer title={item.asset} eyebrow={`${item.assetId} · Loan record`} close={close} actions={<>{item.status !== "Completed" && <button className="primary" onClick={processReturn}>Process Return</button>}</>}><div className="detail-status"><Badge value={item.status} /></div><dl className="detail-list"><div><dt>Borrower</dt><dd>{item.borrower}</dd></div><div><dt>UNB ID</dt><dd>{item.borrowerId}</dd></div><div><dt>Checkout date</dt><dd>{item.checkout}</dd></div><div><dt>Expected return</dt><dd>{item.due}</dd></div><div><dt>Validation</dt><dd>Eligible · certifications verified</dd></div></dl><div className="history-note"><strong>Permanent transaction record</strong><span>This loan remains in history after the equipment is returned.</span></div></Drawer>;
}

function BorrowerDetailsModal({ item, role, close, navigate, onSave, manageFlags }: { item: typeof borrowers[number]; role: Role; close: () => void; navigate: (page: Page, filter?: string) => void; onSave: (borrower: typeof borrowers[number]) => void; manageFlags: () => void }) {
  const nameParts = item.name.split(" ");
  const lastName = nameParts.slice(1).join(" ");
  const [firstName, setFirstName] = useState(nameParts[0]);
  const [eligibility, setEligibility] = useState(item.eligibility);
  const [certifications, setCertifications] = useState(item.certs === "None" ? [] : item.certs.split(", "));
  const [saved, setSaved] = useState(false);
  const certValue = certifications.length ? certifications.join(", ") : "None";
  const fullName = `${firstName.trim()}${lastName ? ` ${lastName}` : ""}`;
  const dirty = fullName !== item.name || eligibility !== item.eligibility || certValue !== item.certs;
  const requestClose = () => { if (!dirty || window.confirm("You have unsaved changes. Close without saving?")) close(); };
  const save = () => {
    if (!firstName.trim()) return;
    onSave({ ...item, name: fullName, eligibility, certs: certValue });
    setSaved(true);
  };
  const viewRecords = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them and continue?")) return;
    close(); navigate("Lending", item.id);
  };
  const openFlags = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard them and continue?")) return;
    manageFlags();
  };
  return <div className="modal-backdrop record-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}><section className="modal record-detail-modal"><div className="modal-head"><div><p>Borrower details · UNB ID {item.id}</p><h2>{item.name}</h2></div><button type="button" className="icon-btn" onClick={requestClose}><Icon name="X" /></button></div><div className="record-detail-body">{saved && !dirty && <div className="success-message"><strong>Borrower updated</strong><span>Your changes have been saved successfully.</span></div>}<div className="detail-status"><Badge value={item.eligibility} /><Badge value={item.standing} /></div><div className="form-grid two-col direct-edit-form"><label><span>UNB ID · Read only</span><input value={item.id} readOnly /></label><label><span>Standing · System controlled</span><input value={item.standing} readOnly /></label><label><span>First Name *</span><input required value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label><label><span>Eligibility Status *</span><Dropdown options={["Eligible", "Ineligible"]} value={eligibility} onChange={setEligibility} /></label><label className="full"><span>Certifications</span><CertificationMultiSelect value={certifications} onChange={setCertifications} /></label><label><span>Active Loans · Read only</span><input value={item.active} readOnly /></label><label><span>Overdue Equipment · Read only</span><input value={item.overdue ? `${item.overdue} outstanding` : "None"} readOnly /></label><label className="full"><span>Negligent Damage Flags · Read only</span><input value={item.damageFlags ? `${item.damageFlags} unresolved` : "None"} readOnly /></label></div><button className="record-navigation" onClick={viewRecords}>View Borrowing Records <Icon name="Chevron" size={14} /></button></div><div className="modal-actions record-detail-actions">{role === "Administrator" && <button className="secondary" onClick={openFlags}>Manage Damage Flags</button>}<div className="action-spacer" /><button className="primary" disabled={!dirty || !firstName.trim()} onClick={save}>Save Changes</button></div></section></div>;
}

function MaintenanceDetailsModal({ item, close, onSave, onComplete }: { item: typeof maintenance[number]; close: () => void; onSave: (record: typeof maintenance[number]) => void; onComplete: () => void }) {
  const completed = item.status === "Completed";
  const [type, setType] = useState(item.type);
  const [priority, setPriority] = useState(item.priority);
  const [technician, setTechnician] = useState(item.technician);
  const [start, setStart] = useState(item.start);
  const [notes, setNotes] = useState(item.notes);
  const [saved, setSaved] = useState(false);
  const dirty = !completed && (type !== item.type || priority !== item.priority || technician !== item.technician || start !== item.start || notes !== item.notes);
  const requestClose = () => { if (!dirty || window.confirm("You have unsaved changes. Close without saving?")) close(); };
  const save = () => { onSave({ ...item, type, priority, technician, start, notes }); setSaved(true); };
  const complete = () => { if (!dirty || window.confirm("Discard unsaved edits and continue to completion?")) onComplete(); };
  return <div className="modal-backdrop record-detail-backdrop" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}><section className="modal record-detail-modal maintenance-detail-modal"><div className="modal-head"><div><p>Maintenance record · {item.id}</p><h2>{item.asset}</h2></div><button type="button" className="icon-btn" onClick={requestClose}><Icon name="X" /></button></div><div className="record-detail-body">{saved && !dirty && <div className="success-message"><strong>Maintenance record updated</strong><span>Your changes have been saved successfully.</span></div>}<div className="detail-status"><Badge value={item.status} /><Badge value={item.priority} /></div><div className="form-grid two-col direct-edit-form"><label><span>Asset ID · Read only</span><input value={item.assetId} readOnly /></label><label><span>Asset Name · Read only</span><input value={item.assetName} readOnly /></label><label><span>Maintenance Status · Read only</span><input value={item.status} readOnly /></label><label><span>Completion Date · Read only</span><input value={item.completionDate || "Not completed"} readOnly /></label>{completed ? <><label><span>Maintenance Type · Read only</span><input value={item.type} readOnly /></label><label><span>Priority · Read only</span><input value={item.priority} readOnly /></label><label><span>Responsible Technician · Read only</span><input value={item.technician} readOnly /></label><label><span>Start Date · Read only</span><input value={item.start} readOnly /></label><label className="full"><span>Maintenance Notes · Read only</span><textarea value={item.notes} readOnly /></label><label className="full"><span>Resolution Notes · Read only</span><textarea value={item.resolution || "No resolution notes provided."} readOnly /></label></> : <><label><span>Maintenance Type *</span><Dropdown options={["Inspection", "Preventative Care", "Repair", "Calibration", "Cleaning", "Software Service"]} value={type} onChange={setType} /></label><label><span>Priority *</span><Dropdown options={["Low", "Medium", "High", "Urgent"]} value={priority} onChange={setPriority} /></label><label><span>Responsible Technician *</span><Dropdown options={["Morgan Sample", "Riley Sample"]} value={technician} onChange={setTechnician} /></label><label><span>Start Date *</span><input required type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label><label className="full"><span>Maintenance Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional service notes" /></label></>}</div></div><div className="modal-actions record-detail-actions"><div className="action-spacer" />{completed ? <button className="secondary" onClick={close}>Close</button> : <><button className="secondary" disabled={!dirty || !start} onClick={save}>Save Changes</button><button className="primary" onClick={complete}>Complete Maintenance</button></>}</div></section></div>;
}

function MaintenanceCompletionModal({ item, close, onComplete }: { item: typeof maintenance[number]; close: () => void; onComplete: (date: string, resolution: string, outcome: "Available" | "Retired") => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [completionDate, setCompletionDate] = useState(today);
  const [resolution, setResolution] = useState("");
  const [outcome, setOutcome] = useState<"Available" | "Retired" | "">("");
  const [error, setError] = useState("");
  const dirty = completionDate !== today || resolution.trim() !== "" || outcome !== "";
  const requestClose = () => { if (!dirty || window.confirm("Discard completion details?")) close(); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (item.status === "Completed") { setError("This maintenance record has already been completed."); return; }
    if (completionDate < item.start) { setError("Completion date cannot precede the maintenance start date."); return; }
    if (completionDate > today) { setError("Completion date cannot be in the future."); return; }
    if (!outcome) { setError("Select a maintenance outcome before confirming completion."); return; }
    if (outcome === "Retired" && !window.confirm("Retire this asset? It will no longer be available for lending, but all historical records will be preserved.")) return;
    onComplete(completionDate, resolution.trim(), outcome);
  };
  return <div className="modal-backdrop operation-backdrop" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}><form className="modal modal-wide" onSubmit={submit}><div className="modal-head"><div><p>Complete maintenance</p><h2>{item.asset}</h2></div><button type="button" className="icon-btn" onClick={requestClose}><Icon name="X" /></button></div><div className="form-grid two-col"><label className="full"><span>Asset · Read only</span><input value={item.asset} readOnly /></label><label><span>Maintenance Type · Read only</span><input value={item.type} readOnly /></label><label><span>Responsible Technician · Read only</span><input value={item.technician} readOnly /></label><label><span>Completion Date *</span><input required type="date" min={item.start} max={today} value={completionDate} onChange={(event) => { setCompletionDate(event.target.value); setError(""); }} /></label><label className="full"><span>Resolution Notes</span><textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Describe the work performed and outcome" /></label><fieldset className="outcome-group full"><legend>Maintenance Outcome *</legend><label className={outcome === "Available" ? "selected" : ""}><input type="radio" name="maintenance-outcome" checked={outcome === "Available"} onChange={() => { setOutcome("Available"); setError(""); }} /><span><strong>Return to Service</strong><small>Maintenance was successful, and the equipment is ready for use.</small></span></label><label className={outcome === "Retired" ? "selected retire" : "retire"}><input type="radio" name="maintenance-outcome" checked={outcome === "Retired"} onChange={() => { setOutcome("Retired"); setError(""); }} /><span><strong>Retire Asset</strong><small>Equipment is no longer suitable for use and cannot be checked out.</small></span></label></fieldset>{error && <div className="validation-block full"><strong>Unable to complete maintenance</strong><span>{error}</span></div>}</div><div className="modal-actions"><button type="button" className="secondary" onClick={requestClose}>Cancel</button><button className="primary" disabled={!outcome}>Confirm Completion</button></div></form></div>;
}

function DamageFlagsModal({ item, close, onSave }: { item: typeof borrowers[number]; close: () => void; onSave: (borrower: typeof borrowers[number]) => void }) {
  const [flags, setFlags] = useState(item.damageFlags);
  const dirty = flags !== item.damageFlags;
  const requestClose = () => { if (!dirty || window.confirm("Discard damage flag changes?")) close(); };
  const save = () => {
    const standing = flags > 0 ? "Damage flag" : item.overdue > 0 ? "Overdue" : "Good";
    onSave({ ...item, damageFlags: flags, standing });
  };
  return <div className="modal-backdrop operation-backdrop" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}><section className="modal confirm-modal"><div className="modal-head"><div><p>Borrower restriction</p><h2>Manage damage flags</h2></div><button type="button" className="icon-btn" onClick={requestClose}><Icon name="X" /></button></div><div className="flag-manager"><div><span>Borrower</span><strong>{item.name}</strong></div><div><span>Unresolved negligent damage flags</span><strong>{flags}</strong></div><p>A damaged return is not automatically negligent. Record a flag only after the incident has been reviewed.</p><div className="flag-controls"><button type="button" className="secondary" disabled={flags === 0} onClick={() => setFlags(Math.max(0, flags - 1))}>Resolve Existing Flag</button><button type="button" className="danger" onClick={() => setFlags(flags + 1)}>Record Damage Flag</button></div></div><div className="modal-actions"><button className="secondary" onClick={requestClose}>Cancel</button><button className="primary" disabled={!dirty} onClick={save}>Save Changes</button></div></section></div>;
}

// Keeps stale Vite Fast Refresh closures safe while the current App renders the dedicated detail modals below.
function DetailDrawer({ kind, item, role, close, openModal }: { kind: string; item: any; role: Role; close: () => void; openModal: (kind: ModalKind) => void }) {
  if (kind === "loan") return <LoanDetailsModal item={item} close={close} processReturn={() => { close(); openModal("return"); }} />;
  if (kind === "borrower") return <BorrowerDetailsModal item={item} role={role} close={close} navigate={() => close()} onSave={close} manageFlags={close} />;
  if (kind === "maintenance") return <MaintenanceDetailsModal item={item} close={close} onSave={close} onComplete={close} />;
  return null;
}

function Modal({ kind, close, asset, assetRecords, borrowerRecords, onArchive }: { kind: Exclude<ModalKind, null>; close: () => void; asset?: typeof initialAssets[number] | null; assetRecords: typeof initialAssets; borrowerRecords: typeof borrowers; onArchive: (asset: typeof initialAssets[number]) => void }) {
  const [category, setCategory] = useState(""); const [equipmentType, setEquipmentType] = useState(""); const [newCategory, setNewCategory] = useState(""); const [newType, setNewType] = useState(""); const [creatingCategory, setCreatingCategory] = useState(false); const [creatingType, setCreatingType] = useState(false); const [taxonomyError, setTaxonomyError] = useState(""); const [condition, setCondition] = useState("Intact"); const [blocked, setBlocked] = useState(false);
  const title = { asset: "Add Asset", loan: "New Loan", borrower: "Add Borrower", maintenance: "New Maintenance", return: "Process Return", delete: "Archive Asset" }[kind];
  const chooseCategory = (value: string) => {
    setTaxonomyError(""); setEquipmentType(""); setNewType("");
    if (value === "__new__") { setCategory(""); setNewCategory(""); setCreatingCategory(true); setCreatingType(true); }
    else { setCategory(value); setCreatingCategory(false); setCreatingType(false); }
  };
  const chooseType = (value: string) => { setTaxonomyError(""); if (value === "__new__") { setEquipmentType(""); setNewType(""); setCreatingType(true); } else { setEquipmentType(value); setCreatingType(false); } };
  const cancelNewCategory = () => { setCategory(""); setEquipmentType(""); setNewCategory(""); setNewType(""); setCreatingCategory(false); setCreatingType(false); setTaxonomyError(""); };
  const cancelNewType = () => { setEquipmentType(""); setNewType(""); setCreatingType(false); setTaxonomyError(""); };
  const submit = (e: FormEvent) => {
    e.preventDefault(); if (kind === "loan" && blocked) return;
    if (kind === "delete" && asset) { onArchive(asset); return; }
    if (kind === "asset") {
      const cleanCategory = newCategory.trim(); const cleanType = newType.trim();
      if (creatingCategory && Object.keys(categories).some((name) => name.toLowerCase() === cleanCategory.toLowerCase())) { setTaxonomyError("A category with this name already exists."); return; }
      const selectedCategory = creatingCategory ? cleanCategory : category;
      if (!selectedCategory) { setTaxonomyError("Select or create a category."); return; }
      if (creatingType && (categories[selectedCategory] || []).some((name) => name.toLowerCase() === cleanType.toLowerCase())) { setTaxonomyError("This equipment type already exists in the selected category."); return; }
      if (!(creatingType ? cleanType : equipmentType)) { setTaxonomyError("Select or create an equipment type."); return; }
    }
    close();
  };
  if (kind === "delete") return <div className="modal-backdrop"><form className="modal confirm-modal" onSubmit={submit}><div className="modal-head"><div><p>Confirmation required</p><h2>Archive this asset?</h2></div></div><div className="confirm-copy">The asset will move to Archived Assets and can be restored later. Its lending and maintenance history will be preserved.</div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="danger">Archive Asset</button></div></form></div>;
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}><form className="modal modal-wide" onSubmit={submit}><div className="modal-head"><div><p>New record</p><h2>{title}</h2></div><button type="button" className="icon-btn" onClick={close}><Icon name="X" /></button></div><div className="form-grid two-col">
    {kind === "asset" && <><label><span>Asset Name *</span><input required placeholder="e.g., Digital Multimeter" /></label><label><span>Category *</span><Dropdown placeholder="Select a category" value={creatingCategory ? "__new__" : category} onChange={chooseCategory} options={[...Object.keys(categories), { label: "+ Create New Category", value: "__new__", action: true }]} /></label>{creatingCategory && <label className="inline-create"><span>Category Name *</span><input required value={newCategory} onChange={(e) => { setNewCategory(e.target.value); setTaxonomyError(""); }} placeholder="e.g., Test Equipment" /><button type="button" className="link" onClick={cancelNewCategory}>Cancel new category</button></label>}{!creatingCategory && <label><span>Equipment Type *</span><Dropdown placeholder={category ? "Select an equipment type" : "Select a category first"} disabled={!category} value={creatingType ? "__new__" : equipmentType} onChange={chooseType} options={category ? [...(categories[category] || []), { label: "+ Create New Equipment Type", value: "__new__", action: true }] : []} /></label>}{creatingType && <label className={creatingCategory ? "" : "inline-create"}><span>Equipment Type Name *</span><input required value={newType} onChange={(e) => { setNewType(e.target.value); setTaxonomyError(""); }} placeholder="e.g., Digital Multimeter" />{!creatingCategory && <button type="button" className="link" onClick={cancelNewType}>Cancel new equipment type</button>}</label>}{creatingType && <label className="category-context"><span>Associated Category</span><input readOnly value={creatingCategory ? newCategory || "New category" : category} /></label>}<label><span>Acquisition Date</span><input type="date" /></label><label><span>Serial Number</span><input placeholder="e.g., FLK-87V-12345" /></label>{taxonomyError && <div className="validation-block taxonomy-error"><strong>Unable to save asset</strong><span>{taxonomyError}</span></div>}</>}
    {kind === "loan" && <><label><span>Asset *</span><Dropdown placeholder="Select available asset" defaultValue={asset?.id || ""} options={assetRecords.filter((record) => !record.archived && record.status === "Available").map((record) => ({ label: `${record.id} · ${record.name}`, value: record.id }))} /></label><label><span>Borrower *</span><BorrowerAutocomplete records={borrowerRecords} /></label><label><span>Checkout Date *</span><input type="date" required /></label><label><span>Expected Return Date *</span><input type="date" required /></label>{blocked && <div className="validation-block"><strong>Checkout blocked</strong><span>This asset is under maintenance and cannot be loaned until service is complete.</span></div>}</>}
    {kind === "borrower" && <><label><span>UNB ID *</span><input required placeholder="e.g., 0000101" /></label><label><span>First Name *</span><input required placeholder="e.g., Alex" /></label><label><span>Last Name *</span><input required placeholder="e.g., Example" /></label><label><span>Eligibility Status *</span><Dropdown options={["Eligible", "Ineligible"]} /></label><label><span>Certifications</span><input placeholder="Select certifications" /></label></>}
    {kind === "maintenance" && <><label><span>Asset *</span><Dropdown placeholder="Search asset..." defaultValue={asset?.id || ""} options={assetRecords.filter((record) => !record.archived && record.status === "Available").map((record) => ({ label: `${record.id} · ${record.name}`, value: record.id }))} /></label><label><span>Maintenance Type *</span><Dropdown options={["Inspection", "Preventative Care", "Repair", "Calibration", "Cleaning", "Software Service"]} /></label><label><span>Priority *</span><Dropdown options={["Low", "Medium", "High", "Urgent"]} /></label><label><span>Responsible Technician *</span><Dropdown options={["Morgan Sample", "Riley Sample"]} /></label><label><span>Start Date *</span><input type="date" /></label><label><span>Notes</span><input placeholder="Optional service notes" /></label></>}
    {kind === "return" && <><label><span>Actual Return Date *</span><input required type="date" /></label><label><span>Return Condition *</span><Dropdown options={["Intact", "Damaged"]} value={condition} onChange={setCondition} /></label>{condition === "Damaged" && <label className="full"><span>Damage Notes *</span><textarea required placeholder="Describe the damage found..." /></label>}</>}
  </div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={blocked}>{kind === "loan" ? "Confirm Checkout" : kind === "return" ? "Confirm Return" : kind === "asset" ? "Save Asset" : "Save"}</button></div></form></div>;
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [page, setPage] = useState<Page>("Dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [borrowerRecords, setBorrowerRecords] = useState(borrowers);
  const [maintenanceRecords, setMaintenanceRecords] = useState(maintenance);
  const [users, setUsers] = useState(initialUsers);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [drawer, setDrawer] = useState<{ kind: string; item: any } | null>(null);
  const [completionRecord, setCompletionRecord] = useState<typeof maintenance[number] | null>(null);
  const [flagsBorrower, setFlagsBorrower] = useState<typeof borrowers[number] | null>(null);
  const [filter, setFilter] = useState("");
  const [actionAsset, setActionAsset] = useState<typeof initialAssets[number] | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const navigate = (nextPage: Page, nextFilter = "") => {
    if (nextPage === "Users & Access" && role !== "Administrator") return;
    setPage(nextPage); setFilter(nextFilter); setNavOpen(false);
  };
  const saveBorrower = (updated: typeof borrowers[number]) => {
    setBorrowerRecords((current) => current.map((borrower) => borrower.id === updated.id ? updated : borrower));
    setDrawer({ kind: "borrower", item: updated });
  };
  const saveMaintenance = (updated: typeof maintenance[number]) => {
    setMaintenanceRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
    setDrawer({ kind: "maintenance", item: updated });
  };
  const completeMaintenance = (date: string, resolution: string, outcome: "Available" | "Retired") => {
    if (!completionRecord || completionRecord.status === "Completed") return;
    const updated = { ...completionRecord, status: "Completed", completionDate: date, resolution };
    setMaintenanceRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
    setAssets((current) => current.map((asset) => asset.id === updated.assetId && asset.status === "Under Maintenance" ? { ...asset, status: outcome } : asset));
    setCompletionRecord(null);
    setDrawer({ kind: "maintenance", item: updated });
    setNotice(outcome === "Retired" ? "Maintenance completed and the asset was retired." : "Maintenance completed and the asset was returned to service.");
  };
  if (!role) return <Login users={users} onLogin={(nextRole) => { setRole(nextRole); if (nextRole !== "Administrator" && page === "Users & Access") setPage("Dashboard"); }} />;
  return <div className="app-shell"><Sidebar page={page} role={role} open={navOpen} navigate={navigate} logout={() => setRole(null)} /><div className="main-shell"><Header page={page} role={role} openNav={() => setNavOpen(true)} /><main>
    {page === "Dashboard" && <Dashboard navigate={navigate} openLoan={(item) => setDrawer({ kind: "loan", item })} />}
    {page === "Assets" && <Assets role={role} initialFilter={filter} assets={assets} openModal={() => setModal("asset")} openDrawer={(item) => setDrawer({ kind: "asset", item })} />}
    {page === "Lending" && <Lending initialFilter={filter} openModal={() => setModal("loan")} openDrawer={(item) => setDrawer({ kind: "loan", item })} />}
    {page === "Borrowers" && <Borrowers records={borrowerRecords} openModal={() => setModal("borrower")} openDrawer={(item) => setDrawer({ kind: "borrower", item })} />}
    {page === "Maintenance" && <Maintenance initialFilter={filter} records={maintenanceRecords} openModal={() => setModal("maintenance")} openDrawer={(item) => setDrawer({ kind: "maintenance", item })} />}
    {page === "Analytics" && <Analytics />}{page === "Import & Export" && <ImportExport />}
    {page === "Users & Access" && role === "Administrator" && <UsersAccess users={users} addUser={() => setAddUserOpen(true)} openUser={(item) => setDrawer({ kind: "user", item })} />}
  </main></div>
  {drawer?.kind === "asset" ? <AssetDetailsModal item={drawer.item} role={role} close={() => setDrawer(null)} navigate={navigate} onSave={(updated) => { setAssets((current) => current.map((asset) => asset.id === updated.id ? updated : asset)); setDrawer({ kind: "asset", item: updated }); }} onRestore={(restored) => { const updated = { ...restored, archived: false }; setAssets((current) => current.map((asset) => asset.id === updated.id ? updated : asset)); setDrawer({ kind: "asset", item: updated }); setNotice("Asset restored to inventory with its previous status."); }} openOperational={(kind, asset) => { setActionAsset(asset); setDrawer(null); setModal(kind); }} /> : drawer?.kind === "borrower" ? <BorrowerDetailsModal item={drawer.item} role={role} close={() => setDrawer(null)} navigate={navigate} onSave={saveBorrower} manageFlags={() => { setFlagsBorrower(drawer.item); setDrawer(null); }} /> : drawer?.kind === "maintenance" ? <MaintenanceDetailsModal item={drawer.item} close={() => setDrawer(null)} onSave={saveMaintenance} onComplete={() => { setCompletionRecord(drawer.item); setDrawer(null); }} /> : drawer?.kind === "loan" ? <LoanDetailsModal item={drawer.item} close={() => setDrawer(null)} processReturn={() => { setDrawer(null); setModal("return"); }} /> : drawer?.kind === "user" ? <UserDetailsModal user={drawer.item} close={() => setDrawer(null)} onSave={(updated) => { setUsers((current) => current.map((user) => user.id === updated.id ? updated : user)); setDrawer({ kind: "user", item: updated }); setNotice("User account updated."); }} /> : null}
  {completionRecord && <MaintenanceCompletionModal item={completionRecord} close={() => setCompletionRecord(null)} onComplete={completeMaintenance} />}
  {flagsBorrower && <DamageFlagsModal item={flagsBorrower} close={() => setFlagsBorrower(null)} onSave={(updated) => { setBorrowerRecords((current) => current.map((borrower) => borrower.id === updated.id ? updated : borrower)); setFlagsBorrower(null); setDrawer({ kind: "borrower", item: updated }); setNotice("Borrower damage flags updated."); }} />}
  {addUserOpen && <AddUserModal users={users} close={() => setAddUserOpen(false)} onCreate={(user) => { setUsers((current) => [...current, user]); setAddUserOpen(false); setNotice("User account created successfully."); }} />}
  {modal && <Modal kind={modal} asset={actionAsset} assetRecords={assets} borrowerRecords={borrowerRecords} onArchive={(asset) => { setAssets((current) => current.map((item) => item.id === asset.id ? { ...item, archived: true } : item)); setModal(null); setActionAsset(null); setNotice("Asset archived. Historical records were preserved."); }} close={() => { setModal(null); setActionAsset(null); }} />}
  {notice && <div className="app-notice"><strong>Success</strong><span>{notice}</span></div>}
  </div>;
}
