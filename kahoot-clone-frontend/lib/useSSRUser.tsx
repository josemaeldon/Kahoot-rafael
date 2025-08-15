import { useRouter } from "next/router";
import * as cookie from "cookie";
import { memo, useLayoutEffect, useMemo, useState } from "react";
import { auth, db } from "kahoot";

type UserState = LoggedIn | LoggedOut;

interface LoggedOut {
  user: null;
  loggedIn: false;
  firstRender: boolean;
}

interface LoggedIn {
  user: auth.accessTokenPayload;
  loggedIn: true;
  firstRender: boolean;
}

export default function useUser(): UserState {
  const [firstRender, setFirstRender] = useState(true);
  useLayoutEffect(() => {
    setFirstRender(false);
  }, []);
  const user = useMemo(
    () =>
      typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("accessTokenPayload")),
    []
  );
  if (firstRender) return { user: null, loggedIn: false, firstRender };
  if (typeof window !== "undefined") {
    const cookies = cookie.parse(document.cookie);
    if (!cookies.loggedIn) {
      return { user: null, loggedIn: false, firstRender };
    } else {
      return { user, loggedIn: true, firstRender };
    }
  }
  return { user: null, loggedIn: false, firstRender };
}
