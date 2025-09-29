import Head from 'next/head';
import '../styles/globals.css';
export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="fc:miniapp" content='{"name":"SnakesAndLadders","icon":"https://your-domain.com/icon-192.png","url":"https://your-domain.com/"}' />
        <title>Snakes & Ladders</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}