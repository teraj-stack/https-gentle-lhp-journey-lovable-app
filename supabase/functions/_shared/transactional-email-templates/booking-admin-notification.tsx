import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

interface BookingAdminNotificationProps {
  name?: string
  email?: string
  phone?: string
  location?: string
  date?: string
  time?: string
  message?: string
}

const BookingAdminNotificationEmail = ({ name, email, phone, location, date, time, message }: BookingAdminNotificationProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Nowa rezerwacja wizyty — {name || 'pacjent'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>Nowa rezerwacja wizyty</Heading>
        <Text style={text}>
          Wpłynęła nowa rezerwacja wizyty przez formularz online.
        </Text>
        <Section style={detailsBox}>
          {name && (
            <Text style={detailRow}>
              <span style={detailLabel}>Pacjent:</span> {name}
            </Text>
          )}
          {email && (
            <Text style={detailRow}>
              <span style={detailLabel}>E-mail:</span> {email}
            </Text>
          )}
          {phone && (
            <Text style={detailRow}>
              <span style={detailLabel}>Telefon:</span> {phone}
            </Text>
          )}
          {location && (
            <Text style={detailRow}>
              <span style={detailLabel}>Lokalizacja:</span> {location}
            </Text>
          )}
          {date && (
            <Text style={detailRow}>
              <span style={detailLabel}>Data:</span> {date}
            </Text>
          )}
          {time && (
            <Text style={detailRow}>
              <span style={detailLabel}>Godzina:</span> {time}
            </Text>
          )}
        </Section>
        {message && (
          <>
            <Text style={detailLabel}>Dodatkowe informacje:</Text>
            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>
          </>
        )}
        <Hr style={divider} />
        <Text style={footer}>
          Wiadomość wygenerowana automatycznie — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingAdminNotificationEmail,
  subject: (data: Record<string, any>) => `Nowa rezerwacja: ${data.name || 'pacjent'} — ${data.date || ''}`,
  displayName: 'Powiadomienie admina o rezerwacji',
  previewData: { name: 'Jan Kowalski', email: 'jan@example.com', phone: '+48 600 000 000', location: 'Warszawa Wilanów', date: '15 stycznia 2025', time: '10:00', message: 'Proszę o konsultację ws. żylaków.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 20px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#faf8f4', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#1a1d24', lineHeight: '1.8', margin: '0' }
const detailLabel = { fontWeight: '600' as const, color: '#c9a84c', fontSize: '14px' as const }
const messageBox = { backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '12px 16px', margin: '8px 0 20px' }
const messageText = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0', fontStyle: 'italic' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
