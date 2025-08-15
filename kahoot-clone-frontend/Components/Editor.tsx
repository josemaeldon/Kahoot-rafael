import React, { useContext, useEffect, useRef } from "react";
import { GameContext } from "../pages/create";
import styles from "../styles/Editor.module.css";
import {
  BsFillTriangleFill,
  BsFillSquareFill,
  BsFillCircleFill,
} from "react-icons/bs";
import { FaCheck } from "react-icons/fa";
import type { db } from "../kahoot";

function replaceCaret(el: HTMLElement) {
  // Place the caret at the end of the element
  const target = document.createTextNode("");
  el.appendChild(target);
  // do not move caret if element was not focused
  const isTargetFocused = document.activeElement === el;
  if (target !== null && target.nodeValue !== null && isTargetFocused) {
    var sel = window.getSelection();
    if (sel !== null) {
      var range = document.createRange();
      range.setStart(target, target.nodeValue.length);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    if (el instanceof HTMLElement) el.focus();
  }
}

function CheckboxCircle({
  onClick,
  checked,
}: {
  onClick: React.MouseEventHandler<HTMLDivElement>;
  checked: boolean;
}) {
  return (
    <div
      className={`${styles.checkBoxOuter} ${checked ? styles.green : ""}`}
      onClick={onClick}
    >
      <div className={`${styles.checkBoxInner}`}>
        <FaCheck className={`${!checked ? styles.hidden : ""}`}></FaCheck>
      </div>
    </div>
  );
}

function Editor() {
  const {
    game,
    setGame,
    questionNumber,
    setQuestionNumber,
    formErrors,
    validateForm,
  } = useContext(GameContext);

  const questionError =
    formErrors !== null &&
    formErrors.questionErrors[questionNumber] !== undefined &&
    formErrors.questionErrors[questionNumber].ignoreErrors !== true &&
    formErrors.questionErrors[questionNumber];

  function answerInputHandler(answerIndex: number) {
    return (e: React.FormEvent<HTMLParagraphElement>) => {
      e.preventDefault();
      const gameCopy = { ...game };
      gameCopy.questions[questionNumber].choices[answerIndex] =
        e.currentTarget.innerText;
      console.log(e.currentTarget.innerText);
      setGame({ ...game });

      if (questionError.choicesRequiredError) validateForm({ ...game });
    };
  }

  function onCheckboxClickHandler(index: number) {
    return () => {
      console.log(index);
      const gameCopy = { ...game };
      gameCopy.questions[questionNumber].correctAnswer = index;
      setGame(gameCopy);

      if (questionError.correctChoiceError) validateForm(gameCopy);
    };
  }
  function questionInputHandler(e: React.FormEvent<HTMLParagraphElement>) {
    e.preventDefault();
    const gameCopy = { ...game };
    gameCopy.questions[questionNumber].question = e.currentTarget.innerText;
    console.log(e.currentTarget.innerText);
    setGame({ ...game });

    if (questionError.questionBlankError) validateForm({ ...game });
  }

  const question = useRef();
  const a1 = useRef();
  const a2 = useRef();
  const a3 = useRef();
  const a4 = useRef();

  useEffect(() => {
    replaceCaret(question.current);
    replaceCaret(a1.current);
    replaceCaret(a2.current);
    replaceCaret(a3.current);
    replaceCaret(a4.current);
  });

  const q0Empty = game.questions[questionNumber].choices[0] === "";
  const q1Empty = game.questions[questionNumber].choices[1] === "";
  const q2Empty = game.questions[questionNumber].choices[2] === "";
  const q3Empty = game.questions[questionNumber].choices[3] === "";
  const q0Checked = game.questions[questionNumber].correctAnswer === 0;
  const q1Checked = game.questions[questionNumber].correctAnswer === 1;
  const q2Checked = game.questions[questionNumber].correctAnswer === 2;
  const q3Checked = game.questions[questionNumber].correctAnswer === 3;

  return (
    <div className={`${styles.container}`}>
      <p
        contentEditable="true"
        className={`${styles.question} ${
          questionError.questionBlankError &&
          game.questions[questionNumber].choices[0] === ""
            ? styles.lightRed
            : ""
        }`}
        placeholder="Questão..."
        ref={question}
        onInput={questionInputHandler}
        suppressContentEditableWarning
      >
        {game.questions[questionNumber].question}
      </p>
      <div>
        <div className={`${styles.grid}`}>
          <div
            className={`${styles.wrapper} ${
              !q0Empty ? `${styles.red}` : `${styles.white}`
            } ${
              questionError.choicesRequiredError &&
              game.questions[questionNumber].choices[0] === ""
                ? styles.lightRed
                : ""
            }`}
          >
            <span className={`${styles.shapeContainer} ${styles.red}`}>
              <BsFillTriangleFill></BsFillTriangleFill>
            </span>
            <div className={`${styles.answerContainer}`}>
              <p
                contentEditable="true"
                placeholder="Resposta 1"
                className={`${styles.answer} ${
                  !q0Empty ? styles.whiteText : ""
                }`}
                onInput={answerInputHandler(0)}
                suppressContentEditableWarning
                ref={a1}
              >
                {game.questions[questionNumber].choices[0]}
              </p>
            </div>
            {!q0Empty && (
              <CheckboxCircle
                onClick={onCheckboxClickHandler(0)}
                checked={q0Checked}
              ></CheckboxCircle>
            )}
          </div>
          <div
            className={`${styles.wrapper} ${
              !q1Empty ? `${styles.blue}` : `${styles.white}`
            } ${
              questionError.choicesRequiredError &&
              game.questions[questionNumber].choices[1] === ""
                ? styles.lightRed
                : ""
            }`}
          >
            <span className={`${styles.shapeContainer} ${styles.blue}`}>
              <BsFillSquareFill></BsFillSquareFill>
            </span>
            <div className={`${styles.answerContainer}`}>
              <p
                contentEditable="true"
                className={`${styles.answer} ${
                  !q1Empty ? `${styles.whiteText}` : ""
                }`}
                placeholder="Resposta 2"
                onInput={answerInputHandler(1)}
                suppressContentEditableWarning
                ref={a2}
              >
                {game.questions[questionNumber].choices[1]}
              </p>
            </div>
            {!q1Empty && (
              <CheckboxCircle
                onClick={onCheckboxClickHandler(1)}
                checked={q1Checked}
              ></CheckboxCircle>
            )}
          </div>
          <div
            className={`${styles.wrapper} ${
              !q2Empty ? `${styles.yellow}` : `${styles.white}`
            }`}
          >
            <span className={`${styles.shapeContainer} ${styles.yellow}`}>
              <BsFillCircleFill></BsFillCircleFill>
            </span>
            <div className={`${styles.answerContainer}`}>
              <p
                contentEditable="true"
                className={`${styles.answer} ${
                  !q2Empty ? `${styles.whiteText}` : ""
                }`}
                placeholder="Resposta 3 (optional)"
                onInput={answerInputHandler(2)}
                suppressContentEditableWarning
                ref={a3}
              >
                {game.questions[questionNumber].choices[2]}
              </p>
            </div>
            {!q2Empty && (
              <CheckboxCircle
                onClick={onCheckboxClickHandler(2)}
                checked={q2Checked}
              ></CheckboxCircle>
            )}
          </div>
          <div
            className={`${styles.wrapper} ${
              !q3Empty ? `${styles.green}` : `${styles.white}`
            }`}
          >
            <span className={`${styles.shapeContainer} ${styles.green}`}>
              <BsFillSquareFill
                style={{ transform: "rotate(45deg)" }}
              ></BsFillSquareFill>
            </span>
            <div className={`${styles.answerContainer}`}>
              <p
                contentEditable="true"
                className={`${styles.answer} ${
                  !q3Empty ? `${styles.whiteText}` : ""
                }`}
                placeholder="Resposta 4 (optional)"
                onInput={answerInputHandler(3)}
                suppressContentEditableWarning
                ref={a4}
              >
                {game.questions[questionNumber].choices[3]}
              </p>
            </div>
            {!q3Empty && (
              <CheckboxCircle
                onClick={onCheckboxClickHandler(3)}
                checked={q3Checked}
              ></CheckboxCircle>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Editor;
