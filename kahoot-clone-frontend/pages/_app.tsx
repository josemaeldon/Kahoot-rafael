import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/globals.css";
import * as cookie from "cookie";
import { useRouter } from "next/router";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  let noAuthRequired = new Set(["/auth/login", "/auth/signup", "/", "/play"]);
  if (typeof window !== "undefined") {
    const cookies = cookie.parse(document.cookie);

    if (!cookies.loggedIn && !noAuthRequired.has(router.pathname)) {
      router.push({
        pathname: "/auth/login",
        query: { redirectOnLogin: router.pathname },
      });
    }
  }
  return <Component {...pageProps} />;
}

export default MyApp;
