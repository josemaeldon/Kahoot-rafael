import { useRouter } from "next/router";
import * as cookie from "cookie";
import { memo, useLayoutEffect, useMemo, useState } from "react";
import { auth, db } from "kahoot";

type UserState = LoggedIn | LoggedOut;

interface LoggedOut {
  user: null;
  loggedIn: false;
}

interface LoggedIn {
  user: auth.accessTokenPayload;
  loggedIn: true;
}

export default function useUser(): UserState {
  const user = useMemo(
    () =>
      typeof window !== "undefined" &&
      JSON.parse(localStorage.getItem("accessTokenPayload")),
    []
  );
  if (typeof window !== "undefined") {
    const cookies = cookie.parse(document.cookie);
    if (!cookies.loggedIn) {
      return { user: null, loggedIn: false };
    } else {
      return { user, loggedIn: true };
    }
  }
  return { user: null, loggedIn: false };
}
