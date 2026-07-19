"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function NewsletterSignupForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = (await res.json()) as {
      ok?: boolean;
      alreadySubscribed?: boolean;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      setStatus("error");
      setMessage(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    setStatus("success");
    setMessage(
      data.alreadySubscribed
        ? "You're already subscribed!"
        : "You're in! Check your inbox for the next digest.",
    );
    setEmail("");
  }

  if (status === "success") {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={status === "loading"}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-black focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {status === "loading" ? "Subscribing…" : "Subscribe"}
      </button>
      {status === "error" && (
        <p className="w-full text-sm text-red-600">{message}</p>
      )}
    </form>
  );
}
