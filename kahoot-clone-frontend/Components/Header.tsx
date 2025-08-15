import styles from "../styles/Header.module.css";
import Image from "next/image";
import useUser from "@lib/useSSRUser";
import { useLayoutEffect, useState } from "react";
import { postData } from "@lib/postData";
import { useRouter } from "next/router";

function Header() {
  const { loggedIn, user } = useUser();
  const router = useRouter();

  return (
    <div className={`${styles.container}`}>
      <Image
        src={"/kahootLogo.svg"}
        width={"96px"}
        height={"32.72px"}
        alt="Kahoot Logo"
        style={{ cursor: "pointer" }}
        onClick={() => {
          router.push("/");
        }}
      ></Image>
      <div>
        {loggedIn && (
          <button
            type="button"
            className={`${styles.logoutButton}`}
            onClick={() => {
              postData("/api/signout", {}).then(() => {
                router.push("/auth/login");
              });
            }}
          >
            Sair
          </button>
        )}
      </div>
    </div>
  );
}

export default Header;
