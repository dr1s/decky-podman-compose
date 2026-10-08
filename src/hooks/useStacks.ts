import { useEffect, useState } from "react";
import { toaster } from "@decky/api";
import {
  composeAction,
  getBaseDir,
  getSelectedService,
  getSelectedStack,
  getServices,
  getStackStatus,
  scanStacks,
  setBaseDir as setBaseDirBackend,
  setSelectedServiceBackend,
  setSelectedStackBackend,
} from "../api";
import { ALL_SERVICES, STATUS_REFRESH_INTERVAL_MS } from "../constants";
import type { Stack, StackStatusDetail } from "../types";

export interface UseStacksResult {
  baseDir: string;
  setBaseDir: (dir: string) => void;
  stacks: Stack[];
  selectedStack: string | undefined;
  setSelectedStack: (name: string) => void;
  services: string[];
  selectedService: string;
  setSelectedService: (name: string) => void;
  statusDetail: StackStatusDetail | null;
  pendingAction: string | null;
  saveBaseDir: () => Promise<void>;
  runAction: (action: string) => Promise<void>;
}

export function useStacks(): UseStacksResult {
  const [baseDir, setBaseDir] = useState<string>("~/podman");
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [selectedStack, setSelectedStackState] = useState<string | undefined>(undefined);
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedServiceState] = useState<string>(ALL_SERVICES);
  const [statusDetail, setStatusDetail] = useState<StackStatusDetail | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const setSelectedStack = (name: string) => {
    setSelectedStackState(name);
    setSelectedStackBackend(name);
  };

  const setSelectedService = (name: string) => {
    setSelectedServiceState(name);
    setSelectedServiceBackend(name);
  };

  const loadBaseDir = async () => {
    try {
      const dir = await getBaseDir();
      setBaseDir(dir);
    } catch (e) {
      console.error("Failed to load base dir", e);
    }
  };

  const loadStatus = async (stackName: string) => {
    try {
      const detail = await getStackStatus(stackName);
      setStatusDetail(detail);
    } catch (e) {
      console.error("Failed to load status", e);
      setStatusDetail({ status: "unknown", services: [] });
    }
  };

  const loadServices = async (stackName: string) => {
    try {
      const svc = await getServices(stackName);
      setServices(svc);
      const saved = await getSelectedService();
      if (saved && (saved === ALL_SERVICES || svc.includes(saved))) {
        setSelectedServiceState(saved);
      } else {
        setSelectedServiceState(ALL_SERVICES);
      }
    } catch (e) {
      console.error("Failed to load services", e);
      setServices([]);
      setSelectedServiceState(ALL_SERVICES);
    }
  };

  const doScan = async () => {
    try {
      const found = await scanStacks();
      setStacks(found);
      if (found.length > 0 && selectedStack === undefined) {
        const saved = await getSelectedStack();
        const initial = saved && found.some((s) => s.name === saved) ? saved : found[0].name;
        setSelectedStackState(initial);
      }
    } catch (e) {
      console.error("Failed to scan stacks", e);
      toaster.toast({ title: "Scan failed", body: String(e) });
    }
  };

  const saveBaseDir = async () => {
    setPendingAction("Saving");
    try {
      const result = await setBaseDirBackend(baseDir);
      if (result.success) {
        await doScan();
        toaster.toast({ title: "Settings saved", body: baseDir });
      } else {
        toaster.toast({ title: "Settings error", body: result.message || "Unknown error" });
      }
    } catch (e) {
      console.error("Podman Compose: save exception", e);
      toaster.toast({ title: "Settings exception", body: String(e) });
    } finally {
      setPendingAction(null);
    }
  };

  const runAction = async (action: string) => {
    if (selectedStack === undefined) return;
    setPendingAction(action);
    try {
      const svcs = selectedService === ALL_SERVICES ? [] : [selectedService];
      const result = await composeAction(selectedStack, action, svcs);
      const output = result.message || "(no output)";
      if (result.success) {
        toaster.toast({ title: `${action} succeeded`, body: selectedStack });
      } else {
        toaster.toast({ title: `${action} failed`, body: output });
      }
      await loadStatus(selectedStack);
    } catch (e) {
      const msg = String(e);
      console.error(`Action ${action} failed`, e);
      toaster.toast({ title: `${action} failed`, body: msg });
    } finally {
      setPendingAction(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadBaseDir();
      if (mounted) await doScan();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (selectedStack === undefined) {
        setServices([]);
        setStatusDetail(null);
        return;
      }
      setStatusDetail(null);
      try {
        if (mounted) await loadServices(selectedStack);
        if (mounted) await loadStatus(selectedStack);
      } catch (e) {
        console.error("Failed to load stack data", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedStack]);

  useEffect(() => {
    if (selectedStack === undefined) return;
    const interval = setInterval(() => {
      loadStatus(selectedStack);
    }, STATUS_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedStack]);

  return {
    baseDir,
    setBaseDir,
    stacks,
    selectedStack,
    setSelectedStack,
    services,
    selectedService,
    setSelectedService,
    statusDetail,
    pendingAction,
    saveBaseDir,
    runAction,
  };
}
