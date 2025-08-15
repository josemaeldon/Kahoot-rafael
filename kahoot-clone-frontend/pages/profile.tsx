import Questions from "@components/Questions";
import Header from "@components/Header";
import styles from "@styles/profile.module.css";
import React, { useEffect, useState } from "react";
import useUser from "@lib/useSSRUser";
import type { db } from "../kahoot";
import { postData } from "@lib/postData";
import {
  APIRequest as GetGameReq,
  APIResponse as GetGameRes,
} from "./api/getGames";
import { TiDelete, TiEdit } from "react-icons/ti";
import { useRouter } from "next/router";
import { APIRequest, APIResponse } from "./api/deleteOneGame";
import { BsTrash } from "react-icons/bs";

function Profile() {
  const { loggedIn, user } = useUser();
  const [data, setData] = useState<null | db.KahootGame[]>(null);

  function getSetUserData() {
    postData<GetGameReq, GetGameRes>("/api/getGames", {
      type: "userId",
      userId: user._id,
    }).then((res) => {
      if (res.error === true) {
        //Todo: error gui
      } else {
        setData(res.games);
        console.log(res.games);
      }
    });
  }

  useEffect(() => {
    if (loggedIn) {
      getSetUserData();
    }
  }, [loggedIn]);
  const router = useRouter();
  if (!loggedIn) return <></>;

  return (
    <div className={`${styles.container}`}>
      <div className={`${styles.otherContainer}`}>
        <Header></Header>
      </div>
      <div className={`${styles.innerContainer}`}>
        <div className={`${styles.innerInnerContainer}`}>
          <div className={`${styles.flexContainer}`}>
            <p className={`${styles.headerMessage}`}>Meus Kahoots:</p>
            {data !== null && data.length !== 0 && (
              <button
                className={`${styles.playButton}`}
                onClick={() => router.push("/create")}
              >
                Criar Kahoot
              </button>
            )}
          </div>

          {data !== null && data.length === 0 && (
            <div className={`${styles.emptyMessage}`}>
              <p>Parece que você não tem Kahoots :(</p>
              <button
                className={`${styles.playButton}`}
                onClick={() => router.push("/create")}
              >
                Crie um agora
              </button>
            </div>
          )}
          <div className={`${styles.kahootGrid}`}>
            {data !== null &&
              data.map((game) => {
                const date = new Date();
                date.setTime(game.date);
                return (
                  <div className={`${styles.gameElement}`} key={game._id}>
                    <p>
                      <b>{game.title}</b>
                    </p>
                    <p>
                      {game.questions.length}{" "}
                      {game.questions.length === 1 ? "Pergunta" : "Perguntas"}
                    </p>
                    <p>{`Criado em: ${date.toLocaleDateString()}`}</p>

                    <button
                      className={`${styles.playButton}`}
                      onClick={() => {
                        router.push({
                          pathname: "/host",
                          query: { gameId: game._id },
                        });
                      }}
                    >
                      Jogar
                    </button>
                    <div
                      className={`${styles.edit}`}
                      onClick={() => {
                        router.push({
                          pathname: "/create",
                          query: { editingId: game._id },
                        });
                      }}
                    >
                      <TiEdit></TiEdit>
                    </div>
                    <div
                      className={`${styles.delete}`}
                      onClick={() => {
                        postData<APIRequest, APIResponse>(
                          "/api/deleteOneGame",
                          { gameId: game._id }
                        ).then((res) => {
                          if (res.error === false) {
                            getSetUserData();
                          }
                        });
                      }}
                    >
                      <BsTrash />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
