import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import XPreview from "@/app/admin/(protected)/social/generate/[platform]/XPreview";
import RedditPreview from "@/app/admin/(protected)/social/generate/[platform]/RedditPreview";
import YouTubeCommunityPreview from "@/app/admin/(protected)/social/generate/[platform]/YouTubeCommunityPreview";
import TikTokPreview from "@/app/admin/(protected)/social/generate/[platform]/TikTokPreview";

describe("platform preview cards", () => {
  it("renders XPreview with hook, caption, and hashtags", () => {
    render(
      <XPreview
        hook="Hook text"
        script=""
        caption="Caption text"
        hashtags={["#MensHealth"]}
      />,
    );
    expect(screen.getByText("Caption text")).toBeInTheDocument();
    expect(screen.getByText("#MensHealth")).toBeInTheDocument();
  });

  it("renders RedditPreview with hook and caption", () => {
    render(
      <RedditPreview
        hook="Discussion title"
        script=""
        caption="Body text"
        hashtags={[]}
      />,
    );
    expect(screen.getByText("Discussion title")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("renders YouTubeCommunityPreview with hook, caption, and hashtags", () => {
    render(
      <YouTubeCommunityPreview
        hook="Question hook"
        script=""
        caption="Community post body"
        hashtags={["#Fitness"]}
      />,
    );
    expect(screen.getByText("Question hook")).toBeInTheDocument();
    expect(screen.getByText("Community post body")).toBeInTheDocument();
    expect(screen.getByText("#Fitness")).toBeInTheDocument();
  });

  it("renders TikTokPreview with hook, script, caption, and hashtags", () => {
    render(
      <TikTokPreview
        hook="On-camera hook"
        script={"Line one.\nLine two."}
        caption="Video description"
        hashtags={["#Shorts"]}
      />,
    );
    expect(screen.getByText("On-camera hook")).toBeInTheDocument();
    expect(screen.getByText("Video description")).toBeInTheDocument();
    expect(screen.getByText("#Shorts")).toBeInTheDocument();
  });
});
