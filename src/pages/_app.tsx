import type {AppProps} from 'next/app'
import Head from 'next/head'
import {AccessGate} from '@/components/AccessGate/AccessGate'
import '@/styles/globals.css'

export default function App({Component, pageProps}: AppProps) {
  return (
    <>
      <Head>
        <title>Trips · Airbnb</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#FFFFFF" />
      </Head>
      <AccessGate>
        <Component {...pageProps} />
      </AccessGate>
    </>
  )
}
