export default function Sidebar() {
  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="ECE Equipment Manager home">
        <span className="brand-name">ECE Equipment<br />Manager</span>
      </a>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-section-label">WORKSPACE</span>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
            <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
            <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
            <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
          </svg>
          Dashboard
        </span>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 5.5h5l1.5 1.8H17v7.2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z" />
            <path d="M3 7.3h14" />
          </svg>
          Categories
        </span>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="m10 2.7 6.8 3.7v7.2L10 17.3l-6.8-3.7V6.4z" />
            <path d="m3.4 6.6 6.6 3.7 6.6-3.7M10 10.3v6.8" />
          </svg>
          Equipment Types
        </span>
        <a className="sidebar-link sidebar-link-active" href="/" aria-current="page">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 6.5h14v9A1.5 1.5 0 0 1 15.5 17h-11A1.5 1.5 0 0 1 3 15.5z" />
            <path d="M2.5 6.5 4 3h12l1.5 3.5M7 6.5v2h6v-2" />
          </svg>
          Assets
        </a>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 6h12m0 0-2.5-2.5M15 6l-2.5 2.5M17 14H5m0 0 2.5-2.5M5 14l2.5 2.5" />
          </svg>
          Loans
        </span>
        <span className="sidebar-section-label sidebar-section-settings">ADMINISTRATION</span>
        <span className="sidebar-link sidebar-link-disabled" aria-disabled="true">
          <svg className="nav-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="m8.4 2.8.4-1h2.4l.4 1a7 7 0 0 1 1.5.7l1-.4 1.7 1.7-.4 1a7 7 0 0 1 .7 1.5l1 .4v2.4l-1 .4a7 7 0 0 1-.7 1.5l.4 1-1.7 1.7-1-.4a7 7 0 0 1-1.5.7l-.4 1H8.8l-.4-1a7 7 0 0 1-1.5-.7l-1 .4-1.7-1.7.4-1a7 7 0 0 1-.7-1.5l-1-.4V7.7l1-.4a7 7 0 0 1 .7-1.5l-.4-1 1.7-1.7 1 .4a7 7 0 0 1 1.5-.7Z" transform="translate(1 1)" />
            <circle cx="10" cy="10" r="2.3" />
          </svg>
          Settings
        </span>
      </nav>
    </aside>
  )
}
