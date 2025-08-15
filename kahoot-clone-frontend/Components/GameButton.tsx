import React from "react";
import styles from "../styles/GameButton.module.css";

function GameButton({ children, backgroundStyle, foregroundStyle, onClick }) {
  return (
    <button
      className={`${styles.gameButton}`}
      style={backgroundStyle}
      onClick={onClick}
    >
      <span style={foregroundStyle}>{children}</span>
    </button>
  );
}

export default GameButton;
