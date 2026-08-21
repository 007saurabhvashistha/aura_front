import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { NotificationsProvider } from '../data/useNotifications';
import { DiscoverPage } from '../pages/DiscoverPage';
import { ProfileViewPage } from '../pages/ProfileViewPage';
import { ChatsPage } from '../pages/ChatsPage';
import { ChatThreadPage } from '../pages/ChatThreadPage';
import { CallPage } from '../pages/CallPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { SettingsPage } from '../pages/SettingsPage';
import '../styles/aura-app.css';

export function AuraAppRoutes() {
  return (
    <NotificationsProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/u/:profileId" element={<ProfileViewPage />} />
          <Route path="/me" element={<ProfileViewPage self />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/chats/:conversationId" element={<ChatThreadPage />} />
          <Route path="/calls/:callId" element={<CallPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AppShell>
    </NotificationsProvider>
  );
}
