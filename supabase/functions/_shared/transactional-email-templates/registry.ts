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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'b2b-inquiry-notification': b2bInquiryNotification,
  'booking-confirmation': bookingConfirmation,
}
