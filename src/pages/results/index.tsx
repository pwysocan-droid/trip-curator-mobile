import {useEffect} from 'react'
import {useRouter} from 'next/router'

export default function ResultsRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady) return
    router.replace({pathname: '/results/0', query: router.query})
  }, [router.isReady])

  return null
}
