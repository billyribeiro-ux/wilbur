/**
 * Presentation formatting helpers shared across components.
 */

import { formatDistanceToNow } from 'date-fns';

/** Human-friendly relative time, e.g. "5 minutes ago". Accepts an ISO date string. */
export function formatRelativeTime(dateString: string): string {
	return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}
