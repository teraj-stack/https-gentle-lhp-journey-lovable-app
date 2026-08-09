import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

interface BookingNotificationProps {
  patientName?: string
  patientEmail?: string
  patientPhone?: string
  appointmentDate?: string
  appointmentTime?: string
  location?: string
  locationLabel?: string
  message?: string
  bookingId?: string
  /** Pełne URL-e do strony /booking-action z osadzonym tokenem akcji. Generowane w on-booking-created per recipient. */
  confirmUrl?: string
  cancelUrl?: string
  needsContactUrl?: string
}

const formatDate = (date?: string) => {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return date
  }
}

const BookingNotificationEmail = ({
  patientName,
  patientEmail,
  patientPhone,
  appointmentDate,
  appointmentTime,
  location,
  locationLabel,
  message,
  bookingId,
  confirmUrl,
  cancelUrl,
  needsContactUrl,
}: BookingNotificationProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>
      Nowa rezerwacja: {patientName || 'pacjent'} — {formatDate(appointmentDate)}
      {appointmentTime ? `, godz. ${appointmentTime}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>Nowa rezerwacja wizyty</Heading>
        <Text style={text}>
          Otrzymano nową rezerwację. Poniżej szczegóły do potwierdzenia z pacjentem.
        </Text>

        <Section style={infoBox}>
          <Text style={label}>Pacjent</Text>
          <Text style={value}>{patientName || '—'}</Text>

          <Hr style={innerDivider} />

          <Text style={label}>Kontakt</Text>
          <Text style={value}>
            {patientEmail || '—'}
            {patientPhone ? ` · ${patientPhone}` : ''}
          </Text>

          <Hr style={innerDivider} />

          <Text style={label}>Data i godzina</Text>
          <Text style={value}>
            {formatDate(appointmentDate)}
            {appointmentTime ? `, godz. ${appointmentTime}` : ''}
          </Text>

          <Hr style={innerDivider} />

          <Text style={label}>Lokalizacja</Text>
          <Text style={value}>{locationLabel || location || '—'}</Text>

          {message && (
            <>
              <Hr style={innerDivider} />
              <Text style={label}>Wiadomość od pacjenta</Text>
              <Text style={messageText}>{message}</Text>
            </>
          )}

          {bookingId && (
            <>
              <Hr style={innerDivider} />
              <Text style={label}>ID rezerwacji</Text>
              <Text style={mono}>{bookingId}</Text>
            </>
          )}
        </Section>

        {(confirmUrl || cancelUrl || needsContactUrl) && (
          <>
            <Text style={actionsLabel}>Szybka akcja recepcji</Text>
            <Section style={actionsRow}>
              {confirmUrl && (
                <Button href={confirmUrl} style={btnConfirm}>
                  ✓ Potwierdź wizytę
                </Button>
              )}
              {cancelUrl && (
                <Button href={cancelUrl} style={btnCancel}>
                  ✕ Odwołaj wizytę
                </Button>
              )}
              {needsContactUrl && (
                <Button href={needsContactUrl} style={btnContact}>
                  ☎ Wymaga kontaktu
                </Button>
              )}
            </Section>
            <Text style={actionsHint}>
              Każdy link otworzy stronę z potwierdzeniem akcji. Linki ważne 7 dni, jednorazowe.
              Po wykonaniu akcji pozostałe przyciski przestają działać.
            </Text>
          </>
        )}

        <Text style={text}>
          Można też skontaktować się z pacjentem telefonicznie lub mailowo.
        </Text>

        <Hr style={divider} />
        <Text style={footer}>
          Powiadomienie systemowe — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingNotificationEmail,
  subject: (data: Record<string, any>) => {
    const who = data?.patientName ? ` od ${data.patientName}` : ''
    const datePart = data?.appointmentDate ? ` — ${formatDate(data.appointmentDate)}` : ''
    const timePart = data?.appointmentTime ? `, ${data.appointmentTime}` : ''
    return `Nowa rezerwacja${who}${datePart}${timePart} — CML`
  },
  // Recipient is set per-invocation (recepcja danej lokalizacji + biuro@cml.pl) — no fixed `to`.
  displayName: 'Powiadomienie o rezerwacji (recepcja)',
  previewData: {
    patientName: 'Anna Testowa',
    patientEmail: 'anna.test@example.pl',
    patientPhone: '+48 600 000 000',
    appointmentDate: '2026-05-15',
    appointmentTime: '10:30',
    location: 'warszawa-wilanow',
    locationLabel: 'Warszawa Wilanów (ul. Adama Branickiego 10/U6)',
    message: 'Pierwsza wizyta — konsultacja flebologiczna.',
    bookingId: '00000000-0000-0000-0000-000000000999',
    confirmUrl: 'https://mcml.pro/booking-action?token=preview-confirm-token',
    cancelUrl: 'https://mcml.pro/booking-action?token=preview-cancel-token',
    needsContactUrl: 'https://mcml.pro/booking-action?token=preview-contact-token',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const innerDivider = { borderColor: '#eeeeee', margin: '14px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 16px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#faf7f0', borderRadius: '8px', padding: '18px 20px', margin: '12px 0 20px' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }
const value = { fontSize: '14px', color: '#1a1d24', fontWeight: '600' as const, margin: '0 0 4px' }
const messageText = { fontSize: '14px', color: '#1a1d24', lineHeight: '1.6', margin: '0', whiteSpace: 'pre-wrap' as const }
const mono = { fontSize: '12px', color: '#55575d', fontFamily: 'monospace', margin: '0' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }

// --- Action button styles (recepcja) ---
const actionsLabel = { fontSize: '11px', fontWeight: '600' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '24px 0 10px' }
const actionsRow = { textAlign: 'center' as const, margin: '0 0 12px' }
const btnBase = {
  display: 'inline-block',
  padding: '11px 18px',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '6px',
  textDecoration: 'none',
  margin: '4px 6px',
  textAlign: 'center' as const,
}
const btnConfirm = { ...btnBase, backgroundColor: '#2f7d54', color: '#ffffff' }
const btnCancel = { ...btnBase, backgroundColor: '#a83232', color: '#ffffff' }
const btnContact = { ...btnBase, backgroundColor: '#c9a84c', color: '#1a1d24' }
const actionsHint = { fontSize: '11px', color: '#999999', lineHeight: '1.5', margin: '0 0 20px', fontStyle: 'italic' as const }
