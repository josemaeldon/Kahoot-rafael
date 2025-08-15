import qStyles from "@styles/Question.module.css";
import { rustServerQuestion } from "kahoot";
import {
  BsFillCircleFill,
  BsFillSquareFill,
  BsFillTriangleFill,
} from "react-icons/bs";

interface Props {
  question: rustServerQuestion;
}

function QuestionDisplay({ question }: Props) {
  return (
    <div className={`${qStyles.container}`}>
      <p
        contentEditable="true"
        className={`${qStyles.question}`}
        placeholder="Question..."
        suppressContentEditableWarning
      >
        {question.question}
      </p>
      <div>
        <div className={`${qStyles.grid}`}>
          <div className={`${qStyles.wrapper} `}>
            <span className={`${qStyles.shapeContainer} ${qStyles.red}`}>
              <BsFillTriangleFill></BsFillTriangleFill>
            </span>
            <div className={`${qStyles.answerContainer}`}>
              <p
                contentEditable="true"
                placeholder="Answer 1"
                className={`${qStyles.answer} ${qStyles.whiteText}`}
                suppressContentEditableWarning
              >
                {question.choices[0]}
              </p>
            </div>
          </div>
          <div
            className={`${qStyles.wrapper} 
          ${qStyles.blue}`}
          >
            <span className={`${qStyles.shapeContainer} ${qStyles.blue}`}>
              <BsFillSquareFill></BsFillSquareFill>
            </span>
            <div className={`${qStyles.answerContainer}`}>
              <p
                contentEditable="true"
                className={`${qStyles.answer} ${qStyles.whiteText}
            `}
                placeholder="Answer 2"
                suppressContentEditableWarning
              >
                {question.choices[1]}
              </p>
            </div>
          </div>
          <div className={`${qStyles.wrapper} ${qStyles.yellow}`}>
            <span className={`${qStyles.shapeContainer} ${qStyles.yellow}`}>
              <BsFillCircleFill></BsFillCircleFill>
            </span>
            <div className={`${qStyles.answerContainer}`}>
              <p
                contentEditable="true"
                className={`${qStyles.answer} 
              ${qStyles.whiteText}`}
                suppressContentEditableWarning
              >
                {question.choices[2]}
              </p>
            </div>
          </div>
          <div className={`${qStyles.wrapper} ${qStyles.green}`}>
            <span className={`${qStyles.shapeContainer} ${qStyles.green}`}>
              <BsFillSquareFill
                style={{ transform: "rotate(45deg)" }}
              ></BsFillSquareFill>
            </span>
            <div className={`${qStyles.answerContainer}`}>
              <p
                contentEditable="true"
                className={`${qStyles.answer} ${qStyles.whiteText}`}
                suppressContentEditableWarning
              >
                {question.choices[3]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
