import { connectToDatabase } from "@serverless/mongoCache";
import { verify } from "jsonwebtoken";
import { FindCursor, FindOptions } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { db, auth } from "../../kahoot";

export type APIRequest = UsernameRequest | UserIdRequest;

interface UsernameRequest {
  type: "username";
  username: string;
}

interface UserIdRequest {
  type: "userId";
  userId: string;
}

export type APIResponse = Success | Error;

interface Success {
  error: false;
  games: db.KahootGame[];
}

interface Error {
  error: true;
  errorDescription: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "POST")
    res
      .status(200)
      .json({ error: true, errorDescription: "Not a POST request" });
  const request = req.body as APIRequest;
  const payload = verify(req.cookies["accessToken"], "secret", {
    complete: false,
  }) as auth.accessTokenPayload;

  const client = await connectToDatabase();
  const games = client.db("kahoot-clone").collection<db.KahootGame>("game");

  if (request.type === "userId") {
    const cursor: FindCursor<db.KahootGame> = games
      .find({ author_id: request.userId })
      .sort({ date: "descending" });
    const allGames: db.KahootGame[] = await cursor.toArray();
    res.status(200).json({ error: false, games: allGames });
  } else if (request.type === "username") {
    const cursor: FindCursor<db.KahootGame> = games
      .find({ author_username: request.username })
      .sort({ date: "descending" });
    const allGames: db.KahootGame[] = await cursor.toArray();
    res.status(200).json({ error: false, games: allGames });
  } else {
    res.status(200).json({ error: true, errorDescription: "Bad data format" });
  }
}
