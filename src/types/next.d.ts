// src/types/next.d.ts
import { NextPage } from "next";

declare module "next" {
  export type PageProps = {
    params?: any;
    searchParams?: any;
  }
}
