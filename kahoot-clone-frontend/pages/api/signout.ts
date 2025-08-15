import { NextApiRequest, NextApiResponse } from "next";
import * as cookie from "cookie";
import type { auth, db } from "kahoot";

interface APIResponse {
  error: boolean;
}

export default async function signout(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "POST") {
    res.status(200).json({ error: true });
  }

  res.setHeader("Set-Cookie", [
    cookie.serialize("accessToken", "", {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    }),
    cookie.serialize("loggedIn", "", {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    }),
  ]);

  res.status(200).json({ error: false });
}
