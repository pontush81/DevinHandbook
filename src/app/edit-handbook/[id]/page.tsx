"use client";

import { useParams } from 'next/navigation';
import EditHandbookClient from "./client";

export default function EditHandbookPage() {
  const params = useParams();
  const id = params.id as string;
  
  return <EditHandbookClient id={id} />;
}
