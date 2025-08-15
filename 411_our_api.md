# Kahoot Clone API
Hello and welcome to a quick explanation of the Kahoot clone API! This is an in-house API, written in Rust, that powers the Kahoot clone app. All requests and responses are written in JSON.
## Player Side
The player side has the following commands it sends from the client to the server:
1. Joining Game
    1. joinRoom - Sends the API a specific room code, corresponding to a specific game instance. roomId is the code and is an integer value. Username is a string value and will be the display name of the user in the game.
       - Format:
          ```
          {
            type: "joinRoom",
            roomId: code,
            username: input.value,
          };
          ```
2. During Play
    1. answer - Sends the player's answer to the server. The answers are 0 indexed and the choice field is an integer.
       - Format: 
          ```
          {
            type: "answer",
            choice: parseInt(answer) - 1,
          };
          ```
The player side receives the following messages from the server:
1. During Join
    1. joined - You have successfully joined the game room.
       - Format:
          ```
          {
            type: "joined"
          }
          ```
    2. joinFailed - The room join process has failed. The "reason" field is why it failed, and is a string.
       - Format:
          ```
          {
            type: "joinFailed",
            reason: ""
          }
          ```
3. During Play
    1. gameEnd - The game has ended.
       - Format:
          ```
          {
            type: "gameEnd"
          }
          ```
    2. roundBegin - The next round has begun. It also will be sent at the start of the first round.
       - Format:
          ```
          {
            type: "roundBegin"
          }
          ```
    3. roundEnd - The current round has ended.
       - Format:
          ```
          {
            type: "roundEnd"
          }
          ```
## Host Side
The host sends the following messages to the server:
1. Game Creation
    1. createRoom - Creates the room, the "questions" field is an array of JSON objects that represent questions. The "question" field in the question object is a string that is the question being asked. "choices" in the question object is a list of up to 4 strings representing the answer choices. "answer" is the 0-indexed integer index of the correct choice. "time" is the amount of seconds alloted to the question.
       - Format:
          ```
          {
            type: "createRoom",
            questions: [
                {
                    question: "Test",
                    choices: ["1", "2", "3"],
                    answer: 1,
                    time: 30,
                },
            ]
          }
          ```
2. During Game
    1. beginRound - begins the round.
       - Format:
          ```
          {
            type: "beginRound"
          }
          ```
    2. endRound - ends the round.
       - Format:
          ```
          {
            type: "endRound"
          }
          ```
The host receives the following messages from the server:
1. Game Creation
    1. roomCreated - contains the roomId, an integer value.
       - Format:
          ```
          {
            type: "roomCreated",
            roomId: 182131313,
          }
          ```
2. During Play
    1. userJoined - User has joined. "username" is the username of the player.
       - Format:
          ```
          {
            type: "userJoined",
            username: "username",
          }
          ```
    2. userLeft - User has left. "username" is the username of the player.
       - Format:
          ```
          {
            type: "userLeft",
            username: "username",
          }
          ```
    3. roundBegin - payload for the next round's question. "question" is the question object.
       - Format:
          ```
          {
            type: "roundBegin",
            question: {
                question: "Test",
                choices: ["1", "2", "3"],
                answer: 1,
                time: 30,
            },
          }
          ```
    4. roundEnd - signals the round has ended. Payload is a JSON with key value pairs of users matching to their score increase.
       - Format:
          ```
          {
            type: "roundEnd",
            pointGains = {
                "user1" = 1000,
                "user2" = 1000,
            }
          }
          ```
    5. userAnswered - the username of whoever answered.
       - Format:
          ```
          {
            type: "userAnswered",
            username: "username",
          }
          ```
    6. gameEnd - game ended.
       - Format:
          ```
          {
            type: "gameEnd"
          }
          ```
