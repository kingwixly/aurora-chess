import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import CollectionPicker from "./CollectionPicker";

vi.mock("../lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from "../lib/api";
const mockGet = vi.mocked(api.get);

describe("CollectionPicker", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when not open", () => {
    const { container } = render(<CollectionPicker gameId="g1" open={false} onClose={onClose} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders modal heading when open", async () => {
    mockGet.mockResolvedValue({ data: { collections: [] } });
    render(<CollectionPicker gameId="g1" open={true} onClose={onClose} />);
    expect(screen.getByText("Add to Collection")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<CollectionPicker gameId="g1" open={true} onClose={onClose} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it.skip("renders collections after loading", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/v1/collections") {
        return Promise.resolve({
          data: {
            collections: [
              { id: "c1", name: "Favorites" },
              { id: "c2", name: "Training" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { collections: [] } });
    });

    render(<CollectionPicker gameId="g1" open={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Favorites")).toBeInTheDocument();
      expect(screen.getByText("Training")).toBeInTheDocument();
    });
  });

  it("has a Done button that calls onClose", async () => {
    mockGet.mockResolvedValue({ data: { collections: [] } });
    render(<CollectionPicker gameId="g1" open={true} onClose={onClose} />);

    const doneBtn = screen.getByText("Done");
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders checkboxes for each collection", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/v1/collections") {
        return Promise.resolve({
          data: { collections: [{ id: "c1", name: "My Games" }] },
        });
      }
      return Promise.resolve({ data: { collections: [] } });
    });

    render(<CollectionPicker gameId="g1" open={true} onClose={onClose} />);

    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeInTheDocument();
    });
  });
});
