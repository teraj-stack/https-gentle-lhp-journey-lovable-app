import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

interface BookingReminderProps {
  patientName?: string
  appointmentDate?: string
  appointmentTime?: string
  location?: string
  locationLabel?: string
  reminderOptOutUrl?: string
}

const LOCATION_LABELS: Record<string, string> = {
  'warszawa-wilanow': 'Warszawa Wilanów, ul. Adama Branickiego 10/U6',
  'fimedica-warszawa': 'Fimedica Warszawa, ul. Giełdowa 4D',
  'siedlce': 'Beauty & Mind – Siedlce, ul. Brzeska 125',
  'rzeszow': 'IP Cliniq – Rzeszów, al. Rejtana 53',
}

const formatLocation = (loc?: string, label?: string) => {
  if (label) return label
  if (!loc) return '—'
  const norm = loc.toLowerCase()
  for (const [key, value] of Object.entries(LOCATION_LABELS)) {
    if (norm.includes(key) || norm.includes(value.toLowerCase().split(',')[0])) {
      return value
    }
  }
  return loc
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

const BookingReminderEmail = ({
  patientName,
  appointmentDate,
  appointmentTime,
  location,
  locationLabel,
  reminderOptOutUrl,
}: BookingReminderProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>
      Przypomnienie: jutro wizyta w CML
      {appointmentTime ? ` o ${appointmentTime}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>
          {patientName ? `${patientName}, przypominamy o wizycie` : 'Przypomnienie o wizycie'}
        </Heading>
        <Text style={text}>
          To delikatne przypomnienie — Pańska/Pani wizyta odbędzie się <strong>jutro</strong>.
          Poniżej szczegóły.
        </Text>

        <Section style={infoBox}>
          <Text style={label}>Data</Text>
          <Text style={value}>{formatDate(appointmentDate)}</Text>

          <Hr style={innerDivider} />

          <Text style={label}>Godzina</Text>
          <Text style={value}>{appointmentTime || '—'}</Text>

          <Hr style={innerDivider} />

          <Text style={label}>Lokalizacja</Text>
          <Text style={value}>{formatLocation(location, locationLabel)}</Text>
        </Section>

        <Heading as="h2" style={h2}>Przed wizytą</Heading>
        <Text style={text}>
          • Prosimy przyjść <strong>5–10 minut wcześniej</strong>.<br />
          • Zalecamy lekki posiłek przed wizytą — <strong>nie należy być na czczo</strong>.<br />
          • Zalecane wysokie nawodnienie (2–2,5 l wody w ciągu dnia).<br />
          • Prosimy zabrać dotychczasową dokumentację medyczną oraz listę przyjmowanych leków.
        </Text>

        <Heading as="h2" style={h2}>Potrzeba zmiany terminu?</Heading>
        <Text style={text}>
          Jeżeli z jakiegokolwiek powodu nie może Pan/Pani przybyć, prosimy
          o jak najszybszy kontakt telefoniczny lub e-mailowy z recepcją —
          umożliwi to zaproponowanie terminu innemu pacjentowi.
        </Text>

        <Hr style={divider} />
        <Text style={footer}>
          Do zobaczenia jutro,<br />
          Zespół {SITE_NAME}
        </Text>
        {reminderOptOutUrl && (
          <Text style={optOut}>
            Nie chcesz otrzymywać przypomnień o tej wizycie?{' '}
            <a href={reminderOptOutUrl} style={optOutLink}>
              Wypisz się jednym kliknięciem
            </a>
            .
          </Text>
        )}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingReminderEmail,
  subject: (data: Record<string, any>) => {
    const timePart = data?.appointmentTime ? ` o ${data.appointmentTime}` : ''
    return `Przypomnienie: jutro wizyta w CML${timePart}`
  },
  displayName: 'Przypomnienie o wizycie (24h przed)',
  previewData: {
    patientName: 'Anna Testowa',
    appointmentDate: '2026-05-15',
    appointmentTime: '10:30',
    location: 'warszawa-wilanow',
    locationLabel: 'Warszawa Wilanów, ul. Adama Branickiego 10/U6',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const innerDivider = { borderColor: '#eeeeee', margin: '14px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 16px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const h2 = { fontSize: '16px', fontWeight: '700' as const, color: '#1a1d24', margin: '24px 0 8px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const infoBox = { backgroundColor: '#faf7f0', borderRadius: '8px', padding: '18px 20px', margin: '12px 0 20px' }
const label = { fontSize: '11px', fontWeight: '600' as const, color: '#999999', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }
const value = { fontSize: '14px', color: '#1a1d24', fontWeight: '600' as const, margin: '0 0 4px' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const optOut = { fontSize: '11px', color: '#b5b5b5', margin: '16px 0 0', lineHeight: '1.5' }
const optOutLink = { color: '#888888', textDecoration: 'underline' }
