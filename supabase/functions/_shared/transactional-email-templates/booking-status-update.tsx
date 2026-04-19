import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

type BookingStatus = 'confirmed' | 'cancelled' | 'needs_contact'

interface BookingStatusUpdateProps {
  patientName?: string
  appointmentDate?: string
  appointmentTime?: string
  locationLabel?: string
  status?: BookingStatus
}

const formatDate = (date?: string) => {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return date
    return d.toLocaleDateString('pl-PL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return date }
}

const STATUS_CONFIG: Record<BookingStatus, { heading: string; body: string; accent: string }> = {
  confirmed: {
    heading: 'Twoja wizyta została potwierdzona',
    body: 'Cieszymy się, że możemy Państwa przyjąć w naszej klinice. Poniżej szczegóły zarezerwowanego terminu.',
    accent: '#2f7d54',
  },
  cancelled: {
    heading: 'Twoja wizyta została odwołana',
    body: 'Z przyczyn organizacyjnych lub na Państwa prośbę powyższy termin został anulowany. Aby zarezerwować nowy termin, prosimy o kontakt z naszą recepcją.',
    accent: '#a83232',
  },
  needs_contact: {
    heading: 'Prosimy o kontakt w sprawie rezerwacji',
    body: 'W celu doprecyzowania szczegółów Państwa wizyty prosimy o kontakt z naszą recepcją (telefon lub e-mail). Po krótkiej rozmowie potwierdzimy ostateczny termin.',
    accent: '#c9a84c',
  },
}

const BookingStatusUpdateEmail = ({
  patientName,
  appointmentDate,
  appointmentTime,
  locationLabel,
  status = 'confirmed',
}: BookingStatusUpdateProps) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed

  return (
    <Html lang="pl" dir="ltr">
      <Head />
      <Preview>{cfg.heading} — {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={logo}>{SITE_NAME}</Text>
          <Hr style={divider} />

          <Heading style={{ ...h1, color: cfg.accent }}>{cfg.heading}</Heading>

          <Text style={text}>
            {patientName ? `Szanowna/y ${patientName},` : 'Dzień dobry,'}
          </Text>
          <Text style={text}>{cfg.body}</Text>

          <Section style={{ ...infoBox, borderLeft: `3px solid ${cfg.accent}` }}>
            <Text style={label}>Termin wizyty</Text>
            <Text style={value}>
              {formatDate(appointmentDate)}
              {appointmentTime ? `, godz. ${appointmentTime}` : ''}
            </Text>

            {locationLabel && (
              <>
                <Hr style={innerDivider} />
                <Text style={label}>Lokalizacja</Text>
                <Text style={value}>{locationLabel}</Text>
              </>
            )}
          </Section>

          {status === 'cancelled' && (
            <Text style={text}>
              W razie pytań prosimy o kontakt — chętnie zaproponujemy Państwu inny termin.
            </Text>
          )}

          {status === 'needs_contact' && (
            <Text style={text}>
              Numer telefonu i adres e-mail recepcji znajdą Państwo na naszej stronie w zakładce „Kontakt".
            </Text>
          )}

          <Hr style={divider} />
          <Text style={footer}>{SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: BookingStatusUpdateEmail,
  subject: (data: Record<string, any>) => {
    const status = (data?.status as BookingStatus) ?? 'confirmed'
    if (status === 'cancelled') return 'Twoja wizyta została odwołana — CML'
    if (status === 'needs_contact') return 'Prosimy o kontakt w sprawie rezerwacji — CML'
    return 'Wizyta potwierdzona — CML'
  },
  displayName: 'Aktualizacja statusu rezerwacji (do pacjenta)',
  previewData: {
    patientName: 'Anna Testowa',
    appointmentDate: '2026-05-15',
    appointmentTime: '10:30',
    locationLabel: 'Warszawa Wilanów (ul. Adama Branickiego 10/U6)',
    status: 'confirmed',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const innerDivider = { borderColor: '#eeeeee', margin: '14px 0' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, margin: '0 0 16px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#faf7f0', borderRadius: '8px', padding: '18px 20px', margin: '12px 0 20px' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }
const value = { fontSize: '14px', color: '#1a1d24', fontWeight: '600' as const, margin: '0 0 4px' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
