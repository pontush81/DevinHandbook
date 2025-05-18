// src/types/next.d.ts
import { NextPage } from "next";

// Skapa anpassade typer för att arbeta med Next.js 15
declare module "next" {
  export type PageProps = {
    params?: any;
    searchParams?: any;
  }
}
