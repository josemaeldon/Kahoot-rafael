import React, { useContext } from "react";
import { OverlayTrigger, Popover, Tooltip } from "react-bootstrap";
import { BsTrash } from "react-icons/bs";
import { MdContentCopy } from "react-icons/md";
import { TiWarning } from "react-icons/ti";
import { db } from "../kahoot";
import { GameContext, QuestionError } from "../pages/create";
import styles from "../styles/Questions.module.css";
import GameButton from "./GameButton";

function renderOverlay(e: QuestionError) {
  const overlay = ({ show: _, ...props }) => (
    <div style={{ backgroundColor: "lightcoral" }}>
      <Popover {...props}>
        <p className={`${styles.overlayError}`}>
          <ul>
            {e.questionBlankError && <li>Sua pergunta não pode estar em branco</li>}
            {e.choicesRequiredError && <li>Preencha as opções de resposta </li>}
            {e.correctChoiceError && <li>Por favor, selecione uma resposta correta</li>}
          </ul>
        </p>
      </Popover>
    </div>
  );
  return overlay;
}

function Questions() {
  const {
    game,
    setGame,
    questionNumber,
    setQuestionNumber,
    formErrors,
    validateForm,
    validateFormAndIgnoreError,
  } = useContext(GameContext);

  function duplicateHandler(questionIndex) {
    const gameCopy = JSON.parse(JSON.stringify(game));
    const questionCopy = JSON.parse(
      JSON.stringify(gameCopy.questions[questionIndex])
    );
    gameCopy.questions.splice(questionIndex + 1, 0, questionCopy);
    console.log(game, gameCopy);

    setGame(gameCopy);
    validateForm(gameCopy);
    setQuestionNumber(questionIndex + 1);
  }
  function deleteHandler(questionIndex) {
    //User shouldn't delete the only question in the kahoot
    //Todo: Modal popup

    if (game.questions.length === 1) return;

    const gameCopy = JSON.parse(JSON.stringify(game));
    gameCopy.questions.splice(questionIndex, 1);

    //Makes sure that the question the user is on isn't out of bounds after an element is deleted
    if (gameCopy.questions.length - 1 < questionNumber)
      setQuestionNumber(gameCopy.questions.length - 1);

    setGame(gameCopy);
    validateForm(gameCopy);
  }
  function addQuestionHandler() {
    const gameCopy = JSON.parse(JSON.stringify(game)) as db.KahootGame;
    gameCopy.questions.push({
      choices: ["", "", "", ""],
      correctAnswer: 0,
      question: "",
      time: 30,
    });

    const lastQuestion = gameCopy.questions.length - 1;
    setQuestionNumber(lastQuestion);
    setGame(gameCopy);
    validateFormAndIgnoreError(gameCopy, lastQuestion);
  }
  console.log(formErrors);
  return (
    <div className={`${styles.container}`}>
      <div className={`${styles.innerContainer}`}>
        {game.questions.map((question, index) => {
          const selectedQuestion = index === questionNumber;
          const e = formErrors?.questionErrors[index];
          const questionHasError =
            (e?.choicesRequiredError ||
              e?.correctChoiceError ||
              e?.questionBlankError) &&
            e.ignoreErrors !== true;
          return (
            <div key={Math.random()}>
              <OverlayTrigger
                placement="right"
                delay={{ show: 0, hide: 0 }}
                overlay={questionHasError ? renderOverlay(e) : <></>}
              >
                <div
                  className={`${styles.questionBox} ${
                    selectedQuestion ? `${styles.questionHighlighted}` : ""
                  }`}
                  onClick={() => {
                    if (selectedQuestion) return;
                    setQuestionNumber(index);
                    validateForm(game);
                  }}
                  data-selectedquestion={selectedQuestion}
                >
                  <TiWarning
                    className={`${
                      questionHasError ? styles.warning : styles.hidden
                    }`}
                  ></TiWarning>
                  <section className={`${styles.questionHeader}`}>
                    <div>
                      <span>{`${index + 1}`}</span>
                    </div>
                    <div>
                      <span>Quiz</span>
                    </div>
                  </section>
                  <div className={`${styles.questionContainer}`}>
                    <section className={`${styles.questionActions}`}>
                      <MdContentCopy
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateHandler(index);
                        }}
                      ></MdContentCopy>
                      <BsTrash
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHandler(index);
                        }}
                      ></BsTrash>
                    </section>
                    <section className={`${styles.questionPreviewContainer}`}>
                      <div
                        className={`${styles.questionPreview} ${
                          selectedQuestion ? styles.white : styles.whitesmoke
                        }`}
                      >
                        <p className={`${styles.previewParagraph}`}>
                          {game.questions[index].question}
                        </p>
                        <div className={`${styles.previewGrid}`}>
                          {game.questions[index].choices.map(
                            (choice, choiceIndex) => {
                              return (
                                <div
                                  key={choiceIndex}
                                  className={`${styles.previewGridChild}`}
                                  data-correct={
                                    game.questions[index].correctAnswer ===
                                      choiceIndex &&
                                    game.questions[index].choices[
                                      choiceIndex
                                    ] !== ""
                                  }
                                ></div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </OverlayTrigger>
            </div>
          );
        })}
        <GameButton
          onClick={() => {
            addQuestionHandler();
          }}
          backgroundStyle={{
            backgroundColor: "rgb(14,78,154)",
            margin: "20px auto 20px auto ",
            display: "block",
          }}
          foregroundStyle={{
            backgroundColor: "rgb(19,104,206)",
            padding: "10px 14px 10px 14px",
          }}
        >
          Add Pergunta
        </GameButton>
      </div>
    </div>
  );
}

export default Questions;
