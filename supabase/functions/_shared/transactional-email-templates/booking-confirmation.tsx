import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

interface BookingConfirmationProps {
  patientName?: string
  appointmentDate?: string
  appointmentTime?: string
  location?: string
  message?: string
}

// Map location codes to friendly Polish labels
const LOCATION_LABELS: Record<string, string> = {
  'warszawa-wilanow': 'Warszawa Wilanów, ul. Adama Branickiego 10/U6',
}

const formatLocation = (loc?: string) => {
  if (!loc) return '—'
  return LOCATION_LABELS[loc] ?? loc
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

const BookingConfirmationEmail = ({
  patientName,
  appointmentDate,
  appointmentTime,
  location,
  message,
}: BookingConfirmationProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>
      Potwierdzenie rezerwacji wizyty — {formatDate(appointmentDate)}
      {appointmentTime ? `, godz. ${appointmentTime}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>
          {patientName ? `Dziękujemy, ${patientName}!` : 'Dziękujemy za rezerwację!'}
        </Heading>
        <Text style={text}>
          Otrzymaliśmy Twoją rezerwację wizyty. Poniżej znajdziesz wszystkie szczegóły.
          Skontaktujemy się z Tobą w razie potrzeby potwierdzenia lub uzgodnienia
          dodatkowych informacji.
        </Text>

        <Section style={infoBox}>
          <Text style={label}>Data wizyty</Text>
          <Text style={value}>{formatDate(appointmentDate)}</Text>

          <Hr style={innerDivider} />

          <Text style={label}>Godzina</Text>
          <Text style={value}>{appointmentTime || '—'}</Text>

          <Hr style={innerDivider} />

          <Text style={label}>Lokalizacja</Text>
          <Text style={value}>{formatLocation(location)}</Text>

          {message && (
            <>
              <Hr style={innerDivider} />
              <Text style={label}>Twoja wiadomość</Text>
              <Text style={messageText}>{message}</Text>
            </>
          )}
        </Section>

        <Heading style={h2}>Co dalej?</Heading>
        <Text style={text}>
          Prosimy o przybycie 5–10 minut przed wyznaczoną godziną. Jeżeli będziesz
          musiał_a zmienić termin lub odwołać wizytę, skontaktuj się z nami możliwie
          najwcześniej — to pozwoli nam zaproponować termin innemu pacjentowi.
        </Text>
        <Text style={text}>
          W razie pytań przed wizytą napisz na{' '}
          <a href="mailto:biuro@cml.pl" style={link}>biuro@cml.pl</a>.
        </Text>

        <Hr style={divider} />
        <Text style={footer}>
          Z poważaniem, Zespół {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingConfirmationEmail,
  subject: (data: Record<string, any>) => {
    const datePart = data?.appointmentDate
      ? formatDate(data.appointmentDate)
      : null
    const timePart = data?.appointmentTime ? `, godz. ${data.appointmentTime}` : ''
    return datePart
      ? `Potwierdzenie rezerwacji wizyty — ${datePart}${timePart} — CML`
      : 'Potwierdzenie rezerwacji wizyty — CML'
  },
  displayName: 'Potwierdzenie rezerwacji wizyty',
  previewData: {
    patientName: 'Jan Kowalski',
    appointmentDate: '2026-05-12',
    appointmentTime: '14:30',
    location: 'warszawa-wilanow',
    message: 'Pierwsza wizyta — konsultacja flebologiczna.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const innerDivider = { borderColor: '#eeeeee', margin: '14px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 16px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const h2 = { fontSize: '17px', fontWeight: '700' as const, color: '#1a1d24', margin: '24px 0 10px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#c9a84c', textDecoration: 'underline' }
const infoBox = { backgroundColor: '#faf7f0', borderRadius: '8px', padding: '18px 20px', margin: '12px 0 20px' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }
const value = { fontSize: '14px', color: '#1a1d24', fontWeight: '600' as const, margin: '0 0 4px' }
const messageText = { fontSize: '14px', color: '#1a1d24', lineHeight: '1.6', margin: '0', whiteSpace: 'pre-wrap' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
