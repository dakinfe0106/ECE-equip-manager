import { Link } from 'react-router'
import type { DashboardSummary } from '../api'

interface DashboardSummaryCardsProps {
    summary: DashboardSummary
}

const cards = [
    {
        key: 'total_assets',
        label: 'Total Assets',
        canViewDetails: true,
        iconBackground: 'bg-[#eaf1ff]',
        iconColor: 'text-[#2f6fed]',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="7" y="3.5" width="10" height="17" rx="1" />
                <path d="M9.5 7h5M9.5 10h5M9.5 13h5" />
            </svg>
        ),
    },
    {
        key: 'available_assets',
        label: 'Available Assets',
        canViewDetails: false,
        iconBackground: 'bg-[#e5f8f3]',
        iconColor: 'text-[#087c68]',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="7" y="3.5" width="10" height="17" rx="1" />
                <path d="M9.5 7h5M9.5 10h5M9.5 13h5" />
            </svg>
        ),
    },
    {
        key: 'on_loan_assets',
        label: 'Assets On Loan',
        canViewDetails: false,
        iconBackground: 'bg-[#f0eafa]',
        iconColor: 'text-[#7047bf]',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9h12M8 9V6h8v3M7 12v6M17 12v6M5 18h14" />
            </svg>
        ),
    },
    {
        key: 'under_maintenance_assets',
        label: 'Under Maintenance',
        canViewDetails: false,
        iconBackground: 'bg-[#fff3d8]',
        iconColor: 'text-[#b16a08]',
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m14.5 6.5-2 2 3 3 2-2a4 4 0 0 1-5 5L7 20l-3-3 5.5-5.5a4 4 0 0 1 5-5Z" />
            </svg>
        ),
    },
] as const

export default function DashboardSummaryCards({
    summary,
}: DashboardSummaryCardsProps) {
    return (
        <section
            className="grid grid-cols-5 gap-[15px] max-[1250px]:grid-cols-3 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1"
            aria-label="Equipment summary"
        >
            {cards.map((card) => (
                <article
                    key={card.key}
                    className="flex min-h-[140px] min-w-0 items-start gap-[13px] rounded-[11px] border border-[#e6eaf0] bg-white p-[18px] shadow-[0_1px_2px_rgba(16,24,40,0.025)]"
                >
                    <div
                        className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] ${card.iconBackground} ${card.iconColor}`}
                    >
                        <span className="block h-[20px] w-[20px] [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8] [&_svg]:stroke-linecap-round [&_svg]:stroke-linejoin-round">
                            {card.icon}
                        </span>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                        <p className="m-0 flex min-h-[30px] items-start text-[11px] font-[600] leading-[15px] text-[#778293]">
                            {card.label}
                        </p>

                        <strong className="mt-[2px] block text-[24px] leading-[1.05] text-[#17202d]">
                            {summary[card.key]}
                        </strong>

                        <div className="mt-auto pt-[8px]">
                            {card.canViewDetails ? (
                                <Link
                                    to="/assets"
                                    className="block whitespace-nowrap text-[10px] text-[#8c96a4] no-underline"
                                >
                                    View detailed records →
                                </Link>
                            ) : (
                                <span
                                    className="block whitespace-nowrap text-[10px] text-[#8c96a4]"
                                    aria-disabled="true"
                                    title="Detailed view is not available yet"
                                >
                                    View detailed records →
                                </span>
                            )}
                        </div>
                    </div>
                </article>
            ))}
        </section>
    )
}