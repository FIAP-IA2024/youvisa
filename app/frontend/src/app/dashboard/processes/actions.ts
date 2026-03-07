"use server";

import {
  getProcesses,
  getProcess,
  updateProcessStatus,
  type Process,
} from "@/lib/api";

export async function fetchProcesses(filters?: {
  status?: string;
  visa_type?: string;
}): Promise<Process[]> {
  return await getProcesses(filters);
}

export async function fetchProcess(id: string): Promise<Process | null> {
  return await getProcess(id);
}

export async function changeProcessStatus(
  id: string,
  status: string,
  reason?: string
): Promise<Process | null> {
  return await updateProcessStatus(id, status, reason);
}
