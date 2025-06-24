"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Eye,
  EyeOff,
  Save,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import {
  useChatStore,
  VOICE_OPTIONS,
  VAD_TYPES,
  TRANSCRIPTION_MODELS,
} from "@/stores/chat-store";
import { useTheme } from "@/hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  owned_by: string;
}

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Custom SelectContent with subtle animations for settings modal
// Ya no necesitamos CustomSelectContent, usaremos SelectContent normal

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);
  const [systemInstructionsInput, setSystemInstructionsInput] = useState("");

  const {
    fetchModels,
    devMode,
    setDevMode,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    voice,
    setVoice,
    voiceMode,
    isRealtimeModel,
    vadType,
    setVadType,
    vadThreshold,
    setVadThreshold,
    vadPrefixPadding,
    setVadPrefixPadding,
    vadSilenceDuration,
    setVadSilenceDuration,
    vadEagerness,
    setVadEagerness,
    transcriptionModel,
    setTranscriptionModel,
    transcriptionLanguage,
    setTranscriptionLanguage,
    systemInstructions,
    setSystemInstructions,
  } = useChatStore();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Load API key from localStorage when modal opens
    if (open) {
      const storedKey = localStorage.getItem("openai_api_key") || "";
      setApiKey(storedKey);
      setSystemInstructionsInput(systemInstructions);

      // Force blur the API key input to prevent auto-selection
      setTimeout(() => {
        const apiKeyInput = document.getElementById(
          "api-key"
        ) as HTMLInputElement;
        if (apiKeyInput) {
          apiKeyInput.blur();
          document.body.focus();
        }
      }, 100);
    }
  }, [open, systemInstructions]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      // Save to localStorage
      if (apiKey.trim()) {
        localStorage.setItem("openai_api_key", apiKey.trim());
      } else {
        localStorage.removeItem("openai_api_key");
      }

      // Save system instructions
      setSystemInstructions(systemInstructionsInput);

      // Refetch models if API key changed
      await fetchModels();

      // Close modal after short delay
      setTimeout(() => {
        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus("idle");
          onOpenChange(false);
        }, 1000);
      }, 500);
    } catch (error) {
      console.error("Error saving settings:", error);
      setIsSaving(false);
      setSaveStatus("idle");
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
  };

  const handleTemperatureChange = (value: string) => {
    const temp = parseFloat(value);
    if (!isNaN(temp) && temp >= 0 && temp <= 2) {
      setTemperature(temp);
    }
  };

  const handleMaxTokensChange = (value: string) => {
    const tokens = parseInt(value);
    if (!isNaN(tokens) && tokens > 0) {
      setMaxTokens(tokens);
    }
  };

  const getThemeIcon = (themeName: string) => {
    const iconClass = "h-4 w-4 mr-2";
    switch (themeName) {
      case "light":
        return <Sun className={iconClass} />;
      case "dark":
        return <Moon className={iconClass} />;
      default:
        return <Monitor className={iconClass} />;
    }
  };

  const getThemeLabel = (themeName: string) => {
    switch (themeName) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      default:
        return "System";
    }
  };

  // Check if we're in voice mode
  const showVoiceSettings = isRealtimeModel() && voiceMode !== "none";

  // Handler para quitar focus de selectores
  const handleSelectOpenChange = (open: boolean) => {
    if (!open) {
      requestAnimationFrame(() => {
        // Buscar el trigger específico del selector que se acaba de cerrar
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          // Si es un elemento relacionado con select, hacer blur
          if (
            activeElement.hasAttribute("data-radix-select-trigger") ||
            activeElement.getAttribute("role") === "combobox" ||
            activeElement.hasAttribute("aria-haspopup")
          ) {
            activeElement.blur();
          }
        }

        // También buscar elementos que puedan haber quedado focused
        const focusedSelects = document.querySelectorAll(
          '[data-radix-select-trigger]:focus, [role="combobox"]:focus'
        );
        focusedSelects.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.blur();
          }
        });
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your OpenAI API settings and chat preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key Section */}
          <div className="space-y-3">
            <Label htmlFor="api-key" className="block mb-3">
              OpenAI API Key
            </Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-..."
                className="pr-10"
                autoFocus={false}
                tabIndex={-1}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 cursor-pointer"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>

          <div className="border-t pt-4" />

          {/* Chat Settings Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Chat Settings</h3>

            {/* System Instructions */}
            <div className="space-y-3">
              <Label htmlFor="system-instructions" className="block mb-3">
                System Instructions
              </Label>
              <textarea
                id="system-instructions"
                value={systemInstructionsInput}
                onChange={(e) => setSystemInstructionsInput(e.target.value)}
                placeholder="You are a helpful assistant..."
                className="w-full min-h-[100px] p-3 text-sm rounded-md border border-input bg-background resize-y"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Sets the behavior and personality of the AI assistant. This
                message is sent with every request.
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature" className="block mb-2">
                  Temperature
                </Label>
                <span className="text-xs text-muted-foreground">
                  {temperature}
                </span>
              </div>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => handleTemperatureChange(e.target.value)}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Controls randomness: 0 is focused, 2 is more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-3">
              <Label htmlFor="max-tokens" className="block mb-3">
                Max Tokens
              </Label>
              <Input
                id="max-tokens"
                type="number"
                min="1"
                max="4096"
                value={maxTokens}
                onChange={(e) => handleMaxTokensChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum length of generated responses
              </p>
            </div>

            {/* Voice Selection - Only show for voice modes */}
            {showVoiceSettings && (
              <>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <Label htmlFor="voice" className="block mb-3">
                    Voice
                  </Label>
                  <Select
                    value={voice}
                    onValueChange={setVoice}
                    onOpenChange={handleSelectOpenChange}
                  >
                    <SelectTrigger id="voice" className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {VOICE_OPTIONS.map((option, index) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03, duration: 0.15 }}
                        >
                          <SelectItem
                            value={option.id}
                            className="cursor-pointer"
                          >
                            <motion.span
                              className="select-none"
                              whileHover={{ x: 2 }}
                              transition={{ duration: 0.1 }}
                            >
                              {option.name}
                            </motion.span>
                          </SelectItem>
                        </motion.div>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the voice for audio responses
                  </p>
                </motion.div>

                {/* Advanced Voice Settings Toggle */}
                <div
                  className="flex items-center gap-2 cursor-pointer select-none py-2"
                  onClick={() => setShowAdvancedVoice(!showAdvancedVoice)}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Advanced Voice Settings
                  </span>
                </div>

                {/* Advanced Voice Settings */}
                <AnimatePresence>
                  {showAdvancedVoice && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pl-6"
                    >
                      {/* VAD Type */}
                      <div className="space-y-3">
                        <Label htmlFor="vad-type" className="block mb-3">
                          Voice Activity Detection Type
                        </Label>
                        <Select
                          value={vadType}
                          onValueChange={(value) =>
                            setVadType(value as "server_vad" | "semantic_vad")
                          }
                          onOpenChange={handleSelectOpenChange}
                        >
                          <SelectTrigger
                            id="vad-type"
                            className="cursor-pointer"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {VAD_TYPES.map((type, index) => (
                              <motion.div
                                key={type.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: index * 0.03,
                                  duration: 0.15,
                                }}
                              >
                                <SelectItem
                                  value={type.id}
                                  className="cursor-pointer"
                                >
                                  <motion.span
                                    className="select-none"
                                    whileHover={{ x: 2 }}
                                    transition={{ duration: 0.1 }}
                                  >
                                    {type.name} (
                                    {type.id === "server_vad"
                                      ? "Silence detection"
                                      : "AI detection"}
                                    )
                                  </motion.span>
                                </SelectItem>
                              </motion.div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Eagerness for Semantic VAD */}
                      {vadType === "semantic_vad" && (
                        <div className="space-y-3">
                          <Label htmlFor="vad-eagerness" className="block mb-3">
                            Response Eagerness
                          </Label>
                          <Select
                            value={vadEagerness}
                            onValueChange={setVadEagerness}
                            onOpenChange={handleSelectOpenChange}
                          >
                            <SelectTrigger
                              id="vad-eagerness"
                              className="cursor-pointer"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              {[
                                {
                                  id: "low",
                                  name: "Low",
                                  description: "Lets users take their time",
                                },
                                {
                                  id: "medium",
                                  name: "Medium",
                                  description: "Balanced approach",
                                },
                                {
                                  id: "high",
                                  name: "High",
                                  description:
                                    "Responds as quickly as possible",
                                },
                                {
                                  id: "auto",
                                  name: "Auto",
                                  description: "Equivalent to medium",
                                },
                              ].map((option, index) => (
                                <motion.div
                                  key={option.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{
                                    delay: index * 0.03,
                                    duration: 0.15,
                                  }}
                                >
                                  <SelectItem
                                    value={option.id}
                                    className="cursor-pointer"
                                  >
                                    <motion.span
                                      className="select-none"
                                      whileHover={{ x: 2 }}
                                      transition={{ duration: 0.1 }}
                                    >
                                      {option.name}
                                    </motion.span>
                                  </SelectItem>
                                </motion.div>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Controls how quickly the AI responds in semantic VAD
                            mode
                          </p>
                        </div>
                      )}

                      {/* VAD Threshold - Only for Server VAD */}
                      {vadType === "server_vad" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label
                              htmlFor="vad-threshold"
                              className="block mb-2"
                            >
                              Detection Threshold
                            </Label>
                            <span className="text-xs text-muted-foreground">
                              {vadThreshold}
                            </span>
                          </div>
                          <Input
                            id="vad-threshold"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={vadThreshold}
                            onChange={(e) =>
                              setVadThreshold(parseFloat(e.target.value))
                            }
                            className="cursor-pointer"
                          />
                          <p className="text-xs text-muted-foreground">
                            Higher = requires louder audio to activate
                          </p>
                        </div>
                      )}

                      {/* Prefix Padding - Only for Server VAD */}
                      {vadType === "server_vad" && (
                        <div className="space-y-3">
                          <Label
                            htmlFor="prefix-padding"
                            className="block mb-3"
                          >
                            Prefix Padding (ms)
                          </Label>
                          <Input
                            id="prefix-padding"
                            type="number"
                            min="0"
                            max="1000"
                            step="50"
                            value={vadPrefixPadding}
                            onChange={(e) =>
                              setVadPrefixPadding(
                                parseInt(e.target.value) || 300
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Audio to include before speech is detected
                          </p>
                        </div>
                      )}

                      {/* Silence Duration - Only for Server VAD */}
                      {vadType === "server_vad" && (
                        <div className="space-y-3">
                          <Label
                            htmlFor="silence-duration"
                            className="block mb-3"
                          >
                            Silence Duration (ms)
                          </Label>
                          <Input
                            id="silence-duration"
                            type="number"
                            min="100"
                            max="2000"
                            step="100"
                            value={vadSilenceDuration}
                            onChange={(e) =>
                              setVadSilenceDuration(
                                parseInt(e.target.value) || 500
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            How long to wait before ending speech
                          </p>
                        </div>
                      )}

                      {/* Transcription Model */}
                      <div className="space-y-3">
                        <Label
                          htmlFor="transcription-model"
                          className="block mb-3"
                        >
                          Transcription Model
                        </Label>
                        <Select
                          value={transcriptionModel}
                          onValueChange={setTranscriptionModel}
                          onOpenChange={handleSelectOpenChange}
                        >
                          <SelectTrigger
                            id="transcription-model"
                            className="cursor-pointer"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {TRANSCRIPTION_MODELS.map((model, index) => (
                              <motion.div
                                key={model.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: index * 0.03,
                                  duration: 0.15,
                                }}
                              >
                                <SelectItem
                                  value={model.id}
                                  className="cursor-pointer"
                                >
                                  <motion.span
                                    className="select-none"
                                    whileHover={{ x: 2 }}
                                    transition={{ duration: 0.1 }}
                                  >
                                    {model.name}
                                  </motion.span>
                                </SelectItem>
                              </motion.div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Language */}
                      <div className="space-y-3">
                        <Label htmlFor="language" className="block mb-3">
                          Language Code
                        </Label>
                        <Input
                          id="language"
                          type="text"
                          placeholder="en"
                          value={transcriptionLanguage}
                          onChange={(e) =>
                            setTranscriptionLanguage(e.target.value)
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          ISO-639-1 format (e.g., en, es, fr, de, ja, zh)
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          <div className="border-t pt-4" />

          {/* Appearance Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Appearance</h3>

            {/* Theme Selector */}
            <div className="space-y-3">
              <Label htmlFor="theme" className="block mb-3">
                Theme
              </Label>
              <Select
                value={theme}
                onValueChange={setTheme}
                onOpenChange={handleSelectOpenChange}
              >
                <SelectTrigger id="theme" className="cursor-pointer">
                  <SelectValue>
                    <div className="flex items-center">
                      {getThemeIcon(theme)}
                      {getThemeLabel(theme)}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {["system", "light", "dark"].map((themeName, index) => (
                    <motion.div
                      key={themeName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.15 }}
                    >
                      <SelectItem value={themeName} className="cursor-pointer">
                        <motion.div
                          className="flex items-center select-none"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.1 }}
                        >
                          {getThemeIcon(themeName)}
                          {getThemeLabel(themeName)}
                        </motion.div>
                      </SelectItem>
                    </motion.div>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
          </div>

          <div className="border-t pt-4" />

          {/* Developer Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="dev-mode" className="text-base">
                Developer Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Show technical details about API requests and responses
              </p>
            </div>
            <Switch
              id="dev-mode"
              checked={devMode}
              onCheckedChange={setDevMode}
              className="cursor-pointer"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saveStatus !== "idle"}
              className="cursor-pointer"
            >
              {saveStatus === "saving" && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    <Save className="h-4 w-4" />
                  </motion.div>
                  Saving...
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Saved!
                </>
              )}
              {saveStatus === "idle" && "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
