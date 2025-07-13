"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsModal } from "@/components/settings-modal";
import { useChatStore } from "@/stores/chat-store";
import { ModelSelector } from "./model-selector";
import { VoiceModeSelector } from "./voice-mode-selector";

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Header({ onToggleSidebar, isSidebarOpen }: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { createNewChat } = useChatStore();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="w-full px-4">
        {/* Layout responsive: desktop vs móvil */}
        <div className="flex flex-col sm:flex-row">
          {/* Desktop: una fila con todo */}
          <div className="hidden sm:flex sm:h-14 sm:items-center sm:justify-between sm:w-full">
            {/* Izquierda: Menu + Nuevo chat + Selectores */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                title="Toggle sidebar"
                className="cursor-pointer"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={createNewChat}
                title="New chat"
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <ModelSelector />
              <VoiceModeSelector />
            </div>

            {/* Derecha: Botón de settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          {/* Móvil: layout especial */}
          <div className="flex flex-col sm:hidden w-full">
            {/* Primera fila: Menu + Nuevo chat + Settings */}
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleSidebar}
                  title="Toggle sidebar"
                  className="cursor-pointer"
                >
                  <Menu className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={createNewChat}
                  title="New chat"
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Segunda fila: Selectores con scroll horizontal */}
            <div className="pb-3 px-2">
              <div className="flex items-center space-x-2 overflow-x-auto max-w-full px-2 py-1">
                <ModelSelector />
                <VoiceModeSelector />
              </div>
            </div>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </motion.header>
  );
}
