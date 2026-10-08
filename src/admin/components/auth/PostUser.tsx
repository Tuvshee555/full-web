/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { User } from "@admin/type/type";
import axios, { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CreatePassword } from "./CreatePassword";
import { CreateEmail } from "./CreateEmail";

export const PostUser = () => {
  const [signUpStep, setSignupStep] = useState(1);
  const [user, setUser] = useState<User>({
    email: "",
    password: "",
    repassword: "",
    role: "ADMIN",
  });

  const router = useRouter();

  const handlePostUser = async () => {
    if (!user.email || !user.password) {
      toast.error("Email and password are required!");
      return;
    }

    if (user.password !== user.repassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/user`,
        user
      );
      // console.log("Created admin", response.data);
      toast.success("Welcome aboard! You can now log in.");
      router.push("/admin/log-in");
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      const message = error.response?.data?.message;

      if (message) {
        toast.error(message);
      } else {
        toast.error("Something went wrong");
      }

      // console.error(error);
    }
  };

  const nextStep = () => {
    if (signUpStep === 2) {
      handlePostUser();
      router.push(`log-in`);
    } else {
      setSignupStep((prev) => prev + 1);
    }
  };

  const stepBack = () => {
    setSignupStep((prev) => prev - 1);
  };

  return (
    <div>
      {signUpStep === 1 && (
        <CreateEmail
          setUser={setUser}
          nextStep={nextStep}
          user={user}
          stepBack={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      )}

      {signUpStep >= 2 && (
        <CreatePassword
          setUser={setUser}
          nextStep={nextStep}
          user={user}
          stepBack={stepBack}
        />
      )}
    </div>
  );
};
