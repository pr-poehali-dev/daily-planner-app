import { useState } from "react";
import Icon from "@/components/ui/icon";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const InstallBanner = () => {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || isInstalled || !canInstall) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-icon">
        <Icon name="Download" size={20} />
      </div>
      <div className="install-banner-text">
        <span className="install-banner-title">Установить приложение</span>
        <span className="install-banner-sub">Работает без интернета, как обычное приложение</span>
      </div>
      <button className="install-banner-btn" onClick={install}>
        Установить
      </button>
      <button className="install-banner-close" onClick={() => setDismissed(true)}>
        <Icon name="X" size={16} />
      </button>
    </div>
  );
};

export default InstallBanner;
