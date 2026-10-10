"use client";

import { useEffect, useState } from "react";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function VerifyEmailPage() {
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("Checking your request...");
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetReady, setResetReady] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    async function handleAction() {
      try {
        const params = new URLSearchParams(window.location.search);

        const actionMode = params.get("mode");
        const oobCode = params.get("oobCode");

        if (!actionMode || !oobCode) {
          setStatus("Invalid or incomplete action link.");
          return;
        }

        setMode(actionMode);

        // EMAIL VERIFICATION
        if (actionMode === "verifyEmail") {
          await applyActionCode(auth, oobCode);

          setSuccess(true);
          setStatus("Your email has been verified successfully!");
          return;
        }

        // PASSWORD RESET
        if (actionMode === "resetPassword") {
          const accountEmail = await verifyPasswordResetCode(
            auth,
            oobCode
          );

          setEmail(accountEmail);
          setResetReady(true);
          setStatus("Create a new password for your account.");
          return;
        }

        setStatus("Unsupported email action.");
      } catch (error: any) {
        console.error("Firebase email action error:", error);

        if (
          error?.code === "auth/invalid-action-code" ||
          error?.code === "auth/expired-action-code"
        ) {
          setStatus(
            "This link is invalid or expired. Please request a new email."
          );
        } else {
          setStatus(
            error?.message ||
              "Unable to complete this request. Please try again."
          );
        }
      }
    }

    handleAction();
  }, []);

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const oobCode = params.get("oobCode");

      if (!oobCode) {
        setStatus("Invalid password reset link.");
        return;
      }

      setStatus("Updating your password...");

      await confirmPasswordReset(
        auth,
        oobCode,
        newPassword
      );

      setResetDone(true);
      setResetReady(false);
      setStatus("Password updated successfully!");
    } catch (error: any) {
      console.error("Password reset error:", error);

      if (
        error?.code === "auth/invalid-action-code" ||
        error?.code === "auth/expired-action-code"
      ) {
        setStatus(
          "This password reset link is invalid or expired. Please request a new one."
        );
      } else if (error?.code === "auth/weak-password") {
        setStatus(
          "Password is too weak. Please choose a stronger password."
        );
      } else {
        setStatus(
          error?.message ||
            "Password reset failed. Please try again."
        );
      }
    }
  }

  // PASSWORD RESET SCREEN
  if (mode === "resetPassword" && resetReady) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
          <h1 className="mb-4 text-3xl font-bold">
            Reset Password
          </h1>

          <p className="mb-5 text-sm text-gray-600">
            Reset password for:
            <br />
            <strong>{email}</strong>
          </p>

          <form
            onSubmit={handlePasswordReset}
            className="space-y-4"
          >
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              minLength={6}
              required
              className="w-full rounded-lg border p-3"
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              minLength={6}
              required
              className="w-full rounded-lg border p-3"
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-black p-3 font-semibold text-white"
            >
              Reset Password
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-600">
            {status}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="mb-4 text-3xl font-bold">
          {success
            ? "Email Verified!"
            : resetDone
            ? "Password Updated!"
            : "VRoom AI"}
        </h1>

        <p className="text-gray-700">{status}</p>

        {(success || resetDone) && (
          <a
            href="/login"
            className="mt-6 inline-block rounded-lg bg-black px-6 py-3 font-semibold text-white"
          >
            Go to Login
          </a>
        )}

        {!success && !resetDone && !resetReady && (
          <a
            href="/login"
            className="mt-6 inline-block font-semibold underline"
          >
            Back to Login
          </a>
        )}
      </div>
    </main>
  );
}