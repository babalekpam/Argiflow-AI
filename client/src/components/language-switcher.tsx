import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const toggleLanguage = () => {
    const newLang = currentLang === "en" ? "fr" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
  };

  if (variant === "compact") {
    return (
      <Button
        size="icon"
        variant="ghost"
        onClick={toggleLanguage}
        data-testid="button-language-toggle"
        title={currentLang === "en" ? "Passer en français" : "Switch to English"}
      >
        <span className="text-xs font-bold">{currentLang === "en" ? "FR" : "EN"}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      className="gap-1.5"
    >
      <Globe className="w-4 h-4" />
      <span className="text-xs font-medium">{currentLang === "en" ? "FR" : "EN"}</span>
    </Button>
  );
}
