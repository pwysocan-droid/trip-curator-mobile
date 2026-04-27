import {useEffect} from 'react'
import {useRouter} from 'next/router'

export default function ResultsV2Redirect() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    router.replace({pathname: '/results-v2/0', query: router.query})
  }, [router.isReady])

  return null
}
