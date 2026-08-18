import { Drawer } from './Drawer';
import { Button } from './Button';

export interface AssignableItem {
  id: string;
  name: string;
  meta?: string;
}

interface AssignmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  assigned: AssignableItem[];
  available: AssignableItem[];
  onAssign: (id: string) => void;
  onRemove: (id: string) => void;
  emptyAvailableLabel?: string;
  emptyAssignedLabel?: string;
}

// Reusable Available vs Assigned resource assignment surface. Assignment updates
// the caller's shared registry via onAssign/onRemove using stable IDs.
export function AssignmentDrawer({
  isOpen,
  onClose,
  title,
  description,
  assigned,
  available,
  onAssign,
  onRemove,
  emptyAvailableLabel = 'Nothing left to assign.',
  emptyAssignedLabel = 'Nothing assigned yet.',
}: AssignmentDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="admin-drawer-actions">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="admin-assign">
        <section className="admin-assign-group">
          <p className="admin-assign-heading">Assigned ({assigned.length})</p>
          {assigned.length === 0 ? (
            <p className="admin-assign-empty">{emptyAssignedLabel}</p>
          ) : (
            <ul className="admin-assign-list">
              {assigned.map((item) => (
                <li key={item.id} className="admin-assign-row">
                  <div>
                    <p className="admin-assign-name">{item.name}</p>
                    {item.meta && <p className="admin-assign-meta">{item.meta}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-assign-group">
          <p className="admin-assign-heading">Available ({available.length})</p>
          {available.length === 0 ? (
            <p className="admin-assign-empty">{emptyAvailableLabel}</p>
          ) : (
            <ul className="admin-assign-list">
              {available.map((item) => (
                <li key={item.id} className="admin-assign-row">
                  <div>
                    <p className="admin-assign-name">{item.name}</p>
                    {item.meta && <p className="admin-assign-meta">{item.meta}</p>}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onAssign(item.id)}>
                    Assign
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}
