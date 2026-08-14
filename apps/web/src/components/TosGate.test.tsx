import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TosGate from "./TosGate";

vi.mock("../lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockUseAuthStore = vi.fn();

vi.mock("../stores/auth", () => ({
  useAuthStore: Object.assign(
    (selector?: unknown) => {
      const state = mockUseAuthStore();
      return typeof selector === "function" ? selector(state) : state;
    },
    { setState: vi.fn(), getState: vi.fn() }
  ),
}));

describe("TosGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when user is null (not logged in)", () => {
    mockUseAuthStore.mockReturnValue({ user: null });
    render(
      <TosGate>
        <div>App Content</div>
      </TosGate>
    );
    expect(screen.getByText("App Content")).toBeInTheDocument();
  });

  it("renders children when user has accepted TOS", () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: "1", tosAccepted: true },
    });
    render(
      <TosGate>
        <div>App Content</div>
      </TosGate>
    );
    expect(screen.getByText("App Content")).toBeInTheDocument();
  });

  it("shows TOS screen when user has not accepted", () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: "1", tosAccepted: false },
    });
    render(
      <TosGate>
        <div>App Content</div>
      </TosGate>
    );
    expect(screen.getByText("Terms of Service Agreement")).toBeInTheDocument();
    expect(screen.queryByText("App Content")).not.toBeInTheDocument();
  });

  it("shows I Accept and I Decline buttons", () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: "1", tosAccepted: false },
    });
    render(
      <TosGate>
        <div>App Content</div>
      </TosGate>
    );
    expect(screen.getByText("I Accept")).toBeInTheDocument();
    expect(screen.getByText("I Decline")).toBeInTheDocument();
  });

  it("shows deactivation message after declining", async () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: "1", tosAccepted: false },
    });

    const { default: api } = await import("../lib/api");
    vi.mocked(api.post).mockResolvedValue({});

    render(
      <TosGate>
        <div>App Content</div>
      </TosGate>
    );

    fireEvent.click(screen.getByText("I Decline"));
    expect(screen.getByText("Account Deactivated")).toBeInTheDocument();
  });

  it.skip("contains Terms of Service heading in the content", () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: "1", tosAccepted: false },
    });
    render(
      <TosGate>
        <div>App Content</div>
      </TosGate>
    );
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });
});
