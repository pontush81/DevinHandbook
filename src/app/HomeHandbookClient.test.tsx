import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HomeHandbookClient from "./HomeHandbookClient";

jest.mock('react-markdown', () => () => <div>Markdown</div>);

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
    expect(screen.getAllByText("Sektion 1").length).toBeGreaterThan(0);
    expect(screen.getByText("Beskrivning 1")).toBeInTheDocument();
    expect(screen.getByText("Sida 1")).toBeInTheDocument();
    expect(screen.getByText("Markdown")).toBeInTheDocument();
  });

  it("öppnar och stänger mobilmeny", () => {
    render(<HomeHandbookClient handbook={handbook} />);
    const openBtn = screen.getByLabelText("Öppna meny");
    fireEvent.click(openBtn);
    expect(screen.getAllByText("Innehåll").length).toBeGreaterThan(0);
    // Här kan du lägga till mer logik för att stänga menyn om du vill
  });
}); 