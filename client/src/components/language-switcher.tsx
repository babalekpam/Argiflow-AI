import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "compact" }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const switchToLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-0.5" data-testid="button-language-toggle">
        <Button
          size="sm"
          variant={currentLang === "en" ? "default" : "ghost"}
          onClick={() => switchToLanguage("en")}
          className="px-2 min-h-8"
        >
          <span className="text-xs font-bold">EN</span>
        </Button>
        <Button
          size="sm"
          variant={currentLang === "fr" ? "default" : "ghost"}
          onClick={() => switchToLanguage("fr")}
          className="px-2 min-h-8"
        >
          <span className="text-xs font-bold">FR</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5" data-testid="button-language-toggle">
      <Globe className="w-4 h-4 mr-1 text-muted-foreground" />
      <Button
        size="sm"
        variant={currentLang === "en" ? "default" : "ghost"}
        onClick={() => switchToLanguage("en")}
        className="px-2 min-h-8"
      >
        <span className="text-xs font-medium">EN</span>
      </Button>
      <Button
        size="sm"
        variant={currentLang === "fr" ? "default" : "ghost"}
        onClick={() => switchToLanguage("fr")}
        className="px-2 min-h-8"
      >
        <span className="text-xs font-medium">FR</span>
      </Button>
    </div>
  );
}
