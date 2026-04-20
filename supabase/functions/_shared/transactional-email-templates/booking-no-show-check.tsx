import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "CML Centrum Medycyny Laserowej"
const BOOKING_URL = "https://www.znanylekarz.pl/jan-bujok/chirurg-ogolny-flebolog-proktolog/warszawa"

interface BookingNoShowCheckProps {
  patientName?: string
  appointmentDate?: string
  locationLabel?: string
}

const BookingNoShowCheckEmail = ({
  patientName,
  appointmentDate,
  locationLabel,
}: BookingNoShowCheckProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>
      Jak minęła dzisiejsza wizyta? Daj nam znać.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Hr style={divider} />
        <Heading style={h1}>
          {patientName ? `${patientName}, jak się Pan(i) miewa?` : 'Jak się Państwo miewają?'}
        </Heading>
        <Text style={text}>
          Dziś{appointmentDate ? ` (${appointmentDate})` : ''} mieli Państwo zaplanowaną
          wizytę{locationLabel ? ` w ${locationLabel}` : ''}. Chcielibyśmy zapytać, jak minęło spotkanie
          i czy możemy w czymś pomóc.
        </Text>

        {/* Scenario 1: visit happened */}
        <Section style={scenarioCard}>
          <Heading as="h2" style={h2}>
            ✅ Wizyta się odbyła?
          </Heading>
          <Text style={text}>
            Bardzo dziękujemy za zaufanie. Jeśli zalecenia obejmują kontrolę lub kolejny etap
            leczenia, można umówić termin online — szybko i bez telefonu.
          </Text>
          <Button href={BOOKING_URL} style={primaryButton}>
            Umów wizytę kontrolną
          </Button>
        </Section>

        {/* Scenario 2: no-show */}
        <Section style={scenarioCard}>
          <Heading as="h2" style={h2}>
            🙋 Nie udało się dotrzeć?
          </Heading>
          <Text style={text}>
            Bez problemu — zdarza się każdemu. Jeśli nadal chcą Państwo skorzystać z konsultacji,
            zachęcamy do umówienia nowego terminu w dogodnym momencie.
          </Text>
          <Button href={BOOKING_URL} style={secondaryButton}>
            Umów nowy termin
          </Button>
        </Section>

        <Hr style={divider} />
        <Text style={footer}>
          Z troską o Państwa zdrowie,<br />
          Zespół {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingNoShowCheckEmail,
  subject: 'Jak minęła dzisiejsza wizyta?',
  displayName: 'Po wizycie — kontrola / nowy termin',
  previewData: {
    patientName: 'Anna Testowa',
    appointmentDate: '20.04.2026',
    locationLabel: 'Warszawa Wilanów, ul. Adama Branickiego 10/U6',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '24px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 18px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const h2 = { fontSize: '16px', fontWeight: '600' as const, color: '#1a1d24', margin: '0 0 10px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 14px' }
const scenarioCard = {
  backgroundColor: '#faf7f0',
  borderRadius: '10px',
  padding: '18px 20px',
  margin: '16px 0',
  borderLeft: '3px solid #c9a84c',
}
const primaryButton = {
  backgroundColor: '#c9a84c',
  color: '#1a1d24',
  borderRadius: '6px',
  padding: '10px 22px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  margin: '6px 0 4px',
}
const secondaryButton = {
  backgroundColor: '#1a1d24',
  color: '#faf7f0',
  borderRadius: '6px',
  padding: '10px 22px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  margin: '6px 0 4px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0', lineHeight: '1.6' }
