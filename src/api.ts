import { callable } from "@decky/api";
import type { Stack, StackStatusDetail } from "./types";

export const setBaseDir = callable<[path: string], { success: boolean; message?: string }>("set_base_dir");
export const getBaseDir = callable<[], string>("get_base_dir");
export const getSelectedStack = callable<[], string>("get_selected_stack");
export const setSelectedStackBackend = callable<[stackName: string], { success: boolean; message?: string }>("set_selected_stack");
export const getSelectedService = callable<[], string>("get_selected_service");
export const setSelectedServiceBackend = callable<[serviceName: string], { success: boolean; message?: string }>("set_selected_service");
export const listDirectory = callable<[path: string], { success: boolean; entries?: { name: string; path: string }[]; message?: string }>("list_directory");
export const scanStacks = callable<[], Stack[]>("scan_stacks");
export const getServices = callable<[stackName: string], string[]>("get_services");
export const getStackStatus = callable<[stackName: string], StackStatusDetail>("get_stack_status_detail");
export const composeAction = callable<[stackName: string, action: string, services?: string[]], { success: boolean; message: string }>("compose_action");
export const startLogStream = callable<[stackName: string, services?: string[]], { success: boolean; message?: string }>("start_log_stream");
export const getLogLines = callable<[stackName: string, afterIndex: number], { lines: string[]; next_index: number }>("get_log_lines");
export const stopLogStream = callable<[stackName: string], void>("stop_log_stream");
