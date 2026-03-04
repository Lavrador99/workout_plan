import { DataToolbar } from "@/components/DataToolbar";
import { DemoModal } from "@/components/DemoModal";
import { EditModal, type EditCtx } from "@/components/EditModal";
import { Nav } from "@/components/Nav";
import { Timer } from "@/components/Timer";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
import { useTimer } from "@/hooks/useTimer";
import { HistoryPage } from "@/pages/HistoryPage";
import { ProgressPage } from "@/pages/ProgressPage";
import { SkillsPage } from "@/pages/SkillsPage";
import { TodayPage, type EditInfo } from "@/pages/TodayPage";
import { ProfilesScreen } from "@/screens/ProfilesScreen";
import { WizardScreen } from "@/screens/WizardScreen";
import type { Profile } from "@/types";
import { getLog, markDone, saveLog } from "@/utils/storage";
import { useState } from "react";

type Tab = "today" | "skills" | "history" | "progress";

function AppInner() {
  const {
    profiles,
    activeProfile,
    activePrefix,
    activateProfile,
    addProfile,
    deleteProfile,
    showProfilesScreen,
    setShowProfilesScreen,
    showWizard,
    setShowWizard,
    reloadFromStorage,
  } = useProfile();

  const timer = useTimer();
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [todayKey, setTodayKey] = useState(0); // force TodayPage remount after edits

  // Demo modal
  const [demoInfo, setDemoInfo] = useState<{
    key: string;
    name: string;
    tip: string;
  } | null>(null);

  // Edit modal
  const [editCtx, setEditCtx] = useState<EditCtx | null>(null);
  const [editInfo, setEditInfo] = useState<EditInfo | null>(null);

  const handleEditOpen = (info: EditInfo) => {
    const log = getLog(
      info.profilePrefix,
      info.date,
      info.exercise.key,
      info.setIdx,
    );
    setEditInfo(info);
    setEditCtx({
      exercise: info.exercise,
      setIdx: info.setIdx,
      initialReps: log?.reps,
      initialWeight: log?.weight ?? null,
    });
  };

  const handleEditSave = (reps: number, weight: number | null) => {
    if (!editInfo) return;
    saveLog(
      editInfo.profilePrefix,
      editInfo.date,
      editInfo.exercise.key,
      editInfo.setIdx,
      { reps, weight },
    );
    markDone(
      editInfo.profilePrefix,
      editInfo.date,
      editInfo.exercise.key,
      editInfo.setIdx,
      true,
    );
    setEditCtx(null);
    setEditInfo(null);
    setTodayKey((k) => k + 1);
  };

  const handleEditClear = () => {
    if (!editInfo) return;
    markDone(
      editInfo.profilePrefix,
      editInfo.date,
      editInfo.exercise.key,
      editInfo.setIdx,
      false,
    );
    setEditCtx(null);
    setEditInfo(null);
    setTodayKey((k) => k + 1);
  };

  const handleProfileClick = () => {
    setShowProfilesScreen(true);
  };

  const handleAddProfile = (profile: Profile) => {
    addProfile(profile);
    activateProfile(profile.id);
    setShowWizard(false);
  };

  const config = activeProfile?.planConfig ?? null;

  return (
    <>
      {/* Profiles screen */}
      {showProfilesScreen && (
        <ProfilesScreen
          profiles={profiles}
          activeProfileId={activeProfile?.id ?? null}
          onSelect={(id) => {
            activateProfile(id);
            setShowProfilesScreen(false);
          }}
          onAdd={() => {
            setShowProfilesScreen(false);
            setShowWizard(true);
          }}
          onDelete={deleteProfile}
        />
      )}

      {/* Wizard screen */}
      {showWizard && (
        <WizardScreen
          onComplete={handleAddProfile}
          onClose={() => {
            setShowWizard(false);
            if (profiles.length === 0) setShowProfilesScreen(true);
          }}
        />
      )}

      {/* Main app */}
      {!showProfilesScreen && !showWizard && (
        <>
          <DataToolbar onRestored={reloadFromStorage} />

          {/* Page content */}
          <main className="px-4 pt-14 pb-20 max-w-xl mx-auto min-h-screen">
            {activeTab === "today" && config && (
              <TodayPage
                key={todayKey}
                profilePrefix={activePrefix}
                config={config}
                onTimerStart={timer.start}
                onDemoOpen={setDemoInfo}
                onEditOpen={handleEditOpen}
              />
            )}
            {activeTab === "today" && !config && (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <span className="text-4xl">💪</span>
                <p className="font-semibold text-white">Nenhum perfil ativo</p>
                <button
                  onClick={() => setShowProfilesScreen(true)}
                  className="bg-accent text-black px-4 py-2 rounded-lg font-bold"
                >
                  Criar perfil
                </button>
              </div>
            )}
            {activeTab === "skills" && (
              <SkillsPage profilePrefix={activePrefix} />
            )}
            {activeTab === "history" && config && (
              <HistoryPage profilePrefix={activePrefix} config={config} />
            )}
            {activeTab === "progress" && config && (
              <ProgressPage profilePrefix={activePrefix} config={config} />
            )}
          </main>

          <Nav
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as Tab)}
            profileEmoji={activeProfile?.emoji ?? "👤"}
            onProfileClick={handleProfileClick}
          />
        </>
      )}

      {/* Timer overlay */}
      {timer.running && (
        <Timer
          seconds={timer.seconds}
          running={timer.running}
          warning={timer.warning}
          formatted={timer.formatted()}
          onStop={timer.stop}
          onAddTime={timer.addTime}
          onSetTimer={timer.setTimer}
        />
      )}

      {/* Demo modal */}
      {demoInfo && (
        <DemoModal demo={demoInfo} onClose={() => setDemoInfo(null)} />
      )}

      {/* Edit modal */}
      {editCtx && (
        <EditModal
          ctx={editCtx}
          onSave={handleEditSave}
          onClear={handleEditClear}
          onClose={() => {
            setEditCtx(null);
            setEditInfo(null);
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ProfileProvider>
      <AppInner />
    </ProfileProvider>
  );
}
