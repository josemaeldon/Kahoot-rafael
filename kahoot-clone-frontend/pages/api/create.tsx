import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@serverless/mongoCache";
import * as jwt from "jsonwebtoken";
import { auth, db } from "kahoot";
import { ObjectId } from "mongodb";

export type APIResponse = Success | Fail;
export interface APIRequest {
  game: db.KahootGame;
  game_id?: string; //Used for updating an existing game
}

interface Success {
  error: false;
}

interface Fail {
  error: true;
  errorDescription: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse>
) {
  if (req.method !== "POST")
    return res.status(200).json({
      error: true,
      errorDescription: "Somente solicitações POST são permitidas",
    });
  if (!req.cookies["accessToken"]) {
    return res
      .status(200)
      .json({ error: true, errorDescription: "Sem token de acesso" });
  }

  try {
    const payload = jwt.verify(req.cookies["accessToken"], "secret", {
      complete: false,
    }) as auth.accessTokenPayload;

    const client = await connectToDatabase();
    const gameCollection = client
      .db("kahoot-clone")
      .collection<db.KahootGame>("game");
    const requestBody = req.body as APIRequest;
    const gameData = requestBody.game;
    const updateGameId = requestBody.game_id;

    if (typeof updateGameId === "string") {
      if (!ObjectId.isValid(updateGameId))
        throw new Error("Incorrect object id");
      const game = await gameCollection.findOne({ _id: updateGameId });
      if (game !== null && game.author_id === payload._id) {
        delete gameData._id;
        gameData.author_id = payload._id;
        gameData.author_username = payload.username;
        delete gameData.date;
        await gameCollection.updateOne(
          { _id: updateGameId },
          { $set: gameData },
          { upsert: true }
        );
      }

      return res.status(200).json({ error: false });
    } else {
      gameData._id = new ObjectId().toHexString();
      gameData.author_id = payload._id;
      gameData.author_username = payload.username;
      gameData.date = new Date().getTime();
      await gameCollection.insertOne(gameData); //Todo: request validation
      return res.status(200).json({ error: false });
    }
  } catch (e) {
    console.log("ERROR", e);
    return res
      .status(200)
      .json({ error: true, errorDescription: "Algo deu errado." });
  }
}
