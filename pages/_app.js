import Head from 'next/head';
import '../styles/globals.css';
export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Snakes & Ladders</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}