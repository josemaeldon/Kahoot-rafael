// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@serverless/mongoCache";
import * as bcrypt from "bcrypt";
import type { auth, db } from "kahoot";
import * as jwt from "jsonwebtoken";
import * as cookie from "cookie";
export interface APIRequest {
  username: string;
  password: string;
}

export type APIResponse = Success | Fail;

interface Success {
  error: false;
  user: auth.accessTokenPayload;
}

interface Fail {
  error: true;
  errorDescription: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(401).json({});
  }
  const { username, password }: APIRequest = req.body;

  const client = await connectToDatabase();
  const user = client.db("kahoot-clone").collection<db.User>("user");

  //Does the user exist?
  const query = await user.findOne({ username });
  if (query === null) {
    const response: APIResponse = {
      error: true,
      errorDescription: "User not found",
    };
    res.status(200).json(response);
  }

  //User exists, but is the password correct?
  const correct = await bcrypt.compare(password, query.passwordHash);
  if (correct) {
    //Give user an access token stored as a cookie
    const payload: auth.accessTokenPayload = {
      _id: query._id,
      username: query.username,
    };
    const token = jwt.sign(payload, "secret", {});

    res.setHeader("Set-Cookie", [
      cookie.serialize("accessToken", token, {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
      cookie.serialize("loggedIn", "true", {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: false,
        path: "/",
      }),
    ]);

    const response: APIResponse = {
      error: false,
      user: payload,
    };

    res.status(200).json(response);
  } else {
    const response: APIResponse = {
      error: true,
      errorDescription: "Password is incorrect",
    };
    res.status(200).json(response);
  }
}
