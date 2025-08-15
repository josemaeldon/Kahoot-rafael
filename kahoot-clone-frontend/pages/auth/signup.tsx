import React, { useState } from "react";
import styles from "@styles/signupnew.module.css";
import Link from "next/link";
import { postData } from "@lib/postData";
import { APIRequest, APIResponse } from "pages/api/signup";
import { useRouter } from "next/router";
import Header from "@components/Header";
import useUser from "@lib/useUser";

interface Info {
  username: string;
  password: string;
}

function Signup() {
  const [info, setInfo] = useState<Info>({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { loggedIn } = useUser();

  if (loggedIn) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return null;
  }

  const signupHandler = async () => {
    setIsLoading(true);
    setError(null);
    const request: APIRequest = {
      username: info.username,
      password: info.password,
    };
    try {
      const response = await postData<APIRequest, APIResponse>(
        "/api/signup",
        request
      );
      if (response.error) {
        setError(response.errorDescription || "An unexpected error occurred.");
      } else {
        localStorage.setItem(
          "accessTokenPayload",
          //@ts-ignore
          JSON.stringify(response.user)
        );
        router.push("/");
      }
    } catch (err) {
      setError("Falha ao conectar-se ao servidor. Por favor, tente novamente.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.vh100}>
      <Header />
      <div className={styles.container}>
        <div className={styles.card}>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              signupHandler();
            }}
          >
            <h2 className={styles.title}>Inscrver-se</h2>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.inputGroup}>
              <label htmlFor="username" className={styles.label}>
                Usuário
              </label>
              <input
                type="text"
                id="username"
                className={styles.input}
                value={info.username}
                onChange={(e) => setInfo({ ...info, username: e.target.value })}
                placeholder="Digite seu nome de usuário - Ex.: joaoemaria -"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Senha
              </label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className={styles.input}
                  value={info.password}
                  onChange={(e) =>
                    setInfo({ ...info, password: e.target.value })
                  }
                  placeholder="Digite sua senha"
                  required
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar Senha"}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.button}
              disabled={isLoading}
            >
              {isLoading ? "Inscrever-se..." : "Inscreva-se"}
            </button><br />

            <button
              type="button"
              className={styles.button}
              onClick={() => {
                        window.location.href = "https://kahoot.cloudbr.app";
                          }}
                            >
                Voltar
            </button>

            <p className={styles.loginPrompt}>
              Já tem uma conta?{" "}
              <Link href="/auth/login">
                <a className={styles.loginLink}>Login</a>
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
