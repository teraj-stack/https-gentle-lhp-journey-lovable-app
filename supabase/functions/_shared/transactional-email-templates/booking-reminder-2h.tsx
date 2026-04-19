import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

interface BookingReminder2hProps {
  patientName?: string
  appointmentTime?: string
  locationLabel?: string
}

const BookingReminder2hEmail = ({
  patientName,
  appointmentTime,
  locationLabel,
}: BookingReminder2hProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>
      Za 2 godziny wizyta w CML{appointmentTime ? ` o ${appointmentTime}` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>
          {patientName ? `${patientName}, do zobaczenia za 2h` : 'Do zobaczenia za 2 godziny'}
        </Heading>
        <Text style={text}>
          Krótkie przypomnienie:
        </Text>
        <Text style={highlight}>
          <strong>Godzina:</strong> {appointmentTime || '—'}<br />
          <strong>Miejsce:</strong> {locationLabel || '—'}
        </Text>
        <Text style={text}>
          Prosimy o przybycie 5–10 minut wcześniej. Lekki posiłek wskazany — nie na czczo.
        </Text>
        <Hr style={divider} />
        <Text style={footer}>
          Do zobaczenia,<br />
          Zespół {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingReminder2hEmail,
  subject: (data: Record<string, any>) => {
    const timePart = data?.appointmentTime ? ` o ${data.appointmentTime}` : ''
    return `Za 2h wizyta w CML${timePart}`
  },
  displayName: 'Przypomnienie 2h przed wizytą',
  previewData: {
    patientName: 'Anna Testowa',
    appointmentTime: '14:30',
    locationLabel: 'Warszawa Wilanów, ul. Adama Branickiego 10/U6',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const h1 = { fontSize: '20px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 16px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 14px' }
const highlight = { fontSize: '15px', color: '#1a1d24', backgroundColor: '#faf7f0', borderRadius: '8px', padding: '14px 18px', lineHeight: '1.7', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
