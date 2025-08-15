// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@serverless/mongoCache";
import type { auth, db } from "../../kahoot";
import * as bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";

export interface APIRequest {
  username: string;
  password: string;
}

export type APIResponse = Success | Fail;

export interface Success {
  error: false;
  user: auth.accessTokenPayload;
}

export interface Fail {
  error: true;
  errorDescription: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(401)
      .json({ error: true, errorDescription: "Not a POST request" });
  }
  const { username, password }: APIRequest = req.body;

  const client = await connectToDatabase();
  const user = client.db("kahoot-clone").collection<db.User>("user");

  //Does user already exist?
  const results = await user.findOne({ username });
  if (results !== null) {
    return res.status(200).json({
      error: true,
      errorDescription: "User already exists",
    });
  }

  //Create new user with hashed and salted password and add it to the database
  const salt = await bcrypt.genSalt(10, "b");
  const passwordHash = await bcrypt.hash(password, salt);
  const userDoc: db.User = {
    _id: new ObjectId().toHexString(),
    username,
    passwordHash,
  };

  await user.insertOne(userDoc);

  //Give user an access token cookie and JSON response

  const payload: auth.accessTokenPayload = {
    _id: userDoc._id,
    username: userDoc.username,
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
      path: "/",
    }),
  ]);

  res.status(200).json({
    error: false,
    user: { _id: userDoc._id, username },
  });
}
