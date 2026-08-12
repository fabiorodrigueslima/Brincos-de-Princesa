import { StorePreviewPage } from './StorePreviewPage.jsx'
import { commercialCategories } from './commercialCatalog.js'

export function CategoryCatalogPage({ category }) {
  const config = commercialCategories[category]
  return <StorePreviewPage category={category} {...config} />
}
