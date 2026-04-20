/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as b2bInquiryNotification } from './b2b-inquiry-notification.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as bookingNotification } from './booking-notification.tsx'
import { template as bookingReminder } from './booking-reminder.tsx'
import { template as bookingReminder2h } from './booking-reminder-2h.tsx'
import { template as bookingStatusUpdate } from './booking-status-update.tsx'
import { template as bookingNoShowCheck } from './booking-no-show-check.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'b2b-inquiry-notification': b2bInquiryNotification,
  'booking-confirmation': bookingConfirmation,
  'booking-notification': bookingNotification,
  'booking-reminder': bookingReminder,
  'booking-reminder-2h': bookingReminder2h,
  'booking-status-update': bookingStatusUpdate,
  'booking-no-show-check': bookingNoShowCheck,
}
