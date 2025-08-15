import { connectToDatabase } from "@serverless/mongoCache";
import { verify } from "jsonwebtoken";
import { FindCursor, FindOptions } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { db, auth } from "../../kahoot";

export type APIRequest = {
  gameId: string;
};

export type APIResponse = Success | Error;

interface Success {
  error: false;
  game: db.KahootGame;
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
  try {
    const request = req.body as APIRequest;
    const payload = verify(req.cookies["accessToken"], "secret", {
      complete: false,
    }) as auth.accessTokenPayload;

    const client = await connectToDatabase();
    const games = client.db("kahoot-clone").collection<db.KahootGame>("game");
    const result = await games.findOne({ _id: request.gameId });
    if (result !== null) {
      return res.status(200).json({ error: false, game: result });
    } else {
      res
        .status(200)
        .json({ error: true, errorDescription: "Error finding game" });
    }
  } catch (e) {
    res
      .status(200)
      .json({ error: true, errorDescription: "Something went wrong" });
  }
}
