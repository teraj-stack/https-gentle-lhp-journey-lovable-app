import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

interface BookingConfirmationProps {
  name?: string
  location?: string
  date?: string
  time?: string
}

const BookingConfirmationEmail = ({ name, location, date, time }: BookingConfirmationProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Potwierdzenie rezerwacji wizyty — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>
          {name ? `Dziękujemy, ${name}!` : 'Dziękujemy za rezerwację!'}
        </Heading>
        <Text style={text}>
          Twoja rezerwacja wizyty została przyjęta. Oto szczegóły:
        </Text>
        <Section style={detailsBox}>
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
        <Text style={text}>
          Nasz zespół skontaktuje się z Tobą w celu potwierdzenia terminu.
          W razie pytań prosimy o kontakt telefoniczny.
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
  subject: 'Potwierdzenie rezerwacji wizyty — CML',
  displayName: 'Potwierdzenie rezerwacji wizyty',
  previewData: { name: 'Jan Kowalski', location: 'Warszawa Wilanów', date: '15 stycznia 2025', time: '10:00' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 20px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const detailsBox = { backgroundColor: '#faf8f4', borderRadius: '8px', padding: '16px 20px', margin: '0 0 20px' }
const detailRow = { fontSize: '14px', color: '#1a1d24', lineHeight: '1.8', margin: '0' }
const detailLabel = { fontWeight: '600' as const, color: '#c9a84c' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
