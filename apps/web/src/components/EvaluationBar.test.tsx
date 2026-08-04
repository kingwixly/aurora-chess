import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EvaluationBar from "./EvaluationBar";

describe("EvaluationBar", () => {
  it("should render score for positive eval", () => {
    render(<EvaluationBar evalCP={150} mate={null} />);
    expect(screen.getByText("+1.5")).toBeInTheDocument();
  });

  it("should render score for negative eval", () => {
    render(<EvaluationBar evalCP={-200} mate={null} />);
    expect(screen.getByText("-2.0")).toBeInTheDocument();
  });

  it("should render 0.0 for null eval", () => {
    render(<EvaluationBar evalCP={null} mate={null} />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("should render mate score for positive mate", () => {
    render(<EvaluationBar evalCP={null} mate={3} />);
    expect(screen.getByText("M3")).toBeInTheDocument();
  });

  it("should render mate score for negative mate", () => {
    render(<EvaluationBar evalCP={null} mate={-5} />);
    expect(screen.getByText("M-5")).toBeInTheDocument();
  });

  it("should render zero eval as 0.0", () => {
    render(<EvaluationBar evalCP={0} mate={null} />);
    expect(screen.getByText("0.0")).toBeInTheDocument();
  });
});
