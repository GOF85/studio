
'use client';
import type { ActivityLog, PortalUser } from '@/types';

export function logActivity(user: PortalUser, action: string, details: string, entityId: string) {
    const storedLogs = localStorage.getItem('activityLogs');
    const logs: ActivityLog[] = storedLogs ? JSON.parse(storedLogs) : [];

    const newLog: ActivityLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.nombre,
        userRole: user.role,
        action,
        details,
        entityId
    };

    logs.push(newLog);

    // Keep logs to a reasonable number, e.g., 500
    if (logs.length > 500) {
        logs.shift(); // Remove the oldest log
    }

    localStorage.setItem('activityLogs', JSON.stringify(logs));
}
