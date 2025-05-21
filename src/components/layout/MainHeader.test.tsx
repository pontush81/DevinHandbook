import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MainHeader } from "./MainHeader";

jest.mock("next/navigation", () => ({ usePathname: () => "/app" }));
jest.mock("lucide-react", () => ({ Menu: () => <svg data-testid="menu-icon" /> }));

const sections = [
  { id: "s1", title: "Sektion 1" },
  { id: "s2", title: "Sektion 2" },
];

describe("MainHeader", () => {
  it("visar mobilmeny när variant='app' och sections finns", () => {
    render(<MainHeader variant="app" sections={sections} />);
    expect(screen.getByTestId("menu-icon")).toBeInTheDocument();
  });

  it("visar sektionstitlar i menyn när den öppnas", () => {
    render(<MainHeader variant="app" sections={sections} />);
    fireEvent.click(screen.getByRole("button", { name: /öppna meny/i }));
    expect(screen.getByText("Sektion 1")).toBeInTheDocument();
    expect(screen.getByText("Sektion 2")).toBeInTheDocument();
  });

  it("stänger menyn när SheetClose klickas", () => {
    render(<MainHeader variant="app" sections={sections} />);
    fireEvent.click(screen.getByRole("button", { name: /öppna meny/i }));
    // SheetClose är en knapp med aria-label="Close" i shadcn/ui
    const closeBtn = screen.getByLabelText(/close/i);
    fireEvent.click(closeBtn);
    // Menyn ska stängas, men vi kan bara testa att closeBtn inte längre finns
    // (eller att sektionstitlarna inte syns)
    // Men pga portals kan det kräva mer setup, så vi testar att closeBtn försvinner
    expect(closeBtn).not.toBeVisible();
  });

  it("visar inte mobilmeny om sections saknas", () => {
    render(<MainHeader variant="app" />);
    expect(screen.queryByTestId("menu-icon")).not.toBeInTheDocument();
  });

  it("visar inte mobilmeny om variant='landing'", () => {
    render(<MainHeader variant="landing" sections={sections} />);
    expect(screen.queryByTestId("menu-icon")).not.toBeInTheDocument();
  });
}); 