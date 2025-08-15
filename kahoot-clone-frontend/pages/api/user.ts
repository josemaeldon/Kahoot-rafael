// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { auth, db } from "../../kahoot";
import { NextApiRequest, NextApiResponse } from "next";
import { verify } from "jsonwebtoken";
import * as cookie from "cookie";

export interface APIRequest {
  username: string;
  password: string;
}

export type APIResponse = LoggedIn | NotLoggedIn;

interface LoggedIn {
  loggedIn: true;
  user: auth.accessTokenPayload;
}

interface NotLoggedIn {
  loggedIn: false;
  user: undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(401).json({});
  }
  let accessToken = req.cookies["accessToken"];
  if (accessToken) {
    verify(accessToken, "secret", { complete: false }, (err, decoded) => {
      if (err) {
        const response: NotLoggedIn = {
          loggedIn: false,
          user: undefined,
        };
        res.status(200).json(response);
      } else {
        const response: LoggedIn = {
          loggedIn: true,
          user: decoded as auth.accessTokenPayload,
        };

        res.setHeader("Set-Cookie", [
          cookie.serialize("loggedIn", "true", {
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          }),
        ]);

        res.status(200).json(response);
      }
    });
  } else {
    const response: NotLoggedIn = {
      loggedIn: false,
      user: undefined,
    };
    res.status(200).json(response);
  }
}
