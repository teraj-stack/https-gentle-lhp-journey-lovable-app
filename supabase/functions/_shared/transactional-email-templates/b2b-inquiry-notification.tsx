import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"

interface B2BInquiryNotificationProps {
  senderEmail?: string
  message?: string
  source?: string
}

const B2BInquiryNotificationEmail = ({ senderEmail, message, source }: B2BInquiryNotificationProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Nowe zapytanie B2B od {senderEmail || 'kontrahenta'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>Nowe zapytanie o współpracę B2B</Heading>
        <Text style={text}>
          Otrzymano nową wiadomość z formularza współpracy{source ? ` (${source})` : ''}.
        </Text>

        <Section style={infoBox}>
          <Text style={label}>Adres e-mail nadawcy</Text>
          <Text style={value}>{senderEmail || '—'}</Text>

          <Hr style={innerDivider} />

          <Text style={label}>Treść wiadomości</Text>
          <Text style={messageText}>{message || '—'}</Text>
        </Section>

        <Text style={text}>
          Aby odpowiedzieć, wyślij wiadomość bezpośrednio na powyższy adres e-mail.
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
  component: B2BInquiryNotificationEmail,
  subject: (data: Record<string, any>) =>
    `Nowe zapytanie B2B${data?.senderEmail ? ` od ${data.senderEmail}` : ''} — CML`,
  to: 'dr.bujok@cml.pl',
  displayName: 'Powiadomienie o zapytaniu B2B (admin)',
  previewData: {
    senderEmail: 'placowka@example.pl',
    message: 'Dzień dobry, jesteśmy zainteresowani modelem kooperacyjnym CML.',
    source: 'wspolpraca-b2b',
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
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
