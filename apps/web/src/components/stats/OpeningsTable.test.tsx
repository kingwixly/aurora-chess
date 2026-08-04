import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OpeningsTable from "./OpeningsTable";

describe("OpeningsTable", () => {
  it("shows 'No opening data yet' when empty", () => {
    render(<OpeningsTable openings={[]} />);
    expect(screen.getByText("No opening data yet")).toBeInTheDocument();
  });

  it("renders Top Openings heading with data", () => {
    render(
      <OpeningsTable
        openings={[
          { name: "Sicilian Defense", eco: "B20", wins: 5, losses: 3, draws: 2, count: 10 },
        ]}
      />
    );
    expect(screen.getByText("Top Openings")).toBeInTheDocument();
  });

  it("renders opening name and ECO code", () => {
    render(
      <OpeningsTable
        openings={[
          { name: "Sicilian Defense", eco: "B20", wins: 5, losses: 3, draws: 2, count: 10 },
        ]}
      />
    );
    expect(screen.getByText("Sicilian Defense")).toBeInTheDocument();
    expect(screen.getByText("B20")).toBeInTheDocument();
  });

  it("renders game count", () => {
    render(
      <OpeningsTable
        openings={[
          { name: "Sicilian Defense", eco: "B20", wins: 5, losses: 3, draws: 2, count: 10 },
        ]}
      />
    );
    expect(screen.getByText("10 games")).toBeInTheDocument();
  });

  it("renders win rate percentage", () => {
    render(
      <OpeningsTable
        openings={[
          { name: "Sicilian Defense", eco: "B20", wins: 5, losses: 3, draws: 2, count: 10 },
        ]}
      />
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders multiple openings", () => {
    render(
      <OpeningsTable
        openings={[
          { name: "Sicilian Defense", eco: "B20", wins: 5, losses: 3, draws: 2, count: 10 },
          { name: "French Defense", eco: "C00", wins: 3, losses: 1, draws: 0, count: 4 },
        ]}
      />
    );
    expect(screen.getByText("Sicilian Defense")).toBeInTheDocument();
    expect(screen.getByText("French Defense")).toBeInTheDocument();
    expect(screen.getByText("C00")).toBeInTheDocument();
  });

  it("applies green color for win rate >= 50%", () => {
    render(
      <OpeningsTable
        openings={[{ name: "Test Opening", eco: "A00", wins: 6, losses: 4, draws: 0, count: 10 }]}
      />
    );
    const winRate = screen.getByText("60%");
    expect(winRate.className).toContain("text-green-400");
  });

  it("applies red color for win rate < 50%", () => {
    render(
      <OpeningsTable
        openings={[{ name: "Test Opening", eco: "A00", wins: 2, losses: 8, draws: 0, count: 10 }]}
      />
    );
    const winRate = screen.getByText("20%");
    expect(winRate.className).toContain("text-red-400");
  });
});
