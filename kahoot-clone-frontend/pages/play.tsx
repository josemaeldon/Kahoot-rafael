import { action, UserEvent } from "kahoot";
import { useRouter } from "next/router";
import React, { useEffect, useState, useContext } from "react";
import { Spinner } from "react-bootstrap";
import styles from "../styles/Play.module.css";

const PlayerContext = React.createContext<Context>(null);

interface Context {
  socket: WebSocket;
  points: number;
  setSocket: React.Dispatch<React.SetStateAction<null | WebSocket>>;
  setPoints: React.Dispatch<React.SetStateAction<number>>;
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  setSubpage: React.Dispatch<
    React.SetStateAction<
      | "StartScreen"
      | "LobbyWaiting"
      | "ChooseAnswer"
      | "ResultWaiting"
      | "Result"
    >
  >;
}

function LobbyWaiting() {
  return (
    <div className={styles.backdrop}>
      <div className={styles.gameBox}>
        <p>Você está dentro! Vê seu nome na tela?</p>
        <p>Esperando para começar...</p>
      </div>
    </div>
  );
}

function StartScreen() {
  const [pin, setPin] = useState("");
  const [connectionClosed, setConnectionClosed] = useState(false);
  const { setUsername, username, setSocket, setSubpage } =
    useContext(PlayerContext);
  const [inputLocked, setInputLocked] = useState(false);
  useEffect(() => {
    if (inputLocked) {
      const socket = new WebSocket("wss://servidor-kahoot.cloudbr.app/ws");
      const aborter = new AbortController();
      socket.addEventListener(
        "message",
        function handler(e) {
          const userEvent = JSON.parse(e.data) as UserEvent.event;
          switch (userEvent.type) {
            case "joined":
              setSocket(socket);
              socket.removeEventListener("message", handler);
              setSubpage("LobbyWaiting");

              break;
            case "joinFailed":
              setInputLocked(false);
              console.log(userEvent.reason);
              //todo: join fail handling
              break;
          }
        },
        { signal: aborter.signal }
      );
      socket.addEventListener(
        "open",
        function handler(e) {
          const request: action.JoinRoom = {
            type: "joinRoom",
            roomId: parseInt(pin.replace(/\s/g, "")),
            username: username,
          };
          socket.send(JSON.stringify(request));
          console.log(socket);
          console.log(request);
        },
        { signal: aborter.signal }
      );
      socket.onclose = () => {
        console.log("connection closed");
        setConnectionClosed(true);
      };
      return () => {
        if (inputLocked) {
          aborter.abort();
        }
      };
    }
  }, [inputLocked]);
  useEffect(() => {
    if (connectionClosed) {
      console.log("Connection was closed");
    }
  }, [connectionClosed]);
  return (
    <div className={`${styles.backdrop}`}>
      <div className={`${styles.gameBox}`}>
        <p className={`${styles.logo}`}>Kahoot!</p>
        <div className={`${styles.gameInput}`}>
          <input
            type="text"
            placeholder="Game PIN"
            className={`${styles.gameInputPin}`}
            onChange={(e) => {
              setPin(e.target.value);
            }}
            value={pin}
            readOnly={inputLocked}
          ></input>
          <input
            type="text"
            placeholder="Seu nome"
            className={`${styles.gameInputPin}`}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
            value={username}
            readOnly={inputLocked}
          ></input>


          
          <button
  className={`${styles.gameButton}`}
  onClick={() => {
    setInputLocked(true);
  }}
>
  {inputLocked && (
    <span>
      <Spinner
        animation="border"
        style={{ height: "24px", width: "24px" }}
      ></Spinner>
    </span>
  )}
  {!inputLocked && <span>ENTRAR NA SALA</span>}
</button>

<button
  className={`${styles.gameButton}`}
  onClick={() => {
    window.location.href = "https://kahoot.cloudbr.app";
  }}
>
  Voltar
</button>


          
        </div>
      </div>
    </div>
  );
}

function ChooseAnswer({ data }) {
  const { socket } = useContext(PlayerContext);
  const choices = (data as UserEvent.RoundBegin).choices;
  const [madeChoice, setMadeChoice] = useState(false);
  const onChoiceMade = (index) => () => {
    setMadeChoice(true);
    const request: action.Answer = { type: "answer", choice: index };
    socket.send(JSON.stringify(request));
  };
  return (
    <>
      {madeChoice === false && (
        <div className={`${styles.backdrop}`}>
          <div className={`${styles.gameBox}`}>
            <div className={styles.answerGrid}>
              {choices[0] && (
                <div className={styles.red} onClick={onChoiceMade(0)}></div>
              )}
              {choices[1] && (
                <div className={styles.blue} onClick={onChoiceMade(1)}></div>
              )}
              {choices[2] && (
                <div className={styles.yellow} onClick={onChoiceMade(2)}></div>
              )}
              {choices[3] && (
                <div className={styles.green} onClick={onChoiceMade(3)}></div>
              )}
            </div>
          </div>
        </div>
      )}
      {madeChoice === true && (
        <div className={`${styles.backdrop}`}>
          <div className={`${styles.gameBox}`}>
            <p>Você fez sua resposta. Esperando a rodada terminar...</p>
          </div>
        </div>
      )}
    </>
  );
}

function Result({ data }) {
  const pointGain = (data as UserEvent.RoundEnd).pointGain;
  console.log(pointGain);
  return (
    <div className={`${styles.backdrop}`}>
      <div className={`${styles.gameBox}`}>
        {pointGain && `Você acertou! +${pointGain} points`}
        {pointGain === null && (
          <div>
            <p>Você errou :(</p> <p>Você não recebeu nenhum ponto</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Play() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [points, setPoints] = useState(0);
  const [username, setUsername] = useState("");
  const [subpage, setSubpage] = useState<
    "StartScreen" | "LobbyWaiting" | "ChooseAnswer" | "ResultWaiting" | "Result"
  >("StartScreen");
  const router = useRouter();
  const [subpageData, setSubpageData] = useState<UserEvent.event | null>(null);
  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", (e) => {
        const hostEvent = JSON.parse(e.data) as UserEvent.event;
        switch (hostEvent.type) {
          case "gameEnd":
            router.push("/");
            break;
          case "roundBegin":
            setSubpage("ChooseAnswer");
            setSubpageData(hostEvent);
            break;
          case "roundEnd":
            setSubpage("Result");
            setSubpageData(hostEvent);
            break;
        }
      });
      socket.addEventListener("close", () => {
        router.push("/");
      });
    }
  }, [socket]);
  return (
    <>
      <PlayerContext.Provider
        value={{
          socket,
          points,
          setSocket,
          setPoints,
          username,
          setUsername,
          setSubpage,
        }}
      >
        {subpage === "StartScreen" && <StartScreen></StartScreen>}
        {subpage === "LobbyWaiting" && <LobbyWaiting></LobbyWaiting>}
        {subpage === "ChooseAnswer" && (
          <ChooseAnswer data={subpageData}></ChooseAnswer>
        )}
        {subpage === "Result" && <Result data={subpageData}></Result>}
      </PlayerContext.Provider>
    </>
  );
}

export default Play;
