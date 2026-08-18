interface DemoNoticeProps {
  message?: string;
}

// Clearly separates demo/mock state from future real API state so the control
// plane never presents placeholder numbers as production metrics.
export function DemoNotice({
  message = 'Showing demo data. This module is not yet connected to the backend.',
}: DemoNoticeProps) {
  return (
    <div className="admin-demo-notice" role="note">
      <span className="admin-demo-notice-dot" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
