import { useEffect } from 'react'

const DEFAULT_TITLE = 'HazardAtlas — Community-powered road safety'

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · HazardAtlas` : DEFAULT_TITLE
  }, [title])
}
