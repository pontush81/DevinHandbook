"use server";

import EditHandbookClient from "./client";

export default async function EditHandbookPage({ params }: { params: { id: string } }) {
  return <EditHandbookClient id={params.id} />;
}
