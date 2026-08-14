import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AccuracyCard from "./AccuracyCard";

describe("AccuracyCard", () => {
  it("shows 'No analysed games yet' when gamesAnalysed is 0", () => {
    render(<AccuracyCard average={null} best={null} worst={null} gamesAnalysed={0} />);
    expect(screen.getByText("No analysed games yet")).toBeInTheDocument();
  });

  it("renders Accuracy heading", () => {
    render(
      <AccuracyCard
        average={85}
        best={{ value: 95, gameId: "g1" }}
        worst={{ value: 60, gameId: "g2" }}
        gamesAnalysed={10}
      />
    );
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
  });

  it("renders average accuracy", () => {
    render(
      <AccuracyCard
        average={85}
        best={{ value: 95, gameId: "g1" }}
        worst={{ value: 60, gameId: "g2" }}
        gamesAnalysed={10}
      />
    );
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Average")).toBeInTheDocument();
  });

  it("renders best accuracy", () => {
    render(
      <AccuracyCard
        average={85}
        best={{ value: 95, gameId: "g1" }}
        worst={{ value: 60, gameId: "g2" }}
        gamesAnalysed={10}
      />
    );
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("Best")).toBeInTheDocument();
  });

  it("renders worst accuracy", () => {
    render(
      <AccuracyCard
        average={85}
        best={{ value: 95, gameId: "g1" }}
        worst={{ value: 60, gameId: "g2" }}
        gamesAnalysed={10}
      />
    );
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("Worst")).toBeInTheDocument();
  });

  it("renders games analysed count", () => {
    render(
      <AccuracyCard
        average={85}
        best={{ value: 95, gameId: "g1" }}
        worst={{ value: 60, gameId: "g2" }}
        gamesAnalysed={10}
      />
    );
    expect(screen.getByText("10 games analysed")).toBeInTheDocument();
  });
});
