import { useCallback } from 'react'
import { Link, useParams } from 'react-router'
import EquipmentTypeTable from '../features/categories/components/EquipmentTypeTable'
import StatusBadge from '../features/categories/components/StatusBadge'
import {
  describeCategoryError,
  fetchCategory,
  fetchCategoryEquipmentTypes,
} from '../features/categories/api'
import { useApiData } from '../features/categories/hooks/useApiData'

export default function CategoryDetailPage() {
  const { id = '' } = useParams()

  const load = useCallback(
    async (signal: AbortSignal) => {
      const [category, equipmentTypes] = await Promise.all([
        fetchCategory(id, signal),
        fetchCategoryEquipmentTypes(id, signal),
      ])
      return { category, equipmentTypes }
    },
    [id],
  )
  const { loading, data, error } = useApiData(load)

  return (
    <section
      className="mx-auto flex h-full min-h-0 w-full max-w-[1440px] flex-col px-[34px] pb-[42px] pt-[31px] max-[980px]:px-6 max-[700px]:px-[14px] max-[700px]:pb-[30px] max-[700px]:pt-6"
      aria-labelledby="page-title"
    >
      <Link
        to="/categories"
        className="mb-4 self-start text-[11px] font-[650] text-[#2871da] hover:text-[#174fa1] hover:underline focus-visible:outline-2 focus-visible:outline-[#347ee9] focus-visible:outline-offset-[3px]"
      >
        ← Back to Categories
      </Link>

      {loading && (
        <p
          className="mb-[13px] rounded-[5px] border border-[#d5e4fb] bg-[#f3f8ff] px-[11px] py-[9px] text-[11px] text-[#315f9f]"
          role="status"
        >
          Loading category…
        </p>
      )}
      {!loading && error !== undefined && (
        <p
          className="mb-[13px] rounded-[5px] border border-[#f3d0d2] bg-[#fff5f5] px-[11px] py-[9px] text-[11px] text-[#a5333b]"
          role="alert"
        >
          {describeCategoryError(error, 'this category')}
        </p>
      )}

      {data && (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <h1
              className="m-0 text-[25px] font-[690] leading-[1.25] tracking-[-0.55px] text-[#1f2b3e]"
              id="page-title"
            >
              {data.category.name}
            </h1>
            <StatusBadge isDeleted={data.category.is_deleted} />
          </div>

          <section
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[9px] border border-[#e0e6ef] bg-white shadow-[0_3px_12px_rgb(29_49_77_/_4%)]"
            aria-label="Equipment types in this category"
          >
            <h2 className="px-[18px] py-[14px] text-[12px] font-[650] text-[#39465a]">
              Equipment types
            </h2>
            <EquipmentTypeTable equipmentTypes={data.equipmentTypes} />
          </section>
        </>
      )}
    </section>
  )
}
