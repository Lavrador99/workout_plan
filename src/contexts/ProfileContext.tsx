import { GOAL_SCHEDULES } from "@/consts";
import type { PlanConfig, Profile } from "@/types";
import { scheduleWrite } from "@/utils/fileAutosave";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileContextValue {
  profiles: Profile[];
  activeProfile: Profile | null;
  activePrefix: string;
  activateProfile: (id: string) => void;
  addProfile: (profile: Profile) => void;
  updateProfile: (id: string, updates: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;
  showProfilesScreen: boolean;
  setShowProfilesScreen: (v: boolean) => void;
  showWizard: boolean;
  setShowWizard: (v: boolean) => void;
  /** Call after import to reload from localStorage */
  reloadFromStorage: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem("treino_profiles");
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem("treino_profiles", JSON.stringify(profiles));
  scheduleWrite();
}

function profilePrefix(id: string): string {
  return `p_${id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default plan config factory
// ─────────────────────────────────────────────────────────────────────────────

export function makePlanConfig(partial: Partial<PlanConfig>): PlanConfig {
  const goal = partial.goal ?? "hybrid_strength";
  return {
    startDate: new Date().toISOString().split("T")[0],
    weeks: 12,
    trainingDays: [1, 3, 5],
    schedule: GOAL_SCHEDULES[goal],
    goal,
    experience: "intermediate",
    sessionDuration: 60,
    name: "Perfil",
    emoji: "🏋️",
    color: "#e8ff47",
    ...partial,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showProfilesScreen, setShowProfilesScreen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // ── Initial load ──
  useEffect(() => {
    const loadedProfiles = loadProfiles();
    const savedActiveId = localStorage.getItem("treino_active_profile");

    setProfiles(loadedProfiles);

    if (loadedProfiles.length === 0) {
      setShowProfilesScreen(true);
    } else if (
      savedActiveId &&
      loadedProfiles.find((p) => p.id === savedActiveId)
    ) {
      setActiveId(savedActiveId);
    } else if (loadedProfiles.length > 0) {
      setShowProfilesScreen(true);
    }
  }, []);

  const reloadFromStorage = useCallback(() => {
    const loadedProfiles = loadProfiles();
    const savedActiveId = localStorage.getItem("treino_active_profile");
    setProfiles(loadedProfiles);
    if (savedActiveId && loadedProfiles.find((p) => p.id === savedActiveId)) {
      setActiveId(savedActiveId);
      setShowProfilesScreen(false);
    } else if (loadedProfiles.length > 0) {
      setShowProfilesScreen(true);
    }
  }, []);

  const activateProfile = useCallback((id: string) => {
    localStorage.setItem("treino_active_profile", id);
    scheduleWrite();
    setActiveId(id);
    setShowProfilesScreen(false);
  }, []);

  const addProfile = useCallback((profile: Profile) => {
    setProfiles((prev) => {
      const next = [...prev, profile];
      saveProfiles(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<Profile>) => {
    setProfiles((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      saveProfiles(next);
      return next;
    });
  }, []);

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => {
        const next = prev.filter((p) => p.id !== id);
        saveProfiles(next);
        return next;
      });
      if (activeId === id) {
        localStorage.removeItem("treino_active_profile");
        setActiveId(null);
        setShowProfilesScreen(true);
      }
    },
    [activeId],
  );

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;
  const activePrefix = activeId ? profilePrefix(activeId) : "";

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        activePrefix,
        activateProfile,
        addProfile,
        updateProfile,
        deleteProfile,
        showProfilesScreen,
        setShowProfilesScreen,
        showWizard,
        setShowWizard,
        reloadFromStorage,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
