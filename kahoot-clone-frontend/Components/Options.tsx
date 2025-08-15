import React, { useContext, useState } from "react";
import { GameContext } from "../pages/create";
import styles from "../styles/Options.module.css";
import {
  MdOutlineArrowForwardIos,
  MdOutlineArrowBackIos,
  MdTimer,
} from "react-icons/md";
import Button from "react-bootstrap/Button";
import { Dropdown, DropdownButton, SSRProvider } from "react-bootstrap";

function Options() {
  const { game, setGame, questionNumber, setQuestionNumber } =
    useContext(GameContext);
  const [open, setOpen] = useState(true);
  return (
    <div
      className={`${styles.container} ${
        open ? styles.containerOpen : styles.containerClosed
      }`}
    >
      <div
        className={`${styles.toggleSwitch}`}
        onClick={() => {
          setOpen(!open);
        }}
      >
        {open ? (
          <MdOutlineArrowForwardIos></MdOutlineArrowForwardIos>
        ) : (
          <MdOutlineArrowBackIos></MdOutlineArrowBackIos>
        )}
      </div>
      <section className={`${styles.outerContainer}`}>
        <section className={`${styles.innerContainer}`}>
          <div>
            <label htmlFor="timer" className={`${styles.alignmentContainer}`}>
              <MdTimer></MdTimer>
              <span>Tempo</span>
            </label>
            <DropdownButton
              id="dropdown-basic-button"
              title={`${game.questions[questionNumber].time} segundos`}
              variant="outline-secondary"
              className={`${styles.getRidOfOutline}`}
            >
              {[15, 30, 45, 60, 90].map((val) => {
                return (
                  <Dropdown.Item
                    key={val}
                    onClick={() => {
                      setGame((game) => {
                        const gameCopy = { ...game };
                        gameCopy.questions[questionNumber].time = val;
                        return gameCopy;
                      });
                    }}
                  >{`${val} segundos`}</Dropdown.Item>
                );
              })}
            </DropdownButton>
          </div>
        </section>
      </section>
    </div>
  );
}

export default Options;
