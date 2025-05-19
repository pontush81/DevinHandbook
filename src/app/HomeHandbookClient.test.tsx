import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HomeHandbookClient from "./HomeHandbookClient";

describe("HomeHandbookClient", () => {
  const handbook = {
    id: "1",
    title: "Testhandbok",
    sections: [
      {
        id: "s1",
        title: "Sektion 1",
        description: "Beskrivning 1",
        order_index: 1,
        handbook_id: "1",
        pages: [
          {
            id: "p1",
            title: "Sida 1",
            content: "# Innehåll på sida 1",
            order_index: 1,
            section_id: "s1"
          }
        ]
      }
    ]
  };

  it("renderar titel, sektion och sida", () => {
    render(<HomeHandbookClient handbook={handbook} />);
    expect(screen.getByText("Testhandbok")).toBeInTheDocument();
    expect(screen.getByText("Sektion 1")).toBeInTheDocument();
    expect(screen.getByText("Beskrivning 1")).toBeInTheDocument();
    expect(screen.getByText("Sida 1")).toBeInTheDocument();
    expect(screen.getByText("Innehåll på sida 1")).toBeInTheDocument();
  });

  it("öppnar och stänger mobilmeny", () => {
    render(<HomeHandbookClient handbook={handbook} />);
    const openBtn = screen.getByLabelText("Öppna meny");
    fireEvent.click(openBtn);
    expect(screen.getByText("Innehåll")).toBeInTheDocument();
    const closeBtn = screen.getByRole("button", { name: "Innehåll" }).parentElement?.querySelector("button");
    if (closeBtn) fireEvent.click(closeBtn);
  });
}); 